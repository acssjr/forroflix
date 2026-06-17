import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**/*'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
