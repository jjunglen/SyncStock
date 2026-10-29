import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from "@tailwindcss/vite";

// Older iPads and iPhones can't update past iOS 15/16, and Vite's default
// (Safari 16.4+) left them on a blank page — so the build is rewritten for
// Safari 15.
const BROWSERS = ['es2020', 'safari15', 'chrome87', 'firefox78', 'edge88'];

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  build: {
    target: BROWSERS,
    cssTarget: BROWSERS,
    // Two pages, same app: the site, and the dashboard inside the Shopify
    // admin (shopify.html, which loads Shopify's App Bridge first)
    rolldownOptions: {
      input: { main: 'index.html', shopify: 'shopify.html' },
    },
  },
})
