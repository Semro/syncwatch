'use strict';

//var socket = io.connect('https://syncevent.herokuapp.com', {
var socket = io.connect('http://localhost:8080', {
	reconnection: true,
	reconnectionDelayMax: 5000,
	reconnectionDelay: 1000,
});
var recieved = false;
var contentTabId;
var userName;

function broadcast(event, elem, time)
{
	if (!recieved)
	{
		socket.json.send(
		{
			'event': event,
			'elem': elem,
			'time': time
		});
		console.log('broadcast: '+event);
	}
	else recieved = false;
}

function testbroadcast(to, event, elem, time)
{
	console.log(to+' '+event+' '+elem+' '+time);
}

socket.on('message', function(msg)
{
	recieved = true;
	chrome.tabs.sendMessage(contentTabId,
	{
		from: 'background',
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

chrome.runtime.onMessage.addListener( function(msg, sender)
{
	if (msg.from == 'tabid')
	{
		contentTabId = sender.tab.id;
	}
	if (msg.from == 'content')
	{
		contentTabId = sender.tab.id;
		testbroadcast(msg.to, msg.event, msg.elem, msg.time);
//		broadcast(msg.event, msg.elem, msg.time);
	}
	if (msg.from == 'join')
	{
		userName = msg.name;
		socket.emit('join',
		{
			name: msg.name,
			room: msg.room
		});
	}
	if (msg.from == 'console')
	{
		console.log(msg.res);
	}
});

console.log('background.js');

function testsend(location, event, elem, time)
{
	chrome.tabs.sendMessage(contentTabId,
	{
		from: 'background',
		to: location,
		event: event,
		elem: elem,
		time: time
	});
}