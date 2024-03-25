export interface User {
  name: string;
  room: string;
}

export type UserList = User['name'][];

export interface Share {
  title: string;
  url: string;
  user: string;
}

const MediaPlayerEvents = ['play', 'pause', 'seeked', 'ratechange'] as const;

type MediaPlayerEvent = (typeof MediaPlayerEvents)[number];

export interface RoomEvent {
  location: string;
  type: MediaPlayerEvent;
  element: number;
  currentTime: number;
  playbackRate: number;
}

export type ErrorEventSocket = string;

export interface ServerToClientsEvents {
  usersList: (msg: { list: UserList }) => void;
  message: (msg: RoomEvent) => void;
  share: (msg: Share) => void;
  afk: () => void;
  error: (msg: ErrorEventSocket) => void;
}

export interface ClientToServerEvents {
  share: ServerToClientsEvents['share'];
  join: (msg: User) => void;
  message: ServerToClientsEvents['message'];
}
