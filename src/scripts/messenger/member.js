
import axios from 'axios';

const Member = (() => {
  if ($('.member-page').length) {
    const $popupConfirm = $('.popup-confirm')
    const $wrapBtn = $('.wrap-btn-ctrl')

    $(document).on('click', '#req-friend', async function(e) {
      e.preventDefault()
      showLoader()
      const memberId = $(this).attr('data-id')

      if (memberId) {
        try {
          const responsive = await axios.post(`/messenger/add-request`, {
            memberId
          });
          const { messages } = responsive.data;

          window.outputSuccessMessage(messages)

          $wrapBtn.html(`
            <button class="btn btn-red" id="des-req-friend" data-id="${$(this).attr('data-id')}">
              Hủy yêu cầu
            </button>
          `)

        } catch (error) {
          window.outputErrorMessage(error.message)
        }
      }
      hideLoader()
    })

    $(document).on('click', '#des-req-friend', function(e) {
      e.preventDefault()
      window.memberId = $(this).attr('data-id')
      window.typeConfirm = 'destroy-request-add-friend'
      $('.title-confirm').html('Bạn có chắc xóa yêu cầu kết bạn')
      $popupConfirm.removeClass('d-none')
    })

    $(document).on('click', '#del-inv-friend', function(e) {
      e.preventDefault()
      window.memberId = $(this).attr('data-id')
      window.typeConfirm = 'delete-invitation-friend'
      $('.title-confirm').html('Bạn có chắc xóa lời mời kết bạn')
      $popupConfirm.removeClass('d-none')
    })

    $(document).on('click', '#accept-inv-friend', async function(e) {
      e.preventDefault()
      showLoader()
      const memberId = $(this).attr('data-id')
      if (memberId) {
        try {
          const responsive = await axios.put(`/messenger/accept-invitation`, {
            memberId
          });
          const { messages } = responsive.data;

          window.outputSuccessMessage(messages)

          $wrapBtn.html(`
            <a class="btn" href="/messenger/${$(this).attr('data-id')}">Chat</a>
            <button class="btn btn-red ml-3" id="des-friend" data-id="${$(this).attr('data-id')}">
              Hủy kết bạn
            </button>
          `)
        } catch (error) {
          window.outputErrorMessage(error.message)
        }
      }
      hideLoader()
    })

    $(document).on('click', '#des-friend', function(e) {
      e.preventDefault()
      window.memberId = $(this).attr('data-id')
      window.typeConfirm = 'destroy-friend'
      $('.title-confirm').html('Bạn có chắc hủy kết bạn')
      $popupConfirm.removeClass('d-none')
    })

    $('#btn-confirm').on('click', async (e) => {
      e.preventDefault()
      showLoader()
      if (window.memberId && window.typeConfirm) {
        if (window.typeConfirm === 'destroy-request-add-friend') {
          try {
            const responsive = await axios.delete(`/messenger/destroy-request`, {
              data: {
                memberId: window.memberId
              }
            });
            const { messages } = responsive.data;

            window.outputSuccessMessage(messages)

            $wrapBtn.html(`
              <button class="btn" id="req-friend" data-id="${window.memberId}">
                Gửi lời mời kết bạn
              </button>
            `)
          } catch (error) {
            window.outputErrorMessage(error.message)
          }
        } else if (window.typeConfirm === 'delete-invitation-friend') {
          try {
            const responsive = await axios.delete(`/messenger/delete-invitation`, {
              data: {
                memberId: window.memberId
              }
            });
            const { messages } = responsive.data;

            window.outputSuccessMessage(messages)

            $wrapBtn.html(`
              <button class="btn" id="req-friend" data-id="${window.memberId}">
                Gửi lời mời kết bạn
              </button>
            `)
          } catch (error) {
            window.outputErrorMessage(error.message)
          }
        } else if (window.typeConfirm === 'destroy-friend') {
          try {
            const responsive = await axios.delete(`/messenger/destroy-friend`, {
              data: {
                memberId: window.memberId
              }
            });
            const { messages } = responsive.data;

            window.outputSuccessMessage(messages)
            $wrapBtn.html(`
              <button class="btn" id="req-friend" data-id="${window.memberId}">
                Gửi lời mời kết bạn
              </button>
            `)
          } catch (error) {
            window.outputErrorMessage(error.message)
          }
        }

        $popupConfirm.addClass('d-none')
        window.memberId = undefined
        window.typeConfirm = undefined
      }
      hideLoader()
    })

    $('.close-popup-con').on('click', () => {
      $popupConfirm.addClass('d-none')
      window.memberId = undefined
      window.typeConfirm = undefined
    })
  }

  function showLoader() {
    $('.wrap-loader').removeClass('d-none')
  }

  function hideLoader() {
    $('.wrap-loader').addClass('d-none')
  }
})()

export default Member