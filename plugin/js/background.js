const debug = false;

const manifest = chrome.runtime.getManifest();
const isFirefox = navigator.userAgent.indexOf('Firefox') > -1;
const isMobile =
  window.matchMedia &&
  window.matchMedia('only screen and (hover: none) and (pointer: coarse)').matches;
let user = {
  name: null,
  room: null,
  version: null,
  agent: null,
};
let socket = null;
let status = 'disconnect';
let list = [];
let syncTab = null;
let share = null;
const defaultUrl = 'https://server.syncwatch.space/';
let connectionUrl = defaultUrl;

function initConnectionUrl() {
  chrome.storage.sync.get('connectionUrl', (obj) => {
    if (obj.connectionUrl === undefined) {
      chrome.storage.sync.set({ connectionUrl: defaultUrl });
    } else {
      connectionUrl = obj.connectionUrl;
    }
  });
}

function sendUserToPopup() {
  new Promise((resolve) => {
    chrome.storage.sync.get(user, (result) => resolve(result));
  }).then((result) => {
    chrome.runtime.sendMessage({ from: 'sendUser', data: result });
  });
}

function sendStatusToPopup(newStatus) {
  if (newStatus !== undefined) status = newStatus;
  chrome.runtime.sendMessage({
    from: 'status',
    status,
  });
}

function sendShareToPopup(data) {
  if (status === 'connect') {
    if (data !== undefined) share = data;
    chrome.runtime.sendMessage({ from: 'share', data: share });
  }
}

function sendUsersListToPopup() {
  chrome.runtime.sendMessage({
    from: 'sendUsersList',
    list,
  });
}

function sendErrorToPopup(err) {
  chrome.runtime.sendMessage({
    from: 'sendError',
    error: err,
  });
}

function broadcast(event, senderTab) {
  if (status === 'connect' && syncTab !== null) {
    if (syncTab.url === senderTab.url) {
      socket.send(event);
    }
  }
}

function shareVideoLink(tab) {
  const msg = {
    title: tab.title,
    url: tab.url,
    user: user.name,
  };
  sendShareToPopup(msg);
  socket.emit('share', msg);
}

function isContentScriptInjected(tab) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tab.id,
      {
        from: 'background',
        data: 'isContentScriptInjected',
      },
      (response) => {
        if (chrome.runtime.lastError || response !== true) resolve();
      }
    );
  });
}

function injectScriptInTab(tab) {
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
        if (e !== undefined) {
          console.warn('Injecting error: ', e.message);
        }
      }
    );
  });
}

function setSyncTab(tab) {
  syncTab = tab;
  if (tab !== null) injectScriptInTab(tab);
}

function changeSyncTab() {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    if (share !== null && tabs.length !== 0) {
      if (tabs[0].url === share.url) {
        setSyncTab(tabs[0]);
      }
    }
  });
}

function createNotification(id, options) {
  chrome.notifications.create(id, options);
  chrome.notifications.clear(id);
}

function errorOnEventNotification() {
  if (!isFirefox) {
    createNotification('Interact with page', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
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

function onShareNotification(msg) {
  const options = {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `${msg.user} ${chrome.i18n.getMessage('notification_shared_title')}`,
    message: msg.title,
  };
  if (isFirefox) {
    options.message = `${msg.title} (${msg.url})\n${chrome.i18n.getMessage(
      'notification_shared_firefox'
    )}`;
  } else {
    options.buttons = [
      {
        title: chrome.i18n.getMessage('notification_shared_button'),
      },
    ];
    options.contextMessage = msg.url;
  }
  createNotification('Share', options);
}

function onAfkNotification() {
  createNotification('afk', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: chrome.i18n.getMessage('notification_afk_title'),
    message: chrome.i18n.getMessage('notification_afk_message'),
  });
}

function onErrorNotification(errorMessage) {
  createNotification('error', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Error',
    message: errorMessage,
  });
}

function onNotificationClicked(idNotification) {
  if (idNotification === 'Share') {
    chrome.tabs.create({ url: share.url });
    chrome.notifications.clear('Share');
  }
  if (idNotification === 'Interact with page') {
    chrome.tabs.create({
      url: 'https://developers.google.com/web/updates/2017/09/autoplay-policy-changes',
    });
    chrome.notifications.clear('Interact with page');
  }
}

function initSocketEvents() {
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
      sendStatusToPopup(event);
    });
  }

  socket.on('connect', () => {
    socket.emit('join', user);
  });

  socket.on('disconnect', () => {
    list = [];
    syncTab = null;
  });
}

function initSockets() {
  socket = io(connectionUrl, {
    reconnection: true,
    reconnectionDelayMax: 10000,
    reconnectionDelay: 5000,
    reconnectionAttempts: 5,
  });

  initSocketEvents();

  socket.on('usersList', (msg) => {
    // eslint-disable-next-line prefer-destructuring
    list = msg.list;
    sendUsersListToPopup();
  });

  socket.on('message', (msg) => {
    if (syncTab !== null) {
      chrome.tabs.sendMessage(syncTab.id, {
        from: 'background',
        data: msg,
      });
      if (debug) console.log(`socket.on: ${msg.type}`);
    }
  });

  socket.on('share', (msg) => {
    if (share === null || share.url !== msg.url) onShareNotification(msg);
    sendShareToPopup(msg);
    changeSyncTab();
  });

  socket.on('afk', () => {
    onAfkNotification();
    socket.disconnect();
  });

  socket.on('error', (msg) => {
    sendErrorToPopup(msg);
    onErrorNotification(msg);
  });
}

// eslint-disable-next-line no-shadow
function storageUser(user) {
  chrome.storage.sync.set(user);
}

chrome.notifications.onButtonClicked.addListener(onNotificationClicked);
chrome.notifications.onClicked.addListener(onNotificationClicked);

chrome.tabs.onUpdated.addListener((tabid, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    if (share !== null) {
      if (tab.url === share.url) {
        setSyncTab(tab);
      }
    }
  }
});

chrome.tabs.onActivated.addListener(() => {
  changeSyncTab();
});

if (!(isFirefox && isMobile)) {
  chrome.windows.onFocusChanged.addListener(() => {
    changeSyncTab();
  });
}

chrome.storage.onChanged.addListener((obj) => {
  if (obj.connectionUrl) {
    connectionUrl = obj.connectionUrl.newValue;
    if (status === 'connect') {
      socket.disconnect();
      list = [];
      syncTab = null;
      share = null;
      initSockets();
    }
  }
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  switch (msg.from) {
    case 'content': {
      broadcast(msg.data, sender.tab);
      break;
    }
    case 'join': {
      user = msg.data;
      storageUser(user);
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
      socket.disconnect();
      break;
    }
    case 'console': {
      console.log(msg.res);
      break;
    }
    case 'errorOnEvent': {
      errorOnEventNotification();
      break;
    }
  }
});

user.version = manifest.version;
user.agent = navigator.userAgent;

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
  `https://docs.google.com/forms/d/e/1FAIpQLSd8Z6m6lAFwLk88WK8arSgMfIcJxhVROR3r64RlCo-Lfs_0rA/viewform?entry.435513449=${user.agent}&entry.126853255=${user.version}`
);

initConnectionUrl();
