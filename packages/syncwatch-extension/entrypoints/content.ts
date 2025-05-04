import { RoomEvent } from 'syncwatch-types';

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  runAt: 'document_end',

  main() {
    type BaseRuntimeMessage<From extends string, Data> = {
      from: From;
      data: Data;
    };

    type MessageContentInjected = BaseRuntimeMessage<'background', 'isContentScriptInjected'>;
    type MessageBackgroundEvent = BaseRuntimeMessage<'background', RoomEvent>;

    type MessageRuntime = MessageContentInjected | MessageBackgroundEvent;

    type BaseContentMessage<From extends string> = {
      from: From;
    };

    type ContentEventMessage = BaseContentMessage<'content'> & { data: RoomEvent };
    type ContentErrorOnEventMessage = BaseContentMessage<'errorOnEvent'>;

    type MessageContent = ContentEventMessage | ContentErrorOnEventMessage;

    {
      const debug = false;
      const eventTypes = ['playing', 'pause', 'seeked', 'ratechange', 'progress'] as const;

      interface EventHTMLVideoElement extends Event {
        target: HTMLVideoElement;
        type: (typeof eventTypes)[number];
      }

      let nodes: HTMLVideoElement[] = [];
      let recieved = false;
      let recievedEvent: RoomEvent['type'];
      let loading = false;

      function sendMessageInRuntime(msg: MessageContent) {
        try {
          browser.runtime.sendMessage(msg);
        } catch (err) {
          if (debug) console.error(err);
        }
      }

      function iframeIndex(win: Window) {
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

      function iframeFullIndex(win: Window): string {
        // eslint-disable-next-line no-param-reassign
        win = win || window;
        if (iframeIndex(win) < 0) {
          return '-1';
        }
        return `${iframeFullIndex(win.parent)}${iframeIndex(win)}`;
      }

      function broadcast(event: EventHTMLVideoElement) {
        let eventTypeRoom;

        if (event.type === 'progress') eventTypeRoom = 'pause';
        else if (event.type === 'playing') eventTypeRoom = 'play';
        else eventTypeRoom = event.type;

        const eventSend = {
          location: iframeFullIndex(window),
          type: eventTypeRoom as RoomEvent['type'],
          element: nodes.indexOf(event.target),
          currentTime: event.target.currentTime,
          playbackRate: event.target.playbackRate,
        };

        sendMessageInRuntime({
          from: 'content',
          data: eventSend,
        });
        if (debug) console.log(`%cbroadcast: ${eventSend.type}`, 'background: #fefe22;');
      }

      function onProgress(event: EventHTMLVideoElement) {
        const prevLoading = loading;
        if (event.target.readyState < 3) loading = true;
        else loading = false;
        if (prevLoading === false && loading === true) {
          broadcast(event);
        }
      }

      function onEvent(event: EventHTMLVideoElement) {
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

      function addListeners(nodesCollection: HTMLCollectionOf<HTMLVideoElement>) {
        for (const node of nodesCollection) {
          if (!node) break;
          for (const eventType of eventTypes) {
            // @ts-expect-error
            node.addEventListener(eventType, onEvent, true);
          }
        }
      }

      function init() {
        const nodesCollection = document.getElementsByTagName('video');
        addListeners(nodesCollection);
        nodes = Array.from(nodesCollection);
      }

      function errorOnEvent(err: DOMException) {
        if (err.name === 'NotAllowedError') {
          sendMessageInRuntime({
            from: 'errorOnEvent',
          });
        }
      }

      function isNetflix() {
        // are we on the netflix.com page?
        return window.location.host === 'www.netflix.com';
      }

      function fireEventNetflix(event: RoomEvent) {
        switch (event.type) {
          case 'play': {
            window.postMessage({
              action: 'seek',
              time: event.currentTime,
            });
            window.postMessage({
              action: 'play',
            });
            break;
          }
          case 'pause': {
            window.postMessage({
              action: 'pause',
            });
            window.postMessage({
              action: 'seek',
              time: event.currentTime,
            });
            break;
          }
          case 'seeked': {
            window.postMessage({
              action: 'seek',
              time: event.currentTime,
            });
            break;
          }
        }
      }

      function fireEvent(event: RoomEvent) {
        recieved = true;
        recievedEvent = event.type;

        // if we are on netflix.com use the custom function instead
        if (isNetflix()) {
          fireEventNetflix(event);
          return;
        }

        const element = nodes[event.element];
        if (!element) return;

        element.playbackRate = event.playbackRate;
        element.currentTime = event.currentTime;

        switch (event.type) {
          case 'play': {
            element.play().catch(errorOnEvent);
            break;
          }
          case 'pause': {
            element.pause();
            break;
          }
        }
      }

      init();

      const observer = new MutationObserver(() => {
        init();
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });

      browser.runtime.onMessage.addListener((msg: MessageRuntime, _, sendResponse) => {
        if (msg.from === 'background') {
          if (msg.data === 'isContentScriptInjected') {
            if (nodes.length !== 0) {
              sendResponse(true);
            }
          } else if (msg.data.location === iframeFullIndex(window)) {
            fireEvent(msg.data);
            if (debug) console.log(`%crecieved: ${msg.data.type}`, 'background: #9966cc;');
          }
        }
      });
    }
  },
});
