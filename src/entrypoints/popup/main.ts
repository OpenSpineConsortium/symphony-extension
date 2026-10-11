// The popup: three sentences, three links and the trademark line, every one taken from
// src/core/names.ts so the names live in one file. The links are anchors, so they read and copy as
// links, but a press opens the page through the browser's own new-tab call rather than the anchor's
// target=_blank: Chrome opens a popup's plain link in the last ordinary window, so a link pressed in a
// private window landed outside it (the owner, 2026-10-11), while tabs.create opens it in the window
// the popup belongs to. That call needs no permission (the manifest asks for none but storage), and
// the popup itself fetches nothing and keeps nothing. Where the call is missing, the anchor stands.
import { browser } from 'wxt/browser';
import { FORM_URL, NEW_REPO_URL, PRIVACY_URL, PRODUCT_NAME, SITE_URL, WORDS } from '../../core/names';

function fill(id: string, text: string, href?: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  if (href && el instanceof HTMLAnchorElement) {
    el.href = href;
    el.addEventListener('click', (event) => openInThisWindow(event, href));
  }
}

/** open the link in a new tab of the window the popup belongs to, private or not; the anchor is the fallback */
function openInThisWindow(event: MouseEvent, url: string): void {
  const create = browser.tabs?.create;
  if (typeof create !== 'function') return;
  event.preventDefault();
  create({ url, active: true })
    .then(() => window.close())
    .catch(() => window.open(url, '_blank', 'noopener,noreferrer'));
}

fill('title', PRODUCT_NAME);
fill('what', WORDS.popupWhat);
fill('how', WORDS.popupHow);
fill('then', WORDS.popupThen);
fill('create', WORDS.popupCreate, NEW_REPO_URL);
fill('form', WORDS.popupForm, FORM_URL);
fill('site', WORDS.popupSite, SITE_URL);
fill('trademark', WORDS.trademark);
fill('privacy', 'Privacy', PRIVACY_URL);
fill('version', `${PRODUCT_NAME} ${browser.runtime.getManifest().version}`);
