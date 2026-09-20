import { FC } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLES, ROLE_LABELS, type Role } from "@shared/permissions";
import type { Customer, User } from "@shared/schema";

export type SafeUser = Omit<User, "password">;

export const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ["/api/users"] });

export function useErrorToast() {
  const { toast } = useToast();
  return (e: Error) => toast({ title: "Ошибка", description: e.message, variant: "destructive" });
}

export const RoleSelect: FC<{ value: Role; onChange: (r: Role) => void }> = ({ value, onChange }) => (
  <Select value={value} onValueChange={v => onChange(v as Role)}>
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
  </Select>
);

export const CustomerSelect: FC<{ value: number | null; onChange: (id: number | null) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const active = customers.filter(c => c.active);
  return (
    <Select value={value != null ? String(value) : undefined} onValueChange={v => onChange(Number(v))} disabled={disabled}>
      <SelectTrigger><SelectValue placeholder="Выберите заказчика" /></SelectTrigger>
      <SelectContent>{active.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
    </Select>
  );
};
