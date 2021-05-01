import axios from 'axios';
import '../global/chat-utils'

const Index = (async () => {
  const chatMain = document.getElementById('main-right-chat-content');
  const dragZone = document.querySelector('.dragzone')
  const msgForm = document.sendMsgForm; // form chat
  let hasMessenger = true // has old msg
  let currentPageChat = 0 // current page load old chat
  let allowLoadOld = true

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

  // let isTalking = false
  let speakFor = ''
  let textNotify = ''
  let textCommand = ''
  let beConfirmed  = false
  let recognitionFor = 'msg'

  const textConfirm = languageAssistant === 'vi' ? 'Gửi: Có hay không?' : 'Send: Yes or No?'
  const textSended = languageAssistant === 'vi' ? 'Đã gửi' : 'Sended'
  const textNoSend = languageAssistant === 'vi' ? 'Không gửi' : 'Not send'
  const textCancel = languageAssistant === 'vi' ? 'Hủy' : 'cancel'
  const textYes = languageAssistant === 'vi' ? ['có', 'gửi', 'ok', 'ừ'] : ['yes', 'send', 'ok']

  const tokenSend = msgForm.elements._token.value

  const SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
  const SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;

  if (msgForm) {
    // scroll bottom
    chatMain.scrollTop = chatMain.scrollHeight;

    const friendIdChatting = $('#main-right').attr('data-id')

    try {
      const grammar = '#JSGF V1.0;'
      const recognition = new SpeechRecognition();
      const speechRecognitionList = new SpeechGrammarList();
      speechRecognitionList.addFromString(grammar, 1);
      recognition.grammars = speechRecognitionList;
      recognition.lang = languageAssistant;
      recognition.interimResults = false;
      // recognition.continuous = true


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
              window.socket.emit('msg-messageChat', {
                message: textCommand,
                token: tokenSend,
              });
              window.createCallMsgLocal(friendIdChatting, textCommand, '', false, true)
              textNotify = textSended
            } else {
              textNotify = textNoSend
            }
            textCommand = ''
          } else {
            if (methodSend === 'auto-send') {
              window.socket.emit('msg-messageChat', {
                message: command,
                token: tokenSend,
              });
              window.createCallMsgLocal(friendIdChatting, command, '', false, true)
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
          }
          if (recognitionFor === 'msg' && !textCommand) {
            // isTalking = false
            disableSendRec(false)
          }
        } else {
          // isTalking = false
          disableSendRec(false)
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
          console.log(vVN);
          voice = vVN
        } else {
          if (vEN) {
            voice = vEN
          } else {
            throw new Error('Ngôn ngữ không hỗ trợ!')
          }
        }
      }
      utterThis.voice = voices[22];
      utterThis.lang = 'en';

      utterThis.onend = () => {
        if (speakFor === 'confirm') {
          beConfirmed = false
          recognitionFor = 'confirm'
          recognition.start()
        } else {
          // speakFor = ''
        }
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
            window.socket.emit('msg-messageChat', {
              message: text,
              token: tokenSend,
            });
            window.createCallMsgLocal(friendIdChatting, window.escapeHtml(text), '', false, true)
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
        // send message to server
        window.window.socket.emit('msg-messageChat', {
          message: inputMsg.value,
          token: tokenSend,
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
  
    dragZone.addEventListener('dragenter', e => {
      e.preventDefault();
      e.stopPropagation()
      isDragZone = true
    })
  
    dragZone.addEventListener('dragleave', e => {
      e.preventDefault();
      e.stopPropagation()
      isDragZone = false
    })
  
    dragZone.addEventListener('drop', function(e) {
      e.preventDefault();
      if (!$(this).hasClass('unable-chat')) {
        const { files } = e.dataTransfer
        // console.log(files);
        if (files.length) {
          let html = '';
          console.log(files);
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
      if (!$(dragZone).hasClass('unable-chat')) {
        isDragging++;
        if (isDragging === 1) {
          $('.dragzone').removeClass('d-none')
        }
      }
    })
  
    document.addEventListener('dragleave', e => {
      e.preventDefault();
      e.stopPropagation()
      if (!isDragZone) {
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
          const responsive = await axios.get(`/messenger/chatold/?friendid=${friendIdChatting}&page=${currentPageChat + 1}`);
          const { messages, hasMsg } = responsive.data;
          $('.wrap-loader-chat').addClass('d-none')
          currentPageChat++
          hasMessenger = hasMsg


          const htmlMsgs = messages.map(msg => {
            const timeEndCall = msg.timeCall ? `<small class="time-call">${msg.timeCall}</small>` : ''
            if (msg.me) {
              let contentHtml = `<small class="message-content mx-0">${msg.content}</small>`
              if (msg.fileName) {
                if (msg.type === 'image') {
                  contentHtml = `<small class="message-content mx-0"><img class="pre-img" src="${msg.content}" alt="${msg.fileName}" /></small>`  
                } else if (msg.type === 'video') {
                  contentHtml = `<small class="message-content mx-0 d-flex"><video class="pre-video" controls src="${msg.content}"></video></small>`  
                } else if (msg.type === 'audio') {
                  contentHtml = `<small class="message-content mx-0 d-flex"><audio class="pre-video pre-audio" controls src="${msg.content}"><audio/></small>`  
                } else {
                  contentHtml = `<small class="message-content mx-0"><a href="${msg.content}" target="_blank">${msg.fileName}</a></small>`
                }
              } else if (msg.isLink) {
                contentHtml = `<small class="message-content mx-0"><a href="${msg.content}" target="_blank">${msg.content}</a></small>`
              }
              return `
                <div class="message text-right ${msg.class}">
                  <small class="message-time">${msg.time}</small>
                  <div>
                    <div class="msg-me">
                      ${ contentHtml }
                      ${ timeEndCall }
                    </div>
                  </div>
                </div>`
            }
            let contentHtml = `<small class="message-content">${msg.content}</small>`
            if (msg.fileName) {
              if (msg.type === 'image') {
                contentHtml = `<small class="message-content"><img class="pre-img" src="${msg.content}" alt="${msg.fileName}" /></small>`  
              } else if (msg.type === 'video') {
                contentHtml = `<small class="message-content d-flex"><video class="pre-video" controls src="${msg.content}"></video></small>`  
              } else if (msg.type === 'audio') {
                contentHtml = `<small class="message-content d-flex"><audio class="pre-video pre-audio" controls src="${msg.content}"><audio/></small>`  
              } else {
                contentHtml = `<small class="message-content"><a href="${msg.content}" target="_blank">${msg.fileName}</a></small>`
              }
            } else if (msg.isLink) {
              contentHtml = `<small class="message-content"><a href="${msg.content}" target="_blank">${msg.content}</a></small>`
            }
            return `
              <div class="message ${msg.class}">
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
          const curScrollPos = this.scrollTop;
          const oldScroll = this.scrollHeight - this.clientHeight;
          $(this).prepend(htmlMsgs)
          const newScroll = this.scrollHeight - this.clientHeight;
          this.scrollTop = curScrollPos + (newScroll - oldScroll);

          allowLoadOld = true
        } catch (error) {
          window.outputErrorMessage(error?.response?.data?.message)
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
      console.log(e.detail.blob);
      await sendFileSingle(new File([e.detail.blob], 'recorder.webm'), true)
    })

    // receive msg obj from server
    window.socket.on('msg-messenger', ({senderId, msg: msgObj}) => {
      if (friendIdChatting === senderId) {
        // output message
        window.outputMessage(msgObj);

        // scroll bottom
        chatMain.scrollTop = chatMain.scrollHeight;
      }
      if (msgObj.type && msgObj.type === 'file') {
        $(`.friend-item[data-id="${senderId}"]`).find('.last-msg').html(
          `<small>${msgObj.username} đã gửi 1 đính kèm</small><small>1 phút</small>`
        )
      } else {
        $(`.friend-item[data-id="${senderId}"]`).find('.last-msg').html(
          `<small>${msgObj.message}</small><small>1 phút</small>`
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
          true
        )
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
          const file = res.data.fileUrls.find(f => f.name === $(ele).text())
          if (file) {
            $(ele).parents('.wrap-msg-file').addClass('load-done')
            if (file.resourceType === 'image') {
              $(ele).parents('.message-content').html(`<img class="pre-img" src="${file.url}" alt="${file.name}" />`)
            } else if (file.resourceType === 'video') {
              $(ele).parents('.message-content').addClass('d-flex').html(`<video class="pre-video" controls src="${file.url}"></video>`)
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
            });
          } else {
            $(ele).parents('.message').remove()
          }
        })
      } catch (error) {
        console.dir(error);
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
          true
        )
      try {
        const res = await axios.post('/messenger/upload-file', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        // enabledInputFile()
        const $msgFile = $(`.msg-file[data-session="${idSession}"]`)
        $msgFile.each((i, ele) => {
          const file = res.data.fileUrls.find(f => f.name === $(ele).text())
          if (file) {
            $(ele).parents('.wrap-msg-file').addClass('load-done')
            if (file.resourceType === 'image') {
              $(ele).parents('.message-content').html(`<img class="pre-img" src="${file.url}" alt="${file.name}" />`)
            } else if (file.resourceType === 'video') {
              if (audio) {
                $(ele).parents('.message-content').addClass('d-flex').html(`<audio class="pre-video pre-audio" controls src="${file.url}"><audio/>`)
              } else {
                $(ele).parents('.message-content').addClass('d-flex').html(`<video class="pre-video" controls src="${file.url}"></video>`) 
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