'use strict';

// Google Analytics
var _AnalyticsCode = 'UA-124816635-1';
var _gaq = _gaq || [];
_gaq.push(['_setAccount', _AnalyticsCode]);
_gaq.push(['_trackPageview']);
// Google Analytics end

var form = document.forms.connect;
var connect = form.elements.connect;

function getData(type)
{
	chrome.runtime.sendMessage(
	{
		from: 'get'+type
	});
}

chrome.runtime.onMessage.addListener( function(msg)
{
	if (msg.from == 'sendDebug')
	{
		if (msg.debug == false)
		{
			(function()
			{
				let ga = document.createElement('script');
				ga.type = 'text/javascript';
				ga.async = true;
				ga.src = 'js/ga.js';
				let s = document.getElementsByTagName('script')[0];
				s.parentNode.insertBefore(ga, s);
			})();
		}
	}
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
				};
				chrome.runtime.sendMessage({from: 'join', data: user});
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
		msg = msg.data;
		form.elements.name.value = msg.name;
		form.elements.room.value = msg.room;
		document.getElementById('version').innerHTML = 'v. '+msg.version;
	}
});

window.onload = function()
{
	let typesOfData = ['Debug', 'User', 'Status', 'UsersList'];
	for (let val of typesOfData) getData(val);
}