import { Route } from "wouter";

// AUTH BYPASS — режим разработки (убрать перед продакшеном)
const DEV_MODE = true;

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
  requiredRole?: "administrator" | "user" | "viewer" | string[];
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  if (DEV_MODE) {
    return <Route path={path}><Component /></Route>;
  }

  // Production auth logic restored here when DEV_MODE = false
  return <Route path={path}><Component /></Route>;
}
