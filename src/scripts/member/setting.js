const Setting = (() => {
  // for page setting
  if (document.formSettingEmail) {
    document.formSettingEmail.addEventListener('submit', () => {
      $('.wrap-loader').removeClass('d-none')
    })
  }
  if (document.formSettingPassword) {
    document.formSettingPassword.addEventListener('submit', () => {
      $('.wrap-loader').removeClass('d-none')
    })
  }
})()

export default Setting