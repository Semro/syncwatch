'use strict';

const express = require('express');
const socketIO = require('socket.io');
const http = require('http');

const PORT = process.env.PORT || 8080;

const server = express()
	.use(express.static(__dirname + '/public'))
	.listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socketIO(server);

let roomsLength = 0;
let rooms = [], roomid = [];
let wake = false;
let countConnections = 0;

function wakeServer(status)
{
	if (status)
	{
		wake = setInterval(function()
		{
			if (process.env.PORT != undefined) http.get('http://syncevent.herokuapp.com');
			else http.get('http://localhost:8080');
			console.log('Server waked!');
		}, 30 * 60000); // 30 minutes
	}
	else
	{
		clearInterval(wake);
		wake = false;
	}
}

function checkUserNameAndRoom(data)
{
	if (String(data.name) === '[object Object]' || String(data.room) === '[object Object]') return 'Dont try make subrooms :D';
	else
	{
		if (data.name === '')
			return 'Write your name';
		else if (data.name.length < 2 || data.name.length > 24)
			return 'Name length must be between 2 and 24';
		else if (data.room === '')
			return 'Write room name';
		else if (data.room.length < 2 || data.room.length > 24)
			return 'Room length must be between 2 and 24';
		else return null;
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
		this.share = null;
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
		console.log(this.name+': '+this.getUser(socket_id)+' disconnected');
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
	if (!wake) wakeServer(true);

	socket.on('join', function(data)
	{
		socket.join(data.room);
		let err = checkUserNameAndRoom(data);
		if (err != null)
		{
			socket.error(err);
			socket.disconnect();
			console.log('Error join: '+err);
		}
		else
		{
			let room = rooms[data.room];
			if (room != undefined)
			{
				room.addUser(socket.id, data.name);
				io.in(room.name).emit('usersList', {'list': room.getUsersNames()});
				if (room.share != null) socket.emit('share', room.share);
				if (room.usersLength > 1 && room.timeUpdated != null)
				{
					room.event.currentTime = room.event.type === 'play' ? room.event.currentTime + 
					(Date.now() - room.timeUpdated) / 1000 : room.event.currentTime;
					// Time is about second earlier then needed
					socket.send(room.event);
				}
			}
			else
			{
				room = new Room(data.room);
				roomsLength++;
				room.addUser(socket.id, data.name);
				rooms[data.room] = room;
				socket.emit('usersList', {'list': rooms[data.room].getUsersNames()});
			}
			roomid[socket.id] = room;
	
			console.log('connected: '+countConnections+' '+JSON.stringify(data));
		}
	});

	socket.on('message', function(msg)
	{
		let room = roomid[socket.id];
		if (room != undefined)
		{
			room.event = msg;
			room.timeUpdated = Date.now();
			socket.broadcast.to(room.name).send(room.event);
			console.log(room.name+': '+room.getUser(socket.id)+' '+JSON.stringify(msg));
		}
	});

	socket.on('share', function(msg)
	{
		let room = roomid[socket.id];
		room.share = msg;
		socket.broadcast.to(room.name).emit('share', room.share);
		console.log(room.name+' shared '+JSON.stringify(msg));
	});

	socket.on('disconnect', function()
	{
		let room = roomid[socket.id];
		if (room != undefined)
		{
			room.disconnectUser(socket.id);
			io.sockets.in(room.name).emit('usersList', {'list': room.getUsersNames()});
			if (room.nullUsers())
			{
				delete rooms[room.name];
				delete roomid[socket.id];
				roomsLength--;
			}
			if (roomsLength === 0)
			{
				rooms = [];
				roomid = [];
				if (global.gc)
				{
					gc();
					console.log('Collected garbage!');
				}
				console.log('All authorized users disconnected!');
			}
		}
//		else console.log('try disconnect undefined user');

		countConnections--;
		/*
		if (countConnections === 0)
		{
			wakeServer(false);
			console.log('All connections aborted, server will shutdown in 30 minutes');
		}
		*/
	});
});