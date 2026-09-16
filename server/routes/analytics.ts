import { Router } from "express";
import { eq, sql, desc, gte, lte, ilike, and, inArray } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { pageVisitLogs } from "@shared/schema";
import { requireRole } from "../auth";
import geoip from "geoip-lite";

const router = Router();


// --- Page Views API ---

router.get('/api/page-views', async (req, res) => {
  try {
    const now = new Date();
    const todayKey = `PageViews_${now.toISOString().slice(0, 10)}`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `PageViews_${yesterday.toISOString().slice(0, 10)}`;

    const rows = await storage.getSystemStatus();
    const row = rows.find(r => r.component === 'PageViews');
    const todayRow = rows.find(r => r.component === todayKey);
    const yesterdayRow = rows.find(r => r.component === yesterdayKey);

    const daily: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const key = `PageViews_${dateStr}`;
      const dayRow = rows.find(r => r.component === key);
      daily.push({ date: dateStr, count: dayRow ? Math.round(dayRow.value ?? 0) : 0 });
    }

    res.json({
      views: row ? Math.round(row.value ?? 0) : 0,
      views_today: todayRow ? Math.round(todayRow.value ?? 0) : 0,
      views_yesterday: yesterdayRow ? Math.round(yesterdayRow.value ?? 0) : 0,
      daily,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching page views' });
  }
});

router.get('/api/page-visits/by-country', requireRole('administrator'), async (req, res) => {
  try {
    const rows = await db
      .select({
        countryCode: pageVisitLogs.countryCode,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(pageVisitLogs)
      .where(sql`${pageVisitLogs.countryCode} is not null`)
      .groupBy(pageVisitLogs.countryCode)
      .orderBy(desc(sql`count(*)`));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching visit counts by country' });
  }
});

router.get('/api/page-visits/by-city', requireRole('administrator'), async (req, res) => {
  try {
    const rows = await db
      .select({
        city: pageVisitLogs.city,
        region: pageVisitLogs.region,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(pageVisitLogs)
      .where(eq(pageVisitLogs.countryCode, 'RU'))
      .groupBy(pageVisitLogs.city, pageVisitLogs.region)
      .orderBy(desc(sql`count(*)`))
      .limit(100);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching visit counts by city' });
  }
});

router.get('/api/page-visits/by-city/trend', requireRole('administrator'), async (req, res) => {
  try {
    const cityParam = (req.query.city as string) ?? '';
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 90);
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    // '__unknown__' sentinel means filter for rows where city is NULL or empty
    const cityFilter = cityParam === '__unknown__'
      ? sql`(${pageVisitLogs.city} is null or ${pageVisitLogs.city} = '')`
      : cityParam !== ''
        ? eq(pageVisitLogs.city, cityParam)
        : sql`true`;

    const rows = await db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${pageVisitLogs.visitedAt}), 'YYYY-MM-DD')`,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(pageVisitLogs)
      .where(
        and(
          eq(pageVisitLogs.countryCode, 'RU'),
          cityFilter,
          gte(pageVisitLogs.visitedAt, since),
        )
      )
      .groupBy(sql`date_trunc('day', ${pageVisitLogs.visitedAt})`)
      .orderBy(sql`date_trunc('day', ${pageVisitLogs.visitedAt})`);

    // Zero-fill missing days so the chart always shows a complete window
    const countByDate = new Map(rows.map(r => [r.date, r.count]));
    const filled: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      filled.push({ date: key, count: countByDate.get(key) ?? 0 });
    }

    res.json(filled);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching city visit trend' });
  }
});

router.get('/api/page-visits/by-city/trend/multi', requireRole('administrator'), async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 90);
    const n = Math.min(Math.max(Number(req.query.n) || 5, 1), 10);
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    // Parse pinned and excluded cities from query parameters
    const pinnedParam = typeof req.query.pinned === 'string' ? req.query.pinned : '';
    const excludedParam = typeof req.query.excluded === 'string' ? req.query.excluded : '';
    const pinnedCities = pinnedParam
      ? [...new Set(pinnedParam.split(',').map(s => s.trim()).filter(Boolean))]
      : [];
    const excludedCities = excludedParam
      ? [...new Set(excludedParam.split(',').map(s => s.trim()).filter(Boolean))]
      : [];

    // Excluded takes precedence — remove any pinned city that is also excluded
    const effectivePinned = pinnedCities.filter(c => !excludedCities.includes(c));

    // How many extra top-ranked slots we still need (total capped at n)
    const extraNeeded = Math.max(0, n - effectivePinned.length);

    let cityNames: string[];

    // Cities to block from top-ranked fill: pinned (already included) + excluded (must not appear)
    const blockedFromTopRanked = [...effectivePinned, ...excludedCities];

    if (extraNeeded === 0) {
      // All slots filled by pinned cities (use up to n pinned)
      cityNames = effectivePinned.slice(0, n);
    } else {
      // Get top-ranked cities that are not already pinned or excluded
      const topCities = await db
        .select({
          city: pageVisitLogs.city,
          total: sql<number>`cast(count(*) as integer)`,
        })
        .from(pageVisitLogs)
        .where(
          and(
            eq(pageVisitLogs.countryCode, 'RU'),
            sql`(${pageVisitLogs.city} is not null and ${pageVisitLogs.city} != '')`,
            gte(pageVisitLogs.visitedAt, since),
            blockedFromTopRanked.length > 0
              ? sql`${pageVisitLogs.city} not in (${sql.join(blockedFromTopRanked.map(c => sql`${c}`), sql`, `)})`
              : sql`true`,
          )
        )
        .groupBy(pageVisitLogs.city)
        .orderBy(desc(sql`count(*)`))
        .limit(extraNeeded);

      const topRanked = topCities.map(r => r.city as string);
      cityNames = [...effectivePinned, ...topRanked];
    }

    if (cityNames.length === 0) {
      return res.json({ cities: [], data: [] });
    }

    // Build stable slug keys to use as Recharts dataKey (avoids dot-path parsing issues)
    const toSlug = (name: string) => name.replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, '_');
    const cityMeta = cityNames.map((name, idx) => ({
      key: `c${idx}_${toSlug(name)}`,
      label: name,
    }));

    // Get per-day counts for the top cities using parameterized inArray
    const rows = await db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${pageVisitLogs.visitedAt}), 'YYYY-MM-DD')`,
        city: pageVisitLogs.city,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(pageVisitLogs)
      .where(
        and(
          eq(pageVisitLogs.countryCode, 'RU'),
          inArray(pageVisitLogs.city, cityNames),
          gte(pageVisitLogs.visitedAt, since),
        )
      )
      .groupBy(sql`date_trunc('day', ${pageVisitLogs.visitedAt})`, pageVisitLogs.city)
      .orderBy(sql`date_trunc('day', ${pageVisitLogs.visitedAt})`);

    // Build a map: date -> label -> count
    const byDateCity = new Map<string, Map<string, number>>();
    for (const row of rows) {
      if (!byDateCity.has(row.date)) byDateCity.set(row.date, new Map());
      byDateCity.get(row.date)!.set(row.city ?? '', row.count);
    }

    // Zero-fill all days; use stable slug key in each data row
    const filled: Record<string, string | number>[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const dateKey = d.toISOString().slice(0, 10);
      const entry: Record<string, string | number> = { date: dateKey };
      const cityMap = byDateCity.get(dateKey);
      for (const { key, label } of cityMeta) {
        entry[key] = cityMap?.get(label) ?? 0;
      }
      filled.push(entry);
    }

    res.json({ cities: cityMeta, data: filled });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching multi-city visit trend' });
  }
});

router.get('/api/page-visits', requireRole('administrator'), async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 500, 2000);
    const { from, to, country, ip } = req.query as Record<string, string | undefined>;

    const conditions = [];
    if (from) conditions.push(gte(pageVisitLogs.visitedAt, new Date(from)));
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(pageVisitLogs.visitedAt, toDate));
    }
    if (country) conditions.push(eq(pageVisitLogs.countryCode, country.toUpperCase()));
    if (ip) conditions.push(ilike(pageVisitLogs.ip, `%${ip}%`));

    const logs = await db
      .select()
      .from(pageVisitLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(pageVisitLogs.visitedAt))
      .limit(limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching visit logs' });
  }
});

router.post('/api/page-views', async (req, res) => {
  try {
    const todayKey = `PageViews_${new Date().toISOString().slice(0, 10)}`;

    // Log the visit with IP geolocation (fire-and-forget, don't block response)
    try {
      const rawIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '';
      const ip = rawIp.replace(/^::ffff:/, '');
      const geo = geoip.lookup(ip);
      await db.insert(pageVisitLogs).values({
        ip: ip || 'unknown',
        country: geo?.country ?? null,
        countryCode: geo?.country ?? null,
        region: geo?.region ?? null,
        city: geo?.city ?? null,
        userAgent: (req.headers['user-agent'] as string) ?? null,
      });
    } catch (_geoErr) {
      // Geo logging failure must not break the view counter
    }

    const dailyUpdate = await db.execute(sql`
      UPDATE system_status SET value = value + 1, timestamp = NOW()
      WHERE component = ${todayKey}
    `);
    if ((dailyUpdate.rowCount ?? 0) === 0) {
      await db.execute(sql`
        INSERT INTO system_status (component, status, value, timestamp, message)
        VALUES (${todayKey}, 'ok', 1, NOW(), 'Daily page view counter')
        ON CONFLICT DO NOTHING
      `);
    }

    const [totalResult] = await Promise.all([
      db.execute(sql`
        INSERT INTO system_status (component, status, value, timestamp, message)
        VALUES ('PageViews', 'ok', 1, NOW(), 'Home page view counter')
        ON CONFLICT (component) WHERE component = 'PageViews'
        DO UPDATE SET value = system_status.value + 1, timestamp = NOW()
        RETURNING value
      `),
    ]);

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `PageViews_${yesterday.toISOString().slice(0, 10)}`;

    const rows = await storage.getSystemStatus();
    const todayRow = rows.find(r => r.component === todayKey);
    const yesterdayRow = rows.find(r => r.component === yesterdayKey);

    const now2 = new Date();
    const daily: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now2);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const key = `PageViews_${dateStr}`;
      const dayRow = rows.find(r => r.component === key);
      daily.push({ date: dateStr, count: dayRow ? Math.round(dayRow.value ?? 0) : 0 });
    }

    const views = Math.round((totalResult.rows[0] as { value: number })?.value ?? 1);
    res.json({
      views,
      views_today: todayRow ? Math.round(todayRow.value ?? 0) : 0,
      views_yesterday: yesterdayRow ? Math.round(yesterdayRow.value ?? 0) : 0,
      daily,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating page views' });
  }
});

export default router;
