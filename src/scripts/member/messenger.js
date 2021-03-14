import moment from 'moment';
import axios from 'axios';
import '../global/chat-utils'

const Messenger = (() => {
  const callTimeout = 10000
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
  const callTextCaller = 'Cuộc gọi đi'
  const callTextReceiver = 'Cuộc gọi đến'
  const classCallOut = 'call-msg call-outgoing'
  const classCallCome = 'call-msg call-incoming'
  const classCallMissed = 'call-msg call-missed'

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
        createCallMsgLocal(friendIdChatting, window.escapeHtml(inputMsg.value), '', true)

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
      window.isRefuseCall = true
      window.window.socket.emit('msg-refuseCall', {
        callerId: window.callerId,
        receiverId: meId
      })

      // set IU
      $(classPoHasCall).addClass('d-none')
      window.isCall = false
      window.timeStartCall = undefined
      // create msg end call local
      createCallMsgLocal(window.callerId, callMissText, classCallMissed)
    })

    // close popup miss call
    $('.popup-has-call .close-popup').on('click', () => {
      $('.wrap-pop-has-call').removeClass('miss-call')
      $('.popup-has-call').addClass('d-none')
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
          createCallMsgLocal(window.receiverId, callTextCaller, classCallOut, true, true)
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
          createCallMsgLocal(window.callerId, callTextReceiver, classCallCome, true)
        } else {
          window.outputErrorMessage(error)
        }
      }
      window.focus()
    })

    $(window).on('disconnectCall', () => {
      clearTimeout(window.timeoutCallId)
      window.windowCall = undefined
      window.isCall = false
      window.timeStartCall = undefined
      $(classOvCalling).addClass('d-none')
      window.focus()

      if (window.sendSignalCallDone) {
        window.sendSignalCallDone = false
        // send signal call timeout to server => receiver
        window.socket.emit('msg-callTimeout', {
          callerId: meId,
          receiverId: friendIdChatting
        })

        createCallMsgLocal(window.receiverId, callTextCaller, classCallOut)
      }
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
    window.socket.on('msg-hasCallAudio', ({ signal, callerId, callerName, callerAvatar }) => {
      window.signalOffer = signal // signal offer
      window.callerId = callerId
      window.timeStartCall = new Date()
      window.isRefuseCall = false

      // set IU
      const $popup = $(classPoHasCall)
      $popup.find('.wrap-pop-has-call').removeClass('miss-call')
      $popup.find('.caller-img').attr('src', callerAvatar)
      $popup.find('.text-name-call').html(`${ callerName } đang gọi cho bạn`)
      $popup.find('.text-miss-call-sub').html(`
        <h4>Bạn đã bõ lỡ cuộc gọi của ${ callerName }</h4>
        <p class="text-secondary">Nhấn gọi lại để gọi lại cho  ${ callerName }</p>
      `)
      $popup.removeClass('d-none')
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
      window.timeStartCall = new Date()
      window.windowCall.dispatchEvent(new CustomEvent('isCalling'))
      window.sendSignalCallDone = true
      window.timeoutCallId = setTimeout(() => {
        // call timeout
        window.sendSignalCallDone = false
        window.isCall = false
        window.timeStartCall = undefined
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
        createCallMsgLocal(window.receiverId, callTextCaller, classCallOut, true)
      }, callTimeout);
    })

    // receive signal refuse call
    window.socket.on('msg-receiverRefuseCall', () => {
      if (window.windowCall) {
        clearTimeout(window.timeoutCallId)
        window.sendSignalCallDone = false
        window.isCall = false
        window.timeStartCall = undefined
        window.windowCall.close()
        window.windowCall = undefined
        window.focus()

        // set UI
        $(classOvCalling).addClass('d-none')
        window.outputInfoMessage('Không trả lời')

        // create msg end call local
        createCallMsgLocal(window.receiverId, callTextCaller, classCallOut, true)
      }
    })

    // receive signal miss call from server (caller)
    window.socket.on('msg-missedCall', ({ callerId }) => {
      if (!window.isRefuseCall) {
        const $popup = $(classPoHasCall)
        $popup.find('.wrap-pop-has-call').addClass('miss-call')
        $popup.find(idBtnCallBack).attr('data-callerid', callerId)

        createCallMsgLocal(callerId, callMissText, classCallMissed)
      }
    })

    // receive signal end call from server (it self end call)
    window.socket.on('msg-endCall', ({ callerId, receiverId, sender }) => {
      window.isCall = false
      window.outputInfoMessage('Cuộc gọi kết thúc')
      if (sender === 'caller') {
        // computer of receiver
        window.windowReceive = undefined
        createCallMsgLocal(callerId, callTextReceiver, classCallCome, true)
      } else if (sender === 'receiver') {
        // computer of caller
        window.sendSignalCallDone = false
        window.windowCall = undefined
        createCallMsgLocal(receiverId, callTextCaller, classCallOut, true, true)
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
   * Function create and append call message to local
   * @param {string} friendId friend id
   * @param {string} msg message
   * @param {string} className class name
   * @param {boolean} isCallEnd isCallEnd
   * @param {boolean} me is me
   */
  function createCallMsgLocal(friendId, msg = '', className = '', isCallEnd = false, me = false) {
    const $friItem = $(`.friend-item[data-id="${friendId}"]`);
    let time = moment().format('H:mm')
    let timeCall = null
    if (isCallEnd && window.timeStartCall) {
      time = moment(window.timeStartCall).format('H:mm')
      timeCall = `<small class="time-call">${formatDiffTime(window.timeStartCall, new Date())}</small>`
      window.timeStartCall = undefined
    }
    if ($friItem.length) {
      if (me) {
        outputMessage({
          time,
          username: 'Me',
          message: msg,
          className,
          timeCall
        }, true)
        scrollBottomChatBox()
        $friItem.find('.last-msg').html(`
          <small>${ msg }</small><small>1 phút</small>
        `)
      } else {
        outputMessage({
          time,
          username: $friItem.find(classNameFriend).text(),
          message: msg,
          avatar: $friItem.find('img').attr('src'),
          className,
          timeCall
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
      div.className = `message text-right ${msgObj.className}`;
      div.innerHTML = `<small class="message-time">${msgObj.time}</small>
    <div>
      <div class="msg-me">
        <small class="message-content mx-0">${msgObj.message}</small>
        ${ msgObj.timeCall || '' }
      </div>
    <div>`;
    } else {
      div.className = `message ${msgObj.className}`;
      div.innerHTML = `<small class="message-time">${msgObj.time}</small>
      <div>
        <div class="msg">
          <img class="message-avatar" src="${msgObj.avatar}" alt="${msgObj.username}" />
          <small class="message-content">${msgObj.message}</small>
          ${ msgObj.timeCall || '' }
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

  /**
   * Function format diff time
   * @param {Date} start Start time
   * @param {Date} end End time
   * @returns time diff be format
   */
  function formatDiffTime(start, end) {
    const mPass = moment(start)
    const mPresent = moment(end)
    const h = mPresent.diff(mPass, 'hours')
    const m = mPresent.diff(mPass, 'minutes') - h * 60
    const s = mPresent.diff(mPass, 'seconds') - h * 3600 - m * 60

    return `${h ? h + 'h' : ''}${m ? m + 'm' : ''}${(h || m)  && !s ? '' : s + 's'}`
  }
})()

export default Messenger