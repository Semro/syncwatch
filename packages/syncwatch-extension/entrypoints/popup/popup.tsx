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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [connectionError, setConnectionError] = useState('');
  const [share, setShare] = useState<Share | undefined>(undefined);
  const [user, setUser] = useState<User | undefined>(undefined);
  const [users, setUsers] = useState<UserList>([]);

  const isConnected = connectButtonValue === chrome.i18n.getMessage('popup_button_disconnect');

  function onClickShare() {
    chrome.runtime.sendMessage({ from: 'popupShare' });
  }

  function onClickVideoLink(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
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

  function updateConnectionStatus(newStatus: string) {
    if (newStatus === 'connected' || newStatus === 'disconnected') {
      setConnectionStatus(newStatus);
    } else {
      console.error(`Invalid status received: ${newStatus}`);
    }
  };

  function onRuntimeMessage(msg: RuntimeMessage) {
    if (msg.from === 'status') {
      if (msg.status === 'connect') {
        setConnectButtonValue(chrome.i18n.getMessage('popup_button_disconnect'));
      } else {
        setConnectButtonValue(chrome.i18n.getMessage('popup_button_connect'));
        setUsers([]);
        setShare(undefined);
      }
      updateConnectionStatus(chrome.i18n.getMessage(`socket_event_${msg.status}`));
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
  }

  useEffect(() => {
    chrome.runtime.onMessage.addListener(onRuntimeMessage);

    for (const val of typesOfData) getData(val);

    return () => {
      chrome.runtime.onMessage.removeListener(onRuntimeMessage);
    };
  }, []);

  return (
    <div id="main">
      <div className="block logo" id="logo">
        SyncWatch
      </div>
      <input
        className="block input"
        id="name"
        type="text"
        name="name"
        defaultValue={user?.name}
        placeholder={chrome.i18n.getMessage('popup_input_name')}
        onChange={(ev) => user && setUser({ ...user, name: ev.target.value })}
      />
      <input
        className="block input"
        id="room"
        type="text"
        name="room"
        defaultValue={user?.room}
        placeholder={chrome.i18n.getMessage('popup_input_room')}
        onChange={(ev) => user && setUser({ ...user, room: ev.target.value })}
      />
      {connectionError && (
        <div className="block error" id="error">
          {connectionError}
        </div>
      )}
      {isConnected && (
        <>
          <input
            className="block button"
            id="share"
            type="button"
            name="share"
            value={chrome.i18n.getMessage('popup_button_share')}
            onClick={onClickShare}
          />
          {share && (
            <a
              className="block shared"
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
            <div>
              <div className="block users-list-title" id="usersListTitle">
                {`${chrome.i18n.getMessage('popup_usersInRoom')}`}
              </div>
              <ul id="usersList">
                {users.map((user) => (
                  <li key={user}>{user}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <div className="block status" id="status">
        {`${chrome.i18n.getMessage('popup_status')}:`} <span style={connectionStatus === 'connected' ? { color: '#28a745', fontWeight: "900" } : { color: '#dc3545', fontWeight: "900" }}>{`${connectionStatus}`}</span>
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
