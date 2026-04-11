const STORAGE_KEY_PREFIX = "planner_guest_";

export function getGuestParticipantId(tripId: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${STORAGE_KEY_PREFIX}${tripId}`);
}

export function setGuestParticipantId(tripId: string, participantId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${tripId}`, participantId);
  document.cookie = `planner_guest=${participantId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function clearGuestIdentity(tripId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${tripId}`);
  document.cookie = "planner_guest=; path=/; max-age=0";
}

export function getGuestIdFromCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(/planner_guest=([^;]+)/);
  return match ? match[1] : null;
}
