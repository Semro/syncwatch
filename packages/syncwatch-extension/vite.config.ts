import { defineConfig } from 'vite';
import path from 'path';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';

function root(...paths: string[]): string {
  return path.resolve(__dirname, ...paths);
}

const target = process.env.TARGET || 'chrome';
const outDir = process.env.BUILD_DIR || 'dist';

function generateManifest() {
  const manifest = readJsonFile('src/manifest.json');
  const pkg = readJsonFile('package.json');
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

export default defineConfig({
  root: 'src',
  build: {
    outDir: root(outDir),
    emptyOutDir: true,
    sourcemap: process.env.SOURCEMAP?.trim() === 'true',
  },
  define: {
    __BROWSER__: JSON.stringify(target),
  },
  plugins: [
    webExtension({
      browser: target,
      manifest: generateManifest,
      watchFilePaths: ['package.json', 'manifest.json'],
      additionalInputs: ['js/content.ts', 'js/players/netflix/netflix.js'],
    }),
  ],
});
