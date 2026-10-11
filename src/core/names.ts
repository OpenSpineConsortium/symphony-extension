// Every name Symphony shows or links to, in one place. The repositories and the GitHub Apps are being
// renamed, so nothing else in the source spells a slug, a repository or an address: the content script,
// the popup, the manifest, the tests and the store documents read them from here, and a rename is one
// edit in this file. The hygiene test (test/hygiene.test.ts) holds the rest of the source to that.

/** the product's name, as the manifest, the buttons and the popup say it */
export const PRODUCT_NAME = 'Symphony';

/** who makes it: Gregory Schwing, trading as OpenSpineConsortium */
export const VENDOR = 'OpenSpineConsortium';

/** the GitHub App that adopts a repository, by its slug on github.com */
export const APP_SLUG = 'openspine-symphony';

/** the second, setup-only App, which applies the repository's settings for one run and is uninstalled after */
export const SETUP_APP_SLUG = 'openspine-symphony-setup';

/** the front door repository, whose issue form starts the adoption */
export const FRONT_DOOR_REPO = 'OpenSpineConsortium/symphony-start';

/** the form on the front door, the page the App's Setup URL sends an installer to */
export const FORM_URL = `https://github.com/${FRONT_DOOR_REPO}/issues/new?template=adopt.yml`;

/** the product's site and its privacy page */
export const SITE_URL = 'https://openspineconsortium.com/symphony/';
export const PRIVACY_URL = `${SITE_URL}privacy.html`;

/** GitHub's own page for installing the App; the one the two buttons open */
export const INSTALL_URL = `https://github.com/apps/${APP_SLUG}/installations/new`;
export const SETUP_INSTALL_URL = `https://github.com/apps/${SETUP_APP_SLUG}/installations/new`;

/** GitHub's new-repository page, which the popup's first link opens */
export const NEW_REPO_URL = 'https://github.com/new';

/** the one host the content script runs on; nothing of the extension runs anywhere else */
export const GITHUB_ORIGIN = 'https://github.com';

/** the words on the page: the two buttons, the banner and the popup, so a test can look for them */
export const WORDS = {
  createButton: 'Create Symphony repository',
  migrateButton: 'Migrate to Symphony',
  bannerTitle: 'Finish setting up Symphony',
  bannerBody: 'Install the Symphony App on this repository: a pull request with the template or the claim protocol lands within about two minutes.',
  bannerInstall: 'Install the Symphony App',
  bannerSite: 'What Symphony sets up',
  dismiss: 'Dismiss',
  popupWhat: 'Symphony sets up a team of Claude Code AI teammates on a GitHub repository: install its App, press Create on the form it sends you to, and a pull request lands with everything they need.',
  popupHow: 'On github.com this extension adds one button to the new-repository page and one to every repository header, so the flow starts where you already are.',
  popupThen: 'Once the pull request lands, review and merge it; nothing else is installed and nothing leaves your browser.',
  popupCreate: 'Create a Symphony repository',
  popupForm: 'Open the form',
  popupSite: 'About Symphony',
  trademark: "Symphony is not a GitHub or Anthropic product. 'GitHub' is GitHub's mark; 'Claude' and 'Claude Code' are Anthropic's marks, used here to say what Symphony works with.",
} as const;
