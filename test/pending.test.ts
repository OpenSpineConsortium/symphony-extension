// The pending note: set when Symphony's Create button is pressed, matched by the repository page the
// person lands on within 15 minutes, expired after, and cleared the moment it is used. The storage is a
// map in memory: the functions take their clock and their store as arguments.
import { describe, expect, it } from 'vitest';
import { asPending, isExpired, matches, PENDING_KEY, PENDING_TTL_MS, pendingFor, recordPending, takePending, type KV } from '../src/core/pending';

function memory(): KV & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    async get<T>(key: string) {
      return data.get(key) as T | undefined;
    },
    async set(key: string, value: unknown) {
      data.set(key, value);
    },
    async remove(key: string) {
      data.delete(key);
    },
  };
}

const T0 = 1_700_000_000_000;
const MINUTE = 60_000;

describe('the pending note', () => {
  it('is made from the typed name, trimmed, with the owner when known', () => {
    expect(pendingFor('  widgets ', undefined, T0)).toEqual({ name: 'widgets', at: T0 });
    expect(pendingFor('widgets', 'octo-org', T0)).toEqual({ name: 'widgets', owner: 'octo-org', at: T0 });
    expect(pendingFor('   ', 'octo-org', T0)).toBeUndefined();
  });

  it('is 15 minutes long', () => {
    expect(PENDING_TTL_MS).toBe(15 * MINUTE);
    const p = { name: 'widgets', at: T0 };
    expect(isExpired(p, T0)).toBe(false);
    expect(isExpired(p, T0 + 15 * MINUTE)).toBe(false);
    expect(isExpired(p, T0 + 15 * MINUTE + 1)).toBe(true);
    // a clock that went backwards is not trusted either
    expect(isExpired(p, T0 - 1)).toBe(true);
  });

  it('matches the repository by name, case-insensitively, and by owner when it recorded one', () => {
    const later = T0 + 2 * MINUTE;
    expect(matches({ name: 'Widgets', at: T0 }, { owner: 'anyone', name: 'widgets' }, later)).toBe(true);
    expect(matches({ name: 'widgets', owner: 'octo-org', at: T0 }, { owner: 'Octo-Org', name: 'WIDGETS' }, later)).toBe(true);
    expect(matches({ name: 'widgets', owner: 'octo-org', at: T0 }, { owner: 'someone-else', name: 'widgets' }, later)).toBe(false);
    expect(matches({ name: 'widgets', at: T0 }, { owner: 'octo-org', name: 'gadgets' }, later)).toBe(false);
    expect(matches({ name: 'widgets', at: T0 }, { owner: 'octo-org', name: 'widgets' }, T0 + 16 * MINUTE)).toBe(false);
  });

  it('trusts only a well-shaped value from storage', () => {
    expect(asPending({ name: 'w', at: 1 })).toEqual({ name: 'w', at: 1 });
    expect(asPending({ name: 'w', owner: 'o', at: 1 })).toEqual({ name: 'w', owner: 'o', at: 1 });
    expect(asPending({ name: 'w' })).toBeUndefined();
    expect(asPending({ name: 1, at: 1 })).toBeUndefined();
    expect(asPending({ name: 'w', owner: 3, at: 1 })).toBeUndefined();
    expect(asPending('w')).toBeUndefined();
    expect(asPending(null)).toBeUndefined();
  });

  it('is taken once: the matching page clears it, and a second read finds nothing', async () => {
    const kv = memory();
    await recordPending(kv, { name: 'widgets', owner: 'octo-org', at: T0 });
    expect(kv.data.get(PENDING_KEY)).toEqual({ name: 'widgets', owner: 'octo-org', at: T0 });
    const repo = { owner: 'octo-org', name: 'widgets' };
    expect(await takePending(kv, repo, T0 + MINUTE)).toEqual({ name: 'widgets', owner: 'octo-org', at: T0 });
    expect(kv.data.has(PENDING_KEY)).toBe(false);
    expect(await takePending(kv, repo, T0 + MINUTE)).toBeUndefined();
  });

  it('leaves a note for another repository, and removes an expired one', async () => {
    const kv = memory();
    await recordPending(kv, { name: 'widgets', at: T0 });
    expect(await takePending(kv, { owner: 'octo-org', name: 'gadgets' }, T0 + MINUTE)).toBeUndefined();
    expect(kv.data.has(PENDING_KEY)).toBe(true);
    expect(await takePending(kv, { owner: 'octo-org', name: 'widgets' }, T0 + 20 * MINUTE)).toBeUndefined();
    expect(kv.data.has(PENDING_KEY)).toBe(false);
  });

  it('ignores a value of another shape left in storage', async () => {
    const kv = memory();
    await kv.set(PENDING_KEY, { unexpected: true });
    expect(await takePending(kv, { owner: 'o', name: 'n' }, T0)).toBeUndefined();
  });
});
