import type { Application, CitizenProfile, Notification, StoredDocument } from '@/types';

/**
 * Thin client for the MITRA API.
 *
 * Every response uses the { data, error, meta } envelope, so unwrapping happens once
 * here rather than at each call site. Failures throw — the store decides whether a
 * failure is worth surfacing or whether the cached view should simply stand.
 */

export interface Bootstrap {
  user: CitizenProfile;
  family: CitizenProfile[];
  documents: StoredDocument[];
  applications: Application[];
  notifications: Notification[];
}

interface Envelope<T> {
  data: T | null;
  error: { code: string; message: string } | null;
  meta: Record<string, unknown>;
}

/** Thrown when the session has expired, so the store can re-bootstrap rather than error. */
export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has expired.');
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    // The whole point of these calls is that the answer changes.
    cache: 'no-store',
    // Session cookie must ride along on every call.
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  const body = (await res.json().catch(() => null)) as Envelope<T> | null;

  if (res.status === 401) throw new SessionExpiredError();

  if (!res.ok || body?.error) {
    throw new Error(body?.error?.message ?? `Request to ${path} failed (${res.status}).`);
  }
  return body?.data as T;
}

export const api = {
  bootstrap: () => request<Bootstrap | null>('/api/bootstrap'),

  updateProfile: (patch: Partial<CitizenProfile>) =>
    request<CitizenProfile>('/api/profile', { method: 'PATCH', body: JSON.stringify(patch) }),

  createApplication: (schemeId: string, applicantId: string) =>
    request<Application>('/api/applications', {
      method: 'POST',
      body: JSON.stringify({ schemeId, applicantId }),
    }),

  advanceApplication: (id: string) =>
    request<Application>(`/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'advance' }),
    }),

  addDocuments: (documents: StoredDocument[]) =>
    request<StoredDocument[]>('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ documents }),
    }),

  markNotificationsRead: (id?: string) =>
    request<Notification[]>('/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify(id ? { id } : {}),
    }),
};
