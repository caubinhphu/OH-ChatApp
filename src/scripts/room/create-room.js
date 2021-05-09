const CreateRoom = (()=> {
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

    // input member id
    let memberIdInput = e.target.elements.memberId;

    // send to server
    socket.emit('createRoom', {
      roomId: roomIdInput.value,
      password: passRoomInput.value,
      hostname: hostnameInput.value,
      memberId: memberIdInput.value,
    });

    showLoader()
  });

  // receive access token from server when create room successful
  socket.on('createRoomCompleted', ({ token, roomId }) => {
    sessionStorage.setItem('token', token)
    location.href = `/host/chat?room=${roomId}`;
  });

  // receive error message from server when has error
  socket.on('errorMessage', (msg) => {
    outputErrorMessage(msg);
  });
})()

export default CreateRoom