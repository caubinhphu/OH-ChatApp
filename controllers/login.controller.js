const bcrypt = require('bcrypt');
const crypto = require('crypto');

const sendMail = require('../utils/send-mail');

const { validateRegister } = require('../validation/login.validation');

const Member = require('../models/Member.model');

// post login
module.exports.postLogin = async (req, res, next) => {
  // get email and password
  const { email, password } = req.body;

  // login error
  const errorText = [];

  let member = null;
  try {
    // find user
    member = await Member.findOne({ email });
    if (!member) {
      // not user exists
      errorText.push('Thông tin đăng nhập không hợp lệ');
    } else {
      // user exists
      // check password
      const checkPassword = await bcrypt.compare(password, member.password);
      if (!checkPassword) {
        errorText.push('Thông tin đăng nhập không hợp lệ');
      } else {
        if (!member.active) {
          errorText.push(
            'Tài khoản chưa được xác nhận, xin hãy vào email đã đăng ký để xác nhận'
          );
        }
      }
    }
  } catch (error) {
    next(error);
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
    errorText.push(error.details[0].message);
  }

  if (errorText.length === 0) {
    // check email exists
    try {
      const member = await Member.findOne({ email });
      if (member) {
        errorText.push('Email đã được sử dụng');
      }
    } catch (error) {
      next(error);
    }
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
    try {
      // create hash password
      const salt = await bcrypt.genSalt(10);
      const passHash = await bcrypt.hash(password, salt);

      // generate verify token
      const verifyToken = await crypto.randomBytes(16);

      // create new member
      await Member.create({
        email,
        name,
        password: passHash,
        verifyToken: verifyToken.toString('hex'),
      });

      // send email verify account
      const html = `<h2>OH chat</h2>
        <p>Cảm ơn bạn đã đăng ký tài khoản với chúng tôi</p>
        <p>Hãy chọn <a href='http://localhost:3000/login/verify/${verifyToken.toString(
          'hex'
        )}'>vào đây</a> để xác nhận tài khoản của bạn</p>`;
      const info = await sendMail(email, 'Xác nhận tài khoản', html);
    } catch (error) {
      next(error);
    }

    req.flash(
      'success_msg',
      'Đăng ký tài khoản thành công, xin hãy vào email đã đăng ký để xác nhận'
    );
    res.redirect('/');
  }
};

module.exports.getLogout = (req, res) => {
  res.clearCookie('uid');
  res.redirect('/');
};

module.exports.getVerifyEmail = async (req, res, next) => {
  const { token } = req.params;

  try {
    const member = await Member.findOne({ verifyToken: token });
    if (!member) {
      req.flash('error_msg', 'Thành viên không tồn tại');
      return res.redirect('/');
    }

    member.active = true;
    member.verifyToken = '';

    await member.save();
    req.flash('success_msg', 'Xác nhận email thành công, có thể đăng nhập');
    res.redirect('/');
  } catch (error) {
    next(error);
  }
};
