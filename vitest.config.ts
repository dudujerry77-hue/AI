import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      all: true,
      include: ['apps/**/src/**/*.ts', 'engines/**/src/**/*.ts', 'runtime/**/*.ts'],
      exclude: ['**/*.d.ts', '**/dist/**', '**/*.config.ts', '**/node_modules/**']
    }
  }
});
