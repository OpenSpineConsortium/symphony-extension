// What the source must never contain, checked against the files themselves, and what the built package
// must look like when there is one. Symphony's promise is small and checkable: one host, one permission,
// no request to anyone, no remote code, no credential of any kind, every name in one file. A reviewer
// can read this test as the list of those promises.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { APP_SLUG, FORM_URL, FRONT_DOOR_REPO, GITHUB_ORIGIN, INSTALL_URL, PRIVACY_URL, PRODUCT_NAME, SETUP_APP_SLUG, SITE_URL, VENDOR, WORDS } from '../src/core/names';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const at = (...p: string[]) => path.join(ROOT, ...p);
const read = (p: string) => readFileSync(p, 'utf8');
const rel = (p: string) => path.relative(ROOT, p).replace(/\\/g, '/');

function walk(dir: string, exts: string[]): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (name === 'node_modules' || name === '.output' || name === '.wxt' || name === '.git') continue;
    if (statSync(p).isDirectory()) out.push(...walk(p, exts));
    else if (exts.includes(path.extname(name))) out.push(p);
  }
  return out;
}

/** the code that ships: everything under src/ and the manifest's source */
const SHIPPED = [...walk(at('src'), ['.ts', '.html', '.css']), at('wxt.config.ts')];
/** everything a person reads or runs in this repository */
const EVERYTHING = [
  ...SHIPPED,
  ...walk(at('test'), ['.ts', '.html']),
  ...walk(at('scripts'), ['.mjs']),
  ...walk(at('docs'), ['.md']),
  ...walk(at('store-assets', 'src'), ['.html']),
  ...walk(at('.github'), ['.yml']),
  at('README.md'),
  at('PRIVACY.md'),
  at('LICENSE'),
  at('package.json'),
  at('public', 'icon.svg'),
].filter(existsSync);

/** a file's code lines: comments taken out, so a comment may say what the code never does */
function codeOf(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');
}

describe('what the shipped source never contains', () => {
  it('no Anthropic origin, no claude.ai, anywhere in the code or the words', () => {
    for (const p of SHIPPED) {
      expect(/claude\.ai|anthropic\.com|claude\.com/i.test(read(p)), rel(p)).toBe(false);
    }
  });

  it('no eval, no new Function, no fetch, no XMLHttpRequest, no WebSocket, no cookie', () => {
    for (const p of SHIPPED) {
      const code = codeOf(read(p));
      expect(/\beval\s*\(|new\s+Function\b|\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|importScripts/.test(code), rel(p)).toBe(false);
      expect(/document\s*\.\s*cookie|cookieStore|browser\.cookies|chrome\.cookies/.test(code), rel(p)).toBe(false);
    }
  });

  it('no plain-http address: the one http:// allowed is the W3C namespace of an SVG', () => {
    for (const p of [...SHIPPED, at('public', 'icon.svg')]) {
      const hits = [...read(p).matchAll(/http:\/\/[^\s"'`)]+/g)].map((m) => m[0]).filter((u) => !u.startsWith('http://www.w3.org/'));
      expect(hits, rel(p)).toEqual([]);
    }
  });

  it('no token-like name: nothing here holds, reads or passes a credential', () => {
    for (const p of SHIPPED) {
      const code = codeOf(read(p));
      const hits = [...code.matchAll(/\b[A-Za-z_]*(token|apikey|api_key|secret|password|passwd|bearer|credential|authorization)[A-Za-z_]*\b/gi)].map((m) => m[0]);
      expect(hits, rel(p)).toEqual([]);
    }
  });

  it('every address and slug comes from src/core/names.ts', () => {
    const others = SHIPPED.filter((p) => !p.endsWith(path.join('core', 'names.ts')));
    for (const p of others) {
      const code = codeOf(read(p));
      expect(/symphony|symphony-start|openspineconsortium\.com|github\.com\/apps\//i.test(code), rel(p)).toBe(false);
    }
  });
});

describe('the manifest source', () => {
  const cfg = read(at('wxt.config.ts'));

  it('asks for storage and the github.com host, and nothing else', () => {
    expect(cfg).toContain("permissions: ['storage'],");
    expect(cfg).toContain('host_permissions: [`${GITHUB_ORIGIN}/*`],');
    expect([...cfg.matchAll(/permissions\s*:/g)].length).toBe(2);
    // in the code, not the comments, which are allowed to say what the manifest never asks for
    const code = codeOf(cfg);
    for (const never of ['optional_permissions', 'optional_host_permissions', 'background', 'tabs', 'cookies', 'scripting', 'activeTab', 'webRequest', 'declarativeNetRequest', 'identity', 'nativeMessaging', 'content_security_policy', 'externally_connectable', 'web_accessible_resources']) {
      expect(new RegExp(`\\b${never}\\b`).test(code), never).toBe(false);
    }
    expect(GITHUB_ORIGIN).toBe('https://github.com');
  });

  it('runs its one content script on github.com only', () => {
    const script = read(at('src', 'entrypoints', 'github.content', 'index.ts'));
    expect(script).toContain('matches: [`${GITHUB_ORIGIN}/*`],');
    expect(readdirSync(at('src', 'entrypoints')).sort()).toEqual(['github.content', 'popup']);
  });

  it('has a description within Chrome\'s 132 characters, and the product\'s name', () => {
    const purpose = /const SINGLE_PURPOSE = '([^']+)';/.exec(cfg)?.[1] ?? '';
    expect(purpose.length).toBeGreaterThan(0);
    expect(purpose.length).toBeLessThanOrEqual(132);
    expect(purpose).toContain(PRODUCT_NAME);
    expect(cfg).toContain('name: PRODUCT_NAME,');
  });
});

describe('the names', () => {
  it('are the ones the repositories and the Apps are being renamed to', () => {
    expect(PRODUCT_NAME).toBe('Symphony');
    expect(VENDOR).toBe('OpenSpineConsortium');
    expect(APP_SLUG).toBe('symphony');
    expect(SETUP_APP_SLUG).toBe('symphony-setup');
    expect(FRONT_DOOR_REPO).toBe('OpenSpineConsortium/symphony-start');
    expect(FORM_URL).toBe('https://github.com/OpenSpineConsortium/symphony-start/issues/new?template=adopt.yml');
    expect(INSTALL_URL).toBe('https://github.com/apps/symphony/installations/new');
    expect(SITE_URL).toBe('https://openspineconsortium.com/symphony/');
    expect(PRIVACY_URL).toBe('https://openspineconsortium.com/symphony/privacy.html');
  });

  it('carry the trademark sentence word for word', () => {
    expect(WORDS.trademark).toBe("Symphony is not a GitHub or Anthropic product. 'GitHub' is GitHub's mark; 'Claude' and 'Claude Code' are Anthropic's marks, used here to say what Symphony works with.");
  });

  it('give the version as three integers', () => {
    const pkg = JSON.parse(read(at('package.json'))) as { version: string; name: string };
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.name).toBe('symphony');
  });
});

describe('the files', () => {
  it('are ASCII with LF endings and a final newline', () => {
    for (const p of EVERYTHING) {
      const text = read(p);
      expect(/[^\x09\x0A\x20-\x7E]/.test(text), `${rel(p)} has a byte outside ASCII`).toBe(false);
      expect(text.includes('\r'), `${rel(p)} has a CR`).toBe(false);
      expect(text.endsWith('\n'), `${rel(p)} lacks a final newline`).toBe(true);
    }
  });

  it('are present: the documents, the icons and the store images the listing names', () => {
    for (const f of ['README.md', 'PRIVACY.md', 'LICENSE', 'docs/store/LISTING.md', 'docs/store/SUBMISSION.md', 'docs/store/TEST_BEFORE_UPLOAD.md', '.github/workflows/ci.yml', 'public/icon.svg']) {
      expect(existsSync(at(f)), f).toBe(true);
    }
    for (const size of [16, 32, 48, 128]) expect(existsSync(at('public', 'icon', `${size}.png`)), `icon ${size}`).toBe(true);
    expect(existsSync(at('store-assets', 'promo-440x280.png'))).toBe(true);
    expect(existsSync(at('store-assets', 'screenshot-1-1280x800.png'))).toBe(true);
  });
});

// The package itself, when one has been built (npm run build, npm run zip): the manifest exactly as
// promised, and the bundle free of the same strings. Skipped, and said so, before the first build.
describe('the built package', () => {
  const dir = at('.output', 'chrome-mv3');
  const manifestPath = path.join(dir, 'manifest.json');
  const built = existsSync(manifestPath);
  if (!built) console.log('hygiene: no build in .output/chrome-mv3 yet; run npm run build to check the package too');

  it.skipIf(!built)('has the promised manifest', () => {
    const m = JSON.parse(read(manifestPath)) as Record<string, unknown>;
    const pkg = JSON.parse(read(at('package.json'))) as { version: string };
    expect(m.manifest_version).toBe(3);
    expect(m.name).toBe(PRODUCT_NAME);
    expect(m.version).toBe(pkg.version);
    expect(m.permissions).toEqual(['storage']);
    expect(m.host_permissions).toEqual(['https://github.com/*']);
    const scripts = m.content_scripts as Array<{ matches: string[]; js?: string[]; css?: string[] }>;
    expect(scripts.length).toBe(1);
    expect(scripts[0]!.matches).toEqual(['https://github.com/*']);
    for (const never of ['background', 'optional_permissions', 'optional_host_permissions', 'key', 'content_security_policy', 'web_accessible_resources', 'externally_connectable', 'update_url']) {
      expect(m, never).not.toHaveProperty(never);
    }
    expect(m.icons).toEqual({ 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png', 128: 'icon/128.png' });
    const action = m.action as { default_popup?: string };
    expect(action.default_popup).toBe('popup.html');
  });

  it.skipIf(!built)('ships no Anthropic address, no eval, no fetch and no http:// in its code', () => {
    const files = walk(dir, ['.js', '.html', '.css', '.json']);
    expect(files.length).toBeGreaterThan(0);
    for (const p of files) {
      const text = read(p);
      expect(/claude\.ai|anthropic\.com|claude\.com/i.test(text), rel(p)).toBe(false);
      if (p.endsWith('.js')) {
        expect(/\beval\s*\(|new\s+Function\b|\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(text), rel(p)).toBe(false);
        expect(/http:\/\//.test(text.replace(/http:\/\/www\.w3\.org\//g, '')), rel(p)).toBe(false);
      }
    }
  });

  const zip = at('.output', 'symphony-1.0.0-chrome.zip');
  it.skipIf(!existsSync(zip))('is zipped under the name the store gets', () => {
    expect(statSync(zip).size).toBeGreaterThan(1024);
    expect(statSync(zip).size).toBeLessThan(2 * 1024 * 1024);
  });
});
