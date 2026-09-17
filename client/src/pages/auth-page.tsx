import { FC, FormEvent, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Loader2, LogIn } from "lucide-react";
import type { User } from "@shared/schema";

const AuthPage: FC = () => {
  const [, navigate] = useLocation();
  const { user, loginMutation } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [devBusy, setDevBusy] = useState(false);

  useEffect(() => { if (user) navigate("/"); }, [user, navigate]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username: username.trim(), password });
  };

  // Vite drops this block from production builds (import.meta.env.DEV is a constant).
  const devLogin = async () => {
    setDevBusy(true);
    try {
      const r = await fetch("/api/dev-login", { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      queryClient.setQueryData(["/api/user"], (await r.json()) as User);
      navigate("/");
    } finally { setDevBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-900/80 backdrop-blur shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-900/40">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-white text-xl">Сеть сейсмических наблюдений</CardTitle>
          <CardDescription className="text-slate-400">Вход в систему мониторинга</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-slate-300">Логин</Label>
              <Input id="username" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required autoFocus className="bg-slate-800 border-slate-700 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-300">Пароль</Label>
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-slate-800 border-slate-700 text-white" />
            </div>
            {loginMutation.isError && <p className="text-sm text-red-400">{loginMutation.error.message}</p>}
            <Button type="submit" className="w-full h-11 text-base bg-blue-600 hover:bg-blue-500" disabled={loginMutation.isPending} data-testid="button-login">
              {loginMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><LogIn className="h-5 w-5 mr-2" /> Войти</>}
            </Button>
            {import.meta.env.DEV && (
              <Button type="button" variant="ghost" className="w-full text-slate-400" onClick={devLogin} disabled={devBusy}>
                Войти как dev (только локально)
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
