import SimplePeer from 'simple-peer'

const ChatAudio = (() => {
  // get media device of user
  navigator.mediaDevices.getUserMedia =
    navigator.mediaDevices.getUserMedia ||
    navigator.mediaDevices.webkitGetUserMedia ||
    navigator.mediaDevices.mozGetUserMedia ||
    navigator.mediaDevices.msGetUserMedia;

    window.localStream = new MediaStream()

    if (window.typeClient === 'caller') {
      // window of caller
      // init peer
      const peer = new SimplePeer({
        initiator: true, // init -> offer peer
        trickle: false
      });

      // add events to peer
      // after connect => add stream audio
      peer.on('connect', () => {
        // console.log('call connection')
        addTrackAudio(peer)
        // be connected
        window.connectPeer = true
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
        }
      });

      peer.on('signal', (signal) => {
        console.log('call ');
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
        if (window.windowCall) {
          window.windowCall.close()
        } else if (window.windowReceive) {
          window.windowReceive.close()
        }
      }
    } else {
      // window of receiver
      // init peer answer
      const peer = new SimplePeer({
        initiator: false,
        trickle: false
      });

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
        }
      });

      // peer.on('stream', (stream) => {
      //   console.log('call stream');
      // });

      peer.on('track', (track, stream) => {
        // console.log('call track');
        if (track.kind === 'audio') {
          outputAudio(stream);
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
      $('.mic-ctrl-btn').on('click', function() {
        if ($(this).hasClass('ctrl-off')) {
          // turn off mic
          removeTrackAudio(peer)
          $(this).removeClass('ctrl-off')
        } else {
          // turn on mic
          addTrackAudio(peer)
          $(this).addClass('ctrl-off')
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
})()

export default ChatAudio