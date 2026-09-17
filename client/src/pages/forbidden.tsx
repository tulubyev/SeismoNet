import { FC } from "react";
import { Link } from "wouter";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MODULE_LABELS, type Module } from "@shared/permissions";

const Forbidden: FC<{ module?: Module }> = ({ module }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
    <ShieldOff className="h-12 w-12 text-muted-foreground" />
    <h1 className="text-xl font-semibold">Нет доступа</h1>
    <p className="max-w-md text-sm text-muted-foreground">
      Ваша роль не даёт доступа к разделу{module ? ` «${MODULE_LABELS[module]}»` : ""}. Обратитесь к администратору системы.
    </p>
    <Button asChild variant="outline"><Link href="/">На главную</Link></Button>
  </div>
);

export default Forbidden;
