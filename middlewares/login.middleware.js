const Member = require('../models/Member.model');

module.exports = async (req, res, next) => {
  const memberId = req.signedCookies.uid;
  if (!memberId) {
    return res.redirect('/');
  }

  const member = await Member.findById(memberId);

  if (!member) {
    return res.redirect('/');
  }

  res.locals.memberName = member.name;
  res.locals.memberAvatar = member.avatar;

  next();
};
