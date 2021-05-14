import Quill from 'quill';
import axios from 'axios';

const Text = (async () => {
  // socket.io
  const socket = io();
  const textId = $('.text-id').text()
  const Size = Quill.import('attributors/style/size');
  Size.whitelist = [ '12px', '18px', '24px', '28px', '32px', '40px', '50px'];
  Quill.register(Size, true);
  const toolbarOptions = [
    [{ 'font': [] }],
    [{ 'size': [ false, '12px', '18px', '24px', '28px', '32px', '40px', '50px'] }],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'align': [] }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [ 'link', 'image', 'video' ],
    ['clean']
  ];
  const quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
      toolbar: toolbarOptions
    }
  });

  quill.enable(false)

  socket.on('text-loadData', ({ data }) => {
    // console.log(data);
    quill.setContents(data)
  })

  socket.emit('join-text', { textId })

  try {
    const response = await axios.get('/utility/text/check', {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      params: {
        textId
      }
    })

    const { isAuthor } = response.data
    if (isAuthor) {
      quill.enable()

      $(window).bind('keydown', function(event) {
        if (event.ctrlKey || event.metaKey) {
          if (String.fromCharCode(event.which).toLowerCase() === 's') {
            event.preventDefault();

            socket.emit('text-save', { data: quill.getContents(), textId })
          }
        }
      });

      quill.on('text-change', function(delta, oldDelta, source) {
        if (source === 'user') {
          socket.emit('text-change-s', { delta, textId })
        }
      });

      socket.on('text-saved', () => {
        window.outputSuccessMessage('Đã lưu')
      })
    } else {
      $('#text-name').prop('disabled', true)
      $('.submit-text-name').remove()
      $('.text-name-loader').remove()
    }
  } catch (error) {
    window.outputErrorMessage('Có lỗi xảy ra!')
  }

  socket.on('text-change-r', ({ delta }) => {
    quill.updateContents(delta)
  })

  socket.on('text-name-r', ({ name }) => {
    $('#text-name').val(name)
  })

  $('.submit-text-name').on('click', async (e) => {
    $('.wrap-text-name').addClass('loader-put')
    e.preventDefault()
    const value = $('#text-name').val()
    if (value) {
      try {
        const response = await axios.put('/utility/text',
          { name: value, id: textId },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            }
          }
        )

        const { name, message } = response.data

        window.outputSuccessMessage(message)

        socket.emit('text-name-s', { name, textId })
      } catch (error) {
        // console.log(error);
        window.outputErrorMessage(error?.response?.data?.message)
      }
    }
    $('.wrap-text-name').removeClass('loader-put')
  })
})()

export default Text
