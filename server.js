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

console.log('server.js started!');

var roomsLength = 0;
var rooms = [], roomid = [];

/*
function wakeServer(status)
{
	var interval;
	var waked = false;
	if (status)
	{
		if (!waked)
		{
			wakeServer = setInterval(function()
			{
				http.get('http://syncevent.herokuapp.com');
				console.log('wake');
			}, 2000);  //1800000//  30 minutes
		}
		waked = true;
	}
	else
	{
		clearInterval(interval);
	}
}
*/

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

	disconUser(sockid)
	{
		console.log(roomid[sockid]+': '+rooms[roomid[sockid]].getUser(sockid)+' disconnected'); // here bug.
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

	timeSet(time)
	{
		this.time = time;
	}
}

io.on('connection', function(socket)
{
	/*
	let wakeServer = setInterval(function()
	{
		http.get('http://syncevent.herokuapp.com');
	}, 30 * 60000);  // 30 minutes // calls on each connection, it's ping server a lot of time*/

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
			rooms[roomid[socket.id]].disconUser(socket.id);

			if (rooms[roomid[socket.id]].nullUsers())
			{
				delete rooms[roomid[socket.id]];
				roomsLength--;
			}

			if (!roomsLength)
			{
//				clearInterval(wakeServer);
//				clearInterval(pingUser);
				console.log('All disconnected!');
			}
		}
		else console.log('try disconnect undefined user');
	});
});