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

const MediaPlayerEvents = ['play', 'pause', 'seeked'] as const;

type MediaPlayerEvent = (typeof MediaPlayerEvents)[number];

export const socketEvents = [
  'connect',
  'connect_error',
  'connect_timeout',
  'error',
  'disconnect',
  'reconnect',
  'reconnecting',
  'reconnect_error',
  'reconnect_failed',
] as const;

export type SocketEvent = (typeof socketEvents)[number];

export const serverError = {
  socket_error_write_name: 'socket_error_write_name',
  socket_error_name_length: 'socket_error_name_length',
  socket_error_write_room: 'socket_error_write_room',
  socket_error_room_length: 'socket_error_room_length',
  socket_error_too_many_requests: 'socket_error_too_many_requests',
} as const;

export type ErrorEventSocket = (typeof serverError)[keyof typeof serverError];

export interface RoomEvent {
  location: string;
  type: MediaPlayerEvent;
  element: number;
  currentTime: number;
  playbackRate: number;
}

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
