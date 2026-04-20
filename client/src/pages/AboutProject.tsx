import { FC } from 'react';
import { Target, Cpu, MapPin, Users, BarChart2, ShieldCheck } from 'lucide-react';

const AboutProject: FC = () => (
  <div className="min-h-full bg-slate-900">
    <div className="px-6 pt-8 pb-10 max-w-5xl mx-auto">

      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 border border-white/10 shadow-xl shadow-blue-900/40">
        <h1 className="text-3xl font-bold text-white mb-2">О проекте</h1>
        <p className="text-blue-100/80 text-base leading-relaxed">
          Сеть сейсмических наблюдений за объектами гражданской и промышленной инфраструктуры
          г. Иркутска — проект комплексного мониторинга сейсмической обстановки и оценки
          сейсмической безопасности зданий и сооружений города.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
        {[
          {
            icon: Target,
            title: 'Цели проекта',
            color: 'text-blue-400',
            items: [
              'Непрерывный мониторинг сейсмической активности в регионе',
              'Оценка динамических характеристик несущих конструкций зданий',
              'Раннее предупреждение об опасных сейсмических событиях',
              'Накопление базы данных для уточнения сейсмического районирования',
            ],
          },
          {
            icon: ShieldCheck,
            title: 'Задачи',
            color: 'text-emerald-400',
            items: [
              'Развёртывание и обслуживание сети акселерометрических станций',
              'Регистрация и архивирование сейсмограмм в реальном времени',
              'Расчёт спектров отклика и характеристик грунта (МТСМ, МКЭ)',
              'Подготовка отчётов в соответствии с СП 14.13330 и ГОСТ',
            ],
          },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-slate-700">
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <h2 className="text-white font-semibold text-base">{card.title}</h2>
              </div>
              <ul className="space-y-2">
                {card.items.map(item => (
                  <li key={item} className="text-slate-300 text-sm flex items-start gap-2">
                    <span className="text-slate-500 mt-1">•</span>{item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: MapPin,    color: 'text-orange-400', label: 'Регион наблюдений', value: 'г. Иркутск и пригороды' },
          { icon: Cpu,       color: 'text-violet-400', label: 'Тип датчиков',       value: 'Акселерометры, сейсмометры' },
          { icon: BarChart2, color: 'text-teal-400',   label: 'Методы анализа',    value: 'МТСМ, МКЭ, Фурье, HVSR' },
          { icon: Users,     color: 'text-sky-400',    label: 'Участники',          value: 'Научные и проектные организации' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-slate-700">
                <Icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <div className="text-slate-400 text-xs">{s.label}</div>
                <div className="text-white text-sm font-semibold">{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-800/60 rounded-xl p-5 border border-slate-700">
        <h2 className="text-white font-semibold text-base mb-3">История проекта</h2>
        <div className="space-y-4">
          {[
            { year: '2018', text: 'Начало разработки концепции сейсмического мониторинга объектов инфраструктуры г. Иркутска' },
            { year: '2020', text: 'Установка первых акселерометрических станций на пилотных объектах — жилые здания повышенной этажности' },
            { year: '2022', text: 'Расширение сети: подключение промышленных объектов, мостов, плотины ГЭС' },
            { year: '2024', text: 'Разработка программного комплекса SeismoNet для автоматической обработки и хранения данных' },
            { year: '2025', text: 'Интеграция с нормативной базой (СП 14.13330-2022), реализация модулей МТСМ и МКЭ' },
          ].map(ev => (
            <div key={ev.year} className="flex gap-4">
              <div className="flex-shrink-0 w-12 text-blue-400 font-bold text-sm pt-0.5">{ev.year}</div>
              <div className="text-slate-300 text-sm leading-relaxed border-l border-slate-600 pl-4">{ev.text}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  </div>
);

export default AboutProject;
