'use strict';

var localURL = 'http://localhost:8080';
var serverURL = 'https://syncevent.herokuapp.com';
var debug = false;
var connectionURL = debug === true ? localURL : serverURL;

var manifest = chrome.runtime.getManifest();
var user =
{
	name: null,
	version: null,
	room: null
};
var socket = null;
var status = 'disconnect';
var list = [];
var tabid_location = [];

function sendDebug()
{
	chrome.runtime.sendMessage({from: 'sendDebug', debug: debug});
}

function sendUser()
{	
	new Promise(function(resolve)
	{
		chrome.storage.sync.get(user, (result) => resolve(result));
	}).then((result) =>
	{
		user = result;
		user.version = manifest.version;
		chrome.runtime.sendMessage({from: 'sendUser', data: user});
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
	if (status === 'connect') socket.json.send(event);
}

function initSockets()
{
	if (socket === null)
	{
		socket = io.connect(connectionURL,
		{
			reconnection: true,
			reconnectionDelayMax: 5000,
			reconnectionDelay: 1000
		});

		initSocketEvents();

		socket.on('userList', function(msg)
		{
			list = msg.list;
			sendUsersList();
		});

		socket.on('message', function(msg)
		{
			chrome.tabs.sendMessage(tabid_location[msg.location], {from: 'background', data: msg}); // Invocation of form tabs.sendMessage(undefined, object) doesn't match definition tabs.sendMessage(integer tabId, any message, optional object options, optional function responseCallback)
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
			tabid_location[msg.location] = sender.tab.id;
			break;
		}
		case 'content':
		{
			broadcast(msg.data);
			break;
		}
		case 'join':
		{
			user = msg.data;
			initSockets();
			authUser(user);
			break;
		}
		case 'getDebug':
		{
			sendDebug();
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