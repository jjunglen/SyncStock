import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from "@tailwindcss/vite";

// Older iPads and iPhones can't update past iOS 15/16, and Vite's default
// (Safari 16.4+) left them on a blank page — so the build is rewritten for
// Safari 15.
const BROWSERS = ['es2020', 'safari15', 'chrome87', 'firefox78', 'edge88'];

// Each build's id, built into the app and written to /version.json, so a
// tab left open from before a deploy can tell (src/lib/appUpdate.js)
const BUILD_ID = Date.now().toString(36);
const versionFile = {
  name: 'version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: BUILD_ID }) });
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    versionFile,
  ],
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(BUILD_ID),
  },
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
