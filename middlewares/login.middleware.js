const moment = require('moment')

const Member = require('../models/Member');
const Notification = require('../models/Notification');

// check that the user is logged in
module.exports.checkAuthenticated = async (req, res, next) => {
  // not logged in
  if (!req.isAuthenticated()) {
    // respond with json
    if (req.xhr) {
      return res.status(401).json({ message: 'Bạn chưa đăng nhập' });
    } else {
      return res.redirect('/');
    }
  }

  // logged in
  // get member id
  const memberId = req.user.id;

  // not member id
  if (!memberId) {
    // respond with json
    if (req.xhr) {
      return res.status(401).json({ message: 'Bạn chưa đăng nhập' });
    } else {
      return res.redirect('/');
    }
  }

  try {
    // get member by id
    const member = await Member.findById(memberId);

    // not member
    if (!member) {
      // respond with json
      if (req.xhr) {
        return res.status(401).json({ message: 'Bạn chưa đăng nhập' });
      } else {
        return res.redirect('/');
      }
    }

    const notifies = await Notification.find({ memberId: member.id }).sort({ _id: -1 }).limit(20)
    const count = await Notification.countDocuments({ memberId: member.id, beRead: false })

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

    // member exists
    // set global vars
    res.locals.memberId = member.id;
    res.locals.memberName = member.name;
    res.locals.memberAvatar = member.avatar;
    res.locals.langAss = member.setting.languageAssistant;
    res.locals.chatMicVoice = member.setting.chatMicVoice;
    res.locals.methodSend = member.setting.methodSend;
    res.locals.isChatAssistant = member.setting.isChatAssistant;
    res.locals.directiveChatText = member.setting.directiveChatText;
    res.locals.notifies = notifyObjects;
    res.locals.countNotify = count;

    next();
  } catch (error) {
    next(error);
  }
};

// check member is not logged in
module.exports.checkNotAuthenticated = (req, res, next) => {
  // member logged in
  if (req.isAuthenticated()) {
    return res.redirect('/messenger');
  }

  // not logged in
  next();
};
