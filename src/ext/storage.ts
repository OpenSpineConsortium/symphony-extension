// browser.storage.local as the small key-value store core/pending.ts expects. It is the one thing the
// "storage" permission is for, and it ever holds one key, the pending note (PRIVACY.md). Nothing is
// read from session storage, cookies or the page.
import { browser } from 'wxt/browser';
import type { KV } from '../core/pending';

export const local: KV = {
  async get<T>(key: string): Promise<T | undefined> {
    const r = await browser.storage.local.get(key);
    return r[key] as T | undefined;
  },
  async set(key: string, value: unknown): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  },
  async remove(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  },
};
