import { FC, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiJson } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { invalidateUsers, useErrorToast, type SafeUser } from "./shared";

export const PasswordDialog: FC<{ user: SafeUser | null; onClose: () => void }> = ({ user, onClose }) => {
  const { toast } = useToast();
  const onError = useErrorToast();
  const [password, setPassword] = useState("");
  const close = () => { setPassword(""); onClose(); };
  const m = useMutation({
    mutationFn: () => apiJson("POST", `/api/users/${user!.id}/password`, { password }),
    onSuccess: () => { invalidateUsers(); close(); toast({ title: "Пароль обновлён" }); },
    onError,
  });
  return (
    <Dialog open={!!user} onOpenChange={o => !o && close()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Новый пароль — {user?.username}</DialogTitle></DialogHeader>
        <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="минимум 8 символов" />
        <DialogFooter><Button onClick={() => m.mutate()} disabled={password.length < 8 || m.isPending}>Сохранить</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
