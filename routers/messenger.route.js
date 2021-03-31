const express = require('express');

const router = express.Router();

const controller = require('../controllers/messenger.controller');

router.get('/', controller.getIndex);

router.get('/search', controller.getSearch)

router.get('/chatold', controller.getChatOld)

router.route('/profile')
  .get(controller.getProfile)
  .put(controller.putProfile)

router.put('/accept-invitation', controller.putAddFriend);

router.post('/add-request', controller.postFriendRequest);

router.delete('/destroy-request', controller.deleteFriendRequest);

router.delete('/delete-invitation', controller.deleteFriendInvitation);

router.delete('/destroy-friend', controller.deleteFriend);

router.get('/setting', controller.getSetting)

router.put('/setting/password', controller.putPassword)

router.put('/setting/url', controller.putUrl)

router.put('/profile/avatar', controller.putAvatar)

router.get('/profile/friends', controller.getFriends);

router.get('/profile/friend-request', controller.getFriendRequests);

router.get('/profile/friend-invitation', controller.getFriendInvitations);

router.get('/chat/:friendId', controller.getChatFriend);

router.get('/chat-media/:friendId', controller.getChatMediaFriend);

router.get('/member/:memberId', controller.getMemberInfo);

module.exports = router;
