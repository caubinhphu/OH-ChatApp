import axios from 'axios'
import Croppie from "croppie";

const Profile = (() => {
  if ($('#main.profile-page').length) {
    const clWrapCrop = '.wrap-crop-img'
    const clWrapOpt = '.wrap-opt-avatar'

    let isHasFriend = true
    let allowLoadFriend = true
    let pageFriend = 0
    let isHasFriendRequest = true
    let allowLoadFriendRequest = true
    let pageFriendRequest = 0
    let isHasFriendInvitation = true
    let allowLoadFriendInvitation = true
    let pageFriendInvitation = 0

    navigator.mediaDevices.getUserMedia =
      navigator.mediaDevices.getUserMedia ||
      navigator.mediaDevices.webkitGetUserMedia ||
      navigator.mediaDevices.mozGetUserMedia ||
      navigator.mediaDevices.msGetUserMedia;

    const friendContent = document.getElementById('friend-content');
    const friendRequest = document.getElementById('friend-request');
    const friendInvitation = document.getElementById('friend-invitation');
    reloadPage()
    $('a[data-toggle="tab"]').on('shown.bs.tab', (e) => {
      window.location.hash = e.target.hash;
      loadDataFriend(e.target.hash)
    });

    const imgCrop = document.querySelector('#crop-img')
    // init croppie avatar
    const croppie = new Croppie(imgCrop, {
      enableExif: true,
      viewport: {
        width: 100,
        height: 100,
        type: 'circle'
      },
      boundary: {
        width: 300,
        height: 300
      }
    });

    $('#avatar').on('change', function() {
      const extTypes = /jpeg|jpg|png|gif/;

      const extFile = this.files[0].name
        .split('.')
        .pop()
        .toLowerCase();
      // check extname
      const extname = extTypes.test(extFile);

      // check type file
      const type = extTypes.test(this.files[0].type);

      if (extname && type) {
        // show modal crop avatar
        $(clWrapCrop).removeClass('d-none')
        $(clWrapOpt).addClass('d-none')

        // create reader read file from input file avatar
        const reader = new FileReader();
        reader.onload = async function(e) {
          await croppie.bind({
            url: e.target.result
          });
        };
        reader.readAsDataURL(this.files[0]);
      } else {
        window.outputErrorMessage('File ảnh không đúng định dạng')
      }
    });

    $('#cancel-crop-btn').on('click', reInitChooseFile)

    // take photo
    $('#btn-takephoto').on('click', async () => {
      $(clWrapOpt).addClass('d-none')
      // get photo
      const { file: picture } = await window.takePicture($('#modal-crop-avatar'))
      if (picture) {
        // create reader read file from input file avatar
        // crop photo
        const reader = new FileReader();
        reader.onload = async (e) => {
          await croppie.bind({
            url: e.target.result
          });
        };
        reader.readAsDataURL(picture);

        $(clWrapCrop).removeClass('d-none')
      }
    })

    // crop image
    $('#crop-btn').on('click', async function() {
      $('.wrap-loader').removeClass('d-none')
      const dataCrop = await croppie.result({
        type: 'base64',
        size: 'viewport'
      });

      const blob = dataURLtoFile(dataCrop, 'avatar.png');
      const formData = new FormData();
      formData.append('avatar', blob);

      const xhr = new XMLHttpRequest();
      xhr.open('put', `${location.origin}/messenger/profile/avatar`, true);

      xhr.onreadystatechange = function() {
        if (this.readyState === 4) {
          $('.wrap-loader').addClass('d-none')
          $('#modal-crop-avatar').modal('hide')
          reInitChooseFile()
          // console.log('finish');
          // finish
          // check status
          const data = JSON.parse(this.responseText);
          if (this.status === 200) {
            // OK
            $('img.avatar').attr('src', data.src)
            window.outputSuccessMessage(data.mgs)
          } else {
            // error
            window.outputErrorMessage(data.mgs)
          }
        }
      };

      xhr.send(formData);
    });


    const $popupConfirm = $('.popup-confirm')

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
      await window.acceptAddFriend(
        memberId,
        $(this).parents('.fri-item-ctrl'),
        false,
        false,
        () => {
          $(this).parents('.wrap-fri-item').remove()
        }
      )
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
        $(`.wrap-fri-item[data-id=${window.memberId}]`).find('.fri-item-ctrl'),
        false,
        () => {
          $(`.wrap-fri-item[data-id="${window.memberId}"]`).remove()
        }
      )
    })

    $('.close-popup-con').on('click', () => {
      $popupConfirm.addClass('d-none')
      window.memberId = undefined
      window.typeConfirm = undefined
    })

    $('.del-text').on('click', function(e) {
      e.preventDefault()
      $(this).next('.confirm-del-text').removeClass('d-none')
    })

    $(document).on('click', (e) => {
      const $target = $(e.target)
      $('.confirm-del-text').each(function() {
        // console.log($target);
        // console.log(this);
        // console.log(!$(this).has($target));
        if (!$($target).closest('.confirm-del-text').is(this) && !$($target).closest('.del-text').length) {
          $(this).addClass('d-none')
        }
      })
    })

    $('.confirm-del-text').on('click', async function(e) {
      e.preventDefault()
      const $rowText = $(this).parents('tr')
      const id = $rowText.attr('data-id')
      $rowText.find('.wrap-del-text').addClass('loader-del-text')
      $('.loader-text-del').removeClass('d-none')
      if (id) {
        try {
          const responsive = await axios.delete(`/utility/text`, {
            data: { id },
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            }
          });
          const { messages } = responsive.data;
          window.outputSuccessMessage(messages)
          $rowText.remove()

          const $wrap = $('.wrap-text-list')
          if (!$wrap.find('table tbody tr').length) {
            $wrap.html(`<div class="text-center">
              <h4><em>Không có Text nào</em></h4>
            </div>`)
          }
        } catch (error) {
          $rowText.find('.wrap-del-text').removeClass('loader-del-text')
          window.outputErrorMessage(error?.response?.data?.message)
        }
      }
      $('.loader-text-del').addClass('d-none')
    })

    $('.create-new-text').on('click', async (e) => {
      e.preventDefault()
      try {
        const response = await axios.post('/utility/text', {}, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      const url = `${location.origin}/utility/text/${response.data.textId}`
      window.open(url)
      } catch (error) {
        if (error.response.status === 401) {
          window.outputErrorMessage('Bạn cần đăng nhập để thưc hiện chức năng này')
        } else {
          window.outputErrorMessage('Không tạo được Text mới')
        }
      }
    })

    $('.copy-link-text').on('click', function(e) {
      e.preventDefault()
      const $ele = $(this).nextAll('.link-text-box')
      $ele.select()
      document.execCommand('copy')
      window.outputSuccessMessage('Sao chép thành công')
    })

    async function loadDataFriend(hash) {
      $('.wrap-loader-friend').removeClass('d-none')
      if (hash === '#friend' && isHasFriend && allowLoadFriend) {
        allowLoadFriend = false
        try {
          const responsive = await axios.get(`/messenger/profile/friends?page=${pageFriend}`);
          const { friends, hasFriend } = responsive.data;
          $(friendContent).append(
            friends.map(friend => {
              return `<div class="col-md-6 wrap-fri-item" data-id="${friend.id}">
              <div class="d-flex align-items-center border p-2 rounded my-2">
                <img class="rounded-circle max-w-80" alt="${friend.name}" src="${friend.avatar}" title="${friend.name}" />
                <a class="flex-fill mx-2" href="/messenger/member/${friend.url ? friend.url : friend.id}" title="${friend.name}">
                  <strong class="name-member">${friend.name}</strong>
                </a>
                <div class="d-flex flex-column fri-item-ctrl">
                  <a href="/messenger/${friend.url ? friend.url : friend.id}" class="btn">Nhắn tin</a>
                  <button class="btn btn-red mt-1 des-friend" data-id="${friend.id}">
                    Hủy kết bạn
                  </button>
                </div>
              </div>
            </div>`;
            }).join('')
          )
          isHasFriend = hasFriend
          pageFriend++
        } catch (error) {
          window.outputErrorMessage(error?.response?.data?.message)
        }
        allowLoadFriend = true
      } else if (hash === '#friend-request' && isHasFriendRequest && allowLoadFriendRequest) {
        try {
          const requests = await axios.get(`/messenger/profile/friend-request?page=${pageFriendRequest}`);
          const { friends, hasFriend } = requests.data;
          $(friendRequest).append(
            friends.map(friend => {
              return `<div class="col-md-6 wrap-fri-item" data-id="${friend.id}">
              <div class="d-flex align-items-center border p-2 rounded my-2">
                <img class="rounded-circle max-w-80" alt="${friend.name}" src="${friend.avatar}" title="${friend.name}" />
                <a class="flex-fill mx-2" href="/messenger/member/${friend.url ? friend.url : friend.id}" title="${friend.name}">
                  <strong class="name-member">${friend.name}</strong>
                </a>
                <div class="d-flex flex-column fri-item-ctrl">
                  <button class="btn btn-red mt-1 des-req-friend" data-id="${friend.id}">
                    Hủy yêu cầu
                  </button>
                </div>
              </div>
            </div>`;
            }).join('')
          )
          isHasFriendRequest = hasFriend
          pageFriendRequest++
        } catch (error) {
          window.outputErrorMessage(error?.response?.data?.message)
        }
      } else if (hash === '#friend-invitation' && isHasFriendInvitation && allowLoadFriendInvitation) {
        try {
          const invitations = await axios.get(
            `/messenger/profile/friend-invitation?page=${pageFriendInvitation}`
          );
          const { friends, hasFriend } = invitations.data;
          $(friendInvitation).append(
            friends.map(friend => {
              return `<div class="col-md-6 wrap-fri-item" data-id="${friend.id}">
              <div class="d-flex align-items-center border p-2 rounded my-2">
                <img class="rounded-circle max-w-80" alt="${friend.name}" src="${friend.avatar}" title="${friend.name}" />
                <a class="flex-fill mx-2" href="/messenger/member/${friend.url ? friend.url : friend.id}" title="${friend.name}">
                  <strong class="name-member">${friend.name}</strong>
                </a>
                <div class="d-flex flex-column fri-item-ctrl">
                  <button class="btn mt-1 accept-inv-friend" data-id="${friend.id}">Chấp nhận</button>
                  <button class="btn btn-red mt-1 del-inv-friend" data-id="${friend.id}">
                    Xóa yêu cầu
                  </button>
                </div>
              </div>
            </div>`;
            }).join('')
          )
          isHasFriendInvitation = hasFriend
          pageFriendInvitation++
        } catch (error) {
          window.outputErrorMessage(error?.response?.data?.message)
        }
      }
      $('.wrap-loader-friend').addClass('d-none')
    }

    window.loadDataFriend = loadDataFriend
    function reloadPage() {
      const hash = location.hash
      if (['#friend', '#friend-invitation', '#friend-request'].includes(hash)) {
        loadDataFriend(hash)
        $('#friend-area').find(`.tab-pane${hash}`).addClass(['show', 'active'])
        $('#friend-area').find(`.nav-link[href="${hash}"]`).addClass('active')
      }
    }

    // re-init choose file avatar
    function reInitChooseFile() {
      $(clWrapCrop).addClass('d-none')
      $(clWrapOpt).removeClass('d-none')
      $('input#avatar').val('')
    }

    // create file from data base64
    function dataURLtoFile(dataurl, filename) {
      let arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    }
  }
})()

export default Profile