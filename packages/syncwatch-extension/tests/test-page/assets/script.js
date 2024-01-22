
// the following was extracted from the spec in October 2014

var media_events = new Array();
media_events["loadstart"] = 0;
media_events["progress"] = 0;
media_events["suspend"] = 0;
media_events["abort"] = 0;
media_events["error"] = 0;
media_events["emptied"] = 0;
media_events["stalled"] = 0;
media_events["loadedmetadata"] = 0;
media_events["loadeddata"] = 0;
media_events["canplay"] = 0;
media_events["canplaythrough"] = 0;
media_events["playing"] = 0;
media_events["waiting"] = 0;
media_events["seeking"] = 0;
media_events["seeked"] = 0;
media_events["ended"] = 0;
media_events["durationchange"] = 0;
media_events["timeupdate"] = 0;
media_events["play"] = 0;
media_events["pause"] = 0;
media_events["ratechange"] = 0;
media_events["resize"] = 0;
media_events["volumechange"] = 0;

var media_properties = [ "error", "src", "srcObject", "currentSrc", "crossOrigin", "networkState", "preload", "buffered", "readyState", "seeking", "currentTime", "duration",
"paused", "defaultPlaybackRate", "playbackRate", "played", "seekable", "ended", "autoplay", "loop", "controls", "volume",
"muted", "defaultMuted", "audioTracks", "videoTracks", "textTracks", "width", "height", "videoWidth", "videoHeight", "poster" ];

// CODE START HERE

var media_properties_elts = null;

var webm = null;

function init() {
    document._video = document.getElementById("video");


    webm = document.getElementById("webm");

    media_properties_elts = new Array(media_properties.length);

    init_events("events", media_events);
    init_properties("properties", media_properties, media_properties_elts);
    init_mediatypes();
    // properties are updated even if no event was triggered
    setInterval(update_properties, 250);
}
document.addEventListener("DOMContentLoaded", init, false);

function init_events(id, arrayEventDef) {
	var f;
    for (key in arrayEventDef) {
		document._video.addEventListener(key, capture, false);
    }

    var tbody = document.getElementById(id);
    var i = 1;
    var tr = null;
    for (key in arrayEventDef) {
		if (tr == null) tr    = document.createElement("tr");
		var th = document.createElement("th");
		th.textContent = key;
		var td = document.createElement("td");
		td.setAttribute("id", "e_" + key);
		td.textContent = "0";
		td.className = "false";
		tr.appendChild(th);
		tr.appendChild(td);

		if ((i++ % 5) == 0) {
		    tbody.appendChild(tr);
		    tr = null;
		}
    }
    if (tr != null) tbody.appendChild(tr);
}
function init_properties(id, arrayPropDef, arrayProp) {
    var tbody = document.getElementById(id);
    var i = 0;
    var tr = null;
    do {
		if (tr == null) tr    = document.createElement("tr");
		var th = document.createElement("th");
		th.textContent = arrayPropDef[i];
		var td = document.createElement("td");
		var r;
		td.setAttribute("id", "p_" + arrayPropDef[i]);
		r = eval("document._video." + arrayPropDef[i]);
		td.textContent = r;
		if (typeof(r) != "undefined") {
		    td.className = "true";
		} else {
		    td.className = "false";
		}
		tr.appendChild(th);
		tr.appendChild(td);
		arrayProp[i] = td;
		if ((++i % 3) == 0) {
		    tbody.appendChild(tr);
		    tr = null;
		}
    } while (i < arrayPropDef.length);
    if (tr != null) tbody.appendChild(tr);
}

function init_mediatypes() {
    var tbody = document.getElementById("m_video");
    var i = 0;
    var tr = document.createElement("tr");
    var videoTypes = [ "video/mp4", "video/webm" ];
    i = 0;
    tr = document.createElement("tr");
    do {
	var td = document.createElement("th");
	td.textContent = videoTypes[i];
	tr.appendChild(td);
    } while (++i < videoTypes.length);
    tbody.appendChild(tr);

    i = 0;
    tr = document.createElement("tr");

    if (!!document._video.canPlayType) {
      do {
	var td = document.createElement("td");
	var support = document._video.canPlayType(videoTypes[i]);
	td.textContent = '"' + support + '"';
	if (support === "maybe") {
	    td.className = "true";
	} else if (support === "") {
	    td.className = "false";
	}
	tr.appendChild(td);
      } while (++i < videoTypes.length);
      tbody.appendChild(tr);
    }
}

function capture(event) {
    media_events[event.type]++;
}

function update_properties() {
    var i = 0;
    for (key in media_events) {
		var e = document.getElementById("e_" + key);
		if (e) {
		    e.textContent = media_events[key];
		    if (media_events[key] > 0) e.className = "true";
		}
    }
    for (key in media_properties) {
		var val = eval("document._video." + media_properties[key]);
		media_properties_elts[i++].textContent = val;
    }
    if (document._video.audioTracks !== undefined) {
		try {
		    var td = document.getElementById("m_audiotracks");
		    td.textContent = document._video.audioTracks.length;
		    td.className = "true";
		} catch (e) {}
	}
	if (document._video.videoTracks !== undefined) {
		try {
		    var td = document.getElementById("m_videotracks");
		    td.textContent = document._video.videoTracks.length;
		    td.className = "true";
		} catch (e) {}
	}
	if (document._video.textTracks !== undefined) {
		try {
		    var td = document.getElementById("m_texttracks");
		    td.textContent = document._video.textTracks.length;
		    td.className = "true";
		} catch (e) {}
    }
}

var videos =
[
 [
	"http://media.w3.org/2010/05/sintel/poster.png",
	"http://media.w3.org/2010/05/sintel/trailer.mp4",
	"http://media.w3.org/2010/05/sintel/trailer.webm"
 ],
 [
	"http://media.w3.org/2010/05/bunny/poster.png",
	"http://media.w3.org/2010/05/bunny/trailer.mp4"
 ],
 [
	"http://media.w3.org/2010/05/bunny/poster.png",
	"http://media.w3.org/2010/05/bunny/movie.mp4"
 ],
 [
	"http://media.w3.org/2010/05/video/poster.png",
	"http://media.w3.org/2010/05/video/movie_300.mp4",
	"http://media.w3.org/2010/05/video/movie_300.webm"
 ]
 ];

function resize() {
    document._video.width = document._video.videoWidth + 10;
    document._video.height = document._video.videoHeight + 10;
}

function getVideo() {
	return document._video;
}

function switchVideo(n) {
	if (n >= videos.length) n = 0;

	var mp4 = document.getElementById("mp4");
	var parent = mp4.parentNode;

	document._video.setAttribute("poster", videos[n][0]);
	mp4.setAttribute("src", videos[n][1]);

	if (videos[n][2]) {
		if (webm.parentNode == null) {
			parent.insertBefore(webm, mp4);
		}
		webm.setAttribute("src", videos[n][2]);
	} else {
		if (webm.parentNode != null) {
	    	parent.removeChild(webm);
		}
    }
    document._video.width = 0;
    document._video.height = 0;
    document._video.load();
}

