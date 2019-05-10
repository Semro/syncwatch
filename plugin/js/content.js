const debug = true;

let nodes = [];
let recieved = false;
let recievedEvent;
let loading = false;

function sendMessageInRuntime(msg) {
  try {
    chrome.runtime.sendMessage(msg);
  } catch (err) {
    if (debug) throw new Error(err);
  }
}

function iframeIndex(win) {
  // eslint-disable-next-line no-param-reassign
  win = win || window;
  if (win.parent !== win) {
    for (let i = 0; i < win.parent.frames.length; i++) {
      if (win.parent.frames[i] === win) {
        return i;
      }
    }
    throw Error('In a frame, but could not find myself');
  } else {
    return -1;
  }
}

function iframeFullIndex(win) {
  // eslint-disable-next-line no-param-reassign
  win = win || window;
  if (iframeIndex(win) < 0) {
    return '-1';
  }
  return `${iframeFullIndex(win.parent)}${iframeIndex(win)}`;
}

function broadcast(event) {
  const eventSend = {
    location: iframeFullIndex(window),
    type: event.type,
    element: nodes.indexOf(event.target),
    currentTime: event.target.currentTime,
    playbackRate: event.target.playbackRate
  };
  if (eventSend.type === 'progress') eventSend.type = 'pause';
  else if (eventSend.type === 'playing') eventSend.type = 'play';
  sendMessageInRuntime({
    from: 'content',
    data: eventSend
  });
  if (debug) console.log(`%cbroadcast: ${eventSend.type}`, 'background: #00590E;');
}

function onProgress(event) {
  const prevLoading = loading;
  if (event.target.readyState < 3) loading = true;
  else loading = false;
  if (prevLoading === false && loading === true) {
    broadcast(event);
  }
}

function onEvent(event) {
  //	if (event.type === 'progress') console.log('event:'+event.type+' '+event.target.readyState+' recieved: '+recieved+' loading: '+loading);
  //	else console.log('event:'+event.type+' '+' recieved: '+recieved+' loading: '+loading);
  if (recieved) {
    if (recievedEvent === 'play') {
      if (event.type === 'progress') {
        onProgress(event);
        recieved = false;
      } else if (event.type === 'playing') recieved = false;
    } else if (recievedEvent === 'pause') {
      if (event.type === 'seeked') recieved = false;
    } else if (recievedEvent === event.type) recieved = false;
  } else if (event.type === 'seeked') {
    if (event.target.paused) broadcast(event);
  } else if (event.type === 'progress') {
    onProgress(event);
  } else broadcast(event);
}

function addListeners(nodesCollection) {
  const eventTypes = ['playing', 'pause', 'seeked', 'ratechange', 'progress'];
  for (let i = 0; i < nodesCollection.length; i++) {
    for (let j = 0; j < eventTypes.length; j++) {
      nodesCollection[i].addEventListener(eventTypes[j], onEvent, true);
    }
  }
}

function init() {
  const nodesCollection = document.getElementsByTagName('video');
  addListeners(nodesCollection);
  nodes = Array.from(nodesCollection);
}

function errorOnEvent(err) {
  if (err.name === 'NotAllowedError') {
    sendMessageInRuntime({
      from: 'errorOnEvent'
    });
  }
}

function fireEvent(event) {
  recieved = true;
  recievedEvent = event.type;
  switch (event.type) {
    case 'play': {
      nodes[event.element].currentTime = event.currentTime;
      nodes[event.element].play().catch(errorOnEvent);
      break;
    }
    case 'pause': {
      nodes[event.element].pause();
      nodes[event.element].currentTime = event.currentTime;
      break;
    }
    case 'seeked': {
      nodes[event.element].currentTime = event.currentTime;
      break;
    }
    case 'ratechange': {
      nodes[event.element].playbackRate = event.playbackRate;
      break;
    }
  }
}

init();

const observer = new MutationObserver(() => {
  init();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.from === 'background') {
    if (msg.data.location === iframeFullIndex(window)) {
      fireEvent(msg.data);
      if (debug) console.log(`%crecieved: ${msg.data.type}`, 'background: #542100;');
    }
    if (msg.data === 'isContentScriptInjected') {
      if (nodes.length !== 0) {
        sendResponse(true);
      }
    }
  }
});
