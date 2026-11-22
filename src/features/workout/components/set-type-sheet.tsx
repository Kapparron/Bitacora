import { OptionSheet, type SheetOption } from '@/components/option-sheet';
import { SET_TYPES as SET_TYPE_DATA, type SetType } from '@/constants/sets';
import { badgeFor } from '../set-badge';

export type { SetType };

/** The same four types the shared link and the web page use; see `data/sets.json`. */
export const SET_TYPES: SheetOption<SetType>[] = SET_TYPE_DATA.map((type) => ({
  value: type.id,
  label: type.label,
  badge: type.badge,
  description: type.description,
}));

export { badgeFor };

/**
 * Listed after the types so a tap on the set number is enough to find it; the
 * long press that also deletes a set has nothing on screen that reveals it.
 */
const DELETE_OPTION: SheetOption<'delete'> = {
  value: 'delete',
  label: 'Borrar serie',
  description: 'Quitarla del entreno',
};

/** Drop sets and 3/7 series are added from the menu next to "Anadir serie". */
const ADDED_FROM_MENU: SetType[] = ['drop', 'three_seven'];

const SET_ACTIONS: SheetOption<SetType | 'delete'>[] = [
  ...SET_TYPES.filter((option) => !ADDED_FROM_MENU.includes(option.value)),
  DELETE_OPTION,
];

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
