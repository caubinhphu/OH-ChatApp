const CommonChat = (() => {
  const socket = io();
  window.socket = socket

  socket.emit('msg-memberOnline', { memberId: $('#member-id').text() })

  // receive error message from server when has error
  socket.on('errorMessage', (msg) => {
    outputErrorMessage(msg);
  });
})()

export default CommonChat