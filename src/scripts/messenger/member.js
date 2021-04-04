
import axios from 'axios';

const Member = (() => {
  if ($('.member-page').length) {
    const $popupConfirm = $('.popup-confirm')
    const $wrapBtn = $('.wrap-btn-ctrl')

    $(document).on('click', '.req-friend', async function(e) {
      e.preventDefault()
      const memberId = $(this).attr('data-id')
      await addRequestFriend(memberId, $wrapBtn)
    })

    $(document).on('click', '.des-req-friend', function(e) {
      e.preventDefault()
      window.memberId = $(this).attr('data-id')
      window.typeConfirm = 'destroy-request-add-friend'
      $('.title-confirm').html('Bạn có chắc xóa yêu cầu kết bạn')
      $popupConfirm.removeClass('d-none')
    })

    $(document).on('click', '.del-inv-friend', function(e) {
      e.preventDefault()
      window.memberId = $(this).attr('data-id')
      window.typeConfirm = 'delete-invitation-friend'
      $('.title-confirm').html('Bạn có chắc xóa lời mời kết bạn')
      $popupConfirm.removeClass('d-none')
    })

    $(document).on('click', '.accept-inv-friend', async function(e) {
      e.preventDefault()
      const memberId = $(this).attr('data-id')
      await acceptAddFriend(memberId, $wrapBtn)
    })

    $(document).on('click', '.des-friend', function(e) {
      e.preventDefault()
      window.memberId = $(this).attr('data-id')
      window.typeConfirm = 'destroy-friend'
      $('.title-confirm').html('Bạn có chắc hủy kết bạn')
      $popupConfirm.removeClass('d-none')
    })

    $('#btn-confirm').on('click', async (e) => {
      e.preventDefault()
      await confirmFriendAction($wrapBtn)
    })

    $('.close-popup-con').on('click', () => {
      $popupConfirm.addClass('d-none')
      window.memberId = undefined
      window.typeConfirm = undefined
    })
  }

  // add request add friend
  async function addRequestFriend(memberId, $wrapBtn, reload = true) {
    showLoader()
    if (memberId) {
      try {
        const responsive = await axios.post(`/messenger/add-request`, {
          memberId
        });

        if (responsive.status === 200) {
          const { messages } = responsive.data;

          window.outputSuccessMessage(messages)

          $wrapBtn.html(`
            <button class="btn btn-red des-req-friend" data-id="${memberId}">
              Hủy yêu cầu
            </button>
          `)
        } else if (responsive.status === 205) {
          window.outputErrorMessage('Gửi lời mời kết bạn thất bại')
          if (reload) {
            reloadPage()
          }
        }
      } catch (error) {
        window.outputErrorMessage(error?.response?.data?.messages)
      }
    }
    hideLoader()
  }
  window.addRequestFriend = addRequestFriend

  // accept add friend
  async function acceptAddFriend(memberId, $wrapBtn, layoutRow = true, reload = true, callback = null) {
    showLoader()
    if (memberId) {
      try {
        const responsive = await axios.put(`/messenger/accept-invitation`, {
          memberId
        });

        const { messages } = responsive.data;

        window.outputSuccessMessage(messages)

        if (!callback) {
          $wrapBtn.html(`
            <a class="btn" href="/messenger/chat/${memberId}">Chat</a>
            <button class="btn btn-red des-friend ${layoutRow ? 'ml-3' : 'mt-1'}" data-id="${memberId}">
              Hủy kết bạn
            </button>
          `)
        } else {
          callback()
        }
      } catch (error) {
        window.outputErrorMessage(error?.response?.data?.messages)
        if (reload) {
          setTimeout(() => {
            if (error?.response?.status === 400) {
              reloadPage()
            }
          }, 500);
        }
      }
    }
    hideLoader()
  }
  window.acceptAddFriend = acceptAddFriend

  // confirm do friend action
  async function confirmFriendAction($wrapBtn, reload = true, callback = null) {
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

          if (!callback) {
            $wrapBtn.html(`
              <button class="btn req-friend" data-id="${window.memberId}">
                Gửi lời mời kết bạn
              </button>
            `)
          } else {
            callback()
          }
          
        } catch (error) {
          window.outputErrorMessage(error?.response?.data?.messages)
          if (reload) {
            setTimeout(() => {
              if (error?.response?.status === 400) {
                reloadPage()
              }
            }, 500);
          }
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

          if (!callback) {
            $wrapBtn.html(`
              <button class="btn req-friend" data-id="${window.memberId}">
                Gửi lời mời kết bạn
              </button>
            `)
          } else {
            callback()
          }
          
        } catch (error) {
          window.outputErrorMessage(error?.response?.data?.messages)
          if (reload) {
            setTimeout(() => {
              if (error?.response?.status === 400) {
                reloadPage()
              }
            }, 500);
          }
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

          if (!callback) {
            $wrapBtn.html(`
              <button class="btn req-friend" data-id="${window.memberId}">
                Gửi lời mời kết bạn
              </button>
            `)
          } else {
            callback()
          }
          
        } catch (error) {
          window.outputErrorMessage(error?.response?.data?.messages)
          if (reload) {
            setTimeout(() => {
              if (error?.response?.status === 400) {
                reloadPage()
              }
            }, 500);
          }
        }
      }

      $('.popup-confirm').addClass('d-none')
      window.memberId = undefined
      window.typeConfirm = undefined
    }
    hideLoader()
  }
  window.confirmFriendAction = confirmFriendAction

  function showLoader() {
    $('.wrap-loader').removeClass('d-none')
  }
  window.showLoader = showLoader

  function hideLoader() {
    $('.wrap-loader').addClass('d-none')
  }
  window.hideLoader = hideLoader

  function reloadPage() {
    location.reload()
  }
  window.reloadPage = reloadPage
})()

export default Member