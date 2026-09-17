import { FC, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLES, ROLE_LABELS, type Role } from "@shared/permissions";
import type { InfrastructureObject, User } from "@shared/schema";

type SafeUser = Omit<User, "password">;

const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/users"] });

async function send(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}

const RoleSelect: FC<{ value: Role; onChange: (r: Role) => void }> = ({ value, onChange }) => (
  <Select value={value} onValueChange={v => onChange(v as Role)}>
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
  </Select>
);

const initialCreateForm = { username: "", fullName: "", email: "", password: "", role: "staff" as Role, organization: "" };

const CreateDialog: FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { toast } = useToast();
  const [f, setF] = useState(initialCreateForm);
  const close = () => { setF(initialCreateForm); onClose(); };
  const m = useMutation({
    mutationFn: () => send("POST", "/api/users", f),
    onSuccess: () => { invalidate(); close(); toast({ title: "Пользователь создан" }); },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
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
        </div>
        <DialogFooter><Button onClick={() => m.mutate()} disabled={m.isPending}>Создать</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PasswordDialog: FC<{ user: SafeUser | null; onClose: () => void }> = ({ user, onClose }) => {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const close = () => { setPassword(""); onClose(); };
  const m = useMutation({
    mutationFn: () => send("POST", `/api/users/${user!.id}/password`, { password }),
    onSuccess: () => { invalidate(); close(); toast({ title: "Пароль обновлён" }); },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });
  return (
    <Dialog open={!!user} onOpenChange={o => !o && close()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Новый пароль — {user?.username}</DialogTitle></DialogHeader>
        <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="минимум 8 символов" />
        <DialogFooter><Button onClick={() => m.mutate()} disabled={password.length < 8 || m.isPending}>Сохранить</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ObjectsDialog: FC<{ user: SafeUser | null; onClose: () => void }> = ({ user, onClose }) => {
  const { toast } = useToast();
  const { data: objects = [] } = useQuery<InfrastructureObject[]>({ queryKey: ["/api/infrastructure-objects"] });
  const { data: bound = [] } = useQuery<number[]>({ queryKey: [`/api/users/${user?.id}/objects`], enabled: !!user });
  const [sel, setSel] = useState<Set<number> | null>(null);
  const current = sel ?? new Set(bound);
  const m = useMutation({
    mutationFn: () => send("PUT", `/api/users/${user!.id}/objects`, { objectIds: Array.from(current) }),
    onSuccess: () => { invalidate(); queryClient.invalidateQueries({ queryKey: [`/api/users/${user!.id}/objects`] }); onClose(); setSel(null); toast({ title: "Объекты сохранены" }); },
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });
  const toggle = (id: number) => { const n = new Set(current); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  return (
    <Dialog open={!!user} onOpenChange={o => { if (!o) { onClose(); setSel(null); } }}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Объекты — {user?.fullName}</DialogTitle></DialogHeader>
        <div className="grid gap-2">
          {objects.map(o => (
            <label key={o.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={current.has(o.id)} onCheckedChange={() => toggle(o.id)} /> {o.name} <span className="text-muted-foreground">{o.address}</span>
            </label>
          ))}
        </div>
        <DialogFooter><Button onClick={() => m.mutate()} disabled={m.isPending}>Сохранить</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AdminUsers: FC = () => {
  const { toast } = useToast();
  const { data: users = [], isLoading } = useQuery<SafeUser[]>({ queryKey: ["/api/users"] });
  const [creating, setCreating] = useState(false);
  const [pwUser, setPwUser] = useState<SafeUser | null>(null);
  const [objUser, setObjUser] = useState<SafeUser | null>(null);
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Pick<SafeUser, "role" | "active">> }) => send("PATCH", `/api/users/${id}`, body),
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Пользователи</CardTitle>
          <Button onClick={() => setCreating(true)}>Создать</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Загрузка…</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Логин</TableHead><TableHead>ФИО</TableHead><TableHead>Email</TableHead>
                <TableHead>Роль</TableHead><TableHead>Активен</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs">{u.username}</TableCell>
                    <TableCell>{u.fullName}<div className="text-xs text-muted-foreground">{u.organization}</div></TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="min-w-[200px]"><RoleSelect value={u.role as Role} onChange={role => patch.mutate({ id: u.id, body: { role } })} /></TableCell>
                    <TableCell><Switch checked={u.active} onCheckedChange={active => patch.mutate({ id: u.id, body: { active } })} /></TableCell>
                    <TableCell className="space-x-1 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => setPwUser(u)}>Пароль</Button>
                      {u.role === "staff" && <Button size="sm" variant="outline" onClick={() => setObjUser(u)}>Объекты</Button>}
                      {u.lastLogin && <Badge variant="secondary">{new Date(u.lastLogin).toLocaleDateString("ru-RU")}</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <CreateDialog open={creating} onClose={() => setCreating(false)} />
      <PasswordDialog user={pwUser} onClose={() => setPwUser(null)} />
      <ObjectsDialog user={objUser} onClose={() => setObjUser(null)} />
    </div>
  );
};

export default AdminUsers;
