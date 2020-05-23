// navigator.mediaDevices.getUserMedia =
//   navigator.mediaDevices.getUserMedia ||
//   navigator.mediaDevices.webkitGetUserMedia ||
//   navigator.mediaDevices.mozGetUserMedia;

// if (navigator.mediaDevices.getUserMedia) {
//   navigator.mediaDevices
//     .getUserMedia({ video: true, audio: false })
//     .then((stream) => {
//       if ('srcObject' in video) {
//         video.srcObject = stream;
//       } else {
//         video.src = window.URL.createObjectURL(stream);
//       }
//       video.play();

//       // createPeer(stream);
//       const peer = new SimplePeer({
//         initiator: true,
//         trickle: false,
//         stream,
//       });

//       peer.on('connect', () => {
//         console.log('connect');
//       });

//       document
//         .getElementById('btn-connect')
//         .addEventListener('click', function () {
//           const signal = JSON.parse(
//             document.getElementById('text-signal').value
//           );
//           peer.signal(signal);
//         });

//       peer.on('signal', (signal) => {
//         document.getElementById('textarea-signal').innerHTML = JSON.stringify(
//           signal
//         );
//       });
//       peer.on('stream', (stream) => {
//         console.log('asdf');
//         console.log(stream);
//         if ('srcObject' in video2) {
//           video2.srcObject = stream;
//         } else {
//           video2.src = window.URL.createObjectURL(stream);
//         }
//         video2.play();
//       });
//     })
//     .catch((err) => {
//       console.log(err);
//     });
// }

// function createPeer(stream) {
//   peer.addStream(stream);
// }

// socket.on('signalOffer', ({ s, id }) => {
//   peer.signal(JSON.parse(s));
//   peer.on('signal', (stream) => {
//     socket.emit('returnSignal', { s: JSON.stringify(stream), id });
//   });
// });

// socket.on('signalReceive', (signal) => {
//   peer.signal(JSON.parse(signal));
//   console.log(signal);
// });
