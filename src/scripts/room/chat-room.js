const ChatRoom = (() => {
  const msgForm = document.sendMsgForm; // form chat
  const roomName = document.getElementById('room-info-name-room'); // room name
  const participants = document.getElementById('room-users'); // participants area

  // receive info change status room (management of host) from server
  socket.on('changeStatusRoom', ({ key, value }) => {
    if (key === 'allowChat') {
      outputChatInput(value);
    } else if (key === 'allowRec') {
      window.outputAllowRec(value)
    } else if (key === 'allowShare') {
      window.outputAllowShare(value)
    } else if (key === 'allowMic') {
      window.outputAllowMic(value)
    } else if (key === 'allowVideo') {
      window.outputAllowVideo(value)
    }
  });

  // receive info change status room (management of host) from server
  socket.on('changeAllowCommunication', ({ isAllow }) => {
    outputChatInput(isAllow);
    window.outputAllowRec(isAllow)
    window.outputAllowShare(isAllow)
    window.outputAllowMic(isAllow)
    window.outputAllowVideo(isAllow)

  });

  // receive room info from server
  socket.on('roomInfo', (roomInfo) => {
    outputRoomInfo(roomInfo, socket.id);
  });

  // receive room info users from server
  socket.on('roomInfoUsers', (roomInfo) => {
    outputRoomInfoUsers(roomInfo, socket.id);
  });

  // receive message from server when leave all
  socket.on('leaveAllComplete', (msg) => {
    window.notConfirmClose = true
    if (msg === 'OK') {
      outputLeaveRoom(
        'Chủ phòng đã kết thúc phòng họp, quay lại trang chủ'
      );
      fiveSecond();
    } else {
      location.reload();
    }
  });

  // receive message kicked out the room
  socket.on('kickedOutRoom', (msg) => {
    window.notConfirmClose = true
    if (msg === 'OK') {
      outputLeaveRoom('Chủ phòng đã đá bạn ra khỏi phòng!');
      fiveSecond();
    }
  });

  // output chat input if allowed
  function outputChatInput(allowed) {
    if (allowed) {
      // allow chat
      msgForm.innerHTML = `
      <label class="btn btn-default send-file m-0 p-2" for="send-file" title="Chọn tệp">
        <span class="icomoon icon-insert_drive_file"></span>
      </label>
      <input class="d-none" id="send-file" type="file" name="file" multiple="multiple">
      <button type="button" class="btn btn-default open-emojis" title="Biểu tượng cảm xúc">&#128512;</button>
      <div class="flex-fill wrap-msg-box ps-rv">
        <textarea class="form-control" id="msg" type="text" name="message" placeholder="Nhập tin nhắn" autocomplete="off"></textarea>
      </div>
      <button class="btn btn-default text-secondary" title="Gửi"><span class="icomoon icon-send"></span></button>`;

      $('.dragzone').removeClass('unable-chat')
    } else {
      // not allow chat
      msgForm.innerHTML = `<div class="chat-disabled-text">Nhắn tin bị cấm bởi chủ phòng</div>`;
      $('.dragzone').addClass('unable-chat')
    }
  }

  // output room info
  function outputRoomInfo(roomInfo, socketId) {
    // console.log(roomInfo, socketId);
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
        if (user1.host) return -1;
        if (user2.host) return 1;
        return user1.name.localeCompare(user2.name, 'en', {
          sensitivity: 'base',
        });
      })
      .map((user) => {
        return `<div class="room-user p-2 d-flex justify-content-between ps-rv" data-id="${user.socketId}">
        <div class="pr-3">
          <img class="room-user-avatar" src="${user.avatar}" alt="u" />
          <span class="room-user-name ml-2">
            ${user.name}
            ${user.socketId === socketId ? ' (Bạn)' : ''}
            ${user.host ? ' (Chủ phòng)' : ''}
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
      </div>`;
      })
      .join('');
  }

  // output leave room all modal
  function outputLeaveRoom(msg) {
    document.querySelector(
      '#meeting-area'
    ).innerHTML = `<div id="leave-room-modal">
    <div class="d-flex justify-content-center align-items-center" id="leave-modal">
        <div id="leave-modal-main"><span>${msg}</span>
            <div class="text-right">
              <a class="btn btn-primary mt-2" id="leave-btn" href="/" role="button">OK </a>
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
      location.href = '/';
    }, 5000);
  }


})()

export default ChatRoom