import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    // VitePWA removed — offline/SW caching will be re-added in Phase 12
    // scoped to /pos only. Until then, no service worker must be registered.
  ],
  server: {
    port: 5173,
    proxy: {
      '/rest': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/storage': 'http://localhost:8000'
    }
  }
})
