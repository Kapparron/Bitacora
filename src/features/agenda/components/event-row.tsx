import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { CalendarEvent } from '@/db/schema';
import { deleteEvent } from '@/features/agenda/mutations';
import { useTheme } from '@/hooks/use-theme';

import { ItemActionsSheet } from './item-actions-sheet';

/**
 * One event: its time, or "Todo el día", and its title. Shared by the agenda and
 * the day summary on the home screen. Tapping it opens the event to change it;
 * a long press offers to edit or delete it.
 */
export function EventRow({ event }: { event: CalendarEvent }) {
  const theme = useTheme();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const open = () => router.push({ pathname: '/event', params: { id: event.id } });

  return (
    <>
      <Pressable
        onPress={open}
        onLongPress={() => setMenu(true)}
        accessibilityRole="button"
        accessibilityHint="Abre el evento para cambiarlo; mantén pulsado para más opciones"
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
        <ThemedText
          type="small"
          style={[styles.time, { color: event.time ? theme.accentText : theme.textSecondary }]}>
          {event.time ?? 'Todo el día'}
        </ThemedText>
        <ThemedText type="default" style={styles.title} numberOfLines={2}>
          {event.title}
        </ThemedText>
        <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
      </Pressable>

      {menu ? (
        <ItemActionsSheet
          title={event.title}
          editHint="Cambiar el nombre, el día o la hora"
          deleteTitle="Eliminar evento"
          deleteMessage="Se quita de la agenda y del calendario."
          onEdit={open}
          onDelete={() => deleteEvent(event.id)}
          onClose={() => setMenu(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  time: { width: 76, fontWeight: '700' },
  title: { flex: 1 },
});
