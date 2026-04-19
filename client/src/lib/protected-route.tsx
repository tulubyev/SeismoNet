import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
  requiredRole?: "administrator" | "user" | "viewer" | string[];
}

// DEV-MODE: авторизация временно отключена на этапе отладки.
// ProtectedRoute и requiredRole больше не блокируют доступ — все маршруты открыты,
// чтобы заходить сразу на главный экран без логина.
// Чтобы вернуть проверку прав, восстановите оригинальную реализацию из истории git.
export function ProtectedRoute({
  path,
  component: Component,
}: ProtectedRouteProps) {
  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}

// Оставляем импорт useAuth/Loader2/Redirect, чтобы быстро вернуть проверку.
void useAuth; void Loader2; void Redirect;
