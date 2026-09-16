import { defineConfig } from 'vite';
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Sello de cada build. Va dentro del codigo (__BUILD__) y en docs/version.json:
// la pagina compara los dos al arrancar y, si el navegador le sirvio un
// index.html viejo de la cache, se recarga sola con la version nueva.
const BUILD = Date.now().toString(36);

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
      writeFileSync(resolve(process.cwd(), 'docs', 'version.json'), JSON.stringify({ build: BUILD }));
    }
  };
}

export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(BUILD) },
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
