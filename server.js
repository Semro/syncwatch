//'use strict';

const express = require('express');
const socketIO = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 8080;
const INDEX = path.join(__dirname, 'index.html');

const server = express()
  .use((req, res) => res.sendFile(INDEX) )
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socketIO(server);

/*
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => console.log('Client disconnected'));
});
*/

var users = []; var i = 0;

io.on('connection', function (socket) 
{
	users[socket.id] = i;
	console.log('client '+i+' connected');
	i++;
	socket.on('message', function (msg)
	{
		socket.json.broadcast.send(
		{
			"elem":	 msg.elem,
			"event": msg.event,
			"time":  msg.time
		});
		console.log(users[socket.id]+' '+msg.elem+' '+msg.event+' '+msg.time);
	});

	socket.on('disconnect', function () 
	{
		console.log('client '+users[socket.id]+' disconnected')
	});
});