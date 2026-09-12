import * as Application from 'expo-application';
import Constants from 'expo-constants';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { readSetting, writeSetting } from '@/db/settings';
import { UpdatePrompt } from '@/features/updates/components/update-prompt';
import { fetchLatestRelease } from '@/features/updates/github';
import { canInstall, downloadAndInstall } from '@/features/updates/install';
import {
  DISMISSED_KEY,
  LAST_CHECKED_KEY,
  isNewer,
  shouldCheck,
  type Release,
} from '@/features/updates/updates';

/**
 * The version running right now.
 *
 * The APK reports what the release workflow wrote into `app.json`. Under Expo
 * Go there is no such APK and the native value belongs to Expo Go itself, so
 * the bundled config answers instead.
 */
export const installedVersion =
  Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? null;

export type UpdateStatus = 'idle' | 'checking' | 'downloading';

type UpdatesValue = {
  status: UpdateStatus;
  /** A release newer than what is installed, once one has been found. */
  available: Release | null;
  /** 0 to 1 while downloading, null otherwise. */
  progress: number | null;
  /** Outcome of the last manual check, for the profile card to show. */
  note: string | null;
  /** Checks now, ignoring both the interval and the dismissed version. */
  check: () => Promise<void>;
  /** Downloads the available release and opens the system installer. */
  install: () => Promise<void>;
  /** Hides the popup and keeps this version quiet until a newer one appears. */
  dismiss: () => Promise<void>;
};

const UpdatesContext = createContext<UpdatesValue | null>(null);

export function useUpdates(): UpdatesValue {
  const value = use(UpdatesContext);
  if (!value) throw new Error('useUpdates must be used inside UpdateProvider');
  return value;
}

/**
 * Watches GitHub for a newer build and offers to install it.
 *
 * The check runs when the app comes to the foreground and at most once a day,
 * which is plenty for versions published by hand. It lives at the root so the
 * popup can appear over any screen and the profile card can share its state.
 */
export function UpdateProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [available, setAvailable] = useState<Release | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [prompted, setPrompted] = useState(false);
  /** Guards against a second check starting while one is in flight. */
  const running = useRef(false);

  const run = useCallback(async (manual: boolean) => {
    if (running.current) return;
    running.current = true;

    if (manual) {
      setStatus('checking');
      setNote(null);
    }

    try {
      const now = Date.now();

      if (!manual) {
        const last = Number(await readSetting(LAST_CHECKED_KEY));
        if (!shouldCheck(Number.isFinite(last) && last > 0 ? last : null, now)) return;
      }

      const release = await fetchLatestRelease();
      await writeSetting(LAST_CHECKED_KEY, String(now));

      if (!release || !isNewer(release.version, installedVersion)) {
        setAvailable(null);
        if (manual) setNote(`Ya tienes la ultima version (${installedVersion ?? 'desconocida'}).`);
        return;
      }

      setAvailable(release);

      // A version already turned down stays quiet until a newer one arrives.
      const dismissed = await readSetting(DISMISSED_KEY);
      if (manual || dismissed !== release.version) setPrompted(true);
      if (manual) setNote(null);
    } catch (cause) {
      // Being offline is the normal case in a gym, and says nothing worth an alert.
      if (manual) setNote(`No se pudo comprobar: ${String(cause)}`);
    } finally {
      running.current = false;
      setStatus('idle');
    }
  }, []);

  useEffect(() => {
    void run(false);

    // Coming back after days away is exactly when a new version is waiting.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run(false);
    });

    return () => subscription.remove();
  }, [run]);

  const install = useCallback(async () => {
    if (!available) return;

    if (!canInstall) {
      setNote('Solo se puede instalar desde Android.');
      return;
    }

    setStatus('downloading');
    setProgress(0);

    try {
      await downloadAndInstall(available, setProgress);
      setPrompted(false);
    } catch (cause) {
      setNote(`No se pudo instalar: ${String(cause)}`);
      setPrompted(false);
    } finally {
      setStatus('idle');
      setProgress(null);
    }
  }, [available]);

  const dismiss = useCallback(async () => {
    setPrompted(false);
    if (available) await writeSetting(DISMISSED_KEY, available.version);
  }, [available]);

  const value = useMemo<UpdatesValue>(
    () => ({
      status,
      available,
      progress,
      note,
      check: () => run(true),
      install,
      dismiss,
    }),
    [status, available, progress, note, run, install, dismiss]
  );

  return (
    <UpdatesContext value={value}>
      {children}

      <UpdatePrompt
        release={prompted ? available : null}
        progress={progress}
        busy={status === 'downloading'}
        onInstall={() => void install()}
        onDismiss={() => void dismiss()}
      />
    </UpdatesContext>
  );
}
