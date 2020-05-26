// video / voice chat
const peers = [];
const btnVideo = document.getElementById('btn-video-connect');
const btnAudio = document.getElementById('btn-audio-connect');

navigator.mediaDevices.getUserMedia =
  navigator.mediaDevices.getUserMedia ||
  navigator.mediaDevices.webkitGetUserMedia ||
  navigator.mediaDevices.mozGetUserMedia ||
  navigator.mediaDevices.msGetUserMedia;

// if (navigator.mediaDevices.getUserMedia) {
//   navigator.mediaDevices
//     .getUserMedia({ video: false, audio: true })
//     .then((stream) => {
//       stream.getVideoTracks()[0].enabled = false;
//       window.localAudioStream = stream;
//     })
//     .catch((err) => console.error(err));
// }

btnVideo.addEventListener('click', async function () {
  if (this.dataset.state === 'off') {
    this.dataset.state = 'on';
    this.innerHTML = '<i class="fas fa-video text-white"></i>';

    if (navigator.mediaDevices.getUserMedia) {
      window.localVideoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    }

    peers.forEach((peer) => {
      peer.peer.addStream(window.localVideoStream);
    });

    // output your video
    outputVideo();
  } else if (this.dataset.state === 'on') {
    this.dataset.state = 'off';
    this.innerHTML = '<i class="fas fa-video-slash text-danger"></i>';
    peers.forEach((peer) => {
      peer.peer.removeStream(window.localVideoStream);
    });
    window.localVideoStream.getVideoTracks()[0].stop();
    window.localVideoStream = null;

    outputStopVideo();
  }
});

// each socketId is a answer peer
socket.on('roomInfoForStream', (roomInfo) => {
  roomInfo.users.forEach((socketId) => {
    const peer = createPeer(socketId, socket.id);
    peers.push({ offerId: socket.id, answerId: socketId, peer });
  });
});

function createPeer(socketId, callerId) {
  const peer = new SimplePeer({
    initiator: true,
    trickle: false,
  });

  peer.on('connect', () => console.log('connection'));

  peer.on('data', (data) => console.log(data.toString()));

  peer.on('stream', (stream) => {
    outputVideo(stream);
  });

  peer.on('signal', (signal) => {
    socket.emit('offerStream', { receiveId: socketId, callerId, signal });
  });

  return peer;
}

function addPeer(signal, callerId) {
  const peer = new SimplePeer({
    initiator: false,
    trickle: false,
  });

  peer.signal(signal);

  peer.on('connect', () => console.log('connect other'));

  peer.on('signal', (signal) => {
    socket.emit('answerStream', { signal, callerId });
  });

  peer.on('data', (data) => console.log(data.toString()));

  peer.on('stream', (stream) => {
    outputVideo(stream);
  });

  return peer;
}

socket.on('offerSignal', ({ signal, callerId }) => {
  const itemPeer = peers.find((peer) => peer.offerId === callerId);

  if (itemPeer) {
    itemPeer.peer.signal(signal);
  } else {
    const peer = addPeer(signal, callerId);
    if (window.localVideoStream) {
      peer.addStream(window.localVideoStream);
    }
    peers.push({ offerId: callerId, answerId: socket.id, peer });
  }
});

socket.on('answerSignal', ({ answerId, signal }) => {
  const itemPeer = peers.find((p) => p.answerId === answerId);

  if (itemPeer) {
    itemPeer.peer.signal(signal);
  }
});

function outputVideo(stream) {
  const div = document.createElement('div');
  div.className = 'meeting-part';

  const video = document.createElement('video');

  video.dataset.id = stream ? stream.id : 'my_video';

  if ('srcObject' in video) {
    video.srcObject = stream || window.localVideoStream;
  } else {
    video.src = window.URL.createObjectURL(stream || window.localVideoStream);
  }
  video.play();

  div.appendChild(video);

  document.getElementById('meeting-show').appendChild(div);
}

function outputStopVideo() {
  // document.getElementById('#video-area').querySelector();
}
