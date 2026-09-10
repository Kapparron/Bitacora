import { create } from 'zustand';

type RestTimerState = {
  /** Epoch milliseconds when the rest ends, or null when no rest is running. */
  endsAt: number | null;
  /** What the rest was set to, so the bar can draw progress. */
  durationS: number;
  start: (seconds: number) => void;
  extend: (seconds: number) => void;
  stop: () => void;
};

/**
 * The rest timer is the one piece of session state that is not in the database:
 * it is about the next few seconds, not about what was performed, and a rest
 * left running when the app is killed is not worth restoring.
 */
export const useRestTimer = create<RestTimerState>((set, get) => ({
  endsAt: null,
  durationS: 0,

  start: (seconds) => {
    if (seconds <= 0) return;
    set({ endsAt: Date.now() + seconds * 1000, durationS: seconds });
  },

  extend: (seconds) => {
    const { endsAt, durationS } = get();
    if (endsAt === null) return;

    // Extending after the rest already ran out counts from now, not from a time
    // in the past.
    const base = Math.max(endsAt, Date.now());
    set({ endsAt: base + seconds * 1000, durationS: durationS + seconds });
  },

  stop: () => set({ endsAt: null, durationS: 0 }),
}));
