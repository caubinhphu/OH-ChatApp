const Common = (() => {
  const $html = $('html')
  function browserDetection() {
    const isExplorer = (navigator.userAgent.indexOf('MSIE') || navigator.userAgent.indexOf('rv:15')) > -1
    const isFirefox = navigator.userAgent.indexOf('Firefox') > -1
    const isSafari = navigator.userAgent.indexOf('Safari') > -1
    const isChrome = navigator.userAgent.indexOf('Chrome') > -1
    const isOpera = navigator.userAgent.indexOf('OPR') > -1
    const isDeviceiPad = navigator.userAgent.match(/iPad/i)
    if (isExplorer || document.documentMode) {
      location.href = '/no-support'
      $html.addClass('ie')
    }
    if (isFirefox) {
      location.href = '/no-support'
      $html.addClass('firefox')
    }
    if (isChrome && isSafari && !isOpera) {
      // location.href = '/no-support'
      $html.addClass('chrome')
    }
    if (!isChrome && isSafari) {
      location.href = '/no-support'
      $html.addClass('safari')
    }
    if (/Edge/.test(navigator.userAgent)) {
      // location.href = '/no-support'
      $html.addClass('edge')
    }
    if (isDeviceiPad) {
      // location.href = '/no-support'
      $html.addClass('ipad')
    }
  }
  function systemDetection() {
    if (navigator.platform.indexOf('Win') > -1) {
      $html.addClass('win')
    }
  }
  browserDetection()
  systemDetection()
})()

export default Common