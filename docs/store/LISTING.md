# Store listing texts

The exact texts to paste into the Chrome Web Store developer dashboard for Symphony 1.4.0, and the
answers to its questions. `SUBMISSION.md` beside this file says where each goes, in the dashboard's
order; `TEST_BEFORE_UPLOAD.md` is the hand test that comes before the upload. Every name and address
below is the one in `src/core/names.ts`; when a name changes there, change it here too.

Facts every text rests on (settled against `wxt.config.ts`, `src/entrypoints/github.content/index.ts`
and `test/hygiene.test.ts`):

- One content script, on `https://github.com/*` and nowhere else; one host permission, that origin;
  one permission, `storage`. No background script, no optional permission, no other host.
- No request of any kind from the extension: no fetch, no WebSocket, no beacon, no analytics. The
  buttons are links to GitHub's own install pages, opened in a new tab.
- No remote code: no eval, no new Function, nothing loaded at runtime.
- Two stored values in `storage.local`: the pending note (repository name, owner when readable,
  time), kept at most 15 minutes and removed when used; and the migrate note (the repository's owner
  and name, its two numeric ids when readable, the step reached, time), kept at most 30 minutes and
  removed when the form is reached the second time.
- The extension reads from the page the typed repository name, when its own button is pressed; on a
  repository's main page, the meta tags naming the owner's login and account id and the repository's
  id and owner/name, and the About sidebar's topic links, only to see whether the topic `symphony`
  is there; on the front door's form page, the query string (`installation_id`, `state`); on
  Symphony Setup's install page and on an installation's settings page, nothing but the address
  and, on the install page, whether its query names a repository.
- The extension moves the page in three cases only: from the second App's install page, where the first
  App's install lands without the repository, to the same page with the repository preselected; and,
  on the front door's form page, on to the second App's install page when the first install landed
  there instead, and to the same form page with the repository added when GitHub left it out of the
  address.

## Name

```
Symphony
```

## Short description (the manifest `description`; 120 characters, within Chrome's 132)

Chrome takes it from the package (`wxt.config.ts`, `SINGLE_PURPOSE`); `test/hygiene.test.ts` holds it
to the limit.

```
Puts the Symphony App one click away on github.com: create a Symphony repository, or migrate the one you are looking at.
```

## Detailed description (plain text; under Chrome's 16,000 characters)

```
Symphony is a pair of GitHub Apps that set up a team of Claude Code AI teammates on a repository: install the Apps, press Create on the form they send you to, and within about two minutes a pull request lands in your repository with everything the teammates need, the whole template for an empty repository or the claim protocol for one that has files. This extension puts that flow one click away on github.com itself.

What it adds, on github.com only:

- On the new-repository page, a button "Create Symphony repository" beside GitHub's own "Create repository". It notes the name you typed and presses GitHub's own button, so GitHub's form does exactly what it always does.
- On the page of the repository you just created, a dismissible banner, "Finish setting up Symphony", with one button that opens the first App's install page in a new tab, the way "Migrate to Symphony" does, and a link to the site. The note is cleared as the banner is shown, and it expires by itself after 15 minutes.
- In every repository's header, beside Watch, Fork and Star, a button "Migrate to Symphony", which opens the first App's install page in a new tab with that repository's account and that one repository preselected, and the repository's name in the link, so the form gets it back. After the first install, GitHub sends you to the second App's install page, and the extension turns it into the one with the same account and repository preselected; after that one, the form opens with the repository filled in. When the first App is on the account already, GitHub shows that installation's settings page instead, and a banner there offers the second App's install. On a repository that carries the topic "symphony", which the adoption sets, the same button reads "Ready for Symphony" and opens the repository's board instead; the topic is read from the page's About sidebar, never from GitHub's API.
- A popup with three links: create a Symphony repository, open the form, and the site.

What it never does: it runs on no site but github.com; it makes no network request at all (no analytics, no update check, nothing sent to anyone); it runs no code it did not ship with; it reads no cookie, token or sign-in; it stores two short-lived notes on your device and nothing else; it moves the page only to carry the chain on: from the second App's install page to the same page with the repository preselected, and on the front door's form, on to the second install and to add the repository to the form's address, and never anywhere else. The source hygiene is checked by its own tests.

Permissions: "storage", for the two notes; and the host github.com, to add the two buttons and the two banners. Nothing else is requested.

Symphony is not a GitHub or Anthropic product. "GitHub" is GitHub's mark; "Claude" and "Claude Code" are Anthropic's marks, used here to say what Symphony works with.

Site: https://openspineconsortium.com/symphony/
Privacy: https://openspineconsortium.com/symphony/privacy.html
```

## Category and language

- Category: **Developer Tools**.
- Language: **English** (English (United States) where the dashboard asks for a locale).

## Single-purpose statement

```
Put the Symphony GitHub Apps' install flow one click away on github.com, by adding a "Create Symphony repository" button to the new-repository page and a "Migrate to Symphony" button to repository headers, each opening the Apps' install pages for that repository.
```

## Permission justifications (one or two sentences each, as the dashboard asks for them)

| Permission | Justification |
|---|---|
| `storage` | Keeps two notes on your device and nothing else. One, for at most 15 minutes: the name of the repository you pressed "Create Symphony repository" for, so that the page of that repository, once GitHub has created it, can show the "Finish setting up Symphony" banner; it is removed when the banner is shown or when it expires. The other, for at most 30 minutes: the repository you pressed "Migrate to Symphony" for (its owner and name, the two numeric ids the page prints, the step reached, the time), so that the second App's install page can follow the first and the form can get the repository; it is removed when the form is reached the second time or when it expires. |
| Host permission `https://github.com/*` | Adds two buttons and two banners to pages on github.com: "Create Symphony repository" on the new-repository page, "Migrate to Symphony" in a repository's header, the banner on a repository just created, and a banner on an installation's settings page when the first App was installed already. The pages touched are the new-repository page, a repository's main page, the second App's install page (where, after the first App's install has landed there, the extension moves on to the same page with the account and the repository preselected), the front door's issue form (where the extension reads the query string and, after an install, moves on to the second App's install page or adds the repository to the form's address) and an installation's settings page. The extension reads from the page only the typed repository name, when its own button is pressed, the meta tags that name the repository owner's account id and the repository's id, so the install page can open with that account and repository selected, the About sidebar's topic links, only to see whether the repository carries the topic "symphony" and so is adopted already, in which case the header button reads "Ready for Symphony" and opens the repository's board, the form page's query string, and on the second App's install page and an installation's settings page nothing but the address. It runs on no other site and sends nothing anywhere. |

Never requested: `tabs`, `activeTab`, `cookies`, `scripting`, `webRequest`, `declarativeNetRequest`,
`identity`, `nativeMessaging`, `alarms`, any optional permission, any other host.

## Remote code

Answer: **No.** If a field asks for a justification:

```
No remote code. No eval, no new Function, no fetched script, no runtime download of any kind. The extension makes no network request; its buttons are links that open GitHub's own pages.
```

## Privacy practices (the Data usage section)

| Question | Answer |
|---|---|
| Personally identifiable information | No |
| Health information | No |
| Financial and payment information | No |
| Authentication information | No |
| Personal communications | No |
| Location | No |
| Web history | No |
| User activity | No |
| Website content | No |
| Certifications (Chrome's three) | Tick all three: I do not sell or transfer user data to third parties outside the approved use cases; I do not use or transfer user data for purposes unrelated to the item's single purpose; I do not use or transfer user data to determine creditworthiness or for lending purposes. |
| Privacy policy URL | https://openspineconsortium.com/symphony/privacy.html (the text of PRIVACY.md, version 5) |

If the dashboard asks whether the extension collects or transmits any user data: **No.** The two
stored values are a repository name the user typed, kept on their own device for at most 15
minutes, and the repository they pressed Migrate on with its ids from the page, kept for at most 30
minutes; neither is ever transmitted.

## URLs

| Field | Value |
|---|---|
| Homepage URL | https://openspineconsortium.com/symphony/ (the manifest's `homepage_url`) |
| Support URL | https://openspineconsortium.com/symphony/ |
| Privacy policy | https://openspineconsortium.com/symphony/privacy.html |
| Official URL | https://openspineconsortium.com/ once the site is verified in Google Search Console under the developer account's Google account; empty until then |

The privacy page must answer 200 with version 5 of PRIVACY.md before the upload: reviewers open it,
and a 404 there is a rejection.

## Images

All under `store-assets/`, drawn by `scripts/build-assets.mjs` from the HTML in `store-assets/src/`
with Playwright's Chromium, at the store's exact sizes, 8-bit RGB with no alpha channel:

| Field | File | What it shows |
|---|---|---|
| Store icon (128x128) | `public/icon/128.png` | The mark: a ring of eight small circles in the Symphony orange around the conductor's point, on a dark slate tile with transparent padding. Drawn for Symphony; it borrows no other mark. |
| Small promo tile (440x280) | `store-assets/promo-440x280.png` | The mark, the name, one line on what it does, and the trademark note. |
| Screenshot 1 (1280x800) | `store-assets/screenshot-1-1280x800.png` | A drawing of a github.com repository page with the "Migrate to Symphony" button in its header and a callout saying what the click does. Its caption says it is a drawing, not a capture, and carries the trademark note. |

The screenshot is a drawn page, not a capture of github.com: no real person, repository or number
appears on it, and the caption says so. Every image that names Claude carries "not a GitHub or
Anthropic product". Before the upload, look at each file once (`TEST_BEFORE_UPLOAD.md`).

## Trademarks

Symphony's name carries no GitHub or Anthropic mark. "GitHub", "Claude" and "Claude Code" appear
in the listing, the popup and the images only to say what Symphony works with, each time with the
sentence: Symphony is not a GitHub or Anthropic product. 'GitHub' is GitHub's mark; 'Claude' and
'Claude Code' are Anthropic's marks, used here to say what Symphony works with.
