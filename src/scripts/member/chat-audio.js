import SimplePeer from 'simple-peer'

const ChatAudio = (() => {
  // get media device of user
  navigator.mediaDevices.getUserMedia =
    navigator.mediaDevices.getUserMedia ||
    navigator.mediaDevices.webkitGetUserMedia ||
    navigator.mediaDevices.mozGetUserMedia ||
    navigator.mediaDevices.msGetUserMedia;

    window.localStream = new MediaStream()

    if (window.typeCall === 'caller') {
      // window of caller
      // init peer
      const peer = new SimplePeer({
        initiator: true, // init -> offer peer
        trickle: false
      });

      // add events to peer
      // after connect => add stream audio
      peer.on('connect', async () => {
        console.log('call connection')
        addTrackAudio(peer)
      });

      peer.on('close', () => {
        console.log('call close');
      });

      peer.on('data', (data) => console.log(data.toString()));

      peer.on('stream', (stream) => {
        console.log('call stream');
        // if (stream.getVideoTracks().length >= 2) {
        //   outputShare(stream, socketId)
        // }
      });

      peer.on('track', (track, stream) => {
        console.log('call track');
        if (track.kind === 'audio') {
          outputAudio(stream);
        }
      });

      peer.on('signal', (signal) => {
        console.log('call ');
        // create custom event to send to window parent
        const event = new CustomEvent('signalOffer', {
          detail: {
            // send signal offer
            signalOffer: JSON.stringify(signal)
          }
        });
        // dispatch (trigger) event custom
        window.parentWindow.dispatchEvent(event)
      });
      // window.peer = peer

      // event receive signal answer from parent window (peer answer)
      $(window).on('signalAnswer', (e) => {
        const { signalAnswer } = e.detail
        // console.log('signalAnswer ', signalAnswer);
        peer.signal(JSON.parse(signalAnswer))
      })
    } else {
      // window of receiver
      // init peer answer
      const peer = new SimplePeer({
        initiator: false,
        trickle: false
      });
  
      // console.log('signal offer ', window.signalOffer);

      // add signal offer to peer
      peer.signal(JSON.parse(window.signalOffer))

      // add events
      // conect => add audio stream
      peer.on('connect', async () => {
        console.log('answer connection')
        addTrackAudio(peer)
      });

      peer.on('close', () => {
        console.log('call close');
      });

      peer.on('data', (data) => console.log(data.toString()));

      peer.on('stream', (stream) => {
        console.log('call stream');
        // if (stream.getVideoTracks().length >= 2) {
        //   outputShare(stream, socketId)
        // }
      });

      peer.on('track', (track, stream) => {
        console.log('call track');
        if (track.kind === 'audio') {
          outputAudio(stream);
        }
      });

      // run after add signal => create custom event => send signal answer to parent window => caller
      peer.on('signal', (signal) => {
        console.log('answer signal')
        const event = new CustomEvent("signalAnswer", {
          detail: {
            // send answer signal
            signalAnswer: JSON.stringify(signal)
          }
        });
        // dispatch event
        window.parentWindow.dispatchEvent(event)
        // window.signal = JSON.stringify(signal)
      });
      // window.peer = peer

      // event receive signal offer from parent window from caller
      // because when caller add stream or track => create new signal offer => signal event => add signal again
      $(window).on('signalOffer', (e) => {
        const { signalOffer } = e.detail
        // console.log('signalOffer ', signalOffer);
        peer.signal(JSON.parse(signalOffer))
      })
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

    // function add stream track audio to peer
    function addTrackAudio(peer) {
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
})()

export default ChatAudio