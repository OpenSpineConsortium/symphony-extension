// The migrate note: written when Migrate or the banner's install button is pressed, advanced when the
// first install lands on Symphony Setup's account picker (or on the form, where an installation lands
// when SymphonyBoard's Setup URL still names it), cleared when the second install reaches the form,
// expired after 30 minutes; and the decisions the content script takes on the picker from the note
// alone and on the form page from the note and the page's query string. The storage is a map in
// memory: the functions take their clock and their store as arguments.
import { describe, expect, it } from 'vitest';
import { setupInstallUrl } from '../src/core/install';
import { advanceMigration, asMigration, clearMigration, isExpiredMigration, MIGRATE_KEY, MIGRATE_TTL_MS, migrationFor, migrationTarget, nextOnForm, nextOnPicker, readMigration, recordMigration, type Migration } from '../src/core/migrate';
import { FORM_PAGE_URL, SETUP_INSTALL_URL } from '../src/core/names';
import type { KV } from '../src/core/pending';

function memory(): KV & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    async get<T>(key: string) {
      return data.get(key) as T | undefined;
    },
    async set(key: string, value: unknown) {
      data.set(key, value);
    },
    async remove(key: string) {
      data.delete(key);
    },
  };
}

const T0 = 1_700_000_000_000;
const MINUTE = 60_000;
const REPO = { owner: 'octo-org', name: 'widgets' };
const IDS = { ownerId: '98765', repositoryId: '555001' };
const FULL: Migration = { owner: 'octo-org', name: 'widgets', ownerId: '98765', repositoryId: '555001', step: 'board', at: T0 };
/** the query GitHub appends to a Setup URL after an install */
const LANDING = '?template=adopt.yml&installation_id=12345&setup_action=install';
/** Symphony Setup's install page for FULL: the account and the repository preselected, the state carried */
const PRESELECTED = `${SETUP_INSTALL_URL}/permissions?target_id=98765&suggested_target_id=98765&repository_ids[]=555001&state=octo-org%2Fwidgets`;

describe('the migrate note', () => {
  it('is made from the repository and the ids the page gave, at step board', () => {
    expect(migrationFor(REPO, IDS, T0)).toEqual(FULL);
    expect(migrationFor(REPO, {}, T0)).toEqual({ owner: 'octo-org', name: 'widgets', step: 'board', at: T0 });
    expect(migrationFor(REPO, { ownerId: '98765' }, T0)).toEqual({ owner: 'octo-org', name: 'widgets', ownerId: '98765', step: 'board', at: T0 });
  });

  it('is an install page\'s target: the ids and owner/name for the state', () => {
    expect(migrationTarget(FULL)).toEqual({ ownerId: '98765', repositoryId: '555001', repository: 'octo-org/widgets' });
    expect(migrationTarget({ owner: 'o', name: 'n', step: 'setup', at: T0 })).toEqual({ repository: 'o/n' });
  });

  it('is 30 minutes long', () => {
    expect(MIGRATE_TTL_MS).toBe(30 * MINUTE);
    expect(isExpiredMigration(FULL, T0)).toBe(false);
    expect(isExpiredMigration(FULL, T0 + 30 * MINUTE)).toBe(false);
    expect(isExpiredMigration(FULL, T0 + 30 * MINUTE + 1)).toBe(true);
    // a clock that went backwards is not trusted either
    expect(isExpiredMigration(FULL, T0 - 1)).toBe(true);
  });

  it('trusts only a well-shaped value from storage', () => {
    expect(asMigration(FULL)).toEqual(FULL);
    expect(asMigration({ owner: 'o', name: 'n', step: 'setup', at: 1 })).toEqual({ owner: 'o', name: 'n', step: 'setup', at: 1 });
    expect(asMigration({ owner: 'o', name: 'n', step: 'other', at: 1 })).toBeUndefined();
    expect(asMigration({ owner: 'o', name: 'n', at: 1 })).toBeUndefined();
    expect(asMigration({ owner: 'o', step: 'board', at: 1 })).toBeUndefined();
    expect(asMigration({ owner: 'o', name: 'n', step: 'board', at: '1' })).toBeUndefined();
    expect(asMigration({ owner: 'o', name: 'n', step: 'board', at: 1, ownerId: 98765 })).toBeUndefined();
    expect(asMigration({ owner: 'o', name: 'n', step: 'board', at: 1, repositoryId: null })).toBeUndefined();
    expect(asMigration('o/n')).toBeUndefined();
    expect(asMigration(null)).toBeUndefined();
    // what it gives back carries the known keys only
    expect(asMigration({ ...FULL, extra: true })).toEqual(FULL);
  });

  it('is recorded under its key and read back while it is good', async () => {
    const kv = memory();
    await recordMigration(kv, FULL);
    expect(kv.data.get(MIGRATE_KEY)).toEqual(FULL);
    expect(await readMigration(kv, T0 + MINUTE)).toEqual(FULL);
    expect(kv.data.has(MIGRATE_KEY)).toBe(true);
  });

  it('is removed when read after its 30 minutes, and ignored when of another shape', async () => {
    const kv = memory();
    await recordMigration(kv, FULL);
    expect(await readMigration(kv, T0 + 31 * MINUTE)).toBeUndefined();
    expect(kv.data.has(MIGRATE_KEY)).toBe(false);
    await kv.set(MIGRATE_KEY, { unexpected: true });
    expect(await readMigration(kv, T0)).toBeUndefined();
    expect(await readMigration(memory(), T0)).toBeUndefined();
  });

  it('advances from board to setup once, keeping the rest, and gives the note as it stands', async () => {
    const kv = memory();
    await recordMigration(kv, FULL);
    const advanced = { ...FULL, step: 'setup' };
    expect(await advanceMigration(kv, T0 + MINUTE)).toEqual(advanced);
    expect(kv.data.get(MIGRATE_KEY)).toEqual(advanced);
    expect(await advanceMigration(kv, T0 + 2 * MINUTE)).toEqual(advanced);
    expect(kv.data.get(MIGRATE_KEY)).toEqual(advanced);
  });

  it('advances nothing when there is no note or it expired, and removes the expired one', async () => {
    const kv = memory();
    expect(await advanceMigration(kv, T0)).toBeUndefined();
    expect(kv.data.has(MIGRATE_KEY)).toBe(false);
    await recordMigration(kv, FULL);
    expect(await advanceMigration(kv, T0 + 31 * MINUTE)).toBeUndefined();
    expect(kv.data.has(MIGRATE_KEY)).toBe(false);
  });

  it('is cleared on request', async () => {
    const kv = memory();
    await recordMigration(kv, FULL);
    await clearMigration(kv);
    expect(kv.data.has(MIGRATE_KEY)).toBe(false);
    await clearMigration(kv);
    expect(kv.data.has(MIGRATE_KEY)).toBe(false);
  });
});

describe('nextOnPicker', () => {
  it('sends the picker on to Symphony Setup\'s preselected page when SymphonyBoard has just been installed', () => {
    expect(nextOnPicker(FULL)).toEqual({ kind: 'go', href: PRESELECTED });
    expect(nextOnPicker(FULL)).toEqual({ kind: 'go', href: setupInstallUrl(migrationTarget(FULL)) });
    // the same step the form took before the chain was made on GitHub's side, so the two agree
    expect(nextOnPicker(FULL)).toEqual(nextOnForm(FULL, LANDING));
    // a note without ids has no preselected page: the plain page with the state, which GitHub carries on to the form
    expect(nextOnPicker({ owner: 'octo-org', name: 'widgets', step: 'board', at: T0 })).toEqual({ kind: 'go', href: `${SETUP_INSTALL_URL}?state=octo-org%2Fwidgets` });
  });

  it('steps in on the permissions page too when it arrived without the repository, and leaves the preselected page alone', () => {
    // GitHub's own query on the page the first install lands on: nothing about a repository
    expect(nextOnPicker(FULL, '?installation_id=70&setup_action=install&state=octo-org%2Fwidgets')).toEqual({ kind: 'go', href: PRESELECTED });
    expect(nextOnPicker(FULL, '?target_id=98765')).toEqual({ kind: 'go', href: PRESELECTED });
    // the preselected page itself, as GitHub writes it and as the extension writes it
    expect(nextOnPicker(FULL, '?target_id=98765&suggested_target_id=98765&repository_ids%5B%5D=555001&state=octo-org%2Fwidgets')).toEqual({ kind: 'nothing' });
    expect(nextOnPicker(FULL, '?repository_ids[]=555001')).toEqual({ kind: 'nothing' });
  });

  it('does nothing without a note, or once the note is past the first install', () => {
    expect(nextOnPicker(undefined)).toEqual({ kind: 'nothing' });
    expect(nextOnPicker({ ...FULL, step: 'setup' })).toEqual({ kind: 'nothing' });
    expect(nextOnPicker({ owner: 'o', name: 'n', step: 'setup', at: T0 })).toEqual({ kind: 'nothing' });
  });

  it('cannot loop: the content script advances the note before it goes, and a second landing on the picker finds step setup', async () => {
    const kv = memory();
    await recordMigration(kv, FULL);
    expect(nextOnPicker(await readMigration(kv, T0 + MINUTE))).toEqual({ kind: 'go', href: PRESELECTED });
    await advanceMigration(kv, T0 + MINUTE);
    // GitHub sends the person back to the picker, or the preselected page loads again: nothing happens
    expect(nextOnPicker(await readMigration(kv, T0 + 2 * MINUTE))).toEqual({ kind: 'nothing' });
    expect(nextOnPicker(await readMigration(kv, T0 + 3 * MINUTE))).toEqual({ kind: 'nothing' });
    // and the form, reached after the second install, still ends the chain, or adds the state first
    expect(nextOnForm(await readMigration(kv, T0 + 4 * MINUTE), `${LANDING}&state=octo-org%2Fwidgets`)).toEqual({ kind: 'done' });
    expect(nextOnForm(await readMigration(kv, T0 + 4 * MINUTE), LANDING)).toEqual({ kind: 'add-state', href: `${FORM_PAGE_URL}${LANDING}&state=octo-org%2Fwidgets` });
  });

  it('is the fallback\'s twin: an installation that lands on the form instead of the picker takes the same step there', async () => {
    const kv = memory();
    await recordMigration(kv, FULL);
    expect(nextOnForm(await readMigration(kv, T0 + MINUTE), LANDING)).toEqual({ kind: 'go', href: PRESELECTED });
    await advanceMigration(kv, T0 + MINUTE);
    expect(nextOnPicker(await readMigration(kv, T0 + 2 * MINUTE))).toEqual({ kind: 'nothing' });
  });
});

describe('nextOnForm', () => {
  const landing = LANDING;

  it('does nothing without a note, or on a form page nobody was sent to by an install', () => {
    expect(nextOnForm(undefined, landing)).toEqual({ kind: 'nothing' });
    expect(nextOnForm(undefined, '')).toEqual({ kind: 'nothing' });
    expect(nextOnForm(FULL, '?template=adopt.yml')).toEqual({ kind: 'nothing' });
    expect(nextOnForm(FULL, '')).toEqual({ kind: 'nothing' });
    expect(nextOnForm(FULL, '?installation_id=')).toEqual({ kind: 'nothing' });
    expect(nextOnForm({ ...FULL, step: 'setup' }, '?template=adopt.yml&state=octo-org%2Fwidgets')).toEqual({ kind: 'nothing' });
  });

  it('goes on to Symphony Setup\'s install page, for the same target, when SymphonyBoard has just been installed', () => {
    const expected = `${SETUP_INSTALL_URL}/permissions?target_id=98765&suggested_target_id=98765&repository_ids[]=555001&state=octo-org%2Fwidgets`;
    expect(nextOnForm(FULL, landing)).toEqual({ kind: 'go', href: expected });
    expect(nextOnForm(FULL, landing)).toEqual({ kind: 'go', href: setupInstallUrl(migrationTarget(FULL)) });
    // whether or not GitHub handed the state back this time
    expect(nextOnForm(FULL, `${landing}&state=octo-org%2Fwidgets`)).toEqual({ kind: 'go', href: expected });
    // a note without ids goes to the plain page with the state
    expect(nextOnForm({ owner: 'octo-org', name: 'widgets', step: 'board', at: T0 }, landing)).toEqual({ kind: 'go', href: `${SETUP_INSTALL_URL}?state=octo-org%2Fwidgets` });
  });

  it('adds the repository to the form\'s address when the second install came back without it', () => {
    const note: Migration = { ...FULL, step: 'setup' };
    expect(nextOnForm(note, landing)).toEqual({ kind: 'add-state', href: `${FORM_PAGE_URL}${landing}&state=octo-org%2Fwidgets` });
    expect(nextOnForm(note, '?installation_id=7')).toEqual({ kind: 'add-state', href: `${FORM_PAGE_URL}?installation_id=7&state=octo-org%2Fwidgets` });
    // an empty state is no state
    expect(nextOnForm(note, '?installation_id=7&state=')).toEqual({ kind: 'add-state', href: `${FORM_PAGE_URL}?installation_id=7&state=octo-org%2Fwidgets` });
  });

  it('is done when the second install came back with the repository', () => {
    const note: Migration = { ...FULL, step: 'setup' };
    expect(nextOnForm(note, `${landing}&state=octo-org%2Fwidgets`)).toEqual({ kind: 'done' });
    expect(nextOnForm(note, '?installation_id=7&state=octo-org/widgets')).toEqual({ kind: 'done' });
  });
});
