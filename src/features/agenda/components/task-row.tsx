import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { deleteTask, setTaskDone } from '@/features/agenda/mutations';
import type { TodayTask } from '@/features/agenda/queries';
import { describeSchedule, scheduleOf } from '@/features/routines/schedule';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, isoDayToTimestamp } from '@/lib/format';

import { ItemActionsSheet } from './item-actions-sheet';

/**
 * One task of today's list: a box to tick it off for today, crossing it out.
 * Tapping the text opens it to change it; a long press offers to edit or
 * delete it.
 *
 * Underneath, a repeating task says when it repeats and one carried over from
 * an earlier day says since when. A one-off task also has a cross to drop it
 * at once; a repeating one is dropped from its form, since that stops it on
 * every day.
 */
export function TaskRow({ task, today }: { task: TodayTask; today: string }) {
  const theme = useTheme();
  const router = useRouter();
  const carried = !task.repeats && task.date < today;
  const [menu, setMenu] = useState(false);
  const open = () => router.push({ pathname: '/task', params: { id: task.id } });

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => void setTaskDone(task, !task.doneToday, today)}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.doneToday }}>
        <Ionicons
          name={task.doneToday ? 'checkbox' : 'square-outline'}
          size={22}
          color={task.doneToday ? theme.accentText : theme.textSecondary}
        />
      </Pressable>

      <Pressable
        onPress={open}
        onLongPress={() => setMenu(true)}
        accessibilityHint="Abre la tarea para cambiarla; mantén pulsado para más opciones"
        style={styles.text}>
        <ThemedText
          type="default"
          themeColor={task.doneToday ? 'textSecondary' : undefined}
          style={task.doneToday && styles.crossed}>
          {task.text}
        </ThemedText>
        {task.repeats ? (
          <View style={styles.note}>
            <Ionicons name="repeat" size={12} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {describeSchedule(scheduleOf(task))}
            </ThemedText>
          </View>
        ) : carried ? (
          <ThemedText type="small" themeColor="textSecondary">
            Desde {formatDay(isoDayToTimestamp(task.date)).toLowerCase()}
          </ThemedText>
        ) : null}
      </Pressable>

      {task.repeats ? null : (
        <Pressable
          onPress={() => void deleteTask(task.id)}
          hitSlop={8}
          accessibilityLabel="Quitar tarea">
          <Ionicons name="close" size={18} color={theme.textSecondary} />
        </Pressable>
      )}

      {menu ? (
        <ItemActionsSheet
          title={task.text}
          editHint={
            task.repeats ? 'Cambiar el nombre o los días' : 'Cambiar el nombre o hacer que se repita'
          }
          deleteTitle="Eliminar tarea"
          deleteMessage={
            task.repeats ? 'Deja de salir todos los días que tocaba.' : 'Se quita de la lista.'
          }
          onEdit={open}
          onDelete={() => deleteTask(task.id)}
          onClose={() => setMenu(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  text: { flex: 1 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  crossed: { textDecorationLine: 'line-through' },
});
