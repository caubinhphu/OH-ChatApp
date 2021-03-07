import moment from 'moment';
import axios from 'axios';
// import SimplePeer from 'simple-peer'
import '../global/chat-utils'

const Messenger = (() => {
  const chatMain = document.getElementById('main-right-chat-content');
  const msgForm = document.sendMsgForm; // form chat
  let hasMessenger = true
  let currentPageChat = 0

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

    // handle scroll box chat: load old msg, scroll to bottom
    $('#main-right-chat-content').on('scroll', async function() {
      if (this.scrollTop === 0 && hasMessenger === true) {
        $('.wrap-loader-chat').removeClass('d-none')
        try {
          const friendId = $('#main-right').attr('data-id')
          const responsive = await axios.get(`/messenger/chatold/?friendid=${friendId}&page=${currentPageChat + 1}`);
          const { messages, hasMsg } = responsive.data;
          $('.wrap-loader-chat').addClass('d-none')
          currentPageChat++
          hasMessenger = hasMsg
          const htmlMsgs = messages.map(msg => {
            if (msg.me) {
              return `
                <div class="message text-right">
                  <small class="message-time">${msg.time}</small>
                  <div>
                    <div class="msg-me">
                      <small class="message-content mx-0">${msg.content}</small>
                    </div>
                  </div>
                </div>`
            }
            return `
              <div class="message">
                <small class="message-time">${msg.time}</small>
                <div>
                  <div class="msg">
                    <img class="message-avatar" src="${msg.avatar}" alt="${msg.name}">
                    <small class="message-content">${msg.content}</small>
                  </div>
                </div>
              </div>`
          }).join('')

          // prepend msg list
          const curScrollPos = this.scrollTop;
          const oldScroll = this.scrollHeight - this.clientHeight;
          $(this).prepend(htmlMsgs)
          const newScroll = this.scrollHeight - this.clientHeight;
          this.scrollTop = curScrollPos + (newScroll - oldScroll);
          console.log(messages);
        } catch (error) {
          console.error(error);
        }
      } else if (this.scrollHeight - this.scrollTop >= this.clientHeight + 200) {
        $(classScBottom).addClass('is-show');
      } else {
        $(classScBottom).removeClass('is-show');
      }
    });

    // scroll to bottom chat box
    $(classScBottom).on('click', scrollBottomChatBox);

    // call audio to friend
    $('#call-friend-btn').on('click', () => {
      if (!window.isCall) {
        window.isCall = true
        $('.overlay-calling').removeClass('d-none')
        const friendId = $('#main-right').attr('data-id')
        // open sub window call
        const h = $(window).height()
        const w = $(window).width() < 1200 ? $(window).width() : 1200
        const x = ($(window).width() - w) / 2
        const windowCall = window.open(`/messenger/chat-media/${friendId}`, 'OH-Chat', `height=${h},width=${w},left=${x},top=${0}`);

        if (window.focus) {
          windowCall.focus();
          windowCall.typeClient = 'caller'
          windowCall.typeCall = 'audio'
          windowCall.parentWindow = window // to dispatch event
        }
        window.windowCall = windowCall // to dispatch event
      } else {
        if (window.windowCall) {
          window.windowCall.focus()
        } else if (window.windowReceive) {
          window.windowReceive.focus()
        }
      }
    })

    // receive signal offer from sub window call => send to server => receiver
    $(window).on('signalOffer', (e) => {
      const { signalOffer } = e.detail
      socket.emit('msg-offerStreamAudio', {
        receiverId: $('#main-right').attr('data-id'),
        callerId: $('#member-id').text(),
        signal: signalOffer
      });
    })

    // receive signal offer from sub window receiver => send to server => caller
    $(window).on('signalAnswer', (e) => {
      console.log('signalAnswer');
      const { signalAnswer } = e.detail
      socket.emit('msg-answerStream', {
        signal: signalAnswer,
        callerId: window.callerId,
        receiverId: $('#member-id').text()
      });
    })

    // receive signal error from sub window => send to server
    $(window).on('connectPeerFail', (e) => {
      console.log(e.detail);
      const { code, error } = e.detail
      if (window.windowCall) {
        window.windowCall.close()
        socket.emit('msg-connectPeerFail', {
          callerId: $('#member-id').text(),
          receiverId: $('#main-right').attr('data-id'),
          code
        });
      } else if (window.windowReceive) {
        window.windowReceive.close()
        socket.emit('msg-connectPeerFail', {
          callerId: window.callerId,
          receiverId: $('#member-id').text(),
          code
        });
      }
      window.focus()
      outputErrorMessage(error)
    })
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

  // receive signal friend is online
  socket.on('msg-friendOnline', ({ memberId }) => {
    // console.log('online', memberId);
    $(`.friend-item[data-id="${memberId}"]`).addClass('is-online')
    const $mainChat = $(`#main-right[data-id="${memberId}"]`)
    if ($mainChat.length) {
      $mainChat.find('.text-status').html('<strong class="text-success">Đang hoạt động</strong>')
    }
  })

  // receive signal friend is offline
  socket.on('msg-friendOffline', ({ memberId }) => {
    $(`.friend-item[data-id="${memberId}"]`).removeClass('is-online')
    const $mainChat = $(`#main-right[data-id="${memberId}"]`)
    if ($mainChat.length) {
      $mainChat.find('.text-status').html('<strong class="text-secondary">Đang không hoạt động</strong>')
    }
  })

  // receive signal has call from friend
  socket.on('msg-hasCallAudio', ({ signal, callerId }) => {
    window.signalOffer = signal
    window.callerId = callerId

    // set IU
    $('.popup-has-call').removeClass('d-none')
  })

  // receive signal answer
  socket.on('msg-answerSignal', ({ signal }) => {
    // send signal answer to sub window
    const event = new CustomEvent('signalAnswer', {
      detail: {
        signalAnswer: signal
      }
    });
    window.windowCall.dispatchEvent(event)
    $('.overlay-calling').addClass('d-none')
  })

  // receive signal call error
  socket.on('msg-callError', ({msg}) => {
    window.windowCall.close()
    window.focus()
    $('.overlay-calling').addClass('d-none')
    window.isCall = false
    outputErrorMessage(msg)
  })

  // accept call from receiver
  $('#btn-call-ok').on('click', () => {
    // open sub window receiver
    const h = $(window).height()
    const w = $(window).width() < 1200 ? $(window).width() : 1200
    const x = ($(window).width() - w) / 2
    const windowReceive = window.open(`/messenger/chat-media/${window.callerId}`, 'OH-Chat', `height=${h},width=${w},left=${x},top=${0}`);

    if (window.focus) {
      windowReceive.focus();
      windowReceive.typeClient = 'receiver'
      windowReceive.typeCall = 'audio'
      windowReceive.signalOffer = window.signalOffer // signal offer
      windowReceive.parentWindow = window // to dispatch event
    }
    window.windowReceive = windowReceive // to dispatch event

    // set IU
    $('.popup-has-call').addClass('d-none')
    window.isCall = true
  });

  window.onbeforeunload = function() {
    if (window.windowCall) {
      window.windowCall.close()
    } else if (window.windowReceive) {
      window.windowReceive.close()
    }
  }

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

  // function scroll to bottom chat box
  function scrollBottomChatBox() {
    const $ele = $('#main-right-chat-content');
    $ele.animate({scrollTop: $ele[0].scrollHeight - $ele.innerHeight()}, 350, 'swing');
  }
})()

export default Messenger