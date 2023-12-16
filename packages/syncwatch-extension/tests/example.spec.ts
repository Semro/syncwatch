import { test, expect } from './fixtures';

test('popup page', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  const title = await page.title();
  await expect(title).toBe('SyncWatch');
});
