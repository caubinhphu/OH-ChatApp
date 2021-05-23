const moment = require('moment');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Member = require('../models/Member');
const GroupMessage = require('../models/GroupMessage');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Text = require('../models/Text');

const {
  validateProfile,
  validateSettingPassword,
  validateSettingUrl
} = require('../validation/profile.validation');
const cloudinary = require('../utils/cloudinary');
const { formatMessageList, formatLatestMsg } = require('../utils/messenger');
const key = require('../config/key');

const siteMes = 'OH Chat - Messenger'
const notMem = 'Thành viên không tồn tại'
const hasErrMsg = 'Có lỗi xảy ra'
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
  storage,
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

// upload file multiple
const uploadMulti = multer({
  storage,
  limits: { fileSize: 1000000, files: 5 },
  fileFilter: (req, file, cb) => {
    // ext type
    const extTypes = /js/;

    // check extname
    const extname = !extTypes.test(path.extname(file.originalname).toLowerCase());

    // check mimetype
    const mime = !extTypes.test(file.mimetype);

    if (extname && mime) {
      cb(null, true);
    } else {
      cb(new Error('Định dạng file không hợp lệ'));
    }
  },
}).array('files');

async function removeFileUpload(messageIds) {
  try {
    // delete file upload
    const messageFiles = await Message.find({ _id: { $in: messageIds }, type: { $in: ['raw', 'image', 'video', 'audio'] } })
    if (messageFiles) {
      const publicIds = {
        resRaws: [],
        resImages: [],
        resVideos: []
      }

      messageFiles.forEach(msg => {
        const id = msg.content.match(/files.*$/g)
        if (id) {
          if (msg.type === 'raw') {
            publicIds.resRaws.push('ohchat/upload/' + id[0])
          } else if (msg.type === 'image') {
            publicIds.resImages.push('ohchat/upload/' + path.basename(id[0], path.extname(id[0])))
          } else if (msg.type === 'video' || msg.type === 'audio') {
            publicIds.resVideos.push('ohchat/upload/' + path.basename(id[0], path.extname(id[0])))
          }
        }
      })
      await cloudinary.deleteResources(publicIds)
    }
  } catch (error) {
    return error
  }
}

// get index messenger page
module.exports.getIndex = async (req, res, next) => {
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
          perDocumentLimit: 1,
        },
      });
    if (member) {
      const friends = member.getFriends();
      // console.log(friends);
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

      if (!friendChat) {
        throw new Error(notMem)
      }

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

// get my profile
module.exports.getProfile = async (req, res, next) => {
  // get member
  try {
    const member = await Member.findById(req.user.id);
    if (member) {
      const birthOfDate = moment(member.birthOfDate).format('YYYY-MM-DD');
      const texts = await Text.find({authorId: req.user.id}).sort({ _id: -1 })
      res.render('messenger/profile', {
        titleSite: siteMes,
        member,
        birthOfDate,
        texts,
        keyHost: key.host
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
  const texts = await Text.find({authorId: req.user.id}).sort({ _id: -1 })
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
      birthOfDate: fakeMember.birthday,
      texts
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
      return res.status(400).json({ message: err.message });
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
          const urlAvatar = result.secure_url;

          // update db
          member.avatar = urlAvatar
          await member.save()

          return res
            .status(200)
            .json({ message: 'Cập nhật avatar thành công', src: urlAvatar });
        } else {
          return res.status(400).json({ message: 'Cập nhật avatar thất bại' });
        }
        } catch (error) {
          return res.status(400).json({ message: 'Cập nhật avatar thất bại' });
      }
    }
  });
};

// upload file
module.exports.uploadFile = async (req, res) => {
  uploadMulti(req, res, async (err) => {
    if (err) {
      let messageError = ''
      if (err.code === 'LIMIT_FILE_COUNT') {
        messageError = 'Chỉ được gửi tối đa 5 tệp cùng một lúc'
      } else if(err.code === 'LIMIT_FILE_SIZE') {
        messageError = 'Kích thước tệp không vượt quá 1MB'
      } else {
        messageError = err.message
      }
      return res.status(400).json({ message: messageError });
    } else {
      try {
        const member = await Member.findById(req.user.id);
        if (member) {
          // upload
          const fileUrls = []
          await Promise.all(req.files.map(async (file) => {
            const result = await cloudinary.upload(
              file.path,
              path.basename(file.filename, path.extname(file.filename)),
              'ohchat/upload'
            );
            const isAudio = /audio/.test(file.mimetype)
            fileUrls.push({
              name: file.originalname,
              url: result.secure_url,
              resourceType: isAudio ? 'audio' : result.resource_type
            })
          }));

          return res
            .status(200)
            .json({ message: 'Success', fileUrls });
        } else {
          return res.status(400).json({ message: notMem });
        }
      } catch (error) {
        // console.log(error);
        return res.status(400).json({ message: 'Gửi file thất bại' });
      }
    }
  });
};

// get my friends
module.exports.getFriends = async (req, res) => {
  try {
    const page = req.query.page || 0
    const member = await Member.findById(req.user.id).populate({
      path: 'friends._id',
      options: {
        skip: +page * msgPerLoad
      },
      perDocumentLimit: msgPerLoad
    });
    if (member) {
      let hasFriend = false
      member.friends = member.friends.filter(fr => fr._id)
      const friends = member.getFriendsNoSort();
      if (friends.length === msgPerLoad) {
        hasFriend = true
      }
      res.json({
        friends,
        hasFriend
      });
    } else {
      res.status(404).json({ message: notMem });
    }
  } catch (error) {
    res.status(500).json({ message: hasErrMsg });
  }
};

// get my friend requests
module.exports.getFriendRequests = async (req, res) => {
  try {
    const page = req.query.page || 0
    const member = await Member.findById(req.user.id).populate({
      path: 'friendRequests',
      options: {
        skip: +page * msgPerLoad
      },
      perDocumentLimit: msgPerLoad
    });
    if (member) {
      let hasFriend = false
      // member.friends = member.friends.filter(fr => fr._id)
      const friends = member.getFriendRequests();
      if (friends.length === msgPerLoad) {
        hasFriend = true
      }
      res.json({
        friends,
        hasFriend
      });
    } else {
      res.status(404).json({ message: notMem });
    }
  } catch (error) {
    res.status(500).json({ message: hasErrMsg });
  }
};

// get my friend invitations
module.exports.getFriendInvitations = async (req, res) => {
  try {
    const page = req.query.page || 0
    const member = await Member.findById(req.user.id).populate({
      path: 'friendInvitations',
      options: {
        skip: +page * msgPerLoad
      },
      perDocumentLimit: msgPerLoad
    });
    if (member) {
      let hasFriend = false
      // member.friends = member.friends.filter(fr => fr._id)
      const friends = member.getFriendInvitations();
      if (friends.length === msgPerLoad) {
        hasFriend = true
      }
      res.json({
        friends,
        hasFriend
      });
    } else {
      res.status(404).json({ message: notMem });
    }
  } catch (error) {
    res.status(500).json({ message: hasErrMsg });
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
          perDocumentLimit: msgPerLoad + 1,
        }
      })
    if (member) {
      const friendRelated =  member.friends.find(fr => fr._id)
      if (friendRelated) {
        const messages = formatMessageList(friendRelated.groupMessageId.messages, member, friendRelated._id)
        let hasMsg = false
        if (messages.length > msgPerLoad) {
          messages.shift()
          hasMsg = true
        }
        return res.status(200).json({ messages, hasMsg, friendStatus: friendRelated._id.status })
      }
    }
    return res.status(404).json({ message: notMem })
  } catch (error) {
    res.status(500).json({ message: hasErrMsg })
  }
}

// get old notifies
module.exports.getNotifiesOld = async (req, res) => {
  const { page } = req.query
  try {
    const notifies = await Notification.find({ memberId: req.user.id })
                                        .sort({ _id: -1 })
                                        .skip(msgPerLoad * page)
                                        .limit(msgPerLoad + 1)
    if (notifies) {
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

      const notifyObjects = notifies.map(notify => {
        const obj = notify.toObject()
        obj.timeFromNow = moment(obj.time).fromNow()
        return obj
      })

      let hasNotify = false
      if (notifyObjects.length > msgPerLoad) {
        notifyObjects.pop()
        hasNotify = true
      }
      return res.status(200).json({ notifies: notifyObjects, hasNotify })
    }
    return res.status(404).json({ message: hasErrMsg })
  } catch (error) {
    res.status(500).json({ message: hasErrMsg })
  }
}

// add friend
module.exports.putAddFriend = async (req, res) => {
  try {
    const { memberId } = req.body;
    const me = await Member.findById(req.user.id);
    let member = null
    if (memberId.match(/^[0-9a-fA-F]{24}$/)) {
      member = await Member.findById(memberId)
    } else {
      member = await Member.findOne({ url: memberId });
    }
    if (me && member && member.active) {
      const indexReq = member.friendRequests.findIndex(fr => fr.toString() === me.id)
      const indexInv = me.friendInvitations.findIndex(fr => fr.toString() === memberId)
      if (indexReq !== -1 && indexInv !== -1) {
        const message = await Message.create({
          time: new Date(),
          type: 'start',
          memberSendId: me.id
        })
        const groupMessage = await GroupMessage.create({
          messages: [message.id]
        });
        me.friends.push({
          _id: memberId,
          groupMessageId: groupMessage._id
        });
        member.friends.push({
          _id: me.id,
          groupMessageId: groupMessage._id
        });

        member.friendRequests.splice(indexReq, 1)
        me.friendInvitations.splice(indexInv, 1)

        await me.save();
        await member.save();

        const notification = await Notification.create({
          time: new Date(),
          content: `<strong>${me.name}</strong> đã chấp nhận lời mời kết bạn của bạn`,
          link: me.url ? `/messenger/member/${me.url}` : `/messenger/member/${me.id}`,
          image: me.avatar,
          memberId: member.id
        })
        res.status(200).json({ messages: 'Chấp nhận lời mời thành công', notification });
      } else {
        res.status(400).json({ messages: 'Chấp nhận lời mời thất bại' })
      }
    } else {
      res.status(404).json({ messages: notMem })
    }
  } catch (error) {
    res.status(500).json({ messages: hasErrMsg })
  }
};

// add request friend
module.exports.postFriendRequest = async (req, res) => {
  try {
    const { memberId } = req.body;
    const me = await Member.findById(req.user.id);
    let member = null
    if (memberId.match(/^[0-9a-fA-F]{24}$/)) {
      member = await Member.findById(memberId)
    } else {
      member = await Member.findOne({ url: memberId });
    }
    if (me && member && member.active) {
      if (me.friendInvitations.includes(member.id) || me.friendRequests.includes(member.id)) {
        res.sendStatus(205);
      } else {
        me.friendRequests.push(member.id);
        member.friendInvitations.push(me.id);
        await me.save();
        await member.save();

        const notification = await Notification.create({
          time: new Date(),
          content: `<strong>${me.name}</strong> đã gửi lời mời kết bạn cho bạn`,
          link: me.url ? `/messenger/member/${me.url}` : `/messenger/member/${me.id}`,
          image: me.avatar,
          memberId: member.id
        })

        res.status(200).json({ messages: 'Gửi yêu cầu kết bạn thành công', notification });
      }
    } else {
      res.status(404).json({ messages: notMem })
    }
  } catch (error) {
    res.status(500).json({ messages: hasErrMsg })
  }
};

// delete request friend
module.exports.deleteFriendRequest = async (req, res) => {
  try {
    const { memberId } = req.body;
    const me = await Member.findById(req.user.id);
    let member = null
    if (memberId.match(/^[0-9a-fA-F]{24}$/)) {
      member = await Member.findById(memberId)
    } else {
      member = await Member.findOne({ url: memberId });
    }
    if (me && member) {
      const indexReq = me.friendRequests.findIndex(fr => fr.toString() === memberId)
      const indexInv = member.friendInvitations.findIndex(fr => fr.toString() === me.id)
      if (indexReq !== -1 && indexInv !== -1) {
        me.friendRequests.splice(indexReq, 1);
        member.friendInvitations.splice(indexInv, 1);
        await me.save();
        await member.save();

        res.status(200).json({ messages: 'Xóa yêu cầu kết bạn thành công' });
      } else {
        res.status(400).json({ messages: 'Xóa yêu cầu kết bạn thất bại' })
      }
    } else {
      res.status(404).json({ messages: notMem })
    }
  } catch (error) {
    res.status(500).json({ messages: hasErrMsg })
  }
};

// delete invitation friend
module.exports.deleteFriendInvitation = async (req, res) => {
  try {
    const { memberId } = req.body;
    const me = await Member.findById(req.user.id);
    let member = null
    if (memberId.match(/^[0-9a-fA-F]{24}$/)) {
      member = await Member.findById(memberId)
    } else {
      member = await Member.findOne({ url: memberId });
    }
    if (me && member) {
      const indexReq = member.friendRequests.findIndex(fr => fr.toString() === me.id)
      const indexInv = me.friendInvitations.findIndex(fr => fr.toString() === memberId)
      if (indexReq !== -1 && indexInv !== -1) {
        member.friendRequests.splice(indexReq, 1);
        me.friendInvitations.splice(indexInv, 1);
        await me.save();
        await member.save();

        const notification = await Notification.create({
          time: new Date(),
          content: `<strong>${me.name}</strong> đã không chấp nhận lời mời kết bạn của bạn`,
          link: me.url ? `/messenger/member/${me.url}` : `/messenger/member/${me.id}`,
          image: me.avatar,
          memberId: member.id
        })

        res.status(200).json({ messages: 'Xóa lời mời kết bạn thành công', notification });
      } else {
        res.status(400).json({ messages: 'Xóa lời mời kết bạn thất bại' })
      }
    } else {
      res.status(404).json({ messages: notMem })
    }
  } catch (error) {
    res.status(500).json({ messages: hasErrMsg })
  }
};

// delete friend
module.exports.deleteFriend = async (req, res) => {
  try {
    const { memberId } = req.body;
    const me = await Member.findById(req.user.id)
      .populate({
        path: 'friends._id',
        match: { _id: memberId }
      })
      .populate({
        path: 'friends.groupMessageId'
      })
    if (me) {
      const friend =  me.friends.find(fr => fr._id)

      if (friend) {
        const meTmp = await Member.findById(req.user.id)
        const friendTmp = await Member.findById(memberId)

        const indexFriend = meTmp.friends.findIndex(fr => fr._id.toString() === memberId)
        const indexMe = friendTmp.friends.findIndex(fr => fr._id.toString() === req.user.id)

        if (indexFriend !== -1 && indexMe !== -1) {
          await removeFileUpload(friend.groupMessageId.messages)

          await Message.deleteMany({ _id: { $in: friend.groupMessageId.messages } })

          await GroupMessage.deleteOne({ _id: friend.groupMessageId.id })

          meTmp.friends.splice(indexFriend, 1)
          friendTmp.friends.splice(indexMe, 1)

          await meTmp.save()
          await friendTmp.save()

          res.status(200).json({ messages: 'Hủy kết bạn thành công' });
        } else {
          res.status(400).json({ messages: 'Hủy kết bạn thất bại' })
        }
      } else {
        res.status(400).json({ messages: 'Hủy kết bạn thất bại' })
      }
    } else {
      res.status(404).json({ messages: notMem })
    }
  } catch (error) {
    res.status(500).json({ messages: hasErrMsg })
  }
};

// delete notification
module.exports.deleteNotification = async (req, res) => {
  try {
    const { notifyId } = req.body;
    if (notifyId && notifyId.match(/^[0-9a-fA-F]{24}$/)) {
      await Notification.deleteOne({ _id: notifyId })
      res.status(200).json({ messages: 'Xóa thông báo thành công' });
    } else {
      res.status(400).json({ messages: 'Xóa thông báo thất bại' })
    }
  } catch(error) {
    res.status(500).json({ messages: hasErrMsg })
  }
};

// put notification
module.exports.putNotificationStatus = async (req, res) => {
  try {
    const { notifyId } = req.body;
    if (notifyId && notifyId.match(/^[0-9a-fA-F]{24}$/)) {
      const notify = await Notification.findById(notifyId)
      if (notify) {
        notify.beRead = !notify.beRead
        await notify.save()
        res.sendStatus(200)
      } else {
        res.status(400).json({ messages: hasErrMsg })
      }
    } else {
      res.status(400).json({ messages: hasErrMsg })
    }
  } catch(error) {
    res.status(500).json({ messages: hasErrMsg })
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
  if (url.match(/^[0-9a-fA-F]{24}$/)) {
    // not pass validate
    req.flash('error', 'Url không hợp lệ');
    req.flash('tab', 'security');
    req.flash('sub-tab', 'url');
    return res.redirect(settingUrl)
  }
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
// put setting change language assistant
module.exports.putLanguageAssistant = async (req, res, next) => {
  // get info change email
  const { language } = req.body;
  if (language !== 'vi' && language !== 'en') {
    // not pass validate
    req.flash('error', 'Ngôn ngữ không hợp lệ');
    req.flash('tab', 'general');
    return res.redirect(settingUrl)
  }

  try {
    const member = await Member.findById(req.user.id);
    if (member) {
      member.setting.languageAssistant = language
      await member.save()

      req.flash('success', 'Đổi ngôn ngữ trợ lý thành công');
      req.flash('tab', 'general');
      return res.redirect(settingUrl)
    } else {
      next(new Error(notMem))
    }
  } catch (error) {
    next(error)
  }
}

// put setting change mic chat method
module.exports.putMicChatMethod = async (req, res, next) => {
  // get info change email
  const { method, methodSend, isChatAss, directiveChatText } = req.body;
  // console.log(method, methodSend, isChatAss, directiveChatText);
  const meds = {
    'confirm-popup' : 1,
    'confirm-voice': 1,
    'auto-send': 1
  }
  if ((method !== '1' && method !== '0') || !(methodSend in meds) || !directiveChatText) {
    // not pass validate
    req.flash('error', 'Phương thức không hợp lệ');
    req.flash('tab', 'general');
    return res.redirect(settingUrl)
  }

  try {
    const member = await Member.findById(req.user.id);
    if (member) {
      member.setting.chatMicVoice = +method
      member.setting.methodSend = methodSend
      member.setting.isChatAssistant = isChatAss === 'true' ? true : false
      member.setting.directiveChatText = directiveChatText.toLowerCase()
      await member.save()

      req.flash('success', 'Đổi phương thức chat microphone thành công');
      req.flash('tab', 'general');
      return res.redirect(settingUrl)
    } else {
      next(new Error(notMem))
    }
  } catch (error) {
    next(error)
  }
}

// get member info by ID
module.exports.getMemberInfo = async (req, res, next) => {
  const { idnotify } = req.query
  try {
    const { memberId } = req.params;
    let member = null
    if (memberId.match(/^[0-9a-fA-F]{24}$/)) {
      member = await Member.findById(memberId)
    } else {
      member = await Member.findOne({ url: memberId });
    }

    const me = await Member.findById(req.user.id);
    if (member && member.active && me) {
      let statusFriend = ''
      if (me.friends.find(fr => fr.id === member.id)) {
        statusFriend = 'friend'
      } else if (me.friendRequests.find(fr => fr.toString() === member.id)) {
        statusFriend = 'friendRequest'
      } else if (me.friendInvitations.find(fr => fr.toString() === member.id)) {
        statusFriend = 'friendInvitation'
      }

      if (idnotify && idnotify.match(/^[0-9a-fA-F]{24}$/)) {
        const notify = await Notification.findById(idnotify)
        if (notify && notify.memberId.toString() === me.id.toString() && !notify.beRead) {
          notify.beRead = true
          await notify.save()

          const notifyObj = res.locals.notifies.find(noti => noti._id.toString() === idnotify)
          if (notifyObj) {
            notifyObj.beRead = true
          }
          if (res.locals.countNotify === 1) {
            res.locals.countNotify = 0
          }
        }
      }

      res.render('messenger/member', {
        titleSite: siteMes,
        member,
        statusFriend
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

// search
module.exports.getSearch = async (req, res) => {
  const { q } = req.query

  try {
    const me = await Member.findById(req.user.id)
    if (me) {
      const friends = await Member.find(
        {
          _id: { $in: me.friends },
          active: true,
          $text: { $search: q }
        },
        {
          name: 1,
          url: 1,
          avatar: 1
          // score: { $meta: 'textScore' }
        }
      ).sort({ score: { $meta: 'textScore' } }).limit(5)

      const members = await Member.find(
        {
          _id: { $nin: friends, $ne: me._id },
          active: true,
          $text: { $search: q }
        },
        {
          name: 1,
          url: 1,
          avatar: 1
          // score: { $meta: 'textScore' }
        }
      ).sort({ score: { $meta: 'textScore' } }).limit(5)

      const merge = friends.map(fri => {
        const friend = fri.toObject()
          friend.status = 1
          return friend
      })

      merge.push(...members.map(mem => {
        const member = mem.toObject()
          member.status = 0
          return member
      }))

      res.status(200).json({ members: merge })
    } else {
      res.status(404).json({ messages: notMem })
    }
  } catch (error) {
    res.status(500).json({ messages: hasErrMsg })
  }
}

// search page
module.exports.getSearchMain = async (req, res, next) => {
  const { q } = req.query

  try {
    const me = await Member.findById(req.user.id)
    if (me) {
      let members = await Member.find(
        {
          _id: { $ne: me._id },
          active: true,
          $text: { $search: q }
        },
        {
          name: 1,
          url: 1,
          avatar: 1
          // score: { $meta: 'textScore' }
        }
      ).sort({ score: { $meta: 'textScore' } }).limit(5)


      members = members.map(mem => {
        const member = mem.toObject()
        if (me.friends.find(fr => fr._id.toString() === mem._id.toString())) {
          member.relatedWithMe = 'friend'
        } else if (me.friendRequests.find(fr => fr.toString() === mem._id.toString())) {
          member.relatedWithMe = 'request'
        } else if (me.friendInvitations.find(fr => fr.toString() === mem._id.toString())) {
          member.relatedWithMe = 'invitation'
        } else {
          member.relatedWithMe = 'none'
        }
        return member
      })

      // res.status(200).json({ members: merge })
      res.render('messenger/search', {
        titleSide: siteMes,
        members,
        query: q
      })
    } else {
      next(new Error(notMem));
    }
  } catch (error) {
    next(error)
  }
}

// search page more
module.exports.getSearchMainMore = async (req, res) => {
  const { q, page } = req.query

  try {
    const me = await Member.findById(req.user.id)
    if (me && +page) {
      let members = await Member.find(
        {
          _id: { $ne: me._id },
          $text: { $search: q }
        },
        {
          name: 1,
          url: 1,
          avatar: 1
        }
      ).sort({ score: { $meta: 'textScore' }, _id: -1 }).limit(5 + 1).skip(5 * +page)


      members = members.map(mem => {
        const member = mem.toObject()
        if (me.friends.find(fr => fr._id.toString() === mem._id.toString())) {
          member.relatedWithMe = 'friend'
        } else if (me.friendRequests.find(fr => fr.toString() === mem._id.toString())) {
          member.relatedWithMe = 'request'
        } else if (me.friendInvitations.find(fr => fr.toString() === mem._id.toString())) {
          member.relatedWithMe = 'invitation'
        } else {
          member.relatedWithMe = 'none'
        }
        return member
      })
      let hasSearchRes = false
      if (members.length > 5) {
        members.pop()
        hasSearchRes = true
      }
      res.status(200).json({ members, hasSearchRes })
    } else {
      res.status(404).json({ messages: notMem })
    }
  } catch (error) {
    res.status(500).json({ messages: hasErrMsg })
  }
}

// search friend chat
module.exports.getSearchFriend = async (req, res) => {
  const { q, mini } = req.query

  try {
    const me = await Member.findById(req.user.id)
    if (me) {
      let friends = await Member.find(
        {
          _id: { $in: me.friends },
          $text: { $search: q }
        },
        {
          name: 1,
          url: 1,
          avatar: 1,
          status: 1
          // score: { $meta: 'textScore' }
        }
      ).sort({ score: { $meta: 'textScore' } }).limit(10)

      if (mini === '1') {
        friends = friends.map(fri => {
          const friend = fri.toObject()
          friend.token = jwt.sign(
            { data: { memberId: fri._id.toString() } },
            process.env.JWT_SECRET
          );
          return friend
        })
      }
      res.status(200).json({ friends })
    } else {
      res.status(404).json({ messages: notMem })
    }
  } catch (error) {
    res.status(500).json({ messages: hasErrMsg })
  }
}
