import { FC, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiJson } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Role } from "@shared/permissions";
import { RoleSelect, invalidateUsers, useErrorToast, type SafeUser } from "./shared";

type Form = { fullName: string; email: string; organization: string; jobTitle: string; contactPhone: string; role: Role; active: boolean };
const fromUser = (u: SafeUser): Form => ({
  fullName: u.fullName, email: u.email, organization: u.organization ?? "", jobTitle: u.jobTitle ?? "",
  contactPhone: u.contactPhone ?? "", role: u.role as Role, active: u.active,
});

export const EditDialog: FC<{ user: SafeUser | null; onClose: () => void }> = ({ user, onClose }) => {
  const { toast } = useToast();
  const onError = useErrorToast();
  const [f, setF] = useState<Form | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => { setF(user ? fromUser(user) : null); setFormError(null); }, [user]);
  const m = useMutation({
    mutationFn: (body: Form) => apiJson("PATCH", `/api/users/${user!.id}`, {
      ...body, organization: body.organization || null, jobTitle: body.jobTitle || null, contactPhone: body.contactPhone || null,
    }),
    onSuccess: () => { invalidateUsers(); onClose(); toast({ title: "Пользователь обновлён" }); },
    onError,
  });
  if (!f) return null;
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = () => {
    if (!f.fullName.trim()) return setFormError("Укажите ФИО");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setFormError("Некорректный email");
    setFormError(null); m.mutate(f);
  };
  return (
    <Dialog open={!!user} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Изменить — {user?.username}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>ФИО</Label><Input value={f.fullName} onChange={set("fullName")} /></div>
          <div><Label>Email</Label><Input type="email" value={f.email} onChange={set("email")} /></div>
          <div><Label>Организация</Label><Input value={f.organization} onChange={set("organization")} /></div>
          <div><Label>Должность</Label><Input value={f.jobTitle} onChange={set("jobTitle")} /></div>
          <div><Label>Телефон</Label><Input value={f.contactPhone} onChange={set("contactPhone")} /></div>
          <div><Label>Роль</Label><RoleSelect value={f.role} onChange={role => setF({ ...f, role })} /></div>
          <div className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={active => setF({ ...f, active })} /><Label>Активен</Label></div>
          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        </div>
        <DialogFooter><Button onClick={submit} disabled={m.isPending}>Сохранить</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
