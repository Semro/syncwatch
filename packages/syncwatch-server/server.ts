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

const afkTime = 60; // in minutes
const printStatusTime = 30; // in minutes
const errorFilePath = `${__dirname}/error.log`;
const serverPort = 8080;

let roomsLength = 0;
let rooms: Record<User['room'], Room> = {};
let roomid: Record<SocketId, Room> = {};
let countConnections = 0;

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
  if (countConnections !== 0) {
    if (logs)
      setInterval(() => {
        console.log(`${countConnections} user(s), ${roomsLength} room(s)`);
      }, printStatusTime * 60000);
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
  users: Record<SocketId, User['name']>;
  usersLength: number;
  share: Share | null;
  afkTimer: NodeJS.Timeout | null;

  constructor(name: User['room']) {
    this.name = name;
    this.event = null;
    this.timeUpdated = null;
    this.users = {};
    this.usersLength = 0;
    this.share = null;
    this.afkTimer = null;
  }

  addUser(socketID: SocketId, name: User['name']) {
    if (this.users[socketID] === undefined) {
      this.users[socketID] = name;
      this.usersLength++;
    }

    this.setAfkTimer();
  }

  disconnectUser(socketID: SocketId) {
    if (debug) console.log(`${this.name}: ${this.getUser(socketID)} disconnected`);
    delete this.users[socketID];
    this.usersLength--;

    this.setAfkTimer();
  }

  disconnectAfk(users: typeof this.users) {
    for (const user in users) {
      io.in(user).emit('afk');
    }
  }

  getUser(socketID: SocketId) {
    return this.users[socketID];
  }

  getUsersNames() {
    return Object.values(this.users).sort();
  }

  nullUsers() {
    if (!this.usersLength) return true;
    return false;
  }

  setAfkTimer() {
    if (this.usersLength === 1) {
      this.afkTimer = setTimeout(this.disconnectAfk, afkTime * 60000, this.users);
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
  countConnections++;
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
    let room = rooms[data.room];
    if (room) {
      room.addUser(socket.id, data.name);
      io.in(room.name).emit('usersList', { list: room.getUsersNames() });
      if (room.share !== null) socket.emit('share', room.share);
      if (room.usersLength > 1 && room.timeUpdated !== null && room.event) {
        room.event.currentTime =
          room.event.type === 'play'
            ? room.event.currentTime + (Date.now() - room.timeUpdated) / 1000
            : room.event.currentTime;
        // Time is about second earlier then needed
        socket.send(room.event);
      }
    } else {
      room = new Room(data.room);
      roomsLength++;
      room.addUser(socket.id, data.name);
      rooms[data.room] = room;
      socket.emit('usersList', { list: room.getUsersNames() });
    }
    roomid[socket.id] = room;

    if (debug) console.log(`connected: ${countConnections} ${JSON.stringify(data)}`);
  });

  socket.on('message', (msg) => {
    const room = roomid[socket.id];
    if (!room) return;

    room.event = msg;
    room.timeUpdated = Date.now();
    socket.broadcast.to(room.name).emit('message', room.event);
    if (debug) console.log(`${room.name}: ${room.getUser(socket.id)} ${JSON.stringify(msg)}`);
  });

  socket.on('share', (msg) => {
    const room = roomid[socket.id];
    if (!room) return;

    room.share = msg;
    socket.broadcast.to(room.name).emit('share', room.share);
    if (debug) console.log(`${room.name} shared ${JSON.stringify(msg)}`);
  });

  socket.on('disconnect', () => {
    const room = roomid[socket.id];
    if (room !== undefined) {
      room.disconnectUser(socket.id);
      io.sockets.in(room.name).emit('usersList', { list: room.getUsersNames() });
      if (room.nullUsers()) {
        delete rooms[room.name];
        delete roomid[socket.id];
        roomsLength--;
      }
      if (roomsLength === 0) {
        rooms = {};
        roomid = {};
        if (logs) console.log('All authorized users disconnected!');
      }
    }
    // else console.log('try disconnect undefined user');

    countConnections--;
  });
});
