import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/**/*.{js,vue}',
      ],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        'ci-build/',
        '**/*.spec.js',
        '**/*.test.js',
      ],
    },
    pool: 'vmThreads',
  },
})
