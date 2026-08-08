'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  Application,
  ChatMessage,
  CitizenProfile,
  Locale,
  Notification,
  StoredDocument,
} from '@/types';
import {
  APPLICATIONS,
  DOCUMENTS,
  FAMILY,
  NOTIFICATIONS,
  PRIMARY_USER,
} from './demoData';
import { api, SessionExpiredError } from './api';
import { translate } from './i18n';

/**
 * Application state, backed by Postgres.
 *
 * Every mutation is applied optimistically and then persisted. If the write fails the
 * local change stands and `syncError` is set: a citizen on an unreliable connection
 * should never lose what they just typed, and the next successful load reconciles.
 *
 * The demo household is used as the initial render only. It keeps the first paint
 * instant and gives offline users something coherent to read, but it is replaced by
 * the database as soon as the bootstrap call returns.
 */

interface StoreValue {
  user: CitizenProfile;
  family: CitizenProfile[];
  allPeople: CitizenProfile[];
  documents: StoredDocument[];
  applications: Application[];
  notifications: Notification[];
  messages: ChatMessage[];
  locale: Locale;
  theme: 'light' | 'dark';
  online: boolean;
  unreadCount: number;
  /** False until the first load from the database resolves. */
  loaded: boolean;
  /** Set when a write could not be persisted; the local change still stands. */
  syncError: string | null;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLocale: (l: Locale) => void;
  toggleTheme: () => void;
  addMessages: (msgs: ChatMessage[]) => void;
  clearMessages: () => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  updateProfile: (patch: Partial<CitizenProfile>) => void;
  addDocuments: (docs: StoredDocument[]) => void;
  advanceApplication: (id: string) => void;
  createApplication: (schemeId: string, applicantId: string) => void;
  /** Re-reads everything from the database. */
  refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

const STORAGE_KEY = 'mitra.preferences.v1';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CitizenProfile>(PRIMARY_USER);
  const [family, setFamily] = useState<CitizenProfile[]>(FAMILY);
  const [documents, setDocuments] = useState<StoredDocument[]>(DOCUMENTS);
  const [applications, setApplications] = useState<Application[]>(APPLICATIONS);
  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [locale, setLocaleState] = useState<Locale>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [online, setOnline] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.bootstrap();
      // A null payload means the database is reachable but not seeded — keep the demo
      // household on screen rather than showing an empty app.
      if (data) {
        setUser(data.user);
        setFamily(data.family);
        setDocuments(data.documents);
        setApplications(data.applications);
        setNotifications(data.notifications);
      }
      setSyncError(null);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Could not reach the server.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Applies a write, keeping the optimistic state if the server rejects it.
   *
   * A 12-hour session can expire while a tab sits open. Rather than surface an error
   * the citizen cannot act on, an expired session triggers one silent re-bootstrap —
   * which issues a fresh session — and the write is retried once.
   */
  const persist = useCallback(
    async (write: () => Promise<unknown>) => {
      try {
        await write();
        setSyncError(null);
      } catch (e) {
        if (e instanceof SessionExpiredError) {
          try {
            await refresh();
            await write();
            setSyncError(null);
            return;
          } catch {
            setSyncError('Your session expired. Reload the page to continue.');
            return;
          }
        }
        setSyncError(e instanceof Error ? e.message : 'Your change could not be saved.');
      }
    },
    [refresh],
  );

  // Profile fields are bound to text inputs that fire on every keystroke. Writing each
  // one straight through would mean a database round trip per character and a race over
  // which half-typed value lands last, so edits are coalesced and flushed once the
  // citizen stops typing. The on-screen value still updates immediately.
  const pendingProfile = useRef<Partial<CitizenProfile>>({});
  const profileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushProfile = useCallback(() => {
    if (profileTimer.current) {
      clearTimeout(profileTimer.current);
      profileTimer.current = null;
    }
    const patch = pendingProfile.current;
    pendingProfile.current = {};
    if (Object.keys(patch).length === 0) return;
    void persist(() => api.updateProfile(patch));
  }, [persist]);

  const queueProfile = useCallback(
    (patch: Partial<CitizenProfile>) => {
      pendingProfile.current = { ...pendingProfile.current, ...patch };
      if (profileTimer.current) clearTimeout(profileTimer.current);
      profileTimer.current = setTimeout(flushProfile, 600);
    },
    [flushProfile],
  );

  // A citizen who edits a field and immediately closes the tab must not lose the edit.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushProfile();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushProfile);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushProfile);
      flushProfile();
    };
  }, [flushProfile]);

  // Restore language and theme. Only preferences are persisted locally — never PII or
  // documents; those live in the database.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { locale?: Locale; theme?: 'light' | 'dark' };
        if (saved.locale) setLocaleState(saved.locale);
        if (saved.theme) setTheme(saved.theme);
      }
    } catch {
      // A corrupt or unavailable store must never block the app from rendering.
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ locale, theme }));
    } catch {
      /* storage may be unavailable in private mode; preferences simply do not persist */
    }
  }, [theme, locale]);

  // Offline mode: cached scheme content stays readable when the connection drops, and
  // coming back online reconciles whatever was changed while away.
  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      // Push anything typed while offline before pulling, or the refresh overwrites it.
      flushProfile();
      void refresh();
    };
    const goOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [refresh, flushProfile]);

  const t = useCallback(
    (key: string, vars: Record<string, string | number> = {}) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo<StoreValue>(
    () => ({
      user,
      family,
      allPeople: [user, ...family],
      documents,
      applications,
      notifications,
      messages,
      locale,
      theme,
      online,
      loaded,
      syncError,
      unreadCount: notifications.filter((n) => !n.read).length,
      t,
      setLocale: setLocaleState,
      toggleTheme: () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light')),
      addMessages: (msgs) => setMessages((prev) => [...prev, ...msgs]),
      clearMessages: () => setMessages([]),
      refresh,

      markAllRead: () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        void persist(() => api.markNotificationsRead());
      },

      markRead: (id) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        void persist(() => api.markNotificationsRead(id));
      },

      updateProfile: (patch) => {
        setUser((prev) => ({ ...prev, ...patch }));
        queueProfile(patch);
      },

      addDocuments: (docs) => {
        setDocuments((prev) => {
          const ids = new Set(prev.map((d) => d.id));
          return [...prev, ...docs.filter((d) => !ids.has(d.id))];
        });
        void persist(async () => {
          const saved = await api.addDocuments(docs);
          // The server assigns ids and timestamps; adopt its version of the truth.
          setDocuments((prev) => {
            const bySaved = new Map(saved.map((d) => [d.id, d]));
            const merged = prev.map((d) => bySaved.get(d.id) ?? d);
            const known = new Set(merged.map((d) => d.id));
            return [...merged, ...saved.filter((d) => !known.has(d.id))];
          });
        });
      },

      advanceApplication: (id) => {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === id && a.progressStep < a.totalSteps
              ? { ...a, progressStep: a.progressStep + 1, updatedAt: new Date().toISOString() }
              : a,
          ),
        );
        void persist(async () => {
          const updated = await api.advanceApplication(id);
          setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
        });
      },

      createApplication: (schemeId, applicantId) => {
        const applicant = [user, ...family].find((p) => p.id === applicantId) ?? user;
        const tempId = `a-${Date.now()}`;
        const now = new Date().toISOString();
        setApplications((prev) => [
          {
            id: tempId,
            schemeId,
            applicantId,
            applicantName: applicant.name,
            status: 'draft',
            submittedAt: now,
            updatedAt: now,
            progressStep: 1,
            totalSteps: 5,
            referenceNo: `DRAFT-${schemeId.toUpperCase().slice(0, 6)}-${String(prev.length + 1).padStart(4, '0')}`,
            district: applicant.district,
            timeline: [{ at: now, status: 'draft', note: 'Draft created through MITRA.' }],
          },
          ...prev,
        ]);
        void persist(async () => {
          const created = await api.createApplication(schemeId, applicantId);
          // Swap the optimistic row for the persisted one, which carries the real
          // reference number the citizen will quote at a service centre.
          setApplications((prev) => prev.map((a) => (a.id === tempId ? created : a)));
        });
      },
    }),
    [
      user,
      family,
      documents,
      applications,
      notifications,
      messages,
      locale,
      theme,
      online,
      loaded,
      syncError,
      t,
      persist,
      queueProfile,
      refresh,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
