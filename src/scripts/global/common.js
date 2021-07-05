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

  function forceDownload(blob, filename) {
    var a = document.createElement('a');
    a.download = filename;
    a.href = blob;
    // For Firefox https://stackoverflow.com/a/32226068
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  
  // Current blob size limit is around 500MB for browsers
  function downloadResource(url, filename) {
    if (!filename) filename = url.split('\\').pop().split('/').pop();
    fetch(url, {
        headers: new Headers({
          'Origin': location.origin
        }),
        mode: 'cors'
      })
      .then(response => response.blob())
      .then(blob => {
        let blobUrl = window.URL.createObjectURL(blob);
        forceDownload(blobUrl, filename);
      })
      .catch(e => console.error(e));
  }
  
  $(document).on('click', '.download-file', function() {
    downloadResource(this.dataset.url, this.dataset.file)
  })

  $(document).on('click', '.open-popup-video', function(e) {
    e.preventDefault()
    const $popup = $('.popup-media')
    $popup.removeClass('d-none')
    const url = $(this).find('video').attr('src')
    $popup.find('.popup-media-content').html(`
      <video class="w-100 h-100" src="${url}" controls autoplay></video>
    `)
    $popup.find('.download-file').attr('data-url', url)
  })

  $('.close-popup-media').on('click', () => {
    $('.popup-media').addClass('d-none')
  })

  browserDetection()
  systemDetection()
})()

export default Common