import { FC, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Loader2, LogIn, ShieldAlert } from "lucide-react";
import type { User } from "@shared/schema";

const AuthPage: FC = () => {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const u: User = await r.json();
      queryClient.setQueryData(["/api/user"], u);
      navigate("/");
    } catch (e: any) {
      setError(e.message || "Не удалось войти");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-900/80 backdrop-blur shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-900/40">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-white text-xl">Сеть сейсмических наблюдений</CardTitle>
          <CardDescription className="text-slate-400">
            г. Иркутск · вход в систему мониторинга
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-700/40 bg-amber-900/20 p-3 text-amber-200 text-xs flex gap-2">
            <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              Режим отладки: авторизация упрощена. Нажмите «Вход», чтобы продолжить
              как <strong>dev_superadmin</strong>.
            </span>
          </div>

          <Button
            type="button"
            className="w-full h-11 text-base bg-blue-600 hover:bg-blue-500"
            onClick={handleLogin}
            disabled={loading}
            data-testid="button-login"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><LogIn className="h-5 w-5 mr-2" /> Вход</>}
          </Button>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <p className="text-center text-[11px] text-slate-500">
            После завершения отладки восстановите проверку учётных данных
            в <code>server/auth.ts</code> и <code>client/src/pages/auth-page.tsx</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
