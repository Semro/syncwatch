'use strict';

var pp = false;
var nodes = [];
var scriptLocation = window.location.href;

function addListeners(arr)
{
	for (let i = 0; i < arr.length; i++)
	{
		arr[i].addEventListener('play', function(event) { broadcast(event); }, true);
		arr[i].addEventListener('pause', function(event) { broadcast(event); }, true);
		arr[i].addEventListener('seeked', function(event)
		{
			if (!pp)
			{
				broadcast(event);
			}
			pp = false;
		}, true);
	}
}

function init()
{
	let nodesCollection = document.getElementsByTagName('video');
	addListeners(nodesCollection);
	nodes = Array.prototype.slice.call(nodesCollection);
	console.log('init in: '+scriptLocation);
}

function broadcast(event)
{
	chrome.runtime.sendMessage(
	{
		from: 'content',
		to: scriptLocation,
		event: event.type,
		elem: nodes.indexOf(event.target),
		time: event.target.currentTime
	});
}

function fireEvent(event, elem, time)
{
	switch (event)
	{
		case 'play':
			pp = true;
			nodes[elem].currentTime = time;
			nodes[elem].play();
			break;
		case 'pause':
			pp = true;
			nodes[elem].currentTime = time;
			nodes[elem].pause();
			break;
		case 'seeked':
			nodes[elem].currentTime = time;
			break;
	}
	console.log(event+' '+elem+' ');
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
		fireEvent(msg.event, msg.elem, msg.time);
	}
});