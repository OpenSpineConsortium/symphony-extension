// Symphony's manifest. One content script on https://github.com/* and a popup; the permission
// "storage" for the two notes (the pending note and the migrate note), the host permission for that
// one origin, and nothing else: no background script, no tabs, no cookies, no scripting, no optional
// permission, no other host, and no origin on an Anthropic domain, ever. The buttons open GitHub's
// own pages as links, which needs no permission. test/hygiene.test.ts holds this file and the built manifest to that list.
import { defineConfig } from 'wxt';
import { GITHUB_ORIGIN, PRODUCT_NAME, SITE_URL } from './src/core/names';

// the manifest description: at most 132 characters by Chrome's manifest documentation; this is 128
// (docs/store/LISTING.md, "Short description"), and test/hygiene.test.ts holds it to the limit
const SINGLE_PURPOSE = 'Puts the Symphony App one click away on github.com: create a Symphony repository, or migrate the one you are looking at.';

export default defineConfig({
  hooks: {
    // the master SVG of the icon lives in public/ beside its renderings, but the package carries only the PNGs it names
    'build:publicAssets': (_wxt, files) => {
      const kept = files.filter((f) => f.relativeDest !== 'icon.svg');
      files.splice(0, files.length, ...kept);
    },
  },
  // Vite's modulepreload polyfill carries a fetch() call for browsers without <link rel="modulepreload">; Chrome has
  // had it for years, and a bundle that promises no fetch should hold none, so the polyfill is left out
  vite: () => ({ build: { modulePreload: { polyfill: false } } }),
  srcDir: 'src',
  publicDir: 'public',
  outDir: '.output',
  // the store kit sits beside the project and belongs in no package
  zip: { excludeSources: ['store-assets/**', 'docs/**'] },
  // explicit imports throughout: a reviewer reading the bundle should see where every symbol comes from
  imports: false,
  manifestVersion: 3,
  manifest: {
    name: PRODUCT_NAME,
    short_name: PRODUCT_NAME,
    description: SINGLE_PURPOSE,
    // no author key: Chrome's manifest now types it as an e-mail, and the publisher is the store listing's
    homepage_url: SITE_URL,
    permissions: ['storage'],
    host_permissions: [`${GITHUB_ORIGIN}/*`],
    action: { default_title: PRODUCT_NAME },
    minimum_chrome_version: '120',
  },
});
