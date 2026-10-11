// Whether the repository on the page has been adopted already: migrated to Symphony, or created with
// it. The sign is the repository topic `symphony` (names.ts, TOPIC), which the adoption run sets on
// the repository and which GitHub shows in the repository page's About sidebar as a link to
// /topics/symphony. Reading that link is the whole check: no request to GitHub's API, no storage,
// nothing but the page as it stands. The reader is lenient on purpose, since GitHub changes its
// markup without notice and the shape of the sidebar is known from memory, not from a fixture: any
// anchor anywhere in the document whose href attribute is /topics/<topic>, or ends with it (GitHub
// may write the link absolute one day), counts, and the attribute is compared as written, never as a
// resolved URL, so a <base> element or a relative path cannot turn another link into the sign.
import { TOPIC } from './names';

/** the tail of the topic link's href, compared without regard to case: GitHub lowercases a topic, a hand-typed one may not be */
const TOPIC_LINK = `/topics/${TOPIC}`.toLowerCase();

/** true when the document holds a link to the topic's page, the sign of an adopted repository */
export function isAdopted(doc: Document): boolean {
  for (const anchor of Array.from(doc.querySelectorAll('a[href]'))) {
    const href = anchor.getAttribute('href')?.trim().toLowerCase();
    if (href && href.endsWith(TOPIC_LINK)) return true;
  }
  return false;
}
