const Member = require('../models/Member.model');

// post login
module.exports.postLogin = async (req, res, next) => {
  // get email and password
  const { email, password } = req.body;

  // login error
  let loginError = null;

  // find user
  const member = await Member.findOne({ email });
  if (!member) {
    // not user exists
    loginError = 'Thông tin đăng nhập không hợp lệ';
  } else {
    // user exists
    // check password
    if (member.password !== password) {
      // password incorrect
      loginError = 'Thông tin đăng nhập không hợp lệ';
    }
  }

  // check login error
  if (loginError) {
    // have error
    return res.render('user/index', {
      titleSite: 'Chat App',
      loginError,
      email,
    });
  }

  // pass login
  res.cookie('uid', member.id, { signed: true });
  res.redirect('/messenger');
};

// get register
module.exports.getRegister = (req, res) => {
  res.render('login/register', {
    titleSite: 'OH Chat: Đăng ký',
  });
};
