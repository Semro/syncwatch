import { defineConfig } from 'vite';
import path from 'path';
import webExtension, { readJsonFile } from 'vite-plugin-web-extension';

function root(...paths: string[]): string {
  return path.resolve(__dirname, ...paths);
}

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
    outDir: root('dist'),
    emptyOutDir: true,
  },
  plugins: [
    webExtension({
      manifest: generateManifest,
      watchFilePaths: ['package.json', 'manifest.json'],
      additionalInputs: ['js/players/netflix/netflix.js', 'js/content.js']
    }),
  ],
});
