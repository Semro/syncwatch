'use strict';

const express = require('express');
const socketIO = require('socket.io');
const http = require('http');

const PORT = process.env.PORT || 8080;

const server = express()
	.use(express.static(__dirname + '/public'))
	.listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socketIO(server);

var roomsLength = 0;
var rooms = [], roomid = [];
var wake = false;
var countConnections = 0;

function wakeServer(status)
{
	if (status)
	{
		if (!wake)
		{
			wake = setInterval(function()
			{
				if (process.env.PORT != undefined) http.get('http://syncevent.herokuapp.com');
				else http.get('http://localhost:8080');		
				console.log('Server waked!');
			}, 30 * 60000); // 30 minutes
		}
	}
	else
	{
		clearInterval(wake);
		wake = false;
	}
}

class Room
{
	constructor(name)
	{
		this.name = name;
		this.event = null;
		this.timeUpdated = null;
		this.users = [];
		this.usersLength = 0;
	}

	addUser(socket_id, name)
	{
		if (this.users[socket_id] === undefined)
		{
			this.users[socket_id] = name;
			this.usersLength++;
		}
	}

	disconnectUser(socket_id)
	{
		console.log(roomid[socket_id]+': '+rooms[roomid[socket_id]].getUser(socket_id)+' disconnected');
		delete this.users[socket_id];
		this.usersLength--;
	}

	getUser(socket_id)
	{
		return this.users[socket_id];
	}

	getUsersNames()
	{
		let list = [];
		for (let key in this.users) list.push(this.users[key]);
		return list.sort();
	}

	nullUsers()
	{
		if (!this.usersLength) return true;
		else return false;
	}
}

io.on('connection', function(socket)
{
	countConnections++;
	wakeServer(true);

	socket.on('join', function(data)
	{
		socket.join(data.room);
		roomid[socket.id] = data.room;
		if (rooms[data.room] != undefined)
		{
			rooms[data.room].addUser(socket.id, data.name);
			io.sockets.in(roomid[socket.id]).emit('userList', {'list': rooms[data.room].getUsersNames()});
			if (rooms[data.room].usersLength > 1 && rooms[data.room].timeUpdated != null)
			{
				rooms[data.room].event.currentTime = rooms[data.room].event.type === 'play' ? rooms[data.room].event.currentTime + (Date.now() - rooms[data.room].timeUpdated) / 1000 : rooms[data.room].event.currentTime;
				// Time is about second earlier then needed
				socket.send(rooms[data.room].event);
			}
		}
		else
		{
			let room = new Room(data.room);
			roomsLength++;
			room.addUser(socket.id, data.name);
			rooms[data.room] = room;
		}

		console.log('connected: '+JSON.stringify(data));
	});

	socket.on('message', function(msg)
	{
		if (rooms[roomid[socket.id]] != undefined)
		{
			rooms[roomid[socket.id]].event = msg;
			rooms[roomid[socket.id]].timeUpdated = Date.now();
			socket.broadcast.to(roomid[socket.id]).send(rooms[roomid[socket.id]].event);
			console.log(roomid[socket.id]+': '+rooms[roomid[socket.id]].getUser(socket.id)+' '+JSON.stringify(msg));
		}
	});

	socket.on('disconnect', function()
	{
		if (rooms[roomid[socket.id]] != undefined)
		{
			rooms[roomid[socket.id]].disconnectUser(socket.id);
			io.sockets.in(roomid[socket.id]).emit('userList', {'list': rooms[roomid[socket.id]].getUsersNames()});
			if (rooms[roomid[socket.id]].nullUsers())
			{
				delete rooms[roomid[socket.id]];
				roomsLength--;
			}
			if (!roomsLength)
			{
				console.log('All authorized users disconnected!');
			}
		}
//		else console.log('try disconnect undefined user');

		countConnections--;
		if (countConnections === 0)
		{
			wakeServer(false);
			console.log('All connections aborted, server will shutdown in 30 minutes');
		}
	});
});