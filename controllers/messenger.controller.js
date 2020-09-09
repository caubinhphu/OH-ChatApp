const moment = require('moment');
const Member = require('../models/Member');

// get index messenger page
module.exports.getIndex = async (req, res, next) => {
  try {
    const member = await Member.findById(req.user.id).populate('friends._id');
    if (member) {
      const friends = member.getFriends();
      if (friends.length > 0) {
        res.redirect(`/messenger/chat/${friends[0].id}`);
      } else {
        res.render('messenger', {
          titleSite: 'OH Chat - Messenger',
          friends,
        });
      }
    } else {
      next(new Error('Not member'));
    }
  } catch (error) {
    next(error);
  }
};

// get my profile
module.exports.getProfile = async (req, res, next) => {
  // get member
  try {
    const member = await Member.findById(req.user.id);
    if (member) {
      birthOfDate = moment(member.birthOfDate).format('YYYY-MM-DD');
      res.render('messenger/profile', {
        titleSite: 'OH Chat - Messenger',
        member,
        birthOfDate,
      });
    } else {
      req.flash('error', 'Thành viên không tồn tại');
      res.redirect('/');
    }
  } catch (error) {
    next(error);
  }
};

// get my friends
module.exports.getFriends = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id).populate('friends._id');
    if (member) {
      const friends = member.getFriends();
      res.json({
        friends,
      });
    } else {
      res.sendStatus(401);
    }
  } catch (error) {
    res.sendStatus(403);
  }
};

// get my friend requests
module.exports.getFriendRequests = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (member) {
      res.json({
        type: 'friend-request',
        member,
      });
    } else {
      res.sendStatus(401);
    }
  } catch (error) {
    res.sendStatus(403);
  }
};

// get my friend invitations
module.exports.getFriendInvitations = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (member) {
      res.json({
        type: 'friend-invitation',
        member,
      });
    } else {
      res.sendStatus(401);
    }
  } catch (error) {
    res.sendStatus(403);
  }
};

module.exports.getChatFriend = async (req, res) => {
  try {
    const member = await Member.findById(req.user.id).populate('friends._id');
    if (member) {
      const friends = member.getFriends();
      res.render('messenger', {
        titleSite: 'OH Chat - Messenger',
        friends,
        friendActiveId: req.params.friendId,
      });
    } else {
      next(new Error('Not member'));
    }
  } catch (error) {
    next(error);
  }
};
