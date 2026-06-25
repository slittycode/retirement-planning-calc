import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base must match the GitHub Pages project path: https://<user>.github.io/retirement-planning-calc/
export default defineConfig({
  base: '/retirement-planning-calc/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendors into their own cacheable chunks so no single
        // chunk trips Vite's 500 kB warning. The catch-all `vendor` bucket
        // captures every Recharts transitive (d3-*, victory-vendor, lodash,
        // react-smooth) without enumerating them.
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'react'
            }
            return 'vendor'
          }
        },
      },
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
