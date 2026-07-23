import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['sun.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Besta Solar Stock',
        short_name: 'Besta Solar',
        description: 'Gestion de stock et point de vente multi-boutiques',
        lang: 'fr',
        dir: 'ltr',
        categories: ['business', 'productivity', 'shopping'],
        theme_color: '#f57c0b',
        background_color: '#0a3482',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          { src: 'screenshots/mobile-1.png', sizes: '1080x1920', type: 'image/png', form_factor: 'narrow', label: 'Écran de connexion' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Ne jamais intercepter les appels à Supabase (API + Auth)
        navigateFallbackDenylist: [/^\/api/, /supabase/],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
})
