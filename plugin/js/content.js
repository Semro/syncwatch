console.log('content.js');
var elements = document.getElementsByTagName('video');
var nodes = Array.prototype.slice.call(elements); // i think it's not good
var pp = false;

console.log(elements);
console.log(nodes);

chrome.runtime.sendMessage( {from: 'tabid'} );

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
  	elem: nodes.indexOf(event.target), // i think it's not good
  	time: event.target.currentTime
	});
}

function evFire(event, elem, time)
{
	rele();
  console.log(event+' '+elem+' ');
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

chrome.runtime.onMessage.addListener( function(msg)
{
	if (msg.from == 'background')
	{
		evFire(msg.event, msg.elem, msg.time);
	}
});