import { OptionSheet, type SheetOption } from '@/components/option-sheet';
import { SET_TYPES as SET_TYPE_DATA, badgeOf, countsForVolume, type SetType } from '@/constants/sets';

export type { SetType };

/** The same four types the shared link and the web page use; see `data/sets.json`. */
export const SET_TYPES: SheetOption<SetType>[] = SET_TYPE_DATA.map((type) => ({
  value: type.id,
  label: type.label,
  badge: type.badge,
  description: type.description,
}));

/**
 * Badge shown in the set-number column; normal sets keep their number. A type
 * that does not count towards the volume is not counted here either, so the
 * first set after a warm-up is set 1.
 */
export function badgeFor(sets: readonly { type: SetType }[], index: number): string {
  const { type } = sets[index];
  if (type !== 'normal') return badgeOf(type);

  const uncounted = sets.slice(0, index).filter((set) => !countsForVolume(set.type)).length;
  return String(index + 1 - uncounted);
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
