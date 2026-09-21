import { FC, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Region, Station } from '@shared/schema';
import { apiJson } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { usePermission } from '@/hooks/use-permission';
import { useErrorToast } from '@/pages/infrastructure/shared';
import { ChevronDown, ChevronRight } from 'lucide-react';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NO_REGION = 'none';

// Same three states StationList.tsx's statusBadge() renders — no "maintenance"
// status exists in this project's station vocabulary.
const STATUS_OPTIONS = [
  { value: 'offline', label: 'Оффлайн' },
  { value: 'online', label: 'Онлайн' },
  { value: 'degraded', label: 'Деградация' },
];

// All fields are kept as plain strings (input==output) so the zodResolver's
// inferred type matches the explicit useForm<> generic exactly — mixing this
// schema with numeric/nullable field types is what made the previous version
// of this page the single largest contributor to the tsc baseline.
const addStationSchema = z.object({
  stationId: z
    .string()
    .min(1, 'Код станции: обязательное поле')
    .regex(/^[A-Z0-9]+(-[A-Z0-9]+)+$/, 'Код вида ЕЦСЭМ-ST-001: латиница в верхнем регистре, цифры и дефисы'),
  name: z.string().min(3, 'Название: минимум 3 символа'),
  location: z.string().optional(),
  latitude: z
    .string()
    .refine(v => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) >= -90 && Number(v) <= 90,
      'Широта: число от -90 до 90'),
  longitude: z
    .string()
    .refine(v => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) >= -180 && Number(v) <= 180,
      'Долгота: число от -180 до 180'),
  regionId: z.string(),
  status: z.string(),
  isManaged: z.boolean(),
  dataRate: z.string().optional(),
  batteryLevel: z.string().optional(),
  batteryVoltage: z.string().optional(),
  firmwareVersion: z.string().optional(),
  hardwareModel: z.string().optional(),
  serialNumber: z.string().optional(),
  storageRemaining: z.string().optional(),
});

type AddStationFormValues = z.infer<typeof addStationSchema>;

/** Next free `<PREFIX><NNN>` code among stations already loaded — mirrors
 * ObjectDialog.tsx's suggestObjectId() for infrastructure objects. */
const suggestStationId = (customerCode: string | undefined, stations: Station[]): string => {
  if (!customerCode) return '';
  const prefix = `${customerCode.toUpperCase()}-ST-`;
  const used = new Set<number>();
  for (const s of stations) {
    if (s.stationId.startsWith(prefix)) {
      const rest = s.stationId.slice(prefix.length);
      if (/^\d{3}$/.test(rest)) used.add(Number(rest));
    }
  }
  let n = 1;
  while (used.has(n)) n++;
  return `${prefix}${String(n).padStart(3, '0')}`;
};

/** "" -> null, never 0 or NaN. A strict `Number()` conversion (not parseInt/
 * parseFloat) so trailing garbage like "12v" doesn't silently become 12 — it
 * becomes null instead. An 'int' field also rejects a non-integer value. */
const toNumber = (value: string | undefined, kind: 'int' | 'float'): number | null => {
  if (!value || value.trim() === '') return null;
  const n = Number(value.trim());
  if (Number.isNaN(n)) return null;
  if (kind === 'int' && !Number.isInteger(n)) return null;
  return n;
};

/** Accepts the Russian decimal-comma convention ("52,3") and normalizes it to
 * a dot before validation/storage — otherwise Number("52,3") is NaN and the
 * user sees a range error instead of the value being accepted. */
const normalizeDecimal = (value: string): string => value.replace(',', '.');

const toPayload = (data: AddStationFormValues) => ({
  stationId: data.stationId.trim(),
  name: data.name.trim(),
  location: data.location?.trim() || null,
  latitude: data.latitude.trim(),
  longitude: data.longitude.trim(),
  regionId: data.regionId !== NO_REGION ? Number(data.regionId) : null,
  status: data.status,
  isManaged: data.isManaged,
  dataRate: toNumber(data.dataRate, 'float'),
  batteryLevel: toNumber(data.batteryLevel, 'int'),
  batteryVoltage: toNumber(data.batteryVoltage, 'float'),
  firmwareVersion: data.firmwareVersion?.trim() || null,
  hardwareModel: data.hardwareModel?.trim() || null,
  serialNumber: data.serialNumber?.trim() || null,
  storageRemaining: toNumber(data.storageRemaining, 'int'),
});

const AddStation: FC = () => {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const onError = useErrorToast();
  const { customer } = useAuth();
  const { canCreate } = usePermission();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: regions = [] } = useQuery<Region[]>({ queryKey: ['/api/regions'] });
  const { data: stations = [], isSuccess: stationsLoaded } = useQuery<Station[]>({ queryKey: ['/api/stations'] });

  const form = useForm<AddStationFormValues>({
    resolver: zodResolver(addStationSchema),
    defaultValues: {
      stationId: '',
      name: '',
      location: '',
      latitude: '',
      longitude: '',
      regionId: customer?.regionId != null ? String(customer.regionId) : NO_REGION,
      status: 'offline',
      isManaged: true,
      dataRate: '',
      batteryLevel: '',
      batteryVoltage: '',
      firmwareVersion: '',
      hardwareModel: '',
      serialNumber: '',
      storageRemaining: '',
    },
  });

  // Prefill the station code once the stations query has actually resolved —
  // gating on `stations.length === 0` is wrong because useQuery defaults to
  // `[]` while still loading, which is indistinguishable from "this customer
  // genuinely has zero stations" and would leave their very first station's
  // code blank. Gate on `isSuccess` instead, and still never clobber a code
  // the user has already started typing.
  useEffect(() => {
    if (!stationsLoaded) return;
    if (form.getValues('stationId') !== '') return;
    const suggested = suggestStationId(customer?.code, stations);
    if (suggested) form.setValue('stationId', suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationsLoaded, stations]);

  const mutation = useMutation({
    mutationFn: (payload: ReturnType<typeof toPayload>) => apiJson('POST', '/api/stations', payload),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      toast({ title: 'Станция создана', description: `Станция «${payload.name}» добавлена в сеть.` });
      navigate('/stations');
    },
    onError,
  });

  const onSubmit = (data: AddStationFormValues) => {
    mutation.mutate(toPayload(data));
  };

  return (
    <div className="p-6">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Новая станция</CardTitle>
          <CardDescription>
            Заполните данные новой станции сейсмического мониторинга для добавления в сеть.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название</FormLabel>
                      <FormControl>
                        <Input placeholder="например, Октябрьский р-н — ИГУ" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Код станции</FormLabel>
                      <FormControl>
                        <Input placeholder="например, ECSEM-ST-001" {...field} />
                      </FormControl>
                      <FormDescription>
                        Латиница в верхнем регистре, цифры и дефисы, например ECSEM-ST-001.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Местоположение</FormLabel>
                    <FormControl>
                      <Input placeholder="например, ул. Лермонтова, 132" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Широта</FormLabel>
                      <FormControl>
                        <Input placeholder="52.2870" {...field} onChange={e => field.onChange(normalizeDecimal(e.target.value))} />
                      </FormControl>
                      <FormDescription>Десятичные градусы, от -90 до 90.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Долгота</FormLabel>
                      <FormControl>
                        <Input placeholder="104.3050" {...field} onChange={e => field.onChange(normalizeDecimal(e.target.value))} />
                      </FormControl>
                      <FormDescription>Десятичные градусы, от -180 до 180.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="regionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Регион</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите регион" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_REGION}>Без региона</SelectItem>
                          {regions.map(r => (
                            <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Статус</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите статус" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STATUS_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isManaged"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5 pr-4">
                      <FormLabel>Учитывать в сводке сети</FormLabel>
                      <FormDescription>
                        В счётчиках на панели мониторинга учитываются только станции с этим признаком —
                        у всех 28 существующих станций он включён. Без него новая станция не попадёт в сводку.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <button
                type="button"
                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                onClick={() => setShowAdvanced(v => !v)}
              >
                {showAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Дополнительно
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-4">
                  <FormField
                    control={form.control}
                    name="dataRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Скорость передачи данных (МБ/с)</FormLabel>
                        <FormControl>
                          <Input placeholder="например, 0.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="batteryLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Уровень заряда батареи (%)</FormLabel>
                        <FormControl>
                          <Input placeholder="например, 100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="batteryVoltage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Напряжение батареи (В)</FormLabel>
                        <FormControl>
                          <Input placeholder="например, 12.0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="storageRemaining"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Свободное хранилище (ГБ)</FormLabel>
                        <FormControl>
                          <Input placeholder="например, 1000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="firmwareVersion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Версия прошивки</FormLabel>
                        <FormControl>
                          <Input placeholder="например, 1.0.0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hardwareModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Модель оборудования</FormLabel>
                        <FormControl>
                          <Input placeholder="например, СМ-3КВ" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Серийный номер</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/stations')}>
                  Отмена
                </Button>
                <Button
                  type="submit"
                  disabled={!canCreate || mutation.isPending}
                  title={!canCreate ? 'Выберите заказчика' : undefined}
                >
                  Добавить станцию
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddStation;
