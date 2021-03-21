const Messenger = (() => {
  // receive msg obj from server
  window.socket.on('msg-messenger', ({senderId, msg: msgObj, token}) => {
    console.log(senderId);
    console.log($(`.popup-chat-mini[data-id=${senderId}]`));
    if ($(`.popup-chat-mini[data-id=${senderId}]`).length) {
      const $popup = $(`.popup-chat-mini[data-id=${senderId}]`)
      const $chatMain = $popup.find('.chat-mini-main')
      window.outputMessage(msgObj, false, $chatMain);

      // scroll bottom
      $chatMain.get(0).scrollTop = $chatMain.get(0).scrollHeight;
    } else {
      const html = `
      <div class="popup-chat-mini is-active d-flex flex-column" data-id="${senderId}">
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
                <span class="icomoon icon-phone"></span>
              </button>
              <button class="close-chat-btn btn btn-icon small-btn btn-red" type="button" title="Close chat">
                <span class="icomoon icon-close"></span>
              </button>
            </div>
          </div>
        </div>
        <div class="chat-mini-main flex-fill p-2"></div>
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
      const $chatMain = $popup.find('.chat-mini-main')
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
          window.createCallMsgLocal(
            $popup.attr('data-id'), window.escapeHtml(inputMsg.value), '', false, true, $chatMain
          )

          // scroll bottom
          $chatMain.get(0).scrollTop = $chatMain.get(0).scrollHeight;

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
      }
    });
})()

export default Messenger
