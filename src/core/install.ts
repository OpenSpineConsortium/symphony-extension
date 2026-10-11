// The address the two buttons open: GitHub's own page for installing the App. With the owner's
// numeric id the page skips its account picker (.../installations/new/permissions?target_id=<id>);
// without one it shows the picker, which is the same flow one click longer. The id is read from the
// meta tags GitHub prints on a repository page for its own analytics; when they are missing or do
// not describe the page's owner, the plain install page is used. Nothing here calls GitHub's API.
import { INSTALL_URL } from './names';

/** digits only: anything else is not an account id and is not put in a URL */
const ACCOUNT_ID = /^[0-9]{1,20}$/;

export function installUrl(targetId?: string): string {
  if (targetId && ACCOUNT_ID.test(targetId)) return `${INSTALL_URL}/permissions?target_id=${targetId}`;
  return INSTALL_URL;
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
  if (!id || !ACCOUNT_ID.test(id)) return undefined;
  const login = meta(doc, 'octolytics-dimension-user_login');
  if (login && login.toLowerCase() !== owner.toLowerCase()) return undefined;
  return id;
}
