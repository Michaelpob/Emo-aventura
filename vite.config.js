import { defineConfig } from 'vite';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// docs/ es a la vez la carpeta publicada y la que vite vacia en cada build:
// los documentos viven en la raiz y se copian dentro al terminar.
const DOCS = ['PLAN-GAMEPLAY.md', 'FEAR-LEVEL2.md'];

function copyDocs() {
  return {
    name: 'copy-docs',
    closeBundle() {
      DOCS.forEach((name) => {
        const from = resolve(process.cwd(), name);
        if (existsSync(from)) copyFileSync(from, resolve(process.cwd(), 'docs', name));
      });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [copyDocs()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // three cambia rara vez: en su propio chunk se cachea entre versiones
        manualChunks: { three: ['three'] }
      }
    }
  }
});
