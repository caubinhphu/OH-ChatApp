// socket.io
const socket = io();

document.createRoomForm.addEventListener('submit', function (e) {
  e.preventDefault();

  // input id room
  let roomIdInput = e.target.elements.roomId;

  // input password room
  let passRoomInput = e.target.elements.passRoom;

  // input host name
  let hostnameInput = e.target.elements.hostname;

  // send to server
  socket.emit('createRoom', {
    roomId: roomIdInput.value,
    password: passRoomInput.value,
    hostname: hostnameInput.value,
  });
});

// receive access token from server when create room successful
socket.on('createRoomCompleted', (token) => {
  location.href = `/host/chat?token=${token}`;
});

// receive error message from server when has error
socket.on('errorMessage', (msg) => {
  outputErrorMessage(msg);
});
