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
    console.log(data);
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

    console.log(response);
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
          // console.log(delta);
          socket.emit('text-change-s', { delta, textId })
        }
      });

      socket.on('text-saved', () => {
        console.log('Saved');
      })
    }
  } catch (error) {
    console.dir(error);
  }

  socket.on('text-change-r', ({ delta }) => {
    console.log(delta);
    quill.updateContents(delta)
  })
})()

export default Text
