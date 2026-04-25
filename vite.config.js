// filepath: vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Markdown Media Tracker',
        short_name: 'MMT',
        description: 'Track books and movies as Markdown files with YAML frontmatter',
        theme_color: '#6366f1',
        background_color: '#1e1e2e',
        display: 'standalone',
        start_url: '/markdown-media-tracker/',
        scope: '/markdown-media-tracker/',
        icons: [
          { src: 'logo_square_192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'logo_square_512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
        screenshots: [
          {
            src: 'screenshots/main-panel.jpg',
            sizes: '3806x2130',
            type: 'image/jpeg',
            form_factor: 'wide',
            label: 'Markdown Media Tracker — main library view',
          },
          {
            src: 'screenshots/main-panel-mobile.jpg',
            sizes: '1200x2130',
            type: 'image/jpeg',
            form_factor: 'narrow',
            label: 'Markdown Media Tracker — mobile view',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  base: '/markdown-media-tracker/', // Replace with your repo name
  build: {
    outDir: 'dist'
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'credentialless'
    }
  }
})