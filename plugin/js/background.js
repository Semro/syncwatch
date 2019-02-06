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
var syncTab = null;
var injectedTabsId = [];
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
	if (newStatus !== undefined) status = newStatus;
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
		if (data !== undefined) share = data;
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

function broadcast(event, tabid)
{
	if (status === 'connect' && syncTab !== null)
	{
		if (syncTab.id === tabid)
		{
			socket.json.send(event);
		}
	}
}

function shareVideoLink(tab)
{
	let msg = 
	{
		title: tab.title,
		url: tab.url,
		user: user.name
	};
	sendShareToPopup(msg);
	socket.emit('share', msg);
}

function injectScriptInTab(tab)
{
	if (injectedTabsId[tab.id] === undefined)
	{
		chrome.tabs.executeScript(tab.id,
		{
			allFrames: true,
			file: 'js/content.js',
			runAt: 'document_end'
		});
		injectedTabsId[tab.id] = true;
	}
}

function setSyncTab(tab)
{
	syncTab = tab;
	injectScriptInTab(tab);
}

function changeSyncTab()
{
	chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs)=>
	{
		if (share.url !== undefined && tabs[0].url === share.url)
		{
			setSyncTab(tabs[0]);
		}
	})
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
			if (syncTab !== null)
			{
				chrome.tabs.sendMessage(syncTab.id,
				{
					from: 'background',
					data: msg
				});
				if (debug) console.log(`socket.on: ${msg.type}`);
			}
		});

		socket.on('share', (msg)=>
		{
			if (msg.title !== undefined)
			{
				sendShareToPopup(msg);
				onShareNotification(msg);
				chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs)=>
				{
					if (tabs[0].url === share.url)
					{
						setSyncTab(tabs[0]);
					}
				});
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
		syncTab = null;
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
		title: chrome.i18n.getMessage('notification_interact_title'),
		message: chrome.i18n.getMessage('notification_interact_message'),
		buttons:
		[{
			title: chrome.i18n.getMessage('notification_interact_button')
		}]
	})
	chrome.notifications.clear('Interact with page');
}

function onShareNotification(msg)
{
	chrome.notifications.create('Share',
	{
		type: 'basic',
		iconUrl: 'icons/icon128.png',
		title: `${msg.user} ${chrome.i18n.getMessage('notification_shared_title')}`,
		message: msg.title,
		contextMessage: msg.url,
		buttons:
		[{
			title: chrome.i18n.getMessage('notification_shared_button')
		}]
	})
	chrome.notifications.clear('Share');
}

function onNotificationClicked(idNotification)
{
	if (idNotification === 'Share')
	{
		chrome.tabs.create({url: share.url});
		chrome.notifications.clear('Share');
	}
	if (idNotification === 'Interact with page')
	{
		chrome.tabs.create({url: 'https://developers.google.com/web/updates/2017/09/autoplay-policy-changes'});
		chrome.notifications.clear('Interact with page');
	}
}

chrome.notifications.onButtonClicked.addListener(onNotificationClicked);
chrome.notifications.onClicked.addListener(onNotificationClicked);

chrome.tabs.onUpdated.addListener((tabid, changeInfo, tab)=>
{
	if (changeInfo.status === 'complete')
	{
		if (tab.url === share.url)
		{
			delete injectedTabsId[tab.id];
			setSyncTab(tab);
		}
	}
})

chrome.tabs.onActivated.addListener(()=>
{
	changeSyncTab();
})

chrome.windows.onFocusChanged.addListener(()=>
{
	changeSyncTab();
})

chrome.runtime.onMessage.addListener((msg, sender)=>
{
	switch(msg.from)
	{
		case 'content':
		{
			broadcast(msg.data, sender.tab.id);
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
			chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs)=>
			{
				setSyncTab(tabs[0]);
				shareVideoLink(syncTab);
			})
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