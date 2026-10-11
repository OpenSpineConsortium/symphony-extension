// Every name Symphony shows or links to, in one place. The repositories and the GitHub Apps are being
// renamed, so nothing else in the source spells a slug, a repository or an address: the content script,
// the popup, the manifest, the tests and the store documents read them from here, and a rename is one
// edit in this file. The hygiene test (test/hygiene.test.ts) holds the rest of the source to that.

/** the product's name, as the manifest, the buttons and the popup say it */
export const PRODUCT_NAME = 'Symphony';

/** who makes it: Gregory Schwing, trading as OpenSpineConsortium */
export const VENDOR = 'OpenSpineConsortium';

/** the GitHub App that adopts a repository, by its slug on github.com */
export const APP_SLUG = 'symphonyboard';

/** the second, setup-only App, which applies the repository's settings for one run and is uninstalled after */
export const SETUP_APP_SLUG = 'symphony-setup';

/** the front door repository, whose issue form starts the adoption */
export const FRONT_DOOR_REPO = 'OpenSpineConsortium/symphony-start';

/** the front door's new-issue page, and the form on it: the page Symphony Setup's Setup URL sends an installer to */
export const FORM_PAGE_URL = `https://github.com/${FRONT_DOOR_REPO}/issues/new`;
export const FORM_URL = `${FORM_PAGE_URL}?template=adopt.yml`;

/** the product's site and its privacy page */
export const SITE_URL = 'https://openspineconsortium.com/symphony/';
export const PRIVACY_URL = `${SITE_URL}privacy.html`;

/** GitHub's own pages for installing the two Apps: the first is what the two buttons open, the second what follows it (it is also SymphonyBoard's Setup URL, so GitHub itself sends an installer on to it) */
export const INSTALL_URL = `https://github.com/apps/${APP_SLUG}/installations/new`;
export const SETUP_INSTALL_URL = `https://github.com/apps/${SETUP_APP_SLUG}/installations/new`;

/** GitHub's new-repository page, which the popup's first link opens */
export const NEW_REPO_URL = 'https://github.com/new';

/** the one host the content script runs on; nothing of the extension runs anywhere else */
export const GITHUB_ORIGIN = 'https://github.com';

/**
 * The repository topic an adopted repository carries: the adoption run sets it, and a person can set
 * it by hand under Manage topics. GitHub shows a topic in the repository page's About sidebar as a
 * link to /topics/<topic>, which is the one sign the extension reads to tell an adopted repository
 * from one still to migrate (core/adopted.ts); it asks GitHub's API for nothing.
 */
export const TOPIC = 'symphony';

/** the board the claim protocol keeps on the branch `board` of an adopted repository, which the ready button opens */
export function boardUrl(owner: string, name: string): string {
  return `${GITHUB_ORIGIN}/${owner}/${name}/blob/board/STATE.md`;
}

/** the words on the page: the two buttons (the header's in both its states), the two banners and the popup, so a test can look for them */
export const WORDS = {
  createButton: 'Create Symphony repository',
  migrateButton: 'Migrate to Symphony',
  readyButton: 'Ready for Symphony',
  bannerTitle: 'Finish setting up Symphony',
  bannerBody: 'Install the two Symphony Apps on this repository, one page each: a pull request with the template or the claim protocol lands within about two minutes.',
  bannerInstall: 'Install the Symphony Apps',
  bannerSite: 'What Symphony sets up',
  settingsTitle: 'SymphonyBoard is installed here already',
  settingsBody: "To finish, install Symphony Setup on the repository too: it applies the repository's settings for one run, uninstalls itself, and brings you to the form with the repository filled in.",
  settingsInstall: 'Install Symphony Setup',
  dismiss: 'Dismiss',
  popupWhat: 'Symphony sets up a team of Claude Code AI teammates on a GitHub repository: install its App, press Create on the form it sends you to, and a pull request lands with everything they need.',
  popupHow: 'On github.com this extension adds one button to the new-repository page and one to every repository header, so the flow starts where you already are.',
  popupThen: 'Once the pull request lands, review and merge it; nothing else is installed and nothing leaves your browser.',
  popupCreate: 'Create a Symphony repository',
  popupForm: 'Open the form',
  popupSite: 'About Symphony',
  trademark: "Symphony is not a GitHub or Anthropic product. 'GitHub' is GitHub's mark; 'Claude' and 'Claude Code' are Anthropic's marks, used here to say what Symphony works with.",
} as const;
