import { FC, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Region } from "@shared/schema";
import { useErrorToast } from "../users/shared";
import { invalidateCustomers } from "../Customers";

const NO_REGION = "none";

const initialCreateForm = { code: "", name: "", regionId: NO_REGION };

const validate = (f: typeof initialCreateForm): string | null => {
  if (!/^[a-z0-9-]{2,32}$/.test(f.code)) return "Код: латиница, цифры, дефис, 2–32 символа";
  if (f.name.trim().length < 2) return "Название: минимум 2 символа";
  return null;
};

export const CreateDialog: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { toast } = useToast();
  const onError = useErrorToast();
  const { data: regions = [] } = useQuery<Region[]>({ queryKey: ["/api/regions"], enabled: open });
  const [f, setF] = useState(initialCreateForm);
  const [formError, setFormError] = useState<string | null>(null);
  const close = () => { setF(initialCreateForm); setFormError(null); onClose(); };
  const m = useMutation({
    mutationFn: () => apiJson("POST", "/api/customers", {
      code: f.code, name: f.name, regionId: f.regionId === NO_REGION ? undefined : Number(f.regionId),
    }),
    onSuccess: () => { invalidateCustomers(); close(); toast({ title: "Заказчик создан" }); },
    onError,
  });
  const submit = () => {
    const err = validate(f);
    if (err) return setFormError(err);
    setFormError(null);
    m.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={o => !o && close()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Новый заказчик</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Код</Label><Input value={f.code} onChange={e => setF({ ...f, code: e.target.value })} /></div>
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
          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        </div>
        <DialogFooter><Button onClick={submit} disabled={m.isPending}>Создать</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
