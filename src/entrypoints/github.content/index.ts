// Symphony's one content script, on github.com and nowhere else (wxt.config.ts: matches and the host
// permission name that one origin). It adds, at most, two buttons and one of two banners
// (core/github.ts). From the page it reads the typed repository name when the person presses
// Symphony's own Create button; on a repository's main page, the meta tags that name the owner's
// login and id and the repository's id and owner/name, and the About sidebar's topic links, only to
// see whether the topic symphony is among them (core/adopted.ts), the sign that the repository is
// adopted already; on the front door's form page, the query string (installation_id, which says an
// install just happened, and state, the repository GitHub handed back); and on Symphony Setup's
// account-picker page and on an installation's settings page, nothing but the address that says
// which page it is. No request is made from here, to anyone: the buttons are links to GitHub's own
// pages, the Apps' install pages or, on an adopted repository, its board, and the only writes are two
// notes in the extension's storage, the pending note (core/pending.ts) and the migrate note
// (core/migrate.ts).
//
// The extension navigates the page in three cases and no other, all with location.replace. On
// Symphony Setup's install page (its account picker, or the permissions page GitHub goes straight to
// for an account with no organization to choose), in onPicker below: SymphonyBoard's Setup URL is
// that page, so GitHub itself sends the person there after the first install, but the page knows nothing of
// the repository just installed on, and the extension sends it on to the same App's install page
// with the account and the repository from the migrate note preselected, because an adoption needs
// both Apps on the one repository and a picker left alone lands on "All repositories". On the front
// door's form page, in onForm below, the two cases as before: on to Symphony Setup's install page
// when SymphonyBoard's install landed on the form instead of the picker (an owner whose SymphonyBoard
// still names the form as its Setup URL, or GitHub sending the person to the form), and to the same
// form page with the repository added to its address, when GitHub left the state out. replace rather
// than assign, so that Back does not return to a page that would only forward again; and the note is
// advanced before the picker is left, so a return to it finds nothing to do. Everywhere else the
// person's click on a link is the only navigation.
//
// GitHub draws its pages in stages and swaps them in place on navigation, so the script applies its
// additions when the page loads, again when GitHub says a page is ready (turbo:load, turbo:render,
// popstate) and, throttled, when the document changes. Every application is idempotent and wrapped
// so that a failure anywhere leaves the page as GitHub drew it.
import { defineContentScript } from 'wxt/utils/define-content-script';
import { isAdopted } from '../../core/adopted';
import { injectBanner, injectCreateButton, injectMigrateButton, injectReadyButton, injectSettingsBanner, removeInjected } from '../../core/github';
import { installUrl, ownerIdFromPage, repositoryIdFromPage, setupInstallUrl, type Target } from '../../core/install';
import { advanceMigration, clearMigration, migrationFor, migrationTarget, nextOnForm, nextOnPicker, readMigration, recordMigration, type Migration } from '../../core/migrate';
import { boardUrl, GITHUB_ORIGIN, SITE_URL } from '../../core/names';
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
  // the migrate note an installation's settings page should answer with the settings banner, read once per page
  let settingsDue: Migration | undefined;

  const apply = (): void => {
    try {
      const path = location.pathname;
      if (path !== lastPath) {
        // a new page: what the old one had must not linger on this one
        removeInjected(doc);
        lastPath = path;
        bannerDue = undefined;
        settingsDue = undefined;
        const route = classify(path);
        if (route.kind === 'repository') void checkPending(route);
        else if (route.kind === 'front-door-form') void onForm();
        else if (route.kind === 'setup-app-picker' || route.kind === 'setup-app-permissions') void onPicker();
        else if (route.kind === 'installation-settings') void checkMigration();
      }
      const route = classify(path);
      if (route.kind === 'new-repository') {
        injectCreateButton(doc, (press) => {
          const note = pendingFor(press.name, press.owner, Date.now());
          return note ? recordPending(local, note) : Promise.resolve();
        });
      } else if (route.kind === 'repository' && isAdopted(doc)) {
        // adopted already, by the topic the adoption set: the header's button is a status that opens the
        // board, and there is no banner, since the banner asks for the install this repository has had
        injectReadyButton(doc, boardUrl(route.owner, route.name));
      } else if (route.kind === 'repository') {
        const target = targetOf(route);
        const href = installUrl(target);
        // pressing either button starts the chain: the note says which repository, and that SymphonyBoard comes first
        const note = (): void => {
          recordMigration(local, migrationFor(route, target, Date.now())).catch(() => undefined);
        };
        injectMigrateButton(doc, href, note);
        if (bannerDue && sameRepository(bannerDue, route)) injectBanner(doc, { installHref: href, siteHref: SITE_URL }, note);
      } else if (route.kind === 'installation-settings' && settingsDue) {
        const due = settingsDue;
        injectSettingsBanner(doc, { setupHref: setupInstallUrl(migrationTarget(due)), repository: `${due.owner}/${due.name}` }, () => {
          advanceMigration(local, Date.now()).catch(() => undefined);
        });
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

  /** the ids the repository page gives, for the install pages' addresses and the migrate note */
  const targetOf = (route: Repository): Target => {
    const target: Target = { repository: `${route.owner}/${route.name}` };
    const ownerId = ownerIdFromPage(doc, route.owner);
    if (ownerId) target.ownerId = ownerId;
    const repositoryId = repositoryIdFromPage(doc, route.owner, route.name);
    if (repositoryId) target.repositoryId = repositoryId;
    return target;
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

  /** Symphony Setup's account picker, where SymphonyBoard's install lands: on to the preselected page (the header comment says why) */
  const onPicker = async (): Promise<void> => {
    try {
      const next = nextOnPicker(await readMigration(local, Date.now()), location.search);
      if (next.kind === 'go') {
        // the note first, so the picker reached again finds step setup and stays put
        await advanceMigration(local, Date.now());
        location.replace(next.href);
      }
    } catch {
      // storage unavailable: the picker stays as GitHub drew it, and the person chooses by hand
    }
  };

  /** the form page: where the chain goes on when the first install landed here, and where it ends (the header comment says why and how) */
  const onForm = async (): Promise<void> => {
    try {
      const next = nextOnForm(await readMigration(local, Date.now()), location.search);
      if (next.kind === 'go') {
        await advanceMigration(local, Date.now());
        location.replace(next.href);
      } else if (next.kind === 'add-state') {
        location.replace(next.href);
      } else if (next.kind === 'done') {
        await clearMigration(local);
      }
    } catch {
      // storage unavailable: the form stays as GitHub drew it, with whatever it was given
    }
  };

  /** an installation's settings page: a note still at its first step means SymphonyBoard was there already */
  const checkMigration = async (): Promise<void> => {
    try {
      const note = await readMigration(local, Date.now());
      if (!note || note.step !== 'board') return;
      settingsDue = note;
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
  // the attributes too, for the one GitHub toggles: its Create button's disabled state, which ours follows;
  // the About sidebar, drawn after the header, comes in as added nodes, and turns the header's button around
  observer.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'aria-disabled'] });
}

const sameRepository = (a: Repository, b: Repository): boolean => a.owner.toLowerCase() === b.owner.toLowerCase() && a.name.toLowerCase() === b.name.toLowerCase();
