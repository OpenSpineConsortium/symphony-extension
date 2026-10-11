// The popup: three sentences, three links and the trademark line, every one taken from
// src/core/names.ts so the names live in one file. The links are plain anchors with target=_blank:
// a new tab needs no permission, and the popup itself fetches nothing and keeps nothing.
import { browser } from 'wxt/browser';
import { FORM_URL, NEW_REPO_URL, PRIVACY_URL, PRODUCT_NAME, SITE_URL, WORDS } from '../../core/names';

function fill(id: string, text: string, href?: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  if (href && el instanceof HTMLAnchorElement) el.href = href;
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
