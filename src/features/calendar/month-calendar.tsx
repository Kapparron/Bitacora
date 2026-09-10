import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { toIsoDay } from '@/lib/format';

/** Monday first, as the week is read in Spain. */
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Days of `month`, padded with nulls so the first one lands on its weekday. */
function buildGrid(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  // getDay() is Sunday-first; shift it so Monday is 0.
  const leading = (first.getDay() + 6) % 7;

  const cells: (Date | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  // Trailing blanks keep the last row the same width as the others.
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function monthLabel(month: Date): string {
  const label = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(month);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export type MonthCalendarProps = {
  month: Date;
  onMonthChange: (month: Date) => void;
  /** Days that have something to show, as `YYYY-MM-DD`. */
  markedDays: ReadonlySet<string>;
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
};

/**
 * Month grid marking the days that were trained. Written here rather than pulled
 * from a calendar library: it draws a grid and reports taps, and a dependency
 * would bring its own theming and locale handling to fight with.
 *
 * `markedDays` is deliberately generic — nutrition will mark the same grid.
 */
export function MonthCalendar({
  month,
  onMonthChange,
  markedDays,
  selectedDay,
  onSelectDay,
}: MonthCalendarProps) {
  const theme = useTheme();
  const cells = useMemo(() => buildGrid(month), [month]);
  const today = toIsoDay();

  function shiftMonth(delta: number) {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }

  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.header}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} accessibilityLabel="Mes anterior">
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </Pressable>

        <ThemedText type="default" style={styles.monthLabel}>
          {monthLabel(month)}
        </ThemedText>

        <Pressable onPress={() => shiftMonth(1)} hitSlop={10} accessibilityLabel="Mes siguiente">
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((day, index) => (
          <ThemedText
            key={index}
            type="small"
            themeColor="textSecondary"
            style={styles.weekday}>
            {day}
          </ThemedText>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((date, index) => {
          if (!date) return <View key={index} style={styles.cell} />;

          const iso = toIsoDay(date);
          const marked = markedDays.has(iso);
          const selected = iso === selectedDay;

          return (
            <Pressable
              key={index}
              // Tapping the selected day again clears the filter.
              onPress={() => onSelectDay(selected ? null : iso)}
              style={styles.cell}>
              <View
                style={[
                  styles.day,
                  selected && { backgroundColor: theme.accent },
                  !selected && iso === today && { borderWidth: 1, borderColor: theme.accent },
                ]}>
                <ThemedText
                  type="small"
                  style={{
                    color: selected ? theme.onAccent : theme.text,
                    fontWeight: marked ? '700' : '400',
                  }}>
                  {date.getDate()}
                </ThemedText>
              </View>

              <View
                style={[
                  styles.dot,
                  marked && { backgroundColor: selected ? theme.accent : theme.success },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthLabel: { fontWeight: '700' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3, gap: 3 },
  day: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' },
});
