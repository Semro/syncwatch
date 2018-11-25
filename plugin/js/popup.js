'use strict';

var roomElement = document.getElementById('room');
var nameElement = document.getElementById('name');
var connectElement = document.getElementById('connect');
var usersListTitle = document.getElementById('usersListTitle');

function getData(type)
{
	chrome.runtime.sendMessage(
	{
		from: 'get'+type
	});
}

chrome.runtime.onMessage.addListener( function(msg)
{
	if (msg.from === 'status')
	{
		if (msg.status === 'connect')
		{
			connectElement.value = 'disconnect';
			connectElement.onclick = function()
			{
				chrome.runtime.sendMessage({from: 'disconnect'});
			}
			usersListTitle.style.display = 'block';
		}
		else
		{
			connectElement.value = 'connect';
			connectElement.onclick = function()
			{
				let user =
				{
					name: nameElement.value,
					room: roomElement.value,
				};
				chrome.runtime.sendMessage({from: 'join', data: user});
				connectElement.value = 'connecting...';
			}
			usersListTitle.style.display = 'none';
		}
		document.getElementById('status').innerText = 'status: '+msg.status;
	}
	if (msg.from === 'sendUsersList')
	{
		document.getElementById('usersList').innerText = '';
		let usersList = document.getElementById('usersList');
		for (let key in msg.list)
		{
			let li = document.createElement('li');
			li.innerText = msg.list[key];
			usersList.appendChild(li);
		}
	}
	if (msg.from === 'sendUser')
	{
		msg = msg.data;
		nameElement.value = msg.name;
		roomElement.value = msg.room;
	}
});

window.onload = function()
{
	let typesOfData = ['Debug', 'User', 'Status', 'UsersList'];
	for (let val of typesOfData) getData(val);
}