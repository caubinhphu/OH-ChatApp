const joinRoomForm = document.joinRoomForm;

// socket.io
const socket = io();

joinRoomForm.addEventListener('submit', function (e) {
  e.preventDefault();
  const nameInput = e.target.elements.name;
  const roomIdInput = e.target.elements.roomId;
  const passRoomInput = e.target.elements.passRoom;
  const memberIdInput = e.target.elements.memberId;

  if (nameInput.value.length <= 0 || nameInput.value.length > 30) {
    document.querySelector('#err-join-name').innerHTML = 'Tên chưa hợp lệ';
  } else {
    socket.emit('joinRoom', {
      roomId: roomIdInput.value,
      passRoom: passRoomInput.value,
      username: nameInput.value,
      memberId: memberIdInput.value,
    });
  }
});

// receive access token from server when join room successful
socket.on('joinRoomSuccess', (token) => {
  location.href = `/chat?token=${token}`;
});

// receive info when join room is blocked
socket.on('joinRoomBlocked', (msg) => {
  outputJoinRoomBlocked(msg);

  const leaveBtn = document.getElementById('leave-btn');
  let time = 4;
  leaveBtn.innerHTML = `OK(5)`;
  setInterval(() => {
    leaveBtn.innerHTML = `OK(${time})`;
    time--;
  }, 1000);
  setTimeout(() => {
    location.href = '/';
  }, 5000);
});

// receive error message from server when has error
socket.on('errorMessage', (message) => {
  outputErrorMessage(message);
});

// receive info waiting room from server
socket.on('toWaitingRoom', ({ msg, roomId, userId }) => {
  outputHtmlWaitingRoom(msg, roomId, userId);
});

// receive message leaveWaitingRoomComplete after leave waiting room complete
socket.on('leaveWaitingRoomComplete', (message) => {
  if (message === 'OK') {
    location.reload();
  }
});

// output waiting room html
function outputHtmlWaitingRoom(message, roomId, userId) {
  document.getElementById('form-x').innerHTML = `<div id="waiting-room-modal">
    <div class="d-flex justify-content-center align-items-center" id="waiting-modal">
      <div id="waiting-modal-main">
        <div class="d-flex justify-content-between">
          <span class="waiting-room-id">Phòng: ${roomId}</span>
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
      socket.emit('leaveWaitingRoom', { typeLeave: 'self', roomId, userId });
    });
}

function outputJoinRoomBlocked(msg) {
  document.getElementById('form-x').innerHTML = `<div id="leave-room-modal">
    <div class="d-flex justify-content-center align-items-center" id="leave-modal">
        <div id="leave-modal-main"><span>${msg}</span>
            <div class="text-right">
              <a class="btn btn-primary mt-2" id="leave-btn" href="/" role="button">OK</a>
            </div>
        </div>
    </div>
  </div>`;
}

// get parameter by name in string query
function getParameterByName(name, url) {
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);
  if (!results) {
    return null
  };
  if (!results[2]) {
    return ''
  };
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// check string is url
function checkIsUrl(string) {
  try {
    new URL(string);
  } catch (_) {
    return false;
  }
  return true;
}

$('#room').on('input', function() {
  if (checkIsUrl(this.value)) {
    $('#passRoom').val(getParameterByName('pass', this.value));
    $(this).val(getParameterByName('room', this.value));
  }
})