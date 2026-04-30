import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Helper to get env var with fallback to process.env
  const getEnv = (key: string) => env[key] || process.env[key] || '';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: false,
      minify: true,
    },
    define: {
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(getEnv('VITE_FIREBASE_API_KEY') || getEnv('FIREBASE_API_KEY')),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(getEnv('VITE_FIREBASE_AUTH_DOMAIN') || getEnv('FIREBASE_AUTH_DOMAIN')),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(getEnv('VITE_FIREBASE_PROJECT_ID') || getEnv('FIREBASE_PROJECT_ID')),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(getEnv('VITE_FIREBASE_STORAGE_BUCKET') || getEnv('FIREBASE_STORAGE_BUCKET')),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || getEnv('FIREBASE_MESSAGING_SENDER_ID')),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(getEnv('VITE_FIREBASE_APP_ID') || getEnv('FIREBASE_APP_ID')),
      'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(getEnv('VITE_FIREBASE_MEASUREMENT_ID') || getEnv('FIREBASE_MEASUREMENT_ID')),
      'import.meta.env.VITE_FIREBASE_DATABASE_ID': JSON.stringify(getEnv('VITE_FIREBASE_DATABASE_ID') || getEnv('FIREBASE_DATABASE_ID')),
      'import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID': JSON.stringify(getEnv('VITE_FIREBASE_FIRESTORE_DATABASE_ID') || getEnv('FIREBASE_FIRESTORE_DATABASE_ID')),
    }
  };
});
