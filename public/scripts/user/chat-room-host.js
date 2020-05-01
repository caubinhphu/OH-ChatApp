// receive password of room from server
socket.on('sendPasswordRoom', (password) => {
  document.querySelector(
    '#room-info-password-room'
  ).innerHTML = `(${password})`;
});

// receive message from server when leave all for host
socket.on('leaveAllCompleteForHost', (mgs) => {
  if (mgs === 'OK') {
    location.href = 'http://localhost:3000';
  } else {
    location.reload();
  }
});

// event change management
document.getElementsByName('management').forEach((checkbox) => {
  checkbox.addEventListener('click', function () {
    console.log({ value: this.value, status: this.checked });
    socket.emit('changeManagement', {
      value: this.value,
      status: this.checked,
      token: qs.get('token'),
    });
  });
});

// disconnect for all
document
  .querySelector('#disconnect-all-btn')
  .addEventListener('click', function () {
    socket.emit('disconnectRequire', { typeLeave: 'all' });
  });
