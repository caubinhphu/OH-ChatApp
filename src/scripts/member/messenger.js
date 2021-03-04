import moment from 'moment';
import '../global/chat-utils'

const Messenger = (() => {
  const chatMain = document.getElementById('main-right-chat-content');
  const msgForm = document.sendMsgForm; // form chat

  scrollBottomChatBox()

  if (msgForm) {
    const classScBottom = '.scroll-bottom'

    // event submit form chat
    msgForm.addEventListener('submit', (e) => {
      // stop submit form
      e.preventDefault();

      // input message
      const inputMsg = e.target.elements.message;

      if (inputMsg.value !== '') {
        // send message to server
        socket.emit('msg-messageChat', {
          message: inputMsg.value,
          token: e.target.elements._token.value,
        });

        // create message obj to show in client
        const msgObj = {
          time: moment().format('H:mm'),
          username: 'Me',
          message: escapeHtml(inputMsg.value),
        };
        outputMessage(msgObj, true)
        const friendId = $('#main-right').attr('data-id')
        $(`.friend-item[data-id="${friendId}"]`).find('.last-msg').html(
          `<small>Bạn: ${msgObj.message}</small><small>1 phút</small>`
        )

        // scroll bottom
        chatMain.scrollTop = chatMain.scrollHeight;

        // set value for input message
        inputMsg.value = '';

        // focus input message
        inputMsg.focus();
      }
    });

    // change height form input msg
    $(document).on('keydown', '#msg', function(e) {
      if (e.which === 13 && ! e.shiftKey) {
        e.preventDefault();
        $(msgForm).find('button.text-secondary').trigger('click');
        $(this).css('height', '35px');
      }
    }).on('input', '#msg', function(e) {
      $(this).css('height', '5px');
      $(this).css('height', `${this.scrollHeight}px`);
    }).on('focus', '#msg', function(e) {
      $(this).parents('.wrap-msg-box').addClass('is-focus');
    }).on('blur', '#msg', function(e) {
      $(this).parents('.wrap-msg-box').removeClass('is-focus');
    });

    $('#main-right-chat-content').on('scroll', function() {
      if (this.scrollHeight - this.scrollTop >= this.clientHeight + 200) {
        $(classScBottom).addClass('is-show');
      } else {
        $(classScBottom).removeClass('is-show');
      }
    });

    $(classScBottom).on('click', scrollBottomChatBox);
  }

  // receive msg obj from server
  socket.on('msg-messenger', ({senderId, msg: msgObj}) => {
    const friendId = $('#main-right').attr('data-id')
    if (friendId === senderId) {
      // output message
      outputMessage(msgObj);

      // scroll bottom
      chatMain.scrollTop = chatMain.scrollHeight;
    }
    $(`.friend-item[data-id="${senderId}"]`).find('.last-msg').html(
      `<small>${msgObj.message}</small><small>1 phút</small>`
    )
  });

  socket.on('msg-friendOnline', ({ memberId }) => {
    // console.log('online', memberId);
    $(`.friend-item[data-id="${memberId}"]`).addClass('is-online')
    const $mainChat = $(`#main-right[data-id="${memberId}"]`)
    if ($mainChat.length) {
      $mainChat.find('.text-status').html('<strong class="text-success">Đang hoạt động</strong>')
    }
  })

  socket.on('msg-friendOffline', ({ memberId }) => {
    $(`.friend-item[data-id="${memberId}"]`).removeClass('is-online')
    const $mainChat = $(`#main-right[data-id="${memberId}"]`)
    if ($mainChat.length) {
      $mainChat.find('.text-status').html('<strong class="text-secondary">Đang không hoạt động</strong>')
    }
  })


  // output message in main chat area
  function outputMessage(msgObj, me = false) {
    const div = document.createElement('div');
    if (me) {
      div.className = 'message text-right';
      div.innerHTML = `<small class="message-time">${msgObj.time}</small>
    <div>
      <div class="msg-me">
        <small class="message-content mx-0">${msgObj.message}</small>
      </div>
    <div>`;
    } else {
      div.className = 'message';
      div.innerHTML = `<small class="message-time">${msgObj.time}</small>
      <div>
        <div class="msg">
          <img class="message-avatar" src="${msgObj.avatar}" alt="${msgObj.username}" />
          <small class="message-content">${msgObj.message}</small>
        </div>
      </div>`;
    }

    // append message
    chatMain.appendChild(div);
  }

  function scrollBottomChatBox() {
    const $ele = $('#main-right-chat-content');
    $ele.animate({scrollTop: $ele[0].scrollHeight - $ele.innerHeight()}, 350, 'swing');
  }
})()

export default Messenger