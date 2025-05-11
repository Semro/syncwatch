import fs from 'fs';
import http from 'http';
import express from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Server } from 'socket.io';

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { serverError } from 'syncwatch-types';
import type {
  ClientToServerEvents,
  RoomEvent,
  ServerToClientsEvents,
  Share,
  User,
} from 'syncwatch-types';
import type { SocketId } from '../../node_modules/socket.io-adapter/dist/in-memory-adapter.d.ts';

const debug = false;
const logs = false;

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientsEvents>(server);

const afkTime = 60 * 60000; // first number in minutes
const printStatusTime = 30 * 60000; // first number in minutes
const errorFilePath = `${__dirname}/error.log`;
const serverPort = 8080;

const rooms: Map<User['room'], Room> = new Map();
const roomid: Map<SocketId, Room> = new Map();

const PORT = process.env.PORT || serverPort;

server.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});

app.get('/', (_, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('server is running! (nodejs)');
});

const rateLimiterOptions = {
  points: 10, // 6 points
  duration: 1, // Per second
  blockDuration: 15, // Block duration in seconds
} as const;

const rateLimiter = new RateLimiterMemory(rateLimiterOptions);

function printStatus() {
  if (roomid.size !== 0 && logs) {
    setInterval(() => {
      console.log(`${roomid.size} user(s), ${rooms.size} room(s)`);
    }, printStatusTime);
  }
}

function checkUserNameAndRoom(data: User) {
  if (!data.name || data.name.trim() === '') return serverError['socket_error_write_name'];
  if (data.name.length < 2 || data.name.length > 24) return serverError['socket_error_name_length'];
  if (!data.room || data.room.trim() === '') return serverError['socket_error_write_room'];
  if (data.room.length < 2 || data.room.length > 24) return serverError['socket_error_room_length'];
  return null;
}

class Room {
  name: User['room'];
  event: RoomEvent | null;
  timeUpdated: number | null;
  users: Map<SocketId, User['name']>;
  share: Share | null;
  afkTimer: NodeJS.Timeout | null;

  constructor(name: User['room']) {
    this.name = name;
    this.event = null;
    this.timeUpdated = null;
    this.users = new Map();
    this.share = null;
    this.afkTimer = null;
  }

  addUser(socketID: SocketId, name: User['name']) {
    this.users.set(socketID, name);

    this.setAfkTimer();
  }

  disconnectUser(socketID: SocketId) {
    if (debug) console.log(`${this.name}: ${this.getUserName(socketID)} disconnected`);
    this.users.delete(socketID);

    this.setAfkTimer();
  }

  disconnectAfk(users: typeof this.users) {
    users.forEach((_, user) => io.in(user).emit('afk'));
  }

  getUserName(socketID: SocketId) {
    return this.users.get(socketID);
  }

  getUsersNames() {
    return this.users.values().toArray().sort();
  }

  nullUsers() {
    return this.users.size === 0;
  }

  setAfkTimer() {
    if (this.users.size === 1) {
      this.afkTimer = setTimeout(this.disconnectAfk, afkTime, this.users);
    } else {
      this.afkTimer && clearTimeout(this.afkTimer);
    }
  }
}

function consoleOutputError(message: Error) {
  const date = new Date().toString();
  const errorString = `${date} | caught exception: ${message}\n`;
  console.log(errorString);
  return errorString;
}

process.on('uncaughtException', (err) => {
  const errorLogFileStream = fs.createWriteStream(errorFilePath, { flags: 'a' });

  errorLogFileStream.on('error', (errFileStream) => {
    consoleOutputError(errFileStream);
  });

  errorLogFileStream.write(consoleOutputError(err), () => {
    process.exit(1);
  });
});

printStatus();

io.on('connection', (socket) => {
  socket.onAny(() => {
    rateLimiter.consume(socket.id).catch(() => {
      socket.emit('error', serverError['socket_error_too_many_requests']);
      socket.disconnect();
    });
  });

  socket.on('join', (data) => {
    const err = checkUserNameAndRoom(data);
    if (err) {
      socket.emit('error', err);
      socket.disconnect();
      if (debug) console.log(`Error join: ${err}`);
      return;
    }

    socket.join(data.room);
    let room = rooms.get(data.room);
    if (room) {
      room.addUser(socket.id, data.name);
      io.in(room.name).emit('usersList', { list: room.getUsersNames() });
      if (room.share !== null) socket.emit('share', room.share);
      if (room.users.size > 1 && room.timeUpdated !== null && room.event) {
        room.event.currentTime =
          room.event.type === 'play'
            ? room.event.currentTime + (Date.now() - room.timeUpdated) / 1000
            : room.event.currentTime;
        // Time is about second earlier then needed
        socket.send(room.event);
      }
    } else {
      room = new Room(data.room);
      room.addUser(socket.id, data.name);
      rooms.set(data.room, room);
      socket.emit('usersList', { list: room.getUsersNames() });
    }
    roomid.set(socket.id, room);

    if (debug) console.log(`connected: ${roomid.size} ${JSON.stringify(data)}`);
  });

  socket.on('message', (msg) => {
    const room = roomid.get(socket.id);
    if (!room) return;

    room.event = msg;
    room.timeUpdated = Date.now();
    socket.broadcast.to(room.name).emit('message', room.event);
    if (debug) console.log(`${room.name}: ${room.getUserName(socket.id)} ${JSON.stringify(msg)}`);
  });

  socket.on('share', (msg) => {
    const room = roomid.get(socket.id);
    if (!room) return;

    room.share = msg;
    socket.broadcast.to(room.name).emit('share', room.share);
    if (debug) console.log(`${room.name} shared ${JSON.stringify(msg)}`);
  });

  socket.on('disconnect', () => {
    const room = roomid.get(socket.id);
    if (room !== undefined) {
      room.disconnectUser(socket.id);
      io.sockets.in(room.name).emit('usersList', { list: room.getUsersNames() });
      if (room.nullUsers()) {
        rooms.delete(room.name);
        roomid.delete(socket.id);
      }
      if (rooms.size === 0) {
        if (logs) console.log('All authorized users disconnected!');
      }
    }
  });
});
