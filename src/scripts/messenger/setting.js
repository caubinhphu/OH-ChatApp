const Setting = (() => {
  if ($('#main.setting-page').length) {
    if (document.formSettingPassword) {
      document.formSettingPassword.addEventListener('submit', () => {
        // $('.wrap-loader').removeClass('d-none')
        window.showLoader()
      })
    }
    if (document.formSettingUrl) {
      document.formSettingUrl.addEventListener('submit', () => {
        // $('.wrap-loader').removeClass('d-none')
        window.showLoader()
      })

      $('#url').on('input', function() {
        $('.url-preview').text($(this).val())
      })
    }

    if (document.formSettingLangAss) {
      document.formSettingLangAss.addEventListener('submit', () => {
        // $('.wrap-loader').removeClass('d-none')
        window.showLoader()
      })
    }

    if (document.formSettingChatMic) {
      document.formSettingChatMic.addEventListener('submit', () => {
        // $('.wrap-loader').removeClass('d-none')
        window.showLoader()
      })

      document.formSettingChatMic.addEventListener('change', function() {
        if (this.elements.method.value === '1') {
          $('#method-send').addClass('d-none')
        } else {
          $('#method-send').removeClass('d-none')
        }
      })
    }
  }
})()

export default Setting