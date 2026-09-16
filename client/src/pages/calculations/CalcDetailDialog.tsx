import { FC } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { SeismicCalculation, SoilProfile, InfrastructureObject } from '@shared/schema';
import { CalcType, TYPE_META } from '@/pages/calculations/shared';
import { NotesEditor } from '@/pages/calculations/NotesEditor';
import { ParamsTable, MtsmDetail, RespDetail, ResoDetail } from '@/pages/calculations/details';


// ─── Detail dialog: re-displays the saved chart ──────────────────────────────

export interface DetailDialogProps {
  calc: SeismicCalculation | null;
  profile: SoilProfile | null;
  object: InfrastructureObject | null;
  onClose: () => void;
}

export const CalcDetailDialog: FC<DetailDialogProps> = ({ calc, profile, object, onClose }) => {
  if (!calc) return null;
  const meta = TYPE_META[calc.calcType as CalcType];
  return (
    <Dialog open={!!calc} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {meta?.icon}
            {meta?.label} · #{calc.id}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {new Date(calc.createdAt).toLocaleString('ru-RU')}
            {profile && <> · профиль: <strong>{profile.profileName}</strong></>}
            {object  && <> · объект: <strong>{object.name}</strong></>}
          </DialogDescription>
        </DialogHeader>

        {calc.calcType === 'mtsm'              && <MtsmDetail  calc={calc} />}
        {calc.calcType === 'response_spectrum' && <RespDetail  calc={calc} />}
        {calc.calcType === 'resonance'         && <ResoDetail  calc={calc} />}

        <NotesEditor calc={calc} />
        <ParamsTable inputParams={calc.inputParams} />
      </DialogContent>
    </Dialog>
  );
};
