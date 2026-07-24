import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@platform': path.resolve(__dirname, './src/platform'),
      '@runtime': path.resolve(__dirname, './src/runtime'),
      '@services': path.resolve(__dirname, './src/services'),
      '@games': path.resolve(__dirname, './src/games'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
})
