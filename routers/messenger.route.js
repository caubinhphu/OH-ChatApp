const express = require('express');

const router = express.Router();

const controller = require('../controllers/messenger.controller');

router.get('/', controller.getIndex);

router.get('/chatold', controller.getChatOld)

router.route('/profile')
  .get(controller.getProfile)
  .put(controller.putProfile)

router.get('/setting', controller.getSetting)

router.put('/setting/password', controller.putPassword)

router.put('/setting/email', controller.putEmail)

router.put('/profile/avatar', controller.putAvatar)

router.get('/profile/friends', controller.getFriends);

router.get('/profile/friend-request', controller.getFriendRequests);

router.get('/profile/friend-invitation', controller.getFriendInvitations);

router.get('/chat/:friendId', controller.getChatFriend);

router.get('/addfriend/:friendId', controller.getAddFriend);

router.get('/member/:memberId', controller.getMemberInfo);

// router.get('/verify-email/:token', controller.getAddFriend)

// router.get('/profile/add', async (req, res) => {
//   try {
//     const member = await Member.findById(req.user.id);
//     if (member) {
//       const ms = await Member.find({});
//       console.log(ms);
//       ms.forEach((m) => {
//         member.friends.push({ _id: m._id });
//       });
//       await member.save();
//       res.sendStatus(200);
//     } else {
//       res.sendStatus(401);
//     }
//   } catch (error) {
//     res.sendStatus(403);
//   }
// });

module.exports = router;
