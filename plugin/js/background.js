console.log('background.js');

var socket = io.connect('https://syncevent.herokuapp.com');
var recieved = false;
var pp = false;
var contentTabId;

socket.on('message', function (msg)
{
  recieved = true;
  console.log('socket.on: '+msg.event);
  chrome.tabs.sendMessage(contentTabId,
	{
		from: 'background',
		event: msg.event,
		elem: msg.elem,
		time: msg.time
	});
});

function broadcast(event, elem, time)
{
  if (!recieved)
  {
    console.log('broadcast: '+event);
    socket.json.send(
    {
      'event': event,
      'elem': elem,
      'time': time
    });
  }
  else recieved = false;
}

chrome.runtime.onMessage.addListener( function(msg, sender)
{
	if (msg.from == 'content')
	{
		contentTabId = sender.tab.id;
		broadcast(msg.event, msg.elem, msg.time);
	}
	if (msg.from == 'join')
	{
		socket.emit('join',
		{ 
		  name: msg.name,
		  room: msg.room
		});
	}
	if (msg.from == 'console')
	{
		console.log(msg.res);
	}
});