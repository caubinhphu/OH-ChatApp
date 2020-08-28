const moment = require('moment');
const Member = require('../models/Member.model');

module.exports.getIndex = (req, res) => {
  res.render('messenger', {
    titleSite: 'OH Chat - Messenger',
  });
};

module.exports.getProfile = async (req, res) => {
  // get member
  const member = await Member.findById(req.user.id);
  if (member) {
    birthOfDate = moment(member.birthOfDate).format('YYYY-MM-DD');
    res.render('messenger/profile', {
      titleSite: 'OH Chat - Messenger',
      member,
      birthOfDate
    })
  } else {
    req.flash('error', 'Thành viên không tồn tại');
    res.redirect('/');
  }
}