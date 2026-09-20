import { FC, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiJson } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Role } from "@shared/permissions";
import { CustomerSelect, RoleSelect, invalidateUsers, useErrorToast } from "./shared";

const initialCreateForm = { username: "", fullName: "", email: "", password: "", role: "staff" as Role, organization: "", customerId: null as number | null };

const validate = (f: typeof initialCreateForm): string | null => {
  if (f.username.trim().length < 3) return "Логин: минимум 3 символа";
  if (!f.fullName.trim()) return "Укажите ФИО";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return "Некорректный email";
  if (f.password.length < 8) return "Пароль: минимум 8 символов";
  if (f.role !== "superadmin" && f.customerId == null) return "Выберите заказчика";
  return null;
};

export const CreateDialog: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { toast } = useToast();
  const onError = useErrorToast();
  const [f, setF] = useState(initialCreateForm);
  const [formError, setFormError] = useState<string | null>(null);
  const close = () => { setF(initialCreateForm); setFormError(null); onClose(); };
  const m = useMutation({
    mutationFn: () => apiJson("POST", "/api/users", {
      ...f, organization: f.organization || null, customerId: f.role === "superadmin" ? null : f.customerId,
    }),
    onSuccess: () => { invalidateUsers(); close(); toast({ title: "Пользователь создан" }); },
    onError,
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = () => {
    const err = validate(f);
    if (err) return setFormError(err);
    setFormError(null);
    m.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={o => !o && close()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Новый пользователь</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Логин</Label><Input value={f.username} onChange={set("username")} /></div>
          <div><Label>ФИО</Label><Input value={f.fullName} onChange={set("fullName")} /></div>
          <div><Label>Email</Label><Input type="email" value={f.email} onChange={set("email")} /></div>
          <div><Label>Пароль (мин. 8 символов)</Label><Input type="password" value={f.password} onChange={set("password")} /></div>
          <div><Label>Организация</Label><Input value={f.organization} onChange={set("organization")} /></div>
          <div><Label>Роль</Label><RoleSelect value={f.role} onChange={role => setF({ ...f, role })} /></div>
          {f.role !== "superadmin" && (
            <div><Label>Заказчик</Label><CustomerSelect value={f.customerId} onChange={customerId => setF({ ...f, customerId })} /></div>
          )}
          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        </div>
        <DialogFooter><Button onClick={submit} disabled={m.isPending}>Создать</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
