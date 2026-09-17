import { useAuth } from "@/hooks/use-auth";
import { can as canFn, type Level, type Module, type Role } from "@shared/permissions";

export function usePermission() {
  const { user } = useAuth();
  const role = (user?.role as Role | undefined) ?? null;
  return {
    role,
    can: (module: Module, level: Level = "read") => canFn(role, module, level),
    isSuperadmin: role === "superadmin",
  };
}
