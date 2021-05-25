import moment from 'moment';
import axios from 'axios';

const CommonChat = (() => {
  const socket = io();
  window.socket = socket

  // get media device of user
  navigator.mediaDevices.getUserMedia =
    navigator.mediaDevices.getUserMedia ||
    navigator.mediaDevices.webkitGetUserMedia ||
    navigator.mediaDevices.mozGetUserMedia ||
    navigator.mediaDevices.msGetUserMedia;

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
  let msgCallId = ''

  window.soundRecord = new Audio('/sounds/record.mp3')

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
        classCallMissed + (window.typeCall === 'video' ? classCallMissedVideo : ''),
        false, 
        false,
        msgCallId
      )
      addMorelMsgCallLocal({
        msgId: msgCallId,
        type: 'call'
      })
    } else {
      // create msg end call local
      window.createCallMsgLocalMiniChat(
        window.callerId,
        callMissText,
        classCallMissed + (window.typeCall === 'video' ? classCallMissedVideo : ''),
        false,
        false,
        msgCallId
      )
      addMorelMsgCallLocal({
        msgId: msgCallId,
        type: 'call'
      })
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
    }, res => {
      if (res.status === 'ok') {
        msgCallId = res.msgId

        // receive signal send signal call to receiver done
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
            callerId: res.callerId,
            receiverId: res.receiverId,
            typeCall: window.typeCall
          })

          window.outputInfoMessage('Không trả lời')
          if (isPageChat) {
            createCallMsgLocal(
              window.receiverId,
              callTextCaller,
              classCallOut + (window.typeCall === 'video' ? classCallVideo : ''),
              false,
              true,
              msgCallId
            )
            addMorelMsgCallLocal({
              msgId: msgCallId,
              type: 'call'
            })
          } else {
            window.createCallMsgLocalMiniChat(
              window.receiverId,
              callTextCaller,
              classCallOut + (window.typeCall === 'video' ? classCallVideo : ''),
              false,
              true,
              msgCallId
            )
          }
        }, callTimeout);
      }
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
            true,
            msgCallId
          )
          addMorelMsgCallLocal({
            msgId: msgCallId,
            type: 'call'
          })
        } else {
          // create msg local
          window.createCallMsgLocalMiniChat(
            window.receiverId,
            callTextCaller,
            classCallOut + (window.typeCall === 'video' ? classCallVideo : ''),
            true,
            true,
            msgCallId
          )
          addMorelMsgCallLocal({
            msgId: msgCallId,
            type: 'call'
          })
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
            true,
            false,
            msgCallId
          )
          addMorelMsgCallLocal({
            msgId: msgCallId,
            type: 'call'
          })
        } else {
          // create msg local
          window.createCallMsgLocalMiniChat(
            window.callerId,
            callTextReceiver,
            classCallCome + (window.typeCall === 'video' ? classCallVideo : ''),
            true,
            false,
            msgCallId
          )
          addMorelMsgCallLocal({
            msgId: msgCallId,
            type: 'call'
          })
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
          true,
          msgCallId
        )
        addMorelMsgCallLocal({
          msgId: msgCallId,
          type: 'call'
        })
      } else {
        window.createCallMsgLocalMiniChat(
          window.receiverId,
          callTextCaller,
          classCallOut + (window.typeCall === 'video' ? classCallVideo : ''),
          false,
          true,
          msgCallId
        )
        addMorelMsgCallLocal({
          msgId: msgCallId,
          type: 'call'
        })
      }
    }
  })

  // receive signal has call from friend
 socket.on('msg-hasCallMedia', ({ signal, callerId, callerName, callerAvatar, typeCall, msgId }) => {
    window.callInComSound = new Audio('/sounds/call-incoming.ogg');
    window.callInComSound.loop = true
    window.callInComSound.play()
    window.signalOffer = signal // signal offer
    window.callerId = callerId
    window.typeCall = typeCall
    window.timeStartCall = new Date()
    window.isRefuseCall = false

    msgCallId = msgId

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
          true,
          msgCallId
        )
        addMorelMsgCallLocal({
          msgId: msgCallId,
          type: 'call'
        })
      } else {
        // create msg end call local
        window.createCallMsgLocalMiniChat(
          window.receiverId,
          callTextCaller,
          classCallOut + (window.typeCall === 'video' ? classCallVideo : ''),
          false,
          true,
          msgCallId
        )
        addMorelMsgCallLocal({
          msgId: msgCallId,
          type: 'call'
        })
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
          classCallMissed + (typeCall === 'video' ? classCallMissedVideo : ''),
          false,
          false,
          msgCallId
        )
        addMorelMsgCallLocal({
          msgId: msgCallId,
          type: 'call'
        })
      } else {
        window.createCallMsgLocalMiniChat(
          callerId,
          callMissText,
          classCallMissed + (typeCall === 'video' ? classCallMissedVideo : ''),
          false,
          false,
          msgCallId
        )
        addMorelMsgCallLocal({
          msgId: msgCallId,
          type: 'call'
        })
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
          true,
          false,
          msgCallId
        )
        addMorelMsgCallLocal({
          msgId: msgCallId,
          type: 'call'
        })
      } else {
        window.createCallMsgLocalMiniChat(
          callerId,
          callTextReceiver,
          classCallCome + (typeCall === 'video' ? classCallVideo : ''),
          true,
          false,
          msgCallId
        )
        addMorelMsgCallLocal({
          msgId: msgCallId,
          type: 'call'
        })
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
          true,
          msgCallId
        )
        addMorelMsgCallLocal({
          msgId: msgCallId,
          type: 'call'
        })
      } else {
        window.createCallMsgLocalMiniChat(
          receiverId,
          callTextCaller,
          classCallOut + (typeCall === 'video' ? classCallVideo : ''),
          true,
          true,
          msgCallId
        )
        addMorelMsgCallLocal({
          msgId: msgCallId,
          type: 'call'
        })
      }
    }
  })

  socket.on('msg-updateMessage', ({ messageId, friendId, type, content }) => {
    const $message = $(`.message[data-id="${messageId}"]`)
    if ($message.length) {
      if (type === 'delete') {
        $message.attr('class', 'message deleted')
        $message.find('.msg .message-content').html('Tin nhắn đã bị xóa')
        $message.find('.time-call').remove()
        if (isPageChat) {
          if ($message.is(':last-child')) {
            const $friItem = $(($(`.friend-item[data-id="${friendId}"]`)))
            if ($friItem.length) {
              $friItem.find('.last-msg').html(`
                <div class="last-msg text-dark">
                  <small><em>Tin nhắn đã bị xóa</em></small><small>vài giây</small>
                </div>
              `)
            }
          }
        }
      } else if (type === 'edit') {
        if (isValidHttpUrl(content)) {
          $message.find('.message-content').html(`<a href="${content}" target="_blank">${content}</a>`)
        } else {
          $message.find('.message-content').html(content)
        }
        if (isPageChat) {
          if ($message.is(':last-child')) {
            const $friItem = $(($(`.friend-item[data-id="${friendId}"]`)))
            if ($friItem.length) {
              $friItem.find('.last-msg').html(`
                <div class="last-msg text-dark">
                  <small>${content}</small><small>vài giây</small>
                </div>
              `)
            }
          }
        }
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

  $(document).on('mouseleave', '.message', function() {
    $(this).find('.confirm-del-msg').removeClass('is-show')
  })

  $(document).on('click', '.del-msg', function (e) {
    e.preventDefault()
    $(this).prevAll('.confirm-del-msg').addClass('is-show')
  })

  $(document).on('click', '.confirm-del-msg', async function (e) {
    e.preventDefault()
    const $itemMessage = $(this).parents('.message')
    if ($itemMessage.length) {
      $itemMessage.addClass('is-load')
      let token = ''
      if ($('#main').hasClass('chat-page')) {
        token = document.sendMsgForm.elements._token.value
      } else if ($('.popup-chat-mini.is-active').length) {
        token = $('.popup-chat-mini.is-active').find('input[name="_token"]').val()
      }
      if (token) {
        socket.emit('msg-deleteMessage', {
          messageId: $itemMessage.attr('data-id'),
          token
        }, (res) => {
          if (res.status === 'ok') {
            $itemMessage.find('.wrap-msg-mana').remove()
            $itemMessage.find('.msg-me').html('<small class="message-content mx-0">Tin nhắn đã bị xóa</small>')
            $itemMessage.attr('class', 'message deleted text-right ml-auto')

            if (isPageChat) {
              if ($itemMessage.is(':last-child')) {
                const $friItem = $(($(`.friend-item[data-id="${$('#main-right').attr('data-id')}"]`)))
                if ($friItem.length) {
                  $friItem.find('.last-msg').html(`
                    <div class="last-msg text-dark">
                      <small><em>Tin nhắn đã bị xóa</em></small><small>vài giây</small>
                    </div>
                  `)
                }
              }
            }
          } else {
            $itemMessage.removeClass('is-load')
          }
        })
      }
    }
  })

  $(document).on('click', '.edit-msg', function (e) {
    e.preventDefault()
    const $parent = $(this).parents('.message')
    const $msg = $parent.find('.msg-me')
    $msg.before(`
      <div class="edit-box ps-rv ml-auto">
        <img class="edit-loader" src="/images/loader.svg" alt="loader" />
        <textarea>${$msg.find('.message-content').text()}</textarea>
        <div class="edit-ctrl d-flex justify-content-end">
          <div class="ctrl d-flex">
            <button class="btn btn-icon xs-btn btn-default mr-2 edit-cancel" title="Hủy">
              <span class="icomoon icon-close"></span>
            </button>
            <button class="btn btn-icon xs-btn btn-default edit-save" title="Lưu">
              <span class="icomoon icon-checkmark"></span>
            </button>
          </div>
        </div>
      </div>
    `)
    $msg.addClass('d-none')
    setTimeout(() => {
      $parent.find('textarea').focus()
    }, 200);
  })

  $(document).on('click', '.edit-cancel', function(e) {
    e.preventDefault()
    cancelEditMsg($(this).parents('.message'))
  })

  $(document).on('click', '.edit-save', function(e) {
    e.preventDefault()
    const $parent = $(this).parents('.message')
    const $boxEdit = $parent.find('textarea')
    if ($boxEdit.val()) {
      saveEditMsg($parent)
    } else {
      cancelEditMsg($parent)
    }
  })

  $(document).on('keydown', '.edit-box textarea', function(e) {
    const code = e.keyCode || e.which
    if (code === 27) {
      e.preventDefault()
      cancelEditMsg($(this).parents('.message'))
    } else if (code === 13 && !e.shiftKey) {
      e.preventDefault()
      saveEditMsg($(this).parents('.message'))
    }
  })

  function cancelEditMsg($message) {
    $message.find('.edit-box').removeClass('load')
    $message.find('.edit-box').remove()
    $message.find('.msg-me').removeClass('d-none')
  }

  function saveEditMsg($message) {
    $message.find('.edit-box').addClass('load')
    const content = $message.find('textarea').val()
    let token = ''
    if (isPageChat) {
      token = document.sendMsgForm.elements._token.value
    } else if ($('.popup-chat-mini.is-active').length) {
      token = $('.popup-chat-mini.is-active').find('input[name="_token"]').val()
    }
    if (token && content) {
      socket.emit('msg-editMessage', {
        messageId: $message.attr('data-id'),
        content,
        token
      }, res => {
        if (res.status === 'ok') {
          if (isValidHttpUrl(content)) {
            $message.find('.message-content').html(`<a href="${content}" target="_blank">${content}</a>`)
          } else {
            $message.find('.message-content').html(content)
          }
          if (isPageChat) {
            if ($message.is(':last-child')) {
              const $friItem = $(($(`.friend-item[data-id="${$('#main-right').attr('data-id')}"]`)))
              if ($friItem.length) {
                $friItem.find('.last-msg').html(`
                  <div class="last-msg text-dark">
                    <small>${content}</small><small>vài giây</small>
                  </div>
                `)
              }
            }
          }
          cancelEditMsg($message)
        } else {
          cancelEditMsg($message)
        }
      })
    } else {
      cancelEditMsg($message)
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
  function createCallMsgLocal(friendId, msg = '', className = '', isCallEnd = false, me = false, tmpId = '') {
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
          timeCall,
          id: tmpId
        }, true)
        scrollBottomChatBox()
        if (className !== 'wrap-msg-file') {
          $friItem.find('.last-msg').html(`
            <small>Bạn: ${ msg }</small><small>vài giây</small>
          `)
        } else {
          $friItem.find('.last-msg').html(`
            <small>Bạn đã gửi 1 đính kèm</small><small>vài giây</small>
          `)
        }
        
      } else {
        outputMessage({
          time,
          username: $friItem.find(classNameFriend).text(),
          message: msg,
          avatar: $friItem.find('img').attr('src'),
          className,
          timeCall,
          id: tmpId
        }, false)
        scrollBottomChatBox()
        $friItem.find('.last-msg').html(`
          <small>${ msg }</small><small>vài giây</small>
        `).removeClass('un-read')
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
    $(div).attr('data-id', msgObj.id)
    let classAdd = ''
    let content = msgObj.message
    if (isValidHttpUrl(msgObj.message)) {
      if (msgObj.type === 'file') {
        if (msgObj.resourceType === 'image') {
          content = `<a href="${msgObj.message}" target="_blank" title="${msgObj.nameFile}"><img class="pre-img" src="${msgObj.message}" alt="${msgObj.nameFile}" /></a>`  
        } else if (msgObj.resourceType === 'video') {
          content = `<video class="pre-video" controls src="${msgObj.message}"></video>`  
          classAdd = 'd-flex'
        } else if (msgObj.resourceType === 'audio') {
          content = `<audio class="pre-video pre-audio" controls src="${msgObj.message}"><audio/>`  
          classAdd = 'd-flex'
        }
        else {
          content = `<a href="${msgObj.message}" target="_blank">${msgObj.nameFile}</a>`
        }
      } else {
        content = `<a href="${msgObj.message}" target="_blank">${msgObj.message}</a>`
      }
    }
    if (me) {
      div.className = `message text-right ml-auto ${msgObj.className ? msgObj.className : ''}`;
      div.innerHTML = `<small class="message-time">${msgObj.time}</small>
        <div>
          <div class="msg-me ps-rv">
            <small class="message-content mx-0 ${classAdd}">${content}</small>
            ${ msgObj.timeCall || '' }
          </div>
        <div>`;
    } else {
      div.className = `message ${msgObj.className ? msgObj.className : ''}`;
      div.innerHTML = `<small class="message-time">${msgObj.time}</small>
      <div>
        <div class="msg">
          <img class="message-avatar" src="${msgObj.avatar}" alt="${msgObj.username}" />
          <small class="message-content ${classAdd}">${content}</small>
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

  function addMorelMsgLocal({ tmpId, realId, type }) {
    const $message = $(`.message[data-id="${tmpId}"]`)
    if ($message.length) {
      $message.attr('data-id', realId)
      let editText = ''
      if (type === 'text' || type === 'edited') {
        editText = `
          <button class="btn btn-icon btn-purple xs-btn edit-msg mr-1" title="Sửa tin nhắn">
            <span class="icomoon icon-icon-edit"></span>
          </button>
        `
      }
      const moreMsg = `
        <div class="wrap-msg-mana d-flex">
          <button class="btn btn-icon btn-red xs-btn confirm-del-msg mr-1" title="Xóa tin nhắn">
            <span class="icomoon icon-checkmark"></span>
          </button>
          <img class="msg-mana-loader" src="/images/loader.svg" alt="loader" />
          ${ editText }
          <button class="btn btn-icon btn-red xs-btn del-msg" title="Xóa tin nhắn">
            <span class="icomoon icon-close"></span>
          </button>
        </div>
      `

      $message.find('.msg-me').prepend(moreMsg)
    }
  }
  window.addMorelMsgLocal = addMorelMsgLocal

  function addMorelMsgCallLocal({ msgId, type }) {
    const $message = $(`.message[data-id="${msgId}"]`)
    if ($message.length) {
      let editText = ''
      if (type === 'text' || type === 'edited') {
        editText = `
          <button class="btn btn-icon btn-purple xs-btn edit-msg mr-1" title="Sửa tin nhắn">
            <span class="icomoon icon-icon-edit"></span>
          </button>
        `
      }
      const moreMsg = `
        <div class="wrap-msg-mana d-flex">
          <button class="btn btn-icon btn-red xs-btn confirm-del-msg mr-1" title="Xóa tin nhắn">
            <span class="icomoon icon-checkmark"></span>
          </button>
          <img class="msg-mana-loader" src="/images/loader.svg" alt="loader" />
          ${ editText }
          <button class="btn btn-icon btn-red xs-btn del-msg" title="Xóa tin nhắn">
            <span class="icomoon icon-close"></span>
          </button>
        </div>
      `

      $message.find('.msg-me').prepend(moreMsg)
    }
  }

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

  // function sleep
  const sleep = m => new Promise(r => setTimeout(r, m))

  // function take a photo and return file type image
  async function takePicture($modal = $('#modal-take-photo')) {
    if (navigator.mediaDevices.getUserMedia) {
      try {
        $('#is-taking').removeClass('d-none')
        const $wrapTake = $modal.find('.wrap-takephoto')
        $wrapTake.removeClass('d-none')
        // get video stream
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        // show video stream
        $wrapTake.find('video').each((i, vd) => {
          if ('srcObject' in vd) {
            vd.srcObject = videoStream;
          } else {
            vd.src = window.URL.createObjectURL(videoStream);
          }
        })
        const snd = new Audio('/sounds/take-photo.mp3');
        // count down
        $modal.find('.count-down').removeClass('d-none')

        // sleep 4s
        await sleep(4000)

        // take photo from video
        const video = $wrapTake.find('video').get(0)
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        const dataURL = canvas.toDataURL('image/jpeg');

        // create file image
        const file = dataURLtoFile(dataURL, 'capture.jpg')
        canvas.className = 'res-capture ps-as'
        $wrapTake.append(canvas)

        await Promise.all([
          snd.play(),
          sleep(320)
        ]);

        // stop video stream after take photo
        $modal.find('.count-down').addClass('d-none')
        $wrapTake.addClass('d-none')
        $wrapTake.find('canvas').remove()
        videoStream.getVideoTracks()[0].stop()
        $wrapTake.find('video').each((i, vd) => {
          if ('srcObject' in vd) {
            vd.srcObject = null;
          } else {
            vd.src = null;
          }
        })
        $('#is-taking').addClass('d-none')
        // return file
        return { file, dataURL }
      } catch (error) {
        $('#is-taking').addClass('d-none')
        window.outputWarnMessage('Bạn đã chặn quyền sử dụng webcam')
      }
    }
  }
  window.takePicture = takePicture

  // create file from data base64
  function dataURLtoFile(dataurl, filename) {
    let arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  // handle recorder voice
  async function recorderVoice($recBar) {
    if (navigator.mediaDevices.getUserMedia) {
      try {
        window.voiceRECStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        });

        let time = 1
        window.timeRec = setInterval(() => {
          const m = Math.floor(time / 60)
          const s = time - (60 * m)
          $recBar.find('.rec-time').html(`${m}:${s.toString().padStart(2, '0')}`)
          time++
        }, 1000);

        const blobs = [];
        window.localREC = new MediaRecorder(window.voiceRECStream, {mimeType: 'audio/webm;codecs=opus'});
        window.localREC.ondataavailable = (e) => blobs.push(e.data);
        window.localREC.onstop = () => {
          window.soundRecord.play()
          if (!window.cancelRec) {
            const blob = new Blob(blobs, {type: 'audio/webm'});
            const event = new CustomEvent('endRecorderVoice', {
              detail: { blob }
            });
            // dispatch (trigger) event custom
            window.dispatchEvent(event)
          }
        }
        window.soundRecord.play()
        window.localREC.start();
      } catch (error) {
        // console.log(error);
        outputWarnMessage('Không thể ghi âm!')
      }
    }
  }
  window.recorderVoice = recorderVoice

  function stopRecorderVoice(cancel = false) {
    if (window.localREC) {
      window.cancelRec = cancel
      window.localREC.stop();
      window.localREC = null
    }
    if (window.voiceRECStream) {
      window.voiceRECStream.getTracks().forEach(function(track) {
        track.stop();
      });
    }
    window.localRECStream = null;
    clearInterval(window.timeRec)
  }
  window.stopRecorderVoice = stopRecorderVoice
})()

export default CommonChat