'use strict'
let elements = document.getElementsByTagName('video');
addListeners(elements);
nodes = Array.prototype.slice.call(elements);
chrome.runtime.sendMessage(
{
	from: 'console',
	res: 'test'
});
console.log('frame');