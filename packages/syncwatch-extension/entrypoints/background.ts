import { type Socket, io } from 'socket.io-client';
import {
  type ClientToServerEvents,
  type ErrorEventSocket,
  type RoomEvent,
  type ServerToClientsEvents,
  type Share,
  type User,
  type UserList,
  socketEvents,
} from 'syncwatch-types';

export default defineBackground(() => {
  interface ChromeTab extends Browser.tabs.Tab {
    id: NonNullable<Browser.tabs.Tab['id']>;
    // Always present, as manifest includes "tabs" persmission
    title: NonNullable<Browser.tabs.Tab['title']>;
    // Always present, as manifest includes "tabs" persmission
    url: NonNullable<Browser.tabs.Tab['url']>;
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

  const manifest = browser.runtime.getManifest();

  const isFirefox = import.meta.env.FIREFOX;

  const storageUserShape = { room: null, name: null } as const;

  const defaultUrl = 'https://server.syncwatch.space/';

  let user: User | undefined;

  let socket: Socket<ServerToClientsEvents, ClientToServerEvents> | undefined;

  let status = 'disconnect';

  let list: UserList = [];

  let syncTab: ChromeTab | undefined;

  let share: Share | undefined;

  let connectionUrl = defaultUrl;

  const chromeProxy = {
    runtime: {
      sendMessage: async (message: unknown) => {
        try {
          await browser.runtime.sendMessage(message);
        } catch (e: unknown) {
          if (
            e instanceof Error &&
            e.message === 'Could not establish connection. Receiving end does not exist.'
          ) {
            return;
          } else {
            throw e;
          }
        }
      },
    },
  };

  function isTabPropertiesPresent(tab: Browser.tabs.Tab): tab is ChromeTab {
    return !!tab.url && !!tab.title && !!tab.id;
  }

  function toInitialState() {
    list = [];
    syncTab = undefined;
    share = undefined;
  }

  function initConnectionUrl() {
    browser.storage.sync.get('connectionUrl', (obj) => {
      if (!obj.connectionUrl) {
        browser.storage.sync.set({ connectionUrl: defaultUrl });
      } else {
        connectionUrl = obj.connectionUrl;
      }
    });
  }

  function sendUserToPopup() {
    browser.storage.sync.get(storageUserShape, (result) => {
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

  function sendErrorToPopup(err: ErrorEventSocket) {
    chromeProxy.runtime.sendMessage({
      from: 'sendError',
      error: err,
    });
  }

  function broadcast(event: RoomEvent, senderTab: Browser.tabs.Tab) {
    if (status === 'connect' && syncTab && isTabPropertiesPresent(senderTab)) {
      if (syncTab.id === senderTab.id) {
        if (socket) {
          socket.send(event);
        }
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
    if (socket) {
      socket.emit('share', msg);
    }
  }

  function setSyncTab(tab: Browser.tabs.Tab) {
    if (!isTabPropertiesPresent(tab)) return;
    syncTab = tab;
  }

  function openVideo(url: string) {
    browser.tabs.create({ url }, (tab) => {
      setSyncTab(tab);
    });
  }

  function createNotification(
    id: string,
    options: Browser.notifications.NotificationOptions<true>,
  ) {
    browser.notifications.create(id, options);
    browser.notifications.clear(id);
  }

  function errorOnEventNotification() {
    if (!isFirefox) {
      createNotification('Interact with page', {
        type: 'basic',
        iconUrl: '/icons/icon128.png',
        title: browser.i18n.getMessage('notification_interact_title'),
        message: browser.i18n.getMessage('notification_interact_message'),
        buttons: [
          {
            title: browser.i18n.getMessage('notification_interact_button'),
          },
        ],
      });
    }
  }

  function onShareNotification(msg: Share) {
    const baseOptions = {
      type: 'basic',
      iconUrl: '/icons/icon128.png',
      title: `${msg.user} ${browser.i18n.getMessage('notification_shared_title')}`,
      message: msg.title,
    } as const;

    let browserSpecificOptions;

    if (isFirefox) {
      browserSpecificOptions = {
        message: `${msg.title} (${msg.url})\n${browser.i18n.getMessage(
          'notification_shared_firefox',
        )}`,
      };
    } else {
      browserSpecificOptions = {
        buttons: [
          {
            title: browser.i18n.getMessage('notification_shared_button'),
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
      title: browser.i18n.getMessage('notification_afk_title'),
      message: browser.i18n.getMessage('notification_afk_message'),
    });
  }

  function onErrorNotification(errorMessage: ErrorEventSocket) {
    createNotification('error', {
      type: 'basic',
      iconUrl: '/icons/icon128.png',
      title: 'Error',
      message: browser.i18n.getMessage(errorMessage),
    });
  }

  function onNotificationClicked(notificationId: string) {
    if (notificationId === 'Share') {
      if (share) {
        openVideo(share.url);
      }
      browser.notifications.clear('Share');
    }
    if (notificationId === 'Interact with page') {
      browser.tabs.create({
        url: 'https://developers.google.com/web/updates/2017/09/autoplay-policy-changes',
      });
      browser.notifications.clear('Interact with page');
    }
  }

  function initSocketEvents(socket: Socket) {
    for (const event of socketEvents) {
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
        browser.tabs.sendMessage(syncTab.id, {
          from: 'background',
          data: msg,
        });
        if (debug) console.log(`socket.on: ${msg.type}`);
      }
    });

    socket.on('share', (msg) => {
      if (!share || share.url !== msg.url) {
        onShareNotification(msg);
      }
      if (share && share.url !== msg.url) {
        syncTab = undefined;
      }
      setShare(msg);
    });

    socket.on('afk', () => {
      onAfkNotification();
      if (socket) {
        socket.disconnect();
      }
    });

    socket.on('error', (msg) => {
      sendErrorToPopup(msg);
      onErrorNotification(msg);
    });
  }

  function storageUser(user: User) {
    browser.storage.sync.set(user);
  }

  browser.notifications.onButtonClicked.addListener(onNotificationClicked);
  browser.notifications.onClicked.addListener(onNotificationClicked);

  browser.tabs.onUpdated.addListener((_, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      if (share) {
        if (tab.url === share.url) {
          setSyncTab(tab);
        }
      }
    }
  });

  browser.storage.onChanged.addListener((changes) => {
    if (changes.connectionUrl?.newValue) {
      connectionUrl = changes.connectionUrl.newValue;
      if (status !== 'disconnect') {
        if (socket) {
          socket.disconnect();
        }
        toInitialState();
        initSockets();
      }
    }
  });

  browser.runtime.onMessage.addListener((msg: RuntimeMessage, sender) => {
    switch (msg.from) {
      case 'content': {
        if (sender.tab) {
          broadcast(msg.data, sender.tab);
        }
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
        browser.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
          const tab = tabs[0];
          if (tab) {
            setSyncTab(tab);
          }
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
        if (socket) {
          socket.disconnect();
        }
        break;
      }
      case 'errorOnEvent': {
        errorOnEventNotification();
        break;
      }
    }
  });

  browser.runtime.onInstalled.addListener(() => {
    browser.storage.sync.get('connectionUrl', (obj) => {
      if (!obj.connectionUrl) return;
      if (obj.connectionUrl.match('syncevent.herokuapp.com')) {
        browser.storage.sync.set({ connectionUrl: defaultUrl });
      }
      if (obj.connectionUrl.match('http://server.syncwatch.space')) {
        browser.storage.sync.set({ connectionUrl: defaultUrl });
      }
    });
  });

  browser.runtime.setUninstallURL(
    `https://docs.google.com/forms/d/e/1FAIpQLSd8Z6m6lAFwLk88WK8arSgMfIcJxhVROR3r64RlCo-Lfs_0rA/viewform?entry.435513449=${navigator.userAgent}&entry.126853255=${manifest.version}`,
  );

  initConnectionUrl();
});
