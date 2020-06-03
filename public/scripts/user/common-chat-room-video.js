// video / voice chat
// client join the room -> call all client diff (in the room) and add in the peers
const peers = []; // peers connect, each peer is peer-to-peer
const btnVideo = document.getElementById('btn-video-connect');
const btnAudio = document.getElementById('btn-audio-connect');
const meetingShow = document.getElementById('meeting-show');

// get media device of user
navigator.mediaDevices.getUserMedia =
  navigator.mediaDevices.getUserMedia ||
  navigator.mediaDevices.webkitGetUserMedia ||
  navigator.mediaDevices.mozGetUserMedia ||
  navigator.mediaDevices.msGetUserMedia;

// when user join the room -> create a list peer to connect to the rest user in the room
// receive room info (exclude self) to set
// each socketId is a answer peer (each rest user)
socket.on('roomInfoForStream', (roomInfo) => {
  outputShowMeeting();
  roomInfo.users.forEach((socketId) => {
    outputShowMeeting(socketId);

    // create a new peer
    const peer = createPeer(socketId, socket.id);

    // push to the peers
    peers.push({ offerId: socket.id, answerId: socketId, peer });
  });
});

// receive offer signal of caller (new user join the room)
socket.on('offerSignal', ({ signal, callerId }) => {
  // parse signal
  signal = JSON.parse(signal);

  // find peer is exists
  // because when addStream to the peer already exist -> signal event of this peer is still called
  const itemPeer = peers.find((peer) => peer.offerId === callerId);

  if (itemPeer) {
    // peer already exists
    // set new offer signal in this peer
    itemPeer.peer.signal(signal);
  } else {
    // peer not exists (new user join the room)
    const peer = addPeer(signal, callerId);

    // if this user (rest user) is turning on video -> set stream for peer
    if (window.localStream) {
      peer.addStream(window.localStream);
    }

    // push to the peers
    peers.push({ offerId: callerId, answerId: socket.id, peer });
  }
});

// receive answer signal from rest user
socket.on('answerSignal', ({ answerId, signal }) => {
  // parse signal
  signal = JSON.parse(signal);

  // find peer respectively
  const itemPeer = peers.find((p) => p.answerId === answerId);

  if (itemPeer) {
    // set answer signal for the peer
    itemPeer.peer.signal(signal);
  }
});

// receive signal stop video from a client in the room
socket.on('stopVideo', outputStopVideo);

// if (navigator.mediaDevices.getUserMedia) {
//   navigator.mediaDevices
//     .getUserMedia({ video: false, audio: true })
//     .then((stream) => {
//       stream.getVideoTracks()[0].enabled = false;
//       window.localAudioStream = stream;
//     })
//     .catch((err) => console.error(err));
// }

// audio btn click
btnAudio.addEventListener('click', async function () {
  if (this.dataset.state === 'off') {
    // turn on video
    // set UI
    this.dataset.state = 'on';
    this.innerHTML = '<i class="fas fa-microphone text-white"></i>';

    // get stream video from camera of user and set in the window
    if (navigator.mediaDevices.getUserMedia) {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });

      if (window.localStream) {
        peers.forEach((peer) => {
          peer.peer.addTrack(
            audioStream.getAudioTracks()[0],
            window.localStream
          );
        });
      } else {
        window.localStream = audioStream;
        // add stream to the all peer
        peers.forEach((peer) => {
          peer.peer.addStream(window.localStream);
        });
      }
    }
    // output my video
    // outputVideo();
  } else if (this.dataset.state === 'on') {
    // stop video
    // set UI
    this.dataset.state = 'off';
    this.innerHTML = '<i class="fas fa-microphone-slash text-danger"></i>';

    // remove all stream in the peers
    peers.forEach((peer) => {
      peer.peer.removeStream(window.localVideoStream);
    });

    // stop camera fo user
    window.localVideoStream.getVideoTracks()[0].stop();

    // remove stream in the window
    window.localVideoStream = null;

    // output stop my video
    socket.emit('stopVideoStream');
    outputStopVideo();
  }
});

// video btn click
btnVideo.addEventListener('click', async function () {
  if (this.dataset.state === 'off') {
    // turn on video
    // set UI
    this.dataset.state = 'on';
    this.innerHTML = '<i class="fas fa-video text-white"></i>';

    // get stream video from camera of user and set in the window
    if (navigator.mediaDevices.getUserMedia) {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      if (window.localStream) {
        peers.forEach((peer) => {
          peer.peer.addTrack(
            videoStream.getVideoTracks()[0],
            window.localStream
          );
        });
      } else {
        window.localStream = videoStream;
        // add stream to the all peer
        peers.forEach((peer) => {
          peer.peer.addStream(window.localStream);
        });
      }

      // output my video
      outputVideo();
    }
  } else if (this.dataset.state === 'on') {
    // stop video
    // set UI
    this.dataset.state = 'off';
    this.innerHTML = '<i class="fas fa-video-slash text-danger"></i>';

    // remove all stream in the peers
    peers.forEach((peer) => {
      peer.peer.removeStream(window.localStream);
    });

    // stop camera fo user
    window.localVideoStream.getVideoTracks()[0].stop();

    // remove stream in the window
    window.localVideoStream = null;

    // output stop my video
    socket.emit('stopVideoStream');
    outputStopVideo();
  }
});

// create area meeting item
function outputShowMeeting(id) {
  const div = document.createElement('div');
  div.className = 'meeting-part';
  div.dataset.id = id || 'my_video';

  div.innerHTML = `<img src="/images/917385.jpg">
    <video name="video" autoplay style="display='none'" ${
      id ? '' : 'muted'
    }></video>
    <video name="audio" autoplay style="display='none'" ${
      id ? '' : 'muted'
    }></video>`;

  meetingShow.appendChild(div);
}

// create new peer
function createPeer(socketId, callerId) {
  const peer = new SimplePeer({
    initiator: true, // init -> offer peer
    trickle: false,
  });

  // add events
  peer.on('connect', () => console.log('call connection'));

  peer.on('close', () => {
    console.log('call close');
  });

  // peer.on('data', (data) => console.log(data.toString()));

  peer.on('stream', (stream) => {
    window.testStream = stream;
    console.log('call stream');
    outputVideo(stream, socketId);
  });

  peer.on('track', (track, stream) => {
    console.log('call track');
    console.log(track);
    console.log(stream);
  });

  peer.on('signal', (signal) => {
    console.log('call signal');
    socket.emit('offerStream', {
      receiveId: socketId,
      callerId,
      signal: JSON.stringify(signal),
    });
  });

  return peer;
}

// create a new peer (answer peer) to add peers
function addPeer(signal, callerId) {
  outputShowMeeting(callerId);

  const peer = new SimplePeer({
    initiator: false, // no init -> answer peer
    trickle: false,
  });

  // add offer signal (signal receive from caller (new user join)) for peer
  peer.signal(signal);

  // add events
  peer.on('connect', () => console.log('answer connect'));

  peer.on('close', () => {
    console.log('answer close');
  });

  peer.on('signal', (signal) => {
    console.log('answer signal');
    socket.emit('answerStream', { signal: JSON.stringify(signal), callerId });
  });

  // peer.on('data', (data) => console.log(data.toString()));

  peer.on('stream', (stream) => {
    window.testStream = stream;
    console.log('answer stream');
    outputVideo(stream, callerId);
  });

  peer.on('track', (track, stream) => {
    console.log('answer track');
    console.log(track);
    console.log(stream);
  });

  return peer;
}

// output video
function outputVideo(stream = window.localStream, id = 'my_video') {
  const meetingItem = meetingShow.querySelector(`div[data-id="${id}"]`);
  if (meetingItem) {
    meetingItem.querySelector('img').style.display = 'none';
    const video = meetingItem.querySelector('video[name="video"]');
    video.style.display = 'block';
    if ('srcObject' in video) {
      video.srcObject = stream;
    } else {
      video.src = window.URL.createObjectURL(stream);
    }
  }
}

// output audio
function outputAudio(stream = window.localStream, id = 'my_video') {
  const meetingItem = meetingShow.querySelector(`div[data-id="${id}"]`);
  if (meetingItem) {
    const video = meetingItem.querySelector('video[name="audio"]');
    if ('srcObject' in video) {
      video.srcObject = stream;
    } else {
      video.src = window.URL.createObjectURL(stream);
    }
  }
}

// output stop video
function outputStopVideo(id = 'my_video') {
  const meetingItem = meetingShow.querySelector(`div[data-id="${id}"]`);
  if (meetingItem) {
    meetingItem.querySelector('img').style.display = 'block';
    const video = meetingItem.querySelector('video');
    video.style.display = 'none';
    if ('srcObject' in video) {
      video.srcObject = null;
    } else {
      video.src = null;
    }
  }
}
