// receive info change status room (management of host) from server
socket.on('changeStatusRoom', ({ key, value }) => {
  if (key === 'allowChat') {
    outputChatInput(value);
  }
});

// receive room info from server
socket.on('roomInfo', (roomInfo) => {
  outputRoomInfo(roomInfo, socket.id);
});

// receive message from server when leave all
socket.on('leaveAllComplete', (msg) => {
  if (msg === 'OK') {
    outputLeaveRoom(
      'Host đã kết thúc chat cho tất cả mọi người, quay lại trang chủ'
    );
    fiveSecond();
  } else {
    location.reload();
  }
});

// receive ,essage kicked out the room
socket.on('kickedOutRoom', (msg) => {
  if (msg === 'OK') {
    outputLeaveRoom('Host đã đá bạn ra khỏi phòng!');
    fiveSecond();
  }
});

// output chat input if allowed
function outputChatInput(allowed) {
  if (allowed) {
    // allow chat
    msgForm.innerHTML = `<input id="msg" class="form-control" type="text" name="message", placeholder="Nhập tin nhắn", autocomplete="off" />
      <button class="btn btn-default"><i class="fas fa-paper-plane"/></button>`;
  } else {
    // not allow chat
    msgForm.innerHTML = `<div class="chat-disabled-text">Chat bị cấm bởi host</div>`;
  }
}

// output room info
function outputRoomInfo(roomInfo, socketId) {
  // console.log(roomInfo, socketId);
  // room name
  roomName.innerHTML = roomInfo.nameRoom;
  // amount participants
  amountParticipants.innerHTML = `(${roomInfo.users.length})`;
  // participants
  participants.innerHTML = roomInfo.users
    .sort((user1, user2) => {
      if (user1.socketId === socketId) return -1;
      if (user2.socketId === socketId) return 1;
      if (user1.host) return -1;
      if (user2.host) return 1;
      return user1.name.localeCompare(user2.name, 'en', {
        sensitivity: 'base',
      });
    })
    .map((user) => {
      return `<div class="room-user p-2 d-flex justify-content-between">
        <div>
          <img class="room-user-avatar" src="/images/avatar-1586267910056-769250908.png" alt="u" />
          <span class="room-user-name ml-2">${user.name}${
        user.socketId === socketId ? ' (Bạn)' : ''
      }${user.host ? ' (Host)' : ''}</span>
        </div>
      </div>`;
    })
    .join('');
}

// output leave room all modal
function outputLeaveRoom(msg) {
  document.querySelector(
    '#chat-main-area'
  ).innerHTML = `<div id="leave-room-modal">
    <div class="d-flex justify-content-center align-items-center" id="leave-modal">
        <div id="leave-modal-main"><span>${msg}</span>
            <div class="text-right">
              <a class="btn btn-primary mt-2" id="leave-btn" href="/" role="button">OK</a>
            </div>
        </div>
    </div>
  </div>`;
}

// countdown 5 seconds
function fiveSecond() {
  const leaveBtn = document.getElementById('leave-btn');
  let time = 4;
  leaveBtn.innerHTML = `OK (5s)`;
  setInterval(() => {
    leaveBtn.innerHTML = `OK (${time}s)`;
    time--;
  }, 1000);
  setTimeout(() => {
    location.href = 'http://localhost:3000';
  }, 5000);
}
