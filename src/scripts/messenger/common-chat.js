import moment from 'moment';
import axios from 'axios';

const CommonChat = (() => {
  const socket = io();
  window.socket = socket


  const oldSearchRes = {}

  socket.emit('msg-memberOnline', { memberId: $('#member-id').text() })

  // receive error message from server when has error
  socket.on('errorMessage', (msg) => {
    window.outputErrorMessage(msg);
  });

  const isPageChat = $('#main.chat-page').length > 0

  const callTimeout = 20000
  const chatMain = document.getElementById('main-right-chat-content');
  const idBtnCallBack = '#btn-call-back'
  const classPoHasCall = '.popup-has-call'
  const classCallOK = '#btn-call-ok'
  const classCallNotOK = '#btn-call-not-ok'
  const classNameFriend = '.friend-item-info strong'
  const classOvCalling = '.overlay-calling'

  const callMissText = 'Cuộc gọi nhỡ'
  const callTextCaller = 'Cuộc gọi đi'
  const callTextReceiver = 'Cuộc gọi đến'
  const classCallOut = ' call-msg call-outgoing'
  const classCallCome = ' call-msg call-incoming'
  const classCallMissed = ' call-msg call-missed'
  const classCallVideo = ' call-video'
  const classCallMissedVideo = ' call-missed-video'
  const msgForm = document.sendMsgForm;

  const meId = $('#member-id').text()

  // is page chat
  if (isPageChat && msgForm) {
    // scroll bottom
    chatMain.scrollTop = chatMain.scrollHeight;

    const friendIdChatting = $('#main-right').attr('data-id')

    // call audio to friend
    $('#call-friend-btn').on('click', () => { callFriend(friendIdChatting) })

    // call audio to friend
    $('#video-friend-btn').on('click', () => { callFriend(friendIdChatting, 'video') })
  }

  $(idBtnCallBack).on('click', function() {
    callFriend($(this).attr('data-callerid'))

    // set IU
    $(classPoHasCall).addClass('d-none')
  })

  // accept call from receiver
  $(classCallOK).on('click', () => {
    if (window.callInComSound) {
      window.callInComSound.pause()
    }
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
      windowReceive.typeCall = window.typeCall
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
    if (window.callInComSound) {
      window.callInComSound.pause()
    }
    window.window.socket.emit('msg-refuseCall', {
      callerId: window.callerId,
      receiverId: meId,
      typeCall: window.typeCall
    })

    // set IU
    $(classPoHasCall).addClass('d-none')
    window.isCall = false
    window.timeStartCall = undefined
    if (isPageChat) {
      // create msg end call local
      createCallMsgLocal(
        window.callerId,
        callMissText,
        classCallMissed + (window.typeCall === 'video' ? classCallMissedVideo : '')
      )
    } else {
      // create msg end call local
      window.createCallMsgLocalMiniChat(
        window.callerId,
        callMissText,
        classCallMissed + (window.typeCall === 'video' ? classCallMissedVideo : '')
      )
    }
  })

  // close popup miss call
  $('.popup-has-call .close-popup').on('click', () => {
    $('.wrap-pop-has-call').removeClass('miss-call')
    $('.popup-has-call').addClass('d-none')
  })

  // receive signal offer from sub window call => send to server => receiver
  $(window).on('signalOffer', (e) => {
    const { signalOffer } = e.detail
    socket.emit('msg-offerStream', {
      receiverId: window.receiverId,
      callerId: meId,
      signal: signalOffer,
      typeCall: window.typeCall
    });
  })

  // receive signal answer from sub window receiver => send to server => caller
  $(window).on('signalAnswer', (e) => {
    const { signalAnswer } = e.detail
    socket.emit('msg-answerStream', {
      signal: signalAnswer,
      callerId: window.callerId,
      receiverId: meId,
      typeCall: window.typeCall
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
      socket.emit('msg-connectPeerFail', {
        callerId: meId,
        receiverId: window.receiverId,
        code,
        sender: 'caller',
        typeCall: window.typeCall
      });

      if (code === 'ERR_DATA_CHANNEL') {
        // peer fail for end call signal
        window.outputInfoMessage(error)

        if (isPageChat) {
          // create msg local
          createCallMsgLocal(
            window.receiverId,
            callTextCaller,
            classCallOut + (window.typeCall === 'video' ? classCallVideo : ''),
            true,
            true
          )
        } else {
          // create msg local
          window.createCallMsgLocalMiniChat(
            window.receiverId,
            callTextCaller,
            classCallOut + (window.typeCall === 'video' ? classCallVideo : ''),
            true,
            true
          )
        }
      } else {
        // connect peer fail
        window.outputErrorMessage(error)
      }
      window.focus()
    } else if (window.windowReceive) {
      // computer of receiver
      // close sub window
      window.windowReceive.close()
      window.windowReceive = undefined

      // send to server => send to caller => end call
      // caller end call => receiver on event end call but caller not on event self end call => send again to caller
      socket.emit('msg-connectPeerFail', {
        callerId: window.callerId,
        receiverId: meId,
        code,
        sender: 'receiver',
        typeCall: window.typeCall
      });

      if (code === 'ERR_DATA_CHANNEL') {
        // peer fail for end call signal
        window.outputInfoMessage(error)

        if (isPageChat) {
          // create msg local
          createCallMsgLocal(
            window.callerId,
            callTextReceiver,
            classCallCome + (window.typeCall === 'video' ? classCallVideo : ''),
            true
          )
        } else {
          // create msg local
          window.createCallMsgLocalMiniChat(
            window.callerId,
            callTextReceiver,
            classCallCome + (window.typeCall === 'video' ? classCallVideo : ''),
            true
          )
        }
      } else {
        window.outputErrorMessage(error)
      }
      window.focus()
    }
  })

  $(window).on('disconnectCall', () => {
    clearTimeout(window.timeoutCallId)
    if (window.callOutGoSound) {
      window.callOutGoSound.pause()
    }
    window.windowCall = undefined
    window.isCall = false
    window.timeStartCall = undefined
    $(classOvCalling).addClass('d-none')
    window.focus()

    if (window.sendSignalCallDone) {
      window.sendSignalCallDone = false
      // send signal call timeout to server => receiver
     socket.emit('msg-callTimeout', {
        callerId: meId,
        receiverId: window.receiverId,
        typeCall: window.typeCall
      })

      if (isPageChat) {
        createCallMsgLocal(
          window.receiverId,
          callTextCaller,
          classCallOut + (window.typeCall === 'video' ? classCallVideo : ''),
          false,
          true
        )
      } else {
        window.createCallMsgLocalMiniChat(
          window.receiverId,
          callTextCaller,
          classCallOut + (window.typeCall === 'video' ? classCallVideo : ''),
          false,
          true
        )
      }
    }
  })

  // receive signal has call from friend
 socket.on('msg-hasCallMedia', ({ signal, callerId, callerName, callerAvatar, typeCall }) => {
    window.callInComSound = new Audio('/sounds/call-incoming.ogg');
    window.callInComSound.loop = true
    window.callInComSound.play()
    window.signalOffer = signal // signal offer
    window.callerId = callerId
    window.typeCall = typeCall
    window.timeStartCall = new Date()
    window.isRefuseCall = false

    // set IU
    const $popup = $(classPoHasCall)
    $popup.find('.wrap-pop-has-call').removeClass('miss-call')
    $popup.find('.caller-img').attr('src', callerAvatar)
    $popup.find('.text-name-call')
      .html(`${ callerName } đang gọi ${typeCall === 'video' ? 'video' : ''}  cho bạn`)
    $popup.find('.title-call-info').html(`Cuộc gọi ${typeCall === 'video' ? 'video' : ''} đến`)
    $popup.find('.text-miss-call-sub').html(`
      <h4>Bạn đã bõ lỡ cuộc gọi của ${ callerName }</h4>
      <p class="text-secondary">Nhấn gọi lại để gọi lại cho  ${ callerName }</p>
    `)
    $popup.removeClass('d-none')
  })

  // receive signal answer
  socket.on('msg-answerSignal', ({ signal }) => {
    // send signal answer to sub window
    clearTimeout(window.timeoutCallId)
    if (window.callOutGoSound) {
      window.callOutGoSound.pause()
    }
    const event = new CustomEvent('signalAnswer', {
      detail: { signalAnswer: signal }
    });
    window.windowCall.dispatchEvent(event)
    $(classOvCalling).addClass('d-none')
  })

  // receive signal call error
  socket.on('msg-callError', ({msg}) => {
    if (window.callOutGoSound) {
      window.callOutGoSound.pause()
    }
    window.isCall = false
    window.windowCall.close()
    window.windowCall = undefined
    window.focus()
    $(classOvCalling).addClass('d-none')
    window.outputErrorMessage(msg)
  })

  // receive signal send signal call to receiver done
  socket.on('msg-doneSendSignalCall', ({ callerId, receiverId }) => {
    window.callOutGoSound = new Audio('/sounds/call-outgoing.ogg');
    window.callOutGoSound.loop = true
    window.callOutGoSound.play()
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
     socket.emit('msg-callTimeout', {
        callerId,
        receiverId,
        typeCall: window.typeCall
      })

      window.outputInfoMessage('Không trả lời')
      if (isPageChat) {
        createCallMsgLocal(
          window.receiverId,
          callTextCaller,
          classCallOut + (window.typeCall === 'video' ? classCallVideo : ''),
          false,
          true
        )
      } else {
        window.createCallMsgLocalMiniChat(
          window.receiverId,
          callTextCaller,
          classCallOut + (window.typeCall === 'video' ? classCallVideo : ''),
          false,
          true
        )
      }
    }, callTimeout);
  })

  // receive signal refuse call
  socket.on('msg-receiverRefuseCall', () => {
    if (window.windowCall) {
      clearTimeout(window.timeoutCallId)
      if (window.callOutGoSound) {
        window.callOutGoSound.pause()
      }
      window.sendSignalCallDone = false
      window.isCall = false
      window.timeStartCall = undefined
      window.windowCall.close()
      window.windowCall = undefined
      window.focus()

      // set UI
      $(classOvCalling).addClass('d-none')
      window.outputInfoMessage('Không trả lời')

      if (isPageChat) {
        // create msg end call local
        createCallMsgLocal(
          window.receiverId,
          callTextCaller,
          classCallOut + (window.typeCall === 'video' ? classCallVideo : ''),
          false,
          true
        )
      } else {
        // create msg end call local
        window.createCallMsgLocalMiniChat(
          window.receiverId,
          callTextCaller,
          classCallOut + (window.typeCall === 'video' ? classCallVideo : ''),
          false,
          true
        )
      }
    }
  })

  // receive signal miss call from server (caller)
  socket.on('msg-missedCall', ({ callerId, typeCall }) => {
    if (!window.isRefuseCall) {
      if (window.callInComSound) {
        window.callInComSound.pause()
      }
      const $popup = $(classPoHasCall)
      $popup.find('.wrap-pop-has-call').addClass('miss-call')
      $popup.find(idBtnCallBack).attr('data-callerid', callerId)

      if (isPageChat) {
        createCallMsgLocal(
          callerId,
          callMissText,
          classCallMissed + (typeCall === 'video' ? classCallMissedVideo : '')
        )
      } else {
        window.createCallMsgLocalMiniChat(
          callerId,
          callMissText,
          classCallMissed + (typeCall === 'video' ? classCallMissedVideo : '')
        )
      }
    }
  })

  // receive signal end call from server (it self end call)
  socket.on('msg-endCall', ({ callerId, receiverId, sender, typeCall }) => {
    window.isCall = false
    window.outputInfoMessage('Cuộc gọi kết thúc')
    if (sender === 'caller') {
      // computer of receiver
      window.windowReceive = undefined
      if (isPageChat) {
        createCallMsgLocal(
          callerId,
          callTextReceiver,
          classCallCome + (typeCall === 'video' ? classCallVideo : ''),
          true
        )
      } else {
        window.createCallMsgLocalMiniChat(
          callerId,
          callTextReceiver,
          classCallCome + (typeCall === 'video' ? classCallVideo : ''),
          true
        )
      }
    } else if (sender === 'receiver') {
      // computer of caller
      window.sendSignalCallDone = false
      window.windowCall = undefined
      if (isPageChat) {
        createCallMsgLocal(
          receiverId,
          callTextCaller,
          classCallOut + (typeCall === 'video' ? classCallVideo : ''),
          true,
          true
        )
      } else {
        window.createCallMsgLocalMiniChat(
          receiverId,
          callTextCaller,
          classCallOut + (typeCall === 'video' ? classCallVideo : ''),
          true,
          true
        )
      }
    }
  })

  // close sub window when close or refetch browser
  window.onbeforeunload = function() {
    if (window.windowCall) {
      window.windowCall.close()
    } else if (window.windowReceive) {
      window.windowReceive.close()
    }
  }

  // stop submit form search when value search is empty
  $('.form-search-box').on('submit', function(e) {
    if ($(this).find('#box-search').val() === '') {
      e.preventDefault()
    }
  })

  // search friend and unfriend
  $('#box-search').on('input', function() {
    $('.loader-search-box').removeClass('d-none')
    const value = this.value.replace(/\s+/g, ' ').trim()
    $('.text-search-box').html(value)
    clearTimeout(window.idTimeOutSearchBox)
    window.idTimeOutSearchBox = setTimeout(async () => {
      try {
        if (value && value !== window.oldSearchBox) {
          let members = []
          if (oldSearchRes[value]) {
            members = oldSearchRes[value]
          } else {
            const response = await axios.get('/messenger/s', {
              params: {
                q: value
              }
            })

            members = response.data.members
            oldSearchRes[value] = members
          }
          window.oldSearchBox = value
          
          // const { members } = response.data

          let html = members.map(friend => `
            <div class="pre-search-item-box ps-rv">
              <div class="d-flex align-items-center">
              <img class="rounded-circle" alt="${friend.name}" src="${friend.avatar}" title="${friend.name}" />
                <div class="wrap-pre-s-right">
                  <div class="name-member">${friend.name}</div>
                  <div><small class="text-secondary">${friend.status ? 'Bạn bè' : ''}</small></div>
                </div>
              </div>
              <a class="ps-as" href="/messenger/member/${friend.url ? friend.url : friend._id}">
                <span class="sr-only">View ${friend.name}</span>
              </a>
            </div>
          `).join('')

          if (html === '') {
            html = `
              <div class="text-center last-mb-none">
                <p>Không tìm thấy bạn bè phù hợp</p>
              </div>
            `
          }
          $('.wrap-s-res').html(html)
          $('.loader-search-box').addClass('d-none')
        } else {
          $('.loader-search-box').addClass('d-none')
        }
      } catch (error) {
        $('.loader-search-box').addClass('d-none')
        window.outputErrorMessage(error?.response?.data?.message)
      }
    }, 500)
  }).on('focus', () => {
    $('.search-res-box').removeClass('d-none')
  })

  // click outside search
  $(document).on('click', function(e) {
    const container = $("#search");
    // if the target of the click isn't the container nor a descendant of the container
    if (!container.is(e.target) && container.has(e.target).length === 0) {
      $('.search-res-box').addClass('d-none')
      $('.loader-search-box').addClass('d-none')
    }
  });

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
        if (className !== 'wrap-msg-file') {
          $friItem.find('.last-msg').html(`
            <small>Bạn: ${ msg }</small><small>1 phút</small>
          `)
        } else {
          $friItem.find('.last-msg').html(`
            <small>Bạn đã gửi 1 đính kèm</small><small>1 phút</small>
          `)
        }
        
      } else {
        outputMessage({
          time,
          username: $friItem.find(classNameFriend).text(),
          message: msg,
          avatar: $friItem.find('img').attr('src'),
          className,
          timeCall
        }, false)
        scrollBottomChatBox()
        $friItem.find('.last-msg').html(`
          <small>${ msg }</small><small>1 phút</small>
        `)
      }
    }
  }
  window.createCallMsgLocal = createCallMsgLocal

  /**
   * function call to friend by friend id
   * @param {string} friendId friend id to call
   * @param {string} typeCall call type [audio, video]
   */
  function callFriend(friendId, typeCall = 'audio') {
    if (!window.isCall) {
      window.isCall = true
      window.receiverId = friendId
      window.typeCall = typeCall

      $(classOvCalling).removeClass('d-none')
      // open sub window call
      const h = $(window).height()
      const w = $(window).width() < 1200 ? $(window).width() : 1200
      const x = ($(window).width() - w) / 2
      const windowCall = window.open(`/messenger/chat-media/${friendId}`, 'OH-Chat', `height=${h},width=${w},left=${x},top=${0}`);

      if (window.focus) {
        windowCall.focus();
        windowCall.typeClient = 'caller'
        windowCall.typeCall = typeCall
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
  window.callFriend = callFriend

  /**
   * Function output message in main chat area
   * @param {Object} msgObj message object { time, message, avatar, username }
   * @param {boolean} me is me
   */
  function outputMessage(msgObj, me = false, $chatBox = null) {
    const div = document.createElement('div');
    let content = msgObj.message
    if (isValidHttpUrl(msgObj.message)) {
      if (msgObj.type === 'file') {
        if (msgObj.resourceType === 'image') {
          content = `<img class="pre-img" src="${msgObj.message}" alt="${msgObj.nameFile}" />`  
        } else if (msgObj.resourceType === 'video') {
          content = `<video class="pre-video" muted autoplay src="${msgObj.message}"><video/>`  
        } else {
          content = `<a href="${msgObj.message}" target="_blank">${msgObj.nameFile}</a>`
        }
      } else {
        content = `<a href="${msgObj.message}" target="_blank">${msgObj.message}</a>`
      }
    }
    if (me) {
      div.className = `message text-right ${msgObj.className}`;
      div.innerHTML = `<small class="message-time">${msgObj.time}</small>
        <div>
          <div class="msg-me">
            <small class="message-content mx-0">${content}</small>
            ${ msgObj.timeCall || '' }
          </div>
        <div>`;
    } else {
      div.className = `message ${msgObj.className}`;
      div.innerHTML = `<small class="message-time">${msgObj.time}</small>
      <div>
        <div class="msg">
          <img class="message-avatar" src="${msgObj.avatar}" alt="${msgObj.username}" />
          <small class="message-content">${content}</small>
          ${ msgObj.timeCall || '' }
        </div>
      </div>`;
    }

    // append message
    if (!$chatBox) {
      chatMain.appendChild(div);
    } else {
      $chatBox.append(div)
    }
  }
  window.outputMessage = outputMessage

  function isValidHttpUrl(string) {
    let url;
    try { url = new URL(string); }
    catch (_) { return false; }
    return url.protocol === 'http:' || url.protocol === 'https:';
  }

  /**
   * Function scroll to bottom chat box
   */
  function scrollBottomChatBox($chatBox = null) {
    if (!$chatBox) {
      const $ele = $('#main-right-chat-content');
      $ele.animate({scrollTop: $ele[0].scrollHeight - $ele.innerHeight()}, 350, 'swing');
    } else {
      $chatBox.animate({scrollTop: $chatBox[0].scrollHeight - $chatBox.innerHeight()}, 350, 'swing');
    }
  }
  window.scrollBottomChatBox = scrollBottomChatBox

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
  window.formatDiffTime = formatDiffTime
})()

export default CommonChat