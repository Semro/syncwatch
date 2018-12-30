'use strict';

var localURL = 'http://localhost:8080';
var serverURL = 'https://syncevent.herokuapp.com';
var debug = false;
var connectionURL = debug === true ? localURL : serverURL;

var manifest = chrome.runtime.getManifest();
var user =
{
	name: null,
	room: null,
	version: null,
	agent: null
};
var socket = null;
var status = 'disconnect';
var list = [];
var tabid_location = [];
var share = {};

function sendUserToPopup()
{	
	new Promise((resolve)=>
	{
		chrome.storage.sync.get(user, (result) => resolve(result));
	}).then((result)=>
	{
		chrome.runtime.sendMessage({from: 'sendUser', data: result});
	});
}

function sendStatusToPopup(newStatus)
{	
	if (newStatus != undefined) status = newStatus;
	chrome.runtime.sendMessage(
	{
		from: 'status',
		status: status
	});
}

function sendShareToPopup(data)
{
	if (status === 'connect')
	{
		if (data != undefined) share = data;
		chrome.runtime.sendMessage({from: 'share', data: share});
	}
}

function sendUsersListToPopup()
{
	chrome.runtime.sendMessage(
	{
		from: 'sendUsersList',
		list: list
	});
}

function sendErrorToPopup(err)
{
	chrome.runtime.sendMessage(
	{
		from: 'sendError',
		error: err
	});
}

function broadcast(event)
{
	if (status === 'connect') socket.json.send(event);
}

function shareVideoLink()
{
	chrome.tabs.query({active: true}, (tab)=>
	{
		tab = tab[0];
		let msg = {title: tab.title, url: tab.url, user: user.name};
		sendShareToPopup(msg);
		socket.emit('share', msg);
	});
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

		socket.on('usersList', (msg)=>
		{
			list = msg.list;
			sendUsersListToPopup();
		});

		socket.on('message', (msg)=>
		{
			if (tabid_location[msg.location] != undefined)
			{
				chrome.tabs.sendMessage(tabid_location[msg.location], {from: 'background', data: msg});
				console.log('socket.on: '+msg.type);
			}
		});
		socket.on('share', (msg)=>
		{
			if (msg.title != undefined)
			{
				sendShareToPopup(msg);
				onShareNotification(msg);
			}
		})
		socket.on('error', (msg)=> { sendErrorToPopup(msg) });
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
		socket.on(event, ()=> { sendStatusToPopup(event); });
	}
	socket.on('connect', ()=>
	{
		socket.emit('join', user);
	});
	socket.on('disconnect', ()=>
	{
		list = [];
		share = {};
		sendUsersListToPopup();
	});
}

function storageUser(user)
{
	chrome.storage.sync.set(user);
}

function errorOnEventNotification()
{
	chrome.notifications.create('Interact with page',
	{
		type: 'basic',
		iconUrl: 'icons/icon128.png',
		title: 'Interact with page',
		message: 'Click on video to play it'
	})
	chrome.notifications.clear('Interact with page');
}

function onShareNotification(msg)
{
	chrome.notifications.create('Share',
	{
		type: 'basic',
		iconUrl: 'icons/icon128.png',
		title: msg.user+' shared with video',
		message: msg.title,
		contextMessage: msg.url,
		buttons:
		[{
			title: 'Open link'
		}]
	})
	chrome.notifications.clear('Share');
}

function onNotificatuionClicked(idNotification)
{
	if (idNotification === 'Share')
	{
		chrome.tabs.create({url: share.url});
		chrome.notifications.clear('Share');
	}
}

chrome.notifications.onButtonClicked.addListener(onNotificatuionClicked);
chrome.notifications.onClicked.addListener(onNotificatuionClicked);

chrome.runtime.onMessage.addListener((msg, sender)=>
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
			tabid_location[msg.data.location] = sender.tab.id;
			broadcast(msg.data);
			break;
		}
		case 'join':
		{
			user = msg.data;
			storageUser(user);
			user.version = manifest.version;
			user.agent = navigator.userAgent;
			initSockets();
			break;
		}
		case 'popupShare':
		{
			shareVideoLink();
			break;
		}
		case 'getUser':
		{
			sendUserToPopup();
			break;
		}
		case 'getStatus':
		{
			sendStatusToPopup();
			break;
		}
		case 'getUsersList':
		{	
			sendUsersListToPopup();
			break;
		}
		case 'getShare':
		{
			sendShareToPopup();
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
		case 'errorOnEvent':
		{
			errorOnEventNotification();
			break;
		}
	}
});