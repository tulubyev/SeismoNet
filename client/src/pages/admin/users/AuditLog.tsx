import { FC, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AuditLog as AuditRow } from "@shared/schema";

const ACTION_LABELS: Record<string, string> = {
  "user.create": "Создание пользователя", "user.update": "Изменение пользователя",
  "user.password_reset": "Сброс пароля", "user.objects_set": "Привязка объектов", "auth.login": "Вход",
};

export const AuditLog: FC = () => {
  const [open, setOpen] = useState(false);
  const { data: rows = [], isLoading } = useQuery<AuditRow[]>({ queryKey: ["/api/audit?limit=50"], enabled: open });
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Журнал действий</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setOpen(o => !o)}>{open ? "Скрыть" : "Показать"}</Button>
      </CardHeader>
      {open && (
        <CardContent>
          {isLoading ? <p className="text-sm text-muted-foreground">Загрузка…</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">Записей нет</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Время</TableHead><TableHead>Кто</TableHead><TableHead>Действие</TableHead><TableHead>Цель</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{new Date(r.at).toLocaleString("ru-RU")}</TableCell>
                    <TableCell className="font-mono text-xs">{r.actorUsername}</TableCell>
                    <TableCell>{ACTION_LABELS[r.action] ?? r.action}</TableCell>
                    <TableCell>{r.targetType ? `${r.targetType} #${r.targetId}` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      )}
    </Card>
  );
};
