import { createURL } from 'expo-linking';
import { useEffect, useState } from 'react';

import { useActiveWorkout } from '../queries';
import { WorkoutNotifications } from '../notifications';
import { useRestTimer } from '../rest-timer';
import { completedSetCount } from '../volume';

/**
 * Mirrors the session in progress and its rest timer into system notifications,
 * so both can be followed with the phone locked. It renders nothing: the
 * database and the rest timer store stay the only sources of truth, and the
 * notifications follow whatever they say, including going away when the
 * session is finished or discarded.
 */
export function SessionNotifications() {
  const { contents, loading } = useActiveWorkout();
  const endsAt = useRestTimer((state) => state.endsAt);

  // Flipped once the permission is granted, so the session notification that
  // could not be posted before shows up right away.
  const [allowed, setAllowed] = useState(false);

  const workout = contents?.workout;
  const setCount = contents ? completedSetCount(contents.entries.flatMap((entry) => entry.sets)) : 0;

  useEffect(() => {
    if (!WorkoutNotifications || loading) return;

    if (!workout) {
      WorkoutNotifications.cancelWorkout();
      return;
    }

    WorkoutNotifications.showWorkout(
      workout.name,
      `${setCount} series`,
      workout.startedAt,
      createURL('workout/active')
    );
  }, [allowed, loading, setCount, workout?.name, workout?.startedAt]);

  useEffect(() => {
    if (!WorkoutNotifications) return;
    const notifications = WorkoutNotifications;

    // Also clears an alarm left behind by a previous run of the app, whose rest
    // was not restored.
    if (endsAt === null) {
      notifications.cancelRest();
      return;
    }

    // Asked for on the first rest rather than at launch: that is the moment the
    // notification is obviously useful.
    let current = true;
    void notifications.requestPermissionAsync().then((granted) => {
      if (!current) return;
      setAllowed(granted);
      if (granted) notifications.showRest(endsAt, createURL('workout/active'));
    });

    return () => {
      current = false;
    };
  }, [endsAt]);

  return null;
}
