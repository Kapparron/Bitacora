import { useMemo, useRef, useState, type ReactElement } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { currentStreak, weekEndingOn } from '@/features/progress/stats';
import { useRestPlan } from '@/features/rest/queries';
import { bodyLoad, muscleLoad } from '@/features/workout/muscles';
import { useTrainedDays, type WorkoutContents, type WorkoutRecord } from '@/features/workout/queries';
import { shareCardImage } from '@/features/workout/share-card';
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
/**
 * Background around a card when it is captured. Without it the rounded corners
 * come out transparent, which chats show as black or white.
 */
const FRAME = 12;

type Page = { key: string; render: (size: number) => ReactElement };

/**
 * What the summary shows right after a session: one card per thing worth
 * telling, swiped through, instead of everything stacked on one screen. Each
 * card is a square that stands on its own as a picture, and the one on screen
 * is the one shared.
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
  const [sharing, setSharing] = useState(false);
  /** The framed card of each page, by key, for capturing the one on screen. */
  const frames = useRef(new Map<string, View>());

  const size = Math.min(width - GUTTER * 2, MAX_CARD) - FRAME * 2;
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

  async function share() {
    const frame = frames.current.get(pages[page]?.key ?? '');
    if (!frame || sharing) return;

    setSharing(true);
    try {
      await shareCardImage(frame);
    } finally {
      setSharing(false);
    }
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
        renderItem={({ item }) => (
          <View style={[styles.page, { width }]}>
            <View
              ref={(node) => {
                if (node) frames.current.set(item.key, node);
                else frames.current.delete(item.key);
              }}
              // Android flattens a view that draws nothing of its own, and a
              // flattened view cannot be captured.
              collapsable={false}
              style={[styles.frame, { backgroundColor: theme.background }]}>
              {item.render(size)}
            </View>
          </View>
        )}
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

      <View style={styles.actions}>
        <Button
          title={sharing ? 'Preparando...' : 'Compartir tarjeta'}
          disabled={sharing}
          onPress={() => void share()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, marginBottom: 16 },
  heading: { paddingHorizontal: GUTTER, fontSize: 20, lineHeight: 26, fontWeight: '800' },
  page: { alignItems: 'center' },
  frame: { padding: FRAME },
  actions: { paddingHorizontal: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
