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
      const SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;
      const SpeechGrammarList = SpeechGrammarList || webkitSpeechGrammarList;
      try {
        const grammar = '#JSGF V1.0;'
        const recognition = new SpeechRecognition();
        const speechRecognitionList = new SpeechGrammarList();
        speechRecognitionList.addFromString(grammar, 1);
        recognition.grammars = speechRecognitionList;
        recognition.lang = languageAssistant;
        recognition.interimResults = false;

        recognition.onresult = function(event) {
          const last = event.results.length - 1;
          const command = event.results[last][0].transcript;
          if (command) {
            $('#directive-hidden').val(command.toLowerCase())
            $('#directive-show').val(command.toLowerCase())
          }
        };

        recognition.onspeechend = () => {
          recognition.stop()
        };

        recognition.onend = function() {
          $('.set-directive-btn').removeClass('disabled')
        };

        $('.set-directive-btn').on('click', function (e) {
          e.preventDefault()
          if (!$(this).hasClass('disabled')) {
            $(this).addClass('disabled')
            recognition.start()
          }
        })
      } catch (error) {
        window.outputErrorMessage('Trình duyệt không hổ trợ chức năng này')
      }

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
        if ($('#turn-on-ass-voice').is(':checked')) {
          $('.wrap-directive').removeClass('d-none')
        } else {
          $('.wrap-directive').addClass('d-none')
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