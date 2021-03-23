import moment from 'moment';
import axios from 'axios';

const Messenger = (() => {
  const classChatMain = '.chat-mini-main'

  // receive msg obj from server
  window.socket.on('msg-messenger', async ({senderId, msg: msgObj, token}) => {
    if ($(`.popup-chat-mini[data-id=${senderId}]`).length) {
      const $popup = $(`.popup-chat-mini[data-id=${senderId}]`)
      const $chatMain = $popup.find(classChatMain)
      window.outputMessage(msgObj, false, $chatMain);

      // scroll bottom
      window.scrollBottomChatBox($chatMain)
    } else {
      const html = `
      <div class="popup-chat-mini is-active d-flex flex-column" data-id="${senderId}" data-page="0" data-hasMsg="1">
        <div class="wrap-loader-mini">
          <div class="d-flex justify-content-center align-items-center h-100">
            <img src="/images/loader.svg" alt="loader" />
          </div>
        </div>
        <img class="avatar-mini-2" src="${msgObj.avatar}" alt="${msgObj.username}" title="${msgObj.username}" />
        <div class="chat-mini-top">
          <div class="d-flex p-2">
            <div class="flex-fill d-flex align-items-center">
              <img class="rounded-circle mr-1 avatar-mini" src="${msgObj.avatar}" alt="${msgObj.username}" />
              <div>
                  <div class="mini-name">${msgObj.username}</div>
                  <div class="mini-status">Đang hoạt động</div>
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
              <button class="close-chat-btn btn btn-icon small-btn btn-red" type="button" title="Close chat">
                <span class="icomoon icon-close"></span>
              </button>
            </div>
          </div>
        </div>
        <div class="chat-mini-main flex-fill p-2 ps-rv">
          <div class="wrap-loader-chat"><img src="/images/loader.svg" alt="loader"></div>
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
      $popup.find('.chat-mini-main').on('scroll', async function() {
        if (this.scrollTop === 0) {
          $popup.find('.wrap-loader-chat').removeClass('d-none')
          await loadOldMsg($popup)
          $popup.find('.wrap-loader-chat').removeClass('d-none')
        } else if (this.scrollHeight - this.scrollTop >= this.clientHeight + 200) {
          // $(classScBottom).addClass('is-show');
        } else {
          // $(classScBottom).removeClass('is-show');
        }
      });
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

  async function loadOldMsg($popup) {
    if (+$popup.attr('data-hasMsg')) {
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
        const chatMain = $popup.find('.chat-mini-main').get(0)
        const curScrollPos = chatMain.scrollTop;
        const oldScroll = chatMain.scrollHeight - chatMain.clientHeight;
        $(chatMain).prepend(htmlMsgs)
        const newScroll = chatMain.scrollHeight - chatMain.clientHeight;
        chatMain.scrollTop = curScrollPos + (newScroll - oldScroll);
      } catch (error) {
        window.outputErrorMessage(error.message)
      }
    }
  }
})()

export default Messenger
