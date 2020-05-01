const chatMain = document.getElementById('chat-main-middle'); // chat main area
const btnChangeStatusTime = document.querySelector('#hide-time-btn'); // Change display status button
const roomName = document.getElementById('room-info-name-room'); // room name
const participants = document.getElementById('room-users'); // participants area
const amountParticipants = document.getElementById('amount-participants'); // amount participants
const mgsForm = document.sendMgsForm; // form chat

// socket.io
const socket = io();

// get token from query string
const qs = new URLSearchParams(location.search);

// emit join chat
socket.emit('joinChat', { token: qs.get('token') });

// receive  message from server
socket.on('message', (mgsObj) => {
  // output message
  outputMessage(mgsObj);

  // scroll bottom
  chatMain.scrollTop = chatMain.scrollHeight;
});

// receive room info from server
socket.on('roomInfo', (roomInfo) => {
  outputRoomInfo(roomInfo, socket.id);
});

// event submit form chat
mgsForm.addEventListener('submit', (e) => {
  // stop submit form
  e.preventDefault();

  // input message
  const inputMgs = e.target.elements.message;

  // send message to server
  socket.emit('messageChat', {
    message: inputMgs.value,
    token: qs.get('token'),
  });

  // set value for input message
  inputMgs.value = '';

  // focus input message
  inputMgs.focus();
});

// output message in main chat area
function outputMessage(mgsObj) {
  const div = document.createElement('div');
  div.className = 'message';
  div.innerHTML = `<img class="message-avatar" src="/images/avatar-1586267910056-769250908.png" alt="a" />
    <small class="message-time" style="display:${
      btnChangeStatusTime.dataset.status === 'off' ? 'none' : 'inline'
    }">${mgsObj.time}</small>
    <small class="message-name">${mgsObj.username}</small>
    <small class="message-content">${mgsObj.message}</small>`;

  // append message
  chatMain.appendChild(div);
}

// receive error message from server when has error
socket.on('errorMessage', (mgs) => {
  outputErrorMessage(mgs);
});

// receive message from server when leave
socket.on('leaveComplete', (mgs) => {
  if (mgs === 'OK') {
    location.href = 'http://localhost:3000';
  } else {
    location.reload();
  }
});

// receive message from server when leave all
socket.on('leaveAllComplete', (mgs) => {
  if (mgs === 'OK') {
    document.querySelector('#leave-room-modal').style.display = 'block';
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
  } else {
    location.reload();
  }
});

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
      return `<div class="room-user p-2">
      <img class="room-user-avatar" src="/images/avatar-1586267910056-769250908.png" alt="u" />
      <span class="room-user-name ml-2">${user.name}${
        user.socketId === socketId ? ' (Bạn)' : ''
      }${user.host ? ' (Host)' : ''}</span></div>`;
    })
    .join('');
}

// event change status display time
btnChangeStatusTime.addEventListener('click', function () {
  if (this.dataset.status === 'on') {
    // show time now -> hide time
    this.innerHTML = 'Hiện thời gian';
    document.querySelectorAll('.message-time').forEach((time) => {
      time.style.display = 'none';
    });
    this.dataset.status = 'off';
  } else if (this.dataset.status === 'off') {
    // hide time now -> show time
    this.innerHTML = 'Ẩn thời gian';
    document.querySelectorAll('.message-time').forEach((time) => {
      time.style.display = 'inline';
    });
    this.dataset.status = 'on';
  }
});

// disconnect for self
document
  .querySelector('#disconnect-btn')
  .addEventListener('click', function () {
    socket.emit('disconnectRequire', { typeLeave: 'self' });
  });
