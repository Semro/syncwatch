(function(){"use strict";function t(){const{videoPlayer:e}=window.netflix.appContext.state.playerApp.getAPI(),a=e.getAllPlayerSessionIds()[0];return e.getVideoPlayerBySessionId(a)}window.addEventListener("message",e=>{const a=t();switch(e.data.action){case"play":{a.play();break}case"pause":{a.pause();break}case"seek":{a.seek(e.data.time*1e3);break}case"setPlaybackRate":{a.setPlaybackRate(e.data.playbackRate);break}}})})();
