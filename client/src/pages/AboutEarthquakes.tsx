import { FC } from 'react';
import { Layers, Zap, AlertTriangle, Activity, Globe, TrendingUp } from 'lucide-react';

const AboutEarthquakes: FC = () => (
  <div className="min-h-full bg-slate-900">
    <div className="px-6 pt-8 pb-10 max-w-5xl mx-auto">

      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-orange-600 to-orange-800 border border-white/10 shadow-xl shadow-orange-900/40">
        <h1 className="text-3xl font-bold text-white mb-2">О землетрясениях</h1>
        <p className="text-orange-100/80 text-base leading-relaxed">
          Землетрясения — одно из наиболее мощных природных явлений на Земле.
          Байкальская рифтовая зона, в которой расположен Иркутск, является
          одним из наиболее сейсмически активных регионов России.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-slate-700"><Layers className="h-5 w-5 text-orange-400" /></div>
            <h2 className="text-white font-semibold">Причины землетрясений</h2>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            Большинство землетрясений вызвано движением тектонических плит.
            На границах плит накапливаются напряжения, которые периодически
            разряжаются в виде сейсмических волн.
          </p>
          <ul className="space-y-1.5">
            {['Тектонические (движение литосферных плит)', 'Вулканические (магматическая активность)', 'Обвальные (карсты, шахты)', 'Техногенные (водохранилища, горные работы)'].map(t => (
              <li key={t} className="text-slate-400 text-sm flex gap-2"><span className="text-orange-500 mt-0.5">•</span>{t}</li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-slate-700"><Activity className="h-5 w-5 text-red-400" /></div>
            <h2 className="text-white font-semibold">Байкальская рифтовая зона</h2>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-3">
            БРЗ — активная зона растяжения земной коры протяжённостью более 2000 км.
            Здесь ежегодно фиксируется несколько тысяч землетрясений, большинство
            из которых не ощущаются жителями.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Событий в год', value: '3 000+' },
              { label: 'Макс. магнитуда', value: 'M 9.5 (1957)' },
              { label: 'Сейсмичность', value: '7–9 баллов' },
              { label: 'Глубина очагов', value: '5–30 км' },
            ].map(s => (
              <div key={s.label} className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-white font-bold text-lg">{s.value}</div>
                <div className="text-slate-400 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-slate-700"><Zap className="h-5 w-5 text-yellow-400" /></div>
          <h2 className="text-white font-semibold">Сейсмические волны</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { name: 'P-волны (продольные)', color: 'border-blue-500', desc: 'Первичные волны, распространяются через твёрдые и жидкие среды. Скорость 6–8 км/с. Вызывают сжатие и растяжение грунта вдоль направления распространения.' },
            { name: 'S-волны (поперечные)', color: 'border-violet-500', desc: 'Вторичные волны, распространяются только в твёрдых средах. Скорость 3–5 км/с. Вызывают поперечные колебания — более разрушительны для зданий.' },
            { name: 'Поверхностные волны', color: 'border-orange-500', desc: 'Волны Лява и Рэлея распространяются вдоль поверхности Земли. Имеют наибольшую амплитуду и вызывают основные разрушения при сильных землетрясениях.' },
          ].map(w => (
            <div key={w.name} className={`border-l-2 ${w.color} pl-4`}>
              <h3 className="text-white text-sm font-semibold mb-1">{w.name}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{w.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-slate-700"><TrendingUp className="h-5 w-5 text-emerald-400" /></div>
            <h2 className="text-white font-semibold">Шкалы оценки</h2>
          </div>
          <ul className="space-y-2">
            {[
              { name: 'Шкала Рихтера (MW)', desc: 'Магнитуда — логарифмическая мера энергии в очаге. От 0 до 9+.' },
              { name: 'Шкала MSK-64', desc: 'Интенсивность в баллах (1–12) — мера воздействия на поверхности.' },
              { name: 'Шкала Меркалли (MMI)', desc: 'Описательная шкала ощущаемых эффектов от I до XII.' },
            ].map(s => (
              <li key={s.name} className="flex flex-col gap-0.5">
                <span className="text-white text-sm font-medium">{s.name}</span>
                <span className="text-slate-400 text-xs">{s.desc}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-slate-700"><AlertTriangle className="h-5 w-5 text-red-400" /></div>
            <h2 className="text-white font-semibold">Исторические события</h2>
          </div>
          <ul className="space-y-3">
            {[
              { year: '1957', mag: 'M 9.5', place: 'Гоби-Алтайское, Монголия' },
              { year: '1959', mag: 'M 6.8', place: 'Байкал — ощущалось в Иркутске' },
              { year: '2008', mag: 'M 6.3', place: 'Южное Прибайкалье' },
              { year: '2021', mag: 'M 5.5', place: 'Тункинская долина' },
            ].map(ev => (
              <li key={ev.year} className="flex items-center gap-3">
                <span className="text-slate-500 text-xs w-10">{ev.year}</span>
                <span className="text-red-400 text-xs font-mono w-14">{ev.mag}</span>
                <span className="text-slate-300 text-xs">{ev.place}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  </div>
);

export default AboutEarthquakes;
