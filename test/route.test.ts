// Which pages the content script touches: the two new-repository pages, a repository's main page, the
// front door's form page, an installation's settings page, Symphony Setup's account-picker page, and
// nothing else. The reserved list matters most: a GitHub page of two segments that is not a repository
// (the user's own settings, an organization's page) must never get a button; and the picker must be
// that one page, since the page it is sent on to lies under it.
import { describe, expect, it } from 'vitest';
import { APP_SLUG, FRONT_DOOR_REPO, SETUP_APP_SLUG } from '../src/core/names';
import { classify } from '../src/core/route';

describe('classify', () => {
  it('knows the two new-repository pages', () => {
    expect(classify('/new')).toEqual({ kind: 'new-repository' });
    expect(classify('/new/')).toEqual({ kind: 'new-repository' });
    expect(classify('/organizations/octo-org/repositories/new')).toEqual({ kind: 'new-repository' });
  });

  it('knows a repository main page by owner and name', () => {
    expect(classify('/octo-org/widgets')).toEqual({ kind: 'repository', owner: 'octo-org', name: 'widgets' });
    expect(classify('/octo-org/widgets/')).toEqual({ kind: 'repository', owner: 'octo-org', name: 'widgets' });
    expect(classify('/Octo-Org/my.repo_1.git')).toEqual({ kind: 'repository', owner: 'Octo-Org', name: 'my.repo_1' });
  });

  it('knows the front door\'s form page, whatever the case, with or without a trailing slash', () => {
    expect(classify(`/${FRONT_DOOR_REPO}/issues/new`)).toEqual({ kind: 'front-door-form' });
    expect(classify(`/${FRONT_DOOR_REPO}/issues/new/`)).toEqual({ kind: 'front-door-form' });
    expect(classify(`/${FRONT_DOOR_REPO.toUpperCase()}/issues/new`)).toEqual({ kind: 'front-door-form' });
    expect(classify(`/${FRONT_DOOR_REPO}/issues/new/x`)).toEqual({ kind: 'other' });
    expect(classify(`/${FRONT_DOOR_REPO}/issues`)).toEqual({ kind: 'other' });
  });

  it('knows an installation\'s settings page, a person\'s and an organization\'s, and not the list', () => {
    expect(classify('/settings/installations/12345')).toEqual({ kind: 'installation-settings' });
    expect(classify('/settings/installations/12345/')).toEqual({ kind: 'installation-settings' });
    expect(classify('/organizations/octo-org/settings/installations/12345')).toEqual({ kind: 'installation-settings' });
    for (const path of [
      '/settings/installations',
      '/settings/installations/',
      '/settings/installations/abc',
      '/settings/installations/12345/permissions',
      '/organizations/octo-org/settings/installations',
      '/organizations/octo-org/settings/installations/abc',
      '/organizations/-bad/settings/installations/12345',
      '/organizations/settings/installations/12345',
    ]) {
      expect(classify(path), path).toEqual({ kind: 'other' });
    }
  });

  it('knows Symphony Setup\'s account-picker page, where SymphonyBoard\'s install lands, whatever the case of the slug', () => {
    expect(classify(`/apps/${SETUP_APP_SLUG}/installations/new`)).toEqual({ kind: 'setup-app-picker' });
    expect(classify(`/apps/${SETUP_APP_SLUG}/installations/new/`)).toEqual({ kind: 'setup-app-picker' });
    expect(classify(`/apps/${SETUP_APP_SLUG.toUpperCase()}/installations/new`)).toEqual({ kind: 'setup-app-picker' });
  });

  it('reads neither the preselected page the picker is sent to, nor the App\'s own page, nor SymphonyBoard\'s picker as it', () => {
    for (const path of [
      `/apps/${SETUP_APP_SLUG}/installations/new/permissions`,
      `/apps/${SETUP_APP_SLUG}/installations/new/permissions/`,
      `/apps/${SETUP_APP_SLUG}/installations`,
      `/apps/${SETUP_APP_SLUG}/installations/`,
      `/apps/${SETUP_APP_SLUG}`,
      `/apps/${SETUP_APP_SLUG}/`,
      `/apps/${APP_SLUG}/installations/new`,
      `/apps/${APP_SLUG}/installations/new/permissions`,
      '/apps',
      '/apps/other-app/installations/new',
      `/${SETUP_APP_SLUG}/installations/new`,
      `/apps/${SETUP_APP_SLUG}/installations/new/x`,
    ]) {
      expect(classify(path), path).toEqual({ kind: 'other' });
    }
  });

  it('leaves every other page alone', () => {
    for (const path of [
      '/',
      '/settings/profile',
      '/settings/installations',
      '/octo-org/widgets/issues/new',
      '/orgs/octo-org',
      '/organizations/octo-org/settings/profile',
      '/octo-org',
      '/octo-org/widgets/settings',
      '/octo-org/widgets/issues',
      '/octo-org/widgets/pulls/1',
      '/notifications/beta',
      '/marketplace/actions',
      '/apps/symphonyboard',
      '/login/oauth',
      '/explore/trending',
      '/search?q=x',
      '/-/bad',
    ]) {
      expect(classify(path), path).toEqual({ kind: 'other' });
    }
  });
});
