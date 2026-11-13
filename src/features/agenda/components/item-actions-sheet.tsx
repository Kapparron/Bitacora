import { useConfirm } from '@/components/confirm-dialog';
import { OptionSheet, type SheetOption } from '@/components/option-sheet';

type Action = 'edit' | 'delete';

/**
 * What a long press on a task, an event or a note offers: edit or delete, the
 * same two the history offers for a session. Deleting asks first.
 *
 * Render it only while it is open; see the note in OptionSheet.
 */
export function ItemActionsSheet({
  title,
  editHint,
  deleteTitle,
  deleteMessage,
  onEdit,
  onDelete,
  onClose,
}: {
  title: string;
  /** What editing lets you change, under "Editar". */
  editHint: string;
  deleteTitle: string;
  deleteMessage: string;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const confirm = useConfirm();

  const options: SheetOption<Action>[] = [
    { value: 'edit', label: 'Editar', description: editHint },
    { value: 'delete', label: 'Eliminar', description: deleteMessage },
  ];

  async function remove() {
    const accepted = await confirm({
      title: deleteTitle,
      message: deleteMessage,
      confirmLabel: 'Eliminar',
    });
    if (accepted) await onDelete();
  }

  return (
    <OptionSheet
      title={title}
      options={options}
      current={null}
      onSelect={(action) => {
        onClose();
        if (action === 'edit') onEdit();
        else void remove();
      }}
      onClose={onClose}
    />
  );
}
