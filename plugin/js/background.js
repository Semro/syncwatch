'use strict';

var recieved = false;
var contentTabId, popupId;
var userName;
var socket = null;

function sendStatus(status)
{	
	chrome.runtime.sendMessage(
	{
		from: 'status',
		status: status
	});
}

function broadcast(to, event, elem, time)
{
	if (!recieved)
	{
		socket.json.send(
		{
			'to': to,
			'event': event,
			'elem': elem,
			'time': time
		});
		console.log('broadcast: '+to+' '+event+' '+elem+' '+time);
	}
	else recieved = false;
}

function initSockets()
{
	if (socket == null)
	{
		var connectionUrl = 'http://localhost:8080';
//		var connectionUrl = 'https://syncevent.herokuapp.com';
		socket = io.connect(connectionUrl, {
			reconnection: true,
			reconnectionDelayMax: 5000,
			reconnectionDelay: 1000,
		});

		initSocketEvents();

		socket.on('message', function(msg)
		{
			recieved = true;
			chrome.tabs.sendMessage(contentTabId,
			{
				from: 'background',
				to: msg.to,
				event: msg.event,
				elem: msg.elem,
				time: msg.time
			});
			console.log('socket.on: '+msg.event);
		});

		socket.on('pingt', function()
		{
			socket.emit('pongt',
			{
				name: userName
			});
		});
	}
	else
	{
		if (socket.disconnected) socket.open();
		else console.log('socket is open already');
	}
}

function initSocketEvents()
{
	let socket_events = ['connect', 'connect_error', 'connect_timeout', 'error', 'disconnect', 'reconnect', 'reconnecting', 'reconnect_error', 'reconnect_failed']
	for (let i = 0; i < socket_events.length; i++)
	{
		let event = socket_events[i];
		socket.on(event, ()=>{sendStatus(event)});
	}
}

chrome.runtime.onMessage.addListener( function(msg, sender)
{
	if (msg.from == 'tabid')
	{
		contentTabId = sender.tab.id;
	}
	if (msg.from == 'content')
	{
		contentTabId = sender.tab.id;
		broadcast(msg.to, msg.event, msg.elem, msg.time);
	}
	if (msg.from == 'join')
	{
		userName = msg.name;
		initSockets();
		socket.emit('join',
		{
			name: msg.name,
			room: msg.room
		});
	}
	if (msg.from == 'disconnect')
	{
		socket.close();
	}
	if (msg.from == 'console')
	{
		console.log(msg.res);
	}
});

console.log('background.js');