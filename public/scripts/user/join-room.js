const joinRoomForm = document.joinRoomForm;

joinRoomForm.addEventListener('submit', function (e) {
  e.preventDefault();
  let inputName = e.target.elements.name;
  if (inputName.value.length <= 0 || inputName.value.length > 30) {
    document.querySelector('#err-join-name').innerHTML = 'Tên chưa hợp lệ';
  } else {
    this.submit();
  }
});
