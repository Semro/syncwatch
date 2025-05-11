import {
  type ErrorEventSocket,
  type RoomEvent,
  type Share,
  SocketEvent,
  type User,
  type UserList,
} from 'syncwatch-types';

import type { Browser } from 'wxt/browser';

export interface ChromeTab extends Browser.tabs.Tab {
  id: NonNullable<Browser.tabs.Tab['id']>;
  // Always present, as manifest includes "tabs" persmission
  title: NonNullable<Browser.tabs.Tab['title']>;
  // Always present, as manifest includes "tabs" persmission
  url: NonNullable<Browser.tabs.Tab['url']>;
}

type BaseRuntimeMessage<From extends string, Data = {}> = {
  from: From;
} & Data;

const MessageNameContent = {
  // TODO same as backgroundRoomEvent
  contentRoomEvent: 'contentRoomEvent',
  // TODO same as popupErrorOnEvent
  contentErrorOnEvent: 'errorOnEvent',
} as const;

type MessageNameContentType = typeof MessageNameContent;

type MessageContentRoomEvent = BaseRuntimeMessage<
  MessageNameContentType['contentRoomEvent'],
  { data: RoomEvent }
>;
type MessageContentErrorOnEvent = BaseRuntimeMessage<MessageNameContentType['contentErrorOnEvent']>;

type MessageContent = MessageContentRoomEvent | MessageContentErrorOnEvent;

const MessageNamePopup = {
  popupJoin: 'popupJoin',
  popupShare: 'popupShare',
  popupOpenVideo: 'popupOpenVideo',
  popupGetUser: 'popupGetUser',
  popupGetStatus: 'popupGetStatus',
  popupGetUsersList: 'popupGetUsersList',
  popupGetShare: 'popupGetShare',
  popupDisconnect: 'popupDisconnect',
  popupErrorOnEvent: 'errorOnEvent',
} as const;

type MessageJoin = BaseRuntimeMessage<typeof MessageNamePopup.popupJoin, { data: User }>;
type MessagePopupShare = BaseRuntimeMessage<typeof MessageNamePopup.popupShare>;
type MessagePopupOpenVideo = BaseRuntimeMessage<
  typeof MessageNamePopup.popupOpenVideo,
  { data: { url: string } }
>;
type MessageGetUser = BaseRuntimeMessage<typeof MessageNamePopup.popupGetUser>;
type MessageGetStatus = BaseRuntimeMessage<typeof MessageNamePopup.popupGetStatus>;
type MessageGetUserList = BaseRuntimeMessage<typeof MessageNamePopup.popupGetUsersList>;
type MessageGetShare = BaseRuntimeMessage<typeof MessageNamePopup.popupGetShare>;
type MessageDisconnect = BaseRuntimeMessage<typeof MessageNamePopup.popupDisconnect>;
type MessageErrorOnEvent = BaseRuntimeMessage<typeof MessageNamePopup.popupErrorOnEvent>;

type MessagesPopup =
  | MessageJoin
  | MessagePopupShare
  | MessagePopupOpenVideo
  | MessageGetUser
  | MessageGetStatus
  | MessageGetUserList
  | MessageGetShare
  | MessageDisconnect
  | MessageErrorOnEvent;

const MessageNameBackground = {
  backgroundStatus: 'backgroundStatus',
  backgroundShare: 'backgroundShare',
  backgroundSendUsersList: 'backgroundSendUsersList',
  backgroundSendError: 'backgroundSendError',
  backgroundSendUser: 'backgroundSendUser',
  backgroundRoomEvent: 'backgroundRoomEvent',
} as const;

type MessageStatus = BaseRuntimeMessage<
  typeof MessageNameBackground.backgroundStatus,
  { status: SocketEvent }
>;
type MessageShare = BaseRuntimeMessage<
  typeof MessageNameBackground.backgroundShare,
  { data: Share | undefined }
>;
type MessageSendUsersList = BaseRuntimeMessage<
  typeof MessageNameBackground.backgroundSendUsersList,
  { list: UserList }
>;
type MessageSendError = BaseRuntimeMessage<
  typeof MessageNameBackground.backgroundSendError,
  { error: ErrorEventSocket }
>;
type MessageSendUser = BaseRuntimeMessage<
  typeof MessageNameBackground.backgroundSendUser,
  { data: User }
>;
type MessageBackgroundRoomEvent = BaseRuntimeMessage<
  typeof MessageNameBackground.backgroundRoomEvent,
  { data: RoomEvent }
>;

type MessagesBackground =
  | MessagesPopup
  | MessageStatus
  | MessageShare
  | MessageSendUsersList
  | MessageSendError
  | MessageSendUser
  | MessageBackgroundRoomEvent;

export type RuntimeMessage = MessageContent | MessagesPopup | MessagesBackground;

export const RuntimeMessageName = {
  ...MessageNameContent,
  ...MessageNameBackground,
  ...MessageNamePopup,
};

export type RuntimeMessageNames = (typeof RuntimeMessageName)[keyof typeof RuntimeMessageName];
