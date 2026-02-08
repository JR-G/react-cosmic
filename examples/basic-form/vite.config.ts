import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  resolve: {
    alias: {
      'react-cosmic': resolve(__dirname, '../../src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
  },
});
