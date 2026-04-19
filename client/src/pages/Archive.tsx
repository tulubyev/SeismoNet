import { FC, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Archive as ArchiveIcon,
  Building2,
  Layers,
  Activity,
  Search,
  Download,
  MapPin,
  Calendar,
  Gauge,
} from 'lucide-react';
import type {
  InfrastructureObject,
  SoilProfile,
  ObjectCategory,
  Event as SeismicEvent,
} from '@shared/schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FALLBACK_TYPE_LABELS: Record<string, string> = {
  residential: 'Жилое', industrial: 'Промышленное', bridge: 'Мост / Путепровод',
  pipeline: 'Трубопровод', dam: 'Плотина / ГТС', hospital: 'Больница',
  school: 'Школа / ВУЗ', admin: 'Административное', other: 'Прочее',
};
const labelFor = (cats: ObjectCategory[], slug: string) =>
  cats.find(c => c.slug === slug)?.name ?? FALLBACK_TYPE_LABELS[slug] ?? slug;

const conditionBadge = (c?: string | null) => {
  switch (c) {
    case 'good':         return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Хорошее</Badge>;
    case 'satisfactory': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Удовл.</Badge>;
    case 'poor':         return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Плохое</Badge>;
    case 'critical':     return <Badge className="bg-red-100 text-red-700 border-red-200">Критич.</Badge>;
    default:             return <Badge variant="outline">—</Badge>;
  }
};

const soilCategoryColor = (cat: string) => {
  switch (cat) {
    case 'I':   return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'II':  return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'III': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'IV':  return 'bg-red-100 text-red-700 border-red-200';
    default:    return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const formatDate = (d?: Date | string | null) => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const downloadJson = (filename: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

// ─── Buildings tab ────────────────────────────────────────────────────────────

const BuildingsArchive: FC = () => {
  const [q, setQ] = useState('');
  const { data: objects = [], isLoading } = useQuery<InfrastructureObject[]>({
    queryKey: ['/api/infrastructure-objects'],
  });
  const { data: cats = [] } = useQuery<ObjectCategory[]>({
    queryKey: ['/api/object-categories'],
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return objects;
    return objects.filter(o =>
      o.name.toLowerCase().includes(s) ||
      (o.address ?? '').toLowerCase().includes(s) ||
      o.objectId.toLowerCase().includes(s) ||
      (o.developer ?? '').toLowerCase().includes(s)
    );
  }, [objects, q]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Поиск по названию, адресу, ID, застройщику…"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadJson('archive_buildings.json', filtered)}>
          <Download className="h-4 w-4 mr-1.5" /> Экспорт JSON
        </Button>
      </div>

      <div className="text-xs text-slate-500">
        Найдено объектов: <span className="font-semibold text-slate-700">{filtered.length}</span>
        {' '}из {objects.length}
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">Название</th>
                <th className="text-left px-3 py-2">Тип</th>
                <th className="text-left px-3 py-2">Адрес</th>
                <th className="text-left px-3 py-2">Год</th>
                <th className="text-left px-3 py-2">Этажей</th>
                <th className="text-left px-3 py-2">Кат.</th>
                <th className="text-left px-3 py-2">Состояние</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">Загрузка…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">Нет данных</td></tr>
              )}
              {filtered.map(o => (
                <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{o.objectId}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{o.name}</td>
                  <td className="px-3 py-2"><Badge variant="outline">{labelFor(cats, o.objectType)}</Badge></td>
                  <td className="px-3 py-2 text-slate-600">{o.address ?? '—'}</td>
                  <td className="px-3 py-2">{o.constructionYear ?? '—'}</td>
                  <td className="px-3 py-2">{o.floors ?? '—'}</td>
                  <td className="px-3 py-2">
                    {o.seismicCategory
                      ? <Badge className="bg-orange-100 text-orange-700 border-orange-200">Кат. {o.seismicCategory}</Badge>
                      : '—'}
                  </td>
                  <td className="px-3 py-2">{conditionBadge(o.technicalCondition)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─── Soils tab ────────────────────────────────────────────────────────────────

const SoilsArchive: FC = () => {
  const [q, setQ] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: profiles = [], isLoading } = useQuery<SoilProfile[]>({
    queryKey: ['/api/soil-profiles'],
  });
  const { data: objects = [] } = useQuery<InfrastructureObject[]>({
    queryKey: ['/api/infrastructure-objects'],
  });
  const objectName = (id: number | null) =>
    id == null ? '—' : (objects.find(o => o.id === id)?.name ?? `#${id}`);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return profiles.filter(p => {
      if (categoryFilter !== 'all' && p.soilCategory !== categoryFilter) return false;
      if (!s) return true;
      return p.profileName.toLowerCase().includes(s)
        || (p.surveyOrganization ?? '').toLowerCase().includes(s)
        || objectName(p.objectId).toLowerCase().includes(s);
    });
  }, [profiles, q, categoryFilter, objects]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Поиск по профилю, объекту, изыскателю…"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {['all','I','II','III','IV'].map(c => (
            <Button
              key={c}
              size="sm"
              variant={categoryFilter === c ? 'default' : 'outline'}
              onClick={() => setCategoryFilter(c)}
            >
              {c === 'all' ? 'Все' : `Кат. ${c}`}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadJson('archive_soils.json', filtered)}>
          <Download className="h-4 w-4 mr-1.5" /> Экспорт JSON
        </Button>
      </div>

      <div className="text-xs text-slate-500">
        Найдено профилей: <span className="font-semibold text-slate-700">{filtered.length}</span>
        {' '}из {profiles.length}
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Профиль</th>
                <th className="text-left px-3 py-2">Объект</th>
                <th className="text-left px-3 py-2">Кат. грунта</th>
                <th className="text-left px-3 py-2">Vs30, м/с</th>
                <th className="text-left px-3 py-2">УГВ, м</th>
                <th className="text-left px-3 py-2">f₀, Гц</th>
                <th className="text-left px-3 py-2">К усил.</th>
                <th className="text-left px-3 py-2">Изыскатель</th>
                <th className="text-left px-3 py-2">Дата</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-400">Загрузка…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-400">Нет данных</td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-medium text-slate-800">{p.profileName}</td>
                  <td className="px-3 py-2 text-slate-600">{objectName(p.objectId)}</td>
                  <td className="px-3 py-2">
                    <Badge className={soilCategoryColor(p.soilCategory) + ' border'}>
                      {p.soilCategory}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{p.avgShearVelocity?.toFixed(0) ?? '—'}</td>
                  <td className="px-3 py-2">{p.groundwaterDepth?.toFixed(1) ?? '—'}</td>
                  <td className="px-3 py-2">{p.dominantFrequency?.toFixed(2) ?? '—'}</td>
                  <td className="px-3 py-2">{p.amplificationFactor?.toFixed(2) ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{p.surveyOrganization ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{formatDate(p.surveyDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─── Seismic events tab ───────────────────────────────────────────────────────

const EventsArchive: FC = () => {
  const [q, setQ] = useState('');
  const [minMag, setMinMag] = useState<number>(0);

  const { data: events = [], isLoading } = useQuery<SeismicEvent[]>({
    queryKey: ['/api/events/recent'],
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return events.filter(e => {
      if (e.magnitude < minMag) return false;
      if (!s) return true;
      return e.eventId.toLowerCase().includes(s)
        || e.region.toLowerCase().includes(s)
        || (e.location ?? '').toLowerCase().includes(s);
    });
  }, [events, q, minMag]);

  const magBadge = (m: number) => {
    if (m >= 6) return 'bg-red-100 text-red-700 border-red-200';
    if (m >= 4.5) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (m >= 3)   return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Поиск по ID, региону, эпицентру…"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {[0, 2, 3, 4.5, 6].map(m => (
            <Button
              key={m}
              size="sm"
              variant={minMag === m ? 'default' : 'outline'}
              onClick={() => setMinMag(m)}
            >
              {m === 0 ? 'Все' : `M ≥ ${m}`}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadJson('archive_events.json', filtered)}>
          <Download className="h-4 w-4 mr-1.5" /> Экспорт JSON
        </Button>
      </div>

      <div className="text-xs text-slate-500">
        Найдено событий: <span className="font-semibold text-slate-700">{filtered.length}</span>
        {' '}из {events.length}
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Время</th>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">Регион / Эпицентр</th>
                <th className="text-left px-3 py-2">Магнитуда</th>
                <th className="text-left px-3 py-2">Глубина, км</th>
                <th className="text-left px-3 py-2">Координаты</th>
                <th className="text-left px-3 py-2">Тип</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">Загрузка…</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">Нет данных</td></tr>
              )}
              {filtered.map(e => (
                <tr key={e.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(e.timestamp).toLocaleString('ru-RU')}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{e.eventId}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">{e.region}</div>
                    {e.location && <div className="text-xs text-slate-500">{e.location}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <Badge className={magBadge(e.magnitude) + ' border font-semibold'}>
                      M {e.magnitude.toFixed(1)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{e.depth.toFixed(1)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">
                    {Number(e.latitude).toFixed(3)}, {Number(e.longitude).toFixed(3)}
                  </td>
                  <td className="px-3 py-2"><Badge variant="outline">{e.type}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ─── Page shell ───────────────────────────────────────────────────────────────

const Archive: FC = () => {
  const { data: objects = [] } = useQuery<InfrastructureObject[]>({
    queryKey: ['/api/infrastructure-objects'],
  });
  const { data: profiles = [] } = useQuery<SoilProfile[]>({
    queryKey: ['/api/soil-profiles'],
  });
  const { data: events = [] } = useQuery<SeismicEvent[]>({
    queryKey: ['/api/events/recent'],
  });

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-slate-800 flex items-center gap-2">
            <ArchiveIcon className="h-6 w-6 text-blue-600" />
            Архив данных сейсмической сети
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            База данных грунтов и объектов г. Иркутска · реестр зданий, инженерно-геологических
            профилей и сейсмических событий
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Зданий в архиве</div>
              <div className="text-xl font-semibold text-slate-800">{objects.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Layers className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Профилей грунта</div>
              <div className="text-xl font-semibold text-slate-800">{profiles.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-rose-50 flex items-center justify-center">
              <Activity className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Сейсмических событий</div>
              <div className="text-xl font-semibold text-slate-800">{events.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">
            Хранилище данных
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="buildings">
            <TabsList className="mb-4">
              <TabsTrigger value="buildings">
                <Building2 className="h-4 w-4 mr-1.5" />
                Здания
              </TabsTrigger>
              <TabsTrigger value="soils">
                <Layers className="h-4 w-4 mr-1.5" />
                Грунты
              </TabsTrigger>
              <TabsTrigger value="events">
                <Activity className="h-4 w-4 mr-1.5" />
                Сейсмические события
              </TabsTrigger>
            </TabsList>
            <TabsContent value="buildings"><BuildingsArchive /></TabsContent>
            <TabsContent value="soils"><SoilsArchive /></TabsContent>
            <TabsContent value="events"><EventsArchive /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Archive;
