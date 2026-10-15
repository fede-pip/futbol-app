import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integracion/**/*.test.js'],
    testTimeout: 120000, hookTimeout: 120000, fileParallelism: false
  }
});
