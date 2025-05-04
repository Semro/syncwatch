// used for loading netflix.js script into page header

const scriptElement = document.createElement('script');
scriptElement.src = browser.runtime.getURL('js/players/netflix/netflix.js');
scriptElement.onload = () => {
  this.remove();
};
(document.head || document.documentElement).appendChild(scriptElement);
