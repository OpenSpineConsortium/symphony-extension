# Symphony: the browser extension

Symphony is a pair of GitHub Apps that set up a team of Claude Code AI teammates on a repository:
SymphonyBoard, which stays, and Symphony Setup, which applies the repository's settings for one run
and uninstalls itself. The adoption flow already works without this extension: a person installs the
Apps on a repository, their Setup URL sends them to an issue form on the front door repository with
their installation's number filled in, they press Create, and within about two minutes a pull request
lands in their repository with the template (for an empty repository) or the claim protocol (for one
with files). This extension puts that flow one click away on github.com itself: one button on the
new-repository page, one button in every repository's header that carries the repository with it and
takes the two installs in a row, and a popup with the three links.

Symphony is not a GitHub or Anthropic product. "GitHub" is GitHub's mark; "Claude" and "Claude Code"
are Anthropic's marks, used here to say what Symphony works with.

## What it does, and nothing more

- On https://github.com/new and an organization's new-repository page, a button **Create Symphony
  repository** beside GitHub's own **Create repository**. Pressing it notes the typed repository
  name in the extension's own storage and presses GitHub's button, so GitHub's form does exactly
  what it always does.
- On the main page of the repository that was just created (same name, within 15 minutes), a
  dismissible banner at the top: **Finish setting up Symphony**, with one primary button **Install
  the Symphony Apps**, which opens SymphonyBoard's install page in a new tab the same way Migrate
  does, below, and a link to the site. The note is cleared as the banner is shown.
- On every repository's main page, a button **Migrate to Symphony** in the header's action area,
  beside Watch, Fork and Star, which opens SymphonyBoard's install page in a new tab and carries the
  repository with it. When the page's own meta tags name the owner's account id and the repository's
  id, the install page opens with that account and that one repository preselected
  (`.../installations/new/permissions?target_id=<id>&suggested_target_id=<id>&repository_ids[]=<id>`),
  so the install does not land on "All repositories", and the repository's owner/name rides in the
  link's `state`, which GitHub hands back to the form; without the ids, the plain install page, which
  asks for the account, with the `state` alone. After the first install, GitHub itself sends you to
  Symphony Setup's install page (SymphonyBoard's Setup URL is that page), which would ask for the
  account and the repository again; the extension turns it into the same page preselected the same
  way, since an adoption needs both Apps on the one repository and the front door refuses a request
  without the second; after that install the form opens with its Repository field filled in. (An
  install that lands on the form instead, from a SymphonyBoard whose Setup URL still names the form,
  is taken on from there the same way.) When SymphonyBoard was installed on the
  account already, GitHub lands the first press on that installation's settings page instead, and a
  banner there, **SymphonyBoard is installed here already**, offers Symphony Setup's install with the
  same button. Whether the repository already has the Apps is not known from the page, and the
  extension does not ask GitHub's API.
- On a repository that carries the topic `symphony`, which the adoption sets (and which anyone can
  set by hand under Manage topics), the same header button reads **Ready for Symphony** instead and
  opens the repository's board, `blob/board/STATE.md`, in a new tab: a status, drawn as an outline,
  rather than a call to action, and no banner. The topic is read from the About sidebar's topic links
  on the page itself (`src/core/adopted.ts`), never from GitHub's API.
- A popup with three sentences, three links (the new-repository page, the form, the site), opened
  through the browser's own new-tab call so that a press in a private window stays in it, and the
  trademark sentence.

## What it never does

- No code on any host but github.com: one content script with one match pattern,
  `https://github.com/*`, and the host permission for that one origin. No origin on claude.ai,
  anthropic.com or any Anthropic domain, ever.
- No request to anyone: no fetch, no XMLHttpRequest, no WebSocket, no beacon, no analytics, no
  update check of its own. The buttons are links to GitHub's own install pages; opening a new tab
  needs no permission.
- No remote code: no eval, no new Function, nothing loaded at runtime.
- No reading of cookies, tokens or forms, no API key, no credential of any kind anywhere, not even
  in an example. From the page it reads the typed repository name, when the person presses
  Symphony's own button; on a repository's main page, the meta tags that name the repository's owner
  and the repository's id and owner/name, and the About sidebar's topic links, only to see whether
  the topic `symphony` is there; on the front door's form page, the query string (`installation_id`,
  `state`); on Symphony Setup's install page (the account picker, or the permissions page), its
  address and whether its query names a repository; and on an installation's settings page,
  nothing but the address.
- One permission, `storage`, for two keys: the pending note (`symphony.pending`: name, owner when
  readable, timestamp), kept at most 15 minutes and removed when it is used or found expired; and
  the migrate note (`symphony.migrate`: owner and name, the two ids when readable, the step reached,
  timestamp), kept at most 30 minutes, written when Migrate or the banner's install button is
  pressed, advanced after the first install, removed when the form is reached after the second
  install or found expired.
- Three navigations and no other, all `location.replace` (`src/entrypoints/github.content/index.ts`
  says why): from Symphony Setup's install page, where SymphonyBoard's install lands without the
  repository (the account picker, or the permissions page GitHub goes straight to for an account
  with no organization to choose), to the same page with the noted repository preselected; and, on the front door's form page,
  on to Symphony Setup's install page when the first install landed there instead, and to the same
  form page with the repository added when GitHub left the `state` out. Everywhere else the person's
  own click on a link is the only navigation, and nothing is pressed or submitted for them.
- A selector that finds nothing leaves the page untouched: a page without a Symphony button is the
  fallback, never a broken page (`src/core/github.ts`).

`test/hygiene.test.ts` holds the source and the built package to each of these.

## The one-click flow, end to end

1. On github.com/new, type the repository's name and press **Create Symphony repository**. GitHub
   creates the repository and lands you on its page.
2. The banner **Finish setting up Symphony** appears at the top. Press **Install the Symphony
   Apps**: SymphonyBoard's install page opens in a new tab with your account and the repository you
   just made preselected. Press Install.
3. GitHub itself sends you to Symphony Setup's install page (SymphonyBoard's Setup URL), which asks
   for the account; the extension notes that the first install is done and turns that page into the
   one with your account and the repository preselected, the same way. Press Install again.
4. GitHub sends you to the form on the front door repository (Symphony Setup's Setup URL), with your
   installation's number and the repository filled in (the extension adds the repository to the
   address if GitHub left it out). Press **Create**.
5. Within about two minutes a pull request opens in your repository, from the branch
   `symphony/adopt`, with the whole template (an empty repository) or the claim protocol (a
   repository with files). Review and merge it. The front door's README has the kinds, the sweep
   that answers an installation even without the form, the metrics switch, and what Symphony Setup
   applies in its one run before it uninstalls itself.

For a repository that exists already, step 1 is **Migrate to Symphony** in its header; steps 2 to 5
are the same, and the pull request brings the claim protocol alone. When SymphonyBoard is on the
account already, step 2 lands on that installation's settings page instead of an install page, where
the banner **SymphonyBoard is installed here already** offers Symphony Setup's install; add the
repository to the installation there if it is not in it, press **Install Symphony Setup**, and go on
from step 3's install. Once the adoption has set the topic `symphony` on the repository, its header
button reads **Ready for Symphony** and opens the board.

## Layout

```
wxt.config.ts                      the manifest: name, one content script, one popup, storage, the github.com host
src/core/names.ts                  EVERY name and address: product, App slugs, front door, form, site; change them here
src/core/route.ts                  which github.com page this is, from the URL (new repository, repository, the form, Symphony Setup's install pages, an installation's settings, other)
src/core/github.ts                 finding GitHub's landmarks and adding the two buttons and the two banners, idempotently; the header's button in its two states
src/core/adopted.ts                whether the page's repository is adopted already: a link to the topic symphony in the About sidebar
src/core/pending.ts                the pending note: set, match within 15 minutes, expire, taken once
src/core/migrate.ts                the migrate note: set at Migrate, advanced after the first install, cleared at the form, 30 minutes; and what to do on Symphony Setup's install page and on the form page
src/core/install.ts                the two install pages' addresses, with the account and the repository preselected and the state when the page says the ids
src/ext/storage.ts                 browser.storage.local as the small store core/pending.ts and core/migrate.ts expect
src/entrypoints/github.content/    the content script (index.ts) and its few styles (style.css)
src/entrypoints/popup/             the popup: index.html, main.ts (fills it from names.ts), popup.css
public/icon.svg, public/icon/      the mark and its 16, 32, 48 and 128 px renderings
scripts/build-assets.mjs           draws the icons and the store images with Playwright's Chromium
store-assets/                      the store's promo tile and screenshot, with their HTML sources under src/
test/                              vitest: route, pending, migrate, install, the DOM injections against test/fixtures, hygiene
docs/store/                        LISTING.md (the texts to paste), SUBMISSION.md (the dashboard, step by step), TEST_BEFORE_UPLOAD.md
PRIVACY.md                         the privacy statement; its text is published at https://openspineconsortium.com/symphony/privacy.html
```

## Build

Node 22. The dev dependencies are pinned: wxt 0.21.4, vite 8.3.1, typescript 5.9.3, vitest 5.0.2,
linkedom 0.18.13, @types/node 22.20.4. Nothing else.

```
npm ci
npm run typecheck
npm test                 # after a build, test/hygiene.test.ts checks the package too
npm run build            # -> .output/chrome-mv3
npm run zip              # -> .output/symphony-1.4.1-chrome.zip, the file the store gets
```

The version is `version` in package.json, three integers (1.4.1), never fractional; WXT writes it
into the manifest and the zip's name. `.github/workflows/ci.yml` runs the same five commands on
Ubuntu with Node 22 and keeps the zip as the run's artifact; it uses no secret.

The newest build from `main` is always at
https://github.com/OpenSpineConsortium/symphony-extension/releases/latest/download/symphony-chrome.zip:
`.github/workflows/release.yml`, one call of the Chrome Web Store release kit
(OpenSpineConsortium/chrome-store-release-kit), makes the GitHub release `extension-v<version>.<commit
count>` on every push to `main` with the zip attached, and sends the same zip to the store once the
store secrets exist (`docs/store/SUBMISSION.md`, "Releases from CI").

The images are committed and are not drawn in CI. To draw them again, with a Playwright Chromium
already on the machine (never `playwright install`):

```
node scripts/build-assets.mjs --pw <dir of playwright-core> --chromium <path to chrome>
```

## Load unpacked

1. `npm run build`; or, without Node, download the zip linked above and unzip it into a folder of
   its own, which holds the same files as `.output/chrome-mv3`.
2. In Chrome, open `chrome://extensions`, turn on **Developer mode** (top right), press **Load
   unpacked** and choose `.output/chrome-mv3` (or that folder).
3. Chrome asks for nothing at install beyond what the manifest says: "Read and change your data on
   github.com". Pin the toolbar button if you like; the popup is the only thing it opens.
4. After a rebuild, press the reload arrow on the Symphony card.

`docs/store/TEST_BEFORE_UPLOAD.md` is the hand test: the three things to click.

## Tests

`npm test` runs vitest in plain Node. The DOM tests parse four saved fixtures with linkedom: a
plausible classic github.com/new and GitHub's React rewrite of it, both written from memory of
GitHub's markup; a repository main page in its classic shape, also from memory; and one in the
shape github.com served on 2026-10-11, trimmed from a logged-out read of a real repository page
(the header's action list is `ul[data-testid="repo-header-actions"]`, the Star button
`a[data-testid="star-button"]`, and the owner's id and login and the repository's id and owner/name
are in the octolytics meta tags). They prove that the injection finds its landmarks in those shapes,
wears the neighbouring button's classes, does nothing twice, runs the one press handler it was last
given, turns the header's button between Migrate and Ready, and leaves a page without the landmarks
untouched. None of the fixtures carries an About sidebar, so the topic reader is tested against a
sidebar snippet in GitHub's shape, written from memory, put into the fixture. The new-repository
page needs a login to read, so whether its live markup matches is checked by hand before every
upload; so are the two install pages, the form, which the chain crosses, the install page GitHub
sends the first install on to, and the sidebar.

## License

MIT (LICENSE). Copyright 2026 OpenSpineConsortium.
