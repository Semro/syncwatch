'use strict';

const express = require('express');
const socketIO = require('socket.io');
const path = require('path');
var http = require('http');

const PORT = process.env.PORT || 8080;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
	.get('/', (req, res) => res.sendFile(INDEX))
	.use('/testFrames/', (req, res) => res.sendFile(path.join(__dirname, 'testFrames', req.url)))
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
		this.to = null;
		this.event = null;
		this.elem = null;
		this.time = null;
		this.users = [];
		this.usersLength = 0;
	}

	addUser(sockid, name)
	{
		if (this.users[sockid] == undefined)
		{
			this.users[sockid] = name;
			this.users.sort();
			this.usersLength++;
		}
	}

	disconnectUser(sockid)
	{
		console.log(roomid[sockid]+': '+rooms[roomid[sockid]].getUser(sockid)+' disconnected');
		delete this.users[sockid];
		this.usersLength--;
	}

	getUser(sockid)
	{
		return this.users[sockid];
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
	console.log('connected: '+countConnections);
	wakeServer(true);

	socket.on('join', function(data)
	{
		socket.join(data.room);
		roomid[socket.id] = data.room;
		if (rooms[data.room] != undefined)
		{
			rooms[data.room].addUser(socket.id, data.name);
			socket.json.to(data.room).send(
			{
				'to': rooms[data.room].to,
				'event': rooms[data.room].event,
				'elem':	 rooms[data.room].elem,
				'time':  rooms[data.room].time
			});
		}
		else
		{
			let room = new Room(data.room);
			roomsLength++;
			room.addUser(socket.id, data.name);
			rooms[data.room] = room;
		}

		console.log(rooms[data.room].name+': '+rooms[data.room].getUser(socket.id)+' connected');
	});

	socket.on('message', function(msg)
	{
		if (rooms[roomid[socket.id]] != undefined)
		{
			rooms[roomid[socket.id]].to = msg.to;
			rooms[roomid[socket.id]].event = msg.event;
			rooms[roomid[socket.id]].elem = msg.elem;
			rooms[roomid[socket.id]].time = msg.time;
			socket.json.broadcast.to(roomid[socket.id]).send(
			{
				'to': msg.to,
				'event': msg.event,
				'elem':	 msg.elem,
				'time':  msg.time
			});
			console.log(roomid[socket.id]+': '+rooms[roomid[socket.id]].getUser(socket.id)+' '+msg.to+' '+msg.event+' '+msg.time);
		}
	});

//	let sendTime;
//	let pingUser = setInterval(function()
//	{
//		sendTime = Date.now();
//		socket.emit('pingt');
//	}, 150000); // 2.5 minutes

	socket.on('pongt', function(data)
	{
		let rTime = Date.now();
		let pingTime = rTime - sendTime;
		console.log(data.name+' ping: '+pingTime+' ms');
	});

	socket.on('disconnect', function()
	{
		if (rooms[roomid[socket.id]] != undefined) 
		{
			rooms[roomid[socket.id]].disconnectUser(socket.id);

			if (rooms[roomid[socket.id]].nullUsers())
			{
				delete rooms[roomid[socket.id]];
				roomsLength--;
			}

			if (!roomsLength)
			{
//				clearInterval(pingUser);
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