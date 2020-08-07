// video / voice chat
// client join the room -> call all client diff (in the room) and add in the peers
const peers = []; // peers connect, each peer is peer-to-peer
const btnVideo = document.getElementById('btn-video-connect');
const btnAudio = document.getElementById('btn-audio-connect');
const meetingShow = document.getElementById('meeting-show');

let canClickAudioBtn = true;
let canClickVideoBtn = true;

let myAvatar = '';
// get media device of user
navigator.mediaDevices.getUserMedia =
  navigator.mediaDevices.getUserMedia ||
  navigator.mediaDevices.webkitGetUserMedia ||
  navigator.mediaDevices.mozGetUserMedia ||
  navigator.mediaDevices.msGetUserMedia;

window.localStream = new MediaStream();

// when user join the room -> create a list peer to connect to the rest user in the room
// receive room info (exclude self) to set
// each socketId is a answer peer (each rest user)
socket.on('roomInfoForStream', (roomInfo) => {
  // outputShowMeeting();
  roomInfo.users.forEach(({ id: socketId, avatar }) => {
    if (socketId !== socket.id) {
      outputShowMeeting(socketId, avatar);
      // create a new peer
      const peer = createPeer(socketId, socket.id);

      // peer.addStream(window.localStream);

      // push to the peers
      peers.push({ offerId: socket.id, answerId: socketId, peer });
    } else {
      myAvatar = avatar;
      outputShowMeeting('my_video', avatar);
    }
  });
});

// receive userId who leave room
socket.on('infoLeaveRoomForStream', ({ userId }) => {
  // remove peer of this user
  console.log(userId);
  const peerIndex = peers.findIndex(
    (p) => p.offerId === userId || p.answerId === userId
  );
  if (peerIndex !== -1) {
    peers.splice(peerIndex, 1);
  }

  // output leave room for stream
  outputLeaveRoomForStream(userId);
});

// receive offer signal of caller (new user join the room)
socket.on('offerSignal', ({ signal, callerId, avatarCaller }) => {
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
    const peer = addPeer(signal, callerId, avatarCaller);

    // if this user (rest user) is turning on video -> set stream track for peer
    if (window.localStream.getAudioTracks()[0]) {
      peer.addTrack(window.localStream.getAudioTracks()[0], window.localStream);
    }
    if (window.localStream.getVideoTracks()[0]) {
      peer.addTrack(window.localStream.getVideoTracks()[0], window.localStream);
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

// audio btn click
btnAudio.addEventListener('click', async function () {
  if (canClickAudioBtn) {
    canClickAudioBtn = false;
    this.style.cursor = 'no-drop';
    if (this.dataset.state === 'off') {
      // turn on video
      // set UI
      this.dataset.state = 'on';
      this.innerHTML = '<i class="fas fa-microphone text-white"></i>';
      $(this).attr('data-original-title', 'Tắt audio').tooltip('show');

      // get stream video from camera of user and set in the window
      if (navigator.mediaDevices.getUserMedia) {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });

        // add audio track for stream of each peer
        peers.forEach((peer) => {
          peer.peer.addTrack(
            audioStream.getAudioTracks()[0],
            window.localStream
          );
        });

        // add audio track for stream of local stream
        window.localStream.addTrack(audioStream.getAudioTracks()[0]);
      }
    } else if (this.dataset.state === 'on') {
      // stop video
      // set UI
      this.dataset.state = 'off';
      this.innerHTML = '<i class="fas fa-microphone-slash text-danger"></i>';
      $(this).attr('data-original-title', 'Bật audio').tooltip('show');

      // remove audio track of stream each peer
      peers.forEach((peer) => {
        peer.peer.removeTrack(
          window.localStream.getAudioTracks()[0],
          window.localStream
        );
      });

      // remove audio track of stream in local stream
      window.localStream.removeTrack(window.localStream.getAudioTracks()[0]);

      // output stop my video
      socket.emit('stopAudioStream');
      outputStopAudio();
    }
    canClickAudioBtn = true;
    this.style.cursor = 'pointer';
  }
});

// video btn click
btnVideo.addEventListener('click', async function () {
  if (canClickVideoBtn) {
    canClickVideoBtn = false;
    this.style.cursor = 'no-drop';

    if (this.dataset.state === 'off') {
      // turn on video
      // set UI
      this.dataset.state = 'on';
      this.innerHTML = '<i class="fas fa-video text-white"></i>';
      $(this).attr('data-original-title', 'Tắt camera').tooltip('show');

      // get stream video from camera of user and set in the window
      if (navigator.mediaDevices.getUserMedia) {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        // add video track for stream each peer
        peers.forEach((peer) => {
          peer.peer.addTrack(
            videoStream.getVideoTracks()[0],
            window.localStream
          );
        });

        // add video track for stream in local
        window.localStream.addTrack(videoStream.getVideoTracks()[0]);

        // output my video
        outputVideo();
      }
    } else if (this.dataset.state === 'on') {
      // stop video
      // set UI
      this.dataset.state = 'off';
      this.innerHTML = '<i class="fas fa-video-slash text-danger"></i>';
      $(this).attr('data-original-title', 'Bật camera').tooltip('show');

      // remove video track of stream each peer
      peers.forEach((peer) => {
        peer.peer.removeTrack(
          window.localStream.getVideoTracks()[0],
          window.localStream
        );
      });

      // stop and remove video track of stream in local
      window.localStream.getVideoTracks()[0].stop();
      window.localStream.removeTrack(window.localStream.getVideoTracks()[0]);

      // output stop my video
      socket.emit('stopVideoStream');
      outputStopVideo();
    }
    canClickVideoBtn = true;
    this.style.cursor = 'pointer';
  }
});

// create area meeting item
function outputShowMeeting(id = 'my_video', avatar = '/images/917385.jpg') {
  const div = document.createElement('div');
  div.className = 'meeting-part';
  div.dataset.id = id;

  div.innerHTML = `<img src="${avatar}">
    <video name="video" autoplay style="display:none" ${
      id ? '' : 'muted'
    }></video>
    <video name="audio" autoplay ${id ? '' : 'muted'}></video>`;

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

  // peer.on('stream', (stream) => {
  //   // window.testStream = stream;
  //   console.log('call stream');
  //   // outputVideo(stream, socketId);
  // });

  peer.on('track', (track, stream) => {
    console.log('call track');
    if (track.kind === 'video') {
      outputVideo(stream, socketId);
    } else if (track.kind === 'audio') {
      outputAudio(stream, socketId);
    }
  });

  peer.on('signal', (signal) => {
    socket.emit('offerStream', {
      receiveId: socketId,
      callerId,
      avatar: myAvatar,
      signal: JSON.stringify(signal),
    });
  });

  return peer;
}

// create a new peer (answer peer) to add peers
function addPeer(signal, callerId, avatar) {
  outputShowMeeting(callerId, avatar);

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
    socket.emit('answerStream', { signal: JSON.stringify(signal), callerId });
  });

  // peer.on('data', (data) => console.log(data.toString()));

  // peer.on('stream', (stream) => {
  //   // window.testStream = stream;
  //   console.log('answer stream');
  //   // outputVideo(stream, callerId);
  // });

  peer.on('track', (track, stream) => {
    console.log('call track');
    if (track.kind === 'video') {
      outputVideo(stream, callerId);
    } else if (track.kind === 'audio') {
      outputAudio(stream, callerId);
    }
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
    const video = meetingItem.querySelector('video[name="video"]');
    video.style.display = 'none';
    if ('srcObject' in video) {
      video.srcObject = null;
    } else {
      video.src = null;
    }
  }
}

// output stop audio
function outputStopAudio(id = 'my_video') {
  const meetingItem = meetingShow.querySelector(`div[data-id="${id}"]`);
  if (meetingItem) {
    const video = meetingItem.querySelector('video[name="audio"]');
    if ('srcObject' in video) {
      video.srcObject = null;
    } else {
      video.src = null;
    }
  }
}

// output leave room for stream
function outputLeaveRoomForStream(id) {
  meetingShow.querySelector(`div[data-id="${id}"]`).remove();
}
