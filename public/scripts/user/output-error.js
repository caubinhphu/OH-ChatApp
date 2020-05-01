// output error message
function outputErrorMessage(msg) {
  document.querySelector(
    '#message-area'
  ).innerHTML = `<div class="alert alert-danger alert-dismissible fade show" role="alert" >
 <span>${msg}</span>
    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button></div>`;
}
