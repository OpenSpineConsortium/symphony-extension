// Which pages the content script touches: the two new-repository pages, a repository's main page, and
// nothing else. The reserved list matters most: a GitHub page of two segments that is not a repository
// (the user's own settings, an organization's page) must never get a button.
import { describe, expect, it } from 'vitest';
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

  it('leaves every other page alone', () => {
    for (const path of [
      '/',
      '/settings/profile',
      '/settings/installations',
      '/orgs/octo-org',
      '/organizations/octo-org/settings/profile',
      '/octo-org',
      '/octo-org/widgets/settings',
      '/octo-org/widgets/issues',
      '/octo-org/widgets/pulls/1',
      '/notifications/beta',
      '/marketplace/actions',
      '/apps/symphony-dev',
      '/login/oauth',
      '/explore/trending',
      '/search?q=x',
      '/-/bad',
    ]) {
      expect(classify(path), path).toEqual({ kind: 'other' });
    }
  });
});
