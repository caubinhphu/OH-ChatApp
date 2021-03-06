import moment from 'moment';
import axios from 'axios';
import SimplePeer from 'simple-peer'
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

    $('#call-friend-btn').on('click', () => {
      const friendId = $('#main-right').attr('data-id')
      const peerCall = new SimplePeer({
        initiator: true, // init -> offer peer
        trickle: false
      });

      peerCall.on('signal', (signal) => {
            socket.emit('msg-offerStreamAudio', {
              receiverId: $('#main-right').attr('data-id'),
              callerId: $('#member-id').text(),
              signal: JSON.stringify(signal),
            });
          });

      window.peerCall = peerCall
    console.log(window);
    const h = $(window).height()
        const w = $(window).width() < 1200 ? $(window).width() : 1200
        const x = ($(window).width() - w) / 2
      const newWindow2 = window.open('/messenger/chat-audio', 'OH-2', `height=${h},width=${w},left=${x},top=${0}`);
      // popupWindow(`/messenger/chat-audio/${friendId}#call-audio`, 'OH Chat - Messenger')
      console.log(newWindow2);
      if (window.focus) {
        newWindow2.focus();
        newWindow2.typeCall = 'caller'
        newWindow2.parentWindow = window


        
        // newWindow2.signalPeer = signal,
        // newWindow2.peer = window.peerCall
      }
      window.newWindow2 = newWindow2
    })
    $(window).on('signalOffer', (e) => {
      console.log(window.offerSignal)
      console.log(e);
    })

    // create new peer
  // function createPeer(receiverId, callerId) {
  //   const peer = new SimplePeer({
  //     initiator: true, // init -> offer peer
  //     trickle: false
  //   });

  //   // add events
  //   peer.on('connect', () => console.log('call connection'));

  //   peer.on('close', () => console.log('call close'));

  //   // peer.on('track', (track, stream) => {
  //   //   console.log('call track');
  //   //   if (track.kind === 'audio') {
  //   //     outputAudio(stream);
  //   //   }
  //   // });

  //   peer.on('signal', (signal) => {
  //     socket.emit('msg-offerStreamAudio', {
  //       receiverId,
  //       callerId,
  //       signal: JSON.stringify(signal),
  //     });
  //   });

  //   return peer;
  // }

  // create a new peer (answer peer) to add peers
  // function addPeer(signal, callerId) {
  //   // outputShowMeeting(callerId, avatar, callerName);

  //   const peer = new SimplePeer({
  //     initiator: false, // no init -> answer peer
  //     trickle: false,
  //   });

  //   // add offer signal (signal receive from caller (new user join)) for peer
  //   // peer.signal(signal);

  //   // add events
  //   peer.on('connect', () => console.log('answer connect'));

  //   peer.on('close', () => {
  //     console.log('answer close');
  //   });

  //   peer.on('signal', (signal) => {
  //     socket.emit('answerStream', {
  //       signal: JSON.stringify(signal),
  //       callerId
  //     });
  //   });

  //   peer.on('stream', (stream) => {
  //     console.log('answer stream');
  //     if (stream.getVideoTracks().length >= 2) {
  //       outputShare(stream, callerId)
  //     }
  //   });

  //   peer.on('track', (track, stream) => {
  //     console.log('answer track');
  //     if (track.kind === 'video') {
  //       if (stream.getVideoTracks().length < 2) {
  //         outputVideo(stream, callerId);
  //       }
  //     } else if (track.kind === 'audio') {
  //       outputAudio(stream, callerId);
  //     }
  //   });

  //   return peer;
  // }


    function popupWindow(url, windowName, isCaller = true) {
      const h = $(window).height()
      const w = $(window).width() < 1200 ? $(window).width() : 1200
      const x = ($(window).width() - w) / 2
      const newWindow = window.open(url, windowName, `height=${h},width=${w},left=${x},top=${0}`);
      if (window.focus) {
        newWindow.focus();
        if (!isCaller) {
          newWindow.signalPeer = ''
        }
      }
      return false;
    }
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

  socket.on('msg-hasCallAudio', ({ signal, callerId }) => {
    window.signal = signal
    window.callerId = callerId

    $('.popup-has-call').removeClass('d-none')
  })

  socket.on('msg-as', ({ signal, callerId }) => {
    

        // $('#main-left-top').on('click', () => {
          // setTimeout(() => {
          //   // window.open('http://google.com')
            
        
        
          // }, 3000);
          
        // })

        // $('#main-left-top').trigger('click')

        window.newWindow2.signalPeer = signal,
        window.newWindow2.peer = window.peerCall

        window.newWindow2.dispatchEvent(new CustomEvent('changePeer'))
  })
  
  $('#btn-call-ok').on('click', () => {
    console.log('okokokokokokokokokokokookokokokokookokokokokokoko');
    const peerAnswer = new SimplePeer({
      initiator: false, // no init -> answer peer
      trickle: false,
    })
    peerAnswer.signal(window.signal)
    peerAnswer.on('signal', (signal) => {
      console.log('asdf asbfdasn f a sdf asdf as df asn  fn as n fd n as nfb asmndfnasdn fvf');
          socket.emit('msg-answerStream', {
            signal: JSON.stringify(signal),
            callerId: window.callerId
          });
        });

        const h = $(window).height()
        const w = $(window).width() < 1200 ? $(window).width() : 1200
        const x = ($(window).width() - w) / 2
        const newWindow = window.open('/messenger/chat-audio', 'OH', `height=${h},width=${w},left=${x},top=${0}`);
        console.log(window);
        console.log(newWindow);
        if (window.focus) {
          newWindow.focus();
          newWindow.signalPeer = window.signal,
          newWindow.peer = peerAnswer
          newWindow.typeCall = 'receiver'
        }
    });

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