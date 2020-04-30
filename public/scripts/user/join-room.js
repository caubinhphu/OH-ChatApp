const joinRoomForm = document.joinRoomForm;

// socket.io
const socket = io();

joinRoomForm.addEventListener('submit', function (e) {
  e.preventDefault();
  let nameInput = e.target.elements.name;
  let idRoomInput = e.target.elements.idRoom;
  let passRoomInput = e.target.elements.passRoom;

  if (nameInput.value.length <= 0 || nameInput.value.length > 30) {
    document.querySelector('#err-join-name').innerHTML = 'Tên chưa hợp lệ';
  } else {
    socket.emit('joinRoom', {
      idRoom: idRoomInput.value,
      passRoom: passRoomInput.value,
      username: nameInput.value,
    });
  }
});

// receive access token from server when join room successful
socket.on('joinRoomSuccess', (token) => {
  location.href = `http://localhost:3000/chat?token=${token}`;
});

// receive error message from server when has error
socket.on('errorMessage', (mgs) => {
  outputErrorMessage(mgs);
});
