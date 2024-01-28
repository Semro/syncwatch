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

const initSocket = (serverUrl: string) => {
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

const socketEmit = async (socket: Socket, event: string, data: Record<string, any>) => {
  return new Promise((resolve, reject) => {
    socket.emit(event, data);
    resolve('success');
  });
};

const waitForSocketEvent = async (socket: Socket, event: string, callback: () => void) => {
  return new Promise<Record<string, any>>((resolve, reject) => {
    socket.once(event, (data) => {
      resolve(data);
    });

    callback();
  });
};

test('user scenario', async ({ page, extensionId, context }) => {
  const user1 = {
    name: 'User1',
    room: 'RoomName',
  };
  const serverUrl = `http://localhost:${process.env.SERVER_PORT}`;
  const pageVideoMediaEventsUrl = `http://localhost:${process.env.TEST_PAGE_PORT}/mediaevents`;
  const pageVideoFrames = `http://localhost:${process.env.TEST_PAGE_PORT}/frames`;

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
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

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
    await pageVideo.goto(pageVideoMediaEventsUrl);

    await page.getByRole('button', { name: 'share' }).click();
    await expect(page.locator('#shared')).toHaveAttribute('href', pageVideoMediaEventsUrl);
    await expect(page.locator('#shared')).toBeVisible();

    await pageVideo.close();
  });

  await test.step('Open a shared video', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await page.locator('#shared').click();
    const pagePromise = page
      .context()
      .waitForEvent('page', (p) => p.url() === pageVideoMediaEventsUrl);
    const newPage = await pagePromise;
    await expect(newPage).toHaveURL(pageVideoMediaEventsUrl);

    await newPage.close();
  });

  const user2 = { name: 'User2', room: user1.room };
  const socket = await initSocket(serverUrl);

  await test.step('User2 joins room', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await socketEmit(socket, 'join', user2);
    await expect(page.locator('#usersList')).toContainText(user2.name);
  });

  await test.step('Dispatch events from server to video player', async () => {
    await page.goto(pageVideoMediaEventsUrl);

    const videoElement = page.locator('#video');
    await expect(videoElement).toHaveCount(1);

    const eventPlay = {
      location: '-1',
      type: 'play',
      element: 0,
      currentTime: 2,
      playbackRate: 1,
    };
    await socketEmit(socket, 'message', eventPlay);
    await expect(videoElement).toHaveJSProperty('paused', false);

    const eventPause = {
      location: '-1',
      type: 'pause',
      element: 0,
      currentTime: 2,
      playbackRate: 1,
    };
    await socketEmit(socket, 'message', eventPause);
    await expect(videoElement).toHaveJSProperty('paused', true);
    await expect(videoElement).toHaveJSProperty('currentTime', eventPause.currentTime);

    const eventSeekWhenPaused = {
      location: '-1',
      type: 'seeked',
      element: 0,
      currentTime: 3,
      playbackRate: 1,
    };

    await socketEmit(socket, 'message', eventSeekWhenPaused);
    await expect(videoElement).toHaveJSProperty('paused', true);
    await expect(videoElement).toHaveJSProperty('currentTime', eventSeekWhenPaused.currentTime);

    const eventChangePlaybackRate = {
      location: '-1',
      type: 'ratechange',
      element: 0,
      currentTime: 3,
      playbackRate: 2,
    };

    await socketEmit(socket, 'message', eventChangePlaybackRate);
    await expect(videoElement).toHaveJSProperty(
      'playbackRate',
      eventChangePlaybackRate.playbackRate,
    );
  });

  await test.step('Video event should reach other user in the room', async () => {
    await page.goto(pageVideoMediaEventsUrl);

    const videoElement = page.locator('#video');
    await videoElement.focus();

    const type = (
      await waitForSocketEvent(socket, 'message', () => {
        page.keyboard.press(' ');
      })
    ).type;

    // For some reason there will be "pause" event when  user clicks video element first time
    expect(type).toBe('pause');
  });

  await test.step('Capture event from iframe', async () => {
    await page.goto(pageVideoFrames);

    const frame = page.frame('frame-videos');
    const shareEvent = {
      title: 'Frames Test',
      url: pageVideoFrames,
      user: 'test',
    };
    await socketEmit(socket, 'share', shareEvent);

    expect(frame).not.toBeNull();
    if (!frame) return;

    const videoInFrame = frame.locator('#v1');
    await videoInFrame.focus();

    const response = await waitForSocketEvent(socket, 'message', () => {
      page.keyboard.press(' ');
    });

    expect(response.location).toBe('-10');
    expect(response.element).toBe(0);
  });

  await test.step('Disconnect from the server', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await page.getByRole('button', { name: 'connect' }).click();
    await initialState(page);
  });
});
