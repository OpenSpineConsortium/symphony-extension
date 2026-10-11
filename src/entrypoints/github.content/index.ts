// Symphony's one content script, on github.com and nowhere else (wxt.config.ts: matches and the host
// permission name that one origin). It adds, at most, two buttons and one banner (core/github.ts),
// and it reads nothing from the page but the typed repository name when the person presses Symphony's
// own Create button, and two meta tags that name the repository's owner. No request is made from
// here, to anyone: the buttons are links to GitHub's own install page, and the one write is the
// pending note in the extension's storage (core/pending.ts).
//
// GitHub draws its pages in stages and swaps them in place on navigation, so the script applies its
// additions when the page loads, again when GitHub says a page is ready (turbo:load, turbo:render,
// popstate) and, throttled, when the document changes. Every application is idempotent and wrapped
// so that a failure anywhere leaves the page as GitHub drew it.
import { defineContentScript } from 'wxt/utils/define-content-script';
import { injectBanner, injectCreateButton, injectMigrateButton, removeInjected } from '../../core/github';
import { installUrl, ownerIdFromPage } from '../../core/install';
import { GITHUB_ORIGIN, SITE_URL } from '../../core/names';
import { pendingFor, recordPending, takePending } from '../../core/pending';
import { classify, type Route } from '../../core/route';
import { local } from '../../ext/storage';
import './style.css';

export default defineContentScript({
  matches: [`${GITHUB_ORIGIN}/*`],
  runAt: 'document_idle',
  main() {
    // defence in depth: the match pattern already says so
    if (location.origin !== GITHUB_ORIGIN) return;
    start(document);
  },
});

/** how long a burst of DOM changes is allowed to settle before the additions are applied again */
const SETTLE_MS = 200;

type Repository = Extract<Route, { kind: 'repository' }>;

function start(doc: Document): void {
  let lastPath = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  // the repository page the banner is due on, once the pending note has been taken for it; the header
  // it goes before may not be drawn yet when the note is read, so the banner is placed on a later pass
  let bannerDue: Repository | undefined;

  const apply = (): void => {
    try {
      const path = location.pathname;
      if (path !== lastPath) {
        // a new page: what the old one had must not linger on this one
        removeInjected(doc);
        lastPath = path;
        bannerDue = undefined;
        const route = classify(path);
        if (route.kind === 'repository') void checkPending(route);
      }
      const route = classify(path);
      if (route.kind === 'new-repository') {
        injectCreateButton(doc, (press) => {
          const note = pendingFor(press.name, press.owner, Date.now());
          return note ? recordPending(local, note) : Promise.resolve();
        });
      } else if (route.kind === 'repository') {
        const href = installUrl(ownerIdFromPage(doc, route.owner));
        injectMigrateButton(doc, href);
        if (bannerDue && sameRepository(bannerDue, route)) injectBanner(doc, { installHref: href, siteHref: SITE_URL });
      }
    } catch {
      // whatever went wrong, the page is GitHub's: nothing half-drawn is left behind
      try {
        removeInjected(doc);
      } catch {
        // nothing more can be done
      }
    }
  };

  /** read (and clear) the pending note once per repository page; a match makes the banner due */
  const checkPending = async (route: Repository): Promise<void> => {
    try {
      const pending = await takePending(local, route, Date.now());
      if (!pending) return;
      bannerDue = route;
      applySoon();
    } catch {
      // storage unavailable: no banner, and nothing else is affected
    }
  };

  const applySoon = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      apply();
    }, SETTLE_MS);
  };

  apply();
  for (const event of ['turbo:load', 'turbo:render']) doc.addEventListener(event, applySoon);
  for (const event of ['popstate', 'pageshow']) window.addEventListener(event, applySoon);
  const observer = new MutationObserver(applySoon);
  // the attributes too, for the one GitHub toggles: its Create button's disabled state, which ours follows
  observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled'] });
}

const sameRepository = (a: Repository, b: Repository): boolean => a.owner.toLowerCase() === b.owner.toLowerCase() && a.name.toLowerCase() === b.name.toLowerCase();
