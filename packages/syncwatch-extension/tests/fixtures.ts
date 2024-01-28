import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const pathToExtension = path.join(__dirname, '../dist');
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
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
    let [background] = context.backgroundPages();
    if (!background) background = await context.waitForEvent('backgroundpage');

    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});
export const expect = test.expect;
