const Setting = (() => {
  if ($('#main .setting-page').length) {
    if (document.formSettingPassword) {
      document.formSettingPassword.addEventListener('submit', () => {
        $('.wrap-loader').removeClass('d-none')
      })
    }
    if (document.formSettingUrl) {
      document.formSettingUrl.addEventListener('submit', () => {
        $('.wrap-loader').removeClass('d-none')
      })

      $('#url').on('input', function() {
        $('.url-preview').text($(this).val())
      })
    }
  }
})()

export default Setting