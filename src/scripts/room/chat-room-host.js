const ChatRoomHost = (() => {
  const waitingRoomArea = document.getElementById('waiting-room');
  const waitingRoomUsers = document.getElementById('waiting-room-users');
  const allowJoinBtn = document.getElementById('allow-join-btn');
  const noAllowJoinBtn = document.getElementById('no-allow-join-btn');
  const kickUserBtn = document.getElementById('confirm-kick-user-btn');
  const roomName = document.getElementById('room-info-name-room'); // room name
  const participants = document.getElementById('room-users'); // participants area
  // const meetingMain = document.getElementById('#meeting-show'); // meeting show area

  // receive password of room from server
  // socket.on('sendPasswordRoom', (password) => {
  //   document.querySelector('#room-info-password-room').innerHTML = `${password}`;
  // });

  const token = sessionStorage.getItem('token') || ''

  const reqRoomSound = new Audio('/sounds/req-join.mp3')

  $('.export-users-link').attr('href', `/export-users/?token=${token}`)

  // receive room manager info from server
  socket.on('roomManager', (manager) => {
    outputRoomManager(manager);
  });

  // receive message from server when leave all for host
  socket.on('leaveAllCompleteForHost', (msg) => {
    window.notConfirmClose = true
    if (msg === 'OK') {
      location.href = '/';
    } else {
      location.reload();
    }
  });

  // receive event change waiting room from server
  socket.on('changeWaitingRoom', ({
    waitingRoom
  }) => {
    outputWaitingRoom(waitingRoom);
  });

  // receive room info from server
  socket.on('roomInfo', (roomInfo) => {
    outputRoomInfo(roomInfo, socket.id);
  });

  // receive room info users from server
  socket.on('roomInfoUsers', (roomInfo) => {
    outputRoomInfoUsers(roomInfo, socket.id);
  });

  // event change management
  document.getElementsByName('management').forEach((checkbox) => {
    checkbox.addEventListener('change', function () {
      socket.emit('changeManagement', {
        value: this.value,
        status: this.checked,
        token
      });
    });
  });

  // disconnect for all
  document
    .querySelector('#disconnect-all-btn')
    .addEventListener('click', function () {
      socket.emit('disconnectRequest', {
        typeLeave: 'all',
        token
      });
      showLoader()
    });

  // output waiting room
  function outputWaitingRoom(waitingRoom) {
    if (waitingRoom.length > 0) {
      waitingRoomUsers.innerHTML = waitingRoom
        .map((user) => {
          return `<div class="waiting-room-user p-2 d-flex justify-content-between">
          <div>
            <img class="waiting-room-user-avatar" src="${user.avatar}" alt="u" />
            <span class="waiting-room-user-name ml-2">${user.name}</span>
          </div>
          <div>
            <button class="btn btn-default btn-sm text-success waiting-room-allow-btn" title="Cho phép"
              data-toggle="modal" data-target="#confirm-join-room-modal" data-id="${user.id}">
                <span class="icomoon icon-check-circle-o"></span>
            </button>
            <button class="btn btn-default btn-sm text-danger waiting-room-not-allow-btn" title="Không cho phép"
              data-toggle="modal" data-target="#confirm-no-join-room-modal" data-id="${user.id}">
                <span class="icomoon icon-times-circle-o"></span>
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

      reqRoomSound.play()
      // set un-read
      if (!$('#users-area').hasClass('is-active')) {
        $('.control-show-pop[data-control="user"]').addClass('has-unread');
        if ($(window).width() < 768) {
          $('.open-popup-icon').addClass('has-unread');
        }
      }
    } else {
      waitingRoomUsers.innerHTML = '';
      waitingRoomArea.style.display = 'none';
    }
  }

  allowJoinBtn.addEventListener('click', function () {
    socket.emit('allowJoinRoom', {
      userId: this.dataset.id,
      token
    });
  });

  noAllowJoinBtn.addEventListener('click', function () {
    socket.emit('notAllowJoinRoom', {
      userId: this.dataset.id,
      token
    });
  });

  $('.users-mana-sub').on('click', function() {
    if (!$(this).hasClass('is-active')) {
      $(this).addClass('is-active')
      $('.user-m-sub-box').removeClass('d-none')
    } else {
      $(this).removeClass('is-active')
      $('.user-m-sub-box').addClass('d-none')
    }
  })

  $(document).on('click', (e) => {
    if (!$(e.target).closest('.user-m-sub-box').length && !$(e.target).closest('.users-mana-sub').length) {
      $('.users-mana-sub').removeClass('is-active')
      $('.user-m-sub-box').addClass('d-none')
    }
  })

  // output room info
  function outputRoomInfo(roomInfo, socketId) {
    // room name, password and input copy
    roomName.innerHTML = roomInfo.nameRoom;
    $('#room-info-password-room').html(roomInfo.password);
    $('#link-info').val(`${location.origin}/meeting/?room=${roomInfo.nameRoom}&pass=${roomInfo.password}`);

    // amount participants
    $('.amount-participants').html(`(${roomInfo.users.length})`);
    outputRoomInfoUsers(roomInfo, socketId)
  }

  function outputRoomInfoUsers(roomInfo, socketId) {
    // participants
    participants.innerHTML = roomInfo.users
    .sort((user1, user2) => {
      if (user1.socketId === socketId) return -1;
      if (user2.socketId === socketId) return 1;
      if (user1.raiseHand) return -1
      if (user2.raiseHand) return 1
      return user1.name.localeCompare(user2.name, 'en', {
        sensitivity: 'base',
      });
    })
    .map((user) => {
      return `<div class="room-user p-2 d-flex justify-content-between ps-rv room-user-host" data-id="${user.socketId}">
      <div class="pr-3">
        <img class="room-user-avatar" src="${user.avatar}" alt="u" />
        <span class="room-user-name ml-2">
          ${user.name}
          ${user.socketId === socketId ? ' (Bạn)(Chủ phòng)' : ''}
        </span>
      </div>
      <div class="raise-hand ${user.raiseHand ? '' : 'd-none'}">
        <span class="icomoon icon-hand"></span>
      </div>
      <div class="mic-frequency">
        <span class="icomoon icon-mic_off text-danger"></span>
        <div class="wrap-frequency">
          <div class="d-flex align-items-end">
            <div class="frequency"></div>
            <div class="frequency"></div>
            <div class="frequency"></div>
          </div>
        </div>
      </div>
      ${user.socketId !== socketId ? outputKickBtn(user.id, user.allowCommunication) : ''}
    </div>`;
    })
    .join('');

    [...document.getElementsByClassName('kick-user-btn')].forEach((btn) => {
      btn.addEventListener('click', function () {
        kickUserBtn.dataset.id = this.dataset.id;
      });
    });

    [...document.getElementsByClassName('toggle-communicate')].forEach((btn) => {
      btn.addEventListener('click', function () {
        if ($(this).hasClass('is-allow')) {
          $(this).removeClass('is-allow')
          this.title = 'Cho phép giao tiếp'
          // console.log(this.dataset.id);
          window.socket.emit('toggleAllowCommunication', {
            userId: this.dataset.id,
            isAllow: false
          })
        } else {
          $(this).addClass('is-allow')
          this.title = 'Chặn giao tiếp'
          window.socket.emit('toggleAllowCommunication', {
            userId: this.dataset.id,
            isAllow: true
          })
        }
      });
    });
  }

  function outputKickBtn(userId, allowCommunication) {
    return `<div class="wrap-kick-user d-flex">
    <button class="btn btn-default btn-sm toggle-communicate mr-2 ${allowCommunication ? 'is-allow' : ''}"
      title="${allowCommunication ? 'Chặn giao tiếp' : 'Cho phép giao tiếp'}" data-id="${userId}"
    >
      <span class="icomoon icon-sms_failed"></span>
    </button>
    <button class="btn btn-default btn-sm text-danger kick-user-btn" title="Kick khỏi phòng" data-toggle="modal"
      data-target="#confirm-kick-user-modal" data-id="${userId}">
        <span class="icomoon icon-times-circle-o"></span>
    </button>
  </div>`;
  }

  kickUserBtn.addEventListener('click', function () {
    // emit kick user in the room
    socket.emit('disconnectRequest', {
      typeLeave: 'kicked',
      userId: this.dataset.id,
      token
    });
  });

  function outputRoomManager(manager) {
    if (!manager.allowChat) {
      document.getElementById('management-turnoff-chat').checked = true;
    }
    if (!manager.allowMic) {
      document.getElementById('management-turnoff-mic').checked = true;
    }
    if (!manager.allowVideo) {
      document.getElementById('management-turnoff-video').checked = true;
    }
    if (!manager.allowShare) {
      document.getElementById('management-turnoff-share').checked = true;
    }
    if (!manager.allowRec) {
      document.getElementById('management-turnoff-rec').checked = true;
    }
    const ids = {
      open: 'management-open-room',
      locked: 'management-lock-room',
      waiting: 'management-waiting-room',
    };
    document.getElementById(ids[manager.state]).checked = true;
  }
})()

export default ChatRoomHost