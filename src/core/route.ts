// Which github.com page the content script is on, from the URL alone. The script runs on every
// github.com page (one match pattern, one host), so it must first decide whether the page is one of
// the three it touches; everything else is left exactly as GitHub drew it.

export type Route =
  | { kind: 'new-repository' }
  | { kind: 'repository'; owner: string; name: string }
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

export function classify(pathname: string): Route {
  const segments = pathname.split('/').filter((s) => s.length > 0);
  if (isNewRepositoryPage(segments)) return { kind: 'new-repository' };
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
