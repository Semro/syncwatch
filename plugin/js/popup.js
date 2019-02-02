'use strict';

var roomElement = document.getElementById('room');
var nameElement = document.getElementById('name');
var connectElement = document.getElementById('connect');
var shareElement = document.getElementById('share');
var sharedElement = document.getElementById('shared');
var usersListTitle = document.getElementById('usersListTitle');
var usersList = document.getElementById('usersList');
var errorElement = document.getElementById('error');

function getData(type)
{
	chrome.runtime.sendMessage(
	{
		from: 'get'+type
	});
}

function getFaviconFromUrl(url)
{
	let i = 0;
	let positions = [];
	while(true)
	{
		i = url.indexOf('/', i);
		if (i === -1) break;
		else
		{
			positions.push(i);
			i++;
		}
	}
	return url.substring(0, positions[2]+1) + 'favicon.ico';
}

function displayElements(display)
{
	shareElement.style.display = display;
	usersListTitle.style.display = display;
	usersList.style.display = display;
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
			connectElement.value = chrome.i18n.getMessage('popup_button_disconnect');
			connectElement.onclick = ()=>
			{
				chrome.runtime.sendMessage({from: 'disconnect'});
			}
			displayElements('block');
		}
		else
		{
			connectElement.value = chrome.i18n.getMessage('popup_button_connect');
			connectElement.onclick = ()=>
			{
				errorElement.style.display = 'none';
				let user =
				{
					name: nameElement.value,
					room: roomElement.value
				};
				chrome.runtime.sendMessage({from: 'join', data: user});
				connectElement.value = `${chrome.i18n.getMessage('popup_button_connecting')}...`;
			}
			displayElements('none');
			sharedElement.style.display = 'none';
		}
		document.getElementById('status').innerText = `${chrome.i18n.getMessage('popup_status')}:\
													   ${chrome.i18n.getMessage('socket_event_'+msg.status)}`;
	}
	if (msg.from === 'share')
	{
		if (Object.keys(msg.data).length !== 0)
		{
			sharedElement.href = msg.data.url;
			sharedElement.innerText = '';
			let img = document.createElement('img');
			let span = document.createElement('span');
			img.style.height = img.style.width = '16px';
			img.src = getFaviconFromUrl(msg.data.url);
			span.innerText = msg.data.title;
			sharedElement.appendChild(img);
			sharedElement.appendChild(span);
			sharedElement.style.display = 'block';
		}
	}
	if (msg.from === 'sendUsersList')
	{
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
		errorElement.style.display = 'block';
		errorElement.innerText = chrome.i18n.getMessage(msg.error);
	}
	if (msg.from === 'sendUser')
	{
		nameElement.value = msg.data.name;
		roomElement.value = msg.data.room;
	}
});

nameElement.placeholder = chrome.i18n.getMessage('popup_input_name');
roomElement.placeholder = chrome.i18n.getMessage('popup_input_room');
shareElement.value = chrome.i18n.getMessage('popup_button_share');
usersListTitle.innerText = `${chrome.i18n.getMessage('popup_usersInRoom')}:`;

let typesOfData = ['User', 'Status', 'UsersList', 'Share'];
for (let val of typesOfData) getData(val);