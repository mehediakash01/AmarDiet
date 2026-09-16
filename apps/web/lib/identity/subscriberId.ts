/**
 * Real subscriber identity — replaces the previous hardcoded 'default-user'
 * that every visitor silently shared on the backend.
 *
 * No phone number, no OTP here (that's the Bdapps subscription feature,
 * built separately, later). This just gets each device a real,
 * server-backed subscriber record so profiles, plans, and progress are
 * genuinely per-person instead of one shared blob.
 */

const STORAGE_KEY = 'thali_subscriber_id';

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

let inFlightRequest: Promise<string> | null = null;

/**
 * Returns the current device's subscriber ID, creating a real backend
 * subscriber record on first visit. Requires connectivity the first time
 * (account creation is one of the few things in this app that reasonably
 * needs a live connection) — after that, the ID is cached locally and this
 * resolves instantly without a network call.
 */
export async function getOrCreateSubscriberId(): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('getOrCreateSubscriberId can only run in the browser');
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;

  // If multiple parts of the app ask for this at once before it's cached,
  // share the same in-flight request instead of creating two subscribers.
  if (!inFlightRequest) {
    inFlightRequest = (async () => {
      const res = await fetch(`${getApiBaseUrl()}/api/subscribers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error(
          `Couldn't create your account (server responded ${res.status}). Check your connection and try again.`,
        );
      }

      const subscriber = await res.json();
      window.localStorage.setItem(STORAGE_KEY, subscriber.id);
      return subscriber.id as string;
    })().finally(() => {
      inFlightRequest = null;
    });
  }

  return inFlightRequest;
}
