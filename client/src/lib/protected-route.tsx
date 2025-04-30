import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType;
  requiredRole?: "administrator" | "user" | "viewer" | string[];
}

export function ProtectedRoute({
  path,
  component: Component,
  requiredRole,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // If user is not authenticated, redirect to auth page
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // If a specific role is required, check user's role
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    // If user doesn't have the required role, show unauthorized page
    if (!roles.includes(user.role)) {
      return (
        <Route path={path}>
          <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
            <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-muted-foreground">
              Your current role: {user.role}
            </p>
          </div>
        </Route>
      );
    }
  }

  // User is authenticated and has required role, render the component
  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}