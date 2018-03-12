'use strict';

var pp = false;
var elements = [];
var nodes = [];

function rele()
{
	elements = document.getElementsByTagName('video');
	for (let i = 0; i < elements.length; i++)
	{
		elements[i].addEventListener('play', function(event) { broadcast(event); }, true);
		elements[i].addEventListener('pause', function(event) { broadcast(event); }, true);
		elements[i].addEventListener('seeked', function(event)
		{
			if (!pp)
			{
				broadcast(event);
			}
			pp = false;
		}, true);
	}
	nodes = Array.prototype.slice.call(elements);
}

function broadcast(event)
{
	chrome.runtime.sendMessage(
	{
		from: 'content',
		event: event.type,
		elem: nodes.indexOf(event.target),
		time: event.target.currentTime
	});
}

function evFire(event, elem, time)
{
	switch (event)
	{
		case 'play':
			pp = true;
			elements[elem].currentTime = time;
			elements[elem].play();
			break;
		case 'pause':
			pp = true;
			elements[elem].currentTime = time;
			elements[elem].pause();
			break;
		case 'seeked':
			elements[elem].currentTime = time;
			break;
	}
	console.log(event+' '+elem+' ');
}

rele();
/*
document.addEventListener('play', function(event) { broadcast(event); }, true);
document.addEventListener('pause', function(event) { broadcast(event); }, true);
document.addEventListener('seeked', function(event)
{
	if (!pp)
	{
		broadcast(event);
	}
	pp = false;
}, true);*/

chrome.runtime.sendMessage( {from: 'tabid'} );

chrome.runtime.onMessage.addListener( function(msg)
{
	if (msg.from == 'background')
	{
		evFire(msg.event, msg.elem, msg.time);
	}
});

console.log('content.js');