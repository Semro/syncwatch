'use strict';

const express = require('express');
const socketIO = require('socket.io');
const path = require('path');
var http = require('http');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
	.use((req, res) => res.sendFile(INDEX) )
	.listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socketIO(server);

console.log("serverOBJ.js started!");

var rooms = [], roomid = [];

class Room
{
	constructor(name)
	{
		this.name = name;
		this.event = null;
		this.elem = null;
		this.time = null;
		this.users = [];
	}

	addUser(sockid, name)
	{
		this.users[sockid] = name;
	}

	disconUser(sockid) // подумать
	{
		this.users.splice(sockid, 1);
	}

	getUser(sockid)
	{
		return this.users[sockid];
	}

	nullUsers()
	{
		if (!this.users.length) return true;
		else return false;
	}

	setTime(time)
	{
		this.time = time;
	}
}

io.on('connection', function(socket) 
{
	socket.on('join', function(data)
	{
		socket.join(data.room);
		roomid[socket.id] = data.room;
		if (rooms[data.room] == null)
		{
			let room = new Room(data.room);
			room.addUser(socket.id, data.name);
			rooms[data.room] = room;
		}
		else
		{
			rooms[data.room].addUser(socket.id, data.name);
			socket.json.broadcast.to(data.room).send(
			{
				'event': rooms[data.room].event,
				'elem':	 rooms[data.room].elem,
				'time':  rooms[data.room].time
			});
		}

		console.log(rooms[data.room].name+': '+rooms[data.room].getUser(socket.id)+' connected');
	});

	socket.on('message', function(msg)
	{
		if (rooms[roomid[socket.id]] != undefined)
		{
			rooms[roomid[socket.id]].setTime(msg.time);
			socket.json.broadcast.to(roomid[socket.id]).send(
			{
				'event': msg.event,
				'elem':	 msg.elem,
				'time':  msg.time
			});
			console.log(roomid[socket.id]+': '+rooms[roomid[socket.id]].getUser(socket.id)+' '+msg.event+' '+msg.time);
		}
	});

	var sendTime;
	var intervalId = setInterval(function() 
	{
		//http.get("http://syncevent.herokuapp.com");
		sendTime = Date.now();
		socket.emit('pingt');
	}, 1800000);  // 30 minutes

	socket.on('pongt', function(data)
	{
		var rTime = Date.now();
		var pingTime = rTime - sendTime;
		console.log(data.name+' ping: '+pingTime+' ms');
	});

	socket.on('disconnect', function()
	{
		console.log(roomid[socket.id]+': '+rooms[roomid[socket.id]].getUser(socket.id)+' disconnected');
		rooms[roomid[socket.id]].disconUser(socket.id);

		if (rooms[roomid[socket.id]].nullUsers())
		{
			rooms.splice(roomid[socket.id], 1);
			console.log("nullUsers");
		}

		if (!rooms.length)
		{
			clearInterval(intervalId);
			console.log("All disconnected!");
		}
	});
});