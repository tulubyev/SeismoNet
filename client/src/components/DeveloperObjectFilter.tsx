import { FC, useMemo } from 'react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { HardHat, Building2, Home } from 'lucide-react';
import type { Developer, InfrastructureObject, DeveloperObject } from '@shared/schema';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DeveloperObjectFilterValue {
  developerName: string;   // 'all' or developer.name
  complexName:   string;   // 'all' or complex name from completedObjects / plannedObjects
  objectId:      string;   // 'all' or infrastructureObject.id.toString()
}

export const DEVELOPER_FILTER_DEFAULT: DeveloperObjectFilterValue = {
  developerName: 'all',
  complexName:   'all',
  objectId:      'all',
};

interface Props {
  developers: Developer[];
  objects:    InfrastructureObject[];
  value:      DeveloperObjectFilterValue;
  onChange:   (v: DeveloperObjectFilterValue) => void;
  popoverZIndex?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getComplexes(dev: Developer | undefined): DeveloperObject[] {
  if (!dev) return [];
  const completed: DeveloperObject[] = Array.isArray(dev.completedObjects) ? dev.completedObjects as DeveloperObject[] : [];
  const planned:   DeveloperObject[] = Array.isArray(dev.plannedObjects)   ? dev.plannedObjects   as DeveloperObject[] : [];
  const seen = new Set<string>();
  const result: DeveloperObject[] = [];
  for (const obj of [...completed, ...planned]) {
    if (obj?.name && !seen.has(obj.name)) {
      seen.add(obj.name);
      result.push(obj);
    }
  }
  return result.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ru'));
}

// ── Component ──────────────────────────────────────────────────────────────────

const DeveloperObjectFilter: FC<Props> = ({
  developers,
  objects,
  value,
  onChange,
  popoverZIndex = 1001,
}) => {
  const contentStyle = { zIndex: popoverZIndex };

  // All known developer names (union of developers table + infra objects)
  const developerNames = useMemo(() => {
    const names = new Set<string>();
    developers.forEach(d => names.add(d.name));
    objects.forEach(o => { if (o.developer) names.add(o.developer); });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'ru'));
  }, [developers, objects]);

  const selectedDeveloper = useMemo(
    () => developers.find(d => d.name === value.developerName),
    [developers, value.developerName],
  );

  // Complexes for the selected developer
  const complexes = useMemo(
    () => getComplexes(selectedDeveloper),
    [selectedDeveloper],
  );

  // Infra objects matching developer (and optionally complex name)
  const filteredObjects = useMemo(() => {
    if (value.developerName === 'all') return [];
    const byDev = objects.filter(o => (o.developer ?? '') === value.developerName);
    if (value.complexName === 'all') return byDev;
    // Fuzzy match: object name starts with or contains complex name
    const needle = value.complexName.toLowerCase();
    return byDev.filter(o =>
      o.name.toLowerCase().includes(needle) ||
      (o.address ?? '').toLowerCase().includes(needle),
    );
  }, [objects, value.developerName, value.complexName]);

  const handleDevChange = (name: string) => {
    onChange({ developerName: name, complexName: 'all', objectId: 'all' });
  };
  const handleComplexChange = (name: string) => {
    onChange({ ...value, complexName: name, objectId: 'all' });
  };
  const handleObjectChange = (id: string) => {
    onChange({ ...value, objectId: id });
  };

  const devDisabled     = developerNames.length === 0;
  const complexDisabled = value.developerName === 'all' || complexes.length === 0;
  const objDisabled     = value.developerName === 'all';

  return (
    <div className="space-y-2">
      {/* Level 1 — Застройщик */}
      <Select
        value={value.developerName}
        onValueChange={handleDevChange}
        disabled={devDisabled}
      >
        <SelectTrigger className="h-9 text-sm" data-testid="dev-filter-developer">
          <HardHat className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
          <SelectValue placeholder="Застройщик" />
        </SelectTrigger>
        <SelectContent style={contentStyle} className="max-h-72">
          <SelectItem value="all">Все застройщики</SelectItem>
          {developerNames.map(name => (
            <SelectItem key={name} value={name}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Level 2 — Жилой комплекс */}
      <Select
        value={value.complexName}
        onValueChange={handleComplexChange}
        disabled={complexDisabled}
      >
        <SelectTrigger className="h-9 text-sm" data-testid="dev-filter-complex">
          <Building2 className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
          <SelectValue placeholder={complexDisabled ? 'Сначала выберите застройщика' : 'Жилой комплекс / проект'} />
        </SelectTrigger>
        <SelectContent style={contentStyle} className="max-h-72">
          <SelectItem value="all">Все ЖК и проекты</SelectItem>
          {complexes.map(c => (
            <SelectItem key={c.name} value={c.name}>
              {c.name}
              {c.year ? ` (${c.year})` : ''}
              {c.district ? ` · ${c.district}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Level 3 — Конкретный объект */}
      <Select
        value={value.objectId}
        onValueChange={handleObjectChange}
        disabled={objDisabled}
      >
        <SelectTrigger className="h-9 text-sm" data-testid="dev-filter-object">
          <Home className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
          <SelectValue placeholder={objDisabled ? 'Сначала выберите застройщика' : 'Конкретный объект'} />
        </SelectTrigger>
        <SelectContent style={contentStyle} className="max-h-72">
          <SelectItem value="all">Все объекты{value.developerName !== 'all' ? ` застройщика` : ''}</SelectItem>
          {filteredObjects.map(o => (
            <SelectItem key={o.id} value={String(o.id)}>
              {o.name}
              {o.address ? ` · ${o.address}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DeveloperObjectFilter;
