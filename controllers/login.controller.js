const bcrypt = require('bcrypt');
const crypto = require('crypto');
const passport = require('passport');

const key = require('../config/key');

const sendMail = require('../utils/send-mail');

const { validateRegister } = require('../validation/login.validation');

const Member = require('../models/Member.model');

// post login
module.exports.postLogin = async (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/messenger',
    failureRedirect: '/',
    successFlash: true,
    failureFlash: true,
  })(req, res, next);
};

// get register
module.exports.getRegister = (req, res) => {
  res.render('login/register', {
    titleSite: 'OH Chat',
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
      titleSide: 'OH Chat',
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
        <p>Hãy chọn <a href='${key.host}/login/verify/${verifyToken.toString(
        'hex'
      )}'>vào đây</a> để xác nhận tài khoản của bạn</p>`;
      const info = await sendMail(email, 'Xác nhận tài khoản', html);
    } catch (error) {
      next(error);
    }

    req.flash(
      'success',
      'Đăng ký tài khoản thành công, xin hãy vào email đã đăng ký để xác nhận'
    );
    res.redirect('/');
  }
};

module.exports.getLogout = (req, res) => {
  req.logOut();
  res.redirect('/');
};

module.exports.getVerifyEmail = async (req, res, next) => {
  const { token } = req.params;

  try {
    const member = await Member.findOne({ verifyToken: token });
    if (!member) {
      req.flash('error', 'Thành viên không tồn tại');
      return res.redirect('/');
    }

    member.active = true;
    member.verifyToken = '';

    await member.save();
    req.flash('success', 'Xác nhận email thành công, có thể đăng nhập');
    res.redirect('/');
  } catch (error) {
    next(error);
  }
};

module.exports.getLoginFacebook = (req, res, next) => {
  passport.authenticate('facebook')(req, res, next);
};

module.exports.getLoginFacebookCallback = (req, res, next) => {
  passport.authenticate('facebook', {
    successRedirect: '/messenger',
    failureRedirect: '/',
    failureFlash: true,
    successFlash: true,
  })(req, res, next);
};
