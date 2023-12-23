import { test, expect } from './fixtures';
import dotenv from 'dotenv';

dotenv.config();

test('popup page', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page).toHaveTitle('SyncWatch');
});

test('screenshot_popup', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await expect(page.locator('#main')).toHaveScreenshot();
});

test('screenshot_option', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/options.html`);

  await expect(page.locator('#main')).toHaveScreenshot();
});

const initialState = (page) => {
  return Promise.all([
    expect(page.locator('#shared')).toBeVisible({ visible: false }),
    expect(page.locator('#usersList')).toBeVisible({ visible: false }),
    expect(page.locator('#status')).toHaveText('status: disconnected'),
  ]);
};

test('connect to the server', async ({ page, extensionId, context }) => {
  // Change server URL
  await page.goto(`chrome-extension://${extensionId}/options.html`);

  await page.locator('#serverUrl').fill(`http://localhost:${process.env.SERVER_PORT}`);
  await page.getByRole('button', { name: 'save' }).click();

  const userName = 'User1';
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  // Initial State
  await initialState(page);

  // Connect to the server
  await page.getByPlaceholder('Type your name').fill(userName);
  await page.getByPlaceholder('Type room name').fill('RoomName');

  await page.getByRole('button', { name: 'connect' }).click();
  await expect(page.locator('#status')).toHaveText('status: connected');
  await expect(page.locator('#usersList')).toBeVisible();
  await expect(page.locator('#usersList')).toHaveText(userName);

  // Share a video
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  const video = 'https://www.w3.org/2010/05/video/mediaevents.html';
  const pageVideo = await context.newPage();
  await pageVideo.goto(video);

  await page.getByRole('button', { name: 'share' }).click();
  await expect(page.locator('#shared')).toHaveAttribute('href', video);
  await expect(page.locator('#shared')).toBeVisible();

  // Open a shared video
  await page.locator('#shared').click();
  const pagePromise = page.context().waitForEvent('page', (p) => p.url() === video);
  const newPage = await pagePromise;
  await expect(newPage).toHaveURL(video);

  // Disconnect from the server
  await page.getByRole('button', { name: 'connect' }).click();
  await initialState(page);
});
