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
  }
})()

export default Setting