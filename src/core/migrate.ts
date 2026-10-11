// The second thing Symphony remembers: that Migrate, or the banner's install button, was pressed on
// a repository, so that the two install pages can follow each other with the repository preselected.
// An adoption needs both Apps on the repository, SymphonyBoard and then Symphony Setup. The two
// installs are chained on GitHub's side: SymphonyBoard's Setup URL, the page GitHub sends a person
// to after its install, is Symphony Setup's install page, and Symphony Setup's Setup URL is the
// front door's form. But that chain carries no repository: GitHub lands the person on the second
// App's account picker, which knows nothing of what was just installed, and left alone they would
// pick the account and the repository by hand, or land on "All repositories". So the extension still
// steps in on the picker, and this note is what it steps in with: which repository the chain is for,
// the two ids that preselect it, and that the first install is done. The content script on the picker
// (and on the form, which is where an installation lands when an owner's SymphonyBoard still names the
// form as its Setup URL) reads the note to know that the second install is still to come. The note
// holds the repository's owner and name, the two ids the page gave, the step reached and when it was
// pressed; it lives 30 minutes, which bounds the whole chain, and it is cleared when the form is
// reached after the second install. Pure functions, in the manner of pending.ts: the content script
// gives them the clock and the storage (ext/storage.ts).
import { setupInstallUrl, type Target } from './install';
import { FORM_PAGE_URL } from './names';
import type { KV } from './pending';

export const MIGRATE_KEY = 'symphony.migrate';

/** how long a pressed Migrate is remembered: two install pages and the form, with room to read them */
export const MIGRATE_TTL_MS = 30 * 60 * 1000;

/** which App's install comes next: board is SymphonyBoard, setup is Symphony Setup */
export type MigrateStep = 'board' | 'setup';

export interface Migration {
  /** the repository Migrate was pressed on, as the URL spelled it */
  owner: string;
  name: string;
  /** the owner's account id and the repository's id, when the page said them (core/install.ts) */
  ownerId?: string;
  repositoryId?: string;
  step: MigrateStep;
  /** when the button was pressed, milliseconds since the epoch; unchanged by an advance */
  at: number;
}

export function migrationFor(repo: { owner: string; name: string }, ids: { ownerId?: string; repositoryId?: string }, now: number): Migration {
  const m: Migration = { owner: repo.owner, name: repo.name, step: 'board', at: now };
  if (ids.ownerId) m.ownerId = ids.ownerId;
  if (ids.repositoryId) m.repositoryId = ids.repositoryId;
  return m;
}

/** the note as an install page's target: the two ids and owner/name for the link's state */
export function migrationTarget(m: Migration): Target {
  const target: Target = { repository: `${m.owner}/${m.name}` };
  if (m.ownerId) target.ownerId = m.ownerId;
  if (m.repositoryId) target.repositoryId = m.repositoryId;
  return target;
}

export function isExpiredMigration(m: Migration, now: number): boolean {
  // a clock that went backwards (at > now) counts as expired too: the note is then not trusted
  return now < m.at || now - m.at > MIGRATE_TTL_MS;
}

/** a value read from storage, checked before it is trusted: storage is the extension's own, but a shape check costs nothing */
export function asMigration(value: unknown): Migration | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  if (typeof v.owner !== 'string' || typeof v.name !== 'string' || typeof v.at !== 'number') return undefined;
  if (v.step !== 'board' && v.step !== 'setup') return undefined;
  if (v.ownerId !== undefined && typeof v.ownerId !== 'string') return undefined;
  if (v.repositoryId !== undefined && typeof v.repositoryId !== 'string') return undefined;
  const m: Migration = { owner: v.owner, name: v.name, step: v.step, at: v.at };
  if (v.ownerId !== undefined) m.ownerId = v.ownerId;
  if (v.repositoryId !== undefined) m.repositoryId = v.repositoryId;
  return m;
}

export async function recordMigration(kv: KV, m: Migration): Promise<void> {
  await kv.set(MIGRATE_KEY, m);
}

/** the note, if there is one and it is still good; an expired one is removed so nothing stays past its 30 minutes */
export async function readMigration(kv: KV, now: number): Promise<Migration | undefined> {
  const m = asMigration(await kv.get(MIGRATE_KEY));
  if (!m) return undefined;
  if (isExpiredMigration(m, now)) {
    await kv.remove(MIGRATE_KEY);
    return undefined;
  }
  return m;
}

/**
 * The first install is done, or about to be: the note moves from board to setup and is given back as
 * it now stands. A note already at setup stays as it is; none, or an expired one, gives undefined.
 */
export async function advanceMigration(kv: KV, now: number): Promise<Migration | undefined> {
  const m = await readMigration(kv, now);
  if (!m) return undefined;
  if (m.step === 'setup') return m;
  const advanced: Migration = { ...m, step: 'setup' };
  await kv.set(MIGRATE_KEY, advanced);
  return advanced;
}

export async function clearMigration(kv: KV): Promise<void> {
  await kv.remove(MIGRATE_KEY);
}

/** what the content script does on the front door's form page */
export type FormAction =
  /** not an install's landing, or no note: the form is left as GitHub drew it */
  | { kind: 'nothing' }
  /** SymphonyBoard is installed: on to Symphony Setup's install page, preselected (the caller advances the note first) */
  | { kind: 'go'; href: string }
  /** both are installed but GitHub left the repository out of the address: the same page with it added */
  | { kind: 'add-state'; href: string }
  /** both are installed and the form knows the repository: the chain is over (the caller clears the note) */
  | { kind: 'done' };

/**
 * GitHub sends an installer to the Setup URL with installation_id in the query, and gives back as
 * state whatever the install link carried; the form fills its Repository field from state. So a form
 * page without installation_id is one somebody opened by hand, and is left alone whatever the note
 * says; one reached at step board is the moment to go on to the second App, which happens only when
 * the first install did not land on the picker (an owner whose SymphonyBoard still names the form
 * as its Setup URL, or GitHub sending the person to the form), since the picker advances the note
 * before the form is ever reached; and one reached at step setup is the end, unless the state is
 * missing, in which case the page is loaded again with it.
 */
export function nextOnForm(note: Migration | undefined, search: string): FormAction {
  const query = new URLSearchParams(search);
  if (!note || !query.get('installation_id')) return { kind: 'nothing' };
  if (note.step === 'board') return { kind: 'go', href: setupInstallUrl(migrationTarget(note)) };
  if (query.get('state')) return { kind: 'done' };
  query.set('state', `${note.owner}/${note.name}`);
  return { kind: 'add-state', href: `${FORM_PAGE_URL}?${query.toString()}` };
}

/** what the content script does on Symphony Setup's account-picker page: go on, or leave it alone */
export type PickerAction = Extract<FormAction, { kind: 'nothing' } | { kind: 'go' }>;

/**
 * SymphonyBoard's install lands on Symphony Setup's account picker (the module comment says why),
 * which asks for the account and the repository the note already holds. A note at step board says
 * the first install is just done, and the picker is then sent on to the same App's install page with
 * the account and the repository preselected, the page the form used to send it to. The caller
 * advances the note before it goes, so a second landing on the picker, for instance when GitHub
 * sends the person back to it, finds step setup and does nothing: the chain cannot loop. Without a
 * note, or with one past step board, the picker is left as GitHub drew it. The same holds on the
 * App's permissions page, where GitHub goes straight for an account with no organization to
 * choose, as long as its query names no repository (repository_ids[]): a page that names one is
 * the preselected page itself, and is left alone.
 */
export function nextOnPicker(note: Migration | undefined, search = ''): PickerAction {
  if (!note || note.step !== 'board') return { kind: 'nothing' };
  // the permissions page that already names a repository is the preselected page itself: done
  if (new URLSearchParams(search).has('repository_ids[]')) return { kind: 'nothing' };
  return { kind: 'go', href: setupInstallUrl(migrationTarget(note)) };
}
