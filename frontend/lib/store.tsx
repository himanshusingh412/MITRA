'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  ALL_PEOPLE,
  APPLICATIONS,
  DOCUMENTS,
  FAMILY,
  NOTIFICATIONS,
  PRIMARY_USER,
} from './demoData';
import { translate } from './i18n';

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
  createApplication: (schemeId: string, applicantId: string) => string;
}

const StoreContext = createContext<StoreValue | null>(null);

const STORAGE_KEY = 'mitra.preferences.v1';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CitizenProfile>(PRIMARY_USER);
  const [documents, setDocuments] = useState<StoredDocument[]>(DOCUMENTS);
  const [applications, setApplications] = useState<Application[]>(APPLICATIONS);
  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [locale, setLocaleState] = useState<Locale>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [online, setOnline] = useState(true);

  // Restore language and theme. Only preferences are persisted — never PII or documents.
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

  // Offline mode: cached scheme content stays readable when the connection drops.
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const t = useCallback(
    (key: string, vars: Record<string, string | number> = {}) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo<StoreValue>(
    () => ({
      user,
      family: FAMILY,
      allPeople: ALL_PEOPLE,
      documents,
      applications,
      notifications,
      messages,
      locale,
      theme,
      online,
      unreadCount: notifications.filter((n) => !n.read).length,
      t,
      setLocale: setLocaleState,
      toggleTheme: () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light')),
      addMessages: (msgs) => setMessages((prev) => [...prev, ...msgs]),
      clearMessages: () => setMessages([]),
      markAllRead: () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
      markRead: (id) =>
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n))),
      updateProfile: (patch) => setUser((prev) => ({ ...prev, ...patch })),
      addDocuments: (docs) =>
        setDocuments((prev) => {
          const ids = new Set(prev.map((d) => d.id));
          return [...prev, ...docs.filter((d) => !ids.has(d.id))];
        }),
      advanceApplication: (id) =>
        setApplications((prev) =>
          prev.map((a) =>
            a.id === id && a.progressStep < a.totalSteps
              ? { ...a, progressStep: a.progressStep + 1, updatedAt: new Date().toISOString() }
              : a,
          ),
        ),
      createApplication: (schemeId, applicantId) => {
        const applicant = ALL_PEOPLE.find((p) => p.id === applicantId) ?? user;
        const id = `a-${Date.now()}`;
        const now = new Date().toISOString();
        setApplications((prev) => [
          {
            id,
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
        return id;
      },
    }),
    [user, documents, applications, notifications, messages, locale, theme, online, t],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
