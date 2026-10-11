# Symphony privacy statement

Version 1, 2026-10-11. This text is also at https://openspineconsortium.com/symphony/privacy.html.

Who makes Symphony: Gregory Schwing, trading as OpenSpineConsortium ("the developer"). Questions:
the contact on https://openspineconsortium.com/symphony/.

Symphony, the browser extension, adds two buttons and one banner to pages on github.com so that
installing the Symphony GitHub App on a repository is one click away. This statement is short
because the extension does little: it collects nothing, sends nothing, and keeps one short-lived
note on your own device.

## What the extension collects

Nothing. It has no account, no identifier, no analytics, no error reporting and no usage report. It
does not read your GitHub sign-in, cookies or tokens, and it does not read the contents of any page
beyond the two things below.

## What the extension sends

Nothing, to anyone. It makes no network request of its own: no fetch, no WebSocket, no beacon, no
update check. Its buttons are ordinary links that open GitHub's own install page for the Symphony
App in a new tab, as a bookmark would; GitHub sees that visit as it sees any visit, and the
extension learns nothing of it. The developer receives nothing from the extension.

## What stays on your device

One note, in the extension's own storage (`storage.local`, under the key `symphony.pending`), written
only when you press **Create Symphony repository** on GitHub's new-repository page: the repository
name you typed, the owner shown in the form when the page lets it be read, and the time. Its one use
is to recognise the repository page you land on next, so the banner **Finish setting up Symphony**
can be shown there. It is removed the moment it is used, and it is removed when found older than
15 minutes. Nothing else is stored, and nothing survives uninstalling the extension.

## What the extension reads from a page

Two things, on github.com only: the repository name typed into GitHub's new-repository form, at the
moment you press Symphony's own button; and, on a repository's main page, the two meta tags GitHub
prints that name the repository owner's login and account id, so that the install page can be
opened with that account pre-selected. The id goes into the address of the GitHub page the button
opens, and nowhere else.

## Permissions

- `storage`: the one note above.
- The host `https://github.com/*`: to add the two buttons and the banner on github.com pages, and for
  nothing else. The extension runs on no other site, asks for no other site, and has no permission on
  claude.ai, anthropic.com or any Anthropic domain.

It requests no `tabs`, `cookies`, `scripting`, `activeTab`, `webRequest`, `identity` or
`nativeMessaging` permission, no optional permission, and it runs no code it did not ship with.

## Children

Symphony is for people who administer GitHub repositories. It is not directed at children.

## Changes

A new version of this statement ships with the version of the extension it applies to, and the page
at https://openspineconsortium.com/symphony/privacy.html is updated with it.

Symphony is not a GitHub or Anthropic product. "GitHub" is GitHub's mark; "Claude" and "Claude Code"
are Anthropic's marks, used here to say what Symphony works with.
