const debug = false;
const logs = false;

const express = require('express');
const socketIO = require('socket.io');
const http = require('http');

const PORT = process.env.PORT || 8080;
const server = express()
  .use(express.static(`${__dirname}/public`))
  .listen(PORT, () => {
    if (logs) console.log(`Listening on ${PORT}`);
  });
const io = socketIO(server);
const wakeServerTime = 20; // in minutes
const afkTime = 60; // in minutes

let roomsLength = 0;
let rooms = [];
let roomid = [];
let wake = false;
let countConnections = 0;

function printStatus() {
  if (countConnections !== 0) {
    if (logs) console.log(`${countConnections} user(s), ${roomsLength} room(s)`);
  }
}

function wakeServer(status) {
  if (status) {
    wake = setInterval(() => {
      if (!debug) http.get('http://syncevent.herokuapp.com');
      printStatus();
    }, wakeServerTime * 60000);
  } else {
    clearInterval(wake);
    wake = false;
  }
}

function checkUserNameAndRoom(data) {
  if (String(data.name) === '[object Object]' || String(data.room) === '[object Object]')
    return 'Dont try make subrooms :D';

  if (data.name === '' || data.name === undefined) return 'socket_error_write_name';
  if (data.name.length < 2 || data.name.length > 24) return 'socket_error_name_length';
  if (data.room === '' || data.name === undefined) return 'socket_error_write_room';
  if (data.room.length < 2 || data.room.length > 24) return 'socket_error_room_length';
  return null;
}

function disconnectAfk(users) {
  for (const user in users) {
    io.in(user).emit('afk');
  }
}
class Room {
  constructor(name) {
    this.name = name;
    this.event = null;
    this.timeUpdated = null;
    this.users = [];
    this.usersLength = 0;
    this.share = null;
    this.afkTimer = null;
  }

  addUser(socketID, name) {
    if (this.users[socketID] === undefined) {
      this.users[socketID] = name;
      this.usersLength++;
    }

    this.setAfkTimer();
  }

  disconnectUser(socketID) {
    if (debug) console.log(`${this.name}: ${this.getUser(socketID)} disconnected`);
    delete this.users[socketID];
    this.usersLength--;

    this.setAfkTimer();
  }

  getUser(socketID) {
    return this.users[socketID];
  }

  getUsersNames() {
    const list = [];
    for (const key in this.users) list.push(this.users[key]);
    return list.sort();
  }

  nullUsers() {
    if (!this.usersLength) return true;
    return false;
  }

  setAfkTimer() {
    if (this.usersLength === 1) {
      this.afkTimer = setTimeout(disconnectAfk, afkTime * 60000, this.users);
    } else {
      clearTimeout(this.afkTimer);
    }
  }
}

wakeServer(true);

io.on('connection', socket => {
  countConnections++;

  socket.on('join', data => {
    const err = checkUserNameAndRoom(data);
    if (err !== null) {
      socket.error(err);
      socket.disconnect();
      if (debug) console.log(`Error join: ${err}`);
    } else {
      socket.join(data.room);
      let room = rooms[data.room];
      if (room !== undefined) {
        room.addUser(socket.id, data.name);
        io.in(room.name).emit('usersList', { list: room.getUsersNames() });
        if (room.share !== null) socket.emit('share', room.share);
        if (room.usersLength > 1 && room.timeUpdated !== null) {
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
        socket.emit('usersList', { list: rooms[data.room].getUsersNames() });
      }
      roomid[socket.id] = room;

      if (debug) console.log(`connected: ${countConnections} ${JSON.stringify(data)}`);
    }
  });

  socket.on('message', msg => {
    const room = roomid[socket.id];
    if (room !== undefined) {
      room.event = msg;
      room.timeUpdated = Date.now();
      socket.broadcast.to(room.name).send(room.event);
      if (debug) console.log(`${room.name}: ${room.getUser(socket.id)} ${JSON.stringify(msg)}`);
    }
  });

  socket.on('share', msg => {
    const room = roomid[socket.id];
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
        rooms = [];
        roomid = [];
        if (global.gc) {
          gc();
          if (logs) console.log('Collected garbage!');
        }
        if (logs) console.log('All authorized users disconnected!');
      }
    }
    // else console.log('try disconnect undefined user');

    countConnections--;
  });
});
