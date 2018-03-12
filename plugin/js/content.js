'use strict';

var pp = false;
var nodes = [];

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

function rele()
{
	let elements = document.getElementsByTagName('video');
	addListeners(elements);
	nodes = Array.prototype.slice.call(elements);
	let frames = document.getElementsByTagName('iframe');
	console.warn(frames);
	for (let i = 0; i < frames.length; i++)
	{
		let bufmas = [];
		let buf = frames[i].contentWindow.document.getElementsByTagName('video'); // cross-origin :(
		addListeners(buf);
		console.warn(buf);

		bufmas = Array.prototype.slice.call(buf);
		nodes = nodes.concat(bufmas);
	}
	console.log('rele');
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
   rele();
};

chrome.runtime.sendMessage( {from: 'tabid'} );

chrome.runtime.onMessage.addListener( function(msg)
{
	if (msg.from == 'background')
	{
		evFire(msg.event, msg.elem, msg.time);
	}
});

console.log('content.js');