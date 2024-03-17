const roomElement = document.getElementById('room');
const nameElement = document.getElementById('name');
const connectElement = document.getElementById('connect');
const shareElement = document.getElementById('share');
const sharedElement = document.getElementById('shared');
const usersListTitle = document.getElementById('usersListTitle');
const usersList = document.getElementById('usersList');
const errorElement = document.getElementById('error');

function getData(type) {
  chrome.runtime.sendMessage({
    from: `get${type}`,
  });
}

function getFaviconFromUrl(url) {
  let position = 0;
  for (let i = 0; i < 3; i++) {
    position = url.indexOf('/', position);
    position++;
  }
  return `${url.substring(0, position)}favicon.ico`;
}

function displayElements(display) {
  shareElement.style.display = display;
  usersListTitle.style.display = display;
  usersList.style.display = display;
}

shareElement.onclick = () => {
  chrome.runtime.sendMessage({ from: 'popupShare' });
};

sharedElement.onclick = () => {
  chrome.runtime.sendMessage({ from: 'popupOpenVideo', data: { url: sharedElement.href } });
  return false;
};

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.from === 'status') {
    if (msg.status === 'connect') {
      connectElement.value = chrome.i18n.getMessage('popup_button_disconnect');
      connectElement.onclick = () => {
        chrome.runtime.sendMessage({ from: 'disconnect' });
      };
      displayElements('block');
    } else {
      connectElement.value = chrome.i18n.getMessage('popup_button_connect');
      connectElement.onclick = () => {
        errorElement.style.display = 'none';
        const user = {
          name: nameElement.value,
          room: roomElement.value,
        };
        chrome.runtime.sendMessage({ from: 'join', data: user });
        connectElement.value = `${chrome.i18n.getMessage('popup_button_connecting')}...`;
      };
      displayElements('none');
      sharedElement.style.display = 'none';
    }
    document.getElementById('status').innerText = `${chrome.i18n.getMessage('popup_status')}:\
													   ${chrome.i18n.getMessage(`socket_event_${msg.status}`)}`;
  }
  if (msg.from === 'share') {
    if (msg.data !== null) {
      sharedElement.href = msg.data.url;
      sharedElement.innerText = '';
      const img = document.createElement('img');
      const span = document.createElement('span');
      img.style.height = '16px';
      img.src = getFaviconFromUrl(msg.data.url);
      span.innerText = msg.data.title;
      sharedElement.appendChild(img);
      sharedElement.appendChild(span);
      sharedElement.style.display = 'block';
    }
  }
  if (msg.from === 'sendUsersList') {
    usersList.innerText = '';
    for (const key in msg.list) {
      const li = document.createElement('li');
      li.innerText = msg.list[key];
      usersList.appendChild(li);
    }
  }
  if (msg.from === 'sendError') {
    errorElement.style.display = 'block';
    errorElement.innerText = chrome.i18n.getMessage(msg.error);
  }
  if (msg.from === 'sendUser' && msg.data) {
    nameElement.value = msg.data.name;
    roomElement.value = msg.data.room;
  }
});

nameElement.placeholder = chrome.i18n.getMessage('popup_input_name');
roomElement.placeholder = chrome.i18n.getMessage('popup_input_room');
shareElement.value = chrome.i18n.getMessage('popup_button_share');
usersListTitle.innerText = `${chrome.i18n.getMessage('popup_usersInRoom')}:`;

const typesOfData = ['User', 'Status', 'UsersList', 'Share'];
for (const val of typesOfData) getData(val);
