import moment from 'moment';
import axios from 'axios';

const CommonChatRoom = (() => {
  const chatMain = document.getElementById('chat-middle'); // chat main area
  const btnChangeStatusTime = document.querySelector('#hide-time-btn'); // Change display status button
  const msgForm = document.sendMsgForm; // form chat
  const dragZone = document.querySelector('.dragzone')
// console.log(moment);
  // socket.io
  const socket = io();
  window.socket = socket

  const qs = new URLSearchParams(location.search);

  const token = sessionStorage.getItem('token') || ''

  if (!token) {
    location.href = `/join/?room=${qs.get('room')}`
  }

  $('.export-chat-link').attr('href', `/export-chat/?token=${token}`)

  const joinSound = new Audio('/sounds/join-room.mp3')
  const leaveSound = new Audio('/sounds/leave-room.mp3')

  // get token from query string
  // const qs = new URLSearchParams(location.search);
  // window.qs = qs

  let finalFiles = []
  let isDragging = 0;
  let isDragZone = false;
  // receive  message from server
  socket.on('message', (msgObj) => {
    // output message
    outputMessage(msgObj);

    if ($('.scroll-bottom').hasClass('is-show')) {
      $('.scroll-bottom').addClass('is-has-new-msg')
    } else {
      // scroll bottom
      chatMain.scrollTop = chatMain.scrollHeight;
    }
  });

  socket.on('hasRaiseHand', ({ name }) => {
    window.outputInfoMessage(`${name} đang giơ tay`)
    if (!$('#users-area').hasClass('is-active')) {
      $('.control-show-pop[data-control="user"]').addClass('has-unread');
      if ($(window).width() < 768) {
        $('.open-popup-icon').addClass('has-unread');
      }
    }
  })

  // event submit form chat
  msgForm.addEventListener('submit', async (e) => {
    // stop submit form
    e.preventDefault();

    // input message
    const inputMsg = e.target.elements.message;

    $('.files-upload-box').html('')

    if (inputMsg.value !== '') {
      // send message to server
      socket.emit('messageChat', {
        message: inputMsg.value,
        token,
      });

      // create message obj to show in client
      const msgObj = {
        time: moment().format('H:mm'),
        username: 'Me',
        message: escapeHtml(inputMsg.value),
      };
      outputMessage(msgObj, true);

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
      // console.log(finalFiles);
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

  async function sendFile() {
    const formData = new FormData();
    const idSession = new Date().valueOf();
    finalFiles.forEach(file=>{
      formData.append('files', file);
      outputMessage({
        time: moment().format('H:mm'),
        username: 'Me',
        message: `<a class="msg-file" target="_blank" data-session="${idSession}" href="#">${file.name}</a>`
      }, true, 'wrap-msg-file')
    });
    try {
      const res = await axios.post('/upload-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      $('#send-file').val('')
      finalFiles = []
      // enabledInputFile()
      // console.log(res);
      const $msgFile = $(`.msg-file[data-session="${idSession}"]`)
      $msgFile.each((i, ele) => {
        const file = res.data.fileUrls.find(f => f.name === $(ele).text())
        if (file) {
          $(ele).parents('.wrap-msg-file').addClass('load-done')
          ele.href = file.url
          // send message to server
          socket.emit('messageChat', {
            message: file.url,
            type: 'file',
            nameFile: file.name,
            resourceType: file.resourceType,
            token,
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

  function isValidHttpUrl(string) {
    let url;
    try { url = new URL(string); }
    catch (_) { return false; }
    return url.protocol === 'http:' || url.protocol === 'https:';
  }

  // output message in main chat area
  function outputMessage(msgObj, me = false, classMsg = '') { 
    const div = document.createElement('div');
    let content = msgObj.message
    if (isValidHttpUrl(msgObj.message)) {
      if (msgObj.type === 'file') {
        content = `<a href="${msgObj.message}" target="_blank">${msgObj.nameFile}</a>`
      } else {
        content = `<a href="${msgObj.message}" target="_blank">${msgObj.message}</a>`
      }
    }
    if (me) {
      div.className = 'message text-right';
      div.innerHTML = `<small class="message-time" style="display:${
        btnChangeStatusTime.dataset.status === 'off' ? 'none' : 'inline'
      }">${msgObj.time}</small>
      <div>
        <div class="msg-me ${classMsg}">
          <small class="message-content mx-0">${content}</small>
        </div>
      <div>`;
    } else {
      if (msgObj.username === 'OH Bot - Join') {
        outputInfoMessage(msgObj.message);
        joinSound.play()
      } else if (msgObj.username === 'OH Bot - Leave') {
        // console.log(msgObj);
        outputInfoMessage(msgObj.message);
        leaveSound.play()
      } else {
        div.className = 'message';
        div.innerHTML = `<small class="message-time" style="display:${
          btnChangeStatusTime.dataset.status === 'off' ? 'none' : 'inline'
        }">${msgObj.time}</small>
          <div>
            <div class="msg">
              <img class="message-avatar" src="${msgObj.avatar}" alt="OH" />
              <small class="message-name">${msgObj.username}</small>
              <small class="message-content">
                ${content}
              </small>
            </div>
          </div>`;

        // set un-read
        if (!$('#chat-area').hasClass('is-active')) {
          $('.control-show-pop[data-control="chat"]').addClass('has-unread');
          if ($(window).width() < 768) {
            $('.open-popup-icon').addClass('has-unread');
          }
        }
      }
    }

    // append message
    chatMain.appendChild(div);
  }

  // receive error message from server when has error
  socket.on('errorMessage', (msg) => {
    outputErrorMessage(msg);
  });

  // receive message from server when leave
  socket.on('leaveComplete', (msg) => {
    window.notConfirmClose = true
    if (msg === 'OK') {
      location.href = '/';
    } else {
      location.reload();
    }
  });

  // event change status display time
  btnChangeStatusTime.addEventListener('click', function () {
    if (this.dataset.status === 'on') {
      // show time now -> hide time
      document.querySelectorAll('.message-time').forEach((time) => {
        time.style.display = 'none';
      });
      this.dataset.status = 'off';
      $(this).find('span:last-child').html('Bật thời gian')
    } else if (this.dataset.status === 'off') {
      // hide time now -> show time
      document.querySelectorAll('.message-time').forEach((time) => {
        time.style.display = 'inline';
      });
      this.dataset.status = 'on';
      $(this).find('span:last-child').html('Ẩn thời gian')
    }
  });

  $('.chat-mana-sub').on('click', function() {
    if (!$(this).hasClass('is-active')) {
      $(this).addClass('is-active')
      $('.chat-m-sub-box').removeClass('d-none')
    } else {
      $(this).removeClass('is-active')
      $('.chat-m-sub-box').addClass('d-none')
    }
  })

  $(document).on('click', (e) => {
    if (!$(e.target).closest('.chat-m-sub-box').length && !$(e.target).closest('.chat-mana-sub').length) {
      $('.chat-mana-sub').removeClass('is-active')
      $('.chat-m-sub-box').addClass('d-none')
    }
  })

  $('.btn-raise-hand').on('click', function(e) {
    e.preventDefault()
    const isRaising = $(this).hasClass('is-raising')
    socket.emit('raiseHand', { raise: !isRaising })
    if (isRaising) {
      // un raise hand
      $(this).find('.ctrl-label').text('Giơ tay')
      $(this).removeClass('is-raising')
    } else {
      // raise hand
      $(this).find('.ctrl-label').text('Bỏ tay xuống')
      $(this).addClass('is-raising')
    }
  })

  // disconnect for self
  document
    .querySelector('#disconnect-btn')
    .addEventListener('click', function () {
      socket.emit('disconnectRequest', {
        typeLeave: 'self',
      });
      showLoader()
    });

  socket.emit('joinChat', {
    token,
  });


  // show hide control meeting
  $('.arrow-smaller').on('click', () => {
    hideControls();
  });

  const conShowPopClass = '.control-show-pop';
  const showConId = '#show-control';
  const wrapConClass ='.wrap-control-meet';

  $(conShowPopClass).on('click', function() {
    const $wrapControls = $(showConId);
    if ($(this).hasClass('is-active')) {
      hideControls();
    } else {
      $(conShowPopClass).removeClass('is-active');
      $('.control-area').removeClass('is-active');
      $(this).addClass('is-active');
      $(`.control-area[data-control="${this.dataset.control}"]`).addClass('is-active');

      // remove un-read
      const $chatArea = $('.control-show-pop[data-control="chat"]');
      const $userArea = $('.control-show-pop[data-control="user"]');
      if ($('#chat-area').hasClass('is-active')) {
        $chatArea.removeClass('has-unread');
      }
      if ($('#users-area').hasClass('is-active')) {
        $userArea.removeClass('has-unread');
      }
      if (!$chatArea.hasClass('has-unread') && !$userArea.hasClass('has-unread')) {
        $('.open-popup-icon').removeClass('has-unread');
      }

      if ($wrapControls.hasClass('no-show')) {
        showControls();
        if (this.dataset.control === 'chat') {
          $('#msg').focus();
          scrollBottomChatBox();
        }
        $wrapControls.removeClass('no-show');
      }
    }
  });

  function hideControls() {
    $('.wrap-emojis').removeClass('is-active');
    $(showConId).animate({
      width: '0',
    }, 350, () => {
      $(showConId).addClass('no-show');
      $(conShowPopClass).removeClass('is-active');
      $('.control-area').removeClass('is-active');
      $('.sub-mana-box').addClass('d-none')
      $('.sub-mana-box').addClass('d-none')
      $('.chat-mana-sub, .users-mana-sub').addClass('is-active')
    });
  }

  function showControls() {
    $(showConId).animate({
      width: '315px'
    }, 350);
    $(wrapConClass).fadeOut();
  }

  $('.open-popup-icon').on('click', () =>{
    hideControls();
    $('.open-popup-icon').removeClass('has-unread');
    $(wrapConClass).fadeToggle();
  });

  $(document).click((e) => {
    const $target = $(e.target);
    if(!$target.closest('.open-popup-icon').length &&
      !$target.closest('.wrap-control-meet .control-show-pop').length &&
      $(wrapConClass).is(':visible')) {

      $(wrapConClass).fadeOut();
    }
  });

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

  $('#chat-middle').on('scroll', function() {
    if (this.scrollHeight - this.scrollTop >= this.clientHeight + 200) {
      $('#chat-area .scroll-bottom').addClass('is-show');
    } else {
      $('#chat-area .scroll-bottom').removeClass('is-show is-has-new-msg');
    }
  });

  $('.scroll-bottom').on('click', scrollBottomChatBox);

  $('.meeting-control-item').on('mouseover', function() {
    if ($(window).width() > 768) {
      $(this).find('.popup').css('display', 'block');
    }
  }).on('mouseleave', function() {
    $(this).find('.popup').css('display', 'none');
  });

  $('.btn-create-text').on('click', async () => {
    try {
      const response = await axios.post('/utility/text', {}, {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    const url = `${location.origin}/utility/text/${response.data.textId}`
    // send message to server
    socket.emit('messageChat', {
      message: url,
      token,
    });

    // create message obj to show in client
    const msgObj = {
      time: moment().format('H:mm'),
      username: 'Me',
      message: url
    };
    outputMessage(msgObj, true);
    window.open(url)
    } catch (error) {
      if (error.response.status === 401) {
        window.outputErrorMessage('Bạn cần đăng nhập để thưc hiện chức năng này')
      } else {
        window.outputErrorMessage('Không tạo được Text mới')
      }
    }
  })

  function scrollBottomChatBox() {
    const $ele = $('#chat-middle');
    $ele.animate({scrollTop: $ele[0].scrollHeight - $ele.innerHeight()}, 350, 'swing');
  }

  function copyText(selector) {
    /* Select the text field */
    const ele = document.querySelector(selector);
    ele.select();

    /* Copy the text inside the text field */
    document.execCommand('copy');
  }

  $('#copy-info').on('click', function() {
    copyText('#link-info');
    outputSuccessMessage('Sao chép thông tin phòng thành công')
  });

  window.addEventListener('beforeunload', function (e) {
    if (window.notConfirmClose) {
      return false
    }
    // Cancel the event
    e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
    // Chrome requires returnValue to be set
    e.returnValue = '';
  });

  window.addEventListener('unload', _ => {
    sessionStorage.removeItem('token')
  })
})()

export default CommonChatRoom
