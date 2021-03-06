

const ChatAudio = (() => {
  // get media device of user
  navigator.mediaDevices.getUserMedia =
    navigator.mediaDevices.getUserMedia ||
    navigator.mediaDevices.webkitGetUserMedia ||
    navigator.mediaDevices.mozGetUserMedia ||
    navigator.mediaDevices.msGetUserMedia;

    window.parentWindow.offerSignal = 'signal'
    window.parentWindow.dispatchEvent(new CustomEvent('signalOffer'))

    window.localStream = new MediaStream()

    if (window.typeCall === 'receiver') {
      const peer = window.peer
      peer.on('connect', async () => {
        console.log('answer connect')
        if (navigator.mediaDevices.getUserMedia) {
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true,
            });
  
            // turn on video
            // set UI
            // this.dataset.state = 'on';
            // $(this).addClass('is-turn-on');
            // $(this).find('.popup').html('Tắt audio (Alt + A)');
  
            // add audio track for stream of each peer
            peer.send('OK')
            console.log(window.localStream);
            // peer.addTrack(
            //     audioStream.getAudioTracks()[0],
            //     window.localStream
            // );
  
            // add audio track for stream of local stream
            window.localStream.addTrack(audioStream.getAudioTracks()[0]);
          } catch (error) {
            outputWarnMessage('Bạn đã chặn quyền sử dụng microphone')
          }
        }
      });
      peer.on('data', async (data) => {
        console.log(data)
      })

      peer.on('track', (track, stream) => {
        console.log('call track');
        if (track.kind === 'audio') {
          outputAudio(stream);
        }
      });
    } else {
      $(window).on('changePeer', () => {
        const peer = window.peer
        peer.signal(JSON.parse(window.signalPeer))
        peer.on('connect', () => console.log('answer1 connect'));
        peer.on('data', (data) => {
          console.log(data)
        })
        peer.on('track', (track, stream) => {
          console.log('call track');
          if (track.kind === 'audio') {
            outputAudio(stream);
          }
        });

        // peer.send('connect-success')
      })
    }
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
})()

export default ChatAudio