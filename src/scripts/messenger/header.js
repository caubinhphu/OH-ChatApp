import axios from 'axios';

const Header = (() => {
  let page = 1
  let hasNoti = true
  let allowLoadNotify = true

  $(document).on('click', '.noti-mana-btn', function(e) {
    e.preventDefault()
    const $parent = $(this).parents('.notify-item')
    if (!$parent.hasClass('is-show')) {
      $('.notify-item').removeClass('is-show')
      $('.noti-mana-box').addClass('d-none')
      $parent.addClass('is-show')
      $parent.find('.noti-mana-box').removeClass('d-none')
    } else {
      $parent.removeClass('is-show')
      $parent.find('.noti-mana-box').addClass('d-none')
      $parent.find('.confirm-del-noti').addClass('d-none')
    }
  })

  $(document).on('click', function(e) {
    const $container = $(".notify-item.is-show .noti-mana-box");
    if (!$(e.target).closest('.noti-mana-box').is($container) && !$(e.target).closest('.noti-mana-btn').hasClass('noti-mana-btn')) {
      $container.parents('.notify-item').removeClass('is-show')
      $container.addClass('d-none')
      $container.find('.confirm-del-noti').addClass('d-none')
    }
  });

  $(document).on('click', '.del-status-notify', function (e) {
    $(this).find('.confirm-del-noti').removeClass('d-none')
  })

  $(document).on('click', '.toggle-status-notify', async function (e) {
    e.preventDefault()
    const $itemNotify = $(this).parents('.notify-item')
    if ($itemNotify.length) {
      $(this).addClass('is-load')
      try {
        await axios.put(`/messenger/notification-status`, { notifyId: $itemNotify.attr('data-id') })
        if ($itemNotify.hasClass('un-read')) {
          $itemNotify.removeClass('un-read')
          $(this).find('span:last-child').text('Đánh dấu là đã đọc')
        } else {
          $itemNotify.addClass('un-read')
          $(this).find('span:last-child').text('Đánh dấu là chưa đọc')
        }
      } catch (error) {
        window.outputErrorMessage(error?.response?.data?.messages)
      }
      $(this).removeClass('is-load')
    }
  })

  $(document).on('click', '.confirm-del-noti', async function (e) {
    e.preventDefault()
    const $itemNotify = $(this).parents('.notify-item')
    if ($itemNotify.length) {
      try {
        const responsive = await axios.delete(`/messenger/delete-notification`, {
          data: {
            notifyId: $itemNotify.attr('data-id')
          }
        });
        const { messages } = responsive.data;

        window.outputSuccessMessage(messages)

        $itemNotify.remove()

        const $box = $('#notify-drop')
        if (!$box.find('.notify-item').length) {
          $box.html(`<div class="text-center text-secondary">
            <h4 class="mb-0">Không có thông báo nào</h4>
          </div>`)
        }
      } catch (error) {
        window.outputErrorMessage(error?.response?.data?.messages)
      }
    }
  })

  // handle scroll box chat: load old msg, scroll to bottom
  $('#notify-drop').on('scroll', async function() {
    if (this.scrollHeight - this.scrollTop === this.clientHeight  && allowLoadNotify && hasNoti) {
      $(this).find('.wrap-loader-notify').removeClass('d-none')
      allowLoadNotify = false
      try {
        const responsive = await axios.get(`/messenger/notifyold/?page=${page}`);
        const { hasNotify, notifies } = responsive.data;
        page++
        hasNoti = hasNotify

        const html = notifies.map(notify => `
          <div class="notify-item ps-rv ${notify.beRead ? '' : 'un-read'}" data-id="${notify._id}">
          <div class="noti-box ps-rv">
            <a class="ps-as" href="${notify.link}${notify.beRead ? '' : '/?idnotify=' + notify._id}">
              <span class="sr-only">${notify.content}</span>
            </a>
            <div class="wrap-noti-box p-2 d-flex align-items-center">
              <div class="noti-img"><img class="rounded-circle avatar" src="${notify.image}" alt="oh-chat" /></div>
              <div class="ml-3">
                <span class="noti-content">${notify.content}</span>
                <small class="noti-time">${notify.timeFromNow}</small></div>
              </div>
            </div>
            <button class="noti-mana-btn btn btn-white btn-icon small-btn">
              <span class="icomoon icon-dots-three-horizontal"></span>
            </button>
            <div class="noti-mana-box d-none">
              <div class="noti-mana-item d-flex align-items-center toggle-status-notify">
                <span class="icomoon icon-check-circle-o"></span>
                <span>${notify.beRead ? 'Đánh dấu là chưa đọc' : 'Đánh dấu là đã đọc'}</span>
              </div>
              <div class="noti-mana-item d-flex align-items-center del-status-notify">
                <span class="icomoon icon-times-circle-o"></span>
                <span>Gỡ bỏ thông báo này</span>
                <button class="btn btn-icon btn-red confirm-del-noti d-none"><span class="icomoon icon-checkmark"></span></button>
              </div>
            </div>
          </div>
        `).join('')
        
        $(this).append(html)

        allowLoadNotify = true
      } catch (error) {
        window.outputErrorMessage(error?.response?.data?.message)
      }
      $(this).find('.wrap-loader-notify').addClass('d-none')
    }
  });

  $('#member-notify-btn').on('click', function() {
    if ($(this).hasClass('un-read')) {
      $(this).removeClass('un-read')
    }
  })

  window.socket.on('msg-hasNotification', ({ notification }) => {
    const html = `
      <div class="notify-item ps-rv un-read" data-id="${notification._id}">
        <div class="noti-box ps-rv">
          <a class="ps-as" href="${notification.link}/?idnotify=${notification._id}">
            <span class="sr-only">${notification.content}</span>
          </a>
          <div class="wrap-noti-box p-2 d-flex align-items-center">
            <div class="noti-img"><img class="rounded-circle avatar" src="${notification.image}" alt="oh-chat" /></div>
            <div class="ml-3">
              <span class="noti-content">${notification.content}</span>
              <small class="noti-time">vài giấy trước</small></div>
            </div>
          </div>
          <button class="noti-mana-btn btn btn-white btn-icon small-btn">
            <span class="icomoon icon-dots-three-horizontal"></span>
          </button>
          <div class="noti-mana-box d-none">
            <div class="noti-mana-item d-flex align-items-center toggle-status-notify">
              <span class="icomoon icon-check-circle-o"></span><span>Đánh dấu là đã đọc</span>
            </div>
            <div class="noti-mana-item d-flex align-items-center del-status-notify">
              <span class="icomoon icon-times-circle-o"></span>
              <span>Gỡ bỏ thông báo này</span>
              <button class="btn btn-icon btn-red confirm-del-noti d-none"><span class="icomoon icon-checkmark"></span></button>
            </div>
          </div>
      </div>
    `
    const $box = $('#notify-drop')
    if (!$box.find('.notify-item').length) {
      $box.html(html)
    } else {
      $box.prepend(html)
    }
    if (!$('#member-notify-btn').hasClass('un-read')) {
      $('#member-notify-btn').addClass('un-read')
    }
  })
})()

export default Header