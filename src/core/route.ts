// Which github.com page the content script is on, from the URL alone. The script runs on every
// github.com page (one match pattern, one host), so it must first decide whether the page is one of
// the six it touches; everything else is left exactly as GitHub drew it.
import { FRONT_DOOR_REPO, SETUP_APP_SLUG } from './names';

export type Route =
  | { kind: 'new-repository' }
  | { kind: 'repository'; owner: string; name: string }
  /** the front door's new-issue page, where Symphony Setup's Setup URL lands an installer (and SymphonyBoard's, where it still names the form) */
  | { kind: 'front-door-form' }
  /** one installation's settings page, where GitHub lands an install of an App an account has already */
  | { kind: 'installation-settings' }
  /** Symphony Setup's account-picker page, where SymphonyBoard's Setup URL lands an installer */
  | { kind: 'setup-app-picker' }
  /** the same App's permissions page, where GitHub goes straight for an account with no organization to choose, and where the picker is sent on to */
  | { kind: 'setup-app-permissions' }
  | { kind: 'other' };

/**
 * First path segments that are GitHub's own pages, not an account: /settings/..., /orgs/..., and so
 * on. A two-segment path under one of these (for example /settings/profile or /orgs/foo) is not a
 * repository, and the user's own settings pages are never touched. The list is deliberately long;
 * a page wrongly read as a repository would get a button it should not have.
 */
const RESERVED = new Set([
  'about', 'account', 'apps', 'codespaces', 'collections', 'contact', 'customer-stories', 'dashboard',
  'discussions', 'enterprise', 'events', 'explore', 'features', 'issues', 'join', 'login', 'logout',
  'marketplace', 'new', 'notifications', 'organizations', 'orgs', 'pricing', 'pulls', 'readme', 'search',
  'security', 'sessions', 'settings', 'signup', 'site', 'sponsors', 'stars', 'team', 'topics', 'trending',
  'users', 'watching',
]);

/** a GitHub owner or repository name: letters, digits, dots, hyphens and underscores */
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** an installation's number in its settings page's address: digits only */
const DIGITS = /^[0-9]+$/;

export function classify(pathname: string): Route {
  const segments = pathname.split('/').filter((s) => s.length > 0);
  if (isNewRepositoryPage(segments)) return { kind: 'new-repository' };
  if (isFrontDoorForm(segments)) return { kind: 'front-door-form' };
  if (isInstallationSettings(segments)) return { kind: 'installation-settings' };
  if (isSetupAppPicker(segments)) return { kind: 'setup-app-picker' };
  if (isSetupAppPermissions(segments)) return { kind: 'setup-app-permissions' };
  if (segments.length !== 2) return { kind: 'other' };
  const [owner, raw] = segments as [string, string];
  // GitHub serves /owner/name.git nowhere, but a pasted clone address can land on it; strip to be safe
  const name = raw.endsWith('.git') ? raw.slice(0, -4) : raw;
  if (RESERVED.has(owner.toLowerCase()) || !NAME.test(owner) || !NAME.test(name)) return { kind: 'other' };
  return { kind: 'repository', owner, name };
}

/** /new, and an organization's /organizations/<org>/repositories/new */
function isNewRepositoryPage(segments: string[]): boolean {
  if (segments.length === 1 && segments[0] === 'new') return true;
  return segments.length === 4 && segments[0] === 'organizations' && segments[2] === 'repositories' && segments[3] === 'new';
}

/** /<front door>/issues/new, the repository compared as GitHub does, without regard to case */
function isFrontDoorForm(segments: string[]): boolean {
  if (segments.length !== 4 || segments[2] !== 'issues' || segments[3] !== 'new') return false;
  return `${segments[0]}/${segments[1]}`.toLowerCase() === FRONT_DOOR_REPO.toLowerCase();
}

/** /settings/installations/<number>, and an organization's /organizations/<org>/settings/installations/<number>; the list page is neither */
function isInstallationSettings(segments: string[]): boolean {
  if (segments.length === 3) return segments[0] === 'settings' && segments[1] === 'installations' && DIGITS.test(segments[2]!);
  if (segments.length !== 5) return false;
  return segments[0] === 'organizations' && NAME.test(segments[1]!) && segments[2] === 'settings' && segments[3] === 'installations' && DIGITS.test(segments[4]!);
}

/**
 * /apps/<setup app>/installations/new, the slug compared as GitHub does, without regard to case, and
 * that page alone: the preselected page under it (/permissions) is where the picker is sent on to, so
 * reading it as the picker would send it on to itself; SymphonyBoard's picker and the App's own page
 * are nothing to the extension.
 */
function isSetupAppPicker(segments: string[]): boolean {
  if (segments.length !== 4 || segments[0] !== 'apps' || segments[2] !== 'installations' || segments[3] !== 'new') return false;
  return segments[1]!.toLowerCase() === SETUP_APP_SLUG.toLowerCase();
}

/**
 * /apps/<setup slug>/installations/new/permissions: GitHub skips the picker and lands here when the
 * account has no organization to choose, and the picker is sent on to this page too; whether it
 * still needs the repository is in its query (core/migrate.ts), not in its path.
 */
function isSetupAppPermissions(segments: string[]): boolean {
  if (segments.length !== 5 || segments[4] !== 'permissions') return false;
  return isSetupAppPicker(segments.slice(0, 4));
}
