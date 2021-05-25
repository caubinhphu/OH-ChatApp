import moment from 'moment';
import axios from 'axios';

const Messenger = (async () => {
  const classChatMain = '.chat-mini-main'
  const nClassCloseMini = 'close-mini-chat'
  const classScroll = '.scroll-bottom'
  const nClassNoAct = 'not-active'
  const nClassAct = 'is-active'

  let isDragging = 0;
  let isDragZone = false;
  let fileTake = null
  let holdRec = false

  const oldSearchMiniRes = {}

  const languageAssistant = $('#lang-assistant').text()
  const isChatMicVoice = $('#chat-mic-voice').text() === 'true' ? true : false
  const methodSend = $('#method-send').text()
  const isChatAssistant = $('#is-chat-ass').text() === 'true' ? true : false
  const directiveChatText = $('#directive-chat-text').text()

  const titleSite = document.title

  // let isTalking = false
  let speakFor = ''
  let textNotify = ''
  let textCommand = ''
  let beConfirmed  = false
  let recognitionFor = 'msg'
  let isHoldStatus = false

  const textConfirm = languageAssistant === 'vi' ? 'Gửi: Có hay không?' : 'Send: Yes or No?'
  const textSended = languageAssistant === 'vi' ? 'Đã gửi' : 'Sended'
  const textNoSend = languageAssistant === 'vi' ? 'Không gửi' : 'Not send'
  const textCancel = languageAssistant === 'vi' ? 'Hủy' : 'cancel'
  const textYes = languageAssistant === 'vi' ? ['có', 'gửi', 'ok', 'ừ'] : ['yes', 'send', 'ok']

  const SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
  const SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;

  const meId = $('#member-id').text()
  const soundMessage = new Audio('/sounds/message.mp3')

  try {
    const grammar = '#JSGF V1.0;'
    const recognition = new SpeechRecognition();
    let recognitionHold = null;
    const speechRecognitionList = new SpeechGrammarList();
    speechRecognitionList.addFromString(grammar, 1);
    recognition.grammars = speechRecognitionList;
    recognition.lang = languageAssistant;
    recognition.interimResults = false;

    recognition.onresult = function(event) {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript;
      const $popup = $('.popup-chat-mini.is-active')
      if (command && $popup.length) {
        if (speakFor === 'confirm') {
          beConfirmed = true
          speakFor = 'notification'
          if (textYes.includes(command.toLowerCase())) {
            const tmpId = new Date().valueOf()
            window.socket.emit('msg-messageChat', {
              message: textCommand,
              token: $popup.find('input[name="_token"]').val(),
            }, res => {
              if (res.status === 'ok') {
                window.addMorelMsgLocal({
                  tmpId,
                  realId: res.msgId,
                  type: 'text'
                })
              }
            });
            window.createCallMsgLocalMini($popup.attr('data-id'), textCommand, '', false, true, tmpId)
            textNotify = textSended
          } else {
            textNotify = textNoSend
          }
          textCommand = ''
        } else {
          if (methodSend === 'auto-send') {
            // window.socket.emit('msg-messageChat', {
            //   message: command,
            //   token: tokenSend,
            // });
            const tmpId = new Date().valueOf()
            window.socket.emit('msg-messageChat', {
              message: command,
              token: $popup.find('input[name="_token"]').val()
            }, res => {
              if (res.status === 'ok') {
                window.addMorelMsgLocal({
                  tmpId,
                  realId: res.msgId,
                  type: 'text'
                })
              }
            });
            window.createCallMsgLocalMini($popup.attr('data-id'), command, '', false, true, tmpId)
          } else if (methodSend === 'confirm-popup') {
            const $popupConfirm = $popup.find('.confirm-popup')
            $popupConfirm.find('.msg-output').text(command)
            $popupConfirm.removeClass('d-none')
          } else if (methodSend === 'confirm-voice') {
            speakFor = 'confirm'
            textCommand = command
            speak(`${command}. ${textConfirm}`)
          }
        }
      }
    };

    recognition.onspeechend = () => {
      recognition.stop()
    };

    recognition.onend = function() {
      // console.log(speakFor);
      if (recognitionFor === 'confirm' && !beConfirmed) {
        speakFor = 'notification'
        textNotify = textNoSend
        textCommand = ''
      }
      if (methodSend === 'confirm-voice') {
        if (recognitionFor === 'confirm') {
          // isTalking = false
          disableSendRec(false)
          if (isChatAssistant && recognitionHold) {
            isHoldStatus = true
            recognitionHold.start()
          }
        }
        if (recognitionFor === 'msg' && !textCommand) {
          // isTalking = false
          disableSendRec(false)
          if (isChatAssistant && recognitionHold) {
            isHoldStatus = true
            recognitionHold.start()
          }
        }
      } else {
        // isTalking = false
        disableSendRec(false)
        if (isChatAssistant && recognitionHold) {
          isHoldStatus = true
          recognitionHold.start()
        }
      }
      
      beConfirmed = false
      if (speakFor === 'notification') {
        speak(textNotify)
        textNotify = ''
      }
    };

    recognition.onerror = function(event) {
      // console.log('error');
      // console.log('Error occurred in recognition: ' + event.error);
      if (event.error === 'no-speech') {
        window.outputErrorMessage('Bạn chưa nói gì!')
        if (speakFor === 'confirm') {
          speakFor = 'notification'
          textNotify = textCancel
          beConfirmed = true
        }
        if (recognitionFor === 'msg') {
          // isTalking = false
          disableSendRec(false)
          if (isChatAssistant && recognitionHold) {
            isHoldStatus = true
            recognitionHold.start()
          }
        }
      } else {
        window.outputErrorMessage(event.error)
        // isTalking = false
        disableSendRec(false)
        speakFor = ''
        textNotify = ''
        recognitionFor = 'msg'
        beConfirmed = false
        textCommand = ''
        if (isChatAssistant && recognitionHold) {
          isHoldStatus = true
          recognitionHold.start()
        }
      }
    }

    const synth = window.speechSynthesis;
    const utterThis = new SpeechSynthesisUtterance();
    
    const voices = await new Promise(rs => setTimeout(() => {
      rs(synth.getVoices())
    }, 100))

    const vEN = voices.find(v => v.lang === 'en-US');
    if (!vEN && languageAssistant !== 'vi') {
      throw new Error('Ngôn ngữ không hỗ trợ!')
    }
    let voice = vEN
    if (languageAssistant === 'vi') { 
      const vVN = voices.find(v => v.lang === 'vi-VN');
      if (vVN) {
        // console.log(vVN);
        voice = vVN
      } else {
        if (vEN) {
          voice = vEN
        } else {
          throw new Error('Ngôn ngữ không hỗ trợ!')
        }
      }
    }
    utterThis.voice = voice;
    utterThis.lang = languageAssistant;

    utterThis.onerror = () => {
      window.outputErrorMessage('Ngôn ngữ không hỗ trợ!')
      disableSendRec(false)
      speakFor = ''
      textNotify = ''
      recognitionFor = 'msg'
      beConfirmed = false
      textCommand = ''
    }

    utterThis.onend = () => {
      if (speakFor === 'confirm') {
        beConfirmed = false
        recognitionFor = 'confirm'
        window.soundRecord.play()
        recognition.start()
      } else {
        // speakFor = ''
      }
    }

    if (isChatAssistant && !isChatMicVoice) {
      recognitionHold = new SpeechRecognition();
      recognitionHold.grammars = speechRecognitionList;
      recognitionHold.lang = languageAssistant;
      recognitionHold.interimResults = false;

      recognitionHold.onresult = function(event) {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript;
        const $popup = $('.popup-chat-mini.is-active')
        // console.log(command);
        if ($popup.length &&  !$popup.find('.send-rec').hasClass('disabled')) {
          const last = event.results.length - 1;
          const command = event.results[last][0].transcript;
          if (command) {
            if (command.toLowerCase() === directiveChatText.toLowerCase()) {
              recognitionFor = 'msg'
              disableSendRec()
              isHoldStatus = false
              recognitionHold.stop()
              window.soundRecord.play()
              recognition.start()
              // console.log('start');
            }
          }
        }
      };

      recognitionHold.onspeechend = function(e) {
        // console.log('onspeechend');
        recognitionHold.stop()
      };

      recognitionHold.onend = function() {
        if (isHoldStatus) {
          recognitionHold.start()
        }
      };

      // recognitionHold.onerror = function(event) {
        
      // }
      // recognitionHold.start()
    }

    function speak(str) {
      utterThis.text = str
      synth.speak(utterThis);
    }

    $(window).on('changeStatusPopupMini', () => {
      const hasActive = $('.popup-chat-mini.is-active').length
      if (recognitionHold) {
        if (hasActive && !isHoldStatus) {
          isHoldStatus = true
          recognitionHold.start()
        } else if (!hasActive && isHoldStatus) {
          isHoldStatus = false
          recognitionHold.stop()
        }
      }
    })

    if (!isChatMicVoice) {
      $(document).on('click', '.send-rec', function (e) {
        e.preventDefault()
        if (!$(this).hasClass('disabled')) {
          recognitionFor = 'msg'
          // isTalking = true
          disableSendRec()
          if (isChatAssistant && recognitionHold && isHoldStatus) {
            recognitionHold.stop()
            isHoldStatus = false
          }
          window.soundRecord.play()
          recognition.start()
        }
      })
      $(document).on('click', '.confirm-popup .btn-close', function (e) {
        e.preventDefault()
        const $parent = $(this).parents('.confirm-popup')
        $parent.find('.msg-output').text('')
        $parent.addClass('d-none')
      })

      $(document).on('click', '.confirm-popup .confirm-send-btn', function(e) {
        e.preventDefault()
        const $popupConfirm = $(this).parents('.confirm-popup')
        const $popup = $popupConfirm.parents('.popup-chat-mini')
        const text = $popupConfirm.find('.msg-output').text()
        if (text) {
          const tmpId = new Date().valueOf()
          window.socket.emit('msg-messageChat', {
            message: text,
            token: $popup.find('input[name="_token"]').val(),
          }, res => {
            if (res.status === 'ok') {
              window.addMorelMsgLocal({
                tmpId,
                realId: res.msgId,
                type: 'text'
              })
            }
          });
          // create message obj to show in client
          createCallMsgLocalMini($popup.attr('data-id'), window.escapeHtml(text), '', false, true, tmpId)
          $popupConfirm.find('.msg-output').text('')
          $popupConfirm.addClass('d-none')
        }
      })
    }

  } catch (error) {
    window.outputErrorMessage('Trình duyệt không hỡ trợ chức năng này')
  }
  function disableSendRec(flag = true) {
    if (flag) {
      $('button.send-rec').addClass('disabled').prop('disabled', true)
      $('.popup-chat-mini.not-active').addClass('disabled')
      $('.mini-chat-btn').addClass('disabled').prop('disabled', true)
      $('.close-chat-btn').addClass('disabled').prop('disabled', true)
      $('.open-search-mini').addClass('disabled').prop('disabled', true)
    } else {
      $('button.send-rec').removeClass('disabled').prop('disabled', false)
      $('.popup-chat-mini.not-active').removeClass('disabled')
      $('.mini-chat-btn').removeClass('disabled').prop('disabled', false)
      $('.close-chat-btn').removeClass('disabled').prop('disabled', false)
      $('.open-search-mini').removeClass('disabled').prop('disabled', false)
    }
  }

  // receive msg obj from server
  window.socket.on('msg-messenger', async ({senderId, msg: msgObj, token}) => {
    if (!document.hasFocus()) {
      soundMessage.play()
      window.timeIdTitle = setInterval(() => {
        if (document.title === titleSite) {
          document.title = `${msgObj.username} đã gửi 1 tin nhắn cho bạn`
        } else {
          document.title = titleSite
        }
      }, 1500);
    }
    const activeLength = $('.wrap-chat-mini .popup-chat-mini.is-active').length
    if ($(`.popup-chat-mini[data-id=${senderId}]`).length) {
      const $popup = $(`.popup-chat-mini[data-id=${senderId}]`)
      const $chatMain = $popup.find(classChatMain)

      window.outputMessage(msgObj, false, $chatMain);

      if ($popup.find(classScroll).hasClass('is-show')) {
        $popup.find(classScroll).addClass('is-has-new-msg')
      } else {
        // scroll bottom
        window.scrollBottomChatBox($chatMain)
      }

      if ($popup.hasClass(nClassCloseMini)) {
        $popup.removeClass(nClassCloseMini)
        const classIsActive = (activeLength || $('.open-search-mini').hasClass('is-open')) ? nClassNoAct : nClassAct
        $popup.addClass(classIsActive)
        window.dispatchEvent(new CustomEvent('changeStatusPopupMini'))
        if (classIsActive === nClassNoAct) {
          outputPreviewMsg($popup, msgObj.message);
        } else {
          window.scrollBottomChatBox($chatMain)
        }
        window.socket.emit('msg-statusRead', {
          senderId,
          receiverId: meId,
          status: classIsActive === 'is-active'
        })
      } else if ($popup.hasClass(nClassNoAct)) {
        outputPreviewMsg($popup, msgObj.message);
      }
    } else {
      const classIsActive = (activeLength || $('.open-search-mini').hasClass('is-open')) ? nClassNoAct : nClassAct
      await createMiniPopup(senderId, msgObj, token, classIsActive)
      window.socket.emit('msg-statusRead', {
        senderId,
        receiverId: meId,
        status: classIsActive === 'is-active'
      })
      window.dispatchEvent(new CustomEvent('changeStatusPopupMini'))
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

  document.addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation()
    if(e.dataTransfer.types && e.dataTransfer.types[0] === 'Files') {
      isDragging++;
      if (isDragging === 1) {
        $('.popup-chat-mini.is-active .dragzone').removeClass('d-none')
      }
    }
  })

  document.addEventListener('dragleave', e => {
    e.preventDefault();
    e.stopPropagation()
    // console.log(e.target);
    if (!isDragZone && !e.relatedTarget) {
      $('.dragzone').addClass('d-none')
      isDragging = 0;
    }
  })

  document.addEventListener('drop', e => {
    e.preventDefault();
    isDragging = 0;
    $('.dragzone').addClass('d-none')
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
      window.dispatchEvent(new CustomEvent('changeStatusPopupMini'))
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
    $('.loader-search').removeClass('d-none')
    const value = this.value.replace(/\s+/g, ' ').trim()
    clearTimeout(window.idTimeOutSearchMini)
    window.idTimeOutSearchMini = setTimeout(async () => {
      try {
        if (value && window.oldSearch !== value) {
          let friends = []
          if (oldSearchMiniRes[value]) {
            friends = oldSearchMiniRes[value]
          } else {
            const response = await axios.get('/messenger/search-friend', {
              params: {
                q: value,
                mini: '1'
              }
            })

            friends = response.data.friends
            oldSearchMiniRes[value] = friends
          }
          window.oldSearch = value

          let html = friends.map(friend => `
            <div class="pre-search-item" data-id="${friend._id}" data-token="${friend.token}">
              <div class="d-flex align-items-center">
              <img class="rounded-circle" alt="${friend.name}" src="${friend.avatar}" title="${friend.name}" />
                <div class="wrap-pre-s-right">
                  <div class="name-member">${friend.name}</div>
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
          $('.b-s-m-result').html(html)
          $('.loader-search').addClass('d-none')
        } else {
          $('.loader-search').addClass('d-none')
        }
      } catch (error) {
        window.outputErrorMessage(error?.response?.data?.message)
        $('.loader-search').addClass('d-none')
      }
    }, 500)
  })

  // choose friend to chat from search results
  $(document).on('click', '.pre-search-item', async function() {
    const friendId = $(this).attr('data-id')
    const token = $(this).attr('data-token')
    const $popupMini = $(`.popup-chat-mini[data-id="${friendId}"]`)
    $('.box-search-mini').addClass('d-none')
    $('.open-search-mini').removeClass('is-open')
    if ($popupMini.length) {
      // is chatting
      $('.popup-chat-mini.is-active').removeClass(nClassAct).addClass(nClassNoAct)
      $popupMini.removeClass(nClassNoAct).removeClass(nClassCloseMini).addClass(nClassAct)
      window.dispatchEvent(new CustomEvent('changeStatusPopupMini'))
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
      )
      window.dispatchEvent(new CustomEvent('changeStatusPopupMini'))
    }
  })

  $('#modal-take-photo').on('shown.bs.modal', async () => {
    const { file, dataURL } = await window.takePicture()
    $('.photo-pre').html(`<img src="${dataURL}" alt="capture"/>`)
    $('.wrap-photo').removeClass('d-none')
    fileTake = file
    // console.log(file);
  })

  $('#modal-take-photo').on('hidden.bs.modal', () => {
    fileTake = null
    $('.photo-pre').html('')
    $('.wrap-photo').addClass('d-none')
  })

  $('#send-photo-btn').on('click', async () => {
    if (fileTake) {
      $('#modal-take-photo').modal('hide')
      const $pop = $('.popup-chat-mini.is-active')
      if ($pop.length) {
        await sendFileSingle(fileTake, $pop)
      }
    }
  })

  $('#re-take-btn').on('click', async () => {
    $('.photo-pre').html('')
    $('.wrap-photo').addClass('d-none')
    const { file, dataURL } = await window.takePicture()
    $('.photo-pre').html(`<img src="${dataURL}" alt="capture"/>`)
    $('.wrap-photo').removeClass('d-none')
    fileTake = file
  })

  $(document).on('mouseup', (e) => {
    const $recBar = $('.rec-bar')
    if (holdRec) {
      holdRec = false
      clearTimeout(window.timeRecHold)
      $recBar.addClass('d-none').find('.rec-time').html('0:00')
      if ($(e.target).hasClass('rec-cancel')) {
        window.stopRecorderVoice(true)
      } else {
        window.stopRecorderVoice()
      }
    }
  })

  $(window).on('endRecorderVoice', async (e) => {
    const $pop = $('.popup-chat-mini.is-active')
    if ($pop.length) {
      await sendFileSingle(new File([e.detail.blob], 'recorder.webm'), $pop, true)
    }
  })

  // function create new chat box mini
  async function createMiniPopup(senderId, msgObj, token, classIsActive) {
    const html = `
    <div class="popup-chat-mini d-flex flex-column ps-rv ${ classIsActive }"
      data-id="${senderId}" data-page="0" data-hasMsg="1" data-allow-load="1"
    >
      <div class="dragzone d-none">
        <div class="d-flex justify-content-center align-items-center h-100 drag-inner">
          <div>
            <div class="text-center"><span class="icomoon icon-insert_drive_file"></span></div>
            <h4>Kéo thả tệp vào đây</h4>
          </div>
        </div>
      </div>
      <div class="wrap-loader-mini">
        <div class="d-flex justify-content-center align-items-center h-100">
          <img src="/images/loader.svg" alt="loader" />
        </div>
      </div>
      <div class="scroll-bottom text-center"><div class="has-new-msg">Tin nhắn mới</div><span class="icomoon icon-circle-down"></span></div>
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
                <div class="mini-status">Đang không hoạt động</div>
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
        <div class="files-upload-box d-flex justify-content-center flex-wrap"></div>
        <form class="d-flex ps-rv align-items-center">
          <label class="btn btn-default send-file m-0 p-2" for="send-file-${senderId}" title="Chọn tệp">
            <span class="icomoon icon-insert_drive_file"></span>
          </label>
          <input class="d-none send-file-input" id="send-file-${senderId}" type="file" name="file" multiple="multiple">
          <button class="btn btn-default send-take-photo m-0 p-2" data-toggle="modal" data-target="#modal-take-photo" title="Chụp ảnh">
            <span class="icomoon icon-camera"></span>
          </button>
          <button class="btn btn-default send-rec m-0 p-2 ps-rv" title="Ghi âm">
            <span class="icomoon icon-mic"></span>
            <div class="rec-bar d-none">
              <div class="d-flex align-items-center justify-content-around">
                <span class="icomoon icon-close rec-cancel"></span>
                <span class="rec-time">0:00</span>
              </div>
            </div>
          </button>
          <button class="btn btn-default open-emojis" type="button" title="Biểu tượng cảm xúc">&#128512;</button>
          <input type="hidden" name="_token" value="${token}">
            <div class="flex-fill wrap-msg-box ps-rv">
              <textarea class="form-control msg-mini" type="text" name="message" placeholder="Nhập tin nhắn" autocomplete="off"></textarea>
            </div>
            <button class="btn btn-default text-secondary" title="Gửi">
              <span class="icomoon icon-send"></span>
            </button>
          <div class="confirm-popup ps-rv d-none">
            <div class="msg-output"></div>
            <div class="text-center"><button class="btn confirm-send-btn" type="button">Gửi</button></div><button
              class="btn btn-icon small-btn btn-red btn-close" type="button"><span
                class="icomoon icon-close rec-cancel"></span></button>
          </div>
        </form>
      </div>
    </div>
    `;
    $('.wrap-chat-mini').append(html)

    const $popup = $(`.popup-chat-mini[data-id=${senderId}]`)
    let finalFiles = []

    if (classIsActive === nClassNoAct) {
      outputPreviewMsg($popup, msgObj.message);
    }

    await loadOldMsg($popup)
    $popup.find('.wrap-loader-mini').addClass('d-none')

    window.emojisForMiniChat($popup)

    // event submit form chat
    $popup.find('form').on('submit', async (e) => {
      // stop submit form
      e.preventDefault();

      $popup.find('.files-upload-box').html('')

      // input message
      const inputMsg = e.target.elements.message;

      if (inputMsg.value !== '') {
        const tmpId = new Date().valueOf()
        // send message to server
        window.socket.emit('msg-messageChat', {
          message: inputMsg.value,
          token: e.target.elements._token.value,
        }, res => {
          if (res.status === 'ok') {
            window.addMorelMsgLocal({
              tmpId,
              realId: res.msgId,
              type: 'text'
            })
          }
        });

        // create message obj to show in client
        createCallMsgLocalMini($popup.attr('data-id'), window.escapeHtml(inputMsg.value), '', false, true, tmpId)

        // scroll bottom
        // $chatMain.get(0).scrollTop = $chatMain.get(0).scrollHeight;

        // set value for input message
        inputMsg.value = '';

        // focus input message
        inputMsg.focus();
      }

      if (finalFiles.length) {
        await sendFile($popup, finalFiles)
        $popup.find('.send-file-input').val('')
        finalFiles = []
      }
    });

    if (isChatMicVoice) {
      $popup.find('.send-rec').on('mousedown', function() {
        holdRec = true
        const $recBar = $(this).find('.rec-bar')
        $recBar.removeClass('d-none')
        window.timeRecHold = setTimeout(async () => {
          if (holdRec) {
            await window.recorderVoice($recBar)
          }
        }, 1000);
      });
    }

    $popup.find('.send-file-input').on('change', function() {
      if (this.files.length) {
        let html = '';
        [...this.files].forEach(file => {
          html += `
            <div class="file-item">
              <span>${file.name}</span>
              <button class="btn btn-icon btn-red remove-up-file"><span class="icomoon icon-close"></span></button>
            </div>
          `
          finalFiles.push(file)
          // console.log($popup);
          // console.log(finalFiles);
        })
        $popup.find('.files-upload-box').append(html);
        // disabledInputFile()
        this.value = ''
      }
    })

    $(document).on('click',  '.remove-up-file', function(e) {
      e.preventDefault()
      if ($popup.has(this).length) {
        const $fileItem = $(this).parents('.file-item')
        const index = $fileItem.index()
        if (index >= 0) {
          finalFiles.splice(index, 1)
          $fileItem.remove()
          if (!finalFiles.length) {
            // enabledInputFile()
          }
        }
      }
    })

    $popup.find('.dragzone').get(0).addEventListener('dragenter', e => {
      e.preventDefault();
      e.stopPropagation()
      if(e.dataTransfer.types && e.dataTransfer.types[0] === 'Files') {
        isDragZone = true
        $(this).addClass('is-dragover')
      }
    })
  
    $popup.find('.dragzone').get(0).addEventListener('dragleave', e => {
      e.preventDefault();
      e.stopPropagation()
      isDragZone = false
      if (!e.relatedTarget) {
        $(this).addClass('d-none').removeClass('is-dragover')
        isDragging = 0;
      } else if (!$(this).has(e.relatedTarget).length) {
        $(this).removeClass('is-dragover')
      }
    })
  
    $popup.find('.dragzone').get(0).addEventListener('drop', function(e) {
      e.preventDefault();
      const { files } = e.dataTransfer
      if (files.length) {
        let html = '';
        [...files].forEach((file) => {
          html += `
            <div class="file-item">
              <span>${file.name}</span>
              <button class="btn btn-icon btn-red remove-up-file"><span class="icomoon icon-close"></span></button>
            </div>
          `
          finalFiles.push(file)
        })
        $popup.find('.files-upload-box').append(html);
        // disabledInputFile()
      }
    })

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
        $popup.find(classScroll).removeClass('is-show is-has-new-msg');
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
      window.dispatchEvent(new CustomEvent('changeStatusPopupMini'))
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
      window.dispatchEvent(new CustomEvent('changeStatusPopupMini'))
      if ($popup.attr('data-unread') === '1') {
        window.socket.emit('msg-statusRead', {
          senderId,
          receiverId: meId,
          status: true
        })
        $popup.attr('data-unread', '0')
      }
    });

    // close mini chat
    $popup.find('.close-chat-btn').on('click', () => {
      $popup.addClass(nClassCloseMini)
      $popup.removeClass(nClassAct)
      window.dispatchEvent(new CustomEvent('changeStatusPopupMini'))
    });

    // call audio
    $popup.find('.call-friend-btn').on('click', () => {
      window.callFriend($popup.attr('data-id'))
    });

    // call video
    $popup.find('.video-friend-btn').on('click', () => {
      window.callFriend($popup.attr('data-id'), 'video')
    });

    window.addEventListener('focus', () => {
      if (window.timeIdTitle) {
        clearInterval(window.timeIdTitle)
        document.title = titleSite
        window.timeIdTitle = null
      }
    })
  }

  // function create call msg local mini chat
  function createCallMsgLocalMiniChat(friendId, msg = '', className = '', isCallEnd = false, me = false, tmpId = '') {
    const $popup = $(`.popup-chat-mini[data-id=${friendId}]`)
    if ($popup.length) {
      createCallMsgLocalMini(friendId, msg, className, isCallEnd, me, tmpId)
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
  function createCallMsgLocalMini(friendId, msg = '', className = '', isCallEnd = false, me = false, tmpId = '') {
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
          timeCall,
          id: tmpId
        }, true, $chatBox.find(classChatMain))
        window.scrollBottomChatBox($chatBox.find(classChatMain))
      } else {
        window.outputMessage({
          time,
          username: $chatBox.find('.mini-name').text(),
          message: msg,
          avatar: $chatBox.find('.avatar-mini').attr('src'),
          className,
          timeCall,
          id: tmpId
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
        const { messages, hasMsg, friendStatus } = responsive.data;
        // $('.wrap-loader-chat').addClass('d-none')
        $popup.attr('data-page', currentPage + 1)
        $popup.attr('data-hasMsg', hasMsg ? '1' : '0')

        if (friendStatus === 'online') {
          $popup.addClass('is-online')
          $popup.find('.mini-status').html('Đang hoạt động')
        } else {
          $popup.removeClass('is-online')
          $popup.find('.mini-status').html('Đang không hoạt động')
        }

        const htmlMsgs = messages.map(msg => {
          if (msg.class === 'msg-start') {
            return  `
              <div class="message text-center ${msg.class}">
                ${msg.content}
              </div>`
          }
          const timeEndCall = msg.timeCall ? `<small class="time-call">${msg.timeCall}</small>` : ''
          if (msg.me) {
            let contentHtml = `<small class="message-content mx-0">${msg.content}</small>`
            if (msg.fileName) {
              if (msg.type === 'image') {
                contentHtml = `<small class="message-content mx-0"><a href="${msg.content}" target="_blank" title="${msg.fileName}"><img class="pre-img" src="${msg.content}" alt="${msg.fileName}" /></a></small>`  
              } else if (msg.type === 'video') {
                contentHtml = `<small class="message-content mx-0 d-flex"><video class="pre-video" controls src="${msg.content}"></video/></small>`  
              } else if (msg.type === 'audio') {
                contentHtml = `<small class="message-content mx-0 d-flex"><audio class="pre-video pre-audio" controls src="${msg.content}"></audio/></small>`  
              } else {
                contentHtml = `<small class="message-content mx-0"><a href="${msg.content}" target="_blank">${msg.fileName}</a></small>`
              }
            } else if (msg.isLink) {
              contentHtml = `<small class="message-content mx-0"><a href="${msg.content}" target="_blank">${msg.content}</a></small>`
            }
            let moreMsg = ''
            if (msg.type !== 'deleted') {
              let editText = ''
              if (msg.type === 'text' || msg.type === 'edited') {
                editText = `
                  <button class="btn btn-icon btn-purple xs-btn edit-msg mr-1" title="Sửa tin nhắn">
                    <span class="icomoon icon-icon-edit"></span>
                  </button>
                `
              }
              moreMsg = `
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
            }
            return `
              <div class="message text-right ml-auto ${msg.class}" data-id="${msg.id}">
                <small class="message-time">${msg.time}</small>
                <div>
                  <div class="msg-me ps-rv">
                    ${ moreMsg }
                    ${ contentHtml }
                    ${ timeEndCall }
                  </div>
                </div>
              </div>`
          }
          let contentHtml = `<small class="message-content">${msg.content}</small>`
          if (msg.fileName) {
            if (msg.type === 'image') {
              contentHtml = `<small class="message-content"><a href="${msg.content}" target="_blank" title="${msg.fileName}"><img class="pre-img" src="${msg.content}" alt="${msg.fileName}" /></a></small>`  
            } else if (msg.type === 'video') {
              contentHtml = `<small class="message-content d-flex"><video class="pre-video" controls src="${msg.content}"></video></small>`  
            } else if (msg.type === 'audio') {
              contentHtml = `<small class="message-content d-flex"><audio class="pre-video pre-audio" controls src="${msg.content}"></audio></small>`  
            } else {
              contentHtml = `<small class="message-content"><a href="${msg.content}" target="_blank">${msg.fileName}</a></small>`
            }
          } else if (msg.isLink) {
            contentHtml = `<small class="message-content"><a href="${msg.content}" target="_blank">${msg.content}</a></small>`
          }
          return `
            <div class="message ${msg.class}" data-id="${msg.id}">
              <small class="message-time">${msg.time}</small>
              <div>
                <div class="msg">
                  <img class="message-avatar" src="${msg.avatar}" alt="${msg.name}">
                  ${ contentHtml }
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
        window.outputErrorMessage(error?.response?.data?.message)
      }
    }
  }

  function outputPreviewMsg($popup, msg) {
    $popup.attr('data-unread', '1')
    $popup.find('.preview-msg span').html(msg)
    $popup.find('.preview-msg').addClass('is-show')
    window.socket.emit('msg-statusRead', {
      senderId: $popup.attr('data-id'),
      receiverId: meId,
      status: false
    })
    setTimeout(() => {
      $popup.find('.preview-msg').removeClass('is-show')
    }, 2000);
  }

  // function send file
  async function sendFile($popup, finalFiles) {
    const formData = new FormData();
    const idSession = new Date().valueOf();
    finalFiles.forEach(file=>{
      formData.append('files', file);
      // create message obj to show in client
      createCallMsgLocalMini(
        $popup.attr('data-id'),
        `<a class="msg-file" target="_blank" data-session="${idSession}" href="#">${file.name}</a>`,
        'wrap-msg-file',
        false,
        true,
        new Date().valueOf()
      )
    });
    try {
      const res = await axios.post('/messenger/upload-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      // $popup.find('.send-file-input').val('')
      // finalFiles = []
      // enabledInputFile()
      const $msgFile = $popup.find(`.msg-file[data-session="${idSession}"]`)
      $msgFile.each((i, ele) => {
        const $parent = $(ele).parents('.message')
        const file = res.data.fileUrls.find(f => f.name === $(ele).text())
        if (file) {
          $(ele).parents('.wrap-msg-file').addClass('load-done')
          if (file.resourceType === 'image') {
            $(ele).parents('.message-content').html(`<a href="${file.url}" target="_blank" title="${file.name}"><img class="pre-img" src="${file.url}" alt="${file.name}" /></a>`)
          } else if (file.resourceType === 'video') {
            $(ele).parents('.message-content').addClass('d-flex').html(`<video class="pre-video" controls src="${file.url}"></video>`)
          } else if (file.resourceType === 'audio') {
            $(ele).parents('.message-content').addClass('d-flex').html(`<audio class="pre-video pre-audio" controls src="${file.url}"></audio>`)
          } else {
            ele.href = file.url
          }
          // send message to server
          socket.emit('msg-messageChat', {
            message: file.url,
            type: 'file',
            nameFile: file.name,
            resourceType: file.resourceType,
            token: $popup.find('input[name="_token"]').val()
          }, res => {
            if (res.status === 'ok') {
              window.addMorelMsgLocal({
                tmpId: $parent.attr('data-id'),
                realId: res.msgId,
                type: 'file'
              })
            }
          });
        } else {
          $(ele).parents('.message').remove()
        }
      })
    } catch (error) {
      console.dir(error);
      const $msgFile = $popup.find(`.msg-file[data-session="${idSession}"]`)
      $msgFile.parents('.message').remove()
      // $popup.find('.send-file-input').val('')
      // finalFiles = []
      // enabledInputFile()
      if (error.response && error.response.data && error.response.data.message) {
        window.outputErrorMessage(error.response.data.message)
      }
    }
  }

  async function sendFileSingle(file, $popup, audio = false) {
    const formData = new FormData();
    const idSession = new Date().valueOf();
    formData.append('files', file);
    // create message obj to show in client
    createCallMsgLocalMini(
      $popup.attr('data-id'),
      `<a class="msg-file" target="_blank" data-session="${idSession}" href="#">${file.name}</a>`,
      'wrap-msg-file',
      false,
      true,
      new Date().valueOf()
    )
    try {
      const res = await axios.post('/messenger/upload-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      // $popup.find('.send-file-input').val('')
      // finalFiles = []
      // enabledInputFile()
      const $msgFile = $popup.find(`.msg-file[data-session="${idSession}"]`)
      $msgFile.each((i, ele) => {
        const $parent = $(ele).parents('.message')
        const fileFind = res.data.fileUrls.find(f => f.name === $(ele).text())
        if (fileFind) {
          $(ele).parents('.wrap-msg-file').addClass('load-done')
          if (fileFind.resourceType === 'image') {
            $(ele).parents('.message-content').html(`<a href="${fileFind.url}" target="_blank" title="${fileFind.name}"><img class="pre-img" src="${fileFind.url}" alt="${fileFind.name}" /></a>`)
          } else if (fileFind.resourceType === 'video') {
            if (audio) {
              $(ele).parents('.message-content').addClass('d-flex').html(`<audio class="pre-video pre-audio" controls src="${fileFind.url}"><audio/>`)
            } else {
              $(ele).parents('.message-content').addClass('d-flex').html(`<video class="pre-video" controls src="${fileFind.url}"></video>`) 
            }
          } else {
            ele.href = fileFind.url
          }
          // send message to server
          socket.emit('msg-messageChat', {
            message: fileFind.url,
            type: 'file',
            nameFile: fileFind.name,
            resourceType: audio ? 'audio' : fileFind.resourceType,
            token: $popup.find('input[name="_token"]').val()
          }, res => {
            if (res.status === 'ok') {
              window.addMorelMsgLocal({
                tmpId: $parent.attr('data-id'),
                realId: res.msgId,
                type: 'file'
              })
            }
          });
        } else {
          $(ele).parents('.message').remove()
        }
      })
    } catch (error) {
      // console.dir(error);
      const $msgFile = $popup.find(`.msg-file[data-session="${idSession}"]`)
      $msgFile.parents('.message').remove()
      // $popup.find('.send-file-input').val('')
      // finalFiles = []
      // enabledInputFile()
      if (error.response && error.response.data && error.response.data.message) {
        window.outputErrorMessage(error.response.data.message)
      }
    }
  }
})()

export default Messenger
