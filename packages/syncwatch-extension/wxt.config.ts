import { defineConfig } from 'wxt';
import manifest from './manifest';

function getBrowserSpecificManifest(browser: string, manifest: Record<string, any>) {
  return Object.entries(manifest).reduce(
    (specificManifest, [key, value]) => {
      const matches = key.match(/^\{{(.+)}}\.(.+)/);

      if (matches) {
        const [_, key_browser, key_string] = matches;
        if (key_string && key_browser === browser) {
          specificManifest[key_string] = value;
        }
      } else {
        specificManifest[key] = value;
      }
      return specificManifest;
    },
    {} as typeof manifest,
  );
}

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: ({ browser }) => {
    return getBrowserSpecificManifest(browser, manifest);
  },
});
