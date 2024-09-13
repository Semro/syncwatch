// this file gets injected into <head> of netflix page
// it allows us to interact with the window.netflix object

function getPlayer() {
  // get the netflix player object
  const { videoPlayer } = window.netflix.appContext.state.playerApp.getAPI();

  // Getting player id
  const playerSessionId = videoPlayer.getAllPlayerSessionIds()[0];
  const player = videoPlayer.getVideoPlayerBySessionId(playerSessionId);

  return player;
}

window.addEventListener('message', (event) => {
  const player = getPlayer();

  player.setPlaybackRate(event.data.playbackRate);

  switch (event.data.action) {
    case 'play': {
      player.play();
      break;
    }
    case 'pause': {
      player.pause();
      break;
    }
    case 'seek': {
      player.seek(event.data.time * 1000);
      break;
    }
  }
});
