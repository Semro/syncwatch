'use strict';

var nodes = [];
var recieved = false, recievedEvent;
var loading = false;

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
	if (prevLoading == false && loading == true)
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

function init()
{
	let nodesCollection = document.getElementsByTagName('video');
	addListeners(nodesCollection);
	nodes = Array.from(nodesCollection);
}

function broadcast(event)
{
	let event_send = 
	{
		location: window.location.href,
		type: event.type,
		element: nodes.indexOf(event.target),
		currentTime: event.target.currentTime,
		playbackRate: event.target.playbackRate
	};
	if (event_send.type === 'progress') event_send.type = 'pause';
	else if (event_send.type === 'playing') event_send.type = 'play';
	chrome.runtime.sendMessage(
	{
		from: 'content',
		data: event_send
	});
	console.log("%cbroadcast: "+event_send.type, "background: #00590E;");
}

function fireEvent(event)
{
	recieved = true;
	recievedEvent = event.type;
	if (event.type === 'ratechange') nodes[event.element].playbackRate = event.playbackRate;
	else
	{
		nodes[event.element].currentTime = event.currentTime;
		if (event.type === 'play') nodes[event.element].play();
		else if (event.type === 'pause') nodes[event.element].pause();
	}
}

window.onload = ()=>
{
   init();
};

chrome.runtime.sendMessage(
{
	from: 'tabid',
	location: window.location.href
});

chrome.runtime.onMessage.addListener((msg)=>
{
	if (msg.from === 'background' && msg.data.location === window.location.href)
	{
		msg = msg.data;
		fireEvent(msg);
		console.log("%crecieved: "+msg.type, "background: #542100;");
	}
});