window.onbeforeunload = function (e) {
  let message = 'Bạn có chắc rời khỏi phòng?';
  if (typeof event === 'undefined') {
    event = window.event;
  }
  if (event) {
    event.returnValue = message;
  }
  return message;
};

const chatMain = document.getElementById('chat-main-middle'); // chat main area
const btnChangeStatusTime = document.querySelector('#hide-time-btn'); // Change display status button
const roomName = document.getElementById('room-info-name-room'); // room name
const participants = document.getElementById('room-users'); // participants area
const amountParticipants = document.getElementById('amount-participants'); // amount participants

// socket.io
const socket = io();

// get username and room
const qs = new URLSearchParams(location.search);

// emit join room
socket.emit('joinRoom', { username: qs.get('name'), room: qs.get('room') });

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
document.sendMgsForm.addEventListener('submit', (e) => {
  // stop submit form
  e.preventDefault();

  // input message
  const inputMgs = e.target.elements.message;

  // send message to server
  socket.emit('messageChat', inputMgs.value);

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

// output room info
function outputRoomInfo(roomInfo, idUser) {
  // room name
  roomName.innerHTML = roomInfo.nameRoom;
  // amount participants
  amountParticipants.innerHTML = `(${roomInfo.users.length})`;
  // participants
  participants.innerHTML = roomInfo.users
    .sort((a, b) => {
      if (a.id === idUser) return -1;
      if (b.id === idUser) return 1;
      return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
    })
    .map((user) => {
      return `<div class="room-user p-2">
      <img class="room-user-avatar" src="/images/avatar-1586267910056-769250908.png" alt="u" />
      <span class="room-user-name ml-2">${user.name}${
        user.id === idUser ? ' (Bạn)' : ''
      }</span></div>`;
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
