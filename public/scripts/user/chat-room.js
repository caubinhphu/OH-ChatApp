const chatMain = document.getElementById('chat-main-middle'); // chat main area
const btnChangeStatusTime = document.querySelector('#hide-time-btn'); // Change display status button

// socket.io
const socket = io();

// get username and room
const qs = new URLSearchParams(location.search);

// emit join room
socket.emit('joinRoom', { username: qs.get('name'), room: qs.get('room') });

// receive  message from server
socket.on('message', (mgsObj) => {
  // console.log(mgsObj);

  // output message
  outputMessage(mgsObj);

  // scroll bottom
  chatMain.scrollTop = chatMain.scrollHeight;
});

socket.on('roomInfo', (roomInfo) => {
  console.log(roomInfo);
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

// event change status display time
btnChangeStatusTime.addEventListener('click', function () {
  if (this.dataset.status === 'on') {
    // show time now -> hide time
    this.innerHTML = 'Show time';
    document.querySelectorAll('.message-time').forEach((time) => {
      time.style.display = 'none';
    });
    this.dataset.status = 'off';
  } else if (this.dataset.status === 'off') {
    // hide time now -> show time
    this.innerHTML = 'Hide time';
    document.querySelectorAll('.message-time').forEach((time) => {
      time.style.display = 'inline';
    });
    this.dataset.status = 'on';
  }
});
