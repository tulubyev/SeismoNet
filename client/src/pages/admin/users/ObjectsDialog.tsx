import { FC, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiJson, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { InfrastructureObject } from "@shared/schema";
import { invalidateUsers, useErrorToast, type SafeUser } from "./shared";

export const ObjectsDialog: FC<{ user: SafeUser | null; onClose: () => void }> = ({ user, onClose }) => {
  const { toast } = useToast();
  const onError = useErrorToast();
  const { data: objects = [] } = useQuery<InfrastructureObject[]>({ queryKey: ["/api/infrastructure-objects"] });
  const { data: bound = [] } = useQuery<number[]>({ queryKey: [`/api/users/${user?.id}/objects`], enabled: !!user });
  const [sel, setSel] = useState<Set<number> | null>(null);
  const current = sel ?? new Set(bound);
  const m = useMutation({
    mutationFn: () => apiJson("PUT", `/api/users/${user!.id}/objects`, { objectIds: Array.from(current) }),
    onSuccess: () => { invalidateUsers(); queryClient.invalidateQueries({ queryKey: [`/api/users/${user!.id}/objects`] }); onClose(); setSel(null); toast({ title: "Объекты сохранены" }); },
    onError,
  });
  const toggle = (id: number) => { const n = new Set(current); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
  return (
    <Dialog open={!!user} onOpenChange={o => { if (!o) { onClose(); setSel(null); } }}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Объекты — {user?.fullName}</DialogTitle></DialogHeader>
        <div className="grid gap-2">
          {objects.map(o => (
            <label key={o.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={current.has(o.id)} onCheckedChange={() => toggle(o.id)} /> {o.name} <span className="text-muted-foreground">{o.address}</span>
            </label>
          ))}
        </div>
        <DialogFooter><Button onClick={() => m.mutate()} disabled={m.isPending}>Сохранить</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
