// // const imgStream = document.getElementById('image-stream');
// // socket.on('onStream', (image) => {
// //   imgStream.src = image;
// // });

// const video = document.getElementById('video');
// const video2 = document.getElementById('video2');

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

//       const peer = new SimplePeer({
//         initiator: false,
//         trickle: false,
//         stream,
//       });
//       // peer.addStream(stream);
//       // createPeer(stream);

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

//           alert('signal');
//         });

//       peer.on('signal', (signal) => {
//         document.getElementById('textarea-signal').innerHTML = JSON.stringify(
//           signal
//         );
//         document.getElementById('div-signal').innerHTML = JSON.stringify(
//           signal
//         );
//       });

//       peer.on('stream', (s) => {
//         console.log('asdf');
//         console.log(s);
//         if ('srcObject' in video2) {
//           video2.srcObject = s;
//         } else {
//           video2.src = window.URL.createObjectURL(s);
//         }
//         video2.play();
//       });
//     })
//     .catch((err) => {
//       console.log(err);
//     });
// }

// // function createPeer(stream) {
// //   peer.addStream(stream);
// //   peer.on('signal', (signal) => {
// //     const s = JSON.stringify(signal);
// //     console.log(s);
// //     socket.emit('sendSignalStream', s);
// //   });
// // }

// // socket.on('signalOffer', ({ s, id }) => {
// //   peer.signal(JSON.parse(s));
// //   peer.on('signal', (stream) => {
// //     socket.emit('returnSignal', { s: JSON.stringify(stream), id });
// //   });
// // });

// // socket.on('signalReceive', (signal) => {
// //   peer.signal(JSON.parse(signal));
// //   console.log(signal);
// // });
