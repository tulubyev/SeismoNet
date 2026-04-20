import { FC } from 'react';
import { useLocation } from 'wouter';
import {
  BookOpen, Users2, Waves, Compass, Lightbulb, ArrowRight, CheckCircle2, Info,
} from 'lucide-react';

interface BlockDef {
  href: string;
  title: string;
  subtitle: string;
  icon: FC<{ className?: string }>;
  gradient: string;
  shadow: string;
  description: string;
}

const blocks: BlockDef[] = [
  {
    href:        '/about-project',
    title:       'О проекте',
    subtitle:    'Цели, задачи и история сети сейсмических наблюдений Иркутска',
    icon:        Info,
    gradient:    'from-blue-600 to-blue-800',
    shadow:      'shadow-blue-900/40',
    description: 'Зачем создана сеть, кто её развивает, какие задачи решает сейсмический мониторинг объектов гражданской и промышленной инфраструктуры',
  },
  {
    href:        '/building-norms',
    title:       'Нормативная база',
    subtitle:    'СП, СНиП, ГОСТ — требования к сейсмостойкости зданий и сооружений',
    icon:        BookOpen,
    gradient:    'from-indigo-600 to-indigo-800',
    shadow:      'shadow-indigo-900/40',
    description: 'Действующие нормативные документы: строительные правила и нормы проектирования сейсмостойких объектов',
  },
  {
    href:        '/partners',
    title:       'Партнёры',
    subtitle:    'Научные и инженерные организации, участвующие в проекте',
    icon:        Users2,
    gradient:    'from-sky-600 to-sky-800',
    shadow:      'shadow-sky-900/40',
    description: 'Институты, университеты и предприятия, обеспечивающие развитие сети сейсмического наблюдения',
  },
  {
    href:        '/about-earthquakes',
    title:       'О землетрясениях',
    subtitle:    'Природа, причины и последствия сейсмических событий',
    icon:        Waves,
    gradient:    'from-orange-600 to-orange-800',
    shadow:      'shadow-orange-900/40',
    description: 'Механизмы возникновения землетрясений, сейсмическая активность Байкальской рифтовой зоны',
  },
  {
    href:        '/seismic-basics',
    title:       'Основы сейсмических наблюдений',
    subtitle:    'Принципы, методы и оборудование сейсмометрии',
    icon:        Compass,
    gradient:    'from-lime-600 to-lime-800',
    shadow:      'shadow-lime-900/40',
    description: 'Как работают сейсмографы, принципы регистрации колебаний грунта и обработки сейсмограмм',
  },
  {
    href:        '/interesting',
    title:       'Это интересно',
    subtitle:    'Факты, исследования и занимательная сейсмология',
    icon:        Lightbulb,
    gradient:    'from-amber-500 to-amber-700',
    shadow:      'shadow-amber-900/40',
    description: 'Удивительные факты о сейсмической активности, исторические события и научные открытия',
  },
];

const SeismoNetProject: FC = () => {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-full bg-slate-900">
      <div className="px-6 pt-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {blocks.map(block => {
              const Icon = block.icon;
              return (
                <button
                  key={block.href}
                  onClick={() => navigate(block.href)}
                  className={`group relative bg-gradient-to-br ${block.gradient} rounded-2xl p-6 text-left
                    shadow-xl ${block.shadow} hover:scale-[1.02] hover:shadow-2xl
                    transition-all duration-200 cursor-pointer border border-white/10 overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />

                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm">
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-white/50" />
                      <ArrowRight className="h-4 w-4 text-white/50 group-hover:text-white/90 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>

                  <h2 className="text-white font-bold text-lg leading-tight mb-1">
                    {block.title}
                  </h2>
                  <p className="text-white/65 text-sm leading-snug mb-3">
                    {block.subtitle}
                  </p>
                  <p className="text-white/45 text-xs leading-relaxed">
                    {block.description}
                  </p>

                  <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full bg-white/5 -mr-8 -mb-8" />
                  <div className="absolute bottom-0 right-0 w-14 h-14 rounded-full bg-white/5 -mr-2 -mb-2" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeismoNetProject;
