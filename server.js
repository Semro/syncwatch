const debug = false;
const logs = false;

const express = require('express')();
const server = require('http').createServer(express);
const io = require('socket.io')(server, {
  allowEIO3: true,
  cors: {
    origin: false,
    methods: ['GET', 'POST'],
  },
});
const http = require('http');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const errorLogFile = fs.createWriteStream(__dirname + '/error.log', { flags: 'a' });

const wakeServerTime = 20; // in minutes
const afkTime = 60; // in minutes
const printStatusTime = 30; // in minutes

let roomsLength = 0;
let rooms = [];
let roomid = [];
let countConnections = 0;

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});

const rateLimiterOptions = {
  points: 10, // 6 points
  duration: 1, // Per second
  blockDuration: 15, // Block duration in seconds
};

const rateLimiter = new RateLimiterMemory(rateLimiterOptions);

function printStatus() {
  if (countConnections !== 0) {
    if (logs)
      setInterval(() => {
        console.log(`${countConnections} user(s), ${roomsLength} room(s)`);
      }, printStatusTime * 60000);
  }
}

function wakeServer(status) {
  if (status) {
    setInterval(() => {
      http.get('http://syncevent.herokuapp.com');
    }, wakeServerTime * 60000);
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

process.on('uncaughtException', (err) => {
  let date = new Date().toString();
  let errorString = `${date} | caught exception: ${err}\n`;

  console.log(errorString);
  if (debug) errorLogFile.write(errorString);

  process.exit(1);
});

wakeServer(process.env.HEROKU ? true : false);

printStatus();

io.on('connection', (socket) => {
  countConnections++;
  socket.onAny((event, data) => {
    // console.log(event, data);
    rateLimiter.consume(socket.id).catch(() => {
      socket.emit('error', `Too many requests. Disconnected`);
      socket.disconnect();
    });
  });

  socket.on('join', (data) => {
    const err = checkUserNameAndRoom(data);
    if (err !== null) {
      socket.emit('error', err);
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

  socket.on('message', (msg) => {
    const room = roomid[socket.id];
    if (room !== undefined) {
      room.event = msg;
      room.timeUpdated = Date.now();
      socket.broadcast.to(room.name).emit('message', room.event);
      if (debug) console.log(`${room.name}: ${room.getUser(socket.id)} ${JSON.stringify(msg)}`);
    }
  });

  socket.on('share', (msg) => {
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
