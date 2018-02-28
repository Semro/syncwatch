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

var users = [], rooms = [];

io.on('connection', function (socket) 
{
	socket.on('join', function (data)
	{
		socket.join(data.room);
		users[socket.id] = data.name;
		rooms[socket.id] = data.room;
		console.log(rooms[socket.id]+': '+users[socket.id]+' connected');
	});
	socket.on('message', function (msg)
	{
		socket.json.broadcast.to(rooms[socket.id]).send(
		{
			'event': msg.event,
			'elem':	 msg.elem,
			'time':  msg.time
		});
		console.log(rooms[socket.id]+': '+users[socket.id]+' '+msg.event+' '+msg.time);
	});

	var intervalId = setInterval(function() 
	{
		http.get("http://syncevent.herokuapp.com");
		socket.emit('ping', function()
		{
			var sendTime = Date.now();
		})
	}, 10000);  // 270000

	socket.on('pong', function(data)
	{
		var receiveTime = Date.now();
		var pingTime = recieveTime - sendTime;
		console.log(data.name+' ping: '+pingTime+' ms');
	})

	socket.on('disconnect', function () 
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