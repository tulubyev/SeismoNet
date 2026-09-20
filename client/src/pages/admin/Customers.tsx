import { FC, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiJson, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Customer } from "@shared/schema";
import { useErrorToast } from "./users/shared";
import { CreateDialog } from "./customers/CreateDialog";
import { EditDialog } from "./customers/EditDialog";

export type CustomerRow = Customer & { regionName: string | null; objects: number; users: number };

export const invalidateCustomers = () => queryClient.invalidateQueries({ queryKey: ["/api/customers"] });

const AdminCustomers: FC = () => {
  const onError = useErrorToast();
  const { data: customers = [], isLoading } = useQuery<CustomerRow[]>({ queryKey: ["/api/customers"] });
  const [creating, setCreating] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerRow | null>(null);
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Pick<Customer, "active">> }) => apiJson("PATCH", `/api/customers/${id}`, body),
    onSuccess: invalidateCustomers,
    onError,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Заказчики</CardTitle>
          <Button onClick={() => setCreating(true)}>Создать</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Загрузка…</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Код</TableHead><TableHead>Название</TableHead><TableHead>Регион</TableHead>
                <TableHead>Объекты</TableHead><TableHead>Пользователи</TableHead><TableHead>Активен</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {customers.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.regionName ?? "—"}</TableCell>
                    <TableCell>{c.objects}</TableCell>
                    <TableCell>{c.users}</TableCell>
                    <TableCell><Switch checked={c.active} onCheckedChange={active => patch.mutate({ id: c.id, body: { active } })} /></TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => setEditCustomer(c)}>Изменить</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <CreateDialog open={creating} onClose={() => setCreating(false)} />
      <EditDialog customer={editCustomer} onClose={() => setEditCustomer(null)} />
    </div>
  );
};

export default AdminCustomers;
