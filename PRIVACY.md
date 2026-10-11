# Symphony privacy statement

Version 3, 2026-10-11. This text is also at https://openspineconsortium.com/symphony/privacy.html.

Who makes Symphony: Gregory Schwing, trading as OpenSpineConsortium ("the developer"). Questions:
the contact on https://openspineconsortium.com/symphony/.

Symphony, the browser extension, adds two buttons and two banners to pages on github.com so that
installing the two Symphony GitHub Apps on a repository is one click away each. This statement is
short because the extension does little: it collects nothing, sends nothing, and keeps two
short-lived notes on your own device.

## What the extension collects

Nothing. It has no account, no identifier, no analytics, no error reporting and no usage report. It
does not read your GitHub sign-in, cookies or tokens, and it does not read the contents of any page
beyond the few things listed below.

## What the extension sends

Nothing, to anyone. It makes no network request of its own: no fetch, no WebSocket, no beacon, no
update check. Its buttons are ordinary links that open GitHub's own install pages for the Symphony
Apps, as a bookmark would; GitHub sees that visit as it sees any visit, and the extension learns
nothing of it. The developer receives nothing from the extension.

## What stays on your device

Two notes, in the extension's own storage (`storage.local`), and nothing else:

- `symphony.pending`, written only when you press **Create Symphony repository** on GitHub's
  new-repository page: the repository name you typed, the owner shown in the form when the page lets
  it be read, and the time. Its one use is to recognise the repository page you land on next, so the
  banner **Finish setting up Symphony** can be shown there. It is removed the moment it is used, and
  it is removed when found older than 15 minutes.
- `symphony.migrate`, written only when you press **Migrate to Symphony** in a repository's header or
  **Install the Symphony Apps** on that banner: the repository's owner and name, the two numeric ids
  the page prints for them (the owner's account id and the repository's id), the step reached (the
  first App's install or the second's) and the time of the press. Its one use is to carry you from the
  first App's install page to the second's, and then to the form with the repository filled in. It is
  advanced when the form is reached after the first install, or when you press the Setup App's button
  on an installation's settings page; it is removed when the form is reached the second time, and it
  is removed when found older than 30 minutes.

Nothing survives uninstalling the extension.

## What the extension reads from a page

On github.com only:

- On GitHub's new-repository page, the repository name typed into the form, at the moment you press
  Symphony's own button.
- On a repository's main page, the meta tags GitHub prints that name the repository owner's login and
  account id, and the repository's id and its owner/name. The two ids and the owner/name go into the
  address of the GitHub install page the button opens, where the account and the repository are then
  preselected and the owner/name travels as the link's `state`, which GitHub hands back to the form,
  and nowhere else.
- On a repository's main page, the topic links in its About sidebar, read only to see whether the
  topic `symphony` is among them, which the adoption sets on a repository: when it is, the header's
  button reads **Ready for Symphony** and opens the repository's board instead of an install page.
  Which topics a repository has is read for nothing else, and nothing of it is kept.
- On the front door's form page, the page the Setup URL of both Apps sends you to, the page's own
  query string: whether GitHub put an installation's number in it (`installation_id`), which says an
  install just happened, and whether it holds the repository (`state`).
- On an installation's settings page, nothing but its address, which says it is one.

## When the extension moves the page

In two cases, both on the front door's form page, and never anywhere else: after the first App's
install has landed there, on to the second App's install page, so that the second install follows
the first without a search for it; and, when GitHub left the repository out of the form's address, to
the same form page with it added, so that the Repository field is filled in. Every other move is your
own click on a link to one of GitHub's pages, and the buttons remain such links. Nothing is pressed,
submitted or sent for you, and nothing is sent to anyone.

## Permissions

- `storage`: the two notes above.
- The host `https://github.com/*`: to add the two buttons and the two banners on github.com pages, and
  for nothing else. The extension runs on no other site, asks for no other site, and has no permission
  on claude.ai, anthropic.com or any Anthropic domain.

It requests no `tabs`, `cookies`, `scripting`, `activeTab`, `webRequest`, `identity` or
`nativeMessaging` permission, no optional permission, and it runs no code it did not ship with.

## Children

Symphony is for people who administer GitHub repositories. It is not directed at children.

## Changes

A new version of this statement ships with the version of the extension it applies to, and the page
at https://openspineconsortium.com/symphony/privacy.html is updated with it. Version 3 (extension
1.2.0) added the About sidebar's topic links among what is read, for the one topic that marks an
adopted repository; version 2 (extension 1.1.0) added the second note, the second banner, the
repository's tags and the form page's query string among what is read, and the two cases in which
the page is moved; version 1 shipped with extension 1.0.0.

Symphony is not a GitHub or Anthropic product. "GitHub" is GitHub's mark; "Claude" and "Claude Code"
are Anthropic's marks, used here to say what Symphony works with.
