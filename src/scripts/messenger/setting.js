const Setting = (async () => {
  const languageAssistant = $('#lang-assistant').text()
  const methodSend = $('#method-send').text()
  const isWin = $('html').hasClass('win')
  let supportVN = false
  const synth = window.speechSynthesis;

  const voices = await new Promise(rs => setTimeout(() => {
    rs(synth.getVoices())
  }, 100))

  if (voices.find(v => v.lang === 'vi-VN')) {
    supportVN = true
  }

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
      if (languageAssistant === 'vi' && methodSend === 'confirm-voice' && !supportVN && isWin) {
        window.outputWarnMessage('Trình duyệt hiện không hổ trợ tiếng Việt!')
        $('.vn-lang-tutorial').removeClass('d-none')
      }
      document.formSettingChatMic.addEventListener('submit', () => {
        // $('.wrap-loader').removeClass('d-none')
        window.showLoader()
      })

      document.formSettingChatMic.addEventListener('change', function() {
        if (this.elements.method.value === '1') {
          $('#method-send-setting').addClass('d-none')
          $('.vn-lang-tutorial').addClass('d-none')
        } else {
          $('#method-send-setting').removeClass('d-none')
          if (languageAssistant === 'vi' && this.elements.methodSend.value === 'confirm-voice' && !supportVN && isWin) {
            window.outputWarnMessage('Trình duyệt hiện không hổ trợ tiếng Việt!')
            $('.vn-lang-tutorial').removeClass('d-none')
          } else {
            $('.vn-lang-tutorial').addClass('d-none')
          }
        }
      })

      $('.copy-code-btn').on('click', (e) => {
        e.preventDefault()
        const ele = document.querySelector('.code-copy-box');
        ele.select();
        document.execCommand('copy');
        window.outputSuccessMessage('Sao chép thành công')
      })
    }
  }
})()

export default Setting