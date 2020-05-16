const waitingRoomArea = document.getElementById('waiting-room');
const waitingRoomUsers = document.getElementById('waiting-room-users');
const allowJoinBtn = document.getElementById('allow-join-btn');
const noAllowJoinBtn = document.getElementById('no-allow-join-btn');
const kickUserBtn = document.getElementById('confirm-kick-user-btn');

// receive password of room from server
socket.on('sendPasswordRoom', (password) => {
  document.querySelector(
    '#room-info-password-room'
  ).innerHTML = `(${password})`;
});

// receive room manager info from server
socket.on('roomManager', (manager) => {
  outputRoomManager(manager);
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

// receive room info from server
socket.on('roomInfo', (roomInfo) => {
  outputRoomInfo(roomInfo, socket.id);
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
    socket.emit('disconnectRequest', {
      typeLeave: 'all',
      token: qs.get('token'),
    });
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
        });
      }
    );

    [...document.getElementsByClassName('waiting-room-not-allow-btn')].forEach(
      (btn) => {
        btn.addEventListener('click', function () {
          noAllowJoinBtn.dataset.id = this.dataset.id;
        });
      }
    );
  } else {
    waitingRoomUsers.innerHTML = '';
    waitingRoomArea.style.display = 'none';
  }
}

allowJoinBtn.addEventListener('click', function () {
  socket.emit('allowJoinRoom', {
    userId: this.dataset.id,
    token: qs.get('token'),
  });
});

noAllowJoinBtn.addEventListener('click', function () {
  socket.emit('notAllowJoinRoom', {
    userId: this.dataset.id,
    token: qs.get('token'),
  });
});

// output room info
function outputRoomInfo(roomInfo, socketId) {
  // room name
  roomName.innerHTML = roomInfo.nameRoom;
  // amount participants
  amountParticipants.innerHTML = `(${roomInfo.users.length})`;
  // participants
  participants.innerHTML = roomInfo.users
    .sort((user1, user2) => {
      if (user1.socketId === socketId) return -1;
      if (user2.socketId === socketId) return 1;
      return user1.name.localeCompare(user2.name, 'en', {
        sensitivity: 'base',
      });
    })
    .map((user) => {
      return `<div class="room-user p-2 d-flex justify-content-between">
        <div>
          <img class="room-user-avatar" src="/images/avatar-1586267910056-769250908.png" alt="u" />
          <span class="room-user-name ml-2">${user.name}${
        user.socketId === socketId ? ' (Bạn)(Host)' : ''
      }</span>
        </div>
        ${user.socketId !== socketId ? outputKickBtn(user.id) : ''}
      </div>`;
    })
    .join('');

  [...document.getElementsByClassName('kick-user-btn')].forEach((btn) => {
    btn.addEventListener('click', function () {
      kickUserBtn.dataset.id = this.dataset.id;
    });
  });
}

function outputKickBtn(userId) {
  return `<div>
    <button class="btn btn-default text-danger kick-user-btn" title="Kick khỏi phòng" data-toggle="modal"
      data-target="#confirm-kick-user-modal" data-id="${userId}">
        <i class="fas fa-times-circle"></i>
    </button>
  </div>`;
}

kickUserBtn.addEventListener('click', function () {
  // emit kick user in the room
  socket.emit('disconnectRequest', {
    typeLeave: 'kicked',
    userId: this.dataset.id,
    token: qs.get('token'),
  });
});

function outputRoomManager(manager) {
  if (!manager.allowChat) {
    document.getElementById('management-turnoff-chat').checked = true;
  }
  const ids = {
    open: 'management-open-room',
    locked: 'management-lock-room',
    waiting: 'management-waiting-room',
  };
  document.getElementById(ids[manager.state]).checked = true;
}
