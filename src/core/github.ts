// What Symphony adds to a github.com page, and how it finds where. Every function takes the document
// as an argument, so the tests run them against saved fixtures (test/fixtures) in linkedom, and every
// one is idempotent: a second run finds its own mark (data-symphony) and does nothing more than
// refresh what the one element already carries.
//
// GitHub changes its markup without notice, so nothing here depends on one class name alone. A
// button is found by what it is (a submit button that says "Create repository", in a form), the
// repository header's action list by its long-standing class and then by what it holds, and the
// styling of what Symphony adds is copied from GitHub's neighbouring button, so the addition wears
// whatever Primer GitHub ships that day. When a landmark is not found, the function returns
// undefined and the page is left exactly as it was: a page without a Symphony button is the fallback,
// never a broken page.
import { WORDS } from './names';

/** the attribute every element Symphony adds carries, so they can be found and removed together */
export const MARK = 'data-symphony';

/** a GitHub login or repository name as typed: letters, digits, dots, hyphens, underscores */
const GITHUB_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export interface CreateForm {
  /** GitHub's own "Create repository" submit button */
  submit: HTMLButtonElement;
  /** the repository name field, when it could be found */
  name?: HTMLInputElement;
  /** the owner selector's visible login, when it could be read */
  owner?: string;
}

const text = (el: Element): string => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

/** every submit button that says "Create repository": the one GitHub's new-repository form ends with */
export function findCreateForm(doc: Document): CreateForm | undefined {
  // tag names rather than instanceof: the tests run this in a document without the browser's globals
  const buttons = Array.from(doc.querySelectorAll<HTMLButtonElement>('button[type="submit"]'));
  const submit = buttons.find((b) => /^create repository$/i.test(text(b)));
  if (!submit) return undefined;
  const scope: ParentNode = submit.closest('form') ?? doc;
  const name = findNameInput(scope) ?? (scope === doc ? undefined : findNameInput(doc));
  const owner = findOwnerLogin(scope) ?? (scope === doc ? undefined : findOwnerLogin(doc));
  return owner ? { submit, name, owner } : { submit, name };
}

/** the name field by its id, its name, its label, then anything that calls itself a repository name */
function findNameInput(scope: ParentNode): HTMLInputElement | undefined {
  const selectors = [
    'input#repository_name',
    'input[name="repository[name]"]',
    'input#repository-name-input',
    'input[aria-label*="repository name" i]',
    'input[id*="repository" i][id*="name" i]',
    'input[name*="repository" i][name*="name" i]',
  ];
  for (const s of selectors) {
    const el = scope.querySelector<HTMLInputElement>(s);
    if (el) return el;
  }
  return undefined;
}

/**
 * The owner the form shows in its owner picker, read from the picker's button text. Best effort: the
 * picker has worn several shapes, so a reading that is not a GitHub login is dropped, and the pending
 * note then matches on the repository name alone (core/pending.ts).
 */
function findOwnerLogin(scope: ParentNode): string | undefined {
  const selectors = [
    '#repository-owner-select summary',
    'summary[aria-label*="owner" i]',
    'button[aria-label*="owner" i]',
    '[data-testid*="owner" i] button',
    '[data-testid*="owner" i] summary',
  ];
  for (const s of selectors) {
    const el = scope.querySelector(s);
    const login = el ? text(el).split(' ').pop() : undefined;
    if (login && GITHUB_NAME.test(login)) return login;
  }
  return undefined;
}

/** on the create button while a press is going through, so a second press and the follow of GitHub's button wait */
const PRESSING = `${MARK}-pressing`;

export interface CreatePress {
  name: string;
  owner?: string;
}

/**
 * The button "Create Symphony repository", right after GitHub's own. It is a plain button (never a
 * submit), dressed in the real button's classes with the primary colouring taken off so GitHub's own
 * stays the primary action. Pressing it hands the typed name to `onPress` (which records the pending
 * note) and then presses GitHub's own button, so GitHub's form does exactly what it always does.
 */
export function injectCreateButton(doc: Document, onPress: (press: CreatePress) => Promise<void>): HTMLButtonElement | undefined {
  const form = findCreateForm(doc);
  const existing = doc.querySelector<HTMLButtonElement>(`button[${MARK}="create"]`);
  if (existing) {
    // GitHub enables its button only once a name is typed and checked, and disables it again while it
    // refuses one; ours follows it, so a press of ours is always a press GitHub will act on
    if (form && !existing.hasAttribute(PRESSING)) existing.disabled = form.submit.disabled;
    return existing;
  }
  if (!form) return undefined;
  const button = doc.createElement('button');
  button.type = 'button';
  button.setAttribute(MARK, 'create');
  dressLike(button, form.submit, 'default');
  button.classList.add('symphony-button', 'symphony-create');
  button.textContent = WORDS.createButton;
  button.disabled = form.submit.disabled;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    // one press: a second one while the note is being written would submit the form twice
    if (button.disabled || button.hasAttribute(PRESSING)) return;
    button.setAttribute(PRESSING, '');
    button.disabled = true;
    // the form as it stands now: GitHub redraws parts of its page, so what was found at injection may be stale
    const now = findCreateForm(doc) ?? form;
    const press: CreatePress = now.owner ? { name: now.name?.value ?? '', owner: now.owner } : { name: now.name?.value ?? '' };
    // whatever happens to the note, GitHub's own button is pressed: the page must keep working
    onPress(press)
      .catch(() => undefined)
      .then(() => {
        const target = findCreateForm(doc)?.submit ?? now.submit;
        target.click();
        // GitHub's page goes on from here; when it does not (its button was disabled, or it refused the
        // name), ours is back in step with its button instead of greyed out for good
        button.removeAttribute(PRESSING);
        button.disabled = (findCreateForm(doc)?.submit ?? target).disabled;
      });
  });
  form.submit.insertAdjacentElement('afterend', button);
  return button;
}

/**
 * The button "Migrate to Symphony" in the repository header's action list, beside Watch, Fork and
 * Star, as one more list item. It is a link that opens the App's install page in a new tab: no script
 * runs on that page and no permission is needed to open it. `onPress`, when given, runs at the click
 * (it records the migrate note) and the link's own action goes on whatever it did; a later call
 * refreshes the address and the handler both, so nothing accumulates on the one link.
 */
export function injectMigrateButton(doc: Document, href: string, onPress?: () => void): HTMLAnchorElement | undefined {
  const existing = doc.querySelector<HTMLAnchorElement>(`a[${MARK}="migrate"]`);
  if (existing) {
    existing.href = href;
    pressWith(existing, onPress);
    return existing;
  }
  const actions = findHeaderActions(doc);
  if (!actions) return undefined;
  const item = doc.createElement('li');
  item.setAttribute(MARK, 'migrate-item');
  const link = doc.createElement('a');
  link.setAttribute(MARK, 'migrate');
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  pressWith(link, onPress);
  const neighbour = actions.querySelector('a.btn, button.btn, a[class*="ButtonBase"], button[class*="ButtonBase"]');
  if (neighbour) dressLike(link, neighbour, 'default');
  else link.className = 'btn btn-sm';
  link.classList.add('symphony-button', 'symphony-migrate');
  link.textContent = WORDS.migrateButton;
  item.append(link);
  actions.append(item);
  return link;
}

/**
 * A link's press handler, as its one onclick rather than a listener, so that the passes the content
 * script makes replace it instead of stacking a handler per pass. The handler's failure is swallowed:
 * the link is GitHub's page to open, and a note that could not be written must not stop it.
 */
function pressWith(link: HTMLAnchorElement, onPress?: () => void): void {
  link.onclick = onPress
    ? () => {
        try {
          onPress();
        } catch {
          // the link goes on without the note
        }
      }
    : null;
}

/**
 * The header's action list. Since 2025 GitHub draws the repository header with Primer React, where the
 * list is ul[data-testid="repo-header-actions"] and the Star button a[data-testid="star-button"] (read
 * from github.com on 2026-10-11); before that it was ul.pagehead-actions inside
 * #repository-container-header. Each shape is tried, then any list in the header that holds Star.
 */
function findHeaderActions(doc: Document): Element | undefined {
  const byTestId = doc.querySelector('ul[data-testid="repo-header-actions"]');
  if (byTestId) return byTestId;
  const star = doc.querySelector('[data-testid="star-button"]');
  const aroundStar = star?.closest('ul');
  if (aroundStar) return aroundStar;
  const byClass = doc.querySelector('ul.pagehead-actions');
  if (byClass) return byClass;
  const header = doc.querySelector('#repository-details-container')
    ?? doc.querySelector('#repository-container-header')
    ?? doc.querySelector('#repo-content-pjax-container header');
  if (!header) return undefined;
  const lists = Array.from(header.querySelectorAll('ul'));
  return lists.find((ul) => /\bstar\b/i.test(text(ul)));
}

export interface BannerLinks {
  installHref: string;
  siteHref: string;
}

/**
 * The banner "Finish setting up Symphony" at the top of a repository page the person just created
 * through the Create button: one primary button to the App's install page, one text link to the site,
 * and a Dismiss that removes it. Drawn with Primer's flash classes so it reads as part of the page.
 * `onInstall` runs when the button is pressed, like the Migrate button's handler, and a later call
 * refreshes the address and the handler of the one button.
 */
export function injectBanner(doc: Document, links: BannerLinks, onInstall?: () => void): HTMLElement | undefined {
  const existing = doc.querySelector<HTMLElement>(`div[${MARK}="banner"]`);
  if (existing) {
    const button = existing.querySelector<HTMLAnchorElement>('a.symphony-button');
    if (button) {
      button.href = links.installHref;
      pressWith(button, onInstall);
    }
    return existing;
  }
  const anchor = findBannerAnchor(doc);
  if (!anchor) return undefined;

  const install = doc.createElement('a');
  install.className = 'btn btn-primary btn-sm symphony-button';
  install.href = links.installHref;
  install.target = '_blank';
  install.rel = 'noopener noreferrer';
  install.textContent = WORDS.bannerInstall;
  pressWith(install, onInstall);
  const site = doc.createElement('a');
  site.className = 'symphony-banner-link';
  site.href = links.siteHref;
  site.target = '_blank';
  site.rel = 'noopener noreferrer';
  site.textContent = WORDS.bannerSite;

  const banner = flash(doc, 'banner', [strong(doc, WORDS.bannerTitle), ' ', span(doc, WORDS.bannerBody)], [install, site]);
  anchor.insertAdjacentElement('beforebegin', banner);
  return banner;
}

export interface SettingsBannerLinks {
  /** Symphony Setup's install page, for the repository the migrate note names */
  setupHref: string;
  /** that repository, OWNER/NAME, so the person sees which one the banner means */
  repository: string;
}

/**
 * The banner on an installation's settings page, where GitHub lands a Migrate whose account has
 * SymphonyBoard already: the install page shows no Install button then, so the chain would end here
 * without a word. One button to Symphony Setup's install page, in the same tab, since that page is the
 * next step and not a side trip; it carries the repository's name so the person knows which one it
 * is for. Placed at the top of main, the one landmark every settings page has; a page without a main
 * gets nothing.
 */
export function injectSettingsBanner(doc: Document, links: SettingsBannerLinks, onInstall?: () => void): HTMLElement | undefined {
  const existing = doc.querySelector<HTMLElement>(`div[${MARK}="settings-banner"]`);
  if (existing) {
    const button = existing.querySelector<HTMLAnchorElement>('a.symphony-button');
    if (button) {
      button.href = links.setupHref;
      pressWith(button, onInstall);
    }
    return existing;
  }
  const main = doc.querySelector('main');
  if (!main) return undefined;

  const install = doc.createElement('a');
  install.className = 'btn btn-primary btn-sm symphony-button';
  install.href = links.setupHref;
  install.textContent = WORDS.settingsInstall;
  pressWith(install, onInstall);
  const repository = doc.createElement('code');
  repository.className = 'symphony-banner-repository';
  repository.textContent = links.repository;

  const banner = flash(doc, 'settings-banner', [strong(doc, WORDS.settingsTitle), ' (', repository, ') ', span(doc, WORDS.settingsBody)], [install]);
  const first = main.firstElementChild;
  if (first) first.insertAdjacentElement('beforebegin', banner);
  else main.append(banner);
  return banner;
}

/** a Primer flash with Symphony's mark: the words, the actions and a Dismiss that removes it */
function flash(doc: Document, mark: string, wordParts: Array<Node | string>, actionParts: Element[]): HTMLElement {
  const banner = doc.createElement('div');
  banner.setAttribute(MARK, mark);
  banner.className = 'flash flash-full symphony-banner';
  banner.setAttribute('role', 'status');

  const inner = doc.createElement('div');
  inner.className = 'symphony-banner-inner';

  const words = doc.createElement('div');
  words.className = 'symphony-banner-words';
  words.append(...wordParts);

  const actions = doc.createElement('div');
  actions.className = 'symphony-banner-actions';
  actions.append(...actionParts);

  const dismiss = doc.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'flash-close symphony-banner-dismiss';
  dismiss.setAttribute('aria-label', WORDS.dismiss);
  dismiss.title = WORDS.dismiss;
  // Primer's x octicon, drawn here so no file is fetched for it
  dismiss.innerHTML =
    '<svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">' +
    '<path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path></svg>';
  dismiss.addEventListener('click', () => banner.remove());

  inner.append(words, actions, dismiss);
  banner.append(inner);
  return banner;
}

function strong(doc: Document, text: string): HTMLElement {
  const el = doc.createElement('strong');
  el.textContent = text;
  return el;
}

function span(doc: Document, text: string): HTMLElement {
  const el = doc.createElement('span');
  el.textContent = text;
  return el;
}

/**
 * The element the banner goes before: the classic repository header, else the Primer React header the
 * action list sits in, else the repository's content container, else the first thing in main.
 */
function findBannerAnchor(doc: Document): Element | undefined {
  const classic = doc.querySelector('#repository-container-header');
  if (classic) return classic;
  const header = findHeaderActions(doc)?.closest('header');
  if (header) return header;
  const content = doc.querySelector('#repo-content-pjax-container');
  if (content?.firstElementChild) return content.firstElementChild;
  const main = doc.querySelector('main');
  if (main?.firstElementChild) return main.firstElementChild;
  return undefined;
}

/** everything Symphony added, the two banners included, taken off the page again (on navigation to a page it does not touch) */
export function removeInjected(doc: Document): void {
  for (const el of Array.from(doc.querySelectorAll(`[${MARK}]`))) el.remove();
}

/**
 * Give an element the look of a GitHub button next to it: the same classes, less any that make it
 * the primary action, and Primer React's variant attributes set to the plain look. With classic
 * Primer this yields "btn" or "btn btn-sm"; with Primer React, the ButtonBase class and its size.
 */
function dressLike(target: HTMLElement, model: Element, variant: 'default'): void {
  // dropped: the primary colouring, GitHub's behaviour hooks (js-*), the classes that glue a button into
  // a group (BtnGroup-item, the rounded- and border- edges, the tight paddings), since ours stands alone,
  // and a class that hides the label on a narrow window (the Star button's IconOnlyWhenNarrow), since
  // ours has no icon to fall back on
  const classes = Array.from(model.classList).filter((c) => !/primary|first-in-line|^js-|BtnGroup|^rounded-|^border-|^float-|^px-|^pl-|^pr-|IconOnly/i.test(c));
  target.className = classes.join(' ');
  if (model.hasAttribute('data-variant')) target.setAttribute('data-variant', variant);
  const size = model.getAttribute('data-size');
  if (size) target.setAttribute('data-size', size);
}
