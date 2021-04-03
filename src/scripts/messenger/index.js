import axios from 'axios';
import '../global/chat-utils'

const Index = (() => {
  const chatMain = document.getElementById('main-right-chat-content');
  const msgForm = document.sendMsgForm; // form chat
  let hasMessenger = true // has old msg
  let currentPageChat = 0 // current page load old chat
  let allowLoadOld = true

  const classScBottom = '.scroll-bottom'

  if (msgForm) {
    // scroll bottom
    chatMain.scrollTop = chatMain.scrollHeight;

    const friendIdChatting = $('#main-right').attr('data-id')

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
        window.createCallMsgLocal(friendIdChatting, window.escapeHtml(inputMsg.value), '', false, true)

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
      if (this.scrollTop === 0 && hasMessenger === true && allowLoadOld) {
        allowLoadOld = false
        $('.wrap-loader-chat').removeClass('d-none')
        try {
          const responsive = await axios.get(`/messenger/chatold/?friendid=${friendIdChatting}&page=${currentPageChat + 1}`);
          const { messages, hasMsg } = responsive.data;
          $('.wrap-loader-chat').addClass('d-none')
          currentPageChat++
          hasMessenger = hasMsg


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
          const curScrollPos = this.scrollTop;
          const oldScroll = this.scrollHeight - this.clientHeight;
          $(this).prepend(htmlMsgs)
          const newScroll = this.scrollHeight - this.clientHeight;
          this.scrollTop = curScrollPos + (newScroll - oldScroll);

          allowLoadOld = true
        } catch (error) {
          window.outputErrorMessage(error?.response?.data?.msg)
        }
      } else if (this.scrollHeight - this.scrollTop >= this.clientHeight + 200) {
        $(classScBottom).addClass('is-show');
      } else {
        $(classScBottom).removeClass('is-show');
      }
    });

    // scroll to bottom chat box
    $(classScBottom).on('click', function() {
      window.scrollBottomChatBox()
    });

    // preventDefault form search friend
    $('.form-search-friend').on('submit', function(e) {
      e.preventDefault()
    })

    // send query search friend
    $('#search-friend').on('input', function() {
      $('.loader-search').removeClass('d-none')
      clearTimeout(window.idTimeOutSearch)
      window.idTimeOutSearch = setTimeout(async () => {
        try {
          if (this.value && this.value !== window.oldSearch) {
            const response = await axios.get('/messenger/search-friend', {
              params: {
                q: this.value
              }
            })

            window.oldSearch = this.value
            const { friends } = response.data
            let html = friends.map(friend => `
              <div class="s-fri-item">
                <div class="d-flex align-items-center ps-rv">
                  <img class="rounded-circle" alt="${friend.name}" src="${friend.avatar}" title="${friend.name}" />
                  <div class="wrap-pre-s-right">
                    <div class="name-member">${friend.name}</div>
                  </div>
                  <a class="ps-as" href="/messenger/chat/${friend.url ? friend.url : friend._id}">
                    <span class="sr-only">Chat with ${friend.name}</span>
                  </a>
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
            $('.s-fri-res-box').html(html)
            $('.loader-search').addClass('d-none')
          } else {
            $('.loader-search').addClass('d-none')
          }
        } catch (error) {
          $('.loader-search').addClass('d-none')
          window.outputErrorMessage(error?.response?.data?.message)
        }
      }, 500)
    }).on('focus', () => {
      $('.search-fri-res-box').removeClass('d-none')
    }).on('blur', () => {
      $('.search-fri-res-box').addClass('d-none')
      $('.loader-search').addClass('d-none')
    })

    // receive msg obj from server
    window.socket.on('msg-messenger', ({senderId, msg: msgObj}) => {
      if (friendIdChatting === senderId) {
        // output message
        window.outputMessage(msgObj);

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
  }
})()

export default Index