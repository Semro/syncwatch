import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { type BrowserContext, test as base, chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const pathToExtension = path.join(__dirname, '../.output/chrome-mv3');
    const context = await chromium.launchPersistentContext('', {
      headless: true,
      args: [
        `--headless=new`,
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });

    await use(context);

    // Wait until browser closed manually
    // await new Promise((resolve) => {
    //   context.on('close', resolve); // <-- add this
    // });

    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // for manifest v2:
    // let [background] = context.backgroundPages();
    // if (!background) background = await context.waitForEvent('backgroundpage');

    // for manifest v3:
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');

    const extensionId = background.url().split('/')[2];
    if (extensionId) {
      await use(extensionId);
    }
  },
});
export const expect = test.expect;
