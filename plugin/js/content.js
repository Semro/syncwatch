console.log("content.js");
//var socket = io.connect('https://syncevent.herokuapp.com');
//var socket = io.connect('http://localhost:5000');
var elements = document.getElementsByTagName("video");
var nodes = Array.prototype.slice.call(elements); // i think it's not good
var pp = false;

function broadcast(event, elem)
{
  var curTime = elements[elem].currentTime;
  chrome.runtime.sendMessage(
  {
  	from: "content",
  	event: event,
  	elem: elem,
  	time: curTime
	});
}

function evFire(event, elem, time)
{
  console.log("evFire: "+event);
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
}

function evFired(event)
{
  return nodes.indexOf(event.target);
}

document.addEventListener('play', function(event) { broadcast('play', evFired(event)); }, true);
document.addEventListener('pause', function(event) { broadcast('pause', evFired(event)); }, true);
document.addEventListener('seeked', function(event) 
{ 
  if (!pp) 
  {
    broadcast('seeked', evFired(event));
  }
  pp = false;
}, true);

chrome.runtime.onMessage.addListener( function(msg, sender)
{
	if (msg.from == "background")
	{
		evFire(msg.event, msg.elem, msg.time);
	}
});