/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // On récupère la clé API principale pour servir de fallback aux variables Firebase
  const masterApiKey = process.env.API_KEY || env.API_KEY || env.VITE_GEMINI_API_KEY || '';

  // Capacitor a besoin de chemins relatifs (./assets/) au lieu de absolus (/assets/)
  const isCapacitor = process.env.CAPACITOR_BUILD === 'true';

  return {
    base: isCapacitor ? './' : '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      // Désactiver crossorigin pour Capacitor (bloque dans le scheme capacitor://)
      ...(isCapacitor ? { modulePreload: { polyfill: false } } : {}),
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'vendor-firebase';
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) return 'vendor-recharts';
            if (id.includes('node_modules/@google/generative-ai')) return 'vendor-gemini';
          },
        },
      },
    },
    html: {
      cspNonce: undefined,
      // Retirer crossorigin des script/link tags pour Capacitor
      ...(isCapacitor ? { transformIndexHtml: undefined } : {}),
    },
    define: {
      'process.env.API_KEY': JSON.stringify(masterApiKey),
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY || masterApiKey),
      'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN || ''),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID || ''),
      'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET || ''),
      'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
      'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID || ''),
      'process.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(env.VITE_FIREBASE_MEASUREMENT_ID || ''),
    },
    // Fix: Add Proxy to forward /api requests to Express backend (port 8080)
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    test: {
      globals: true,
      environment: 'node',
    },
  };
});