import { FC } from 'react';
import { Lightbulb, Globe, Fish, Mountain, Zap, Clock } from 'lucide-react';

const Interesting: FC = () => (
  <div className="min-h-full bg-slate-900">
    <div className="px-6 pt-8 pb-10 max-w-5xl mx-auto">

      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 border border-white/10 shadow-xl shadow-amber-900/40">
        <h1 className="text-3xl font-bold text-white mb-2">Это интересно</h1>
        <p className="text-amber-100/80 text-base leading-relaxed">
          Удивительные факты о землетрясениях, занимательная сейсмология и
          научные открытия, которые меняют наше понимание устройства Земли.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        {[
          {
            icon: Globe,
            color: 'text-blue-400',
            title: 'Земля «звенит» как колокол',
            text: 'После крупных землетрясений Земля начинает колебаться на своих собственных нормальных частотах — это явление называется «свободные колебания Земли». Период фундаментального тона составляет около 54 минут. Сейсмографы фиксируют эти колебания ещё несколько дней после события.',
          },
          {
            icon: Fish,
            color: 'text-teal-400',
            title: 'Рыбы-предсказатели землетрясений',
            text: 'Японская легенда гласит, что рыба намазу (сом) вызывает землетрясения движением своего тела. Современные исследования подтверждают: некоторые глубоководные рыбы действительно появляются на поверхности незадолго до сильных землетрясений, вероятно реагируя на изменения давления и электромагнитного поля.',
          },
          {
            icon: Mountain,
            color: 'text-orange-400',
            title: 'Байкал расширяется',
            text: 'Байкальская рифтовая зона активно развивается: берега озера расходятся со скоростью около 2 мм в год. Это означает, что Байкал — зарождающийся океан. Через десятки миллионов лет на месте Сибири может образоваться новый океан, подобно тому, как когда-то возник Атлантический.',
          },
          {
            icon: Zap,
            color: 'text-yellow-400',
            title: 'Сейсмическое свечение',
            text: 'Перед сильными землетрясениями и во время них иногда наблюдается загадочное свечение неба — шаровые молнии, столбы света, яркие вспышки. Это явление объясняется пьезоэлектрическими свойствами кристаллов кварца в горных породах: при сильном сжатии они генерируют электрические разряды.',
          },
          {
            icon: Clock,
            color: 'text-violet-400',
            title: 'Землетрясение удлиняет сутки',
            text: 'Мощные землетрясения изменяют распределение масс внутри Земли и влияют на скорость её вращения. Японское землетрясение 2011 года (M 9.0) ускорило вращение Земли, сократив продолжительность суток на 1.8 микросекунды. Суматранское землетрясение 2004 года (M 9.1) — на 2.68 микросекунды.',
          },
          {
            icon: Lightbulb,
            color: 'text-amber-400',
            title: 'Вода в скважинах как сейсмограф',
            text: 'Уровень воды в глубоких скважинах реагирует на прохождение сейсмических волн от далёких землетрясений. Иногда вода начинает колебаться в такт с волнами, проходящими через континенты. В Иркутской области зафиксированы случаи реакции скважин на землетрясения в Японии и Чили.',
          },
        ].map(fact => {
          const Icon = fact.icon;
          return (
            <div key={fact.title} className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-slate-700 flex-shrink-0">
                  <Icon className={`h-5 w-5 ${fact.color}`} />
                </div>
                <h2 className="text-white font-semibold text-sm leading-snug pt-1">{fact.title}</h2>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">{fact.text}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-400" />
          Рекорды сейсмологии
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Сильнейшее в истории',  value: 'M 9.5',   sub: 'Чили, 1960' },
            { label: 'Самое глубокое',         value: '750 км',  sub: 'Тихоокеанская зона' },
            { label: 'Число станций в мире',   value: '10 000+', sub: 'IRIS, FDSN сети' },
            { label: 'Событий в сутки (Земля)',value: '~55 000', sub: 'Все магнитуды' },
          ].map(r => (
            <div key={r.label} className="bg-slate-700/50 rounded-lg p-4 text-center">
              <div className="text-amber-400 font-bold text-2xl mb-1">{r.value}</div>
              <div className="text-white text-xs font-medium">{r.label}</div>
              <div className="text-slate-500 text-xs mt-0.5">{r.sub}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  </div>
);

export default Interesting;
