// used for loading netflix.js script into page header

const scriptElement = document.createElement('script');
scriptElement.src = chrome.runtime.getURL('js/players/netflix/netflix.js');
scriptElement.onload = () => {
  this.remove();
};
(document.head || document.documentElement).appendChild(scriptElement);
