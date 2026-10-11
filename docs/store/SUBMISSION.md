# Submitting Symphony to the Chrome Web Store, step by step

For the maintainer. `LISTING.md` beside this file holds every text to paste and every answer;
`TEST_BEFORE_UPLOAD.md` is the hand test that comes between the build and the upload. The dashboard
moves its fields around from time to time; the field names below are the ones in use at the time of
writing (2026-10-11), and the texts are what matter. Nothing here needs a secret, a token or a
script: the upload is done by hand in the browser.

## Releases from CI, after the first submission

The first upload is by hand (below): the store gives the item its id only
then. From then on `.github/workflows/release.yml` does the rest, as one
call of the Chrome Web Store release kit
(OpenSpineConsortium/chrome-store-release-kit, its `release-kit/README.md`):
every push to `main` runs the typecheck and the tests, builds the zip with
`npm run zip`, numbers it `<manifest version>.<commit count>` and makes the
GitHub release `extension-v<that version>` with the zip attached, so the
newest build is always at
https://github.com/OpenSpineConsortium/symphony-extension/releases/latest/download/symphony-chrome.zip.
Once the five secrets `CWS_PUBLISHER_ID`, `CWS_ITEM_ID`, `CWS_CLIENT_ID`,
`CWS_CLIENT_SECRET` and `CWS_REFRESH_TOKEN` exist (Settings, Secrets and
variables, Actions; the kit's README says where each comes from) and the
repository variable `CWS_ON_PUSH` is `upload`, that same zip becomes the
store item's draft on every push; with `publish` the draft is submitted
for review as well. Until then the store step says "Not configured" and
the run stays green. A tag `extension-v<version>` releases the manifest's
exact version and always uploads it; "Run workflow" with `upload` or
`publish` ticked does it by hand.

## 0. Before the first submission

1. **The package.** In the repository, with Node 22: `npm ci`, `npm run typecheck`, `npm test`,
   `npm run build`, `npm run zip`. The file is `.output/symphony-1.4.0-chrome.zip`. Confirm it is
   what the texts describe: `unzip -p .output/symphony-1.4.0-chrome.zip manifest.json` shows
   `"name":"Symphony"`, `"version":"1.4.0"`, the 120-character description of `LISTING.md`,
   `"permissions":["storage"]`, `"host_permissions":["https://github.com/*"]`, one entry under
   `content_scripts` whose `matches` is `["https://github.com/*"]`, `"homepage_url"` on
   openspineconsortium.com, and no `background`, no `optional_permissions`, no `key`. `npm test`
   after the build checks the same (`test/hygiene.test.ts`, "the built package").
2. **The hand test**, `TEST_BEFORE_UPLOAD.md`, on the unpacked build, on the live github.com. It
   is the one check this repository cannot run for itself: the DOM fixtures the tests use were
   written from memory of GitHub's markup, and only a person on the real pages can see whether the
   two buttons appear where they should.
3. **The privacy page**, live and answering 200: https://openspineconsortium.com/symphony/privacy.html,
   with the text of `PRIVACY.md` version 5. Reviewers open it; a 404 is a rejection. The product
   page https://openspineconsortium.com/symphony/ should be live too, since the popup, the banner
   and the listing link to it.
4. **The images**, looked at once each: `public/icon/128.png`, `store-assets/promo-440x280.png`,
   `store-assets/screenshot-1-1280x800.png` (the buttons, drawn) and
   `store-assets/screenshot-2-1280x800.png` (a frame of the promo video). Each tile and screenshot
   is PNG without alpha at the exact size (`scripts/build-assets.mjs` checks the ones it draws).
   The video itself, `promo/symphony-promo.mp4`, goes on the listing only as a YouTube link (the
   dashboard's "Promo video" field takes nothing else): upload it to the channel of your choice
   first, or leave the field empty; the site plays the file directly.
5. **The developer account**, one person, with 2-Step Verification on the Google account (the
   store requires it), registered at https://chrome.google.com/webstore/devconsole/register with the
   one-time fee paid. Under **Account**, the publisher display name (Gregory Schwing, trading as
   OpenSpineConsortium), a verified contact e-mail, and the trader / non-trader answer.
6. **The names.** The repositories and the Apps are being renamed to the ones in
   `src/core/names.ts`: the App slug `symphonyboard`, the Setup App `symphony-setup`,
   the front door `OpenSpineConsortium/symphony-start`. Confirm https://github.com/apps/symphonyboard
   answers before the upload, since every button opens its install page; an extension whose
   button opens a 404 is rejected or, worse, published broken.

## 1. The item

1. **New item.** Dashboard, **Items**, **New item**, drag in `.output/symphony-1.4.0-chrome.zip`.
   The item's ID appears in the URL at once; it is the public link's ID once published.
2. **Store listing** tab, from `LISTING.md`: the detailed description; Category **Developer
   Tools**; Language **English**; the store icon (`public/icon/128.png`); the small promo tile
   (`store-assets/promo-440x280.png`); the two screenshots (`store-assets/screenshot-1-1280x800.png`,
   `store-assets/screenshot-2-1280x800.png`); the marquee tile empty, the promo video empty or the
   YouTube link of `promo/symphony-promo.mp4`; Homepage URL and Support URL
   https://openspineconsortium.com/symphony/; Official URL empty until the site is verified in
   Google Search Console; Mature content No. Save draft.
3. **Privacy practices** tab, from `LISTING.md`: the single-purpose statement; one justification
   for `storage` and one for the host permission `https://github.com/*`; "Are you using remote
   code?" **No**; every data-usage box **unticked** (the extension collects nothing); the three
   certifications ticked; Privacy policy URL https://openspineconsortium.com/symphony/privacy.html.
   Save draft.
4. **Distribution** tab: Payments **Free**; Visibility **Public**; Regions: all regions. Save
   draft.
5. **Submit for review** (top right). Leave "Publish automatically after it has passed review"
   on unless you want to time the publication.

## 2. What the review asks, and the answers

- **The host permission.** A permission on github.com puts the item into a closer review. The
  justification in `LISTING.md` says what the content script does on that one host (two buttons,
  two banners, two meta tags and the About sidebar's topic links read) and that nothing is sent
  anywhere; the privacy page says the same; `test/hygiene.test.ts` is the proof a reviewer can
  read. If the reviewer asks for a narrower match pattern, the answer is that the repository header
  exists on every `https://github.com/<owner>/<repo>` and the new-repository page at `/new` and
  `/organizations/*/repositories/new`, which no narrower pattern covers.
- **Single purpose.** One purpose, stated in `LISTING.md`: put the App's install flow one click
  away on github.com. The popup's three links serve the same purpose.
- **Data.** Nothing is collected or transmitted. The two stored notes stay on the device, for at
  most 15 and 30 minutes. If a reviewer reads the typed repository name as "website content", the answer is
  that it is read only when the user presses Symphony's own button, kept only on the device, and
  never transmitted; the data-usage disclosures stay all No.
- **Trademarks and names.** "Symphony" is the developer's own name for the product. "GitHub",
  "Claude" and "Claude Code" appear only to say what Symphony works with, with the trademark
  sentence each time (the popup, the listing, the images). The screenshot is a drawn page whose
  caption says it is not a capture of github.com, so it does not pass itself off as GitHub's.
- **Minimum functionality and quality.** The extension does what the listing says and nothing
  hidden; a reviewer who loads it and opens github.com/new or a repository sees the buttons.
- **Test instructions.** None are needed: the extension works on any github.com account, signed
  in; a reviewer without a GitHub account sees the "Migrate to Symphony" button on any public
  repository page, since the header is public, and the popup. Say so in the **Test instructions**
  box if the dashboard asks.

The decision comes by e-mail. A rejection names the policy and can be appealed from the dashboard
with a written explanation; the facts in `LISTING.md` are that explanation.

## 3. Updating later

Raise `version` in package.json (three integers, 1.0.0 to 1.0.1 or 1.1.0, never a fractional
part), update `PRIVACY.md` and `LISTING.md` if anything they say changed, commit, build and zip,
run the hand test, and in the dashboard open the item, **Package**, **Upload new package**, then
**Submit for review**. Every update is reviewed; users receive it through Chrome's own update
mechanism within hours of publication. A new permission or host would show the user a prompt and
disable the extension until accepted: Symphony should never need one.
