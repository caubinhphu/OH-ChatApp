const Messenger = (() => {
  // receive msg obj from server
  window.socket.on('msg-messenger', ({senderId, msg: msgObj}) => {
    console.log(senderId, msgObj);
  });
})()

export default Messenger