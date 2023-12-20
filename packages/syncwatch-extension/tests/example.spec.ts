import { test, expect } from './fixtures';
import dotenv from 'dotenv';

dotenv.config();

test('popup page', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  const title = await page.title();
  await expect(title).toBe('SyncWatch');
});

test('screenshot_popup', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await expect(page.locator('#main')).toHaveScreenshot();
});

test('screenshot_option', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/options.html`);

  await expect(page.locator('#main')).toHaveScreenshot();
});

test('connect to the server', async ({ page, extensionId }) => {
  // Change server URL
  await page.goto(`chrome-extension://${extensionId}/options.html`);

  await page.locator('#serverUrl').fill(`http://localhost:${process.env.SERVER_PORT}`);
  await page.getByRole('button', { name: 'save' }).click();

  // Connect to the server
  const userName = 'User1';
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await page.getByPlaceholder('Type your name').fill(userName);
  await page.getByPlaceholder('Type room name').fill('RoomName');

  await page.getByRole('button', { name: 'connect' }).click();
  await expect(page.locator('#usersList')).toHaveText(userName);

  // Share a video
  // const video = 'https://www.w3.org/2010/05/video/mediaevents.html';
  // await page.goto(video);

  // await page.getByRole('button', { name: 'share' }).click();
});
