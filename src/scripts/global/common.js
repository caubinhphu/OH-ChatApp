const Common = (() => {
  function browserDetection () {
    const isExplorer = (navigator.userAgent.indexOf('MSIE') || navigator.userAgent.indexOf('rv:15')) > -1
    const isFirefox = navigator.userAgent.indexOf('Firefox') > -1
    const isSafari = navigator.userAgent.indexOf('Safari') > -1
    const isChrome = navigator.userAgent.indexOf('Chrome') > -1
    const isOpera = navigator.userAgent.indexOf('OPR') > -1
    const isDeviceiPad = navigator.userAgent.match(/iPad/i)
    if (isExplorer || document.documentMode) {
      location.href = '/no-support'
    }
    if (isFirefox) {
      location.href = '/no-support'
    }
    if (isChrome && isSafari && !isOpera) {
      // location.href = '/no-support'
    }
    if (!isChrome && isSafari) {
      location.href = '/no-support'
    }
    if (/Edge/.test(navigator.userAgent)) {
      // location.href = '/no-support'
    }
    if (isDeviceiPad) {
      // location.href = '/no-support'
    }
  }

  browserDetection()
})()

export default Common