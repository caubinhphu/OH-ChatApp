import moment from 'moment';
import axios from 'axios';

const Messenger = (() => {
  const classChatMain = '.chat-mini-main'
  const nClassCloseMini = 'close-mini-chat'
  const classScroll = '.scroll-bottom'
  const nClassNoAct = 'not-active'
  const nClassAct = 'is-active'

  // receive msg obj from server
  window.socket.on('msg-messenger', async ({senderId, msg: msgObj, token}) => {
    const activeLength = $('.wrap-chat-mini .popup-chat-mini.is-active').length
    if ($(`.popup-chat-mini[data-id=${senderId}]`).length) {
      const $popup = $(`.popup-chat-mini[data-id=${senderId}]`)
      const $chatMain = $popup.find(classChatMain)

      window.outputMessage(msgObj, false, $chatMain);

      // scroll bottom
      window.scrollBottomChatBox($chatMain)

      if ($popup.hasClass(nClassCloseMini)) {
        $popup.removeClass(nClassCloseMini)
        const classIsActive = (activeLength || $('.open-search-mini').hasClass('is-open')) ? nClassNoAct : nClassAct
        $popup.addClass(classIsActive)
        if (classIsActive === nClassNoAct) {
          outputPreviewMsg($popup, msgObj.message);
        } else {
          window.scrollBottomChatBox($chatMain)
        }
      } else if ($popup.hasClass(nClassNoAct)) {
        outputPreviewMsg($popup, msgObj.message);
      }
    } else {
      const classIsActive = (activeLength || $('.open-search-mini').hasClass('is-open')) ? nClassNoAct : nClassAct
      createMiniPopup(senderId, msgObj, token, classIsActive)
    }
  });

  // receive signal friend is online
  window.socket.on('msg-friendOnline', ({ memberId }) => {
    const $popup = $(`.popup-chat-mini[data-id="${memberId}"]`)
    if ($popup.length) {
      $popup.addClass('is-online')
      $popup.find('.mini-status').html('Đang hoạt động')
    }
  })

  // receive signal friend is offline
  window.socket.on('msg-friendOffline', ({ memberId }) => {
    const $popup = $(`.popup-chat-mini[data-id="${memberId}"]`)
    if ($popup.length) {
      $popup.removeClass('is-online')
      $popup.find('.mini-status').html('Đang không hoạt động')
    }
  })


  // open search friend mini
  $('.open-search-mini').on('click', function(e) {
    e.preventDefault()
    if ($(this).hasClass('is-open')) {
      // close
      $('.box-search-mini').addClass('d-none')
      $(this).removeClass('is-open')
    } else {
      // open
      $(this).addClass('is-open')
      $('.popup-chat-mini.is-active').removeClass(nClassAct).addClass(nClassNoAct)
      $('.box-search-mini').removeClass('d-none')
      $('#s-fri-mini').focus()
    }
  })

  $('.close-search-mini').on('click', () => {
    // close
    $('.box-search-mini').addClass('d-none')
    $('.open-search-mini').removeClass('is-open')
  })

  // send query search friend
  $('#s-fri-mini').on('input', function() {
    clearTimeout(window.idTimeOutSearchMini)
    window.idTimeOutSearchMini = setTimeout(async () => {
      try {
        if (this.value && window.oldSearch !== this.value) {
          const response = await axios.get('/messenger/search-friend', {
            params: {
              q: this.value,
              mini: '1'
            }
          })

          window.oldSearch = this.value
          const { friends } = response.data
          let html = friends.map(friend => `
            <div class="pre-search-item" data-id="${friend._id}" data-token="${friend.token}" data-status="${friend.status}">
              <div class="d-flex align-items-center">
              <img class="rounded-circle" alt="${friend.name}" src="${friend.avatar}" title="${friend.name}" />
                <div class="wrap-pre-s-right">
                  <div class="name-member">${friend.name}</div>
                  <div class="text-secondary">
                    <small>${friend.status === 'online' ? 'Đang hoạt động' : 'Đang không hoạt động'}</small>
                  </div>
                </div>
              </div>
            </div>
          `).join('')

          if (html === '') {
            html = `
              <div class="text-center last-mb-none">
                <p>Không tìm thấy bạn bè phù hợp</p>
              </div>
            `
          }
          $('.b-s-m-res').html(html)
          // $('#main-left-search').removeClass('show-loader')
        }
      } catch (error) {
        window.outputErrorMessage(error?.response?.data?.message)
      }
    }, 500)
  })

  // choose friend to chat from search results
  $(document).on('click', '.pre-search-item', async function() {
    const friendId = $(this).attr('data-id')
    const token = $(this).attr('data-token')
    const status = $(this).attr('data-status')
    const $popupMini = $(`.popup-chat-mini[data-id="${friendId}"]`)
    $('.box-search-mini').addClass('d-none')
    $('.open-search-mini').removeClass('is-open')
    if ($popupMini.length) {
      // is chatting
      $('.popup-chat-mini.is-active').removeClass(nClassAct).addClass(nClassNoAct)
      $popupMini.removeClass(nClassNoAct).removeClass(nClassCloseMini).addClass(nClassAct)
    } else {
      // isn't chatting
      $('.popup-chat-mini.is-active').removeClass(nClassAct).addClass(nClassNoAct)
      await createMiniPopup(
        friendId,
        {
          avatar: $(this).find('img').attr('src'),
          username: $(this).find('.name-member').html(),
        },
        token,
        nClassAct,
        status === 'online' ? 'Đang hoạt động' : 'Đang không hoạt động'
      )
    }
  })

  // function create new chat box mini
  async function createMiniPopup(senderId, msgObj, token, classIsActive, status = 'Đang hoạt động') {
    const html = `
    <div class="popup-chat-mini d-flex flex-column ps-rv ${status === 'Đang hoạt động' ? 'is-online' : ''} ${ classIsActive }"
      data-id="${senderId}" data-page="0" data-hasMsg="1" data-allow-load="1"
    >
      <div class="wrap-loader-mini">
        <div class="d-flex justify-content-center align-items-center h-100">
          <img src="/images/loader.svg" alt="loader" />
        </div>
      </div>
      <div class="scroll-bottom"><span class="icomoon icon-circle-down"></span></div>
      <img class="avatar-mini-2" src="${msgObj.avatar}" alt="${msgObj.username}" title="${msgObj.username}" />
      <div class="preview-msg">
        <span></span>
      </div>
      <div class="dot-status-mini"></div>
      <div class="chat-mini-top">
        <div class="d-flex p-2">
          <div class="flex-fill d-flex align-items-center pr-1">
            <img class="rounded-circle mr-1 avatar-mini" src="${msgObj.avatar}" alt="${msgObj.username}" />
            <div>
                <div class="mini-name">${msgObj.username}</div>
                <div class="mini-status">${status}</div>
            </div>
          </div>
          <div class="flex-fill d-flex align-items-center justify-content-end">
            <button class="call-friend-btn btn btn-icon small-btn btn-green mr-1" type="button" title="Gọi">
              <span class="icomoon icon-phone"></span>
            </button>
            <button class="video-friend-btn btn btn-icon small-btn btn-purple mr-1" type="button" title="Gọi video">
              <span class="icomoon icon-camera"></span>
            </button><button class="mini-chat-btn btn btn-icon small-btn btn-red mr-1" type="button" title="Ẩn chat">
              <span class="icomoon icon-minus"></span>
            </button>
            <button class="close-chat-btn btn btn-icon small-btn btn-red" type="button" title="Đóng chat">
              <span class="icomoon icon-close"></span>
            </button>
          </div>
        </div>
      </div>
      <div class="chat-mini-main flex-fill p-2 ps-rv">
        <div class="wrap-loader-chat d-none"><img src="/images/loader.svg" alt="loader"></div>
      </div>
      <div class="chat-mini-bottom">
          <form class="d-flex">
            <button class="btn btn-default open-emojis" type="button">&#128512;</button>
            <input type="hidden" name="_token" value="${token}">
              <div class="flex-fill wrap-msg-box ps-rv">
                <textarea class="form-control msg-mini" type="text" name="message" placeholder="Nhập tin nhắn" autocomplete="off"></textarea>
              </div>
              <button class="btn btn-default text-secondary">
                <span class="icomoon icon-send"></span>
              </button>
          </form>
      </div>
    </div>
    `;
    $('.wrap-chat-mini').append(html)

    const $popup = $(`.popup-chat-mini[data-id=${senderId}]`)

    if (classIsActive === nClassNoAct) {
      outputPreviewMsg($popup, msgObj.message);
    }

    await loadOldMsg($popup)
    $popup.find('.wrap-loader-mini').addClass('d-none')

    window.emojisForMiniChat($popup)

    // event submit form chat
    $popup.find('form').on('submit', (e) => {
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
        createCallMsgLocalMini($popup.attr('data-id'), window.escapeHtml(inputMsg.value), '', false, true)

        // scroll bottom
        // $chatMain.get(0).scrollTop = $chatMain.get(0).scrollHeight;

        // set value for input message
        inputMsg.value = '';

        // focus input message
        inputMsg.focus();
      }
    });

    $popup.find('.msg-mini').on('keydown', function(e) {
      if (e.which === 13 && ! e.shiftKey) {
        e.preventDefault();
        $popup.find('button.text-secondary').trigger('click');
        $(this).css('height', '35px');
      }
    }).on('input', function() {
      $(this).css('height', '5px');
      $(this).css('height', `${this.scrollHeight}px`);
    }).on('focus', function() {
      $(this).parents('.wrap-msg-box').addClass('is-focus');
    }).on('blur', function() {
      $(this).parents('.wrap-msg-box').removeClass('is-focus');
    });

    // handle scroll box chat: load old msg, scroll to bottom
    $popup.find(classChatMain).on('scroll', async function() {
      if (this.scrollTop === 0) {
        $popup.find('.wrap-loader-chat').removeClass('d-none')
        await loadOldMsg($popup)
        $popup.find('.wrap-loader-chat').addClass('d-none')
      } else if (this.scrollHeight - this.scrollTop >= this.clientHeight + 200) {
        $popup.find(classScroll).addClass('is-show');
      } else {
        $popup.find(classScroll).removeClass('is-show');
      }
    });

    // scroll to bottom chat box
    $popup.find(classScroll).on('click', () => {
      window.scrollBottomChatBox($popup.find(classChatMain))
    });

    // minimize chat
    $popup.find('.mini-chat-btn').on('click', () => {
      $popup.removeClass(nClassAct)
      $popup.addClass(nClassNoAct)
    });

    // open mini chat
    $popup.find('.avatar-mini-2').on('click', () => {
      $('.popup-chat-mini').removeClass(nClassAct)
      $('.popup-chat-mini').addClass(nClassNoAct)
      $popup.addClass(nClassAct)
      $popup.removeClass(nClassNoAct)

      // window.scrollBottomChatBox($popup.find(classChatMain))
      // scroll bottom
      const chatMain = $popup.find(classChatMain).get(0)
      chatMain.scrollTop = chatMain.scrollHeight;
    });

    // close mini chat
    $popup.find('.close-chat-btn').on('click', () => {
      $popup.addClass(nClassCloseMini)
      $popup.removeClass(nClassAct)
    });

    // call audio
    $popup.find('.call-friend-btn').on('click', () => {
      window.callFriend($popup.attr('data-id'))
    });

    // call video
    $popup.find('.video-friend-btn').on('click', () => {
      window.callFriend($popup.attr('data-id'), 'video')
    });
  }

  // function create call msg local mini chat
  function createCallMsgLocalMiniChat(friendId, msg = '', className = '', isCallEnd = false, me = false) {
    const $popup = $(`.popup-chat-mini[data-id=${friendId}]`)
    if ($popup.length) {
      createCallMsgLocalMini(friendId, msg, className, isCallEnd, me)
      if ($popup.hasClass(nClassNoAct)) {
        outputPreviewMsg($popup, msg);
      }
    }
  }
  window.createCallMsgLocalMiniChat = createCallMsgLocalMiniChat

    /**
   * Function create and append call message to local
   * @param {string} friendId friend id
   * @param {string} msg message
   * @param {string} className class name
   * @param {boolean} isCallEnd isCallEnd
   * @param {boolean} me is me
   */
  function createCallMsgLocalMini(friendId, msg = '', className = '', isCallEnd = false, me = false) {
    const $chatBox = $(`.popup-chat-mini[data-id="${friendId}"]`);
    let time = moment().format('H:mm')
    let timeCall = null
    if (isCallEnd && window.timeStartCall) {
      time = moment(window.timeStartCall).format('H:mm')
      timeCall = `<small class="time-call">${window.formatDiffTime(window.timeStartCall, new Date())}</small>`
      window.timeStartCall = undefined
    }
    if ($chatBox.length) {
      if (me) {
        window.outputMessage({
          time,
          username: 'Me',
          message: msg,
          className,
          timeCall
        }, true, $chatBox.find(classChatMain))
        window.scrollBottomChatBox($chatBox.find(classChatMain))
      } else {
        window.outputMessage({
          time,
          username: $chatBox.find('.mini-name').text(),
          message: msg,
          avatar: $chatBox.find('.avatar-mini').attr('src'),
          className,
          timeCall
        }, false, $chatBox.find(classChatMain))
        window.scrollBottomChatBox($chatBox.find(classChatMain))
      }
    }
  }
  window.createCallMsgLocalMini = createCallMsgLocalMini

  async function loadOldMsg($popup) {
    if (+$popup.attr('data-hasMsg') && +$popup.attr('data-allow-load')) {
      $popup.attr('data-allow-load', '0')
      const currentPage = +$popup.attr('data-page')
      try {
        const responsive = await axios.get(`/messenger/chatold/?friendid=${$popup.attr('data-id')}&page=${currentPage}`);
        const { messages, hasMsg } = responsive.data;
        // $('.wrap-loader-chat').addClass('d-none')
        $popup.attr('data-page', currentPage + 1)
        $popup.attr('data-hasMsg', hasMsg ? '1' : '0')

        const htmlMsgs = messages.map(msg => {
          const timeEndCall = msg.timeCall ? `<small class="time-call">${msg.timeCall}</small>` : ''
          if (msg.me) {
            return `
              <div class="message text-right ${msg.class}">
                <small class="message-time">${msg.time}</small>
                <div>
                  <div class="msg-me">
                    <small class="message-content mx-0">${msg.content}</small>
                    ${ timeEndCall }
                  </div>
                </div>
              </div>`
          }
          return `
            <div class="message ${msg.class}">
              <small class="message-time">${msg.time}</small>
              <div>
                <div class="msg">
                  <img class="message-avatar" src="${msg.avatar}" alt="${msg.name}">
                  <small class="message-content">${msg.content}</small>
                  ${ timeEndCall }
                </div>
              </div>
            </div>`
        }).join('')

        // prepend msg list and hold position scroll top of chat box
        const chatMain = $popup.find(classChatMain).get(0)
        const curScrollPos = chatMain.scrollTop;
        const oldScroll = chatMain.scrollHeight - chatMain.clientHeight;
        $(chatMain).prepend(htmlMsgs)
        const newScroll = chatMain.scrollHeight - chatMain.clientHeight;
        chatMain.scrollTop = curScrollPos + (newScroll - oldScroll);

        $popup.attr('data-allow-load', '1')
      } catch (error) {
        window.outputErrorMessage(error?.response?.data?.msg)
      }
    }
  }

  function outputPreviewMsg($popup, msg) {
    $popup.find('.preview-msg span').html(msg)
    $popup.find('.preview-msg').addClass('is-show')
    setTimeout(() => {
      $popup.find('.preview-msg').removeClass('is-show')
    }, 2000);
  }
})()

export default Messenger
