import { Page } from '@playwright/test';
import { test, expect, describe } from './fixtures';
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

const initialState = (page: Page) => {
  return test.step('Initial state', () => {
    return Promise.all([
      expect(page.locator('#shared')).toBeVisible({ visible: false }),
      expect(page.locator('#usersList')).toBeVisible({ visible: false }),
      expect(page.locator('#status')).toHaveText('status: disconnected'),
    ]);
  });
};

test('user scenario', async ({ page, extensionId, context }) => {
  const userName = 'User1';
  const serverUrl = `http://localhost:${process.env.SERVER_PORT}`;
  const video = 'https://www.w3.org/2010/05/video/mediaevents.html';

  await test.step('Change server URL', async () => {
    await page.goto(`chrome-extension://${extensionId}/options.html`);

    await page.locator('#serverUrl').fill(serverUrl);
    await page.getByRole('button', { name: 'save' }).click();
  });

  await test.step('Open popup', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await initialState(page);
  });

  await test.step('Connect to the server', async () => {
    await page.getByPlaceholder('Type your name').fill(userName);
    await page.getByPlaceholder('Type room name').fill('RoomName');

    await page.getByRole('button', { name: 'connect' }).click();
    await expect(page.locator('#status')).toHaveText('status: connected');
    await expect(page.locator('#usersList')).toBeVisible();
    await expect(page.locator('#usersList')).toHaveText(userName);
  });

  await test.step('Share a video', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    const pageVideo = await context.newPage();
    await pageVideo.goto(video);

    await page.getByRole('button', { name: 'share' }).click();
    await expect(page.locator('#shared')).toHaveAttribute('href', video);
    await expect(page.locator('#shared')).toBeVisible();
  });

  await test.step('Open a shared video', async () => {
    await page.locator('#shared').click();
    const pagePromise = page.context().waitForEvent('page', (p) => p.url() === video);
    const newPage = await pagePromise;
    await expect(newPage).toHaveURL(video);
  });

  await test.step('Disconnect from the server', async () => {
    await page.getByRole('button', { name: 'connect' }).click();
    await initialState(page);
  });
});
