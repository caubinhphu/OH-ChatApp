import axios from 'axios'

const Profile = (() => {
  const friendContent = document.getElementById('friend-content');

  $('a[data-toggle="tab"]').on('shown.bs.tab', async (e) => {
    if (e.target.hash === '#friend') {
      try {
        const responsive = await axios.get('/messenger/profile/friends');
        const friends = responsive.data.friends;
        friendContent.innerHTML = friends.map(friend => {
          return `<div class="col-12 col-md-6">
          <div class="d-flex align-items-center border p-2 rounded my-2">
            <img class="rounded-circle lazyload" alt="${friend.name}" width="80px" height="80px" data-src="${friend.avatar}" />
            <a class="flex-fill mx-2" href="#"><strong>${friend.name}</strong></a>
            <div class="d-flex flex-column">
              <button class="btn btn-sm btn-primary">Chat</button>
              <button class="btn btn-sm btn-danger mt-1">Hủy kết bạn</button>
            </div>
          </div>
        </div>`;
        }).join('');
      } catch (error) {
        console.error(error);
      }
    } else if (e.target.hash === '#friend-request') {
      try {
        const requests = await axios.get('/messenger/profile/friend-request');
        console.log(requests);
      } catch (error) {
        console.error(error);
      }
    } else if (e.target.hash === '#friend-invitation') {
      try {
        const invitations = await axios.get(
          '/messenger/profile/friend-invitation'
        );
        console.log(invitations);
      } catch (error) {
        console.error(error);
      }
    }
  });

})()

export default Profile