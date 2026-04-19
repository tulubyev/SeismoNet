import { FC, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  BookOpen, Search, ExternalLink, ChevronDown, ChevronUp,
  Shield, FileText, Layers, Activity, Ruler
} from 'lucide-react';
import type { BuildingNorm } from '@shared/schema';

const categoryOptions = [
  { value: 'all', label: 'Все категории' },
  { value: 'seismic', label: 'Сейсмика' },
  { value: 'loads', label: 'Нагрузки' },
  { value: 'survey', label: 'Изыскания' },
  { value: 'foundations', label: 'Основания' },
  { value: 'structures', label: 'Конструкции' },
  { value: 'monitoring', label: 'Мониторинг' },
];

const categoryIcon = (cat: string) => {
  switch (cat) {
    case 'seismic': return <Shield className="h-4 w-4 text-red-500" />;
    case 'loads': return <Activity className="h-4 w-4 text-orange-500" />;
    case 'survey': return <Ruler className="h-4 w-4 text-blue-500" />;
    case 'foundations': return <Layers className="h-4 w-4 text-brown-500 text-yellow-700" />;
    case 'monitoring': return <Activity className="h-4 w-4 text-green-500" />;
    default: return <FileText className="h-4 w-4 text-slate-400" />;
  }
};

const categoryLabel = (cat: string) => {
  const found = categoryOptions.find(o => o.value === cat);
  return found ? found.label : cat;
};

const categoryBadgeClass = (cat: string) => {
  switch (cat) {
    case 'seismic': return 'bg-red-100 text-red-700 border-red-200';
    case 'loads': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'survey': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'foundations': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'monitoring': return 'bg-green-100 text-green-700 border-green-200';
    default: return 'bg-slate-100 text-slate-600';
  }
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'active': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[10px]">Действует</Badge>;
    case 'superseded': return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100 text-[10px]">Отменён</Badge>;
    case 'draft': return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-[10px]">Проект</Badge>;
    default: return null;
  }
};

const NormCard: FC<{ norm: BuildingNorm }> = ({ norm }) => {
  const [expanded, setExpanded] = useState(false);
  const params = norm.keyParameters as Record<string, any> | null;
  const sections = norm.sections as string[] | null;

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-slate-100 flex-shrink-0 mt-0.5">
              {categoryIcon(norm.category)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-sm font-bold text-slate-800">{norm.shortCode}</span>
                {statusBadge(norm.status)}
                <Badge className={`text-[10px] hover:bg-opacity-80 ${categoryBadgeClass(norm.category)}`}>
                  {categoryLabel(norm.category)}
                </Badge>
                {norm.adoptionYear && (
                  <span className="text-[10px] text-slate-400">{norm.adoptionYear} г.</span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-700 mb-1">{norm.name}</p>
              {norm.supersedes && (
                <p className="text-[10px] text-slate-400">Заменяет: {norm.supersedes}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {norm.url && (
              <a href={norm.url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-slate-400"
              onClick={() => setExpanded(v => !v)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">

            {norm.scope && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Область применения</p>
                <p className="text-xs text-slate-600">{norm.scope}</p>
              </div>
            )}

            {norm.description && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Описание</p>
                <p className="text-xs text-slate-600">{norm.description}</p>
              </div>
            )}

            {params && Object.keys(params).length > 0 && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Ключевые параметры</p>
                <div className="space-y-2">
                  {Object.entries(params).map(([key, val]) => (
                    <div key={key} className="bg-slate-50 rounded-lg p-2.5">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">
                        {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                      </p>
                      {typeof val === 'object' && val !== null ? (
                        <div className="space-y-1">
                          {Object.entries(val as Record<string, any>).map(([k, v]) => (
                            <div key={k} className="flex items-start gap-2">
                              <span className="text-[10px] font-mono text-blue-600 min-w-[80px] flex-shrink-0">{k}</span>
                              <span className="text-[10px] text-slate-600">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      ) : Array.isArray(val) ? (
                        <p className="text-xs text-slate-600">{(val as any[]).join(', ')}</p>
                      ) : (
                        <p className="text-xs text-slate-700 font-medium">{String(val)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sections && sections.length > 0 && (
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Основные разделы</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {sections.map((sec, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="text-[10px] text-slate-400 font-mono w-5 flex-shrink-0">{idx + 1}.</span>
                      {sec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {norm.url && (
              <a
                href={norm.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Открыть документ на КОДЕКС/Техэксперт
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const BuildingNorms: FC = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const { data: norms = [], isLoading } = useQuery<BuildingNorm[]>({
    queryKey: ['/api/building-norms', category !== 'all' ? `?category=${category}` : ''],
    queryFn: async () => {
      const url = category !== 'all'
        ? `/api/building-norms?category=${category}`
        : '/api/building-norms';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const filtered = norms.filter(n =>
    search === '' ||
    n.shortCode.toLowerCase().includes(search.toLowerCase()) ||
    n.name.toLowerCase().includes(search.toLowerCase()) ||
    (n.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const countByCategory = (cat: string) => norms.filter(n => n.category === cat).length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Header
          title="Нормативная база"
          subtitle="Строительные нормы и правила РФ для сейсмического мониторинга и проектирования"
        />

        <div className="p-6 space-y-5">

          {/* Category stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Всего документов', value: norms.length, icon: <BookOpen className="h-4 w-4 text-slate-600" />, bg: 'bg-slate-100' },
              { label: 'По сейсмике', value: countByCategory('seismic'), icon: <Shield className="h-4 w-4 text-red-500" />, bg: 'bg-red-50' },
              { label: 'Нагрузки / Изыскания', value: countByCategory('loads') + countByCategory('survey'), icon: <Activity className="h-4 w-4 text-orange-500" />, bg: 'bg-orange-50' },
              { label: 'Прочие', value: countByCategory('foundations') + countByCategory('monitoring') + countByCategory('structures'), icon: <FileText className="h-4 w-4 text-blue-500" />, bg: 'bg-blue-50' },
            ].map(s => (
              <Card key={s.label} className="border-0 shadow-sm bg-white">
                <CardContent className="pt-4 pb-3">
                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2 ${s.bg}`}>
                    {s.icon}
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="pt-4 pb-3">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Поиск по коду, названию или описанию..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 w-48 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Norms list */}
          <div className="space-y-3">
            {isLoading ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center text-slate-400 text-sm">Загрузка документов...</CardContent>
              </Card>
            ) : filtered.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm text-slate-400">Документы не найдены</p>
                </CardContent>
              </Card>
            ) : (
              filtered.map(norm => <NormCard key={norm.id} norm={norm} />)
            )}
          </div>

          <p className="text-[10px] text-slate-400 text-center">
            Все нормативные документы являются официально опубликованными актами РФ. Ссылки ведут на официальные базы документов.
          </p>
        </div>
      </main>
    </div>
  );
};

export default BuildingNorms;
