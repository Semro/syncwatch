'use strict'
var v = document.getElementsByTagName('video');
console.warn(' I AM ALIVE!!! I AM ALIVE!!! I AM ALIVE!!! I AM ALIVE!!! I AM ALIVE!!! I AM ALIVE!!!');
console.log(v);
chrome.runtime.sendMessage(
{
	from: 'console',
	res: v
});