import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
  plugins: [
    checker({
      typescript: {
        tsconfigPath: './tsconfig.json',
      },
      overlay: {
        initialIsOpen: false,
      },
    }),
  ],
});
