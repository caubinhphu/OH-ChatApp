import axios from 'axios';
import '../global/chat-utils'

const Index = (async () => {
  const chatMain = document.getElementById('main-right-chat-content');
  const dragZone = document.querySelector('.dragzone')
  const msgForm = document.sendMsgForm; // form chat
  let hasMessenger = true // has old msg
  let currentPageChat = 0 // current page load old chat
  let allowLoadOld = true
  let currentPageGallery = 0
  let currentPageMediaGallery = 0

  const oldSearchFriRes = {}

  const classScBottom = '.scroll-bottom'

  let finalFiles = []
  let isDragging = 0;
  let isDragZone = false;
  let fileTake = null
  let holdRec = false

  const languageAssistant = $('#lang-assistant').text()
  const isChatMicVoice = $('#chat-mic-voice').text() === 'true' ? true : false
  const methodSend = $('#method-send').text()
  const isChatAssistant = $('#is-chat-ass').text() === 'true' ? true : false
  const directiveChatText = $('#directive-chat-text').text()

  const meId = $('#member-id').text()
  const titleSite = document.title

  // let isTalking = false
  let speakFor = ''
  let textNotify = ''
  let textCommand = ''
  let beConfirmed  = false
  let recognitionFor = 'msg'
  let isHoldStatus = true

  const textConfirm = languageAssistant === 'vi' ? 'Gửi: Có hay không?' : 'Send: Yes or No?'
  const textSended = languageAssistant === 'vi' ? 'Đã gửi' : 'Sended'
  const textNoSend = languageAssistant === 'vi' ? 'Không gửi' : 'Not send'
  const textCancel = languageAssistant === 'vi' ? 'Hủy' : 'cancel'
  const textYes = languageAssistant === 'vi' ? ['có', 'gửi', 'ok', 'ừ'] : ['yes', 'send', 'ok']

  const SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
  const SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;

  if (msgForm) {
    const soundMessage = new Audio('/sounds/message.mp3')

    const tokenSend = msgForm.elements._token.value
    // scroll bottom
    chatMain.scrollTop = chatMain.scrollHeight;

    const friendIdChatting = $('#main-right').attr('data-id')
    const $gallery = $('.gallery')
    const $galleryFile = $('#gallery-file')
    const $galleryMedia = $('#gallery-media')
    const $wrapGalleryFile = $('#wrap-gallery-file')
    const $wrapGalleryMedia = $('#wrap-gallery-media')
    const $mediaLoader = $('.wrap-loader-gallery')
    let galleryLoaded = false

    let timeEndRead = $('#main-right-chat-content').attr('data-timeend')
    if (!timeEndRead) {
      timeEndRead = new Date().toISOString()
    }

    window.socket.emit('msg-statusRead', {
      senderId: friendIdChatting,
      receiverId: meId,
      status: true
    })

    $(`.friend-item[data-id="${friendIdChatting}"] .last-msg`).removeClass('un-read')

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
        // console.log(command);
        // console.log('command: ', command);
        if (command) {
          if (speakFor === 'confirm') {
            beConfirmed = true
            speakFor = 'notification'
            if (textYes.includes(command.toLowerCase())) {
              const tmpId = new Date().valueOf()
              window.socket.emit('msg-messageChat', {
                message: textCommand,
                token: tokenSend,
              }, res => {
                if (res.status === 'ok') {
                  window.addMorelMsgLocal({
                    tmpId,
                    realId: res.msgId,
                    type: 'text'
                  })
                }
              });
              window.createCallMsgLocal(friendIdChatting, textCommand, '', false, true, tmpId)
              moveToTop(friendIdChatting)
              textNotify = textSended
            } else {
              textNotify = textNoSend
            }
            textCommand = ''
          } else {
            if (methodSend === 'auto-send') {
              const tmpId = new Date().valueOf()
              window.socket.emit('msg-messageChat', {
                message: command,
                token: tokenSend,
              }, res => {
                if (res.status === 'ok') {
                  window.addMorelMsgLocal({
                    tmpId,
                    realId: res.msgId,
                    type: 'text'
                  })
                }
              });
              window.createCallMsgLocal(friendIdChatting, command, '', false, true, tmpId)
              moveToTop(friendIdChatting)
            } else if (methodSend === 'confirm-popup') {
              const $popup = $('.confirm-popup')
              $popup.find('.msg-output').text(command)
              $popup.removeClass('d-none')
            } else if (methodSend === 'confirm-voice') {
              speakFor = 'confirm'
              textCommand = command
              // console.log(`${command}. ${textConfirm}`);
              speak(`${command}. ${textConfirm}`)
            }
          }
        }
      };

      recognition.onspeechend = function(e) {
        // console.log('onspeechend');
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
        // console.log('end recognition');
        // console.log('speakFor: ', speakFor);
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
          // console.log(command);
          // console.log($('.send-rec').hasClass('disabled'));
          if (!$('.send-rec').hasClass('disabled')) {
            const last = event.results.length - 1;
            const command = event.results[last][0].transcript;
            if (command) {
              // console.log(command);
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
        recognitionHold.start()
      }

      function speak(str) {
        utterThis.text = str
        synth.speak(utterThis);
      }

      if (!isChatMicVoice) {
        $('.send-rec').on('click', (e) => {
          e.preventDefault()
          if (!$('.send-rec').hasClass('disabled')) {
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
        $('.confirm-popup .btn-close').on('click', (e) => {
          e.preventDefault()
          $('.confirm-popup .msg-output').text('')
          $('.confirm-popup').addClass('d-none')
        })

        $('.confirm-popup .confirm-send-btn').on('click', (e) => {
          e.preventDefault()
          const $popup = $('.confirm-popup')
          const text = $popup.find('.msg-output').text()
          if (text) {
            const tmpId = new Date().valueOf()
            window.socket.emit('msg-messageChat', {
              message: text,
              token: tokenSend,
            }, res => {
              if (res.status === 'ok') {
                window.addMorelMsgLocal({
                  tmpId,
                  realId: res.msgId,
                  type: 'text'
                })
              }
            });
            window.createCallMsgLocal(friendIdChatting, window.escapeHtml(text), '', false, true, tmpId)
            moveToTop(friendIdChatting)
            $popup.find('.msg-output').text('')
            $('.confirm-popup').addClass('d-none')
          }
        })
      }

    } catch (error) {
      window.outputErrorMessage('Trình duyệt không hỡ trợ chức năng này')
    }
    function disableSendRec(flag = true) {
      if (flag) {
        $('button.send-rec').addClass('disabled').prop('disabled', true)
      } else {
        $('button.send-rec').removeClass('disabled').prop('disabled', false)
      }
    }
    // event submit form chat
    msgForm.addEventListener('submit', async (e) => {
      // stop submit form
      e.preventDefault();

      $('.files-upload-box').html('')

      // input message
      const inputMsg = e.target.elements.message;

      if (inputMsg.value !== '') {
        const tmpId = new Date().valueOf()
        // send message to server
        window.window.socket.emit('msg-messageChat', {
          message: inputMsg.value,
          token: tokenSend,
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
        window.createCallMsgLocal(friendIdChatting, window.escapeHtml(inputMsg.value), '', false, true, tmpId)
        moveToTop(friendIdChatting)

        // scroll bottom
        chatMain.scrollTop = chatMain.scrollHeight;

        // set value for input message
        inputMsg.value = '';

        // focus input message
        inputMsg.focus();
      }
      if (finalFiles.length) {
        await sendFile()
      }
    });


    $(document).on('change', '#send-file', function() {
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
        })
        $('.files-upload-box').append(html);
        // disabledInputFile()
        this.value = ''
      }
    })
  
    $(document).on('click', '.remove-up-file', function(e) {
      e.preventDefault()
      const $fileItem = $(this).parents('.file-item')
      const index = $fileItem.index()
      if (index >= 0) {
        finalFiles.splice(index, 1)
        $fileItem.remove()
        if (!finalFiles.length) {
          // enabledInputFile()
        }
      }
    })
  
    dragZone.addEventListener('dragenter', function(e) {
      e.preventDefault();
      e.stopPropagation()
      if(e.dataTransfer.types && e.dataTransfer.types[0] === 'Files') {
        isDragZone = true
        $(this).addClass('is-dragover')
      }
    })
  
    dragZone.addEventListener('dragleave', function(e) {
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
  
    dragZone.addEventListener('drop', function(e) {
      e.preventDefault();
      if (!$(this).hasClass('unable-chat')) {
        const { files } = e.dataTransfer
        // console.log(files);
        if (files.length) {
          let html = '';
          // console.log(files);
          [...files].forEach((file) => {
            html += `
              <div class="file-item">
                <span>${file.name}</span>
                <button class="btn btn-icon btn-red remove-up-file"><span class="icomoon icon-close"></span></button>
              </div>
            `
            finalFiles.push(file)
          })
          $('.files-upload-box').append(html);
          // disabledInputFile()
        }
        // console.log(finalFiles);
      }
    })
  
    document.addEventListener('dragover', e => {
      e.preventDefault();
      e.stopPropagation()
      if(e.dataTransfer.types && e.dataTransfer.types[0] === 'Files') {
        if (!$(dragZone).hasClass('unable-chat')) {
          isDragging++;
          if (isDragging === 1) {
            $('.dragzone').removeClass('d-none')
          }
        }
      }
    })
  
    document.addEventListener('dragleave', e => {
      e.preventDefault();
      e.stopPropagation()
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
          const responsive = await axios.get(`/messenger/chatold/?friendid=${friendIdChatting}&page=${currentPageChat + 1}&time=${timeEndRead}`);
          const { messages, hasMsg } = responsive.data;
          $('.wrap-loader-chat').addClass('d-none')
          currentPageChat++
          hasMessenger = hasMsg


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
                  contentHtml = `
                    <small class="message-content mx-0">
                      <div class="open-popup-image d-flex">
                        <img class="pre-img" src="${msg.content}" alt="${msg.fileName}" />
                      </div>
                    </small>
                  `  
                } else if (msg.type === 'video') {
                  contentHtml = `
                    <small class="message-content mx-0 d-flex">
                      <div class="open-popup-video d-flex">
                        <video class="pre-video" src="${msg.content}" autoplay loop data-file="${msg.fileName}"></video>
                      </div>
                    </small>
                  `  
                } else if (msg.type === 'audio') {
                  contentHtml = `<small class="message-content mx-0 d-flex"><audio class="pre-video pre-audio" controls src="${msg.content}"><audio/></small>`  
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
                } else if (msg.fileName) {
                  editText = `
                    <button class="btn btn-icon btn-green xs-btn download-file mr-1" title="Tải xuống" data-url="${msg.content}" data-file="${msg.fileName}">
                      <span class="icomoon icon-download"></span>
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
                <div class="message message-me text-right ml-auto ${msg.class}" data-id="${msg.id}">
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
                contentHtml = `
                  <small class="message-content">
                    <div class="open-popup-image d-flex">
                      <img class="pre-img" src="${msg.content}" alt="${msg.fileName}" />
                    </div>
                  </small>`  
              } else if (msg.type === 'video') {
                contentHtml = `
                  <small class="message-content d-flex">
                    <div class="open-popup-video d-flex">
                      <video class="pre-video" src="${msg.content}" autoplay loop data-file="${msg.fileName}"></video>
                    </div>
                  </small>
                `  
              } else if (msg.type === 'audio') {
                contentHtml = `<small class="message-content d-flex"><audio class="pre-video pre-audio" controls src="${msg.content}"><audio/></small>`  
              } else {
                contentHtml = `<small class="message-content"><a href="${msg.content}" target="_blank">${msg.fileName}</a></small>`
              }
            } else if (msg.isLink) {
              contentHtml = `<small class="message-content"><a href="${msg.content}" target="_blank">${msg.content}</a></small>`
            }
            let moreMsg = ''
            if (msg.fileName) {
              moreMsg = `
                <div class="wrap-msg-mana d-flex">
                  <button class="btn btn-icon btn-green xs-btn download-file mr-1" title="Tải xuống" data-url="${msg.content}" data-file="${msg.fileName}">
                    <span class="icomoon icon-download"></span>
                  </button>
                </div>
              `
            }
            return `
              <div class="message ${msg.class}" data-id="${msg.id}">
                <small class="message-time">${msg.time}</small>
                <div>
                  <div class="msg">
                    ${ moreMsg }
                    <img class="message-avatar" src="${msg.avatar}" alt="${msg.name}">
                    ${ contentHtml }
                    ${ timeEndCall }
                  </div>
                </div>
              </div>`
          }).join('')

          // prepend msg list and hold position scroll top of chat box
          const curScrollPos = this.scrollTop;
          const oldScroll = this.scrollHeight - this.clientHeight;
          $(this).prepend(htmlMsgs)
          window.addSendedClass()
          const newScroll = this.scrollHeight - this.clientHeight;
          this.scrollTop = curScrollPos + (newScroll - oldScroll);

          allowLoadOld = true
        } catch (error) {
          window.outputErrorMessage(error?.response?.data?.message)
        }
      } else if (this.scrollHeight - this.scrollTop >= this.clientHeight + 200) {
        $(classScBottom).addClass('is-show');
      } else {
        $(classScBottom).removeClass('is-show is-has-new-msg');
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
      const value = this.value.replace(/\s+/g, ' ').trim()
      clearTimeout(window.idTimeOutSearch)
      window.idTimeOutSearch = setTimeout(async () => {
        try {
          if (value && value !== window.oldSearch) {
            let friends = []
            if (oldSearchFriRes[value]) {
              friends = oldSearchFriRes[value]
            } else {
              const response = await axios.get('/messenger/search-friend', {
                params: {
                  q: value
                }
              })
  
              friends = response.data.friends
              oldSearchFriRes[value] = friends
            }
            window.oldSearch = value
            
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
    })

    // click outside search
    $(document).on('click', function(e) {
      const container = $("#main-left-search");
      // if the target of the click isn't the container nor a descendant of the container
      if (!container.is(e.target) && container.has(e.target).length === 0) {
        $('.search-fri-res-box').addClass('d-none')
        $('.loader-search').addClass('d-none')
      }
    });

    $('#modal-take-photo').on('shown.bs.modal', async () => {
      const { file, dataURL } = await window.takePicture()
      $('.photo-pre').html(`<img src="${dataURL}" alt="capture"/>`)
      $('.wrap-photo').removeClass('d-none')
      fileTake = file
    })

    $('#modal-take-photo').on('hidden.bs.modal', () => {
      fileTake = null
      $('.photo-pre').html('')
      $('.wrap-photo').addClass('d-none')
    })

    $('#send-photo-btn').on('click', async () => {
      if (fileTake) {
        $('#modal-take-photo').modal('hide')
        await sendFileSingle(fileTake)
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

    $('#gallery-btn').on('click', async function(e) {
      e.preventDefault()
      if ($gallery.hasClass('is-show')) {
        $gallery.removeClass('is-show')
      } else {
        $gallery.addClass('is-show')
        if (!galleryLoaded) {
          // load file
          $mediaLoader.removeClass('d-none')
          const { htmlGallery, hasGallery, gallery } = await loadGallery(currentPageGallery, 'file')
          currentPageGallery++
          htmlGallery.forEach(item => {
            $galleryFile.append(item)
          })
          $galleryFile.attr('data-hasfile', hasGallery)
          if (gallery.length) {
            $galleryFile.attr('data-timeend', gallery[0].timeReal)
          }
          if (hasGallery) {
            $wrapGalleryFile.append(`<button class="btn btn-link load-more-file">Xem thêm</button>`)
          }

          // load media
          const { htmlGallery: htmlGalleryMedia, hasGallery: hasGalleryMedia, gallery: galleryMedia } = await loadGallery(currentPageMediaGallery, 'media')
          currentPageMediaGallery++
          galleryLoaded = true
          htmlGalleryMedia.forEach(item => {
            $galleryMedia.append(item)
          })
          $galleryMedia.attr('data-hasfile', hasGalleryMedia)
          if (galleryMedia.length) {
            $galleryMedia.attr('data-timeend', galleryMedia[0].timeReal)
          }
          if (hasGalleryMedia) {
            $wrapGalleryMedia.append(`<button class="btn btn-link load-more-media">Xem thêm</button>`)
          }
          $mediaLoader.addClass('d-none')
        }
      }
    })

    $(document).on('click', (e) => {
      const $target = $(e.target)
      if (!$target.closest('#gallery-btn').length && !$target.closest('.gallery').length && $gallery.hasClass('is-show')) {
        $gallery.removeClass('is-show')
      }
    })

    $(document).on('click', '.load-more-file', async function(e) {
      e.preventDefault()
      if ($galleryFile.attr('data-hasfile') === 'true') {
        $mediaLoader.removeClass('d-none')
        const { htmlGallery, hasGallery } = await loadGallery(currentPageGallery, 'file', $galleryFile.attr('data-timeend'))
        currentPageGallery++
        htmlGallery.forEach(item => {
          $galleryFile.append(item)
        })
        $galleryFile.attr('data-hasfile', hasGallery)
        if (!hasGallery) {
          $(this).remove()
        }
        $mediaLoader.addClass('d-none')
      }
    })

    $(document).on('click', '.load-more-media', async function(e) {
      e.preventDefault()
      if ($galleryMedia.attr('data-hasfile') === 'true') {
        $mediaLoader.removeClass('d-none')
        const { htmlGallery, hasGallery } = await loadGallery(currentPageMediaGallery, 'media', $galleryMedia.attr('data-timeend'))
        currentPageMediaGallery++
        htmlGallery.forEach(item => {
          $galleryMedia.append(item)
        })
        $galleryMedia.attr('data-hasfile', hasGallery)
        if (!hasGallery) {
          $(this).remove()
        }
        $mediaLoader.addClass('d-none')
      }
    })

    async function loadGallery (page, type, timeEnd) {
      let timeEndRead = timeEnd
      if (!timeEnd) {
        timeEndRead = new Date().toISOString()
      }
      try {
        const responsive = await axios.get(`/messenger/gallery/?friendid=${friendIdChatting}&type=${type}&page=${page}&time=${timeEndRead}`);
        const { gallery, hasGallery } = responsive.data;
        // $('.wrap-loader-chat').addClass('d-none')

        const htmlGallery = gallery.map(item => formatHTMLGallery(item, type))

        return {
          htmlGallery,
          hasGallery,
          gallery
        }
      } catch (error) {
        window.outputErrorMessage(error?.response?.data?.message)
      }
    }

    function formatHTMLGallery(item, type) {
      if (type === 'file') {
        return `
          <div class="gallery-item gallery-file-item download-file" data-id="${item.id}" data-url="${item.url}" data-file="${item.name}">${item.name}</div>
        `
      }

      if (item.type === 'image') {
        return `
          <div class="gallery-item gallery-media-item open-popup-image type-bg bg"
            data-id="${item.id}" data-url="${item.url}" data-file="${item.name}"
            style="background-image: url('${item.url}')"
          >
          </div>
        `
      }
      return `
        <div class="gallery-item gallery-media-item open-popup-video" data-id="${item.id}">
          <video class="w-100 h-100" src="${item.url}" data-file="${item.name}">
          </video>
        </div>
      `
    }

    if (isChatMicVoice) {
      $('.send-rec').on('mousedown', function() {
        holdRec = true
        const $recBar = $(this).find('.rec-bar')
        $recBar.removeClass('d-none')
        window.timeRecHold = setTimeout(async () => {
          if (holdRec) {
            await window.recorderVoice($recBar)
          }
        }, 1000);
      });

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
    }

    $(window).on('endRecorderVoice', async (e) => {
      // console.log(e.detail.blob);
      await sendFileSingle(new File([e.detail.blob], 'recorder.webm'), true)
    })

    window.addEventListener('focus', () => {
      if (window.timeIdTitle) {
        clearInterval(window.timeIdTitle)
        document.title = titleSite
        window.timeIdTitle = null
      }
    })

    window.socket.on('msg-messenger-me', ({ receiverId, msg: msgObj, type, sender }) => {
      const $itemFri = $(`.friend-item[data-id="${receiverId}"]`)
      if (type === 'call-missed' || type === 'call-end') {
        if (friendIdChatting === receiverId) {
          // output message
          const msgMe = sender === 'caller'
          window.outputMessage(msgObj, msgMe);
          window.addMorelMsgCallLocal({
            msgId: msgObj.id,
            type: 'call',
          })
          $itemFri.find('.last-msg').removeClass('un-read')
        }
        moveToTop(receiverId, friendIdChatting === receiverId)
        $itemFri.find('.last-msg').html(
          `<small>${msgObj.message}</small><small>vài giây</small>`
        )
      } else {
        if (friendIdChatting === receiverId) {
          // output message
          window.outputMessage(msgObj, true);

          if (galleryLoaded && msgObj.type === 'file' && msgObj.resourceType !== 'audio') {
            const galleryItem = formatHTMLGallery(
              {
                id: msgObj.id,
                url: msgObj.message,
                name: msgObj.nameFile,
                type: msgObj.resourceType
              },
              msgObj.resourceType === 'raw' ? 'file' : 'media'
            )
            if (msgObj.resourceType === 'raw') {
              $galleryFile.prepend(galleryItem)
            } else {
              $galleryMedia.prepend(galleryItem)
            }
          }
          
          window.addMorelMsgLocal({
            tmpId: msgObj.id,
            realId: msgObj.id,
            type: msgObj.type,
            fileName: msgObj.nameFile,
            url: msgObj.message
          })
          $itemFri.find('.last-msg').removeClass('un-read')
        }
        moveToTop(receiverId, friendIdChatting === receiverId)
        if (msgObj.type && msgObj.type === 'file') {
          $itemFri.find('.last-msg').html(
            `<small>Bạn đã gửi 1 đính kèm</small><small>vài giây</small>`
          )
        } else {
          $itemFri.find('.last-msg').html(
            `<small>Bạn: ${msgObj.message}</small><small>vài giây</small>`
          )
        }
      }
    })

    // receive msg obj from server
    window.socket.on('msg-messenger', ({senderId, msg: msgObj}) => {
      if (!document.hasFocus()) {
        soundMessage.play()
        if (!window.timeIdTitle) {
          window.timeIdTitle = setInterval(() => {
            if (document.title === titleSite) {
              document.title = `${msgObj.username} đã gửi 1 tin nhắn cho bạn`
            } else {
              document.title = titleSite
            }
          }, 1500);
        }
      }
      const $itemFri = $(`.friend-item[data-id="${senderId}"]`)
      if (friendIdChatting === senderId) {
        // output message
        window.outputMessage(msgObj);

        if (galleryLoaded && msgObj.type === 'file' && msgObj.resourceType !== 'audio') {
          const galleryItem = formatHTMLGallery(
            {
              id: msgObj.id,
              url: msgObj.message,
              name: msgObj.nameFile,
              type: msgObj.resourceType
            },
            msgObj.resourceType === 'raw' ? 'file' : 'media'
          )
          if (msgObj.resourceType === 'raw') {
            $galleryFile.prepend(galleryItem)
          } else {
            $galleryMedia.prepend(galleryItem)
          }
        }

        if ($(classScBottom).hasClass('is-show')) {
          $(classScBottom).addClass('is-has-new-msg')          
        } else {
          // scroll bottom
          chatMain.scrollTop = chatMain.scrollHeight;
        }

        $itemFri.find('.last-msg').removeClass('un-read')
      } else {
        $itemFri.find('.last-msg').addClass('un-read')
      }
      moveToTop(senderId, friendIdChatting === senderId)

      window.socket.emit('msg-statusRead', {
        senderId,
        receiverId: meId,
        status: friendIdChatting === senderId
      })
      if (msgObj.type && msgObj.type === 'file') {
        $itemFri.find('.last-msg').html(
          `<small>${msgObj.username} đã gửi 1 đính kèm</small><small>vài giây</small>`
        )
      } else {
        $itemFri.find('.last-msg').html(
          `<small>${msgObj.message}</small><small>vài giây</small>`
        )
      }
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

    $(document).on('click', '.fri-mana-btn', function(e) {
      e.preventDefault()
      const $parent = $(this).parents('.friend-item')
      if (!$parent.hasClass('is-show')) {
        $('.friend-item').removeClass('is-show')
        $('.fri-mana-box').addClass('d-none')
        $parent.addClass('is-show')
        $parent.find('.fri-mana-box').removeClass('d-none')
      } else {
        $parent.removeClass('is-show')
        $parent.find('.fri-mana-box').addClass('d-none')
      }
    })

    $(document).on('click', function(e) {
      const $container = $(".friend-item.is-show .fri-mana-box");
      if (!$(e.target).closest('.fri-mana-box').is($container) && !$(e.target).closest('.fri-mana-btn').hasClass('fri-mana-btn')) {
        $container.parents('.friend-item').removeClass('is-show')
        $container.addClass('d-none')
      }
    });

    function moveToTop(dataId, isChangeActive = true) {
      const $wrap = $('#main-left-friends')
      const $item = $wrap.find(`.friend-item[data-id="${dataId}"]`)
      $wrap.prepend($item)
      if (isChangeActive) {
        $wrap.find(`.friend-item`).removeClass('is-active')
        $item.addClass('is-active')
      }
    }

    // function send file
    async function sendFile() {
      const formData = new FormData();
      const idSession = new Date().valueOf();
      finalFiles.forEach(file=>{
        formData.append('files', file);
        // create message obj to show in client
        window.createCallMsgLocal(
          friendIdChatting,
          `<a class="msg-file" target="_blank" data-session="${idSession}" href="#">${file.name}</a>`,
          'wrap-msg-file',
          false,
          true,
          new Date().valueOf()
        )
        moveToTop(friendIdChatting)
      });
      try {
        const res = await axios.post('/messenger/upload-file', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        $('#send-file').val('')
        finalFiles = []
        // enabledInputFile()
        const $msgFile = $(`.msg-file[data-session="${idSession}"]`)
        $msgFile.each((i, ele) => {
          const $parent = $(ele).parents('.message')
          const file = res.data.fileUrls.find(f => f.name === $(ele).text())
          if (file) {
            $(ele).parents('.wrap-msg-file').addClass('load-done')
            if (file.resourceType === 'image') {
              $(ele).parents('.message-content').html(`<div class="open-popup-image d-flex"><img class="pre-img" src="${file.url}" alt="${file.name}" /></div>`)
            } else if (file.resourceType === 'video') {
              $(ele).parents('.message-content').addClass('d-flex').html(`
                <div class="open-popup-video d-flex">
                  <video class="pre-video" src="${file.url}" autoplay loop data-file="${file.name}"></video>
                </div>
              `)
            } else if (file.resourceType === 'audio') {
              $(ele).parents('.message-content').addClass('d-flex').html(`<audio class="pre-video pre-audio" controls src="${file.url}"><audio/>`)
            } else {
              ele.href = file.url
            }
            // send message to server
            socket.emit('msg-messageChat', {
              message: file.url,
              type: 'file',
              nameFile: file.name,
              resourceType: file.resourceType,
              token: tokenSend
            }, res => {
              if (res.status === 'ok') {
                window.addMorelMsgLocal({
                  tmpId: $parent.attr('data-id'),
                  realId: res.msgId,
                  type: 'file',
                  fileName: file.name,
                  url: file.url
                })
                if (galleryLoaded && file.resourceType !== 'audio') {
                  const galleryItem = formatHTMLGallery(
                    {
                      id: res.msgId,
                      url: file.url,
                      name: file.name,
                      type: file.resourceType
                    },
                    file.resourceType === 'raw' ? 'file' : 'media'
                  )
                  if (file.resourceType === 'raw') {
                    $galleryFile.prepend(galleryItem)
                  } else {
                    $galleryMedia.prepend(galleryItem)
                  }
                }
              }
            });
          } else {
            $(ele).parents('.message').remove()
          }
        })
      } catch (error) {
        // console.dir(error);
        const $msgFile = $(`.msg-file[data-session="${idSession}"]`)
        $msgFile.parents('.message').remove()
        $('#send-file').val('')
        finalFiles = []
        // enabledInputFile()
        if (error.response && error.response.data && error.response.data.message) {
          window.outputErrorMessage(error.response.data.message)
        }
      }
    }

    async function sendFileSingle(file, audio = false) {
      const formData = new FormData();
      const idSession = new Date().valueOf();
      formData.append('files', file);
        // create message obj to show in client
        window.createCallMsgLocal(
          friendIdChatting,
          `<a class="msg-file" target="_blank" data-session="${idSession}" href="#">${file.name}</a>`,
          'wrap-msg-file',
          false,
          true,
          new Date().valueOf()
        )
        moveToTop(friendIdChatting)
      try {
        const res = await axios.post('/messenger/upload-file', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        // enabledInputFile()
        const $msgFile = $(`.msg-file[data-session="${idSession}"]`)
        $msgFile.each((i, ele) => {
          const $parent = $(ele).parents('.message')
          const file = res.data.fileUrls.find(f => f.name === $(ele).text())
          if (file) {
            $(ele).parents('.wrap-msg-file').addClass('load-done')
            if (file.resourceType === 'image') {
              $(ele).parents('.message-content').html(`<div class="open-popup-image d-flex"><img class="pre-img" src="${file.url}" alt="${file.name}" /></div>`)
            } else if (file.resourceType === 'video') {
              if (audio) {
                $(ele).parents('.message-content').addClass('d-flex').html(`<audio class="pre-video pre-audio" controls src="${file.url}"><audio/>`)
              } else {
                $(ele).parents('.message-content').addClass('d-flex').html(`
                  <div class="open-popup-video d-flex">
                    <video class="pre-video" src="${file.url}" autoplay loop data-file="${file.name}"></video>
                  </div>
                `) 
              }
            } else {
              ele.href = file.url
            }
            // send message to server
            socket.emit('msg-messageChat', {
              message: file.url,
              type: 'file',
              nameFile: file.name,
              resourceType: audio ? 'audio' : file.resourceType,
              token: tokenSend
            }, res => {
              if (res.status === 'ok') {
                window.addMorelMsgLocal({
                  tmpId: $parent.attr('data-id'),
                  realId: res.msgId,
                  type: 'file',
                  fileName: file.name,
                  url: file.url
                })

                if (galleryLoaded && !audio) {
                  const galleryItem = formatHTMLGallery(
                    {
                      id: res.msgId,
                      url: file.url,
                      name: file.name,
                      type: file.resourceType
                    },
                    'media'
                  )
                  if (file.resourceType === 'raw') {
                    $galleryFile.prepend(galleryItem)
                  } else {
                    $galleryMedia.prepend(galleryItem)
                  }
                }
              }
            });
          } else {
            $(ele).parents('.message').remove()
          }
        })
      } catch (error) {
        const $msgFile = $(`.msg-file[data-session="${idSession}"]`)
        $msgFile.parents('.message').remove()
        // enabledInputFile()
        if (error.response && error.response.data && error.response.data.message) {
          window.outputErrorMessage(error.response.data.message)
        }
      }
    }
  }
})()

export default Index