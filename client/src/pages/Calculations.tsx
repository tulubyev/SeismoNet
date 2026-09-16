import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Layers as LayersIcon, Building2, TriangleAlert, Trash2, Download, Eye, Search, Database, FileBarChart, History, GitCompareArrows, X, Bookmark, Link2, FolderOpen } from 'lucide-react';
import type { SeismicCalculation, SoilProfile, InfrastructureObject, ComparisonSet } from '@shared/schema';
import { CalcType, TYPE_META, summary, paramsToCsv, downloadCsv, listToCsv } from '@/pages/calculations/shared';
import { CalcDetailDialog } from '@/pages/calculations/CalcDetailDialog';
import { CompareDialog } from '@/pages/calculations/CompareDialog';


const Calculations: FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | CalcType>('all');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<SeismicCalculation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SeismicCalculation | null>(null);
  const [confirmDeleteSet, setConfirmDeleteSet] = useState<ComparisonSet | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const MAX_COMPARE = 3;

  const { data: calcs = [], isLoading } = useQuery<SeismicCalculation[]>({
    queryKey: ['/api/calculations', { limit: 500 }],
    queryFn: async () => {
      const r = await fetch('/api/calculations?limit=500');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
  });
  const { data: profiles = [] } = useQuery<SoilProfile[]>({ queryKey: ['/api/soil-profiles'] });
  const { data: objects  = [] } = useQuery<InfrastructureObject[]>({ queryKey: ['/api/infrastructure-objects'] });
  const { data: savedSets = [] } = useQuery<ComparisonSet[]>({ queryKey: ['/api/comparison-sets'] });

  const profMap = useMemo(() => new Map(profiles.map(p => [p.id, p])), [profiles]);
  const objMap  = useMemo(() => new Map(objects.map(o => [o.id, o])), [objects]);

  const counts = useMemo(() => ({
    all: calcs.length,
    mtsm: calcs.filter(c => c.calcType === 'mtsm').length,
    response_spectrum: calcs.filter(c => c.calcType === 'response_spectrum').length,
    resonance: calcs.filter(c => c.calcType === 'resonance').length,
  }), [calcs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return calcs.filter(c => {
      if (activeTab !== 'all' && c.calcType !== activeTab) return false;
      if (!q) return true;
      const prof = c.soilProfileId ? profMap.get(c.soilProfileId)?.profileName ?? '' : '';
      const obj  = c.objectId      ? objMap.get(c.objectId)?.name              ?? '' : '';
      const typeLabel = TYPE_META[c.calcType as CalcType]?.label ?? '';
      const hay = [c.calcType, typeLabel, prof, obj, summary(c), c.notes ?? '', String(c.id)].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [calcs, activeTab, search, profMap, objMap]);

  const grouped = useMemo(() => {
    const map: Record<CalcType, SeismicCalculation[]> = { mtsm: [], response_spectrum: [], resonance: [] };
    for (const c of filtered) {
      const t = c.calcType as CalcType;
      if (map[t]) map[t].push(c);
    }
    return map;
  }, [filtered]);

  const calcMap = useMemo(() => new Map(calcs.map(c => [c.id, c])), [calcs]);
  const selectedCalcs = useMemo(
    () => selected.map(id => calcMap.get(id)).filter(Boolean) as SeismicCalculation[],
    [selected, calcMap],
  );
  const selectionType: CalcType | null = selectedCalcs[0]?.calcType as CalcType ?? null;

  // Deep-link: /calculations?compare=12,17 — auto-open the compare dialog with those IDs.
  // Runs once after `calcs` first loads so we can validate the IDs against existing rows.
  const deepLinkConsumedRef = useRef(false);
  useEffect(() => {
    if (deepLinkConsumedRef.current || calcs.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('compare');
    if (!raw) { deepLinkConsumedRef.current = true; return; }
    const ids = raw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isInteger(n));
    const valid = ids.filter(id => calcMap.has(id)).slice(0, MAX_COMPARE);
    if (valid.length >= 2) {
      const firstType = calcMap.get(valid[0])?.calcType;
      const sameType = valid.every(id => calcMap.get(id)?.calcType === firstType);
      if (sameType && (firstType === 'mtsm' || firstType === 'response_spectrum' || firstType === 'resonance')) {
        setSelected(valid);
        setCompareOpen(true);
      } else {
        toast({ title: 'Не удалось открыть сравнение из ссылки',
          description: 'Расчёты должны быть одного типа (МТСМ, спектр отклика или резонанс).',
          variant: 'destructive' });
      }
    } else if (raw) {
      toast({ title: 'Не удалось открыть сравнение из ссылки',
        description: 'Указанные расчёты не найдены или их меньше двух.',
        variant: 'destructive' });
    }
    deepLinkConsumedRef.current = true;
    // Strip only the `compare` param so refresh doesn't re-trigger; preserve
    // any unrelated query params a future feature may rely on.
    params.delete('compare');
    const qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
  }, [calcs, calcMap, toast]);

  // Prune stale selected IDs whenever the calc list changes (e.g. after delete/refetch).
  // Without this, an ID that no longer exists in `calcs` would silently block all further
  // selections (toolbar hides because selectedCalcs is empty, but toggleSelect still sees
  // a non-empty `selected` and rejects different types).
  useEffect(() => {
    if (selected.length === 0) return;
    const valid = selected.filter(id => calcMap.has(id));
    if (valid.length !== selected.length) setSelected(valid);
  }, [calcMap, selected]);

  const toggleSelect = (c: SeismicCalculation) => {
    setSelected(prev => {
      if (prev.includes(c.id)) return prev.filter(id => id !== c.id);
      // Resolve current valid selections from the live calcMap. If none of the previously
      // selected IDs exist anymore, treat the selection as empty rather than getting stuck.
      const validPrev = prev.filter(id => calcMap.has(id));
      if (validPrev.length === 0) return [c.id];
      const firstType = calcMap.get(validPrev[0])?.calcType;
      if (firstType !== c.calcType) {
        toast({ title: 'Можно сравнивать расчёты только одного типа',
          description: 'Снимите текущий выбор, чтобы выбрать расчёты другого типа.', variant: 'destructive' });
        return validPrev;
      }
      if (validPrev.length >= MAX_COMPARE) {
        toast({ title: `Можно сравнить не более ${MAX_COMPARE} расчётов одновременно`, variant: 'destructive' });
        return validPrev;
      }
      return [...validPrev, c.id];
    });
  };

  const canCompare = selectedCalcs.length >= 2 &&
    (selectionType === 'mtsm' || selectionType === 'response_spectrum' || selectionType === 'resonance');

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/calculations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calculations', { limit: 500 }] });
      // Saved sets reference calc IDs; refresh so the "missing" badge stays accurate.
      queryClient.invalidateQueries({ queryKey: ['/api/comparison-sets'] });
      toast({ title: 'Расчёт удалён' });
      setConfirmDelete(null);
    },
    onError: () => toast({ title: 'Ошибка удаления', description: 'Удаление доступно только администраторам', variant: 'destructive' }),
  });

  const saveSetMut = useMutation({
    mutationFn: async (input: { name: string; calcType: string; calcIds: number[] }) => {
      const r = await apiRequest('POST', '/api/comparison-sets', input);
      return r.json() as Promise<ComparisonSet>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/comparison-sets'] });
      toast({ title: 'Набор сравнения сохранён' });
    },
    onError: () => toast({ title: 'Не удалось сохранить набор',
      description: 'Сохранение доступно после входа.', variant: 'destructive' }),
  });

  const deleteSetMut = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/comparison-sets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/comparison-sets'] });
      toast({ title: 'Набор удалён' });
      setConfirmDeleteSet(null);
    },
    onError: () => toast({ title: 'Ошибка удаления набора', variant: 'destructive' }),
  });

  const openSavedSet = (set: ComparisonSet) => {
    const valid = set.calcIds.filter(id => calcMap.has(id));
    if (valid.length < 2) {
      toast({ title: 'Невозможно открыть набор',
        description: 'Часть расчётов из этого набора удалена. Останется меньше двух — нечего сравнивать.',
        variant: 'destructive' });
      return;
    }
    setSelected(valid.slice(0, MAX_COMPARE));
    setCompareOpen(true);
  };

  const copyShareLink = async (ids: number[], label?: string) => {
    const url = `${window.location.origin}/calculations?compare=${ids.join(',')}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Ссылка скопирована',
        description: label ? `«${label}» — ссылка в буфере обмена.` : 'Ссылка в буфере обмена.' });
    } catch {
      toast({ title: 'Не удалось скопировать', description: url, variant: 'destructive' });
    }
  };

  const renderRow = (c: SeismicCalculation) => {
    const prof = c.soilProfileId ? profMap.get(c.soilProfileId)?.profileName : null;
    const obj  = c.objectId      ? objMap.get(c.objectId)?.name              : null;
    const meta = TYPE_META[c.calcType as CalcType];
    const isSelected = selected.includes(c.id);
    const disabledForSelect = !isSelected && selectedCalcs.length > 0 && selectionType !== c.calcType;
    return (
      <div key={c.id}
        className={`grid grid-cols-12 gap-2 items-center border rounded px-3 py-2 text-xs transition-colors ${
          isSelected ? 'bg-indigo-50 border-indigo-300' : 'hover:bg-slate-50'
        }`}
        data-testid={`calc-row-${c.id}`}>
        <div className="col-span-12 md:col-span-2 flex items-center gap-2">
          <Checkbox
            checked={isSelected}
            disabled={disabledForSelect}
            onCheckedChange={() => toggleSelect(c)}
            aria-label="Выбрать для сравнения"
            data-testid={`checkbox-compare-${c.id}`}
          />
          <Badge variant="outline" className={`${meta?.color ?? ''} gap-1 text-[10px] font-medium`}>
            {meta?.icon}{meta?.label.split(' — ')[0] ?? c.calcType}
          </Badge>
          <span className="text-slate-400">#{c.id}</span>
        </div>
        <div className="col-span-12 md:col-span-2 text-slate-600">
          {new Date(c.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
        </div>
        <div className="col-span-12 md:col-span-2 truncate">
          {prof && <div className="text-cyan-700">📍 {prof}</div>}
          {obj  && <div className="text-blue-700 truncate">🏢 {obj}</div>}
          {!prof && !obj && <span className="text-slate-300">—</span>}
        </div>
        <div className="col-span-12 md:col-span-4 text-slate-600 font-mono text-[11px] truncate" title={summary(c)}>
          {summary(c)}
        </div>
        <div className="col-span-12 md:col-span-2 flex justify-end gap-1">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={() => setViewing(c)} data-testid={`btn-view-${c.id}`}>
            <Eye className="h-3 w-3" /> График
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={() => downloadCsv(`calc_${c.calcType}_${c.id}.csv`, paramsToCsv(c))}
            data-testid={`btn-csv-${c.id}`}>
            <Download className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-600 hover:bg-red-50"
            onClick={() => setConfirmDelete(c)} data-testid={`btn-delete-${c.id}`}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  const renderGroup = (t: CalcType) => {
    const rows = grouped[t];
    if (rows.length === 0) return null;
    const meta = TYPE_META[t];
    return (
      <Card key={t} className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4 flex-row items-center gap-2">
          {meta.icon}
          <CardTitle className="text-sm text-slate-700">{meta.label}</CardTitle>
          <Badge variant="secondary" className="ml-2">{rows.length}</Badge>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-1.5">
          {rows.map(renderRow)}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-4" data-testid="page-calculations">
      <div className="flex items-center gap-3 mb-2">
        <History className="h-6 w-6 text-indigo-600" />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800">История расчётов</h1>
          <p className="text-sm text-slate-500">
            Все сохранённые анализы: МТСМ-усиление, спектр отклика и резонанс грунт–здание
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1"
          disabled={filtered.length === 0}
          onClick={() => downloadCsv(`calculations_${activeTab}_${new Date().toISOString().slice(0,10)}.csv`,
                                     listToCsv(filtered, profiles, objects))}
          data-testid="btn-export-list">
          <Download className="h-3.5 w-3.5" /> Экспорт списка (CSV)
        </Button>
      </div>

      {selectedCalcs.length > 0 && (
        <div className="flex items-center gap-3 rounded border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs"
          data-testid="compare-toolbar">
          <GitCompareArrows className="h-4 w-4 text-indigo-600" />
          <div className="flex-1 text-indigo-900">
            Выбрано для сравнения: <strong>{selectedCalcs.length}</strong> / {MAX_COMPARE}
            {selectionType && (
              <span className="ml-2 text-indigo-700">
                · тип: {TYPE_META[selectionType]?.label.split(' — ')[0]}
              </span>
            )}
            {selectedCalcs.length === 1 && (
              <span className="ml-2 text-indigo-600">— выберите ещё минимум один расчёт того же типа</span>
            )}
          </div>
          <Button size="sm" variant="default" className="h-7 text-xs gap-1 bg-indigo-600 hover:bg-indigo-700"
            disabled={!canCompare}
            onClick={() => setCompareOpen(true)}
            data-testid="btn-open-compare">
            <GitCompareArrows className="h-3.5 w-3.5" /> Сравнить
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
            onClick={() => setSelected([])}
            data-testid="btn-clear-selection">
            <X className="h-3.5 w-3.5" /> Очистить
          </Button>
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[14rem]">
              <Search className="h-4 w-4 text-slate-400" />
              <Input
                placeholder="Поиск по типу, профилю, зданию, заметкам…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 text-sm"
                data-testid="input-search"
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1"><Database className="h-3 w-3" /> Всего: <strong>{counts.all}</strong></span>
              <span>МТСМ: <strong>{counts.mtsm}</strong></span>
              <span>Отклик: <strong>{counts.response_spectrum}</strong></span>
              <span>Резонанс: <strong>{counts.resonance}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {savedSets.length > 0 && (
        <Card className="border-0 shadow-sm" data-testid="saved-sets-panel">
          <CardHeader className="pb-2 pt-4 px-4 flex-row items-center gap-2">
            <Bookmark className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-sm text-slate-700">Сохранённые сравнения</CardTitle>
            <Badge variant="secondary" className="ml-2">{savedSets.length}</Badge>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1.5">
            {savedSets.map(set => {
              const setMeta = TYPE_META[set.calcType as CalcType];
              const missing = set.calcIds.filter(id => !calcMap.has(id)).length;
              return (
                <div key={set.id}
                  className="grid grid-cols-12 gap-2 items-center border rounded px-3 py-2 text-xs hover:bg-amber-50/50 transition-colors"
                  data-testid={`saved-set-row-${set.id}`}>
                  <div className="col-span-12 md:col-span-5 flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className={`${setMeta?.color ?? ''} gap-1 text-[10px]`}>
                      {setMeta?.icon}{setMeta?.label.split(' — ')[0] ?? set.calcType}
                    </Badge>
                    <span className="font-medium text-slate-800 truncate" title={set.name}>{set.name}</span>
                  </div>
                  <div className="col-span-12 md:col-span-3 text-slate-500 font-mono text-[11px]">
                    #{set.calcIds.join(', #')}
                    {missing > 0 && (
                      <span className="ml-2 text-red-600" title="Часть расчётов из набора удалена">
                        ({missing} не найдено)
                      </span>
                    )}
                  </div>
                  <div className="col-span-12 md:col-span-2 text-slate-400 text-[11px]">
                    {new Date(set.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                  <div className="col-span-12 md:col-span-2 flex justify-end gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => openSavedSet(set)} data-testid={`btn-open-set-${set.id}`}>
                      <FolderOpen className="h-3 w-3" /> Открыть
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => copyShareLink(set.calcIds, set.name)}
                      data-testid={`btn-share-set-${set.id}`}
                      title="Скопировать ссылку для общего доступа">
                      <Link2 className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-red-600 hover:bg-red-50"
                      onClick={() => setConfirmDeleteSet(set)}
                      data-testid={`btn-delete-set-${set.id}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'all' | CalcType)}>
        <TabsList className="grid grid-cols-4 max-w-2xl">
          <TabsTrigger value="all" className="text-xs gap-1" data-testid="tab-all">
            <FileBarChart className="h-3.5 w-3.5" /> Все ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="mtsm" className="text-xs gap-1" data-testid="tab-mtsm">
            <LayersIcon className="h-3.5 w-3.5" /> МТСМ ({counts.mtsm})
          </TabsTrigger>
          <TabsTrigger value="response_spectrum" className="text-xs gap-1" data-testid="tab-response">
            <Building2 className="h-3.5 w-3.5" /> Отклик ({counts.response_spectrum})
          </TabsTrigger>
          <TabsTrigger value="resonance" className="text-xs gap-1" data-testid="tab-resonance">
            <TriangleAlert className="h-3.5 w-3.5" /> Резонанс ({counts.resonance})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          {isLoading && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-10 text-center text-slate-400 text-sm">
                Загрузка…
              </CardContent>
            </Card>
          )}
          {!isLoading && filtered.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-slate-400">
                <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {calcs.length === 0
                    ? 'Сохранённых расчётов пока нет. Перейдите в раздел «Расчёты» и сохраните результаты МТСМ, спектра отклика или анализа резонанса.'
                    : 'По заданному фильтру ничего не найдено'}
                </p>
              </CardContent>
            </Card>
          )}
          {!isLoading && filtered.length > 0 && (
            activeTab === 'all'
              ? <>{(['mtsm','response_spectrum','resonance'] as CalcType[]).map(renderGroup)}</>
              : renderGroup(activeTab as CalcType)
          )}
        </TabsContent>
      </Tabs>

      <CalcDetailDialog
        calc={viewing}
        profile={viewing?.soilProfileId ? profMap.get(viewing.soilProfileId) ?? null : null}
        object={viewing?.objectId ? objMap.get(viewing.objectId) ?? null : null}
        onClose={() => setViewing(null)}
      />

      <CompareDialog
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        calcs={selectedCalcs}
        profMap={profMap}
        objMap={objMap}
        onSaveSet={(name) => {
          if (!selectionType) return;
          saveSetMut.mutate({ name, calcType: selectionType, calcIds: selectedCalcs.map(c => c.id) });
        }}
        onShareLink={() => copyShareLink(selectedCalcs.map(c => c.id))}
        isSaving={saveSetMut.isPending}
      />

      <AlertDialog open={!!confirmDeleteSet} onOpenChange={open => !open && setConfirmDeleteSet(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить набор «{confirmDeleteSet?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Сами расчёты не будут затронуты — удалится только сохранённое сравнение.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-delete-set">Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => confirmDeleteSet && deleteSetMut.mutate(confirmDeleteSet.id)}
              data-testid="btn-confirm-delete-set">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={open => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить расчёт #{confirmDelete?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete && TYPE_META[confirmDelete.calcType as CalcType]?.label} от{' '}
              {confirmDelete && new Date(confirmDelete.createdAt).toLocaleString('ru-RU')}.
              Действие необратимо.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-delete">Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => confirmDelete && deleteMut.mutate(confirmDelete.id)}
              data-testid="btn-confirm-delete">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Detail dialog: re-displays the saved chart ──────────────────────────────



export default Calculations;
