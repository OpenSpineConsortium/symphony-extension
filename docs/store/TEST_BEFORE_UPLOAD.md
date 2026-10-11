# Testing Symphony 1.0.0 by hand before the store upload

One person, twenty minutes, Chrome, a GitHub account that can create a repository. This is the one
check the repository cannot run for itself: the tests prove the injection against saved fixtures
(three written from memory of GitHub's markup, one trimmed from a real repository page read on
2026-10-11), and only a person on the live pages can see whether GitHub's markup today still has the
landmarks (`src/core/github.ts`: a submit button that says "Create repository", the header's
`ul[data-testid="repo-header-actions"]` or the list around `a[data-testid="star-button"]` or the
older `ul.pagehead-actions`, the header those sit in, and the `octolytics-dimension-user_id` meta
tag). The new-repository page is the one no logged-out read can check.

## Load unpacked

1. `npm ci`, `npm run build`. The build is `.output/chrome-mv3/`.
2. `chrome://extensions`, **Developer mode** on, **Load unpacked**, choose `.output/chrome-mv3`.
   Chrome's card for Symphony shows no error. Pin the toolbar button.
3. Open the card's **Details**: Permissions lists "Read and change your data on github.com" and
   nothing else (storage shows no line).

## The three things to click

1. **Create a Symphony repository.** Go to https://github.com/new. Beside GitHub's green **Create
   repository** stands **Create Symphony repository**, in the same shape and size, not green. Type a
   throwaway name (for example `symphony-hand-test`), leave the rest as it is, press **Create
   Symphony repository**. GitHub creates the repository as if you had pressed its own button and
   lands you on its page. At the top, above the repository header, the banner **Finish setting up
   Symphony** with its sentence, the button **Install the Symphony App** and the link **What
   Symphony sets up**. Press the button: a new tab opens on
   https://github.com/apps/openspine-symphony/installations/new/permissions?target_id=... (your
   account pre-selected) or on https://github.com/apps/openspine-symphony/installations/new. Go
   back, reload the repository page: the banner is gone (the note was taken). Open the extension's
   storage once to see it is empty: on the card, **Inspect views** is not offered for a content
   script, so instead reload github.com/new, press the button once more for a second throwaway
   name, and after landing on it check that the banner shows there and not on any other repository
   you open within 15 minutes. Delete both throwaway repositories afterwards, or keep one for the
   next step. Also try the organization page, https://github.com/organizations/<org>/repositories/new,
   if you administer an organization: the same button, the same banner.
2. **Migrate to Symphony.** Open any repository's main page, yours or a public one. In the header,
   after Watch, Fork and Star, the button **Migrate to Symphony**, in the same small shape. Press
   it: a new tab opens on the App's install page with the repository owner's account pre-selected
   (`target_id` in the address) when the page carried the owner's id, or on the plain install page.
   Nothing else on the page changed. Then open a page that is not a repository main page, such as
   your own https://github.com/settings/profile, a repository's Issues tab and an organization's
   page: no Symphony button anywhere. Navigate from a repository's Code tab to Issues and back
   without a reload: the button is on Code and not on Issues.
3. **The popup.** Press the toolbar button. Three sentences, three links, each opening in a new
   tab: **Create a Symphony repository** on https://github.com/new, **Open the form** on
   https://github.com/OpenSpineConsortium/symphony-start/issues/new?template=adopt.yml, **About
   Symphony** on https://openspineconsortium.com/symphony/; the trademark sentence; the Privacy
   link on https://openspineconsortium.com/symphony/privacy.html; "Symphony 1.0.0".

While doing this, keep DevTools' Console open on a github.com page: nothing of Symphony's is
printed, and no error names the extension. In DevTools' Network tab, filter by the extension's id:
no request.

## If a button is missing

GitHub changed its markup. Save the page (DevTools, copy the outer HTML of the form or the header)
into `test/fixtures/` beside the existing fixtures, adjust the selectors in `src/core/github.ts`
until the tests pass against the new fixture as well, and run this test again. The rule stands: a
landmark not found leaves the page untouched, so a missing button is a missing button, never a
broken page.

## Just before uploading

- `unzip -p .output/symphony-1.0.0-chrome.zip manifest.json` shows version 1.0.0, the name
  Symphony, `"permissions":["storage"]`, `"host_permissions":["https://github.com/*"]`, one content
  script matching `https://github.com/*`, and no `background`, `optional_permissions` or `key`.
- `npm test` after the build passes with "the built package" tests run, not skipped.
- https://openspineconsortium.com/symphony/privacy.html shows version 1 of PRIVACY.md;
  https://github.com/apps/openspine-symphony answers.
- The three images were looked at: `public/icon/128.png`, `store-assets/promo-440x280.png`,
  `store-assets/screenshot-1-1280x800.png`.
- Then follow `SUBMISSION.md`.
