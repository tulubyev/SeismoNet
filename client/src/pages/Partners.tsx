import { FC } from 'react';
import { GraduationCap, Building, Microscope, Wrench, Globe } from 'lucide-react';

interface Partner {
  name: string;
  type: string;
  role: string;
  icon: FC<{ className?: string }>;
  color: string;
  city?: string;
}

const partners: Partner[] = [
  {
    name: 'Институт земной коры СО РАН',
    type: 'Научная организация',
    role: 'Научное руководство, разработка методологии обработки сейсмических данных, калибровка датчиков',
    icon: Microscope,
    color: 'text-violet-400',
    city: 'Иркутск',
  },
  {
    name: 'Иркутский национальный исследовательский технический университет (ИРНИТУ)',
    type: 'Высшее учебное заведение',
    role: 'Разработка программного обеспечения, подготовка специалистов, проведение полевых измерений',
    icon: GraduationCap,
    color: 'text-blue-400',
    city: 'Иркутск',
  },
  {
    name: 'ОАО «Иркутскэнерго»',
    type: 'Промышленное предприятие',
    role: 'Предоставление доступа к промышленным объектам, финансирование мониторинга ГЭС',
    icon: Building,
    color: 'text-orange-400',
    city: 'Иркутск',
  },
  {
    name: 'Администрация г. Иркутска',
    type: 'Орган местного самоуправления',
    role: 'Организационная поддержка, координация с управляющими компаниями жилых домов',
    icon: Globe,
    color: 'text-emerald-400',
    city: 'Иркутск',
  },
  {
    name: 'Байкальский филиал ФИЦ ЕГС РАН',
    type: 'Научная организация',
    role: 'Предоставление данных о сейсмических событиях, совместная обработка каталогов',
    icon: Microscope,
    color: 'text-teal-400',
    city: 'Иркутск',
  },
  {
    name: 'ООО «СейсмоПроект»',
    type: 'Проектная организация',
    role: 'Проектирование и монтаж измерительного оборудования, техническое обслуживание станций',
    icon: Wrench,
    color: 'text-sky-400',
    city: 'Иркутск',
  },
];

const Partners: FC = () => (
  <div className="min-h-full bg-slate-900">
    <div className="px-6 pt-8 pb-10 max-w-5xl mx-auto">

      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-sky-600 to-sky-800 border border-white/10 shadow-xl shadow-sky-900/40">
        <h1 className="text-3xl font-bold text-white mb-2">Партнёры</h1>
        <p className="text-sky-100/80 text-base leading-relaxed">
          Проект реализуется при участии научных институтов, университетов, промышленных предприятий
          и органов государственного управления, объединённых задачей обеспечения сейсмической
          безопасности объектов инфраструктуры Иркутска.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {partners.map(p => {
          const Icon = p.icon;
          return (
            <div key={p.name} className="bg-slate-800/60 rounded-xl p-5 border border-slate-700 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-700 flex-shrink-0">
                  <Icon className={`h-5 w-5 ${p.color}`} />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-sm leading-snug">{p.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">{p.type}</span>
                    {p.city && <span className="text-xs text-slate-500">{p.city}</span>}
                  </div>
                </div>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">{p.role}</p>
            </div>
          );
        })}
      </div>

    </div>
  </div>
);

export default Partners;
