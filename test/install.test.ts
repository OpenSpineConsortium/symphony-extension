// The install pages' addresses: the plain page, or the permissions page with the owner's account and
// the repository preselected when the repository page says their ids, and the repository's owner/name
// as the link's state, which GitHub hands back to the form. Nothing but digits and a well-formed
// owner/name ever reaches an address.
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { installUrl, ownerIdFromPage, repositoryIdFromPage, setupInstallUrl } from '../src/core/install';
import { APP_SLUG, INSTALL_URL, SETUP_APP_SLUG, SETUP_INSTALL_URL } from '../src/core/names';

const doc = (html: string): Document => parseHTML(html).document as unknown as Document;
const REPO = new URL('./fixtures/repo.html', import.meta.url);
const head = (tags: string): Document => doc(`<html><head>${tags}</head><body></body></html>`);

describe('installUrl and setupInstallUrl', () => {
  it('are GitHub\'s install pages for the two Apps', () => {
    expect(INSTALL_URL).toBe(`https://github.com/apps/${APP_SLUG}/installations/new`);
    expect(SETUP_INSTALL_URL).toBe(`https://github.com/apps/${SETUP_APP_SLUG}/installations/new`);
    expect(installUrl()).toBe(INSTALL_URL);
    expect(setupInstallUrl()).toBe(SETUP_INSTALL_URL);
    expect(installUrl({})).toBe(INSTALL_URL);
  });

  it('preselect the account with target_id and suggested_target_id when the owner\'s id is known', () => {
    expect(installUrl({ ownerId: '98765' })).toBe(`${INSTALL_URL}/permissions?target_id=98765&suggested_target_id=98765`);
    expect(setupInstallUrl({ ownerId: '98765' })).toBe(`${SETUP_INSTALL_URL}/permissions?target_id=98765&suggested_target_id=98765`);
  });

  it('preselect the one repository too, and carry its owner/name as the state', () => {
    const full = { ownerId: '98765', repositoryId: '555001', repository: 'octo-org/widgets' };
    expect(installUrl(full)).toBe(`${INSTALL_URL}/permissions?target_id=98765&suggested_target_id=98765&repository_ids[]=555001&state=octo-org%2Fwidgets`);
    expect(setupInstallUrl(full)).toBe(`${SETUP_INSTALL_URL}/permissions?target_id=98765&suggested_target_id=98765&repository_ids[]=555001&state=octo-org%2Fwidgets`);
    expect(installUrl({ ownerId: '98765', repositoryId: '555001' })).toBe(`${INSTALL_URL}/permissions?target_id=98765&suggested_target_id=98765&repository_ids[]=555001`);
    expect(installUrl({ ownerId: '98765', repository: 'octo-org/widgets' })).toBe(`${INSTALL_URL}/permissions?target_id=98765&suggested_target_id=98765&state=octo-org%2Fwidgets`);
  });

  it('give the plain page with the state alone when the owner\'s id is not known', () => {
    expect(installUrl({ repository: 'octo-org/widgets' })).toBe(`${INSTALL_URL}?state=octo-org%2Fwidgets`);
    expect(setupInstallUrl({ repository: 'Octo-Org/my.repo_1' })).toBe(`${SETUP_INSTALL_URL}?state=Octo-Org%2Fmy.repo_1`);
    // a repository id without the owner's id has no page to go on: the permissions page needs the account
    expect(installUrl({ repositoryId: '555001', repository: 'octo-org/widgets' })).toBe(`${INSTALL_URL}?state=octo-org%2Fwidgets`);
  });

  it('put nothing but digits in the ids', () => {
    for (const bad of ['', '98765&evil=1', 'octo-org', ' 98765', '98765 ', '1e5', '-1']) {
      expect(installUrl({ ownerId: bad }), bad).toBe(INSTALL_URL);
      expect(installUrl({ ownerId: '98765', repositoryId: bad }), bad).toBe(`${INSTALL_URL}/permissions?target_id=98765&suggested_target_id=98765`);
    }
  });

  it('leave a state out that is not an owner/name', () => {
    for (const bad of ['', 'widgets', 'octo-org/', '/widgets', 'a/b/c', 'octo-org/widgets&evil=1', '-bad/widgets', 'octo org/widgets', 'octo-org/wid gets']) {
      expect(installUrl({ repository: bad }), bad).toBe(INSTALL_URL);
      expect(installUrl({ ownerId: '98765', repository: bad }), bad).toBe(`${INSTALL_URL}/permissions?target_id=98765&suggested_target_id=98765`);
    }
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
    expect(ownerIdFromPage(head(''), 'octo-org')).toBeUndefined();
    expect(ownerIdFromPage(head('<meta name="octolytics-dimension-user_id" content="abc">'), 'octo-org')).toBeUndefined();
  });

  it('takes an id that comes with no login at its word', () => {
    expect(ownerIdFromPage(head('<meta name="octolytics-dimension-user_id" content="42">'), 'octo-org')).toBe('42');
  });
});

describe('repositoryIdFromPage', () => {
  it('reads the repository\'s id from the fixture\'s meta tags, whatever the case of the name', () => {
    const d = doc(readFileSync(REPO, 'utf8'));
    expect(repositoryIdFromPage(d, 'octo-org', 'widgets')).toBe('555001');
    expect(repositoryIdFromPage(d, 'Octo-Org', 'WIDGETS')).toBe('555001');
  });

  it('gives no id when the nwo tag names another repository, or there is no id, or a non-numeric one', () => {
    const d = doc(readFileSync(REPO, 'utf8'));
    expect(repositoryIdFromPage(d, 'octo-org', 'gadgets')).toBeUndefined();
    expect(repositoryIdFromPage(d, 'someone-else', 'widgets')).toBeUndefined();
    expect(repositoryIdFromPage(head(''), 'octo-org', 'widgets')).toBeUndefined();
    expect(repositoryIdFromPage(head('<meta name="octolytics-dimension-repository_id" content="555001x">'), 'octo-org', 'widgets')).toBeUndefined();
  });

  it('takes an id that comes with no nwo at its word', () => {
    expect(repositoryIdFromPage(head('<meta name="octolytics-dimension-repository_id" content="7">'), 'octo-org', 'widgets')).toBe('7');
  });
});
