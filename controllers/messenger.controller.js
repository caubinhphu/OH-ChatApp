const fs = require('fs');
const moment = require('moment');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const Member = require('../models/Member');
const GroupMessage = require('../models/GroupMessage');
const { validateProfile, validateSettingPassword } = require('../validation/profile.validation');
const cloudinary = require('../utils/cloudinary');

const storage = multer.diskStorage({
  // destination: './public/images/users/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// upload file
const upload = multer({
  storage: storage,
  // limits: { fileSize: 10 },
  fileFilter: (req, file, cb) => {
    // ext type
    const extTypes = /jpeg|jpg|png|gif/;

    // check extname
    const extname = extTypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    // check mimetype
    const mime = extTypes.test(file.mimetype);

    if (extname && mime) {
      cb(null, true);
    } else {
      cb('File ảnh không đúng định dạng');
    }
  },
}).single('avatar');

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
      const birthOfDate = moment(member.birthOfDate).format('YYYY-MM-DD');
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

// put profile of member
module.exports.putProfile = async (req, res, next) => {
  // get data put
  const {
    name,
    birthday,
    gender,
    phone,
    address,
    'fake-avatar': fakeAvatar,
    // 'fake-email': fakeEmail
  } = req.body;

  // validate info register
  const { error } = validateProfile({ name, birthday, gender, phone, address });

  const errorText = [];
  if (error) {
    errorText.push(error.details[0].message);
    const fakeMember = {
      name,
      birthday,
      gender: +gender,
      phone,
      address,
      avatar: fakeAvatar,
      // email: fakeEmail
    }
    res.render('messenger/profile', {
      titleSide: 'OH Chat - Messenger',
      errorText,
      member: fakeMember,
      birthOfDate: fakeMember.birthday
    });
  } else {
    // get member
    try {
      const member = await Member.findById(req.user.id);
      if (member) {
        // update info
        member.name = name
        member.gender = +gender
        member.phone = phone
        member.address = address
        member.birthOfDate = new Date(birthday)

        // save info
        await member.save()

        req.flash('success', 'Cập nhật thông tin thành công')
        res.redirect('/messenger/profile')
      } else {
        req.flash('error', 'Thành viên không tồn tại');
        res.redirect('/');
      }
    } catch (err) {
      next(err);
    }
  }
};

// put avatar of member
module.exports.putAvatar = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ mgs: err.message });
    } else {
      try {
        const member = await Member.findById(req.user.id);
        if (member) {
          // upload
          const result = await cloudinary.upload(
            req.file.path,
            path.basename(req.file.filename, path.extname(req.file.filename)),
            'ohchat/avatar'
          );
          const urlAvatar = result.url;

          // update db
          member.avatar = urlAvatar
          await member.save()

          return res
            .status(200)
            .json({ mgs: 'Cập nhật avatar thành công', src: urlAvatar });
        } else {
          return res.status(400).json({ mgs: 'Cập nhật avatar thất bại' });
        }
        } catch (error) {
          return res.status(400).json({ mgs: 'Cập nhật avatar thất bại' });
      }
    }
  });
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
    const friendsId = member.friends.map(f => f._id);
    friendsId.push(member._id);
    const m = await Member.find({ _id: { "$nin": friendsId } });
    if (member) {
      const friends = member.getFriends();
      const friendChat = friends.find(fr => fr.id === req.params.friendId);
      res.render('messenger', {
        titleSite: 'OH Chat - Messenger',
        friends,
        friendChat,
        m: m.map(x => {
          return {
            id: x.id,
            name: x.name
          }
        })
      });
    } else {
      next(new Error('Not member'));
    }
  } catch (error) {
    next(error);
  }
};

module.exports.getAddFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const member = await Member.findById(req.user.id);
    const friend = await Member.findById(friendId);
    if (member && friend) {
      const groupMessage = await GroupMessage.create({
        messages: []
      });
      member.friends.push({
        _id: friendId,
        groupMessageId: groupMessage._id
      });
      friend.friends.push({
        _id: member._id,
        groupMessageId: groupMessage._id
      });
      await member.save();
      await friend.save();
      res.send('ok');
    } else {
      next(new Error('Not member'));
    }
  } catch (error) {
    next(error);
  }
};

// get setting messenger page
module.exports.getSetting = async (req, res, next) => {
  // get member
  try {
    const member = await Member.findById(req.user.id);
    if (member) {
      res.render('messenger/setting', {
        titleSite: 'OH Chat - Setting',
      });
    } else {
      req.flash('error', 'Thành viên không tồn tại');
      res.redirect('/');
    }
  } catch (error) {
    next(error);
  }
}


// put setting change pasword
module.exports.putPassword = async (req, res, next) => {
  // get info change password
  const { password0, password, password2 } = req.body;

  // validate info change
  const { error } = validateSettingPassword({ password, password2 });

  const errorText = [];
  if (error) {
    // not pass validate
    errorText.push(error.details[0].message);
    res.render('messenger/setting', {
      titleSide: 'OH Chat - Setting',
      errorText,
      tab: 'security',
      subTab: 'password'
    });
  } else {
    try {
      // pass validate
      const member = await Member.findById(req.user.id);
      if (member) {
        // check old password
        const checkPassword = await bcrypt.compare(password0, member.password);
        if (!checkPassword) {
          errorText.push('Mật khẩu không đúng');
          res.render('messenger/setting', {
            titleSide: 'OH Chat - Setting',
            errorText,
            tab: 'security',
            subTab: 'password'
          });
        } else {
          // correct old password
          // change password by new password
          // create hash password
          const salt = await bcrypt.genSalt(10);
          const passHash = await bcrypt.hash(password, salt);
          member.password = passHash
          await member.save()
          res.render('messenger/setting', {
            titleSide: 'OH Chat - Setting',
            successText: ['Đổi mật khẩu thành công'],
            tab: 'security',
            subTab: 'password'
          });
        }
      } else {
        req.flash('error', 'Thành viên không tồn tại');
        res.redirect('/');
      }
    } catch (err) {
      next(err)
    }
  }
}