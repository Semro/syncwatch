// used for loading netflix.js script into page header

const s = document.createElement('script');
s.src = chrome.runtime.getURL('js/players/netflix/netflix.js');
s.onload = () => {
  this.remove();
};
(document.head || document.documentElement).appendChild(s);
