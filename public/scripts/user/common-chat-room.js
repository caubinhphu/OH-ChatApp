const chatMain = document.getElementById('chat-middle'); // chat main area
const btnChangeStatusTime = document.querySelector('#hide-time-btn'); // Change display status button
const roomName = document.getElementById('room-info-name-room'); // room name
const participants = document.getElementById('room-users'); // participants area
const amountParticipants = document.getElementById('amount-participants'); // amount participants
const msgForm = document.sendMsgForm; // form chat
const meetingMain = document.getElementById('#meeting-show'); // meeting show area

// socket.io
const socket = io();

// get token from query string
const qs = new URLSearchParams(location.search);

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
          <img class="message-avatar" src="${msgObj.avatar}" alt="a" />
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
    this.innerHTML = '<i class="fas fa-clock"></i>';
    document.querySelectorAll('.message-time').forEach((time) => {
      time.style.display = 'none';
    });
    this.dataset.status = 'off';
  } else if (this.dataset.status === 'off') {
    // hide time now -> show time
    this.innerHTML = '<i class="far fa-clock"></i>';
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
    socket.emit('disconnectRequest', {
      typeLeave: 'self',
    });
  });

socket.emit('joinChat', {
  token: qs.get('token'),
});


// show hide control meeting
$('.arrow-smaller').on('click', () => {
  hideControls();
});

function winResize() {
  if ($(window).width() <= 768) {
    $('[data-tooltip="tooltip"]').tooltip('disable');
  } else {
    $('[data-tooltip="tooltip"]').tooltip('enable');
  }
}
winResize();
$(window).resize(winResize);

const conShowPopClass = '.control-show-pop';
const showConId = '#show-control';
const wrapConClass ='.wrap-control-meet';

$(conShowPopClass).on('click', function() {
  const $wrapControls = $(showConId);
  if ($(this).hasClass('is-active')) {
    hideControls();
  } else {
    $(conShowPopClass).removeClass('is-active');
    $('.control-area').removeClass('is-active');
    $(this).addClass('is-active');
    $(`.control-area[data-control="${this.dataset.control}"]`).addClass('is-active');
    if ($wrapControls.hasClass('no-show')) {
      showControls();
      $wrapControls.removeClass('no-show')
    }
  }
});

function hideControls() {
  $('.wrap-emojis').removeClass('is-active');
  $(showConId).animate({
    width: '0',
  }, 350, () => {
    $(showConId).addClass('no-show');
    $(conShowPopClass).removeClass('is-active');
    $('.control-area').removeClass('is-active');
  });
}

function showControls() {
  $(showConId).animate({
    width: '315px'
  }, 350);
  $(wrapConClass).fadeOut();
}

$('.open-popup-icon').on('click', () =>{
  hideControls();
  $(wrapConClass).fadeToggle();
});

$(document).click((e) => {
  const $target = $(e.target);
  if(!$target.closest('.open-popup-icon').length &&
    !$target.closest('.wrap-control-meet .control-show-pop').length &&
    $(wrapConClass).is(':visible')) {

    $(wrapConClass).fadeOut();
  }
});
$(document).on('keydown', '#msg', function(e) {
  if (e.which === 13 && ! e.shiftKey) {
    e.preventDefault();
    $(msgForm).find('button.text-secondary').trigger('click');
    $(this).css('height', '35px');
  }
}).on('input', '#msg', function(e) {
  $(this).css('height', '5px');
  $(this).css('height', `${this.scrollHeight}px`);
});