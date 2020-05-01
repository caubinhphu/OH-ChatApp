const waitingRoomArea = document.getElementById('waiting-room');
const waitingRoomUsers = document.getElementById('waiting-room-users');

// receive password of room from server
socket.on('sendPasswordRoom', (password) => {
  document.querySelector(
    '#room-info-password-room'
  ).innerHTML = `(${password})`;
});

// receive message from server when leave all for host
socket.on('leaveAllCompleteForHost', (msg) => {
  if (msg === 'OK') {
    location.href = 'http://localhost:3000';
  } else {
    location.reload();
  }
});

// receive event change waiting room from server
socket.on('changeWaitingRoom', ({ waitingRoom }) => {
  outputWaitingRoom(waitingRoom);
});

// event change management
document.getElementsByName('management').forEach((checkbox) => {
  checkbox.addEventListener('change', function () {
    socket.emit('changeManagement', {
      value: this.value,
      status: this.checked,
      token: qs.get('token'),
    });
  });
});

// disconnect for all
document
  .querySelector('#disconnect-all-btn')
  .addEventListener('click', function () {
    socket.emit('disconnectRequire', { typeLeave: 'all' });
  });

// output waiting room
function outputWaitingRoom(waitingRoom) {
  if (waitingRoom.length > 0) {
    waitingRoomUsers.innerHTML = waitingRoom
      .map((user) => {
        return `<div class="waiting-room-user p-2">
          <img class="waiting-room-user-avatar" src="/images/avatar-1586267910056-769250908.png" alt="u" />
          <span class="waiting-room-user-name ml-2">${user.name}</span>
        </div>`;
      })
      .join('');

    waitingRoomArea.style.display = 'block';
  } else {
    waitingRoomUsers.innerHTML = '';
    waitingRoomArea.style.display = 'none';
  }
}
