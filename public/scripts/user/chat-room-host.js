const waitingRoomArea = document.getElementById('waiting-room');
const waitingRoomUsers = document.getElementById('waiting-room-users');
const allowJoinBtn = document.getElementById('allow-join-btn');
const noAllowJoinBtn = document.getElementById('no-allow-join-btn');

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
        return `<div class="waiting-room-user p-2 d-flex justify-content-between">
          <div>
            <img class="waiting-room-user-avatar" src="/images/avatar-1586267910056-769250908.png" alt="u" />
            <span class="waiting-room-user-name ml-2">${user.name}</span>
          </div>
          <div>
            <button class="btn btn-default text-success waiting-room-allow-btn" title="Cho phép"
              data-toggle="modal" data-target="#confirm-join-room-modal" data-id="${user.id}">
                <i class="fas fa-check-circle"></i>
            </button>
            <button class="btn btn-default text-danger waiting-room-not-allow-btn" title="Không cho phép"
              data-toggle="modal" data-target="#confirm-no-join-room-modal" data-id="${user.id}">
                <i class="fas fa-times-circle"></i>
            </button>
          </div>
        </div>`;
      })
      .join('');

    waitingRoomArea.style.display = 'block';

    [...document.getElementsByClassName('waiting-room-allow-btn')].forEach(
      (btn) => {
        btn.addEventListener('click', function () {
          allowJoinBtn.dataset.id = this.dataset.id;
          console.log(this.dataset.id);
        });
      }
    );

    [...document.getElementsByClassName('waiting-room-not-allow-btn')].forEach(
      (btn) => {
        btn.addEventListener('click', function () {
          noAllowJoinBtn.dataset.id = this.dataset.id;
          console.log(this.dataset.id);
        });
      }
    );
  } else {
    waitingRoomUsers.innerHTML = '';
    waitingRoomArea.style.display = 'none';
  }
}
