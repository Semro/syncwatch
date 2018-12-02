'use strict';

var roomElement = document.getElementById('room');
var nameElement = document.getElementById('name');
var connectElement = document.getElementById('connect');
var shareElement = document.getElementById('share');
var sharedElement = document.getElementById('shared');
var usersListTitle = document.getElementById('usersListTitle');

function getData(type)
{
	chrome.runtime.sendMessage(
	{
		from: 'get'+type
	});
}

function displayElements(display)
{
	usersListTitle.style.display = display;
	share.style.display = display;
	shared.style.display = display;
}

shareElement.onclick = ()=>
{
	chrome.runtime.sendMessage({from: 'popupShare'});
}

chrome.runtime.onMessage.addListener((msg)=>
{
	if (msg.from === 'status')
	{
		if (msg.status === 'connect')
		{
			connectElement.value = 'disconnect';
			connectElement.onclick = ()=>
			{
				chrome.runtime.sendMessage({from: 'disconnect'});
			}
			displayElements('block');
		}
		else
		{
			connectElement.value = 'connect';
			connectElement.onclick = ()=>
			{
				document.getElementById('error').style.display = 'none';
				let user =
				{
					name: nameElement.value,
					room: roomElement.value,
				};
				chrome.runtime.sendMessage({from: 'join', data: user});
				connectElement.value = 'connecting...';
			}
			displayElements('none');
		}
		document.getElementById('status').innerText = 'status: '+msg.status;
	}
	if (msg.from === 'share')
	{
		sharedElement.href = msg.data.url;
		sharedElement.children[0].src = sharedElement.hostname + '/favicon.ico';
		sharedElement.children[1].innerText = msg.data.title;
	}
	if (msg.from === 'sendUsersList')
	{
		let usersList = document.getElementById('usersList');
		usersList.innerText = '';
		for (let key in msg.list)
		{
			let li = document.createElement('li');
			li.innerText = msg.list[key];
			usersList.appendChild(li);
		}
	}
	if (msg.from === 'sendError')
	{
		let errorElement = document.getElementById('error');
		errorElement.style.display = 'block';
		errorElement.innerText = msg.error;
	}
	if (msg.from === 'sendUser')
	{
		msg = msg.data;
		nameElement.value = msg.name;
		roomElement.value = msg.room;
	}
});

window.onload = ()=>
{
	let typesOfData = ['Debug', 'User', 'Status', 'UsersList'];
	for (let val of typesOfData) getData(val);
}