import SimplePeer from 'simple-peer'

const CommonChatRoomVideo = (() => {
  // video / voice / share screen chat

  // client join the room -> call all client diff (in the room) and add in the peers
  const peers = []; // peers connect, each peer is peer-to-peer
  window.p = peers
  const btnVideo = document.getElementById('btn-video-connect');
  const btnAudio = document.getElementById('btn-audio-connect');
  const meetingShow = document.getElementById('meeting-show');
  const btnShare = document.getElementById('btn-share-screen');

  let canClickAudioBtn = true;
  let canClickVideoBtn = true;
  let canClickShareBtn = true;
  let canClickRecBtn = true;

  // my avatar
  let myAvatar = '/images/default-avatar.jpg';

  // get media device of user
  navigator.mediaDevices.getUserMedia =
    navigator.mediaDevices.getUserMedia ||
    navigator.mediaDevices.webkitGetUserMedia ||
    navigator.mediaDevices.mozGetUserMedia ||
    navigator.mediaDevices.msGetUserMedia;

  let localStream = new MediaStream();
  let localShare = new MediaStream();

  let localRECStream = null
  let voiceRECStream = null
  let desktopRECStream = null
  let localREC = null



  // when user join the room -> create a list peer to connect to the rest user in the room
  // receive room info (exclude self) to set
  // each socketId is a answer peer (each rest user)
  window.socket.on('roomInfoForStream', (roomInfo) => {
    // outputShowMeeting();
    const me = roomInfo.users.find((user) => user.id === window.socket.id);
    if (me) {
      myAvatar = me.avatar;
    }
    roomInfo.users.forEach(({
      id: socketId,
      avatar,
      name
    }) => {
      if (socketId !== window.socket.id) {
        outputShowMeeting(socketId, avatar, name);
        // create a new peer
        const peer = createPeer(socketId, window.socket.id, me.name);

        // peer.addStream(localStream);

        // push to the peers
        peers.push({
          offerId: window.socket.id,
          answerId: socketId,
          peer
        });
      } else {
        outputShowMeeting('my_video', avatar, 'Bạn');
      }
    });
  });

  // receive userId who leave room
  window.socket.on('infoLeaveRoomForStream', ({
    userId
  }) => {
    // remove peer of this user
    // console.log(userId);
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
  window.socket.on('offerSignal', ({
    signal,
    callerId,
    avatarCaller,
    callerName
  }) => {
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
      if (localStream.getAudioTracks()[0]) {
        peer.addTrack(localStream.getAudioTracks()[0], localStream);
      }
      if (localStream.getVideoTracks()[0]) {
        peer.addTrack(localStream.getVideoTracks()[0], localStream);
      }
      if (localShare.getVideoTracks()[0]) {
        peer.addStream(localShare);
      }

      // push to the peers
      peers.push({
        offerId: callerId,
        answerId: window.socket.id,
        peer
      });
    }
  });

  // receive answer signal from rest user
  window.socket.on('answerSignal', ({
    answerId,
    signal
  }) => {
    // parse signal
    signal = JSON.parse(signal);

    // find peer respectively
    const itemPeer = peers.find((p) => p.answerId === answerId);

    if (itemPeer) {
      // set answer signal for the peer
      itemPeer.peer.signal(signal);
    }
  });

  // receive signal stop audio from a client in the room
  window.socket.on('stopAudio', outputStopAudio);

  // receive signal stop video from a client in the room
  window.socket.on('stopVideo', outputStopVideo);

  // receive signal stop share screen from a client in the room
  window.socket.on('stopShareScreen', outputStopShareScreen);

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

  // rec btn click
  $('.btn-rec-screen').on('click', recordingScreen);
  // shortcut key
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'r' || e.key === 'R') && e.altKey === true) {
      recordingScreen();
    }
  });

  // create area meeting item
  function outputShowMeeting(id = 'my_video', avatar = '/images/917385.jpg', name = 'Bạn') {
    if (id === 'my_video') {
      const myWrap = document.querySelector('.wrap-my-video')
      myWrap.querySelector('img').src = avatar
      // if (!$('#meeting-show').find('.meeting-part').length) {
      //   $(myWrap).find('.pin-btn').trigger('click')
      // }
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
      <div class="meeting-part-pin-ctrl justify-content-between align-items-center text-white px-3">
        <strong>${name}</strong>
        <div class="wrap-pin text-white m-2 pin-btn" title="Pin">
          <span class="icomoon icon-arrows-alt"></span>
        </div>
      </div>
      <div class="mic-frequency">
        <span class="icomoon icon-mic_off text-danger"></span>
        <div class="wrap-frequency">
          <div class="d-flex align-items-end">
            <div class="frequency"></div>
            <div class="frequency"></div>
            <div class="frequency"></div>
          </div>
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
      trickle: false
    });

    // add events
    // peer.on('connect', () => console.log('call connection'));

    // peer.on('close', () => {
    //   console.log('call close');
    // });

    // peer.on('data', (data) => console.log(data.toString()));

    peer.on('error', (err) => console.log(err.code));

    peer.on('stream', (stream) => {
      // console.log('call stream');
      if (stream.getVideoTracks().length >= 2) {
        outputShare(stream, socketId)
      }
    });

    peer.on('track', (track, stream) => {
      // console.log('call track');
      if (track.kind === 'video') {
        if (stream.getVideoTracks().length < 2) {
          // console.log(stream, socketId);
          outputVideo(stream, socketId);
        }
      } else if (track.kind === 'audio') {
        outputAudio(stream, socketId);
      }
    });

    peer.on('signal', (signal) => {
      // console.log('call signal');
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
    // peer.on('connect', () => console.log('answer connect'));

    // peer.on('close', () => {
    //   console.log('answer close');
    // });

    peer.on('error', (err) => { console.log(err.code) });

    peer.on('signal', (signal) => {
      // console.log('answer signal');
      socket.emit('answerStream', {
        signal: JSON.stringify(signal),
        callerId
      });
    });

    // peer.on('data', (data) => console.log(data.toString()));

    peer.on('stream', (stream) => {
      // console.log('answer stream');
      if (stream.getVideoTracks().length >= 2) {
        outputShare(stream, callerId)
      }
    });

    peer.on('track', (track, stream) => {
      // console.log('answer track');
      if (track.kind === 'video') {
        if (stream.getVideoTracks().length < 2) {
          outputVideo(stream, callerId);
        }
      } else if (track.kind === 'audio') {
        outputAudio(stream, callerId);
      }
    });

    return peer;
  }

  // output video
  function outputVideo(stream = localStream, id = 'my_video') {
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

  // output share screen
  function outputShare(stream = localShare, id = 'my_video') {
    unPinAll($('.meeting-part.is-pin'))
    $('#meeting-show').removeClass('offset')
    $('#main-meeting').addClass('has-share')
    if (id === 'my_video') {
      // show my share screen
      $('.my-share').removeClass('d-none')
    } else {
      $('.them-share').removeClass('d-none')
      const $video = $('.them-share').find('video')
      $video.each((i, vd) => {
        if ('srcObject' in vd) {
          vd.srcObject = stream;
        } else {
          vd.src = window.URL.createObjectURL(stream);
        }
      })
    }
  }

  // output audio
  function outputAudio(stream = localStream, id = 'my_video') {
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
        frequency($meetingItem, stream)
        const $roomUser = $(`.room-user[data-id="${id}"]`)
        if ($roomUser.length) {
          frequency($roomUser, stream)
        }
      }
    } else {
      frequency($('.wrap-my-video'), stream)
      const $roomUser = $(`.room-user[data-id="${socket.id}"]`)
      if ($roomUser.length) {
        frequency($roomUser, stream)
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

  // output stop video share screen
  function outputStopShareScreen(id = 'my_video') {
    $('#main-meeting').removeClass('has-share')
    if (id === 'my_video') {
      $('.my-share').addClass('d-none')
    } else {
      $('.them-share').addClass('d-none')
      const $video = $('.them-share').find('video')
      $video.each((i, vd) => {
        if ('srcObject' in vd) {
          vd.srcObject = null;
        } else {
          vd.src = null;
        }
      })
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
        stopFrequency($meetingItem)
        const $roomUser = $(`.room-user[data-id="${id}"]`)
        if ($roomUser.length) {
          stopFrequency($roomUser)
        }
      }
    } else {
      stopFrequency($('.wrap-my-video'))
      const $roomUser = $(`.room-user[data-id="${socket.id}"]`)
      if ($roomUser.length) {
        stopFrequency($roomUser)
      }
    }
  }

  // output leave room for stream
  function outputLeaveRoomForStream(id) {
    const item =  meetingShow.querySelector(`div[data-id="${id}"]`)
    if (item) {
      item.remove();
    }
  }

  // handle turn on / turn off audio
  async function handleAudio() {
    if (canClickAudioBtn) {
      canClickAudioBtn = false;
      $(this).find('.control-no-show-pop').css('cursor', 'no-drop');
      if (this.dataset.state === 'off') {
        // get stream video from camera of user and set in the window
        if (navigator.mediaDevices.getUserMedia) {
          socket.emit('checkCanTurnOnMic')
        }
      } else {
        // stop audio
        stopAudio()
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
        // get stream video from camera of user and set in the window
        if (navigator.mediaDevices.getUserMedia) {
          socket.emit('checkCanTurnOnVideo')
        }
      } else {
        // stop video
        stopVideo()
      }
      canClickVideoBtn = true;
      $(this).find('.control-no-show-pop').css('cursor', 'pointer');
    }
  }

  // handle share screen
  function handleShareScreen() {
    if (canClickShareBtn) {
      canClickShareBtn = false;
      $(this).find('.control-no-show-pop').css('cursor', 'no-drop');

      if (this.dataset.state === 'off') {
        // get stream video from camera of user and set in the window
        if (navigator.mediaDevices.getDisplayMedia) {
          socket.emit('checkCanShareScreen')
        }
      } else {
        // output stop my video share screen
        stopMyShareScreen()
      }
      canClickShareBtn = true;
      $(this).find('.control-no-show-pop').css('cursor', 'pointer');
    }
  }

  function recordingScreen() {
    window.socket.emit('checkAllowRecord')
  }

  // handle recorder screen
  async function handleRecordingScreen() {
    if (canClickRecBtn) {
      const $recBtn = $('.btn-rec-screen')
      canClickRecBtn = false;
      $recBtn.find('.control-no-show-pop').css('cursor', 'no-drop');

      if ($recBtn.hasClass('state-off')) {
        // get stream video from camera of user and set in the window
        if (navigator.mediaDevices.getDisplayMedia) {
          try {
            desktopRECStream = await navigator.mediaDevices.getDisplayMedia({
              video:true,
              audio: true
            });
            voiceRECStream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true
            });

            $recBtn.removeClass('state-off')
            $recBtn.find('.ctrl-label').html('Dừng quay màn hình (Alt + R)');
            $('html').addClass('recoding')

            desktopRECStream.getVideoTracks()[0].onended = stopRec;

            const tracks = [
              ...desktopRECStream.getVideoTracks(),
              ...mergeAudioStreams(desktopRECStream, voiceRECStream)
            ];

            localRECStream = new MediaStream(tracks);

            const blobs = [];

            localREC = new MediaRecorder(localRECStream, {mimeType: 'video/webm; codecs=vp8,opus'});
            localREC.ondataavailable = (e) => blobs.push(e.data);
            localREC.onstop = async () => {
              const blob = new Blob(blobs, {type: 'video/webm'});
              const url = window.URL.createObjectURL(blob);
              const download = document.createElement('a')
              $(download).addClass('download-rec')
              download.href = url;
              download.download = `${$('#room-info-name-room').text()}_${(new Date()).toLocaleDateString().replace(/[-\/]/g, '-')}.webm`;
              $('#main').append(download)
              download.click()
              download.remove()
            }
            localREC.start();
            $('.rec').removeClass('d-none')
          } catch (error) {
            // console.log(error);
            outputWarnMessage('Không thể quay màn hình!')
          }
        }
      } else {
        stopRec()
      }
      canClickRecBtn = true;
      $recBtn.find('.control-no-show-pop').css('cursor', 'pointer');
    }
  }

  window.socket.on('resultCheckRecord', async ({ canRec }) => {
    if (canRec) {
      await handleRecordingScreen()
    } else {
      window.outputErrorMessage('Host đã tắt tính năng quay màn hình')
    }
  })

  window.socket.on('isCanShareScreen', async ({
    isShareScreen, unAllowShare
  }) => {
    if (!isShareScreen) {
      try {
        // share screen
        const shareStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });

        socket.emit('beginShareScreen')
        // add event stop share
        shareStream.getVideoTracks()[0].onended = stopMyShareScreen;

        // set UI
        btnShare.dataset.state = 'on';
        $(btnShare).addClass('is-turn-on');
        $(btnShare).find('.popup').html('Tắt Share (Alt + S)');
        $('html').addClass('sharing')

        // duplicate video track share to detach share with camera
        shareStream.addTrack(shareStream.getVideoTracks()[0].clone())
        peers.forEach((peer) => {
          peer.peer.addStream(
            shareStream
          );
        });

        // add video track for stream in local
        localShare = shareStream

        // output my share
        outputShare();
      } catch (error) {
        console.log(error);
      }
    } else if (unAllowShare) {
      outputErrorMessage('Host đã tắt tính năng chia sẻ màn hình')
    } else {
      outputWarnMessage('Bạn không thể chia sẻ do có người đang chia sẻ')
    }
  })

  window.socket.on('isCanTurnOnMic', async ({ allowMic }) => {
    if (allowMic) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });

        // turn on video
        // set UI
        btnAudio.dataset.state = 'on';
        $(btnAudio).addClass('is-turn-on');
        $(btnAudio).find('.popup').html('Tắt audio (Alt + A)');
        $('html').addClass('turn-on-audio')

        // add audio track for stream of each peer
        peers.forEach((peer) => {
          peer.peer.addTrack(
            audioStream.getAudioTracks()[0],
            localStream
          );
        });

        // add audio track for stream of local stream
        localStream.addTrack(audioStream.getAudioTracks()[0]);

        outputAudio();
      } catch (error) {
        outputWarnMessage('Bạn đã chặn quyền sử dụng microphone')
      }
    } else {
      outputErrorMessage('Host đã tắt tính năng microphone')
    }
  })

  window.socket.on('isCanTurnOnVideo', async ({ allowVideo }) => {
    if (allowVideo) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        // turn on video
        // set UI
        btnVideo.dataset.state = 'on';
        $(btnVideo).addClass('is-turn-on');
        $(btnVideo).find('.popup').html('Tắt camera (Alt + V)');
        $('html').addClass('turn-on-video')

        // add video track for stream each peer
        peers.forEach((peer) => {
          peer.peer.addTrack(
            videoStream.getVideoTracks()[0],
            localStream
          );
        });

        // add video track for stream in local
        localStream.addTrack(videoStream.getVideoTracks()[0]);

        // output my video
        outputVideo();
      } catch (error) {
        outputWarnMessage('Bạn đã chặn quyền sử dụng camera')
      }
    } else {
      outputErrorMessage('Host đã tắt tính năng camera')
    }
  })

  $('.btn-stop-share').on('click', stopMyShareScreen)

  function stopAudio() {
    // set UI
    btnAudio.dataset.state = 'off';
    $(btnAudio).removeClass('is-turn-on');
    $(btnAudio).find('.popup').html('Bật audio (Alt + A)');
    $('html').removeClass('turn-on-audio')

    // remove audio track of stream each peer
    peers.forEach((peer) => {
      peer.peer.removeTrack(
        localStream.getAudioTracks()[0],
        localStream
      );
    });

    // remove audio track of stream in local stream
    localStream.removeTrack(localStream.getAudioTracks()[0]);

    // output stop my audio
    socket.emit('stopAudioStream');
    outputStopAudio();
  }

  function stopVideo() {
    // set UI
    btnVideo.dataset.state = 'off';
    $(btnVideo).removeClass('is-turn-on');
    $(btnVideo).find('.popup').html('Bật camera (Alt + V)');
    $('html').removeClass('turn-on-video')

    // remove video track of stream each peer
    peers.forEach((peer) => {
      peer.peer.removeTrack(
        localStream.getVideoTracks()[0],
        localStream
      );
    });

    // stop and remove video track of stream in local
    localStream.getVideoTracks()[0].stop();
    localStream.removeTrack(localStream.getVideoTracks()[0]);

    // output stop my video
    socket.emit('stopVideoStream');
    outputStopVideo();
  }

  function stopMyShareScreen() {
    // stop share screen
    // set UI
    btnShare.dataset.state = 'off';
    $(btnShare).removeClass('is-turn-on');
    $(btnShare).find('.popup').html('Share Screen (Alt + S)');
    $('html').removeClass('sharing')

    // remove video share screen track of stream each peer
    peers.forEach((peer) => {
      peer.peer.removeStream(localShare);
    });

    // // stop and remove video share screen track of stream in local
    localShare.getVideoTracks().forEach(track => track.stop());
    localShare = new MediaStream();

    socket.emit('stopShareScreenStream');
    outputStopShareScreen();
  }

  function stopRec() {
    const $recBtn = $('.btn-rec-screen')
    if (localREC) {
      localREC.stop();
      localREC = null
    }
    if (localRECStream) {
      localRECStream.getTracks().forEach(function(track) {
        track.stop();
      });
    }
    if (voiceRECStream) {
      voiceRECStream.getTracks().forEach(function(track) {
        track.stop();
      });
    }
    if (desktopRECStream) {
      desktopRECStream.getTracks().forEach(function(track) {
        track.stop();
      });
    }

    localRECStream = null;
    $recBtn.addClass('state-off')
    $recBtn.find('.ctrl-label').html('Quay màn hình (Alt + R)');
    $('.rec').addClass('d-none')
    $('html').removeClass('recoding')
  }

  function outputAllowRec(value) {
    if (value) {
      window.outputInfoMessage('Host đã bật tính năng quay màn hình')
    } else {
      window.outputErrorMessage('Host đã tắt tính năng quay màn hình')
      if ($('html.recoding').length) {
        stopRec()
      }
    }
  }
  window.outputAllowRec = outputAllowRec

  function outputAllowShare(value) {
    if (value) {
      window.outputInfoMessage('Host đã bật tính năng chia sẻ màn hình')
    } else {
      window.outputErrorMessage('Host đã tắt tính năng chia sẻ màn hình')
      if ($('html.sharing').length) {
        stopMyShareScreen()
      }
    }
  }
  window.outputAllowShare = outputAllowShare

  function outputAllowMic(value) {
    if (value) {
      window.outputInfoMessage('Host đã bật tính năng microphone')
    } else {
      window.outputErrorMessage('Host đã tắt tính năng microphone')
      if ($('html.turn-on-audio').length) {
        stopAudio()
      }
    }
  }
  window.outputAllowMic = outputAllowMic

  function outputAllowVideo(value) {
    if (value) {
      window.outputInfoMessage('Host đã bật tính năng camera')
    } else {
      window.outputErrorMessage('Host đã tắt tính năng camera')
      if ($('html.turn-on-video').length) {
        stopVideo()
      }
    }
  }
  window.outputAllowVideo = outputAllowVideo

  function unPinAll($ele) {
    $ele.removeClass('is-pin');
    $('.meeting-part .pin-btn').removeClass('pin');
    $('.meeting-part .pin-btn').attr('title', 'Pin')
    $('.wrap-meeting-show').removeClass('has-pin');
    $('.wrap-meet-pin').html('');
    $('#meeting-show').removeClass('mt-0')
  }

  function mergeAudioStreams(desktopStream, voiceStream) {
    const context = new AudioContext();
    const destination = context.createMediaStreamDestination();
    let hasDesktop = false;
    let hasVoice = false;
    if (desktopStream && desktopStream.getAudioTracks().length > 0) {
      // If you don't want to share Audio from the desktop it should still work with just the voice.
      const source1 = context.createMediaStreamSource(desktopStream);
      const desktopGain = context.createGain();
      desktopGain.gain.value = 0.7;
      source1.connect(desktopGain).connect(destination);
      hasDesktop = true;
    }

    if (voiceStream && voiceStream.getAudioTracks().length > 0) {
      const source2 = context.createMediaStreamSource(voiceStream);
      const voiceGain = context.createGain();
      voiceGain.gain.value = 0.7;
      source2.connect(voiceGain).connect(destination);
      hasVoice = true;
    }

    return (hasDesktop || hasVoice) ? destination.stream.getAudioTracks() : [];
  };

  function frequency($meetingPart, stream) {
    $meetingPart.find('.mic-frequency').addClass('is-turn-on')
    const audioContext = window.AudioContext || window.webkitAudioContext
    const frequencyData = new Uint8Array(128)
    const $allRepeatedEls = $meetingPart.find('.frequency')
    const totalEls = 3;

    if (audioContext) {
      const audioAPI = new audioContext(); // Web Audio API is available.

      const audioSource = audioAPI.createMediaStreamSource(stream);
      const analyserNode = audioAPI.createAnalyser();
      analyserNode.fftSize = 2048;
      audioSource.connect(analyserNode);

      const id = setInterval(() => {
        analyserNode.getByteFrequencyData(frequencyData);
        for (let i = 0; i < totalEls; i++) {
          // range is 0 - 255 * 1.2 / 100 =~ 0-3
          const rang = Math.floor( i / totalEls * frequencyData.length ); // find equal distance in haystack
          const FREQ = frequencyData[ rang ] / 255;
          // console.log(FREQ)
          const height = 4 + FREQ * 15
          $allRepeatedEls.eq(i).css('height', `${height}px`)
        }
      }, 60)
      $meetingPart.attr('data-fre', id)
    } else {
      window.outputErrorMessage('Trình duyệt không hỗ trợ!')
    }
  }

  function stopFrequency($meetingPart) {
    $meetingPart.find('.mic-frequency').removeClass('is-turn-on')
    $meetingPart.find('.frequency').css('height', `4px`)
    clearInterval($meetingPart.attr('data-fre'))
  }

  // pin meeting
  $(document).on('click', '.pin-btn', function (e) {
    $('.meeting-part').removeClass('is-pin'); // remove all pin
    const $parent = $(this).parents('.meeting-part');
    if ($(this).hasClass('pin')) { // is pin ->  unpin
      unPinAll($parent)
    } else { // pin
      $(`.meeting-part:not('meeting-part-cloned') .pin-btn`).removeClass('pin');
      $(this).addClass('pin');
      $('.meeting-part .pin-btn').attr('title', 'Pin')
      this.title = 'Unpin'
      $parent.addClass('is-pin');
      $('.wrap-meeting-show').addClass('has-pin');
      
      if (!$parent.hasClass('wrap-my-video')) {
        $('#meeting-show').removeClass('mt-0')
        if ($('#meeting-show .meeting-part').length < 2) {
          $('#meeting-show').addClass('offset')
        } else {
          $('#meeting-show').removeClass('offset')
        }
      } else {
        $('#meeting-show').addClass('mt-0')
      }
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
})()

export default CommonChatRoomVideo