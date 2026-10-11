// The addresses the buttons open: GitHub's own pages for installing the two Apps, SymphonyBoard first
// and Symphony Setup after it. With the owner's numeric id the page skips its account picker
// (.../installations/new/permissions?target_id=<id>&suggested_target_id=<id>: target_id is what
// GitHub's own buttons send, suggested_target_id what its documentation names, so both go); with the
// repository's id as well, that one repository is preselected instead of "All repositories", which is
// what an install from a plain link lands on and what, on 2026-10-11, adopted eight repositories at
// once. The repository's owner/name travels as the link's state, which GitHub hands back on the App's
// Setup URL after the install, where the front door's form reads it into its Repository field. The
// ids are read from the meta tags GitHub prints on a repository page for its own analytics; when they
// are missing or do not describe the page's repository, the plain page is used, which asks instead.
// Nothing here calls GitHub's API, and nothing but digits and a well-formed owner/name goes into an
// address.
import { INSTALL_URL, SETUP_INSTALL_URL } from './names';

/** digits only: anything else is not a GitHub id and is not put in a URL */
const GITHUB_ID = /^[0-9]{1,20}$/;

/** owner/name, each a GitHub name: letters, digits, dots, hyphens and underscores */
const REPOSITORY = /^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;

export interface Target {
  /** the owner's account id, from the page */
  ownerId?: string;
  /** the repository's id, from the page; preselects it on the install page */
  repositoryId?: string;
  /** OWNER/NAME, which rides along as the link's state and comes back to the form */
  repository?: string;
}

/** SymphonyBoard's install page, for the target when one is known */
export function installUrl(target?: Target): string {
  return addressOf(INSTALL_URL, target);
}

/** Symphony Setup's install page, the second step, for the same target */
export function setupInstallUrl(target?: Target): string {
  return addressOf(SETUP_INSTALL_URL, target);
}

function addressOf(base: string, target?: Target): string {
  const repository = target?.repository;
  const state = repository && REPOSITORY.test(repository) ? `state=${encodeURIComponent(repository)}` : undefined;
  const ownerId = target?.ownerId;
  if (!ownerId || !GITHUB_ID.test(ownerId)) return state ? `${base}?${state}` : base;
  let address = `${base}/permissions?target_id=${ownerId}&suggested_target_id=${ownerId}`;
  const repositoryId = target?.repositoryId;
  if (repositoryId && GITHUB_ID.test(repositoryId)) address += `&repository_ids[]=${repositoryId}`;
  if (state) address += `&${state}`;
  return address;
}

/** a document's <meta name="..."> content, or undefined */
export function meta(doc: Document, name: string): string | undefined {
  const el = doc.querySelector(`meta[name="${name}"]`);
  const content = el?.getAttribute('content')?.trim();
  return content ? content : undefined;
}

/**
 * The repository owner's account id from the page, if the page says it. GitHub's repository pages
 * carry octolytics-dimension-user_id and octolytics-dimension-user_login for the repository's owner
 * (the viewer is octolytics-actor-id, never used here). The id is trusted only when the login beside
 * it is the owner in the URL, so that a page whose tags describe something else never pre-selects
 * the wrong account; a page with the id and no login is taken at its word.
 */
export function ownerIdFromPage(doc: Document, owner: string): string | undefined {
  const id = meta(doc, 'octolytics-dimension-user_id');
  if (!id || !GITHUB_ID.test(id)) return undefined;
  const login = meta(doc, 'octolytics-dimension-user_login');
  if (login && login.toLowerCase() !== owner.toLowerCase()) return undefined;
  return id;
}

/**
 * The repository's id from the page, the same way: octolytics-dimension-repository_id, trusted only
 * when octolytics-dimension-repository_nwo (owner/name), if present, is the repository in the URL,
 * compared as GitHub compares names, without regard to case.
 */
export function repositoryIdFromPage(doc: Document, owner: string, name: string): string | undefined {
  const id = meta(doc, 'octolytics-dimension-repository_id');
  if (!id || !GITHUB_ID.test(id)) return undefined;
  const nwo = meta(doc, 'octolytics-dimension-repository_nwo');
  if (nwo && nwo.toLowerCase() !== `${owner}/${name}`.toLowerCase()) return undefined;
  return id;
}
