'use strict';

var nodes = [];
var scriptLocation = window.location.href;
var recieved = false, recievedEvent;

function onEvent(event)
{
	if (recieved)
	{
		if (recievedEvent == 'play')
		{
			if (event.type == 'waiting')
			{
				setTimeout(function()
				{
					if (event.target.readyState < 3) broadcast(event);
					recieved = false;
				}, 300);
			}
			else if (event.type == 'playing') recieved = false;
		}
		else
		{
			if (recievedEvent == 'pause')
			{
				if (event.type == 'seeked') recieved = false;
			}
			else if (recievedEvent == event.type) recieved = false;
		}
	}
	else
	{
		if (event.type == 'seeked')
		{
			if (event.target.paused) broadcast(event);
		}
		else broadcast(event);
	}
}

function addListeners(nodesCollection)
{
	let eventTypes = ['playing', 'pause', 'waiting', 'seeked'];
	setTimeout(function()
	{
		for (let i = 0; i < nodesCollection.length; i++)
		{
			for (let j = 0; j < eventTypes.length; j++)
			{
				nodesCollection[i].addEventListener(eventTypes[j], onEvent, true);
			}
		}
	}, 200);
}

function init()
{
	let nodesCollection = document.getElementsByTagName('video');
	addListeners(nodesCollection);
	nodes = Array.from(nodesCollection);
}

function broadcast(event)
{
	let eventType = event.type;
	if (event.type == 'waiting') eventType = 'pause';
	else if (event.type == 'playing') eventType = 'play';
	chrome.runtime.sendMessage(
	{
		from: 'content',
		to: scriptLocation,
		event: eventType,
		elem: nodes.indexOf(event.target),
		time: event.target.currentTime
	});
	console.log('broadcast: '+eventType);
}

function fireEvent(event, elem, time)
{
	recieved = true;
	recievedEvent = event;
	nodes[elem].currentTime = time;
	if (event == 'play') nodes[elem].play();
	else if (event == 'pause') nodes[elem].pause();
}

window.onload = function() // may be find smth better
{
   init();
};

chrome.runtime.sendMessage( {from: 'tabid'} );

chrome.runtime.onMessage.addListener( function(msg)
{
	if (msg.from == 'background' && msg.to == scriptLocation)
	{
		fireEvent(msg.event, msg.elem, msg.time);
		console.log('recieved: '+msg.event);
	}
});