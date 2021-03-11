import moment from 'moment';
import axios from 'axios';
// import SimplePeer from 'simple-peer'
import '../global/chat-utils'

const Messenger = (() => {
  const chatMain = document.getElementById('main-right-chat-content');
  const msgForm = document.sendMsgForm; // form chat
  let hasMessenger = true // has old msg
  let currentPageChat = 0 // current page load old chat

  const classScBottom = '.scroll-bottom'
  const idBtnCallBack = '#btn-call-back'
  const classPoHasCall = '.popup-has-call'
  const classCallOK = '#btn-call-ok'
  const classCallNotOK = '#btn-call-not-ok'
  const classNameFriend = '.friend-item-info strong'
  const classOvCalling = '.overlay-calling'

  const callMissText = 'Cuộc gọi nhỡ'
  const callText = 'Cuộc gọi thoại'

  // scroll bottom
  chatMain.scrollTop = chatMain.scrollHeight;

  if (msgForm) {
    const friendIdChatting = $('#main-right').attr('data-id')
    const meId = $('#member-id').text()


    // event submit form chat
    msgForm.addEventListener('submit', (e) => {
      // stop submit form
      e.preventDefault();

      // input message
      const inputMsg = e.target.elements.message;

      if (inputMsg.value !== '') {
        // send message to server
        window.window.socket.emit('msg-messageChat', {
          message: inputMsg.value,
          token: e.target.elements._token.value,
        });

        // create message obj to show in client
        createMsgLocal(friendIdChatting, window.escapeHtml(inputMsg.value), true)

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
    }).on('input', '#msg', function() {
      $(this).css('height', '5px');
      $(this).css('height', `${this.scrollHeight}px`);
    }).on('focus', '#msg', function() {
      $(this).parents('.wrap-msg-box').addClass('is-focus');
    }).on('blur', '#msg', function() {
      $(this).parents('.wrap-msg-box').removeClass('is-focus');
    });

    // handle scroll box chat: load old msg, scroll to bottom
    $('#main-right-chat-content').on('scroll', async function() {
      if (this.scrollTop === 0 && hasMessenger === true) {
        $('.wrap-loader-chat').removeClass('d-none')
        try {
          const responsive = await axios.get(`/messenger/chatold/?friendid=${friendIdChatting}&page=${currentPageChat + 1}`);
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

          // prepend msg list and hold position scroll top of chat box
          const curScrollPos = this.scrollTop;
          const oldScroll = this.scrollHeight - this.clientHeight;
          $(this).prepend(htmlMsgs)
          const newScroll = this.scrollHeight - this.clientHeight;
          this.scrollTop = curScrollPos + (newScroll - oldScroll);
        } catch (error) {
          window.outputErrorMessage(error.message)
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
    $('#call-friend-btn').on('click', () => { callFriend(friendIdChatting) })

    $(idBtnCallBack).on('click', function() {
      callFriend($(this).attr('data-callerid'))

      // set IU
      $(classPoHasCall).addClass('d-none')
    })

    // accept call from receiver
    $(classCallOK).on('click', () => {
      // set is call local is true => focus sub window when click call btn
      window.isCall = true

      // open sub window receiver
      const h = $(window).height()
      const w = $(window).width() < 1200 ? $(window).width() : 1200
      const x = ($(window).width() - w) / 2
      const windowReceive = window.open(`/messenger/chat-media/${window.callerId}`, 'OH-Chat', `height=${h},width=${w},left=${x},top=${0}`);

      // focus sub window and set global var for sub window
      if (window.focus) {
        windowReceive.focus();
        windowReceive.typeClient = 'receiver'
        windowReceive.typeCall = 'audio'
        windowReceive.signalOffer = window.signalOffer // signal offer
        windowReceive.parentWindow = window // to dispatch event
      }
      window.windowReceive = windowReceive // to dispatch event

      // set IU
      $(classPoHasCall).addClass('d-none')
    });

    // no accept call from receiver
    $(classCallNotOK).on('click', () => {
      // send signal refuse call to caller
      window.window.socket.emit('msg-refuseCall', {
        callerId: window.callerId,
        receiverId: meId
      })

      // set IU
      $(classPoHasCall).addClass('d-none')
      window.isCall = false
      // create msg end call local
      createMsgLocal(window.callerId, callMissText)
    })

    // receive signal offer from sub window call => send to server => receiver
    $(window).on('signalOffer', (e) => {
      const { signalOffer } = e.detail
      window.socket.emit('msg-offerStream', {
        receiverId: friendIdChatting,
        callerId: meId,
        signal: signalOffer
      });
    })

    // receive signal offer from sub window receiver => send to server => caller
    $(window).on('signalAnswer', (e) => {
      const { signalAnswer } = e.detail
      window.socket.emit('msg-answerStream', {
        signal: signalAnswer,
        callerId: window.callerId,
        receiverId: meId
      });
    })

    // receive signal error from sub window => send to server
    $(window).on('connectPeerFail', (e) => {
      const { code, error } = e.detail
      window.isCall = false
      if (window.windowCall) {
        // computer of caller
        // close sub window
        window.windowCall.close()
        window.windowCall = undefined

        // send to server => send to receiver => end call
        // receiver end call => caller on event end call but receiver not on event self end call => send again to receiver
        window.socket.emit('msg-connectPeerFail', {
          callerId: meId,
          receiverId: window.receiverId,
          code,
          sender: 'caller'
        });

        if (code === 'ERR_DATA_CHANNEL') {
          // peer fail for end call signal
          window.outputInfoMessage(error)

          // create msg local
          createMsgLocal(window.receiverId, callText, true)
        } else {
          // connect peer fail
          window.outputErrorMessage(error)
        }
      } else if (window.windowReceive) {
        // computer of receiver
        // close sub window
        window.windowReceive.close()
        window.windowReceive = undefined

        // send to server => send to caller => end call
        // caller end call => receiver on event end call but caller not on event self end call => send again to caller
        window.socket.emit('msg-connectPeerFail', {
          callerId: window.callerId,
          receiverId: meId,
          code,
          sender: 'receiver'
        });

        if (code === 'ERR_DATA_CHANNEL') {
          // peer fail for end call signal
          window.outputInfoMessage(error)

          // create msg local
          createMsgLocal(window.callerId, callText)
        } else {
          window.outputErrorMessage(error)
        }
      }
      window.focus()
    })

    // receive msg obj from server
    window.socket.on('msg-messenger', ({senderId, msg: msgObj}) => {
      if (friendIdChatting === senderId) {
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
    window.socket.on('msg-friendOnline', ({ memberId }) => {
      $(`.friend-item[data-id="${memberId}"]`).addClass('is-online')
      const $mainChat = $(`#main-right[data-id="${memberId}"]`)
      if ($mainChat.length) {
        $mainChat.find('.text-status').html('<strong class="text-success">Đang hoạt động</strong>')
      }
    })

    // receive signal friend is offline
    window.socket.on('msg-friendOffline', ({ memberId }) => {
      $(`.friend-item[data-id="${memberId}"]`).removeClass('is-online')
      const $mainChat = $(`#main-right[data-id="${memberId}"]`)
      if ($mainChat.length) {
        $mainChat.find('.text-status').html('<strong class="text-secondary">Đang không hoạt động</strong>')
      }
    })

    // receive signal has call from friend
    window.socket.on('msg-hasCallAudio', ({ signal, callerId }) => {
      window.signalOffer = signal // signal offer
      window.callerId = callerId

      // set IU
      const $popup = $(classPoHasCall)
      if ($popup.hasClass('d-none')) {
        $(classPoHasCall).removeClass('d-none')
      } else {
        $popup.find('.text-call-info').html('Cuộc gọi đến')
        $popup.find('.text-call-sub').html(`
          <p>Name đang gọi cho bạn</p>
          <p>Cuộc gọi sẽ bắt đầu ngay sau khi bạn chấp nhận</p>
        `)
        $popup.find(classCallNotOK).removeClass('d-none')
        $popup.find(classCallOK).removeClass('d-none')
        $popup.find(idBtnCallBack).addClass('d-none')
      }
    })

    // receive signal answer
    window.socket.on('msg-answerSignal', ({ signal }) => {
      // send signal answer to sub window
      clearTimeout(window.timeoutCallId)
      const event = new CustomEvent('signalAnswer', {
        detail: { signalAnswer: signal }
      });
      window.windowCall.dispatchEvent(event)
      $(classOvCalling).addClass('d-none')
    })

    // receive signal call error
    window.socket.on('msg-callError', ({msg}) => {
      window.isCall = false
      window.windowCall.close()
      window.windowCall = undefined
      window.focus()
      $(classOvCalling).addClass('d-none')
      window.outputErrorMessage(msg)
    })

    // receive signal send signal call to receiver done
    window.socket.on('msg-doneSendSignalCall', ({ callerId, receiverId }) => {
      window.windowCall.dispatchEvent(new CustomEvent('isCalling'))
      window.timeoutCallId = setTimeout(() => {
        // call timeout
        window.isCall = false
        window.windowCall.close()
        window.windowCall = undefined
        window.focus()
        $(classOvCalling).addClass('d-none')

        // send signal call timeout to server => receiver
        window.socket.emit('msg-callTimeout', {
          callerId,
          receiverId
        })

        window.outputInfoMessage('Không trả lời')
        createMsgLocal(window.receiverId, callText, true)
      }, 5000);
    })

    // receive signal refuse call
    window.socket.on('msg-receiverRefuseCall', () => {
      if (window.windowCall) {
        window.isCall = false
        window.windowCall.close()
        window.windowCall = undefined
        window.focus()

        // set UI
        $(classOvCalling).addClass('d-none')
        window.outputInfoMessage('Không trả lời')

        // create msg end call local
        createMsgLocal(window.receiverId, callText, true)
      }
    })

    // receive signal miss call from server (caller)
    window.socket.on('msg-missedCall', ({ callerId }) => {
      const $popup = $(classPoHasCall)
      $popup.find('.text-call-info').html(callMissText)
      $popup.find('.text-call-sub').html(`
        <p>Bạn đã bỡ lỡ cuộc gọi của name</p>
        <p>Nhấn gọi lại để gọi lại cho name</p>
      `)
      $popup.find(classCallNotOK).addClass('d-none')
      $popup.find(classCallOK).addClass('d-none')
      $popup.find(idBtnCallBack).removeClass('d-none')
      $popup.find(idBtnCallBack).attr('data-callerid', callerId)

      createMsgLocal(callerId, callMissText)
    })

    // receive signal end call from server (it self end call)
    window.socket.on('msg-endCall', ({ callerId, receiverId, sender }) => {
      window.isCall = false
      window.outputInfoMessage('Ngắt kết nối')
      if (sender === 'caller') {
        // computer of receiver
        window.windowReceive = undefined
        createMsgLocal(callerId, callText)
      } else if (sender === 'receiver') {
        // computer of caller
        window.windowCall = undefined
        createMsgLocal(receiverId, callText, true)
      }
    })
  }

  // close sub window when close or refetch browser
  window.onbeforeunload = function() {
    if (window.windowCall) {
      window.windowCall.close()
    } else if (window.windowReceive) {
      window.windowReceive.close()
    }
  }

  /**
   * Function create and append message to local
   * @param {string} friendId friend id
   * @param {string} msg message
   * @param {boolean} me is me
   */
  function createMsgLocal(friendId, msg = '', me = false) {
    const $friItem = $(`.friend-item[data-id="${friendId}"]`);
    if ($friItem.length) {
      if (me) {
        outputMessage({
          time: moment().format('H:mm'),
          username: 'Me',
          message: msg
        }, true)
        scrollBottomChatBox()
        $friItem.find('.last-msg').html(`
          <small>${ msg }</small><small>1 phút</small>
        `)
      } else {
        outputMessage({
          time: moment().format('H:mm'),
          username: $friItem.find(classNameFriend).text(),
          message: msg,
          avatar: $friItem.find('img').attr('src')
        })
        scrollBottomChatBox()
        $friItem.find('.last-msg').html(`
          <small>${ msg }</small><small>1 phút</small>
        `)
      }
    }
  }

  /**
   * function call to friend by friend id
   * @param {string} friendId friend id to call
   */
  function callFriend(friendId) {
    if (!window.isCall) {
      window.isCall = true

      window.receiverId = friendId

      $(classOvCalling).removeClass('d-none')
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
  }

  /**
   * Function output message in main chat area
   * @param {Object} msgObj message object { time, message, avatar, username }
   * @param {boolean} me is me
   */
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

  /**
   * Function scroll to bottom chat box
   */
  function scrollBottomChatBox() {
    const $ele = $('#main-right-chat-content');
    $ele.animate({scrollTop: $ele[0].scrollHeight - $ele.innerHeight()}, 350, 'swing');
  }
})()

export default Messenger