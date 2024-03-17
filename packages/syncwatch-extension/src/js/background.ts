import { type Socket, io } from 'socket.io-client';

interface User {
  name: string;
  room: string;
}

type UserList = NonNullable<User['name']>[];

interface Share {
  title: string;
  url: string;
  user: string;
}

const MediaPlayerEvents = ['playing', 'pause', 'seeked', 'ratechange', 'progress'] as const;

type MediaPlayerEvent = (typeof MediaPlayerEvents)[number];

interface RoomEvent {
  location: string;
  type: MediaPlayerEvent;
  element: number;
  currentTime: HTMLMediaElement['currentTime'];
  playbackRate: HTMLMediaElement['playbackRate'];
}

type ErrorEvent = string;

interface ServerToClientsEvents {
  usersList: (msg: { list: UserList }) => void;
  message: (msg: RoomEvent) => void;
  share: (msg: Share) => void;
  afk: () => void;
  error: (msg: ErrorEvent) => void;
}

interface ChromeTab extends chrome.tabs.Tab {
  id: NonNullable<chrome.tabs.Tab['id']>;
  // Always present, as manifest includes "tabs" persmission
  title: NonNullable<chrome.tabs.Tab['title']>;
  // Always present, as manifest includes "tabs" persmission
  url: NonNullable<chrome.tabs.Tab['url']>;
}

type BaseRuntimeMessage<From extends string, Data> = {
  from: From;
  data: Data;
};

type MessageContent = BaseRuntimeMessage<'content', RoomEvent>;
type MessageJoin = BaseRuntimeMessage<'join', User>;
type MessagePopupShare = BaseRuntimeMessage<'popupShare', undefined>;
type MessagePopupOpenVideo = BaseRuntimeMessage<'popupOpenVideo', { url: string }>;
type MessageGetUser = BaseRuntimeMessage<'getUser', undefined>;
type MessageGetStatus = BaseRuntimeMessage<'getStatus', undefined>;
type MessageGetUserList = BaseRuntimeMessage<'getUsersList', undefined>;
type MessageGetShare = BaseRuntimeMessage<'getShare', undefined>;
type MessageDisconnect = BaseRuntimeMessage<'disconnect', undefined>;
type MessageErrorOnEvent = BaseRuntimeMessage<'errorOnEvent', undefined>;

type RuntimeMessage =
  | MessageContent
  | MessageJoin
  | MessagePopupShare
  | MessagePopupOpenVideo
  | MessageGetUser
  | MessageGetStatus
  | MessageGetUserList
  | MessageGetShare
  | MessageDisconnect
  | MessageErrorOnEvent;

const debug = false;

const manifest = chrome.runtime.getManifest();

const isFirefox = __BROWSER__ === 'firefox';

const storageUserShape = { room: null, name: null } as const;

const defaultUrl = 'https://server.syncwatch.space/';

let user: User | undefined;

let socket: Socket<ServerToClientsEvents> | undefined;

let status: string = 'disconnect';

let list: UserList = [];

let syncTab: ChromeTab | undefined;

let share: Share | undefined;

let connectionUrl = defaultUrl;

const chromeProxy = {
  runtime: {
    // This method is only used to communicate with extension's popup, when popup is closed it fails sending a message to it.
    // We can ignore this error, because popup gets its state from background.js when it is opened.
    sendMessage: (message: unknown) => {
      if (isFirefox) {
        try {
          chrome.runtime.sendMessage(message);
          // eslint-disable-next-line no-empty
        } catch {}
      } else {
        chrome.runtime.sendMessage(message).catch(() => {});
      }
    },
  },
};

function isTabPropertiesPresent(tab: chrome.tabs.Tab): tab is ChromeTab {
  return !!tab.url && !!tab.title && !!tab.id;
}

function toInitialState() {
  list = [];
  syncTab = undefined;
  share = undefined;
}

function initConnectionUrl() {
  chrome.storage.sync.get('connectionUrl', (obj) => {
    if (!obj.connectionUrl) {
      chrome.storage.sync.set({ connectionUrl: defaultUrl });
    } else {
      connectionUrl = obj.connectionUrl;
    }
  });
}

function sendUserToPopup() {
  chrome.storage.sync.get(storageUserShape, (result) => {
    chromeProxy.runtime.sendMessage({ from: 'sendUser', data: result });
  });
}

function sendStatusToPopup() {
  chromeProxy.runtime.sendMessage({
    from: 'status',
    status,
  });
}

function setShare(newShare: typeof share) {
  if (newShare) share = newShare;
  sendShareToPopup();
}

function sendShareToPopup() {
  if (status === 'connect') {
    chromeProxy.runtime.sendMessage({ from: 'share', data: share });
  }
}

function sendUsersListToPopup() {
  chromeProxy.runtime.sendMessage({
    from: 'sendUsersList',
    list,
  });
}

function sendErrorToPopup(err: ErrorEvent) {
  chromeProxy.runtime.sendMessage({
    from: 'sendError',
    error: err,
  });
}

function broadcast(event: RoomEvent, senderTab: chrome.tabs.Tab) {
  if (status === 'connect' && syncTab && isTabPropertiesPresent(senderTab)) {
    if (syncTab.id === senderTab.id) {
      socket && socket.send(event);
    }
  }
}

function shareVideoLink(tab: typeof syncTab) {
  if (!tab) return;
  if (!user) return;

  const msg = {
    title: tab.title,
    url: tab.url,
    user: user.name,
  };
  setShare(msg);
  socket && socket.emit('share', msg);
}

function isContentScriptInjected(tab: ChromeTab) {
  return new Promise<void>((resolve) => {
    chrome.tabs.sendMessage(
      tab.id,
      {
        from: 'background',
        data: 'isContentScriptInjected',
      },
      (response) => {
        if (chrome.runtime.lastError || response !== true) resolve();
      },
    );
  });
}

function injectScriptInTabMV2(tab: ChromeTab) {
  isContentScriptInjected(tab).then(() => {
    chrome.tabs.executeScript(
      tab.id,
      {
        allFrames: true,
        file: 'js/content.js',
        runAt: 'document_end',
      },
      () => {
        const e = chrome.runtime.lastError;
        if (e) {
          console.warn('Injecting error: ', e.message);
        }
      },
    );
  });
}

function injectScriptInTabMV3(tab: ChromeTab) {
  isContentScriptInjected(tab).then(() => {
    chrome.scripting
      .executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ['js/content.js'],
      })
      .catch((e) => console.warn('Injecting error: ', e));
  });
}

function injectScriptInTab(tab: ChromeTab) {
  if (isFirefox) {
    injectScriptInTabMV2(tab);
  } else {
    injectScriptInTabMV3(tab);
  }
}

function setSyncTab(tab: chrome.tabs.Tab) {
  if (!isTabPropertiesPresent(tab)) return;
  syncTab = tab;
  if (tab) injectScriptInTab(tab);
}

function openVideo(url: string) {
  chrome.tabs.create({ url }, (tab) => {
    setSyncTab(tab);
  });
}

function createNotification(id: string, options: chrome.notifications.NotificationOptions<true>) {
  chrome.notifications.create(id, options);
  chrome.notifications.clear(id);
}

function errorOnEventNotification() {
  if (!isFirefox) {
    createNotification('Interact with page', {
      type: 'basic',
      iconUrl: '/icons/icon128.png',
      title: chrome.i18n.getMessage('notification_interact_title'),
      message: chrome.i18n.getMessage('notification_interact_message'),
      buttons: [
        {
          title: chrome.i18n.getMessage('notification_interact_button'),
        },
      ],
    });
  }
}

function onShareNotification(msg: Share) {
  const baseOptions = {
    type: 'basic',
    iconUrl: '/icons/icon128.png',
    title: `${msg.user} ${chrome.i18n.getMessage('notification_shared_title')}`,
    message: msg.title,
  } as const;

  let browserSpecificOptions;

  if (isFirefox) {
    browserSpecificOptions = {
      message: `${msg.title} (${msg.url})\n${chrome.i18n.getMessage(
        'notification_shared_firefox',
      )}`,
    };
  } else {
    browserSpecificOptions = {
      buttons: [
        {
          title: chrome.i18n.getMessage('notification_shared_button'),
        },
      ],
      contextMessage: msg.url,
    };
  }

  const options = { ...baseOptions, ...browserSpecificOptions };

  createNotification('Share', options);
}

function onAfkNotification() {
  createNotification('afk', {
    type: 'basic',
    iconUrl: '/icons/icon128.png',
    title: chrome.i18n.getMessage('notification_afk_title'),
    message: chrome.i18n.getMessage('notification_afk_message'),
  });
}

function onErrorNotification(errorMessage: ErrorEvent) {
  createNotification('error', {
    type: 'basic',
    iconUrl: '/icons/icon128.png',
    title: 'Error',
    message: errorMessage,
  });
}

function onNotificationClicked(notificationId: string) {
  if (notificationId === 'Share') {
    share && openVideo(share.url);
    chrome.notifications.clear('Share');
  }
  if (notificationId === 'Interact with page') {
    chrome.tabs.create({
      url: 'https://developers.google.com/web/updates/2017/09/autoplay-policy-changes',
    });
    chrome.notifications.clear('Interact with page');
  }
}

function initSocketEvents(socket: Socket) {
  const socketEvents = [
    'connect',
    'connect_error',
    'connect_timeout',
    'error',
    'disconnect',
    'reconnect',
    'reconnecting',
    'reconnect_error',
    'reconnect_failed',
  ];

  for (let i = 0; i < socketEvents.length; i++) {
    const event = socketEvents[i];
    socket.on(event, () => {
      status = event;
      sendStatusToPopup();
    });
  }

  socket.on('connect', () => {
    socket.emit('join', user);
  });
}

function initSockets() {
  socket = io(connectionUrl, {
    reconnection: true,
    reconnectionDelayMax: 10000,
    reconnectionDelay: 5000,
    reconnectionAttempts: 5,
    transports: ['websocket'],
  });

  initSocketEvents(socket);

  socket.on('usersList', (msg) => {
    // eslint-disable-next-line prefer-destructuring
    list = msg.list;
    sendUsersListToPopup();
  });

  socket.on('message', (msg) => {
    if (syncTab) {
      chrome.tabs.sendMessage(syncTab.id, {
        from: 'background',
        data: msg,
      });
      if (debug) console.log(`socket.on: ${msg.type}`);
    }
  });

  socket.on('share', (msg) => {
    if (!share || share.url !== msg.url) onShareNotification(msg);
    if (share && share.url !== msg.url) syncTab = undefined;
    setShare(msg);
  });

  socket.on('afk', () => {
    onAfkNotification();
    socket && socket.disconnect();
  });

  socket.on('error', (msg) => {
    sendErrorToPopup(msg);
    onErrorNotification(msg);
  });
}

function storageUser(user: User) {
  chrome.storage.sync.set(user);
}

chrome.notifications.onButtonClicked.addListener(onNotificationClicked);
chrome.notifications.onClicked.addListener(onNotificationClicked);

chrome.tabs.onUpdated.addListener((_, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    if (share) {
      if (tab.url === share.url) {
        setSyncTab(tab);
      }
    }
  }
});

chrome.storage.onChanged.addListener((storage) => {
  if (storage.connectionUrl) {
    connectionUrl = storage.connectionUrl.newValue;
    if (status === 'connect') {
      socket && socket.disconnect();
      toInitialState();
      initSockets();
    }
  }
});

chrome.runtime.onMessage.addListener((msg: RuntimeMessage, sender) => {
  switch (msg.from) {
    case 'content': {
      sender.tab && broadcast(msg.data, sender.tab);
      break;
    }
    case 'join': {
      user = msg.data;
      storageUser(msg.data);

      if (status === 'disconnect') {
        status = 'connecting...';
        initSockets();
      }
      break;
    }
    case 'popupShare': {
      chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        setSyncTab(tabs[0]);
        shareVideoLink(syncTab);
      });
      break;
    }
    case 'popupOpenVideo': {
      openVideo(msg.data.url);
      break;
    }
    case 'getUser': {
      sendUserToPopup();
      break;
    }
    case 'getStatus': {
      sendStatusToPopup();
      break;
    }
    case 'getUsersList': {
      sendUsersListToPopup();
      break;
    }
    case 'getShare': {
      sendShareToPopup();
      break;
    }
    case 'disconnect': {
      socket && socket.disconnect();
      break;
    }
    case 'errorOnEvent': {
      errorOnEventNotification();
      break;
    }
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('connectionUrl', (obj) => {
    if (!obj.connectionUrl) return;
    if (obj.connectionUrl.match('syncevent.herokuapp.com')) {
      chrome.storage.sync.set({ connectionUrl: defaultUrl });
    }
    if (obj.connectionUrl.match('http://server.syncwatch.space')) {
      chrome.storage.sync.set({ connectionUrl: defaultUrl });
    }
  });
});

chrome.runtime.setUninstallURL(
  `https://docs.google.com/forms/d/e/1FAIpQLSd8Z6m6lAFwLk88WK8arSgMfIcJxhVROR3r64RlCo-Lfs_0rA/viewform?entry.435513449=${navigator.userAgent}&entry.126853255=${manifest.version}`,
);

initConnectionUrl();
