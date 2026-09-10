import { useEffect, useState } from 'react';

/**
 * Milliseconds since `startedAt`, ticking once a second. It reads the clock on
 * every tick instead of accumulating, so the value stays correct after the app
 * has been backgrounded and timers were throttled.
 */
export function useElapsed(startedAt: number | null): number {
  const [elapsed, setElapsed] = useState(() => (startedAt === null ? 0 : Date.now() - startedAt));

  useEffect(() => {
    if (startedAt === null) return;

    setElapsed(Date.now() - startedAt);
    const interval = setInterval(() => setElapsed(Date.now() - startedAt), 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  return elapsed;
}
