import { FC, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Role } from "@shared/permissions";
import { RoleSelect, invalidateUsers, useErrorToast, type SafeUser } from "./users/shared";
import { CreateDialog } from "./users/CreateDialog";
import { EditDialog } from "./users/EditDialog";
import { PasswordDialog } from "./users/PasswordDialog";
import { ObjectsDialog } from "./users/ObjectsDialog";
import { AuditLog } from "./users/AuditLog";

const AdminUsers: FC = () => {
  const onError = useErrorToast();
  const { data: users = [], isLoading } = useQuery<SafeUser[]>({ queryKey: ["/api/users"] });
  const [creating, setCreating] = useState(false);
  const [editUser, setEditUser] = useState<SafeUser | null>(null);
  const [pwUser, setPwUser] = useState<SafeUser | null>(null);
  const [objUser, setObjUser] = useState<SafeUser | null>(null);
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Pick<SafeUser, "role" | "active">> }) => apiJson("PATCH", `/api/users/${id}`, body),
    onSuccess: invalidateUsers,
    onError,
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
                      <Button size="sm" variant="outline" onClick={() => setEditUser(u)}>Изменить</Button>
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
      <EditDialog user={editUser} onClose={() => setEditUser(null)} />
      <PasswordDialog user={pwUser} onClose={() => setPwUser(null)} />
      <ObjectsDialog user={objUser} onClose={() => setObjUser(null)} />
      <AuditLog />
    </div>
  );
};

export default AdminUsers;
