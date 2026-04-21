import { FC } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { FileText, BarChart2, History, Layers, ArrowRight } from 'lucide-react';
import type { SeismogramRecord, SeismicCalculation, SoilProfile } from '@shared/schema';

interface BlockDef {
  href: string;
  title: string;
  subtitle: string;
  description: string;
  icon: FC<{ className?: string }>;
  gradient: string;
  shadow: string;
  badge?: number | null;
  badgeLabel?: string;
}

const DataAnalysis: FC = () => {
  const [, navigate] = useLocation();

  const { data: seismograms = [] } = useQuery<SeismogramRecord[]>({
    queryKey: ['/api/seismograms'],
  });

  const { data: calculations = [] } = useQuery<SeismicCalculation[]>({
    queryKey: ['/api/calculations'],
  });

  const { data: soilProfiles = [] } = useQuery<SoilProfile[]>({
    queryKey: ['/api/soil-profiles'],
  });

  const blocks: BlockDef[] = [
    {
      href:        '/seismograms',
      title:       'Сейсмограммы',
      subtitle:    'Запись, просмотр и экспорт сейсмических волн',
      description: 'Архив сейсмограмм с фильтрацией по станции, дате и типу события. Просмотр трёхкомпонентных записей, экспорт в стандартные форматы',
      icon:        FileText,
      gradient:    'from-violet-600 to-violet-800',
      shadow:      'shadow-violet-900/40',
      badge:       seismograms.length,
      badgeLabel:  'записей в архиве',
    },
    {
      href:        '/analysis',
      title:       'Спектральный анализ',
      subtitle:    'Фурье-анализ, АЧХ, спектры отклика, калибровка',
      description: 'Обработка сейсмограмм методом Фурье, расчёт амплитудно-частотных характеристик грунта, спектры отклика по нормам СП 14.13330',
      icon:        BarChart2,
      gradient:    'from-rose-500 to-rose-700',
      shadow:      'shadow-rose-900/40',
      badge:       null,
    },
    {
      href:        '/calculations',
      title:       'История Расчётов',
      subtitle:    'Сохранённые спектры отклика, МТСМ, анализ резонанса',
      description: 'Архив выполненных расчётов с возможностью сравнения результатов, аннотирования, экспорта в CSV и PDF. Фильтрация по типу расчёта и дате',
      icon:        History,
      gradient:    'from-amber-500 to-amber-700',
      shadow:      'shadow-amber-900/40',
      badge:       calculations.length > 0 ? calculations.length : null,
      badgeLabel:  'расчётов сохранено',
    },
    {
      href:        '/soil-database',
      title:       'Инженерная геология',
      subtitle:    'Грунтовые разрезы, категории СП 14, параметры Vs/Vp',
      description: 'База данных инженерно-геологических условий объектов Иркутска. Стратиграфия, скоростные профили, категории грунтов по СП 14.13330 для расчётов усиления сейсмического воздействия',
      icon:        Layers,
      gradient:    'from-teal-600 to-teal-800',
      shadow:      'shadow-teal-900/40',
      badge:       soilProfiles.length > 0 ? soilProfiles.length : null,
      badgeLabel:  'геологических профилей',
    },
  ];

  return (
    <div className="min-h-full bg-slate-900">
      <div className="px-6 pt-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Анализ данных</h1>
            <p className="text-slate-400 text-base">
              Просмотр сейсмограмм, спектральный анализ и расчёт характеристик грунта
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                    <ArrowRight className="h-4 w-4 text-white/50 group-hover:text-white/90 group-hover:translate-x-1 transition-all mt-1" />
                  </div>

                  <h2 className="text-white font-bold text-xl leading-tight mb-1">
                    {block.title}
                  </h2>
                  <p className="text-white/65 text-sm leading-snug mb-3">
                    {block.subtitle}
                  </p>
                  <p className="text-white/45 text-xs leading-relaxed mb-4">
                    {block.description}
                  </p>

                  {block.badge !== null && block.badge !== undefined && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">{block.badge}</span>
                      <span className="text-white/60 text-xs">{block.badgeLabel}</span>
                    </div>
                  )}

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

export default DataAnalysis;
