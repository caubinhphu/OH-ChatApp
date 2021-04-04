import axios from 'axios'

const Search = (() => {
  if ($('#main.search-page').length) {
    let page = 1
    $('.load-more-search button').on('click', async () => {
      $('.loader-more').removeClass('d-none')
      $('.load-more-search').addClass('hide')
      try {
        const response = await axios.get('/messenger/search-more', {
          params: {
            q: $('.search-page').attr('data-query'),
            page
          }
        })

        const { members, hasSearchRes } = response.data

        const html = members.map(member => {
          let subHtml = ''
          if (member.relatedWithMe === 'friend') {
            subHtml = `
              <a class="btn mb-1" href="/messenger/chat/${member.url ? member.url : member._id}">Chat</a>
              <button class="des-friend btn btn-red" data-id="${member._id}">Hủy kết bạn</button>
            `
          } else if (member.relatedWithMe === 'request') {
            subHtml = `
              <button class="des-req-friend btn btn-red" data-id="${member._id}">Hủy yêu cầu</button>
            `
          } else if (member.relatedWithMe === 'invitation') {
            subHtml = `
              <button class="accept-inv-friend btn" data-id="${member._id}">Chấp nhận lời mời</button>
              <button class="del-inv-friend btn btn-red" data-id="${member._id}">Xóa lời mời</button>
            `
          } else {
            subHtml = `
              <button class="req-friend btn" data-id="${member._id}">Gửi lời mời kết bạn</button>
            `
          }

          return `
            <div class="search-res-item" data-id="${member._id}">
              <div class="d-flex align-items-center border p-2 rounded my-2">
                <img class="rounded-circle" alt="${member.name}" width='80' height='80' src="${member.avatar}" title="${member.name}" />
                <a class="flex-fill mx-2" href="/messenger/member/${member.url ? member.url : member._id}" title="${member.name}">
                  <strong class="name-member">${member.name}</strong>
                </a>
                <div class="d-flex flex-column fri-item-ctrl align-items-stretch">
                  ${subHtml}
                </div>
              </div>
            </div>
          `
        }).join('')

        $('.wrap-search-result').append(html)

        page++
        if (!hasSearchRes) {
          $('.load-more-search').remove()
        } else {
          $('.load-more-search').removeClass('hide')
        }
      } catch (error) {
        window.outputErrorMessage(error?.response?.data?.messages)
      }
      $('.loader-more').addClass('d-none')
    })

    const $popupConfirm = $('.popup-confirm')

    $(document).on('click', '.req-friend', async function(e) {
      e.preventDefault()
      const memberId = $(this).attr('data-id')
      await window.addRequestFriend(memberId, $(this).parents('.fri-item-ctrl'), false)
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
      await window.acceptAddFriend(memberId, $(this).parents('.fri-item-ctrl'), false, false)
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
      await window.confirmFriendAction(
        $(`.search-res-item[data-id=${window.memberId}]`).find('.fri-item-ctrl'),
        false
      )
    })

    $('.close-popup-con').on('click', () => {
      $popupConfirm.addClass('d-none')
      window.memberId = undefined
      window.typeConfirm = undefined
    })
  }
})()

export default Search