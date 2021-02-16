function showLoader() {
  $('#loadding-page').removeClass('hide-loader')
}

function hideLoader() {
  $('#loadding-page').addClass('hide-loader')
}

const Loading = (()=> {
  window.showLoader = showLoader
  window.hideLoader = hideLoader
  window.onload = () => {
    setTimeout(hideLoader, 300);
  }
})()

export default Loading
