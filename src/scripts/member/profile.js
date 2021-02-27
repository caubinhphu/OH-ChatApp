import axios from 'axios'
import Croppie from "croppie";

const Profile = (() => {
  navigator.mediaDevices.getUserMedia =
    navigator.mediaDevices.getUserMedia ||
    navigator.mediaDevices.webkitGetUserMedia ||
    navigator.mediaDevices.mozGetUserMedia ||
    navigator.mediaDevices.msGetUserMedia;

  const friendContent = document.getElementById('friend-content');

  async function loadDataFriend(hash) {
    if (hash === '#friend') {
      try {
        const responsive = await axios.get('/messenger/profile/friends');
        const friends = responsive.data.friends;
        friendContent.innerHTML = friends.map(friend => {
          return `<div class="col-md-6">
          <div class="d-flex align-items-center border p-2 rounded my-2">
            <img class="rounded-circle" alt="${friend.name}" width="80px" height="80px" src="${friend.avatar}" />
            <a class="flex-fill mx-2" href="#"><strong>${friend.name}</strong></a>
            <div class="d-flex flex-column">
              <a href="#" class="btn">Chat</a>
              <button class="btn btn-red mt-1">Hủy kết bạn</button>
            </div>
          </div>
        </div>`;
        }).join('');
      } catch (error) {
        console.error(error);
      }
    } else if (hash === '#friend-request') {
      try {
        const requests = await axios.get('/messenger/profile/friend-request');
        console.log(requests);
      } catch (error) {
        console.error(error);
      }
    } else if (hash === '#friend-invitation') {
      try {
        const invitations = await axios.get(
          '/messenger/profile/friend-invitation'
        );
        console.log(invitations);
      } catch (error) {
        console.error(error);
      }
    }
  }

  // loadDataFriend(location.hash)
  $('a[data-toggle="tab"]').on('shown.bs.tab', async (e) => {
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
      $('.wrap-crop-img').removeClass('d-none')
      $('.wrap-opt-avatar').addClass('d-none')
  
      // create reader read file from input file avatar
      const reader = new FileReader();
      reader.onload = async function(e) {
        await croppie.bind({
          url: e.target.result
        });
      };
      reader.readAsDataURL(this.files[0]);
    } else {
      outputErrorMessage('File ảnh không đúng định dạng')
    }
  });

  $('#cancel-crop-btn').on('click', reInitChooseFile)

  // take photo
  $('#btn-takephoto').on('click', async () => {
    $('.wrap-opt-avatar').addClass('d-none')
    // get photo
    const picture = await takePicture()
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

      $('.wrap-crop-img').removeClass('d-none')
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
        console.log('finish');
        // finish
        // check status
        const data = JSON.parse(this.responseText);
        if (this.status === 200) {
          // OK
          $('img.avatar').attr('src', data.src)
          outputSuccessMessage(data.mgs)
        } else {
          // error
          outputErrorMessage(data.mgs)
        }
      }
    };

    xhr.send(formData);
  });

  // function sleep
  const sleep = m => new Promise(r => setTimeout(r, m))

  // function take a photo and return file type image
  async function takePicture() {
    if (navigator.mediaDevices.getUserMedia) {
      try {
        // get video stream
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        // show video stream
        const $wrapTake = $('.wrap-takephoto')
        $wrapTake.find('video').each((i, vd) => {
          if ('srcObject' in vd) {
            vd.srcObject = videoStream;
          } else {
            vd.src = window.URL.createObjectURL(videoStream);
          }
        })
        $wrapTake.removeClass('d-none')
        // count down
        $('.count-down').removeClass('d-none')

        // sleep 4s
        await sleep(4000)

        // take photo from video
        const video = $wrapTake.find('video').get(0)
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        const dataURL = canvas.toDataURL('image/jpeg');
        // create file image
        const file = dataURLtoFile(dataURL, 'capture')

        canvas.className = 'res-capture ps-as'
        $wrapTake.append(canvas)

        await sleep(320)

        // stop video stream after take photo
        $('.count-down').addClass('d-none')
        $wrapTake.addClass('d-none')
        $wrapTake.find('canvas').remove()
        videoStream.getVideoTracks()[0].stop()
        $wrapTake.find('video').each((i, vd) => {
          if ('srcObject' in vd) {
            vd.srcObject = null;
          } else {
            vd.src = null;
          }
        })

        // return file
        return file
      } catch (error) {
        outputWarnMessage('Bạn đã chặn quyền sử dụng microphone')
      }
    }
  }

  // re-init choose file avatar
  function reInitChooseFile() {
    $('.wrap-crop-img').addClass('d-none')
    $('.wrap-opt-avatar').removeClass('d-none')
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
})()

export default Profile