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
socket.on('errorMessage', (message) => {
  outputErrorMessage(message);
});

// receive info waiting room from server
socket.on('toWaitingRoom', ({ mgs: message, idRoom, idUser }) => {
  outputHtmlWaitingRoom(message, idRoom, idUser);
});

// receive message leaveWaitingRoomComplete after leave waiting room complete
socket.on('leaveWaitingRoomComplete', (message) => {
  if (message === 'OK') {
    location.reload();
  }
});

// output waiting room html
function outputHtmlWaitingRoom(message, idRoom, idUser) {
  document.getElementById('form-x').innerHTML = `<div id="waiting-room-modal">
    <div class="d-flex justify-content-center align-items-center" id="waiting-modal">
      <div id="waiting-modal-main">
        <div class="d-flex justify-content-between">
          <span class="waiting-room-id">Phòng: ${idRoom}</span>
          <button type="button" data-toggle="modal" data-target="#confirm-leave-waiting-room-modal" class="btn btn-link">Rời phòng</span>
        </div>
        <span>${message}</span>
      </div>
    </div>
  </div>
  <div class="modal fade" id="confirm-leave-waiting-room-modal" tabindex="-1" role="dialog" aria-labelledby="leaveRoomModal" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-body"><span>Bạn có chắc muốn rời phòng chờ?</span>
          <div class="text-right mt-4">
            <button class="btn btn-danger" id="leave-waiting-room-btn" type="button">Rời phòng</button>
            <button class="btn btn-light ml-3" type="button" data-dismiss="modal">Trở lại</button>
          </div>
        </div>
      </div>
    </div>
</div>`;

  document
    .getElementById('leave-waiting-room-btn')
    .addEventListener('click', function () {
      socket.emit('leaveWaitingRoom', { typeLeave: 'self', idRoom, idUser });
    });
}
