# Symphony: the browser extension

Symphony is a GitHub App that sets up a team of Claude Code AI teammates on a repository. Its
adoption flow already works without this extension: a person installs the App on a repository, the
App's Setup URL sends them to an issue form on the front door repository with their installation's
number filled in, they press Create, and within about two minutes a pull request lands in their
repository with the template (for an empty repository) or the claim protocol (for one with files).
This extension puts that flow one click away on github.com itself: one button on the new-repository
page, one button in every repository's header, and a popup with the three links.

Symphony is not a GitHub or Anthropic product. "GitHub" is GitHub's mark; "Claude" and "Claude Code"
are Anthropic's marks, used here to say what Symphony works with.

## What it does, and nothing more

- On https://github.com/new and an organization's new-repository page, a button **Create Symphony
  repository** beside GitHub's own **Create repository**. Pressing it notes the typed repository
  name in the extension's own storage and presses GitHub's button, so GitHub's form does exactly
  what it always does.
- On the main page of the repository that was just created (same name, within 15 minutes), a
  dismissible banner at the top: **Finish setting up Symphony**, with one primary button **Install
  the Symphony App**, which opens the App's install page in a new tab, and a link to the site. The
  note is cleared as the banner is shown.
- On every repository's main page, a button **Migrate to Symphony** in the header's action area,
  beside Watch, Fork and Star, which opens the App's install page in a new tab. When the page's own
  meta tags name the owner's account id, the install page is opened with that account pre-selected
  (`.../installations/new/permissions?target_id=<id>`); otherwise the plain install page, which asks
  for the account. Whether the repository already has the App is not known from the page, and the
  extension does not ask GitHub's API; the install page itself says so.
- A popup with three sentences, three links (the new-repository page, the form, the site) and the
  trademark sentence.

## What it never does

- No code on any host but github.com: one content script with one match pattern,
  `https://github.com/*`, and the host permission for that one origin. No origin on claude.ai,
  anthropic.com or any Anthropic domain, ever.
- No request to anyone: no fetch, no XMLHttpRequest, no WebSocket, no beacon, no analytics, no
  update check of its own. The buttons are links to GitHub's own install page; opening a new tab
  needs no permission.
- No remote code: no eval, no new Function, nothing loaded at runtime.
- No reading of cookies, tokens or forms, no API key, no credential of any kind anywhere, not even
  in an example. From the page it reads the typed repository name, when the person presses
  Symphony's own button, and two meta tags that name the repository's owner.
- One permission, `storage`, for one key, the pending note (`symphony.pending`: name, owner when
  readable, timestamp), kept at most 15 minutes and removed when it is used or found expired.
- A selector that finds nothing leaves the page untouched: a page without a Symphony button is the
  fallback, never a broken page (`src/core/github.ts`).

`test/hygiene.test.ts` holds the source and the built package to each of these.

## The one-click flow, end to end

1. On github.com/new, type the repository's name and press **Create Symphony repository**. GitHub
   creates the repository and lands you on its page.
2. The banner **Finish setting up Symphony** appears at the top. Press **Install the Symphony App**:
   GitHub's install page opens in a new tab. Choose "Only select repositories" and the repository
   you just made, and press Install.
3. GitHub sends you to the form on the front door repository (the App's Setup URL), with your
   installation's number filled in. Press **Create**.
4. Within about two minutes a pull request opens in your repository, from the branch `sdlc/adopt`,
   with the whole template (an empty repository) or the claim protocol (a repository with files).
   Review and merge it. The front door's README has the kinds, the sweep that answers an
   installation even without the form, the metrics switch, and the Setup App that applies the
   repository's settings for one run.

For a repository that exists already, step 1 is **Migrate to Symphony** in its header; steps 2 to 4
are the same, and the pull request brings the claim protocol alone.

## Layout

```
wxt.config.ts                      the manifest: name, one content script, one popup, storage, the github.com host
src/core/names.ts                  EVERY name and address: product, App slugs, front door, form, site; change them here
src/core/route.ts                  which github.com page this is, from the URL (new repository, repository, other)
src/core/github.ts                 finding GitHub's landmarks and adding the two buttons and the banner, idempotently
src/core/pending.ts                the pending note: set, match within 15 minutes, expire, taken once
src/core/install.ts                the install page's address, with target_id when the page says the owner's id
src/ext/storage.ts                 browser.storage.local as the small store core/pending.ts expects
src/entrypoints/github.content/    the content script (index.ts) and its few styles (style.css)
src/entrypoints/popup/             the popup: index.html, main.ts (fills it from names.ts), popup.css
public/icon.svg, public/icon/      the mark and its 16, 32, 48 and 128 px renderings
scripts/build-assets.mjs           draws the icons and the store images with Playwright's Chromium
store-assets/                      the store's promo tile and screenshot, with their HTML sources under src/
test/                              vitest: route, pending, install, the DOM injections against test/fixtures, hygiene
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
npm run zip              # -> .output/symphony-1.0.0-chrome.zip, the file the store gets
```

The version is `version` in package.json, three integers (1.0.0), never fractional; WXT writes it
into the manifest and the zip's name. `.github/workflows/ci.yml` runs the same five commands on
Ubuntu with Node 22 and keeps the zip as the run's artifact; it uses no secret.

The images are committed and are not drawn in CI. To draw them again, with a Playwright Chromium
already on the machine (never `playwright install`):

```
node scripts/build-assets.mjs --pw <dir of playwright-core> --chromium <path to chrome>
```

## Load unpacked

1. `npm run build`.
2. In Chrome, open `chrome://extensions`, turn on **Developer mode** (top right), press **Load
   unpacked** and choose `.output/chrome-mv3`.
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
`a[data-testid="star-button"]`, and the owner's id and login are in the octolytics meta tags). They
prove that the injection finds its landmarks in those shapes, wears the neighbouring button's
classes, does nothing twice, and leaves a page without the landmarks untouched. The new-repository
page needs a login to read, so whether its live markup matches is checked by hand before every
upload.

## License

MIT (LICENSE). Copyright 2026 OpenSpineConsortium.
