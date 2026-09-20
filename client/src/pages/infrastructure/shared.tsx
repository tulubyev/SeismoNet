import { CheckCircle2, AlertTriangle } from "lucide-react";

export { useErrorToast } from "@/pages/admin/users/shared";

// Construction-type / "конструктив" option list, shared by the
// InfrastructureObjects filter bar and ObjectDialog's "Конструктив" select
// so it isn't duplicated in two places.
export const constructionTypeOptions = [
  { value: 'all',        label: 'Все типы конструкций' },
  { value: 'monolithic', label: 'Монолит' },
  { value: 'frame',      label: 'Каркас' },
  { value: 'brick',      label: 'Кирпич' },
  { value: 'panel',      label: 'Панельное' },
  // legacy values
  { value: 'reinforced_concrete', label: 'Ж/Б каркас' },
  { value: 'steel',   label: 'Стальной каркас' },
  { value: 'masonry', label: 'Кирпичная кладка' },
  { value: 'wood',    label: 'Деревянный' },
  { value: 'mixed',   label: 'Смешанная система' },
];

// Same list minus the "all objects" filter sentinel — used by ObjectDialog's
// "Конструктив" select.
export const STRUCTURAL_SYSTEM_OPTIONS = constructionTypeOptions.filter(o => o.value !== 'all');

export const conditionInfo = (condition: string | null) => {
  switch (condition) {
    case 'good':         return { label: 'Хорошее',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> };
    case 'satisfactory': return { label: 'Удовл.',       cls: 'bg-blue-100    text-blue-700    border-blue-200',    icon: null };
    case 'poor':         return { label: 'Плохое',       cls: 'bg-amber-100   text-amber-700   border-amber-200',   icon: <AlertTriangle className="h-3 w-3" /> };
    case 'critical':     return { label: 'Критическое', cls: 'bg-red-100      text-red-700     border-red-200',     icon: <AlertTriangle className="h-3 w-3" /> };
    default:             return { label: 'Н/Д',          cls: 'bg-slate-100   text-slate-500',                      icon: null };
  }
};
