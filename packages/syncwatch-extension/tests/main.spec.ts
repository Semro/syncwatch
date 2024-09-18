import { Page } from '@playwright/test';
import dotenv from 'dotenv';
import { Socket, io } from 'socket.io-client';
import {
  ClientToServerEvents,
  RoomEvent,
  ServerToClientsEvents,
  Share,
  User,
} from '../../syncwatch-types/types';
import { expect, test } from './fixtures';

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

const socketEmit = async <Event extends keyof ClientToServerEvents>(
  socket: Socket<ServerToClientsEvents, ClientToServerEvents>,
  event: Event,
  data: Parameters<ClientToServerEvents[Event]>[0],
) => {
  return new Promise((resolve) => {
    // @ts-ignore
    socket.emit(event, data);
    resolve('success');
  });
};

const waitForSocketEvent = async <Event extends keyof ServerToClientsEvents>(
  socket: Socket<ServerToClientsEvents, ClientToServerEvents>,
  event: Event,
  callback: () => void,
) => {
  return new Promise<Parameters<ServerToClientsEvents[Event]>[0]>((resolve) => {
    // @ts-ignore
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
  } as const satisfies User;

  const serverUrl = process.env.SERVER_URL || '';
  const pageVideoMediaEventsUrl = String(new URL('mediaevents', process.env.TEST_PAGE_URL));
  const pageVideoFrames = String(new URL('frames', process.env.TEST_PAGE_URL));

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

  const user2 = { name: 'User2', room: user1.room } as const satisfies User;
  const socket = await initSocket(serverUrl);

  await test.step('User2 joins room', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await socketEmit(socket, 'join', user2);
    await expect(page.locator('#usersList')).toContainText(user2.name);
  });

  await test.step('Dispatch events from server to video player', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await page.locator('#shared').click();
    const pagePromise = page
      .context()
      .waitForEvent('page', (p) => p.url() === pageVideoMediaEventsUrl);
    const newPage = await pagePromise;

    const videoElement = newPage.locator('#video');
    await expect(videoElement).toHaveCount(1);

    const eventPlay = {
      location: '-1',
      type: 'play',
      element: 0,
      currentTime: 2,
      playbackRate: 1,
    } as const satisfies RoomEvent;

    await socketEmit(socket, 'message', eventPlay);
    await expect(videoElement).toHaveJSProperty('paused', false);

    const eventPause = {
      location: '-1',
      type: 'pause',
      element: 0,
      currentTime: 2,
      playbackRate: 1,
    } as const satisfies RoomEvent;

    await socketEmit(socket, 'message', eventPause);
    await expect(videoElement).toHaveJSProperty('paused', true);
    await expect(videoElement).toHaveJSProperty('currentTime', eventPause.currentTime);

    const eventSeekWhenPaused = {
      location: '-1',
      type: 'seeked',
      element: 0,
      currentTime: 3,
      playbackRate: 1,
    } as const satisfies RoomEvent;

    await socketEmit(socket, 'message', eventSeekWhenPaused);
    await expect(videoElement).toHaveJSProperty('paused', true);
    await expect(videoElement).toHaveJSProperty('currentTime', eventSeekWhenPaused.currentTime);

    const eventChangePlaybackRate = {
      location: '-1',
      type: 'seeked',
      element: 0,
      currentTime: 3,
      playbackRate: 2,
    } as const satisfies RoomEvent;

    await socketEmit(socket, 'message', eventChangePlaybackRate);
    await expect(videoElement).toHaveJSProperty(
      'playbackRate',
      eventChangePlaybackRate.playbackRate,
    );

    await newPage.close();
  });

  await test.step('On page reload, tab should still be synced', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await page.locator('#shared').click();
    const pagePromise = page
      .context()
      .waitForEvent('page', (p) => p.url() === pageVideoMediaEventsUrl);
    const newPage = await pagePromise;

    await newPage.reload();

    const videoElement = newPage.locator('#video');
    await expect(videoElement).toHaveCount(1);

    const eventPlay = {
      location: '-1',
      type: 'play',
      element: 0,
      currentTime: 2,
      playbackRate: 1,
    } as const satisfies RoomEvent;

    await socketEmit(socket, 'message', eventPlay);
    await expect(videoElement).toHaveJSProperty('paused', false);

    await newPage.close();
  });

  await test.step('On tabs URL change, tab should not be in sync', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await page.locator('#shared').click();
    const pagePromise = page
      .context()
      .waitForEvent('page', (p) => p.url() === pageVideoMediaEventsUrl);
    const newPage = await pagePromise;

    await newPage.goto(`${pageVideoMediaEventsUrl}?test=1`);

    const videoElement = newPage.locator('#video');
    await expect(videoElement).toHaveCount(1);

    const eventPlay = {
      location: '-1',
      type: 'play',
      element: 0,
      currentTime: 2,
      playbackRate: 1,
    } as const satisfies RoomEvent;

    await socketEmit(socket, 'message', eventPlay);
    await expect(videoElement).toHaveJSProperty('paused', true);

    await newPage.close();
  });

  await test.step('On clicking "disconnect", and then "connect" in popup tab should be in sync', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await page.locator('#shared').click();
    const pagePromise = page
      .context()
      .waitForEvent('page', (p) => p.url() === pageVideoMediaEventsUrl);
    const newPage = await pagePromise;

    const videoElement = newPage.locator('#video');
    await expect(videoElement).toHaveCount(1);

    await page.getByRole('button', { name: 'connect' }).click();
    await page.getByRole('button', { name: 'connect' }).click();

    const eventPlay = {
      location: '-1',
      type: 'play',
      element: 0,
      currentTime: 2,
      playbackRate: 1,
    } as const satisfies RoomEvent;

    await socketEmit(socket, 'message', eventPlay);
    await expect(videoElement).toHaveJSProperty('paused', false);

    await newPage.close();
  });

  await test.step('Video event should reach other user in the room', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    const pagePromise = page
      .context()
      .waitForEvent('page', (p) => p.url() === pageVideoMediaEventsUrl);
    await page.locator('#shared').click();
    const newPage = await pagePromise;

    const videoElement = newPage.locator('#video');

    await videoElement.focus();

    const type = (
      await waitForSocketEvent(socket, 'message', () => {
        newPage.keyboard.press(' ');
      })
    ).type;

    // For some reason there will be "pause" event when  user clicks video element first time
    expect(type).toBe('pause');

    await newPage.close();
  });

  await test.step('Capture event from iframe', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    const pageVideo = await context.newPage();
    await pageVideo.goto(pageVideoFrames);
    await page.getByRole('button', { name: 'share' }).click();

    const frame = pageVideo.frame('frame-videos');
    const shareEvent = {
      title: 'Frames Test',
      url: pageVideoFrames,
      user: 'test',
    } as const satisfies Share;

    await socketEmit(socket, 'share', shareEvent);

    expect(frame).not.toBeNull();
    if (!frame) return;

    const videoInFrame = frame.locator('#v1');
    await videoInFrame.focus();

    const response = await waitForSocketEvent(socket, 'message', () => {
      pageVideo.keyboard.press(' ');
    });

    expect(response.location).toBe('-10');
    expect(response.element).toBe(0);

    await pageVideo.close();
  });

  await test.step('Disconnect from the server', async () => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await page.getByRole('button', { name: 'connect' }).click();
    await initialState(page);
  });
});
