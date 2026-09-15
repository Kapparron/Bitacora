import { OptionSheet, type SheetOption } from '@/components/option-sheet';
import type { WorkoutSet } from '@/db/schema';

export type SetType = WorkoutSet['type'];

export const SET_TYPES: SheetOption<SetType>[] = [
  { value: 'normal', label: 'Serie normal', badge: '#', description: 'Cuenta para el volumen' },
  { value: 'warmup', label: 'Calentamiento', badge: 'C', description: 'No cuenta para el volumen' },
  { value: 'drop', label: 'Drop set', badge: 'D', description: 'Bajada de peso sin descanso' },
  { value: 'failure', label: 'Al fallo', badge: 'F', description: 'Hasta el fallo muscular' },
];

/**
 * Badge shown in the set-number column; normal sets keep their number. Warmups
 * are not counted, so the first set after them is set 1.
 */
export function badgeFor(sets: readonly { type: SetType }[], index: number): string {
  const { type } = sets[index];
  if (type !== 'normal') return SET_TYPES.find((option) => option.value === type)?.badge ?? '';

  const warmupsBefore = sets.slice(0, index).filter((set) => set.type === 'warmup').length;
  return String(index + 1 - warmupsBefore);
}

/**
 * Listed after the types so a tap on the set number is enough to find it; the
 * long press that also deletes a set has nothing on screen that reveals it.
 */
const DELETE_OPTION: SheetOption<'delete'> = {
  value: 'delete',
  label: 'Borrar serie',
  description: 'Quitarla del entreno',
};

const SET_ACTIONS: SheetOption<SetType | 'delete'>[] = [...SET_TYPES, DELETE_OPTION];

/** Render this only while it is open; see the note in OptionSheet. */
export function SetTypeSheet({
  current,
  onSelect,
  onDelete,
  onClose,
}: {
  current: SetType;
  onSelect: (type: SetType) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <OptionSheet
      title="Serie"
      options={SET_ACTIONS}
      current={current}
      onSelect={(value) => (value === 'delete' ? onDelete() : onSelect(value))}
      onClose={onClose}
    />
  );
}
