import { FC, useEffect, useState } from 'react';
import * as Diff from 'diff';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { History, StickyNote, Save, Loader2 } from 'lucide-react';
import type { SeismicCalculation, CalculationNoteHistory } from '@shared/schema';


export const DiffView: FC<{ oldText: string; newText: string }> = ({ oldText, newText }) => {
  const parts = Diff.diffWords(oldText, newText);
  if (parts.length === 0) return <em className="italic text-muted-foreground">пустая заметка</em>;
  const hasChanges = parts.some(p => p.added || p.removed);
  if (!hasChanges) return <em className="italic text-muted-foreground">(без изменений)</em>;
  return (
    <span className="text-[10px] whitespace-pre-wrap break-words leading-relaxed">
      {parts.map((part, i) => {
        if (part.added) {
          return (
            <mark key={i} className="bg-green-100 text-green-800 rounded-sm px-0.5 not-italic">
              {part.value}
            </mark>
          );
        }
        if (part.removed) {
          return (
            <del key={i} className="bg-red-100 text-red-700 rounded-sm px-0.5 line-through opacity-80">
              {part.value}
            </del>
          );
        }
        return <span key={i} className="text-muted-foreground">{part.value}</span>;
      })}
    </span>
  );
};

export const NotesEditor: FC<{ calc: SeismicCalculation }> = ({ calc }) => {
  const { toast } = useToast();
  const [savedNotes, setSavedNotes] = useState<string>(calc.notes ?? '');
  const [value, setValue] = useState<string>(calc.notes ?? '');
  const [audit, setAudit] = useState<{ at: string | Date | null; by: string | null }>({
    at: calc.notesUpdatedAt ?? null,
    by: calc.notesUpdatedBy ?? null,
  });
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setSavedNotes(calc.notes ?? '');
    setValue(calc.notes ?? '');
    setAudit({ at: calc.notesUpdatedAt ?? null, by: calc.notesUpdatedBy ?? null });
  }, [calc.id, calc.notes, calc.notesUpdatedAt, calc.notesUpdatedBy]);

  const historyQuery = useQuery<CalculationNoteHistory[]>({
    queryKey: ['/api/calculations', calc.id, 'note-history'],
    queryFn: async () => {
      const r = await fetch(`/api/calculations/${calc.id}/note-history`, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to fetch history');
      return r.json();
    },
    enabled: showHistory,
  });

  const saveMut = useMutation({
    mutationFn: async (notes: string) => {
      const r = await apiRequest('PATCH', `/api/calculations/${calc.id}`, { notes: notes.trim() ? notes : null });
      return r.json() as Promise<SeismicCalculation>;
    },
    onSuccess: (row) => {
      const next = row?.notes ?? '';
      setSavedNotes(next);
      setValue(next);
      setAudit({ at: row?.notesUpdatedAt ?? new Date(), by: row?.notesUpdatedBy ?? null });
      queryClient.invalidateQueries({ queryKey: ['/api/calculations', { limit: 500 }] });
      queryClient.invalidateQueries({ queryKey: ['/api/calculations', calc.id, 'note-history'] });
      toast({ title: 'Заметка сохранена' });
    },
    onError: () => toast({ title: 'Не удалось сохранить заметку', variant: 'destructive' }),
  });

  const revertMut = useMutation({
    mutationFn: async (historyId: number) => {
      const r = await apiRequest('POST', `/api/calculations/${calc.id}/note-history/revert`, { historyId });
      return r.json() as Promise<SeismicCalculation>;
    },
    onSuccess: (row) => {
      const next = row?.notes ?? '';
      setSavedNotes(next);
      setValue(next);
      setAudit({ at: row?.notesUpdatedAt ?? new Date(), by: row?.notesUpdatedBy ?? null });
      queryClient.invalidateQueries({ queryKey: ['/api/calculations', { limit: 500 }] });
      queryClient.invalidateQueries({ queryKey: ['/api/calculations', calc.id, 'note-history'] });
      toast({ title: 'Заметка восстановлена' });
    },
    onError: () => toast({ title: 'Не удалось восстановить заметку', variant: 'destructive' }),
  });

  const [showDiff, setShowDiff] = useState(true);
  const dirty = (value ?? '') !== (savedNotes ?? '');

  return (
    <div className="border rounded p-3 bg-amber-50/40 space-y-2" data-testid={`notes-editor-${calc.id}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
        <StickyNote className="h-3.5 w-3.5" />
        Заметки инженера
        {savedNotes && !dirty && <span className="text-[10px] text-amber-600 font-normal">· сохранено</span>}
        <button
          type="button"
          className="ml-auto flex items-center gap-1 text-[10px] font-normal text-amber-700 hover:text-amber-900 transition-colors"
          onClick={() => setShowHistory(v => !v)}
          data-testid={`btn-notes-history-toggle-${calc.id}`}
        >
          <History className="h-3 w-3" />
          {showHistory ? 'Скрыть историю' : 'История'}
        </button>
      </div>

      {showHistory && (
        <div className="border rounded bg-white p-2 space-y-1.5 max-h-48 overflow-y-auto" data-testid={`notes-history-panel-${calc.id}`}>
          <div className="flex items-center justify-end mb-1">
            <div
              className="flex items-center border border-amber-300 rounded overflow-hidden text-[10px]"
              role="group"
              aria-label="Режим просмотра истории"
            >
              <button
                type="button"
                aria-pressed={showDiff}
                className={`px-1.5 py-0.5 transition-colors ${showDiff ? 'bg-amber-200 text-amber-900 font-semibold' : 'text-amber-700 hover:bg-amber-50'}`}
                onClick={() => setShowDiff(true)}
                data-testid={`btn-notes-diff-toggle-${calc.id}`}
              >
                Diff
              </button>
              <button
                type="button"
                aria-pressed={!showDiff}
                className={`px-1.5 py-0.5 border-l border-amber-300 transition-colors ${!showDiff ? 'bg-amber-200 text-amber-900 font-semibold' : 'text-amber-700 hover:bg-amber-50'}`}
                onClick={() => setShowDiff(false)}
                data-testid={`btn-notes-text-toggle-${calc.id}`}
              >
                Текст
              </button>
            </div>
          </div>
          {historyQuery.isLoading && (
            <div className="flex items-center gap-2 text-[10px] text-amber-700">
              <Loader2 className="h-3 w-3 animate-spin" /> Загрузка…
            </div>
          )}
          {historyQuery.isSuccess && historyQuery.data.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic">История изменений пуста</p>
          )}
          {historyQuery.isSuccess && historyQuery.data.map((entry, idx, arr) => {
            const beforeText = entry.previousText ?? '';
            const afterText = idx === arr.length - 1 ? savedNotes : (arr[idx + 1].previousText ?? '');
            return (
              <div key={entry.id} className="border rounded p-2 space-y-1 bg-amber-50/30">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-amber-800 font-medium">
                    {entry.editedBy ? <>пользователь <strong>{entry.editedBy}</strong></> : 'неизвестный'}
                    {' · '}{new Date(entry.editedAt).toLocaleString('ru-RU')}
                  </span>
                  <button
                    type="button"
                    className="text-[10px] text-blue-600 hover:underline disabled:opacity-50"
                    disabled={revertMut.isPending}
                    onClick={() => revertMut.mutate(entry.id)}
                    data-testid={`btn-notes-revert-${calc.id}-${entry.id}`}
                  >
                    Восстановить
                  </button>
                </div>
                {showDiff
                  ? <DiffView oldText={beforeText} newText={afterText} />
                  : <span className="text-[10px] whitespace-pre-wrap break-words leading-relaxed text-muted-foreground">{beforeText || <em className="italic">пустая заметка</em>}</span>
                }
              </div>
            );
          })}
        </div>
      )}

      <Textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder='Например: «прототип для отчёта №12», «проверка резонанса блок-секции А»'
        className="text-xs min-h-[72px] bg-white"
        data-testid={`textarea-notes-${calc.id}`}
      />
      {audit.at && (
        <div className="text-[10px] text-amber-700/80" data-testid={`notes-audit-${calc.id}`}>
          изменено {audit.by ? <>пользователем <strong>{audit.by}</strong></> : null}
          {' '}· {new Date(audit.at).toLocaleString('ru-RU')}
        </div>
      )}
      <div className="flex justify-end gap-2">
        {dirty && (
          <Button
            size="sm" variant="ghost" className="h-7 text-xs"
            disabled={saveMut.isPending}
            onClick={() => setValue(savedNotes)}
            data-testid={`btn-notes-cancel-${calc.id}`}>
            Отмена
          </Button>
        )}
        <Button
          size="sm" className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700"
          disabled={!dirty || saveMut.isPending}
          onClick={() => saveMut.mutate(value)}
          data-testid={`btn-notes-save-${calc.id}`}>
          {saveMut.isPending
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <Save className="h-3 w-3" />}
          Сохранить
        </Button>
      </div>
    </div>
  );
};
