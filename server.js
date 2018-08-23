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

class Event
{
	constructor()
	{
		this.location = null;
		this.type = null;
		this.element = null;
		this.currentTime = null;
		this.playbackRate = null;
	}
}

class Room
{
	constructor(name)
	{
		this.name = name;
		this.event = new Event();
		this.timeUpdated = null;
		this.users = [];
		this.usersLength = 0;
	}

	addUser(sockid, name)
	{
		if (this.users[sockid] == undefined)
		{
			this.users[sockid] = name;
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
	console.log('connected: '+countConnections);
	wakeServer(true);

	socket.on('join', function(data)
	{
		socket.join(data.room);
		roomid[socket.id] = data.room;
		if (rooms[data.room] != undefined)
		{
			rooms[data.room].addUser(socket.id, data.name);
			socket.json.broadcast.to(roomid[socket.id]).emit('userList', {'list': rooms[data.room].getUsersNames()});
			io.json.to(socket.id).emit('userList', {'list': rooms[data.room].getUsersNames()});
			if (rooms[data.room].usersLength > 1 && rooms[data.room].timeUpdated != null)
			{
				rooms[data.room].event.currentTime = rooms[data.room].event.type == 'play' ? rooms[data.room].event.currentTime + (Date.now() - rooms[data.room].timeUpdated) / 1000 : rooms[data.room].event.currentTime;
				// Time is about second earlier then needed
				io.json.to(socket.id).send(rooms[data.room].event);
			}
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
			rooms[roomid[socket.id]].event = msg;
			rooms[roomid[socket.id]].timeUpdated = Date.now();
			socket.json.broadcast.to(roomid[socket.id]).send(rooms[roomid[socket.id]].event);
			console.log(roomid[socket.id]+': '+rooms[roomid[socket.id]].getUser(socket.id)+' '+msg.location+' '+msg.type+' '+msg.currentTime);
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
			socket.json.broadcast.to(roomid[socket.id]).emit('userList', {'list': rooms[roomid[socket.id]].getUsersNames()});
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