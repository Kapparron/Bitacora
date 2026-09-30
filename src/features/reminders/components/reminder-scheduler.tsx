import { createURL } from 'expo-linking';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useUpcomingEvents } from '@/features/agenda/queries';
import { useRoutines } from '@/features/routines/queries';
import { scheduleOf } from '@/features/routines/schedule';
import { WorkoutNotifications } from '@/features/workout/notifications';
import { useTrainedDays } from '@/features/workout/queries';
import { toIsoDay } from '@/lib/format';

import { planReminders } from '../plan';
import { useReminderSettings } from '../settings';

/**
 * Keeps the reminders of the next two weeks handed to the phone: the routine
 * due each morning and the events coming up. It renders nothing.
 *
 * They are planned again whenever what they depend on changes (a routine, an
 * event, a setting, a session finished) and whenever the app comes back to the
 * front, which is also how a new day enters the window.
 */
export function ReminderScheduler() {
  const [now, setNow] = useState(() => Date.now());
  const today = toIsoDay(new Date(now));

  const { settings, loading: settingsLoading } = useReminderSettings();
  const { routines, loading: routinesLoading } = useRoutines();
  const trainedByDay = useTrainedDays();
  const events = useUpcomingEvents(today);

  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => listener.remove();
  }, []);

  const planned = useMemo(
    () =>
      planReminders({
        now,
        today,
        settings,
        routines: routines.map((routine) => ({ name: routine.name, schedule: scheduleOf(routine) })),
        trainedToday: trainedByDay.has(today),
        events,
      }).map((reminder) => ({ ...reminder, url: createURL(reminder.path === 'routine' ? '/' : '/agenda') })),
    [now, today, settings, routines, trainedByDay, events]
  );

  /** What was last handed over, so the same plan is not handed over again. */
  const sent = useRef<string | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    // Until both are read the plan is empty, and handing that over would cancel
    // every reminder for a moment.
    if (!WorkoutNotifications || settingsLoading || routinesLoading) return;
    const notifications = WorkoutNotifications;

    const json = JSON.stringify(planned);
    if (json === sent.current) return;
    sent.current = json;
    notifications.scheduleReminders(json);

    // Asked for once, the first time there is something to remind: until then
    // the prompt would come out of nowhere.
    if (planned.length > 0 && !asked.current) {
      asked.current = true;
      void notifications.requestPermissionAsync();
    }
  }, [planned, settingsLoading, routinesLoading]);

  return null;
}
