// The one sign of an adopted repository: a link to /topics/symphony in the page, which GitHub draws in
// the About sidebar for every topic the repository carries. The fixtures carry no About sidebar (it
// was written from memory), so each test puts a sidebar in GitHub's shape into the fixture itself,
// with the topic, with another topic, with the link written absolute, and with no sidebar at all.
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { isAdopted } from '../src/core/adopted';
import { TOPIC } from '../src/core/names';

const fixture = readFileSync(new URL('./fixtures/repo-react.html', import.meta.url), 'utf8');

/** the About sidebar as GitHub draws it, with one topic tag per topic given, each a link to the topic's page */
function sidebar(topics: string[], href = (t: string) => `/topics/${t}`): string {
  const tags = topics
    .map((t) => `<a href="${href(t)}" title="Topic: ${t}" class="topic-tag topic-tag-link f6 my-1" data-octo-click="topic_click" data-octo-dimensions="topic:${t}">${t}</a>`)
    .join('\n');
  return `<div class="BorderGrid-cell"><h2 class="h4 mb-3">About</h2><p class="f4 my-3">Widgets for everyone</p><div class="my-3"><div class="f6">${tags}</div></div></div>`;
}

/** the fixture with a sidebar put after the header, the way the About column follows the repository's content */
function pageWith(snippet: string): Document {
  const html = fixture.replace('<div id="repos-split-pane-content"', `${snippet}<div id="repos-split-pane-content"`);
  expect(html).not.toBe(fixture);
  return parseHTML(html).document as unknown as Document;
}

describe('isAdopted', () => {
  it('is the topic symphony', () => {
    expect(TOPIC).toBe('symphony');
  });

  it('is true when the About sidebar links the topic symphony', () => {
    expect(isAdopted(pageWith(sidebar(['symphony'])))).toBe(true);
    expect(isAdopted(pageWith(sidebar(['python', 'symphony', 'claude-code'])))).toBe(true);
  });

  it('is false with a different topic, or one that only starts with the word', () => {
    expect(isAdopted(pageWith(sidebar(['python'])))).toBe(false);
    expect(isAdopted(pageWith(sidebar(['symphony-extension', 'symphonyboard'])))).toBe(false);
  });

  it('is true when GitHub writes the link absolute', () => {
    expect(isAdopted(pageWith(sidebar(['symphony'], (t) => `https://github.com/topics/${t}`)))).toBe(true);
  });

  it('compares the topic without regard to case', () => {
    expect(isAdopted(pageWith(sidebar(['Symphony'])))).toBe(true);
  });

  it('is false without any sidebar: the fixtures as they are, and a bare page', () => {
    expect(isAdopted(parseHTML(fixture).document as unknown as Document)).toBe(false);
    expect(isAdopted(parseHTML(readFileSync(new URL('./fixtures/repo.html', import.meta.url), 'utf8')).document as unknown as Document)).toBe(false);
    expect(isAdopted(parseHTML('<!doctype html><html><body><p>bare</p></body></html>').document as unknown as Document)).toBe(false);
  });

  it('reads the attribute as written, not a resolved address, and asks for an anchor with an href', () => {
    // a link whose text says the topic but whose address goes elsewhere is not the sign
    expect(isAdopted(pageWith('<a href="/topics/python">symphony</a>'))).toBe(false);
    // the topic's page linked with a query is not the sidebar's tag
    expect(isAdopted(pageWith('<a href="/topics/symphony?o=desc">symphony</a>'))).toBe(false);
    // the word alone, outside a link, is not the sign either
    expect(isAdopted(pageWith('<span class="topic-tag">symphony</span><a>symphony</a>'))).toBe(false);
  });
});
