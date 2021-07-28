// this file gets injected into <head> of netflix page
// it allows us to interact with the window.netflix object

function getPlayer() {
    // get the netflix player object
    const videoPlayer = netflix.appContext.state.playerApp.getAPI().videoPlayer

    // Getting player id
    const playerSessionId = videoPlayer.getAllPlayerSessionIds()[0]
    const player = videoPlayer.getVideoPlayerBySessionId(playerSessionId)

    return player;
}

window.addEventListener('message', event => {
    const player = getPlayer();

    // console.log("registered event", event)

    switch (event.data.action) {
        case "play": {
            player.play();
            break;
        }
        case "pause": {
            player.pause();
            break;
        }
        case "seek": {
            player.seek(event.data.time * 1000);
            break;
        }
        case "setPlaybackRate": {
            player.setPlaybackRate(event.data.playbackRate);
            break;
        }
    }
});