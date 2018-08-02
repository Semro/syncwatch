'use strict';

var form = document.forms.connect;
var connect = form.elements.connect;
var disconnect = form.elements.disconnect;

chrome.storage.sync.get('name', function (result)
{
	form.elements.name.value = result.name;
});

chrome.storage.sync.get('room', function (result)
{
	form.elements.room.value = result.room;
});

connect.onclick = function()
{
	var name = form.elements.name.value;
	var room = form.elements.room.value;

	chrome.storage.sync.set(
	{
		'name': name,
		'room': room
	});

	chrome.runtime.sendMessage(
	{
		from: 'join',
		name: name,
		room: room
	});
}

disconnect.onclick = function()
{
	chrome.runtime.sendMessage({from: 'disconnect'});
}

chrome.runtime.onMessage.addListener( function(msg, sender)
{
	if (msg.from == 'status')
	{
		document.getElementById('status').innerHTML = 'status: '+msg.status;
	}
});

//chrome.runtime.sendMessage({from: 'console', res: 'res'});