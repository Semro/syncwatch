import { Share, User, UserList } from '../../../syncwatch-types/types';

type BaseRuntimeMessage<From extends string> = {
  from: From;
};

type MessageStatus = BaseRuntimeMessage<'status'> & { status: string };
type MessageShare = BaseRuntimeMessage<'share'> & { data: Share | undefined };
type MessageSendUsersList = BaseRuntimeMessage<'sendUsersList'> & { list: UserList };
type MessageSendError = BaseRuntimeMessage<'sendError'> & { error: string };
type MessageSendUser = BaseRuntimeMessage<'sendUser'> & { data: User };

type RuntimeMessage =
  | MessageStatus
  | MessageShare
  | MessageSendUsersList
  | MessageSendError
  | MessageSendUser;

const roomInputElement = document.getElementById('room') as HTMLInputElement;
const nameInputElement = document.getElementById('name') as HTMLInputElement;
const connectButtonElement = document.getElementById('connect') as HTMLInputElement;
const shareInputElement = document.getElementById('share') as HTMLInputElement;
const shareAnchorElement = document.getElementById('shared') as HTMLAnchorElement;
const usersListTitleElement = document.getElementById('usersListTitle') as HTMLDivElement;
const usersListElement = document.getElementById('usersList') as HTMLElement;
const errorElement = document.getElementById('error') as HTMLDivElement;
const statusElement = document.getElementById('status') as HTMLDivElement;

function getData(type: string) {
  chrome.runtime.sendMessage({
    from: `get${type}`,
  });
}

function getFaviconFromUrl(url: string) {
  let position = 0;
  for (let i = 0; i < 3; i++) {
    position = url.indexOf('/', position);
    position++;
  }
  return `${url.substring(0, position)}favicon.ico`;
}

function displayElements(display: string) {
  shareInputElement.style.display = display;
  usersListTitleElement.style.display = display;
  usersListElement.style.display = display;
}

shareInputElement.onclick = () => {
  chrome.runtime.sendMessage({ from: 'popupShare' });
};

shareAnchorElement.onclick = () => {
  chrome.runtime.sendMessage({ from: 'popupOpenVideo', data: { url: shareAnchorElement.href } });
  return false;
};

chrome.runtime.onMessage.addListener((msg: RuntimeMessage) => {
  if (msg.from === 'status') {
    if (msg.status === 'connect') {
      connectButtonElement.value = chrome.i18n.getMessage('popup_button_disconnect');
      connectButtonElement.onclick = () => {
        chrome.runtime.sendMessage({ from: 'disconnect' });
      };
      displayElements('block');
    } else {
      connectButtonElement.value = chrome.i18n.getMessage('popup_button_connect');
      connectButtonElement.onclick = () => {
        errorElement.style.display = 'none';
        const user = {
          name: nameInputElement.value,
          room: roomInputElement.value,
        };
        chrome.runtime.sendMessage({ from: 'join', data: user });
        connectButtonElement.value = `${chrome.i18n.getMessage('popup_button_connecting')}...`;
      };
      displayElements('none');
      shareAnchorElement.style.display = 'none';
    }
    statusElement.innerText = `${chrome.i18n.getMessage('popup_status')}:\
													   ${chrome.i18n.getMessage(`socket_event_${msg.status}`)}`;
  }
  if (msg.from === 'share') {
    if (msg.data) {
      shareAnchorElement.href = msg.data.url;
      shareAnchorElement.innerText = '';
      const img = document.createElement('img');
      const span = document.createElement('span');
      img.style.height = '16px';
      img.src = getFaviconFromUrl(msg.data.url);
      span.innerText = msg.data.title;
      shareAnchorElement.appendChild(img);
      shareAnchorElement.appendChild(span);
      shareAnchorElement.style.display = 'block';
    }
  }
  if (msg.from === 'sendUsersList') {
    usersListElement.innerText = '';
    for (const user of Object.values(msg.list)) {
      const li = document.createElement('li');
      li.innerText = user;
      usersListElement.appendChild(li);
    }
  }
  if (msg.from === 'sendError') {
    errorElement.style.display = 'block';
    errorElement.innerText = chrome.i18n.getMessage(msg.error);
  }
  if (msg.from === 'sendUser' && msg.data) {
    nameInputElement.value = msg.data.name;
    roomInputElement.value = msg.data.room;
  }
});

nameInputElement.placeholder = chrome.i18n.getMessage('popup_input_name');
roomInputElement.placeholder = chrome.i18n.getMessage('popup_input_room');
shareInputElement.value = chrome.i18n.getMessage('popup_button_share');
usersListTitleElement.innerText = `${chrome.i18n.getMessage('popup_usersInRoom')}:`;

const typesOfData = ['User', 'Status', 'UsersList', 'Share'];
for (const val of typesOfData) getData(val);
