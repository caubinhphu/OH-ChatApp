// receive info change status room (management of host) from server
socket.on('changeStatusRoom', ({ key, value }) => {
  if (key === 'allowChat') {
    outputChatInput(value);
  }
});

// output chat input if allowed
function outputChatInput(allowed) {
  if (allowed) {
    // allow chat
    mgsForm.innerHTML = `<input id="mgs" class="form-control" type="text" name="message", placeholder="Nhập tin nhắn", autocomplete="off" />
    <button class="btn btn-default"><i class="fas fa-paper-plane"/></button>`;
  } else {
    // not allow chat
    mgsForm.innerHTML = `<div class="chat-disabled-text">Chat bị cấm bởi host</div>`;
  }
}
