const CommonChat = (() => {
  const socket = io();
  window.socket = socket

  socket.emit('msg-memberOnline', { memberId: $('#member-id').text() })
})()

export default CommonChat