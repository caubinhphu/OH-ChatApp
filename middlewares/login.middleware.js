const Member = require('../models/Member');

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

    // member exists
    // set global vars
    res.locals.memberId = member.id;
    res.locals.memberName = member.name;
    res.locals.memberAvatar = member.avatar;

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
