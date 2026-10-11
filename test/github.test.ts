// The two injections and the banner against the saved fixtures (test/fixtures): a plausible classic
// github.com/new, the React rewrite of it, a repository main page in its classic shape (repo.html,
// written from memory) and one in the shape github.com served on 2026-10-11 (repo-react.html, trimmed
// from a logged-out read of a real page). What these tests prove is that the injection finds its
// landmarks in those shapes, wears the neighbouring button's classes, does nothing twice, and leaves a
// page without the landmarks untouched. The new-repository page needs a login to read, so whether its
// live markup matches is checked by hand (docs/store/TEST_BEFORE_UPLOAD.md).
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import { injectBanner, injectCreateButton, injectMigrateButton, MARK, removeInjected, type CreatePress } from '../src/core/github';
import { INSTALL_URL, SITE_URL, WORDS } from '../src/core/names';

type Page = { document: Document; window: { Event: typeof Event } };

function page(name: string): Page {
  const html = readFileSync(new URL(`./fixtures/${name}.html`, import.meta.url), 'utf8');
  return parseHTML(html) as unknown as Page;
}

function blank(): Page {
  return parseHTML('<!doctype html><html><head><title>x</title></head><body><main><p>Nothing here</p></main></body></html>') as unknown as Page;
}

const html = (d: Document): string => d.documentElement.outerHTML;

/** press an element the way a person does: a bubbling click */
function press(p: Page, el: Element): void {
  el.dispatchEvent(new p.window.Event('click', { bubbles: true, cancelable: true }));
}

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('the Create button on github.com/new', () => {
  for (const fixture of ['new-repo-classic', 'new-repo-react']) {
    describe(fixture, () => {
      it('goes right after GitHub\'s own Create repository, as a plain button in its clothes', () => {
        const p = page(fixture);
        const ours = injectCreateButton(p.document, async () => undefined);
        expect(ours).toBeDefined();
        const real = ours!.previousElementSibling as HTMLButtonElement;
        expect(real.getAttribute('type')).toBe('submit');
        expect(real.textContent?.trim()).toBe('Create repository');
        expect(ours!.getAttribute('type')).toBe('button');
        expect(ours!.textContent).toBe(WORDS.createButton);
        expect(ours!.getAttribute(MARK)).toBe('create');
        // the same Primer, less the primary colouring
        const classes = Array.from(ours!.classList);
        expect(classes.some((c) => /primary/i.test(c))).toBe(false);
        expect(classes).toContain('symphony-button');
        if (fixture === 'new-repo-classic') expect(classes).toContain('btn');
        else {
          expect(classes).toContain('prc-Button-ButtonBase-c5lM4');
          expect(ours!.getAttribute('data-variant')).toBe('default');
          expect(ours!.getAttribute('data-size')).toBe('medium');
        }
      });

      it('records the typed name and owner, then presses GitHub\'s own button', async () => {
        const p = page(fixture);
        const presses: CreatePress[] = [];
        const ours = injectCreateButton(p.document, async (x) => {
          presses.push(x);
        })!;
        const real = ours.previousElementSibling as HTMLButtonElement;
        let realClicks = 0;
        real.addEventListener('click', () => realClicks++);
        const input = p.document.querySelector<HTMLInputElement>('input#repository_name, input#repository-name-input')!;
        input.value = 'widgets';
        press(p, ours);
        // a second press while the first is going through does nothing more
        press(p, ours);
        await tick();
        expect(presses).toEqual([{ name: 'widgets', owner: 'octocat' }]);
        expect(realClicks).toBe(1);
        // and once it has gone through, ours is back in step with GitHub's button, not greyed out for good
        expect(ours.disabled).toBe(false);
      });

      it('follows GitHub\'s own button: disabled while it is, enabled once it is', () => {
        const p = page(fixture);
        const real = p.document.querySelector<HTMLButtonElement>('button[type="submit"]')!;
        real.disabled = true;
        const ours = injectCreateButton(p.document, async () => undefined)!;
        expect(ours.disabled).toBe(true);
        real.disabled = false;
        expect(injectCreateButton(p.document, async () => undefined)).toBe(ours);
        expect(ours.disabled).toBe(false);
        real.disabled = true;
        injectCreateButton(p.document, async () => undefined);
        expect(ours.disabled).toBe(true);
      });

      it('presses GitHub\'s button even when the note cannot be written', async () => {
        const p = page(fixture);
        const ours = injectCreateButton(p.document, async () => {
          throw new Error('storage is down');
        })!;
        const real = ours.previousElementSibling as HTMLButtonElement;
        let realClicks = 0;
        real.addEventListener('click', () => realClicks++);
        press(p, ours);
        await tick();
        expect(realClicks).toBe(1);
      });

      it('is added once', () => {
        const p = page(fixture);
        const first = injectCreateButton(p.document, async () => undefined);
        const second = injectCreateButton(p.document, async () => undefined);
        expect(second).toBe(first);
        expect(p.document.querySelectorAll(`[${MARK}="create"]`).length).toBe(1);
      });
    });
  }

  it('leaves a page without the form untouched', () => {
    for (const p of [page('repo'), blank()]) {
      const before = html(p.document);
      expect(injectCreateButton(p.document, async () => undefined)).toBeUndefined();
      expect(html(p.document)).toBe(before);
    }
  });
});

describe('the Migrate button in the repository header', () => {
  const href = `${INSTALL_URL}/permissions?target_id=98765`;

  it('is one more item in the action list, a link to the install page in a new tab', () => {
    const p = page('repo');
    const link = injectMigrateButton(p.document, href);
    expect(link).toBeDefined();
    expect(link!.textContent).toBe(WORDS.migrateButton);
    expect(link!.getAttribute('href')).toBe(href);
    expect(link!.getAttribute('target')).toBe('_blank');
    expect(link!.getAttribute('rel')).toContain('noopener');
    const list = p.document.querySelector('ul.pagehead-actions')!;
    const items = Array.from(list.children);
    expect(items[items.length - 1]!.getAttribute(MARK)).toBe('migrate-item');
    expect(items[items.length - 1]!.firstElementChild).toBe(link);
    // dressed like its neighbours, without the group glue
    const classes = Array.from(link!.classList);
    expect(classes).toContain('btn');
    expect(classes).toContain('btn-sm');
    expect(classes.some((c) => /BtnGroup|primary/.test(c))).toBe(false);
  });

  it('is one more item in the Primer React action list github.com draws today, in that button\'s clothes', () => {
    const p = page('repo-react');
    const link = injectMigrateButton(p.document, href);
    expect(link).toBeDefined();
    expect(link!.textContent).toBe(WORDS.migrateButton);
    expect(link!.getAttribute('href')).toBe(href);
    const list = p.document.querySelector('ul[data-testid="repo-header-actions"]')!;
    const items = Array.from(list.children);
    expect(items.length).toBe(4);
    expect(items[3]!.getAttribute(MARK)).toBe('migrate-item');
    expect(items[3]!.firstElementChild).toBe(link);
    const classes = Array.from(link!.classList);
    expect(classes).toContain('prc-Button-ButtonBase-9n-Xk');
    // not the class that hides the Star button's label on a narrow window: ours has no icon
    expect(classes.some((c) => /IconOnly/i.test(c))).toBe(false);
    expect(link!.getAttribute('data-variant')).toBe('default');
    expect(link!.getAttribute('data-size')).toBe('small');
  });

  it('finds the list around the Star button when the list has no test id', () => {
    const p = page('repo-react');
    p.document.querySelector('ul[data-testid="repo-header-actions"]')!.removeAttribute('data-testid');
    const link = injectMigrateButton(p.document, href);
    expect(link).toBeDefined();
    expect(link!.closest('ul')).toBe(p.document.querySelector('[data-testid="star-button"]')!.closest('ul'));
  });

  it('is added once, and a later call only refreshes the address', () => {
    const p = page('repo');
    const first = injectMigrateButton(p.document, INSTALL_URL);
    const second = injectMigrateButton(p.document, href);
    expect(second).toBe(first);
    expect(first!.getAttribute('href')).toBe(href);
    expect(p.document.querySelectorAll(`[${MARK}="migrate"]`).length).toBe(1);
  });

  it('finds the list by what it holds when the class is gone', () => {
    const p = page('repo');
    p.document.querySelector('ul.pagehead-actions')!.removeAttribute('class');
    expect(injectMigrateButton(p.document, href)).toBeDefined();
  });

  it('leaves a page without a header untouched', () => {
    for (const p of [page('new-repo-classic'), blank()]) {
      const before = html(p.document);
      expect(injectMigrateButton(p.document, href)).toBeUndefined();
      expect(html(p.document)).toBe(before);
    }
  });
});

describe('the banner after a Symphony repository is created', () => {
  const links = { installHref: INSTALL_URL, siteHref: SITE_URL };

  it('sits above the repository header with its title, one primary button, one link and Dismiss', () => {
    const p = page('repo');
    const banner = injectBanner(p.document, links);
    expect(banner).toBeDefined();
    expect(banner!.nextElementSibling?.id).toBe('repository-container-header');
    expect(banner!.textContent).toContain(WORDS.bannerTitle);
    expect(banner!.textContent).toContain(WORDS.bannerBody);
    const anchors = Array.from(banner!.querySelectorAll('a'));
    expect(anchors.map((a) => [a.textContent, a.getAttribute('href'), a.getAttribute('target')])).toEqual([
      [WORDS.bannerInstall, INSTALL_URL, '_blank'],
      [WORDS.bannerSite, SITE_URL, '_blank'],
    ]);
    expect(Array.from(anchors[0]!.classList)).toContain('btn-primary');
    const dismiss = banner!.querySelector('button')!;
    expect(dismiss.getAttribute('aria-label')).toBe(WORDS.dismiss);
    press(p, dismiss);
    expect(p.document.querySelector(`[${MARK}="banner"]`)).toBeNull();
  });

  it('sits above the Primer React header github.com draws today', () => {
    const p = page('repo-react');
    const banner = injectBanner(p.document, links);
    expect(banner).toBeDefined();
    const next = banner!.nextElementSibling!;
    expect(next.tagName.toLowerCase()).toBe('header');
    expect(next.getAttribute('data-component')).toBe('SplitPageLayout.Header');
    expect(banner!.textContent).toContain(WORDS.bannerTitle);
  });

  it('falls back to the top of main, and is added once', () => {
    const p = blank();
    const first = injectBanner(p.document, links);
    expect(first).toBeDefined();
    expect(first!.parentElement?.tagName.toLowerCase()).toBe('main');
    expect(first!.previousElementSibling).toBeNull();
    expect(injectBanner(p.document, links)).toBe(first);
    expect(p.document.querySelectorAll(`[${MARK}="banner"]`).length).toBe(1);
  });

  it('leaves a page with neither a header nor a main untouched', () => {
    const p = parseHTML('<!doctype html><html><body><p>bare</p></body></html>') as unknown as Page;
    const before = html(p.document);
    expect(injectBanner(p.document, links)).toBeUndefined();
    expect(html(p.document)).toBe(before);
  });
});

describe('removeInjected', () => {
  it('takes everything Symphony added off the page, and nothing else', () => {
    const p = page('repo');
    const before = html(p.document);
    injectMigrateButton(p.document, INSTALL_URL);
    injectBanner(p.document, { installHref: INSTALL_URL, siteHref: SITE_URL });
    expect(p.document.querySelectorAll(`[${MARK}]`).length).toBe(3);
    removeInjected(p.document);
    expect(html(p.document)).toBe(before);
  });
});
