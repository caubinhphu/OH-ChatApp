// socket.io
const socket = io();

document.createRoomForm.addEventListener('submit', function (e) {
  e.preventDefault();

  // input id room
  let idRoomInput = e.target.elements.idRoom;

  // input password room
  let passRoomInput = e.target.elements.passRoom;

  // input host name
  let hostnameInput = e.target.elements.hostname;

  // send to server
  socket.emit('createRoom', {
    idRoom: idRoomInput.value,
    password: passRoomInput.value,
    hostname: hostnameInput.value,
  });
});

// receive access token from server when create room successful
socket.on('createRoomCompleted', (token) => {
  location.href = `http://localhost:3000/chat?token=${token}`;
});

// receive error message from server when has error
socket.on('errorMessage', (mgs) => {
  outputErrorMessage(mgs);
});
