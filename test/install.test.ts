// The install page's address: the plain page, or the permissions page with the owner's account id
// pre-selected when the repository page says the id and it belongs to the owner in the URL.
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { installUrl, ownerIdFromPage } from '../src/core/install';
import { APP_SLUG, INSTALL_URL } from '../src/core/names';

const doc = (html: string): Document => parseHTML(html).document as unknown as Document;
const REPO = new URL('./fixtures/repo.html', import.meta.url);

describe('installUrl', () => {
  it('is GitHub\'s install page for the App, with target_id when an id is given', () => {
    expect(INSTALL_URL).toBe(`https://github.com/apps/${APP_SLUG}/installations/new`);
    expect(installUrl()).toBe(INSTALL_URL);
    expect(installUrl('98765')).toBe(`${INSTALL_URL}/permissions?target_id=98765`);
  });

  it('puts nothing but digits in the address', () => {
    expect(installUrl('')).toBe(INSTALL_URL);
    expect(installUrl('98765&evil=1')).toBe(INSTALL_URL);
    expect(installUrl('octo-org')).toBe(INSTALL_URL);
  });
});

describe('ownerIdFromPage', () => {
  it('reads the owner\'s id from the repository page\'s meta tags', () => {
    const d = doc(readFileSync(REPO, 'utf8'));
    expect(ownerIdFromPage(d, 'octo-org')).toBe('98765');
    expect(ownerIdFromPage(d, 'OCTO-ORG')).toBe('98765');
  });

  it('gives no id when the tags name another login, or no id, or a non-numeric one', () => {
    const d = doc(readFileSync(REPO, 'utf8'));
    expect(ownerIdFromPage(d, 'someone-else')).toBeUndefined();
    expect(ownerIdFromPage(doc('<html><head></head><body></body></html>'), 'octo-org')).toBeUndefined();
    expect(ownerIdFromPage(doc('<html><head><meta name="octolytics-dimension-user_id" content="abc"></head></html>'), 'octo-org')).toBeUndefined();
  });

  it('takes an id that comes with no login at its word', () => {
    expect(ownerIdFromPage(doc('<html><head><meta name="octolytics-dimension-user_id" content="42"></head></html>'), 'octo-org')).toBe('42');
  });
});
