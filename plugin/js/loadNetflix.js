// used for loading netflix.js script into page header

var s = document.createElement('script');
s.src = chrome.runtime.getURL('js/netflix.js');
s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);