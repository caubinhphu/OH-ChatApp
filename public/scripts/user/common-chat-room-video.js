// video / voice chat
// client join the room -> call all client diff (in the room) and add in the peers
const peers = []; // peers connect, each peer is peer-to-peer
const btnVideo = document.getElementById('btn-video-connect');
const btnAudio = document.getElementById('btn-audio-connect');
const meetingShow = document.getElementById('meeting-show');
const btnShare = document.getElementById('btn-share-screen');

let canClickAudioBtn = true;
let canClickVideoBtn = true;
let canClickShareBtn = true;

// my avatar
let myAvatar = '/images/default-avatar.jpg';

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
  const me = roomInfo.users.find((user) => user.id === socket.id);
  if (me) {
    myAvatar = me.avatar;
  }
  roomInfo.users.forEach(({ id: socketId, avatar, name }) => {
    if (socketId !== socket.id) {
      outputShowMeeting(socketId, avatar, name);
      // create a new peer
      const peer = createPeer(socketId, socket.id, me.name);

      // peer.addStream(window.localStream);

      // push to the peers
      peers.push({ offerId: socket.id, answerId: socketId, peer });
    } else {
      outputShowMeeting('my_video', avatar, 'Bạn');
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
socket.on('offerSignal', ({ signal, callerId, avatarCaller, callerName }) => {
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
    const peer = addPeer(signal, callerId, avatarCaller, callerName);

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
btnAudio.addEventListener('click', handleAudio);
// shortcut key
document.addEventListener('keydown', function (e) {
  if ((e.key === 'a' || e.key === 'A') && e.altKey === true) {
    handleAudio.bind(btnAudio)();
  }
});

// video btn click
btnVideo.addEventListener('click', handleVideo);
// shortcut key
document.addEventListener('keydown', function (e) {
  if ((e.key === 'v' || e.key === 'V') && e.altKey === true) {
    handleVideo.bind(btnVideo)();
  }
});

// share screen btn click
btnShare.addEventListener('click', handleShareScreen);
// shortcut key
document.addEventListener('keydown', function (e) {
  if ((e.key === 's' || e.key === 'S') && e.altKey === true) {
    handleShareScreen.bind(btnShare)();
  }
});

// create area meeting item
function outputShowMeeting(id = 'my_video', avatar = '/images/917385.jpg', name = 'Bạn') {
  if (id === 'my_video') {
    const myWrap = document.querySelector('.wrap-my-video')
    myWrap.querySelector('img').src = avatar
    if (!$('#meeting-show').find('.meeting-part').length) {
      $(myWrap).find('.pin-btn').trigger('click')
    }
  } else {
    const div = document.createElement('div');
    div.className = 'meeting-part ps-rv';
    div.dataset.id = id;

    div.innerHTML = `<div class="ps-as over-hidden d-flex align-items-center justify-content-center">
      <img src="${avatar}">
      <video name="video" autoplay style="display:none" ${
        id ? '' : 'muted'
      }></video>
      <video name="audio" autoplay ${id ? '' : 'muted'} class="d-none"></video>
      <div class="meeting-part-pin-ctrl justify-content-between align-items-center text-primary px-3">
        <strong>${name}</strong>
        <div class="wrap-pin text-primary m-2 pin-btn" title="Pin">
          <i class="fas fa-expand-arrows-alt"></i>
        </div>
      </div>
    </div>`;

    meetingShow.appendChild(div);
  }
}

// create new peer
function createPeer(socketId, callerId, callerName) {
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
      callerName,
      avatar: myAvatar,
      signal: JSON.stringify(signal),
    });
  });

  return peer;
}

// create a new peer (answer peer) to add peers
function addPeer(signal, callerId, avatar, callerName) {
  outputShowMeeting(callerId, avatar, callerName);

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
  if (id === 'my_video') {
    const $wrapMyVideo = $('.wrap-my-video');
    if ($wrapMyVideo.length) {
      $wrapMyVideo.find('img').css('display', 'none');
      const $video = $wrapMyVideo.find('video[name="video"]');
      $video.css('display', 'block');
      $video.each((i, vd) => {
        if ('srcObject' in vd) {
          vd.srcObject = stream;
        } else {
          vd.src = window.URL.createObjectURL(stream);
        }
      })
    }
  } else {
    const $meetingItem = $(`.meeting-part[data-id="${id}"]`);
    if ($meetingItem.length) {
      $meetingItem.find('img').css('display', 'none');
      const $video = $meetingItem.find('video[name="video"]');
      $video.css('display', 'block');
      $video.each((i, vd) => {
        if ('srcObject' in vd) {
          vd.srcObject = stream;
        } else {
          vd.src = window.URL.createObjectURL(stream);
        }
      })
    }
  }
}

// output audio
function outputAudio(stream = window.localStream, id = 'my_video') {
  if (id !== 'my_video') {
    const $meetingItem = $(`.meeting-part[data-id="${id}"]`);
    if ($meetingItem.length) {
      const $video = $meetingItem.find('video[name="audio"]');
      $video.each((i, vd) => {
        if ('srcObject' in vd) {
          vd.srcObject = stream;
        } else {
          vd.src = window.URL.createObjectURL(stream);
        }
      })
    }
  }
}

// output stop video
function outputStopVideo(id = 'my_video') {
  if (id === 'my_video') {
    const $wrapMyVideo = $('.wrap-my-video');
    if ($wrapMyVideo.length) {
      $wrapMyVideo.find('img').css('display', 'inline');
      const $video = $wrapMyVideo.find('video[name="video"]');
      $video.css('display', 'none');
      $video.each((i, vd) => {
        if ('srcObject' in vd) {
          vd.srcObject = null;
        } else {
          vd.src = null;
        }
      })
    }
  } else {
    const $meetingItem = $(`.meeting-part[data-id="${id}"]`);
    if ($meetingItem.length) {
      $meetingItem.find('img').css('display', 'inline');
      const $video = $meetingItem.find('video[name="video"]');
      $video.css('display', 'none');
      $video.each((i, vd) => {
        if ('srcObject' in vd) {
          vd.srcObject = null;
        } else {
          vd.src = null;
        }
      })
    }
  }
}

// output stop audio
function outputStopAudio(id = 'my_video') {
  if (id !== 'my_video') {
    const $meetingItem = $(`.meeting-part[data-id="${id}"]`);
    if ($meetingItem.length) {
      const $video = $meetingItem.find('video[name="audio"]');
      $video.each((i, vd) => {
        if ('srcObject' in vd) {
          vd.srcObject = null;
        } else {
          vd.src = null;
        }
      })
    }
  }
}

// output leave room for stream
function outputLeaveRoomForStream(id) {
  meetingShow.querySelector(`div[data-id="${id}"]`).remove();
}

// handle turn on / turn off audio
async function handleAudio() {
  if (canClickAudioBtn) {
    canClickAudioBtn = false;
    $(this).find('.control-no-show-pop').css('cursor', 'no-drop');
    if (this.dataset.state === 'off') {
      // turn on video
      // set UI
      this.dataset.state = 'on';
      $(this).addClass('is-turn-on');
      $(this).find('.popup').html('Tắt audio (Alt + A)');
      // this.innerHTML = '<div class="control-no-show-pop"><i class="fas fa-microphone text-white"></i></div>';
      // $(this)
      //   .attr('data-original-title', 'Tắt audio (Alt + A)')
      //   .tooltip('show');

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
      $(this).removeClass('is-turn-on');
      $(this).find('.popup').html('Bật audio (Alt + A)');
      // this.innerHTML = '<div class="control-no-show-pop"><i class="fas fa-microphone-slash text-danger"></i></div>';
      // $(this)
      //   .attr('data-original-title', 'Bật audio (Alt + A)')
      //   .tooltip('show');

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
    $(this).find('.control-no-show-pop').css('cursor', 'pointer');
  }
}

// handle turn on / turn off video
async function handleVideo() {
  if (canClickVideoBtn) {
    canClickVideoBtn = false;
    $(this).find('.control-no-show-pop').css('cursor', 'no-drop');

    if (this.dataset.state === 'off') {
      // turn on video
      // set UI
      this.dataset.state = 'on';
      $(this).addClass('is-turn-on');
      $(this).find('.popup').html('Tắt camera (Alt + V)');

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
      $(this).removeClass('is-turn-on');
      $(this).find('.popup').html('Bật camera (Alt + V)');

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
    $(this).find('.control-no-show-pop').css('cursor', 'pointer');
  }
}

// handle share screen
async function handleShareScreen() {
  if (canClickShareBtn) {
    canClickShareBtn = false;
    $(this).find('.control-no-show-pop').css('cursor', 'no-drop');

    if (this.dataset.state === 'off') {
      // share screen
      // set UI
      this.dataset.state = 'on';
      $(this).addClass('is-turn-on');
      $(this).find('.popup').html('Tắt Share (Alt + S)');

      // get stream video from camera of user and set in the window
      if (navigator.mediaDevices.getDisplayMedia) {
        const videoStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always"
          },
          audio: false
        });

        console.log(videoStream);
        // add video track for stream each peer
        // peers.forEach((peer) => {
        //   peer.peer.addTrack(
        //     videoStream.getVideoTracks()[0],
        //     window.localStream
        //   );
        // });

        // add video track for stream in local
        window.localStream.addTrack(videoStream.getVideoTracks()[0]);

        // output my video
        outputVideo();
      }
    } else if (this.dataset.state === 'on') {
      // stop share screen
      // set UI
      this.dataset.state = 'off';
      $(this).removeClass('is-turn-on');
      $(this).find('.popup').html('Share Screen (Alt + S)');

      // remove video track of stream each peer
      // peers.forEach((peer) => {
      //   peer.peer.removeTrack(
      //     window.localStream.getVideoTracks()[0],
      //     window.localStream
      //   );
      // });

      // // stop and remove video track of stream in local
      // window.localStream.getVideoTracks()[0].stop();
      // window.localStream.removeTrack(window.localStream.getVideoTracks()[0]);

      // output stop my video
      // socket.emit('stopVideoStream');
      // outputStopVideo();
    }
    canClickShareBtn = true;
    $(this).find('.control-no-show-pop').css('cursor', 'pointer');
  }
}

// pin meeting
$(document).on('click', '.pin-btn', function(e) {
  $('.meeting-part').removeClass('is-pin'); // remove all pin
  const $parent = $(this).parents('.meeting-part');
  if($(this).hasClass('pin')) { // is pin ->  unpin
    $parent.removeClass('is-pin');
    $('.meeting-part .pin-btn').removeClass('pin');
    $('.meeting-part .pin-btn').attr('title', 'Pin')
    $('.wrap-meeting-show').removeClass('has-pin');
    $('.wrap-meet-pin').html('');
  } else { // pin
    $(`.meeting-part:not('meeting-part-cloned') .pin-btn`).removeClass('pin');
    $(this).addClass('pin');
    $('.meeting-part .pin-btn').attr('title', 'Pin')
    this.title = 'Unpin'
    $parent.addClass('is-pin');
    $('.wrap-meeting-show').addClass('has-pin');
    $('.wrap-meet-pin').html($parent.get(0).outerHTML);
    $('.wrap-meet-pin').find('.meeting-part').addClass('meeting-part-cloned');
    const video = $parent.find('video[name="video"]').get(0);
    const videoCloned = $('.wrap-meet-pin').find('video[name="video"]').get(0);
    if ('srcObject' in video) {
      videoCloned.srcObject = video.srcObject;
    } else {
      videoCloned.src = video.src;
    }
  }
})