'use strict';

var form = document.forms.connect;
var connect = form.elements.connect;

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

chrome.runtime.onMessage.addListener( function(msg)
{
	if (msg.from == 'status')
	{
		if (msg.status == 'connect')
		{
			connect.value = 'disconnect';
			connect.onclick = function()
			{
				chrome.runtime.sendMessage({from: 'disconnect'});
			}
		}
		else
		{
			connect.value = 'connect';
			connect.onclick = function()
			{
				let user =
				{
					name: form.elements.name.value,
					room: form.elements.room.value,
					from: 'join'
				};
				chrome.runtime.sendMessage(user);
			}
		}
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
		document.getElementById('version').innerHTML = 'v. '+msg.version;
	}
});

window.onload = function()
{
	getUser();
	getStatus();
	getUsersList();
}