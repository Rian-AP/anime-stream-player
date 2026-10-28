import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: '../public',
    emptyOutDir: true
  },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-512.png'],
      manifest: {
        name: 'AniPocket',
        short_name: 'AniPocket',
        description: 'Стриминг аниме без рекламы в 1080p',
        theme_color: '#0b0c10',
        background_color: '#0b0c10',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icon-512.png',
            sizes: '120x120 512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '120x120 180x180',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp}']
      }
    })
  ]
})
