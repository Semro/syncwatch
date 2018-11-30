'use strict';

var nodes = [];
var recieved = false, recievedEvent;

function onEvent(event)
{
	if (recieved)
	{
		if (recievedEvent === 'play')
		{
			if (event.type === 'waiting')
			{
				setTimeout(function()
				{
					if (event.target.readyState < 3) broadcast(event);
					recieved = false;
				}, 500);
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
		else broadcast(event);
	}
}

function addListeners(nodesCollection)
{
	let eventTypes = ['playing', 'pause', 'waiting', 'seeked', 'ratechange'];
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
	if (event_send.type === 'waiting') event_send.type = 'pause';
	else if (event_send.type === 'playing') event_send.type = 'play';
	chrome.runtime.sendMessage(
	{
		from: 'content',
		data: event_send
	});
	console.log('broadcast: '+event_send.type);
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

window.onload = function()
{
   init();
};

chrome.runtime.sendMessage(
{
	from: 'tabid',
	location: window.location.href
});

chrome.runtime.onMessage.addListener( function(msg)
{
	if (msg.from === 'background' && msg.data.location === window.location.href)
	{
		msg = msg.data;
		fireEvent(msg);
		console.log('recieved: '+msg.type);
	}
});