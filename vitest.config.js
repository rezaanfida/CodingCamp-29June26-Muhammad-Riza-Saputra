import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Default to jsdom so DOM-dependent unit tests work out of the box.
    // Property-based tests that don't need a DOM still work fine in jsdom.
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  },
});
