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
	setTimeout(function()
	{
		for (let i = 0; i < nodesCollection.length; i++)
		{
			nodesCollection[i].addEventListener('playing', onEvent, true);
			nodesCollection[i].addEventListener('pause', onEvent, true);
			nodesCollection[i].addEventListener('waiting', onEvent, true);
			nodesCollection[i].addEventListener('seeked', onEvent, true);
		}
	}, 200);
}

function init()
{
	let nodesCollection = document.getElementsByTagName('video');
	addListeners(nodesCollection);
	nodes = Array.prototype.slice.call(nodesCollection);
	console.log('init in: '+scriptLocation);
	console.log(nodesCollection, nodes);
}

function broadcast(event)
{
	let eventType = event.type;
	if (event.type == 'waiting') eventType = 'pause';
	else if (event.type == 'playing') eventType = 'play';
	console.log('broadcast: '+eventType);
	chrome.runtime.sendMessage(
	{
		from: 'content',
		to: scriptLocation,
		event: eventType,
		elem: nodes.indexOf(event.target),
		time: event.target.currentTime
	});
}

function fireEvent(event, elem, time)
{
	recieved = true;
	recievedEvent = event;
	switch (event)
	{
		case 'play':
			nodes[elem].currentTime = time;
			nodes[elem].play();
			break;
		case 'pause':
			nodes[elem].currentTime = time;
			nodes[elem].pause();
			break;
		case 'seeked':
			nodes[elem].currentTime = time;
			break;
	}
}

window.onload = function() // may be find smth better
{
   init();
};

chrome.runtime.sendMessage( {from: 'tabid'} );

chrome.runtime.onMessage.addListener( function(msg, sender)
{
	if (msg.from == 'background' && msg.to == scriptLocation)
	{
		console.log('recieved: '+msg.event);
		fireEvent(msg.event, msg.elem, msg.time);
	}
});