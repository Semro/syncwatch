'use strict';

var manifest = chrome.runtime.getManifest();
var contentTabId;
var user =
{
	name: null,
	version: null,
	room: null
};
var socket = null;
var status = 'disconnect';
var list = [];

function sendUser()
{	
	new Promise(function(resolve)
	{
		chrome.storage.sync.get(user, (result) => resolve(result));
	}).then((result) =>
	{
		user = result;
		user.from = 'sendUser';
		chrome.runtime.sendMessage(user);
		delete user.from;
	});
}

function sendStatus(newStatus)
{	
	if (newStatus != undefined) status = newStatus;
	chrome.runtime.sendMessage(
	{
		from: 'status',
		status: status
	});
}

function sendUsersList()
{
	chrome.runtime.sendMessage(
	{
		from: 'sendUsersList',
		list: list
	});
}

function broadcast(event)
{
	if (status == 'connect') socket.json.send(event);
}

function initSockets()
{
	if (socket == null)
	{
//		var connectionUrl = 'http://localhost:8080';
		var connectionUrl = 'https://syncevent.herokuapp.com';
		socket = io.connect(connectionUrl, {
			reconnection: true,
			reconnectionDelayMax: 5000,
			reconnectionDelay: 1000,
		});

		initSocketEvents();

		socket.on('userList', function(msg)
		{
			list = msg.list;
			sendUsersList();
		});

		socket.on('message', function(msg)
		{
			msg.from = 'background';
			chrome.tabs.sendMessage(contentTabId, msg);
			console.log('socket.on: '+msg.type);
		});

		socket.on('pingt', function()
		{
			socket.emit('pongt',
			{
				name: user.name
			});
		});
	}
	else
	{
		if (socket.disconnected) socket.open();
	}
}

function initSocketEvents()
{
	let socket_events = ['connect', 'connect_error', 'connect_timeout', 'error', 'disconnect', 'reconnect', 'reconnecting', 'reconnect_error', 'reconnect_failed']
	for (let i = 0; i < socket_events.length; i++)
	{
		let event = socket_events[i];
		socket.on(event, () => { sendStatus(event); });
	}
	socket.on('connect', () =>
	{
		authUser(user);
	});
	socket.on('disconnect', () =>
	{
		list = [];
		sendUsersList();
	});
}

function authUser(user)
{
	chrome.storage.sync.set(user);
	socket.emit('join', user);
}

chrome.runtime.onMessage.addListener( function(msg, sender)
{
	switch(msg.from)
	{
		case 'tabid':
		{
			contentTabId = sender.tab.id;
			break;
		}
		case 'content':
		{
			contentTabId = sender.tab.id;
			delete msg.from;
			broadcast(msg);
			break;
		}
		case 'join':
		{
			delete msg.from;
			user = msg;
			user.version = manifest.version;
			initSockets();
			authUser(user);
			break;
		}
		case 'getUser':
		{
			sendUser();
			break;
		}
		case 'getStatus':
		{
			sendStatus();
			break;
		}
		case 'getUsersList':
		{	
			sendUsersList();
			break;
		}
		case 'disconnect':
		{
			socket.close();
			break;
		}
		case 'console':
		{
			console.log(msg.res);
			break;
		}
	}
});