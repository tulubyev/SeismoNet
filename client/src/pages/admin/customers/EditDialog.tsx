import { FC, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Region } from "@shared/schema";
import { useErrorToast } from "../users/shared";
import { invalidateCustomers, type CustomerRow } from "../Customers";

const NO_REGION = "none";

type Form = { name: string; regionId: string; active: boolean };
const fromCustomer = (c: CustomerRow): Form => ({
  name: c.name, regionId: c.regionId ? String(c.regionId) : NO_REGION, active: c.active,
});

export const EditDialog: FC<{ customer: CustomerRow | null; onClose: () => void }> = ({ customer, onClose }) => {
  const { toast } = useToast();
  const onError = useErrorToast();
  const { data: regions = [] } = useQuery<Region[]>({ queryKey: ["/api/regions"], enabled: !!customer });
  const [f, setF] = useState<Form | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => { setF(customer ? fromCustomer(customer) : null); setFormError(null); }, [customer]);
  const m = useMutation({
    mutationFn: (body: Form) => apiJson("PATCH", `/api/customers/${customer!.id}`, {
      name: body.name, regionId: body.regionId === NO_REGION ? null : Number(body.regionId), active: body.active,
    }),
    onSuccess: () => { invalidateCustomers(); onClose(); toast({ title: "Заказчик обновлён" }); },
    onError,
  });
  if (!f) return null;
  const submit = () => {
    if (f.name.trim().length < 2) return setFormError("Название: минимум 2 символа");
    setFormError(null);
    m.mutate(f);
  };
  return (
    <Dialog open={!!customer} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Изменить — {customer?.code}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Название</Label><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
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
          <div className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={active => setF({ ...f, active })} /><Label>Активен</Label></div>
          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        </div>
        <DialogFooter><Button onClick={submit} disabled={m.isPending}>Сохранить</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
