import SimplePeer from 'simple-peer'

const ChatAudio = (async () => {
  // get media device of user
  navigator.mediaDevices.getUserMedia =
    navigator.mediaDevices.getUserMedia ||
    navigator.mediaDevices.webkitGetUserMedia ||
    navigator.mediaDevices.mozGetUserMedia ||
    navigator.mediaDevices.msGetUserMedia;

    window.localStream = new MediaStream()

    if (window.typeCall === 'video') {
      $('.wrap-my-video').removeClass('d-none')
      await addTrackVideo()
    }

    if (window.typeClient === 'caller') {
      // window of caller
      // init peer
      const peer = new SimplePeer({
        initiator: true, // init -> offer peer
        trickle: false
      });
      window.peer = peer

      // add events to peer
      // after connect => add stream audio
      peer.on('connect', () => {
        // console.log('call connection')
        addTrackAudio(peer)
        // be connected
        window.connectPeer = true
        $('.mic-ctrl-btn').removeClass('btn-disabled')
        if (window.typeCall === 'video') {
          $('.video-ctrl-btn').removeClass('btn-disabled')
          $('.share-ctrl-btn').removeClass('btn-disabled')
          $('.wrap-friend-video').removeClass('d-none')

          if (window.localStream.getVideoTracks().length) {
            peer.addTrack(window.localStream.getVideoTracks()[0], window.localStream);
          }
        }
      });

      peer.on('close', () => {
        // console.log('call close');
      });

      // event receive signal offer from parent window from caller
      // because when caller add stream or track => create new signal offer => signal event => add signal again
      peer.on('data', (data) => {
        const dataObj = JSON.parse(data.toString())
        if (dataObj.type === 'signal-add-stream') {
          peer.signal(dataObj.signal)
        } else if (dataObj.type === 'turn-off-video') {
          outputStopVideo(false)
        }
      });

      peer.on('error', (err) => {
        let errorText = ''
        if (err.code === 'ERR_WEBRTC_SUPPORT') {
          errorText = 'Trình duyệt không hỗ trợ'
        } else if (err.code === 'ERR_DATA_CHANNEL') {
          errorText = 'Cuộc gọi kết thúc'
        } else {
          errorText = 'Lỗi kết nối'
        }
        const event = new CustomEvent('connectPeerFail', {
          detail: {
            error: errorText,
            code: err.code
          }
        })
        window.parentWindow.dispatchEvent(event)
      })

      // peer.on('stream', (stream) => {
      //   console.log('call stream');
      // });

      peer.on('track', (track, stream) => {
        // console.log('call track');
        if (track.kind === 'audio') {
          outputAudio(stream);
        } else if (track.kind === 'video') {
          if (stream.getVideoTracks().length < 2) {
            outputVideo(stream, false);
          }
        }
      });

      peer.on('signal', (signal) => {
        // console.log('call');
        // check be connected?
        if (!window.connectPeer) {
          // not connect => send offer signal
          // create custom event to send to window parent
          const event = new CustomEvent('signalOffer', {
            detail: {
              // send signal offer
              signalOffer: JSON.stringify(signal)
            }
          });
          // dispatch (trigger) event custom
          window.parentWindow.dispatchEvent(event)
        } else {
          // be connected => send signal offer (when add stream) through data channel
          peer.send(JSON.stringify({
            type: 'signal-add-stream',
            signal
          }))
        }
      });

      // event receive signal answer from parent window (peer answer)
      $(window).on('signalAnswer', (e) => {
        const { signalAnswer } = e.detail
        peer.signal(JSON.parse(signalAnswer))
      })

      // event is calling
      $(window).on('isCalling', () => {
        $('.img-load-call').addClass('d-none')
        $('.text-calling').removeClass('d-none')
      })

      addEventCtrl(peer)

      // close sub window when close or refetch browser
      window.onbeforeunload = function() {
        if (!window.connectPeer) {
          window.parentWindow.dispatchEvent(new CustomEvent('disconnectCall'))
        }
      }
    } else {
      // window of receiver
      // init peer answer
      const peer = new SimplePeer({
        initiator: false,
        trickle: false
      });

      window.peer = peer
      // add signal offer to peer
      peer.signal(JSON.parse(window.signalOffer))

      // add events
      // conect => add audio stream
      peer.on('connect', () => {
        // console.log('answer connection')
        addTrackAudio(peer)
        // be connected
        window.connectPeer = true
        $('.img-load-call').addClass('d-none')
        $('.mic-ctrl-btn').removeClass('btn-disabled')
        if (window.typeCall === 'video') {
          $('.video-ctrl-btn').removeClass('btn-disabled')
          $('.share-ctrl-btn').removeClass('btn-disabled')
          $('.wrap-friend-video').removeClass('d-none')

          if (window.localStream.getVideoTracks().length) {
            peer.addTrack(window.localStream.getVideoTracks()[0], window.localStream);
          }
        }
      });

      peer.on('error', (err) => {
        let errorText = ''
        if (err.code === 'ERR_WEBRTC_SUPPORT') {
          errorText = 'Trình duyệt không hỗ trợ'
        } else if (err.code === 'ERR_DATA_CHANNEL') {
          errorText = 'Cuộc gọi kết thúc'
        } else {
          errorText = 'Lỗi kết nối'
        }
        const event = new CustomEvent('connectPeerFail', {
          detail: {
            error: errorText,
            code: err.code
          }
        })
        window.parentWindow.dispatchEvent(event)
      })

      peer.on('close', () => {
        // console.log('call close');
      });

      // event receive signal offer from parent window from caller
      // because when caller add stream or track => create new signal offer => signal event => add signal again
      peer.on('data', (data) => {
        const dataObj = JSON.parse(data.toString())
        // console.log(dataObj)
        if (dataObj.type === 'signal-add-stream') {
          peer.signal(dataObj.signal)
        } else if (dataObj.type === 'turn-off-video') {
          outputStopVideo(false)
        }
      });

      // peer.on('stream', (stream) => {
      //   console.log('call stream');
      // });

      peer.on('track', (track, stream) => {
        // console.log('call track');
        if (track.kind === 'audio') {
          outputAudio(stream);
        } else if (track.kind === 'video') {
          if (stream.getVideoTracks().length < 2) {
            outputVideo(stream, false);
          }
        }
      });

      // run after add signal => create custom event => send signal answer to parent window => caller
      peer.on('signal', (signal) => {
        // console.log('answer signal')
        if (!window.connectPeer) {
          const event = new CustomEvent('signalAnswer', {
            detail: {
              // send answer signal
              signalAnswer: JSON.stringify(signal)
            }
          });
          // dispatch event
          window.parentWindow.dispatchEvent(event)
          // window.signal = JSON.stringify(signal)
        } else {
          // be connected => send signal offer (when add stream) through data channel
          peer.send(JSON.stringify({
            type: 'signal-add-stream',
            signal
          }))
        }
      });

      addEventCtrl(peer)
    }

    // function output audio
    function outputAudio(stream) {
      const $video = $('.wrap-avatar-call').find('video');
      $video.each((i, vd) => {
        if ('srcObject' in vd) {
          vd.srcObject = stream;
        } else {
          vd.src = window.URL.createObjectURL(stream);
        }
      })
    }

    function addEventCtrl(peer) {
      $('.mic-ctrl-btn').on('click', function(e) {
        if ($(this).hasClass('btn-disabled')) {
          e.preventDefault()
        } else {
          if ($(this).hasClass('ctrl-off')) {
            // turn off mic
            removeTrackAudio(peer)
            $(this).removeClass('ctrl-off')
          } else {
            // turn on mic
            addTrackAudio(peer)
            $(this).addClass('ctrl-off')
          }
        }
      })

      // $('.share-ctrl-btn').on('click', function(e) {
      //   if ($(this).hasClass('btn-disabled')) {
      //     e.preventDefault()
      //   } else {}
      // })

      $('.video-ctrl-btn').on('click', function(e) {
        if ($(this).hasClass('btn-disabled')) {
          e.preventDefault()
        } else {
          if ($(this).hasClass('ctrl-off')) {
            // turn off mic
            removeTrackVideo(peer)
            outputStopVideo()

            peer.send(JSON.stringify({
              type: 'turn-off-video'
            }))
            $(this).removeClass('ctrl-off')
          } else {
            // turn on mic
            addTrackVideo(peer)
            $(this).addClass('ctrl-off')
          }
        }
      })

      $('.end-call-btn').on('click', function() {
        window.close()
      })
    }

    // function add stream track audio to peer
    async function addTrackAudio(peer) {
      if (navigator.mediaDevices.getUserMedia) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });

          // add track audio to peer
          peer.addTrack(
            audioStream.getAudioTracks()[0],
            window.localStream
          );

          // add audio track for stream of local stream
          window.localStream.addTrack(audioStream.getAudioTracks()[0])
        } catch (error) {
          $('.mic-ctrl-btn').removeClass('ctrl-off')
          outputWarnMessage('Bạn đã chặn quyền sử dụng microphone')
        }
      }
    }

    // function remove track audio stream
    function removeTrackAudio(peer) {
      peer.removeTrack(
        window.localStream.getAudioTracks()[0],
        window.localStream
      );
      // remove audio track of stream in local stream
      window.localStream.removeTrack(window.localStream.getAudioTracks()[0]);
    }

    // function add stream track video to peer
    async function addTrackVideo(peer) {
      if (navigator.mediaDevices.getUserMedia) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });

          if (peer) {
            // add track audio to peer
            peer.addTrack(
              videoStream.getVideoTracks()[0],
              window.localStream
            );
          }

          // add audio track for stream of local stream
          window.localStream.addTrack(videoStream.getVideoTracks()[0])
          outputVideo()
        } catch (error) {
          $('.video-ctrl-btn').removeClass('ctrl-off')
          outputWarnMessage('Bạn đã chặn quyền sử dụng camera')
        }
      }
    }

    // function remove track video stream
    function removeTrackVideo(peer) {
      peer.removeTrack(
        window.localStream.getVideoTracks()[0],
        window.localStream
      );
      // stop and remove video track of stream in local
      window.localStream.getVideoTracks()[0].stop();
      window.localStream.removeTrack(window.localStream.getVideoTracks()[0]);
    }

  // output friend video
  function outputVideo(stream = window.localStream, me = true) {
    if (me) {
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
      const $wrapFriendVideo = $('.wrap-friend-video');
      if ($wrapFriendVideo.length) {
        $wrapFriendVideo.find('img').css('display', 'none');
        const $video = $wrapFriendVideo.find('video');
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

  // output stop video
  function outputStopVideo(me = true) {
    if (me) {
      const $wrapMyVideo = $('.wrap-my-video');
      if ($wrapMyVideo.length) {
        $wrapMyVideo.find('img').css('display', 'inline');
        const $video = $wrapMyVideo.find('video');
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
      const $wrapFriendVideo = $(`.wrap-friend-video`);
      if ($wrapFriendVideo.length) {
        $wrapFriendVideo.find('img').css('display', 'inline');
        const $video = $wrapFriendVideo.find('video');
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
})()

export default ChatAudio