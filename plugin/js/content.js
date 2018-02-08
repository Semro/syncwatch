'use strict';

var pp = false;
var elements = [];
var nodes = [];

function rele()
{
	elements = document.getElementsByTagName('video');
	nodes = Array.prototype.slice.call(elements);
}

function broadcast(event)
{
	rele();
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
	rele();
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

document.addEventListener('play', function(event) { broadcast(event); }, true);
document.addEventListener('pause', function(event) { broadcast(event); }, true);
document.addEventListener('seeked', function(event)
{ 
  if (!pp)
  {
    broadcast(event);
  }
  pp = false;
}, true);

chrome.runtime.sendMessage( {from: 'tabid'} );

chrome.runtime.onMessage.addListener( function(msg)
{
	if (msg.from == 'background')
	{
		evFire(msg.event, msg.elem, msg.time);
	}
});

console.log('content.js');