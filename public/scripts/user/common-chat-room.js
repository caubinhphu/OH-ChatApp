const chatMain = document.getElementById('chat-main-middle'); // chat main area
const btnChangeStatusTime = document.querySelector('#hide-time-btn'); // Change display status button
const roomName = document.getElementById('room-info-name-room'); // room name
const participants = document.getElementById('room-users'); // participants area
const amountParticipants = document.getElementById('amount-participants'); // amount participants
const msgForm = document.sendMsgForm; // form chat

// socket.io
const socket = io();

const charReplaces = {
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
};

const replaceChar = function (char) {
  return charReplaces[char] || char;
};

const escapeHtml = function (html) {
  return html.replace(/[<>&]/g, replaceChar);
};

// get token from query string
const qs = new URLSearchParams(location.search);

// emit join chat
socket.emit('joinChat', { token: qs.get('token') });

// receive  message from server
socket.on('message', (msgObj) => {
  // output message
  outputMessage(msgObj);

  // scroll bottom
  chatMain.scrollTop = chatMain.scrollHeight;
});

// event submit form chat
msgForm.addEventListener('submit', (e) => {
  // stop submit form
  e.preventDefault();

  // input message
  const inputMsg = e.target.elements.message;

  if (inputMsg.value !== '') {
    // send message to server
    socket.emit('messageChat', {
      message: inputMsg.value,
      token: qs.get('token'),
    });

    // create message obj to show in client
    const msgObj = {
      time: moment().format('h:mm A'),
      username: 'Me',
      message: escapeHtml(inputMsg.value),
    };
    outputMessage(msgObj, true);

    // scroll bottom
    chatMain.scrollTop = chatMain.scrollHeight;

    // set value for input message
    inputMsg.value = '';

    // focus input message
    inputMsg.focus();
  }
});

// output message in main chat area
function outputMessage(msgObj, me = false) {
  const div = document.createElement('div');
  if (me) {
    div.className = 'message text-right';
    div.innerHTML = `<small class="message-time" style="display:${
      btnChangeStatusTime.dataset.status === 'off' ? 'none' : 'inline'
    }">${msgObj.time}</small>
    <div>
      <div class="msg-me">
        <small class="message-content mx-0">${msgObj.message}</small>
      </div>
    <div>`;
  } else {
    div.className = 'message';
    div.innerHTML = `<small class="message-time" style="display:${
      btnChangeStatusTime.dataset.status === 'off' ? 'none' : 'inline'
    }">${msgObj.time}</small>
      <div>
        <div class="msg">
          <img class="message-avatar" src="/images/avatar-1586267910056-769250908.png" alt="a" />
          <small class="message-name">${msgObj.username}</small>
          <small class="message-content">${msgObj.message}</small>
        </div>
      </div>`;
  }

  // append message
  chatMain.appendChild(div);
}

// receive error message from server when has error
socket.on('errorMessage', (msg) => {
  outputErrorMessage(msg);
});

// receive message from server when leave
socket.on('leaveComplete', (msg) => {
  if (msg === 'OK') {
    location.href = '/';
  } else {
    location.reload();
  }
});

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
    socket.emit('disconnectRequest', { typeLeave: 'self' });
  });
