const { validateRegister } = require('../validation/login.validation');

const Member = require('../models/Member.model');

// post login
module.exports.postLogin = async (req, res, next) => {
  // get email and password
  const { email, password } = req.body;

  // login error
  const errorText = [];

  // find user
  const member = await Member.findOne({ email });
  if (!member) {
    // not user exists
    errorText.push('Thông tin đăng nhập không hợp lệ');
  } else {
    // user exists
    // check password
    if (member.password !== password) {
      // password incorrect
      errorText.push('Thông tin đăng nhập không hợp lệ');
    }
  }

  // check login error
  if (errorText.length > 0) {
    // have error
    return res.render('user/index', {
      titleSite: 'Chat App',
      errorText,
      email,
    });
  }

  // pass login
  res.cookie('uid', member.id, { signed: true });
  req.flash('success_msg', 'Đăng nhập thành công');
  res.redirect('/messenger');
};

// get register
module.exports.getRegister = (req, res) => {
  res.render('login/register', {
    titleSite: 'OH Chat: Đăng ký',
  });
};

// post register
module.exports.postRegister = async (req, res) => {
  // get info register
  const { name, email, password, password2 } = req.body;

  // validate info register
  const { error } = validateRegister({ name, email, password, password2 });

  const errorText = [];
  if (error) {
    // have error validate
    if (error.details[0].path[0] === 'name') {
      errorText.push('Chưa nhập họ tên');
    } else if (error.details[0].path[0] === 'email') {
      errorText.push('Chưa nhập email');
    } else if (error.details[0].path[0] === 'password') {
      errorText.push('Mật khẩu dài ít nhất 6 ký tự');
    } else if (error.details[0].path[0] === 'password2') {
      errorText.push('Xác nhận mật khẩu không đúng');
    }
  }

  // check email exists
  const member = await Member.findOne({ email });
  if (member) {
    errorText.push('Email đã được sử dụng');
  }

  // have error
  if (errorText.length > 0) {
    res.render('login/register', {
      titleSide: 'OH Chat: Đăng ký',
      errorText,
      name,
      email,
    });
  } else {
    // pass register
    const member = await Member.create({
      email,
      name,
      password,
    });
    req.flash('success_msg', 'Đăng ký tài khoản thành công, có thể đăng nhập');
    res.redirect('/');
  }
};
