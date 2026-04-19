import { FC, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog';
import {
  Building2, Search, Globe, Phone, Mail, MapPin, FileBadge, Activity,
  Plus, Pencil, Trash2, Save, X as IconX, CheckCircle2, AlertCircle,
  Clock, Ban, Pause, ShieldCheck, ExternalLink, HardHat, FileText,
  Calendar
} from 'lucide-react';
import type { Developer, DeveloperLicense, DeveloperObject } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// ─── Lookups ──────────────────────────────────────────────────────────────────

type MonitoringStatus =
  | 'connected' | 'pending' | 'invited' | 'not_connected' | 'declined' | 'suspended';

const STATUS_INFO: Record<MonitoringStatus, { label: string; cls: string; icon: JSX.Element }> = {
  connected:     { label: 'Подключён',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" /> },
  pending:       { label: 'Согласование',  cls: 'bg-blue-100 text-blue-700 border-blue-200',         icon: <Clock className="h-3 w-3" /> },
  invited:       { label: 'Приглашён',     cls: 'bg-indigo-100 text-indigo-700 border-indigo-200',   icon: <FileText className="h-3 w-3" /> },
  not_connected: { label: 'Не подключён',  cls: 'bg-slate-100 text-slate-600 border-slate-200',      icon: <AlertCircle className="h-3 w-3" /> },
  declined:      { label: 'Отказ',         cls: 'bg-red-100 text-red-700 border-red-200',            icon: <Ban className="h-3 w-3" /> },
  suspended:     { label: 'Приостановлен', cls: 'bg-amber-100 text-amber-700 border-amber-200',      icon: <Pause className="h-3 w-3" /> },
};

const LEGAL_FORMS = ['ООО', 'ООО СЗ', 'АО', 'ПАО', 'ОАО', 'ГК', 'СЗ', 'ИП', 'ЗАО'];

const BLANK: Omit<Developer, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  legalForm: null,
  inn: null,
  ogrn: null,
  legalAddress: null,
  officeAddress: null,
  website: null,
  phone: null,
  email: null,
  contactPerson: null,
  totalAreaThousandSqm: null,
  licenses: [],
  completedObjects: [],
  plannedObjects: [],
  monitoringStatus: 'not_connected',
  monitoringConnectedDate: null,
  monitoringNotes: null,
  notes: null,
  isActive: true,
};

const isMonitoringStatus = (s: string): s is MonitoringStatus =>
  s === 'connected' || s === 'pending' || s === 'invited' ||
  s === 'not_connected' || s === 'declined' || s === 'suspended';

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge: FC<{ status: string }> = ({ status }) => {
  const key = isMonitoringStatus(status) ? status : 'not_connected';
  const info = STATUS_INFO[key];
  return (
    <Badge variant="outline" className={`${info.cls} flex items-center gap-1 text-[11px] font-medium`}>
      {info.icon}{info.label}
    </Badge>
  );
};

// ─── Card preview ─────────────────────────────────────────────────────────────

const DeveloperCard: FC<{
  dev: Developer;
  onOpen: () => void;
}> = ({ dev, onOpen }) => {
  const completed = (dev.completedObjects ?? []) as DeveloperObject[];
  const planned   = (dev.plannedObjects ?? [])   as DeveloperObject[];
  const licenses  = (dev.licenses ?? [])         as DeveloperLicense[];
  return (
    <Card className="border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer" onClick={onOpen}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2 truncate">
              <HardHat className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="truncate">{dev.name}</span>
            </CardTitle>
            {dev.legalForm && (
              <p className="text-[11px] text-slate-500 mt-0.5">{dev.legalForm}</p>
            )}
          </div>
          <StatusBadge status={dev.monitoringStatus} />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {dev.totalAreaThousandSqm && (
          <div className="text-xs text-slate-700">
            <span className="text-slate-500">Площадь: </span>
            <span className="font-semibold">{dev.totalAreaThousandSqm} тыс. м²</span>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-100">
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Введено</p>
            <p className="text-sm font-semibold text-emerald-700">{completed.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Планы</p>
            <p className="text-sm font-semibold text-blue-700">{planned.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Лицензий</p>
            <p className="text-sm font-semibold text-slate-700">{licenses.length}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
          {dev.website && (
            <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{dev.website.replace(/^https?:\/\//, '')}</span>
          )}
          {dev.phone && (
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{dev.phone}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Edit/Create Dialog ───────────────────────────────────────────────────────

const DeveloperDialog: FC<{
  dev: Developer | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}> = ({ dev, open, onOpenChange, onSaved }) => {
  const { toast } = useToast();
  const [form, setForm] = useState<typeof BLANK>(() => dev ? mapDevToForm(dev) : { ...BLANK });
  const isEdit = !!dev;

  // Re-init when dialog opens with different developer
  useEffect(() => {
    if (open) setForm(dev ? mapDevToForm(dev) : { ...BLANK });
  }, [open, dev?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  const createMut = useMutation({
    mutationFn: (data: typeof BLANK) => apiRequest('POST', '/api/developers', data),
    onSuccess: () => { toast({ title: 'Застройщик создан' }); onSaved(); onOpenChange(false); },
    onError: () => toast({ title: 'Ошибка при создании', variant: 'destructive' }),
  });
  const updateMut = useMutation({
    mutationFn: (data: typeof BLANK) => apiRequest('PATCH', `/api/developers/${dev!.id}`, data),
    onSuccess: () => { toast({ title: 'Изменения сохранены' }); onSaved(); onOpenChange(false); },
    onError: () => toast({ title: 'Ошибка при сохранении', variant: 'destructive' }),
  });

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: 'Введите название застройщика', variant: 'destructive' });
      return;
    }
    const payload = {
      ...form,
      totalAreaThousandSqm: form.totalAreaThousandSqm
        ? String(form.totalAreaThousandSqm)
        : null,
    };
    if (isEdit) updateMut.mutate(payload);
    else        createMut.mutate(payload);
  };

  const update = <K extends keyof typeof BLANK>(key: K, value: typeof BLANK[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // ─── License editor ────────────────────────────────────────────────────────
  const licenses = (form.licenses ?? []) as DeveloperLicense[];
  const setLicenses = (l: DeveloperLicense[]) => update('licenses', l);
  const addLicense = () => setLicenses([...licenses, { number: '', type: '' }]);
  const removeLicense = (i: number) => setLicenses(licenses.filter((_, j) => j !== i));
  const updateLicense = (i: number, patch: Partial<DeveloperLicense>) =>
    setLicenses(licenses.map((l, j) => j === i ? { ...l, ...patch } : l));

  // ─── Completed/Planned objects editors ─────────────────────────────────────
  const completed = (form.completedObjects ?? []) as DeveloperObject[];
  const setCompleted = (l: DeveloperObject[]) => update('completedObjects', l);
  const addCompleted = () => setCompleted([...completed, { name: '' }]);
  const removeCompleted = (i: number) => setCompleted(completed.filter((_, j) => j !== i));
  const updateCompleted = (i: number, patch: Partial<DeveloperObject>) =>
    setCompleted(completed.map((o, j) => j === i ? { ...o, ...patch } : o));

  const planned = (form.plannedObjects ?? []) as DeveloperObject[];
  const setPlanned = (l: DeveloperObject[]) => update('plannedObjects', l);
  const addPlanned = () => setPlanned([...planned, { name: '' }]);
  const removePlanned = (i: number) => setPlanned(planned.filter((_, j) => j !== i));
  const updatePlanned = (i: number, patch: Partial<DeveloperObject>) =>
    setPlanned(planned.map((o, j) => j === i ? { ...o, ...patch } : o));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-blue-600" />
            {isEdit ? `Редактирование: ${dev!.name}` : 'Новый застройщик'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-2">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="info">Компания</TabsTrigger>
            <TabsTrigger value="licenses">Лицензии ({licenses.length})</TabsTrigger>
            <TabsTrigger value="objects">Объекты ({completed.length}/{planned.length})</TabsTrigger>
            <TabsTrigger value="monitoring">Мониторинг</TabsTrigger>
          </TabsList>

          {/* ── Company info ── */}
          <TabsContent value="info" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Наименование *</Label>
                <Input value={form.name} onChange={e => update('name', e.target.value)} placeholder="ГК «Новый город»" />
              </div>
              <div>
                <Label className="text-xs">Юридическая форма</Label>
                <Select value={form.legalForm ?? 'none'} onValueChange={v => update('legalForm', v === 'none' ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Выбрать..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не указано</SelectItem>
                    {LEGAL_FORMS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Сум. площадь (тыс. м²)</Label>
                <Input type="number" step="0.1" value={form.totalAreaThousandSqm ?? ''}
                       onChange={e => update('totalAreaThousandSqm', e.target.value || null)} />
              </div>
              <div>
                <Label className="text-xs">ИНН</Label>
                <Input value={form.inn ?? ''} onChange={e => update('inn', e.target.value || null)} />
              </div>
              <div>
                <Label className="text-xs">ОГРН</Label>
                <Input value={form.ogrn ?? ''} onChange={e => update('ogrn', e.target.value || null)} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Юридический адрес</Label>
                <Input value={form.legalAddress ?? ''} onChange={e => update('legalAddress', e.target.value || null)} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Офис / фактический адрес</Label>
                <Input value={form.officeAddress ?? ''} onChange={e => update('officeAddress', e.target.value || null)} />
              </div>
              <div>
                <Label className="text-xs">Сайт</Label>
                <Input value={form.website ?? ''} onChange={e => update('website', e.target.value || null)} placeholder="https://example.ru" />
              </div>
              <div>
                <Label className="text-xs">Телефон</Label>
                <Input value={form.phone ?? ''} onChange={e => update('phone', e.target.value || null)} />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.email ?? ''} onChange={e => update('email', e.target.value || null)} />
              </div>
              <div>
                <Label className="text-xs">Контактное лицо</Label>
                <Input value={form.contactPerson ?? ''} onChange={e => update('contactPerson', e.target.value || null)} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Заметки</Label>
                <Textarea rows={2} value={form.notes ?? ''} onChange={e => update('notes', e.target.value || null)} />
              </div>
            </div>
          </TabsContent>

          {/* ── Licenses ── */}
          <TabsContent value="licenses" className="space-y-2 mt-4">
            {licenses.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-3">Лицензий не добавлено</p>
            )}
            {licenses.map((lic, i) => (
              <Card key={i} className="bg-slate-50">
                <CardContent className="p-3 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px]">Номер</Label>
                    <Input value={lic.number} onChange={e => updateLicense(i, { number: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-[11px]">Тип</Label>
                    <Input value={lic.type} onChange={e => updateLicense(i, { type: e.target.value })} placeholder="СРО / Минстрой / ..." />
                  </div>
                  <div>
                    <Label className="text-[11px]">Дата выдачи</Label>
                    <Input type="date" value={lic.issuedDate ?? ''} onChange={e => updateLicense(i, { issuedDate: e.target.value || undefined })} />
                  </div>
                  <div>
                    <Label className="text-[11px]">Срок действия</Label>
                    <Input type="date" value={lic.expiryDate ?? ''} onChange={e => updateLicense(i, { expiryDate: e.target.value || undefined })} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-[11px]">Кем выдана / область</Label>
                    <Input value={lic.issuer ?? ''} onChange={e => updateLicense(i, { issuer: e.target.value || undefined })} />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button size="sm" variant="ghost" className="text-red-600 h-7" onClick={() => removeLicense(i)}>
                      <Trash2 className="h-3 w-3 mr-1" />Удалить
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button size="sm" variant="outline" onClick={addLicense} className="w-full">
              <Plus className="h-3 w-3 mr-1" />Добавить лицензию
            </Button>
          </TabsContent>

          {/* ── Objects ── */}
          <TabsContent value="objects" className="space-y-4 mt-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />Введённые объекты ({completed.length})
              </h4>
              {completed.map((o, i) => (
                <ObjectEditor key={i} obj={o} kind="completed"
                              onChange={p => updateCompleted(i, p)} onRemove={() => removeCompleted(i)} />
              ))}
              <Button size="sm" variant="outline" onClick={addCompleted} className="w-full mt-1">
                <Plus className="h-3 w-3 mr-1" />Добавить введённый объект
              </Button>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <Calendar className="h-4 w-4 text-blue-600" />Планируемые к вводу ({planned.length})
              </h4>
              {planned.map((o, i) => (
                <ObjectEditor key={i} obj={o} kind="planned"
                              onChange={p => updatePlanned(i, p)} onRemove={() => removePlanned(i)} />
              ))}
              <Button size="sm" variant="outline" onClick={addPlanned} className="w-full mt-1">
                <Plus className="h-3 w-3 mr-1" />Добавить планируемый объект
              </Button>
            </div>
          </TabsContent>

          {/* ── Monitoring program ── */}
          <TabsContent value="monitoring" className="space-y-3 mt-4">
            <div>
              <Label className="text-xs">Состояние подключения к программе сейсмического мониторинга</Label>
              <Select value={form.monitoringStatus} onValueChange={v => update('monitoringStatus', v as MonitoringStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_INFO) as MonitoringStatus[]).map(k => (
                    <SelectItem key={k} value={k}>{STATUS_INFO[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Дата подключения</Label>
              <Input type="date"
                     value={form.monitoringConnectedDate
                       ? new Date(form.monitoringConnectedDate).toISOString().slice(0,10) : ''}
                     onChange={e => update('monitoringConnectedDate', e.target.value ? new Date(e.target.value) : null)} />
            </div>
            <div>
              <Label className="text-xs">Заметки по подключению</Label>
              <Textarea rows={4} value={form.monitoringNotes ?? ''}
                        onChange={e => update('monitoringNotes', e.target.value || null)}
                        placeholder="Контактные лица в программе, реквизиты соглашения, особые условия..." />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <IconX className="h-4 w-4 mr-1" />Отмена
          </Button>
          <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
            <Save className="h-4 w-4 mr-1" />
            {createMut.isPending || updateMut.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ObjectEditor: FC<{
  obj: DeveloperObject;
  kind: 'completed' | 'planned';
  onChange: (p: Partial<DeveloperObject>) => void;
  onRemove: () => void;
}> = ({ obj, kind, onChange, onRemove }) => (
  <Card className="bg-slate-50 mb-2">
    <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
      <div className="col-span-2 md:col-span-2">
        <Label className="text-[11px]">Название</Label>
        <Input value={obj.name} onChange={e => onChange({ name: e.target.value })} placeholder="ЖК «Авиатор»" />
      </div>
      <div>
        <Label className="text-[11px]">{kind === 'completed' ? 'Год ввода' : 'Год плана'}</Label>
        <Input type="number" value={(kind === 'completed' ? obj.year : (obj as any).plannedYear) ?? ''}
               onChange={e => onChange(kind === 'completed'
                 ? { year: e.target.value ? parseInt(e.target.value) : undefined }
                 : { plannedYear: e.target.value ? parseInt(e.target.value) : undefined } as any)} />
      </div>
      <div>
        <Label className="text-[11px]">Этажность</Label>
        <Input type="number" value={obj.floors ?? ''} onChange={e => onChange({ floors: e.target.value ? parseInt(e.target.value) : undefined })} />
      </div>
      <div>
        <Label className="text-[11px]">Район</Label>
        <Input value={obj.district ?? ''} onChange={e => onChange({ district: e.target.value || undefined })} />
      </div>
      <div>
        <Label className="text-[11px]">Площадь (тыс. м²)</Label>
        <Input type="number" step="0.1" value={obj.area ?? ''} onChange={e => onChange({ area: e.target.value ? parseFloat(e.target.value) : undefined })} />
      </div>
      <div className="col-span-2">
        <Label className="text-[11px]">Адрес</Label>
        <Input value={obj.address ?? ''} onChange={e => onChange({ address: e.target.value || undefined })} />
      </div>
      <div className="col-span-2 md:col-span-4 flex justify-end">
        <Button size="sm" variant="ghost" className="text-red-600 h-7" onClick={onRemove}>
          <Trash2 className="h-3 w-3 mr-1" />Удалить
        </Button>
      </div>
    </CardContent>
  </Card>
);

// ─── Detail panel (read view inside main page) ────────────────────────────────

const DeveloperDetail: FC<{
  dev: Developer;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ dev, onEdit, onDelete }) => {
  const completed = (dev.completedObjects ?? []) as DeveloperObject[];
  const planned   = (dev.plannedObjects ?? [])   as DeveloperObject[];
  const licenses  = (dev.licenses ?? [])         as DeveloperLicense[];
  return (
    <Card className="border border-slate-200 sticky top-4">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <HardHat className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="truncate">{dev.name}</span>
            </CardTitle>
            {dev.legalForm && (
              <p className="text-xs text-slate-500 mt-0.5">{dev.legalForm}</p>
            )}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-7" onClick={onEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-red-600 hover:bg-red-50" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="mt-2"><StatusBadge status={dev.monitoringStatus} /></div>
      </CardHeader>
      <CardContent className="pt-3 space-y-3 max-h-[70vh] overflow-y-auto">
        {/* Quick contacts */}
        <div className="space-y-1.5">
          {dev.website && (
            <div className="flex items-center gap-2 text-xs">
              <Globe className="h-3 w-3 text-slate-400" />
              <a href={dev.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate flex items-center gap-1">
                {dev.website.replace(/^https?:\/\//, '')}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {dev.phone && <div className="flex items-center gap-2 text-xs"><Phone className="h-3 w-3 text-slate-400" />{dev.phone}</div>}
          {dev.email && <div className="flex items-center gap-2 text-xs"><Mail className="h-3 w-3 text-slate-400" />{dev.email}</div>}
          {dev.contactPerson && <div className="flex items-center gap-2 text-xs"><Activity className="h-3 w-3 text-slate-400" />{dev.contactPerson}</div>}
        </div>

        {/* Legal */}
        {(dev.legalAddress || dev.officeAddress || dev.inn || dev.ogrn) && (
          <div className="border-t pt-2 space-y-1">
            <p className="text-[10px] font-semibold uppercase text-slate-400">Юридические данные</p>
            {dev.legalAddress && <div className="flex items-start gap-2 text-xs"><MapPin className="h-3 w-3 text-slate-400 mt-0.5" /><span>Юр.: {dev.legalAddress}</span></div>}
            {dev.officeAddress && <div className="flex items-start gap-2 text-xs"><MapPin className="h-3 w-3 text-slate-400 mt-0.5" /><span>Офис: {dev.officeAddress}</span></div>}
            {dev.inn && <div className="text-xs text-slate-700">ИНН: {dev.inn}</div>}
            {dev.ogrn && <div className="text-xs text-slate-700">ОГРН: {dev.ogrn}</div>}
          </div>
        )}

        {/* Stats */}
        <div className="border-t pt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Всего, тыс. м²</p>
            <p className="text-base font-bold text-slate-800">{dev.totalAreaThousandSqm ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Введено</p>
            <p className="text-base font-bold text-emerald-700">{completed.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase">Планы</p>
            <p className="text-base font-bold text-blue-700">{planned.length}</p>
          </div>
        </div>

        {/* Licenses */}
        {licenses.length > 0 && (
          <div className="border-t pt-2">
            <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5 flex items-center gap-1">
              <FileBadge className="h-3 w-3" />Лицензии и допуски
            </p>
            <div className="space-y-1.5">
              {licenses.map((l, i) => (
                <div key={i} className="bg-slate-50 rounded p-2 text-[11px]">
                  <div className="font-medium text-slate-700">{l.number}</div>
                  <div className="text-slate-500">{l.type}{l.issuer && ` · ${l.issuer}`}</div>
                  {(l.issuedDate || l.expiryDate) && (
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      {l.issuedDate && `Выд. ${l.issuedDate}`} {l.expiryDate && ` · до ${l.expiryDate}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed objects */}
        {completed.length > 0 && (
          <div className="border-t pt-2">
            <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />Введённые объекты
            </p>
            <div className="space-y-1">
              {completed.map((o, i) => (
                <div key={i} className="text-[11px] text-slate-700 flex items-center justify-between gap-2 bg-emerald-50/50 px-2 py-1 rounded">
                  <span className="truncate font-medium">{o.name}</span>
                  <span className="text-slate-500 flex-shrink-0">
                    {o.year ?? '—'}{o.floors ? ` · ${o.floors} эт.` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Planned objects */}
        {planned.length > 0 && (
          <div className="border-t pt-2">
            <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-blue-600" />Планируемые к вводу
            </p>
            <div className="space-y-1">
              {planned.map((o, i) => (
                <div key={i} className="text-[11px] text-slate-700 flex items-center justify-between gap-2 bg-blue-50/50 px-2 py-1 rounded">
                  <span className="truncate font-medium">{o.name}</span>
                  <span className="text-slate-500 flex-shrink-0">
                    {(o as any).plannedYear ?? '—'}{o.floors ? ` · ${o.floors} эт.` : ''}{o.area ? ` · ${o.area} тыс. м²` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monitoring */}
        <div className="border-t pt-2">
          <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-blue-600" />Программа мониторинга
          </p>
          {dev.monitoringConnectedDate && (
            <p className="text-[11px] text-slate-600">
              Подключён: {new Date(dev.monitoringConnectedDate).toLocaleDateString('ru-RU')}
            </p>
          )}
          {dev.monitoringNotes && (
            <p className="text-[11px] text-slate-600 mt-1 whitespace-pre-line">{dev.monitoringNotes}</p>
          )}
        </div>

        {dev.notes && (
          <div className="border-t pt-2">
            <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Заметки</p>
            <p className="text-[11px] text-slate-600 whitespace-pre-line">{dev.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapDevToForm(d: Developer): typeof BLANK {
  return {
    name: d.name,
    legalForm: d.legalForm,
    inn: d.inn,
    ogrn: d.ogrn,
    legalAddress: d.legalAddress,
    officeAddress: d.officeAddress,
    website: d.website,
    phone: d.phone,
    email: d.email,
    contactPerson: d.contactPerson,
    totalAreaThousandSqm: d.totalAreaThousandSqm,
    licenses: (d.licenses ?? []) as any,
    completedObjects: (d.completedObjects ?? []) as any,
    plannedObjects: (d.plannedObjects ?? []) as any,
    monitoringStatus: d.monitoringStatus,
    monitoringConnectedDate: d.monitoringConnectedDate,
    monitoringNotes: d.monitoringNotes,
    notes: d.notes,
    isActive: d.isActive,
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────

const DevelopersPage: FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDev, setEditingDev] = useState<Developer | null>(null);

  const { data: devs = [], isLoading } = useQuery<Developer[]>({
    queryKey: ['/api/developers'],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return devs.filter(d => {
      const matchSearch = !q
        || d.name.toLowerCase().includes(q)
        || (d.legalForm ?? '').toLowerCase().includes(q)
        || (d.website ?? '').toLowerCase().includes(q)
        || (d.contactPerson ?? '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || d.monitoringStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [devs, search, statusFilter]);

  const selected = useMemo(() => devs.find(d => d.id === selectedId) ?? null, [devs, selectedId]);

  const stats = useMemo(() => ({
    total:     devs.length,
    connected: devs.filter(d => d.monitoringStatus === 'connected').length,
    pending:   devs.filter(d => d.monitoringStatus === 'pending' || d.monitoringStatus === 'invited').length,
    notReady:  devs.filter(d => d.monitoringStatus === 'not_connected' || d.monitoringStatus === 'declined' || d.monitoringStatus === 'suspended').length,
    totalArea: devs.reduce((sum, d) => sum + (parseFloat(d.totalAreaThousandSqm ?? '0') || 0), 0),
  }), [devs]);

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/developers/${id}`),
    onSuccess: () => {
      toast({ title: 'Застройщик удалён' });
      queryClient.invalidateQueries({ queryKey: ['/api/developers'] });
      setSelectedId(null);
    },
    onError: () => toast({ title: 'Ошибка при удалении', variant: 'destructive' }),
  });

  const openCreate = () => { setEditingDev(null); setDialogOpen(true); };
  const openEdit = (d: Developer) => { setEditingDev(d); setDialogOpen(true); };

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <HardHat className="h-6 w-6 text-blue-600" />Застройщики Иркутска
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Реестр застройщиков · юридические данные · лицензии · объекты · программа мониторинга
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-developer">
          <Plus className="h-4 w-4 mr-1" />Добавить застройщика
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <Card><CardContent className="p-3"><p className="text-[10px] text-slate-500 uppercase">Всего</p><p className="text-xl font-bold text-slate-800">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] text-slate-500 uppercase">Подключены</p><p className="text-xl font-bold text-emerald-700">{stats.connected}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] text-slate-500 uppercase">В процессе</p><p className="text-xl font-bold text-blue-700">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] text-slate-500 uppercase">Не подкл./Отказ</p><p className="text-xl font-bold text-slate-600">{stats.notReady}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-[10px] text-slate-500 uppercase">Общ. площадь, тыс. м²</p><p className="text-xl font-bold text-slate-800">{stats.totalArea.toFixed(1)}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-3 flex flex-col md:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-8" placeholder="Поиск по названию, форме, сайту, контакту..."
                   value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {(Object.keys(STATUS_INFO) as MonitoringStatus[]).map(k => (
                <SelectItem key={k} value={k}>{STATUS_INFO[k].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Body: cards grid + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={selected ? 'lg:col-span-2' : 'lg:col-span-3'}>
          {isLoading ? (
            <Card><CardContent className="py-12 text-center text-sm text-slate-500">Загрузка...</CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-slate-500">
              <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              Нет застройщиков, соответствующих фильтру.
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map(d => (
                <DeveloperCard key={d.id} dev={d} onOpen={() => setSelectedId(d.id)} />
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="lg:col-span-1">
            <DeveloperDetail
              dev={selected}
              onEdit={() => openEdit(selected)}
              onDelete={() => {
                if (confirm(`Удалить застройщика "${selected.name}"?`)) deleteMut.mutate(selected.id);
              }}
            />
          </div>
        )}
      </div>

      <DeveloperDialog
        dev={editingDev}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['/api/developers'] })}
      />
    </div>
  );
};

export default DevelopersPage;
