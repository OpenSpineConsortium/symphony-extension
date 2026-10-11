// The one thing Symphony remembers: that the person pressed "Create Symphony repository" on
// GitHub's new-repository page, with the name they had typed and when. GitHub then creates the
// repository and lands them on its main page, a different page load, so the content script there
// needs this note to know it should offer the next step. The note is short-lived (15 minutes) and
// is cleared the moment it is used, so storage holds it only between those two pages.
// Pure functions: the content script gives them the clock and the storage (ext/storage.ts).

export const PENDING_KEY = 'symphony.pending';

/** how long a pressed Create is remembered; a repository not reached by then was not created */
export const PENDING_TTL_MS = 15 * 60 * 1000;

export interface Pending {
  /** the repository name as typed, trimmed; GitHub lower-cases nothing, but compares case-insensitively */
  name: string;
  /** the owner shown in the form's owner selector, when the page let it be read; undefined otherwise */
  owner?: string;
  /** when Create was pressed, milliseconds since the epoch */
  at: number;
}

export interface KV {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

export function pendingFor(name: string, owner: string | undefined, now: number): Pending | undefined {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  const cleanOwner = owner?.trim();
  return cleanOwner ? { name: trimmed, owner: cleanOwner, at: now } : { name: trimmed, at: now };
}

export function isExpired(p: Pending, now: number): boolean {
  // a clock that went backwards (at > now) counts as expired too: the note is then not trusted
  return now < p.at || now - p.at > PENDING_TTL_MS;
}

/**
 * Whether a pending note is for the repository page at owner/name: the same name, case-insensitively
 * (GitHub treats repository names so), the same owner when the note recorded one, and not expired.
 */
export function matches(p: Pending, repo: { owner: string; name: string }, now: number): boolean {
  if (isExpired(p, now)) return false;
  if (p.name.toLowerCase() !== repo.name.toLowerCase()) return false;
  if (p.owner && p.owner.toLowerCase() !== repo.owner.toLowerCase()) return false;
  return true;
}

/** a value read from storage, checked before it is trusted: storage is the extension's own, but a shape check costs nothing */
export function asPending(value: unknown): Pending | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  if (typeof v.name !== 'string' || typeof v.at !== 'number') return undefined;
  if (v.owner !== undefined && typeof v.owner !== 'string') return undefined;
  return v.owner === undefined ? { name: v.name, at: v.at } : { name: v.name, owner: v.owner, at: v.at };
}

export async function recordPending(kv: KV, p: Pending): Promise<void> {
  await kv.set(PENDING_KEY, p);
}

/**
 * The pending note for this repository page, if there is one, cleared as it is read: it answers once.
 * An expired or unrelated note is left for its own repository page, except an expired one, which is
 * removed so nothing stays in storage past its 15 minutes.
 */
export async function takePending(kv: KV, repo: { owner: string; name: string }, now: number): Promise<Pending | undefined> {
  const p = asPending(await kv.get(PENDING_KEY));
  if (!p) return undefined;
  if (isExpired(p, now)) {
    await kv.remove(PENDING_KEY);
    return undefined;
  }
  if (!matches(p, repo, now)) return undefined;
  await kv.remove(PENDING_KEY);
  return p;
}
