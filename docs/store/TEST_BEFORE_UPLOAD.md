# Testing Symphony by hand before the store upload

One person, thirty minutes, Chrome, a GitHub account that can create a repository and install an
App on it. This is the one check the repository cannot run for itself: the tests prove the injection
against saved fixtures (three written from memory of GitHub's markup, one trimmed from a real
repository page read on 2026-10-11), and only a person on the live pages can see whether GitHub's
markup today still has the landmarks (`src/core/github.ts`: a submit button that says "Create
repository", the header's `ul[data-testid="repo-header-actions"]` or the list around
`a[data-testid="star-button"]` or the older `ul.pagehead-actions`, the header those sit in, the
`octolytics-dimension-user_id` and `octolytics-dimension-repository_id` meta tags, the About
sidebar's topic links to `/topics/<topic>`, and a `main` on an installation's settings page), and
whether GitHub's install pages still take the address's preselection, send SymphonyBoard's install
on to Symphony Setup's install page (SymphonyBoard's Setup URL) and hand the `state` back to the
form. The new-repository page is the one no logged-out read can check.

## Load unpacked

1. `npm ci`, `npm run build`. The build is `.output/chrome-mv3/`.
2. `chrome://extensions`, **Developer mode** on, **Load unpacked**, choose `.output/chrome-mv3`.
   Chrome's card for Symphony shows no error. Pin the toolbar button.
3. Open the card's **Details**: Permissions lists "Read and change your data on github.com" and
   nothing else (storage shows no line).

## The three things to click

1. **Create a Symphony repository.** Go to https://github.com/new. Beside GitHub's green **Create
   repository** stands **Create Symphony repository**, in the same shape and size, Symphony orange. Type a
   throwaway name (for example `symphony-hand-test`), leave the rest as it is, press **Create
   Symphony repository**. GitHub creates the repository as if you had pressed its own button and
   lands you on its page. At the top, above the repository header, the banner **Finish setting up
   Symphony** with its sentence, the button **Install the Symphony Apps** and the link **What
   Symphony sets up**. Press the button: a new tab opens on
   https://github.com/apps/symphonyboard/installations/new/permissions?target_id=... with your
   account and the new repository preselected, as step 2 describes (or on
   https://github.com/apps/symphonyboard/installations/new?state=... when the page gave no ids). Go
   back, reload the repository page: the banner is gone (the note was taken). Open the extension's
   storage once to see it is empty: on the card, **Inspect views** is not offered for a content
   script, so instead reload github.com/new, press the button once more for a second throwaway
   name, and after landing on it check that the banner shows there and not on any other repository
   you open within 15 minutes. Delete both throwaway repositories afterwards, or keep one for the
   next step. Also try the organization page, https://github.com/organizations/<org>/repositories/new,
   if you administer an organization: the same button, the same banner.
2. **Migrate to Symphony.** Open the main page of a repository of yours that has neither App yet
   (one of the throwaway ones). In the header, after Watch, Fork and Star, the button **Migrate to
   Symphony**, in the same small shape. Press it: a new tab opens on SymphonyBoard's install page,
   and its address holds `target_id` and `suggested_target_id` (the owner's account id),
   `repository_ids[]` (the repository's id) and `state` (owner/name); the page shows your account
   with "Only select repositories" and that one repository already chosen. Press **Install**: GitHub
   itself sends you to Symphony Setup's install page, https://github.com/apps/symphony-setup/installations/new,
   with `installation_id`, `setup_action` and the `state` appended (SymphonyBoard's Setup URL is
   that page; with no organization to choose, GitHub goes straight to its permissions page, with
   "All repositories" ticked and no repository named), and at once, by the extension's step, the
   page goes on to the same App's preselected page,
   https://github.com/apps/symphony-setup/installations/new/permissions?..., with the same account
   and repository preselected; the page without them shows for no more than a moment. (A
   SymphonyBoard whose Setup URL still names the form lands on the form instead, and the extension
   takes the same step from there.) Press **Install** there: the form on
   https://github.com/OpenSpineConsortium/symphony-start/issues/new opens with its Repository field
   filled in with owner/name, and the address holds `installation_id` and `state`. Press **Create**
   only if you mean to adopt the repository; otherwise close the tab, and uninstall the two Apps from
   https://github.com/settings/installations afterwards. Then press **Migrate to Symphony** on a
   repository of an account that has SymphonyBoard already: GitHub lands on that installation's
   settings page, and at its top the banner **SymphonyBoard is installed here already**, naming the
   repository, with the button **Install Symphony Setup**, which goes in the same tab to Symphony
   Setup's install page preselected as above; Dismiss takes the banner off. On a public repository
   of someone else's, the button opens the same install page with that account preselected, as far
   as GitHub lets you see it; nothing else on the page changed. Then open a page that is not a
   repository main page, such as your own https://github.com/settings/profile, a repository's
   Issues tab and an organization's page: no Symphony button anywhere. Navigate from a repository's
   Code tab to Issues and back without a reload: the button is on Code and not on Issues. Open the
   form by hand, https://github.com/OpenSpineConsortium/symphony-start/issues/new?template=adopt.yml:
   the page stays where it is, whatever you pressed before. Last, open a repository that has been
   adopted (the pull request from `symphony/adopt` merged and the topic `symphony` set by the run),
   or give a throwaway repository of yours the topic `symphony` by hand: on its main page, the gear
   beside About, **Manage topics**, type `symphony`, save. Its header button now reads **Ready for
   Symphony**, drawn as an orange outline with orange text on no background, in the same place and
   shape as Migrate; press it: a new tab opens on `https://github.com/<owner>/<name>/blob/board/STATE.md`,
   the board (a 404 on a repository whose adoption has not landed its board branch yet is GitHub's,
   not the extension's). No banner appears on an adopted repository, whatever was pressed before.
   Remove the topic again and reload: the button reads **Migrate to Symphony** once more.
3. **The popup.** Press the toolbar button. Three sentences, three links, each opening in a new
   tab: **Create a Symphony repository** on https://github.com/new, **Open the form** on
   https://github.com/OpenSpineConsortium/symphony-start/issues/new?template=adopt.yml, **About
   Symphony** on https://openspineconsortium.com/symphony/; the trademark sentence; the Privacy
   link on https://openspineconsortium.com/symphony/privacy.html; "Symphony 1.4.1".

While doing this, keep DevTools' Console open on a github.com page: nothing of Symphony's is
printed, and no error names the extension. In DevTools' Network tab, filter by the extension's id:
no request. The only page moves the extension made were in step 2: from Symphony Setup's install
page to its preselected page and, if GitHub left `state` out of the form, to the form with it
added; the Ready button, like Migrate, is a plain link you pressed.

## If a button is missing

GitHub changed its markup. Save the page (DevTools, copy the outer HTML of the form or the header)
into `test/fixtures/` beside the existing fixtures, adjust the selectors in `src/core/github.ts`
until the tests pass against the new fixture as well, and run this test again. The rule stands: a
landmark not found leaves the page untouched, so a missing button is a missing button, never a
broken page.

## Just before uploading

- `unzip -p .output/symphony-1.4.1-chrome.zip manifest.json` shows version 1.4.1, the name
  Symphony, `"permissions":["storage"]`, `"host_permissions":["https://github.com/*"]`, one content
  script matching `https://github.com/*`, and no `background`, `optional_permissions` or `key`.
- `npm test` after the build passes with "the built package" tests run, not skipped.
- https://openspineconsortium.com/symphony/privacy.html shows version 6 of PRIVACY.md;
  https://github.com/apps/symphonyboard and https://github.com/apps/symphony-setup answer.
- The three images were looked at: `public/icon/128.png`, `store-assets/promo-440x280.png`,
  `store-assets/screenshot-1-1280x800.png`.
- Then follow `SUBMISSION.md`.
