// The tests run in plain Node: the core modules take the document, the clock and the storage as
// arguments, so the DOM tests parse the saved fixtures with linkedom and no browser shim is needed.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
