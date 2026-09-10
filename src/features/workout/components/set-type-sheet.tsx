import { OptionSheet, type SheetOption } from '@/components/option-sheet';
import type { WorkoutSet } from '@/db/schema';

export type SetType = WorkoutSet['type'];

export const SET_TYPES: SheetOption<SetType>[] = [
  { value: 'normal', label: 'Serie normal', badge: '#', description: 'Cuenta para el volumen' },
  { value: 'warmup', label: 'Calentamiento', badge: 'C', description: 'No cuenta para el volumen' },
  { value: 'drop', label: 'Drop set', badge: 'D', description: 'Bajada de peso sin descanso' },
  { value: 'failure', label: 'Al fallo', badge: 'F', description: 'Hasta el fallo muscular' },
];

/** Badge shown in the set-number column; normal sets keep their number. */
export function badgeFor(type: SetType, index: number): string {
  return type === 'normal'
    ? String(index + 1)
    : (SET_TYPES.find((option) => option.value === type)?.badge ?? '');
}

/** Render this only while it is open; see the note in OptionSheet. */
export function SetTypeSheet({
  current,
  onSelect,
  onClose,
}: {
  current: SetType;
  onSelect: (type: SetType) => void;
  onClose: () => void;
}) {
  return (
    <OptionSheet
      title="Tipo de serie"
      options={SET_TYPES}
      current={current}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
}
