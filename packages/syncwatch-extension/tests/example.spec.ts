import { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import dotenv from 'dotenv';
import { Socket, io } from 'socket.io-client';

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

const initSocket = (serverUrl) => {
  return new Promise((resolve: (value: Socket) => void, reject) => {
    const socket = io(serverUrl, {
      reconnection: true,
      reconnectionDelayMax: 10000,
      reconnectionDelay: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      reject(err);
    });
  });
};

test('user scenario', async ({ page, extensionId, context }) => {
  const user1 = {
    name: 'User1',
    room: 'RoomName',
  };
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
    await page.getByPlaceholder('Type your name').fill(user1.name);
    await page.getByPlaceholder('Type room name').fill(user1.room);

    await page.getByRole('button', { name: 'connect' }).click();
    await expect(page.locator('#status')).toHaveText('status: connected');
    await expect(page.locator('#usersList')).toBeVisible();
    await expect(page.locator('#usersList')).toContainText(user1.name);
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

  const user2 = { name: 'User2', room: user1.room };
  const socket = await initSocket(serverUrl);

  const socketEmit = async (ev, data) => {
    return new Promise((resolve, reject) => {
      socket.emit(ev, data);
      resolve('success');
    });
  };

  await test.step('User2 joins room', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await socketEmit('join', user2);
    await expect(page.locator('#usersList')).toContainText(user2.name);
  });

  await test.step('Disconnect from the server', async () => {
    await page.getByRole('button', { name: 'connect' }).click();
    await initialState(page);
  });
});
