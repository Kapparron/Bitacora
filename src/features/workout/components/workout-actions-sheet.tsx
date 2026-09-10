import { useRouter } from 'expo-router';

import { useConfirm } from '@/components/confirm-dialog';
import { OptionSheet, type SheetOption } from '@/components/option-sheet';
import { deleteWorkout } from '@/features/workout/mutations';

const WORKOUT_ACTIONS: SheetOption<'edit' | 'delete'>[] = [
  { value: 'edit', label: 'Editar', description: 'Corregir series, ejercicios o el nombre' },
  { value: 'delete', label: 'Eliminar', description: 'Quitar del historial' },
];

/**
 * What a long press on a logged session offers, wherever the session is listed.
 * Render it only while `workout` is set; see the note in OptionSheet.
 */
export function WorkoutActionsSheet({
  workout,
  onClose,
}: {
  workout: { id: string; name: string };
  onClose: () => void;
}) {
  const router = useRouter();
  const confirm = useConfirm();

  async function remove() {
    const accepted = await confirm({
      title: 'Eliminar entreno',
      message: 'Se quita del historial. Los records que consiguio se mantienen.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });

    if (accepted) await deleteWorkout(workout.id);
  }

  return (
    <OptionSheet
      title={workout.name}
      options={WORKOUT_ACTIONS}
      current={null}
      onSelect={(action) => {
        onClose();

        if (action === 'edit') {
          router.push({ pathname: '/workout/[id]', params: { id: workout.id, edit: '1' } });
        } else {
          void remove();
        }
      }}
      onClose={onClose}
    />
  );
}
