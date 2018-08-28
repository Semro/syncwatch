'use strict';

var form = document.forms.connect;
var connect = form.elements.connect;
var disconnect = form.elements.disconnect;

function getUser()
{
	chrome.runtime.sendMessage(
	{
		from: 'getUser'
	});
}

function getStatus()
{
	chrome.runtime.sendMessage(
	{
		from: 'getStatus'
	});
}

function getUsersList()
{
	chrome.runtime.sendMessage(
	{
		from: 'getUsersList'
	});
}

connect.onclick = function()
{
	let user = {};
	user.name = form.elements.name.value;
	user.room = form.elements.room.value;
	user.from = 'join';
	chrome.runtime.sendMessage(user);
}

disconnect.onclick = function()
{
	chrome.runtime.sendMessage({from: 'disconnect'});
}

chrome.runtime.onMessage.addListener( function(msg)
{
	if (msg.from == 'status')
	{
		document.getElementById('status').innerHTML = 'status: '+msg.status;
	}
	if (msg.from == 'sendUsersList')
	{
		let inhtml = '';
		for (let key in msg.list) inhtml += '<li>'+msg.list[key]+'</li>';
		document.getElementById('usersList').innerHTML = inhtml;
	}
	if (msg.from == 'sendUser')
	{
		form.elements.name.value = msg.name;
		form.elements.room.value = msg.room;
	}
});

window.onload = function()
{
	getUser();
	getStatus();
	getUsersList();
}