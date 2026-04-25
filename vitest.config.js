import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.js'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/e2e/**', // Exclude Playwright E2E tests
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}',
        '**/dist/',
        '**/*.config.{js,ts}',
        'src/main.jsx',
        'src/App.jsx',
        'src/MediaTracker.jsx',
      ],
      thresholds: {
        lines: 85,
        functions: 68,
        branches: 80,
        statements: 85,
      },
      // Report coverage for specific directories
      include: ['src/**/*.{js,jsx}'],
      // Track coverage for untested files
      reportOnFailure: true,
    },
    // Test timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
    // Test retry configuration for flaky tests
    retry: 0, // Can be increased for CI environments
    // Test parallelization
    maxConcurrency: 5,
    minThreads: 1,
    maxThreads: 4,
    // Performance monitoring
    logHeapUsage: false,
    // Isolate test environment
    isolate: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
