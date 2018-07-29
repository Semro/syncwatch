'use strict';

//var socket = io.connect('https://syncevent.herokuapp.com', {
var socket = io.connect('http://localhost:3000', {
	reconnection: true,
	reconnectionDelayMax: 5000,
	reconnectionDelay: 1000,
});
var recieved = false;
var contentTabId;
var userName;

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
	// tabs.forEach(tab => {
		// chrome.tabs.executeScript(tab.id, { file: js/content.js }, result => {
			// const lastErr = chrome.runtime.lastError;
			// if (lastErr) console.log('tab: ' + tab.id + ' lastError: ' + JSON.stringify(lastErr));
		// });
	// });
	// chrome.tabs.executeScript({
	// 	'file': 'js/content.js',
	// 	'allFrames' : true
	// });
//	console.log(tabId); console.log(changeInfo); console.log(tab);

	chrome.tabs.executeScript({ file: 'js/content.js', allFrames: true });
});

function broadcast(event, elem, time)
{
	if (!recieved)
	{
		socket.json.send(
		{
			'event': event,
			'elem': elem,
			'time': time
		});
		console.log('broadcast: '+event);
	}
	else recieved = false;
}

socket.on('message', function(msg)
{
	recieved = true;
	chrome.tabs.sendMessage(contentTabId,
	{
		from: 'background',
		event: msg.event,
		elem: msg.elem,
		time: msg.time
	});
	console.log('socket.on: '+msg.event);
});

socket.on('pingt', function()
{
	socket.emit('pongt',
	{
		name: userName
	});
});

chrome.runtime.onMessage.addListener( function(msg, sender)
{
	if (msg.from == 'tabid')
	{
		contentTabId = sender.tab.id;
	}
	if (msg.from == 'content')
	{
		contentTabId = sender.tab.id;
		broadcast(msg.event, msg.elem, msg.time);
	}
	if (msg.from == 'join')
	{
		userName = msg.name;
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
console.log('background.js');