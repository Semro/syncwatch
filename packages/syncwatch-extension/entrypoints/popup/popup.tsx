import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

import '@/css/ui.css';

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

const typesOfData = ['User', 'Status', 'UsersList', 'Share'];

function Popup() {
  const [connectButtonValue, setConnectButtonValue] = useState(
    chrome.i18n.getMessage('popup_button_disconnect'),
  );
  const [connectionStatus, setConnectionStatus] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [share, setShare] = useState<Share | undefined>(undefined);
  const [user, setUser] = useState<User | undefined>(undefined);
  const [users, setUsers] = useState<UserList>([]);

  const isConnected = connectButtonValue === chrome.i18n.getMessage('popup_button_disconnect');

  function onClickShare() {
    chrome.runtime.sendMessage({ from: 'popupShare' });
  }

  function onClickVideoLink(event) {
    if (share) {
      chrome.runtime.sendMessage({ from: 'popupOpenVideo', data: { url: share.url } });
    }
    event.preventDefault();
  }

  function onClickConnect() {
    if (isConnected) {
      chrome.runtime.sendMessage({ from: 'disconnect' });
    } else {
      chrome.runtime.sendMessage({ from: 'join', data: user });
      setConnectButtonValue(`${chrome.i18n.getMessage('popup_button_connecting')}...`);
      setConnectionError('');
    }
  }

  useEffect(() => {
    for (const val of typesOfData) getData(val);

    chrome.runtime.onMessage.addListener((msg: RuntimeMessage) => {
      if (msg.from === 'status') {
        if (msg.status === 'connect') {
          setConnectButtonValue(chrome.i18n.getMessage('popup_button_disconnect'));
        } else {
          setConnectButtonValue(chrome.i18n.getMessage('popup_button_connect'));
          setUsers([]);
          setShare(undefined);
        }
        setConnectionStatus(chrome.i18n.getMessage(`socket_event_${msg.status}`));
      }
      if (msg.from === 'share') {
        if (msg.data) {
          setShare(msg.data);
        }
      }
      if (msg.from === 'sendUsersList') {
        setUsers(msg.list);
      }
      if (msg.from === 'sendError') {
        setConnectionError(chrome.i18n.getMessage(msg.error));
      }
      if (msg.from === 'sendUser' && msg.data) {
        setUser(msg.data);
      }
    });
  }, []);

  return (
    <div id="main">
      <div className="block" id="logo">
        SyncWatch
      </div>
      <input
        className="block"
        id="name"
        type="text"
        name="name"
        defaultValue={user?.room}
        placeholder={chrome.i18n.getMessage('popup_input_name')}
        onChange={(ev) => user && setUser({ ...user, name: ev.target.value })}
      />
      <input
        className="block"
        id="room"
        type="text"
        name="room"
        defaultValue={user?.room}
        placeholder={chrome.i18n.getMessage('popup_input_room')}
        onChange={(ev) => user && setUser({ ...user, room: ev.target.value })}
      />
      {connectionError && (
        <div className="block" id="error">
          {connectionError}
        </div>
      )}
      {isConnected && (
        <input
          className="block button"
          id="share"
          type="button"
          name="share"
          value={chrome.i18n.getMessage('popup_button_share')}
          onClick={onClickShare}
        />
      )}
      {share && (
        <a
          className="block"
          id="shared"
          href={share.url}
          target="_blank"
          onClick={onClickVideoLink}
        >
          <img src={getFaviconFromUrl(share.url)} width="16px" height="16px" />
          <span>{share.title}</span>
        </a>
      )}
      {users.length > 0 && (
        <>
          <div className="block" id="usersListTitle">
            {`${chrome.i18n.getMessage('popup_usersInRoom')}:`}
          </div>
          <ul id="usersList">
            {users.map((user) => (
              <li key={user}>{user}</li>
            ))}
          </ul>
        </>
      )}
      <div className="block" id="status">
        {`${chrome.i18n.getMessage('popup_status')}: ${connectionStatus}`}
      </div>
      <input
        className="block button"
        id="connect"
        type="button"
        name="connect"
        value={connectButtonValue}
        onClick={onClickConnect}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
