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

var users = [], rooms = [], times = [];

class room
{
	constructor(name, event, elem, time)
	{
		this.name = name;
		this.event = event;
		this.elem = elem;
		this.time = time;
		this.users = [];
	}
}

function send(event, elem, time)
{
	socket.json.broadcast.to(rooms[socket.id]).send(
	{
		'event': event,
		'elem':	 elem,
		'time':  time
	});
}

io.on('connection', function(socket) 
{
	socket.on('join', function(data)
	{
		socket.join(data.room);
		users[socket.id] = data.name;
		rooms[socket.id] = data.room;

		if (times[rooms[socket.id]] != null)
		{
			send();
		}

		console.log(rooms[socket.id]+': '+users[socket.id]+' connected');
	});

	socket.on('message', function(msg)
	{
		times[rooms[socket.id]] = msg.time;
		send(msg.event, msg.elem, msg.time);
		console.log(rooms[socket.id]+': '+users[socket.id]+' '+msg.event+' '+msg.time);
	});

	var sendTime;
	var intervalId = setInterval(function() 
	{
		//http.get("http://syncevent.herokuapp.com");
		sendTime = Date.now();
		socket.emit('pingt', { hello: 'world' });
	}, 1800000);  // 30 minutes

	socket.on('pongt', function(data)
	{
		var rTime = Date.now();
		var pingTime = rTime - sendTime;
		console.log(data.name+' ping: '+pingTime+' ms');
	});

	socket.on('disconnect', function()
	{
		console.log(rooms[socket.id]+': '+users[socket.id]+' disconnected');
		users.splice(socket.id, 1);
		if (!users.length)
		{
			clearInterval(intervalId);
			console.log("All disconnected!");
		}
	});
});