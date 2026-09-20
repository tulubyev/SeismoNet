import { FC, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { InfrastructureObject, ObjectCategory, Region } from "@shared/schema";
import { useErrorToast } from "@/pages/admin/users/shared";
import { STRUCTURAL_SYSTEM_OPTIONS, conditionInfo } from "@/pages/InfrastructureObjects";

const NO_REGION = "none";
const NONE = "none";

const FOUNDATION_OPTIONS = [
  { value: "pile",     label: "Свайный" },
  { value: "strip",    label: "Ленточный" },
  { value: "slab",     label: "Плитный" },
  { value: "combined", label: "Комбинированный" },
];

const SEISMIC_CATEGORY_OPTIONS = ["I", "II", "III", "IV"];
const DESIGN_INTENSITY_OPTIONS = [6, 7, 8, 9];
const TECHNICAL_CONDITION_OPTIONS = ["good", "satisfactory", "poor", "critical"] as const;

type Form = {
  objectId: string;
  name: string;
  objectType: string;
  regionId: string;
  address: string;
  latitude: string;
  longitude: string;
  floors: string;
  structuralSystem: string;
  foundationType: string;
  constructionYear: string;
  district: string;
  developer: string;
  seismicCategory: string;
  designIntensity: string;
  technicalCondition: string;
  responsibleOrganization: string;
  contactPerson: string;
  contactPhone: string;
  description: string;
};

const blankForm = (defaultRegionId: number | null | undefined): Form => ({
  objectId: "",
  name: "",
  objectType: "",
  regionId: defaultRegionId != null ? String(defaultRegionId) : NO_REGION,
  address: "",
  latitude: "",
  longitude: "",
  floors: "",
  structuralSystem: NONE,
  foundationType: NONE,
  constructionYear: "",
  district: "",
  developer: "",
  seismicCategory: NONE,
  designIntensity: NONE,
  technicalCondition: "satisfactory",
  responsibleOrganization: "",
  contactPerson: "",
  contactPhone: "",
  description: "",
});

const fromObject = (o: InfrastructureObject): Form => ({
  objectId: o.objectId,
  name: o.name,
  objectType: o.objectType,
  regionId: o.regionId != null ? String(o.regionId) : NO_REGION,
  address: o.address ?? "",
  latitude: o.latitude != null ? String(o.latitude) : "",
  longitude: o.longitude != null ? String(o.longitude) : "",
  floors: o.floors != null ? String(o.floors) : "",
  structuralSystem: o.structuralSystem ?? NONE,
  foundationType: o.foundationType ?? NONE,
  constructionYear: o.constructionYear != null ? String(o.constructionYear) : "",
  district: o.district ?? "",
  developer: o.developer ?? "",
  seismicCategory: o.seismicCategory ?? NONE,
  designIntensity: o.designIntensity != null ? String(o.designIntensity) : NONE,
  technicalCondition: o.technicalCondition ?? "satisfactory",
  responsibleOrganization: o.responsibleOrganization ?? "",
  contactPerson: o.contactPerson ?? "",
  contactPhone: o.contactPhone ?? "",
  description: o.description ?? "",
});

/** Next free `<PREFIX><NNN>` code among objects already loaded on the page. */
const suggestObjectId = (customerCode: string | undefined, objects: InfrastructureObject[]): string => {
  if (!customerCode) return "";
  const prefix = `${customerCode.toUpperCase()}-OBJ-`;
  const used = new Set<number>();
  for (const o of objects) {
    if (o.objectId.startsWith(prefix)) {
      const rest = o.objectId.slice(prefix.length);
      if (/^\d{3}$/.test(rest)) used.add(Number(rest));
    }
  }
  let n = 1;
  while (used.has(n)) n++;
  return `${prefix}${String(n).padStart(3, "0")}`;
};

const validate = (f: Form): string | null => {
  if (!f.objectId.trim()) return "Код объекта: обязательное поле";
  if (!f.name.trim()) return "Название: обязательное поле";
  if (!f.objectType) return "Категория / тип: обязательное поле";
  const lat = Number(f.latitude);
  if (f.latitude.trim() === "" || Number.isNaN(lat) || lat < -90 || lat > 90) {
    return "Широта: число от -90 до 90";
  }
  const lon = Number(f.longitude);
  if (f.longitude.trim() === "" || Number.isNaN(lon) || lon < -180 || lon > 180) {
    return "Долгота: число от -180 до 180";
  }
  if (f.floors.trim() !== "") {
    const floors = Number(f.floors);
    if (!Number.isInteger(floors) || floors < 1) return "Этажность: целое число ≥ 1";
  }
  if (f.constructionYear.trim() !== "" && !Number.isInteger(Number(f.constructionYear))) {
    return "Год постройки: целое число";
  }
  return null;
};

const toPayload = (f: Form) => ({
  objectId: f.objectId.trim(),
  name: f.name.trim(),
  objectType: f.objectType,
  regionId: f.regionId === NO_REGION ? null : Number(f.regionId),
  address: f.address.trim() || null,
  latitude: f.latitude.trim(),
  longitude: f.longitude.trim(),
  floors: f.floors.trim() ? Number(f.floors) : null,
  structuralSystem: f.structuralSystem === NONE ? null : f.structuralSystem,
  foundationType: f.foundationType === NONE ? null : f.foundationType,
  constructionYear: f.constructionYear.trim() ? Number(f.constructionYear) : null,
  district: f.district.trim() || null,
  developer: f.developer.trim() || null,
  seismicCategory: f.seismicCategory === NONE ? null : f.seismicCategory,
  designIntensity: f.designIntensity === NONE ? null : Number(f.designIntensity),
  technicalCondition: f.technicalCondition,
  responsibleOrganization: f.responsibleOrganization.trim() || null,
  contactPerson: f.contactPerson.trim() || null,
  contactPhone: f.contactPhone.trim() || null,
  description: f.description.trim() || null,
});

export const ObjectDialog: FC<{ open: boolean; object: InfrastructureObject | null; onClose: () => void }> = ({
  open, object, onClose,
}) => {
  const { toast } = useToast();
  const onError = useErrorToast();
  const { customer } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = object !== null;

  const { data: categories = [] } = useQuery<ObjectCategory[]>({ queryKey: ["/api/object-categories"], enabled: open });
  const { data: regions = [] } = useQuery<Region[]>({ queryKey: ["/api/regions"], enabled: open });
  const { data: objects = [] } = useQuery<InfrastructureObject[]>({ queryKey: ["/api/infrastructure-objects"], enabled: open });

  const [f, setF] = useState<Form | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!open) { setF(null); setFormError(null); setShowAdvanced(false); return; }
    if (object) {
      setF(fromObject(object));
    } else {
      const base = blankForm(customer?.regionId);
      setF({ ...base, objectId: suggestObjectId(customer?.code, objects) });
    }
    setFormError(null);
    setShowAdvanced(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, object]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/infrastructure-objects"] });

  const m = useMutation({
    mutationFn: (body: ReturnType<typeof toPayload>) =>
      isEdit
        ? apiJson("PATCH", `/api/infrastructure-objects/${object!.id}`, body)
        : apiJson("POST", "/api/infrastructure-objects", body),
    onSuccess: () => {
      invalidate();
      onClose();
      toast({ title: isEdit ? "Объект обновлён" : "Объект создан" });
    },
    onError,
  });

  if (!f) return null;

  const submit = () => {
    const err = validate(f);
    if (err) return setFormError(err);
    setFormError(null);
    m.mutate(toPayload(f));
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Изменить объект — ${object!.name}` : "Новый объект"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Код объекта</Label>
            <Input
              value={f.objectId}
              onChange={e => setF({ ...f, objectId: e.target.value })}
              readOnly={isEdit}
              className={isEdit ? "bg-slate-50 text-slate-500" : undefined}
            />
          </div>
          <div>
            <Label>Название</Label>
            <Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          </div>
          <div>
            <Label>Категория / тип</Label>
            <Select value={f.objectType} onValueChange={objectType => setF({ ...f, objectType })}>
              <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Регион</Label>
            <Select value={f.regionId} onValueChange={regionId => setF({ ...f, regionId })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_REGION}>Без региона</SelectItem>
                {regions.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Адрес</Label>
            <Input value={f.address} onChange={e => setF({ ...f, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Широта</Label>
              <Input value={f.latitude} onChange={e => setF({ ...f, latitude: e.target.value })} placeholder="52.2870" />
            </div>
            <div>
              <Label>Долгота</Label>
              <Input value={f.longitude} onChange={e => setF({ ...f, longitude: e.target.value })} placeholder="104.3050" />
            </div>
          </div>
          <div>
            <Label>Этажность</Label>
            <Input
              type="number" min={1}
              value={f.floors}
              onChange={e => setF({ ...f, floors: e.target.value })}
            />
          </div>
          <div>
            <Label>Конструктив</Label>
            <Select value={f.structuralSystem} onValueChange={structuralSystem => setF({ ...f, structuralSystem })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Не указан</SelectItem>
                {STRUCTURAL_SYSTEM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Фундамент</Label>
            <Select value={f.foundationType} onValueChange={foundationType => setF({ ...f, foundationType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Не указан</SelectItem>
                {FOUNDATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 pt-1"
            onClick={() => setShowAdvanced(v => !v)}
          >
            {showAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Дополнительно
          </button>

          {showAdvanced && (
            <div className="grid gap-3 border-t border-slate-100 pt-3">
              <div>
                <Label>Год постройки</Label>
                <Input
                  type="number"
                  value={f.constructionYear}
                  onChange={e => setF({ ...f, constructionYear: e.target.value })}
                />
              </div>
              <div>
                <Label>Район</Label>
                <Input value={f.district} onChange={e => setF({ ...f, district: e.target.value })} />
              </div>
              <div>
                <Label>Застройщик</Label>
                <Input value={f.developer} onChange={e => setF({ ...f, developer: e.target.value })} />
              </div>
              <div>
                <Label>Категория грунта (СП14)</Label>
                <Select value={f.seismicCategory} onValueChange={seismicCategory => setF({ ...f, seismicCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Не указана</SelectItem>
                    {SEISMIC_CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Расчётная интенсивность, балл.</Label>
                <Select value={f.designIntensity} onValueChange={designIntensity => setF({ ...f, designIntensity })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Не указана</SelectItem>
                    {DESIGN_INTENSITY_OPTIONS.map(i => <SelectItem key={i} value={String(i)}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Техническое состояние</Label>
                <Select value={f.technicalCondition} onValueChange={technicalCondition => setF({ ...f, technicalCondition })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TECHNICAL_CONDITION_OPTIONS.map(c => (
                      <SelectItem key={c} value={c}>{conditionInfo(c).label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ответственная организация</Label>
                <Input
                  value={f.responsibleOrganization}
                  onChange={e => setF({ ...f, responsibleOrganization: e.target.value })}
                />
              </div>
              <div>
                <Label>Контактное лицо</Label>
                <Input value={f.contactPerson} onChange={e => setF({ ...f, contactPerson: e.target.value })} />
              </div>
              <div>
                <Label>Телефон контактного лица</Label>
                <Input value={f.contactPhone} onChange={e => setF({ ...f, contactPhone: e.target.value })} />
              </div>
              <div>
                <Label>Описание</Label>
                <Textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
              </div>
            </div>
          )}

          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={m.isPending}>{isEdit ? "Сохранить" : "Создать"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
