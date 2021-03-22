const fs = require('fs');
const moment = require('moment');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Member = require('../models/Member');
const GroupMessage = require('../models/GroupMessage');
const {
  validateProfile,
  validateSettingPassword,
  validateSettingUrl
} = require('../validation/profile.validation');
const cloudinary = require('../utils/cloudinary');
// const sendMail = require('../utils/send-mail');
const { formatMessageList, formatLatestMsg } = require('../utils/messenger');
const key = require('../config/key');

const siteMes = 'OH Chat - Messenger'
const notMem = 'Thành viên không tồn tại'
const settingUrl = '/messenger/setting'

// number msg be loaded per a time
const msgPerLoad = 20

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
        res.redirect(`/messenger/chat/${friends[0].url ? friends[0].url : friends[0].id}`);
      } else {
        res.render('messenger', {
          titleSite: siteMes,
          friends,
        });
      }
    } else {
      next(new Error(notMem));
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
        titleSite: siteMes,
        member,
        birthOfDate,
      });
    } else {
      req.flash('error', notMem);
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
      titleSide: siteMes,
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
        req.flash('error', notMem);
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

// get view chat with friend
module.exports.getChatFriend = async (req, res, next) => {
  try {
    const member = await Member.findById(req.user.id)
      .populate('friends._id')
      .populate({
        path: 'friends.groupMessageId',
        populate: {
          path: 'messages',
          options: {
            sort: { _id: -1},
          },
          perDocumentLimit: msgPerLoad,
        },
      });
    if (member) {
      const friends = member.getFriendsHaveMessage();
      const friendChat = friends.find(fr => fr.id === req.params.friendId || fr.url === req.params.friendId);
      // generate jwt token
      const token = jwt.sign(
        { data: { memberId: friendChat.id } },
        process.env.JWT_SECRET
      );

      // set local time moment
      moment.updateLocale('vi', {
        relativeTime: {
          m:  "1 phút",
          h:  "1 giờ",
          d:  "1 ngày",
          w:  "1 tuần",
          M:  "1 tháng",
          y:  "1 năm",
        }
      })
      moment.locale('vi')

      // set status text
      let statusText = '<strong class="text-success">Đang hoạt động</strong>'
      if (friendChat.status !== 'online') {
        const textTimeFrom = moment(friendChat.status).fromNow()
        statusText = `<strong class="text-secondary">Hoạt động ${textTimeFrom}</strong>`
      }

      // format msg latest
      friends.forEach(fr => {
        if (fr.messages.length) {
          fr.latestMessage = formatLatestMsg(fr.messages[0], member, fr)
        }
      })

      // format list msg friend is chatting
      const messagesActive = formatMessageList(friendChat.messages, member, friendChat)

      res.render('messenger', {
        titleSite: siteMes,
        friends,
        friendChat,
        messagesActive,
        token,
        statusText
      });
    } else {
      next(new Error(notMem));
    }
  } catch (error) {
    next(error);
  }
};

// get old msg
module.exports.getChatOld = async (req, res) => {
  const { friendid: friendId, page } = req.query
  try {
    const member = await Member.findById(req.user.id)
      .populate({
        path: 'friends._id',
        match: { _id: friendId }
      })
      .populate({
        path: 'friends.groupMessageId',
        populate: {
          path: 'messages',
          options: {
            // limit: msgPerLoad + 1,
            sort: { _id: -1},
            skip: msgPerLoad * page
          },
          perDocumentLimit: msgPerLoad,
        }
      })
    if (member) {
      const friendRelated =  member.friends.find(fr => fr._id)
      if (friendRelated) {
        const messages = formatMessageList(friendRelated.groupMessageId.messages, member, friendRelated._id)
        let hasMsg = false
        console.log(messages);
        if (messages.length > msgPerLoad) {
          messages.pop()
          hasMsg = true
        }
        return res.status(200).json({ messages, hasMsg })
      }
    }
    return res.status(400).json({ mgs: 'User không tồn tại' })
  } catch (error) {
    res.status(400).json({ mgs: 'User không tồn tại' })
  }
}

// add friend
module.exports.getAddFriend = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const member = await Member.findById(req.user.id);
    let friend = null
    if (friendId.match(/^[0-9a-fA-F]{24}$/)) {
      friend = await Member.findById(friendId)
    } else {
      friend = await Member.findOne({ url: friendId });
    }
    if (member && friend && friend.active) {
      const groupMessage = await GroupMessage.create({
        messages: []
      });
      member.friends.push({
        _id: friendId,
        groupMessageId: groupMessage._id
      });
      friend.friends.push({
        _id: member.id,
        groupMessageId: groupMessage._id
      });
      await member.save();
      await friend.save();
      res.send('ok');
    } else {
      next(new Error(notMem));
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
        member,
        key
      });
    } else {
      req.flash('error', notMem);
      res.redirect('/');
    }
  } catch (error) {
    next(error);
  }
}

// put setting change password
module.exports.putPassword = async (req, res, next) => {
  // get info change password
  const { password0, password, password2 } = req.body;

  // validate info change
  const { error } = validateSettingPassword({ password, password2 });

  if (error) {
    // not pass validate
    req.flash('error', error.details[0].message);
    req.flash('tab', 'security');
    req.flash('sub-tab', 'password');
    return res.redirect(settingUrl)
  } else {
    try {
      // pass validate
      const member = await Member.findById(req.user.id);
      if (member) {
        // check old password
        const checkPassword = await bcrypt.compare(password0, member.password);
        if (!checkPassword) {
          req.flash('error', 'Mật khẩu không đúng');
          req.flash('tab', 'security');
          req.flash('sub-tab', 'password');
          return res.redirect(settingUrl)
        } else {
          // correct old password
          // change password by new password
          // create hash password
          const salt = await bcrypt.genSalt(10);
          const passHash = await bcrypt.hash(password, salt);
          member.password = passHash
          await member.save()

          req.flash('success', 'Đổi mật khẩu thành công');
          req.flash('tab', 'security');
          req.flash('sub-tab', 'password');
          return res.redirect(settingUrl)
        }
      } else {
        req.flash('error', notMem);
        res.redirect('/');
      }
    } catch (err) {
      next(err)
    }
  }
}

// put setting change url
module.exports.putUrl = async (req, res, next) => {
  // get info change email
  const { url } = req.body;

  // validate info change
  const { error } = validateSettingUrl({ url });

  if (error) {
    // not pass validate
    req.flash('error', error.details[0].message);
    req.flash('tab', 'security');
    req.flash('sub-tab', 'url');
    return res.redirect(settingUrl)
  } else {
    // check url exists
    try {
      const member = await Member.findById(req.user.id);
      const memberOther = await Member.findOne({ url });
      if (member) {
        if (memberOther) {
          req.flash('error', 'Url đã được sử dụng');
          req.flash('tab', 'security');
          req.flash('sub-tab', 'url');
          return res.redirect(settingUrl)
        } else {
          member.url = url
          await member.save()
  
          req.flash('success', 'Đổi url thành công');
          req.flash('tab', 'security');
          req.flash('sub-tab', 'url');
          return res.redirect(settingUrl)
        }
      }
    } catch (err) {
      next(err);
    }
  }
}

// // get verify change email
// module.exports.getVerifyChangeEmail = async (req, res, next) => {
//   const { token } = req.params;

//   try {
//     const member = await Member.findById(req.user.id);
//     if (!member) {
//       req.flash('error', notMem);
//       return res.redirect('/');
//     }

//     member.verifyToken = '';
//     member.email = member.newEmail;
//     member.newEmail = '';

//     await member.save();
//     req.flash('success', 'Xác nhận thay đổi email thành công');

//     res.redirect('/');
//   } catch (error) {
//     next(error);
//   }
// };


// get member info by ID
module.exports.getMemberInfo = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    let member = null
    if (memberId.match(/^[0-9a-fA-F]{24}$/)) {
      member = await Member.findById(memberId)
    } else {
      member = await Member.findOne({ url: memberId });
    }

    const me = await Member.findById(req.user.id);
    if (member && me) {
      let isFriend = false
      if (me.friends.find(fr => fr.id === member.id)) {
        isFriend = true
      }
      res.render('messenger/member', {
        titleSite: siteMes,
        member,
        isFriend
      })
    } else {
      next(new Error(notMem));
    }
  } catch (error) {
    next(error);
  }
};

// get chat media (audio, video, share screen) with friend
module.exports.getChatMediaFriend = async (req, res, next) => {
  const { friendId } = req.params
  try {
    let friend = null
    if (friendId.match(/^[0-9a-fA-F]{24}$/)) {
      friend = await Member.findById(friendId)
    } else {
      friend = await Member.findOne({ url: friendId });
    }
    const member = await Member.findById(req.user.id)
    if (friend && member) {
      res.render('messenger/chat-media', {
        titleSide: siteMes,
        friend,
        member
      })
    } else {
      next(new Error(notMem));
    }
  } catch (error) {
    next(error)
  }
}