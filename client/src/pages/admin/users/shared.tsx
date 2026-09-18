import { FC } from "react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLES, ROLE_LABELS, type Role } from "@shared/permissions";
import type { User } from "@shared/schema";

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
