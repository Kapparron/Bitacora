import { useMemo, useState, type ReactElement } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { currentStreak, weekEndingOn } from '@/features/progress/stats';
import { useRestPlan } from '@/features/rest/queries';
import { bodyLoad, muscleLoad } from '@/features/workout/muscles';
import { useTrainedDays, type WorkoutContents, type WorkoutRecord } from '@/features/workout/queries';
import { useTheme } from '@/hooks/use-theme';
import { toIsoDay } from '@/lib/format';

import { BodyCard } from './body-card';
import { MusclesCard } from './muscles-card';
import { RecordsCard } from './records-card';
import { SessionCard } from './session-card';
import { StreakCard } from './streak-card';
import { WeekCard } from './week-card';

/** Room left around a card, so the next one peeks in less than it would edge to edge. */
const GUTTER = 24;
/** A tablet would make the square enormous; past this it stops growing. */
const MAX_CARD = 420;

type Page = { key: string; render: (size: number) => ReactElement };

/**
 * What the summary shows right after a session: one card per thing worth
 * telling, swiped through, instead of everything stacked on one screen. Each
 * card is a square that stands on its own as a picture.
 */
export function SummaryCarousel({
  contents,
  records,
}: {
  contents: WorkoutContents;
  records: WorkoutRecord[];
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const trainedByDay = useTrainedDays();
  const rest = useRestPlan();
  const [page, setPage] = useState(0);

  const size = Math.min(width - GUTTER * 2, MAX_CARD);
  const today = toIsoDay();

  const trainedDays = useMemo(() => new Set(trainedByDay.keys()), [trainedByDay]);
  const sessions = useMemo(
    () => [...trainedByDay.values()].reduce((sum, count) => sum + count, 0),
    [trainedByDay]
  );

  const pages = useMemo(() => {
    const list: Page[] = [{ key: 'session', render: (side) => <SessionCard contents={contents} size={side} /> }];

    // Only when something was worked: a session of cardio has no muscles to show.
    const body = bodyLoad(contents.entries);
    if (body.length > 0) {
      list.push({ key: 'body', render: (side) => <BodyCard load={body} size={side} /> });
    }

    const load = muscleLoad(contents.entries);
    if (Object.values(load).some((sets) => sets > 0)) {
      list.push({ key: 'muscles', render: (side) => <MusclesCard load={load} size={side} /> });
    }

    if (records.length > 0) {
      list.push({ key: 'records', render: (side) => <RecordsCard records={records} size={side} /> });
    }

    list.push(
      {
        key: 'week',
        render: (side) => <WeekCard week={weekEndingOn(trainedDays, today, rest)} size={side} />,
      },
      {
        key: 'streak',
        render: (side) => <StreakCard days={currentStreak(trainedDays, today, rest)} size={side} />,
      }
    );

    return list;
  }, [contents, records, trainedDays, today, rest]);

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  }

  return (
    <View style={styles.container}>
      <ThemedText type="default" style={styles.heading}>
        {sessions > 0 ? `¡Buen trabajo! Es tu entreno número ${sessions}.` : '¡Buen trabajo!'}
      </ThemedText>

      <FlatList
        data={pages}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => <View style={[styles.page, { width }]}>{item.render(size)}</View>}
      />

      <View style={styles.dots}>
        {pages.map((item, index) => (
          <View
            key={item.key}
            style={[
              styles.dot,
              { backgroundColor: index === page ? theme.accent : theme.border },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, marginBottom: 16 },
  heading: { paddingHorizontal: GUTTER, fontSize: 20, lineHeight: 26, fontWeight: '800' },
  page: { alignItems: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
