'use strict';

var nodes = [];
var recieved = false, recievedEvent;
var loading = false;
var debug = true;

function onEvent(event)
{
//	if (event.type === 'progress') console.log('event:'+event.type+' '+event.target.readyState+' recieved: '+recieved+' loading: '+loading);
//	else console.log('event:'+event.type+' '+' recieved: '+recieved+' loading: '+loading);
	if (recieved)
	{
		if (recievedEvent === 'play')
		{
			if (event.type === 'progress')
			{
				onProgress(event);
				recieved = false;
			}
			else if (event.type === 'playing') recieved = false;
		}
		else
		{
			if (recievedEvent === 'pause')
			{
				if (event.type === 'seeked') recieved = false;
			}
			else if (recievedEvent === event.type) recieved = false;
		}
	}
	else
	{
		if (event.type === 'seeked')
		{
			if (event.target.paused) broadcast(event);
		}
		else if (event.type === 'progress')
		{
			onProgress(event);
		}
		else broadcast(event);
	}
}

function onProgress(event)
{
	let prevLoading = loading;
	if (event.target.readyState < 3) loading = true;
	else loading = false;
	if (prevLoading === false && loading === true)
	{
		broadcast(event);
	}
}

function addListeners(nodesCollection)
{
	let eventTypes = ['playing', 'pause', 'seeked', 'ratechange', 'progress'];
	for (let i = 0; i < nodesCollection.length; i++)
	{
		for (let j = 0; j < eventTypes.length; j++)
		{
			nodesCollection[i].addEventListener(eventTypes[j], onEvent, true);
		}
	}
}

function iframeIndex(win)
{
	win = win || window;
	if (win.parent !== win)
	{
		for (var i = 0; i < win.parent.frames.length; i++)
		{
			if (win.parent.frames[i] == win) { return i; }
		}
		throw Error('In a frame, but could not find myself');
	}
	else
	{
		return -1;
	}
}

function iframeFullIndex(win)
{
	win = win || window;
	if (iframeIndex(win) < 0)
	{
		return '-1';
	}
	else
	{
		return `${ iframeFullIndex(win.parent)}${iframeIndex(win) }`;
	}
}

function init()
{
	let nodesCollection = document.getElementsByTagName('video');
	addListeners(nodesCollection);
	nodes = Array.from(nodesCollection);
}

function sendMessageInRuntime(msg)
{
	try
	{
		chrome.runtime.sendMessage(msg);
	}
	catch (err)
	{
		if (debug === true) throw new Error(err);
	}
}

function broadcast(event)
{
	let event_send = 
	{
		location: iframeFullIndex(window),
		type: event.type,
		element: nodes.indexOf(event.target),
		currentTime: event.target.currentTime,
		playbackRate: event.target.playbackRate
	};
	if (event_send.type === 'progress') event_send.type = 'pause';
	else if (event_send.type === 'playing') event_send.type = 'play';
	sendMessageInRuntime(
	{
		from: 'content',
		data: event_send
	});
	if (debug) console.log(`%cbroadcast: ${ event_send.type }`, 'background: #00590E;');
}

function fireEvent(event)
{
	recieved = true;
	recievedEvent = event.type;
	switch (event.type)
	{
		case 'play':
		{
			nodes[event.element].currentTime = event.currentTime;
			nodes[event.element].play().catch(errorOnEvent);
			break;
		}
		case 'pause':
		{
			nodes[event.element].pause();
			nodes[event.element].currentTime = event.currentTime;
			break;
		}
		case 'seeked':
		{
			nodes[event.element].currentTime = event.currentTime;
			break;
		}
		case 'ratechange':
		{
			nodes[event.element].playbackRate = event.playbackRate;
			break;
		}
	}
}

function errorOnEvent(err)
{
	if (err.name === 'NotAllowedError')
	{
		sendMessageInRuntime(
		{
			from: 'errorOnEvent'
		});
	}
}

init();

var observer = new MutationObserver(()=> // need optimization
{
	init();
	console.warn('HELLO');
});

observer.observe(document.body,
{
	childList: true,
	subtree: true
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>
{
	if (msg.from === 'background')
	{
		if (msg.data.location === iframeFullIndex(window))
		{
			msg = msg.data;
			fireEvent(msg);
			if (debug) console.log(`%crecieved: ${ msg.type }`, 'background: #542100;');
		}
		if (msg.data === 'isContentScriptInjected')
		{
			sendResponse('injected');
		}
	}
});