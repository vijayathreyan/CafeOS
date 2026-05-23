import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'CafeOS POS',
        short_name: 'CafeOS',
        description: 'Unlimited Food Works — Point of Sale',
        start_url: '/pos',
        display: 'standalone',
        background_color: '#F6F8FC',
        theme_color: '#1A73E8',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // Cache app shell + assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Skip waiting so the new SW activates immediately
        skipWaiting: true,
        clientsClaim: true,
        // Runtime caching for API calls — cache-first with network fallback
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/rest\/v1\/(pos_items|pos_categories)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pos-items-cache',
              expiration: { maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/rest': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/storage': 'http://localhost:8000',
    },
  },
})
