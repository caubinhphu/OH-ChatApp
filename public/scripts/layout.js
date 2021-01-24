function showLoader() {
  $('#loadding-page').removeClass('hide-loader')
}

function hideLoader() {
  $('#loadding-page').addClass('hide-loader')
}

window.onload = () => {
  setTimeout(hideLoader, 300);
}
