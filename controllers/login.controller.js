const bcrypt = require('bcrypt');
const crypto = require('crypto');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { readFile  } = require('fs');
const { join  } = require('path');

const key = require('../config/key');

const sendMail = require('../utils/send-mail');

const { validateRegister, validateEmail, validateResetPassword } = require('../validation/login.validation');

const Member = require('../models/Member');
const { rejects } = require('assert');

const mesUrl = '/messenger'

// post login
module.exports.postLogin = async (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: mesUrl,
    failureRedirect: '/',
    // successFlash: true,
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
module.exports.postRegister = async (req, res, next) => {
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
    } catch (err) {
      next(err);
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
      let html = await new Promise((resolve, rejects) => {
        readFile(join(__dirname, '..', 'mail/mail.html'), 'utf8', (err, data) => {
          if (err) {
            rejects(err)
          } else {
            resolve(data)
          }
        })
      })
      html = html.replace('{{content}}', 'Cảm ơn bạn đã đăng ký tài khoản với chúng tôi<br /><br /> Bấm vào nút "Xác nhận" để xác nhận tài khoản của bạn')
      html = html.replace('{{link}}', `${key.host}/login/verify/${verifyToken.toString('hex')}`)
      html = html.replace('{{srcLink}}', 'https://res.cloudinary.com/haitrando/image/upload/v1621047385/ohchat/verify-btn_sjwyoo.jpg')
      html = html.replace('{{width}}', '95')
      html = html.replace('{{height}}', '33')
      const info = await sendMail(email, 'Xác nhận tài khoản', html);
    } catch (err) {
      next(err);
    }

    req.flash(
      'success',
      'Đăng ký tài khoản thành công, xin hãy vào email đã đăng ký để xác nhận'
    );
    res.redirect('/');
  }
};

// logout
module.exports.getLogout = (req, res) => {
  // req.logOut();
  // res.redirect('/');
  req.session.destroy(function (err) {
    res.redirect('/');
  });
};

// get verify email
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

// get login with facebook
module.exports.getLoginFacebook = (req, res, next) => {
  passport.authenticate('facebook')(req, res, next);
};

// get login callback with facebook
module.exports.getLoginFacebookCallback = (req, res, next) => {
  passport.authenticate('facebook', {
    successRedirect: mesUrl,
    failureRedirect: '/',
    failureFlash: true,
    successFlash: true,
  })(req, res, next);
};

// get login with google
module.exports.getLoginGoogle = (req, res, next) => {
  passport.authenticate('google', {
    scope: ['https://www.googleapis.com/auth/plus.login', 'email'],
  })(req, res, next);
};

// get login callback with google
module.exports.getLoginGoogleCallback = (req, res, next) => {
  passport.authenticate('google', {
    successRedirect: mesUrl,
    failureRedirect: '/',
    failureFlash: true,
    successFlash: true,
  })(req, res, next);
};


// get forget password step 1
module.exports.getForgetPassword1 = (req, res) => {
  res.render('login/forget-password', {
    titleSite: 'OH Chat',
  });
};

// post forget password step 1
module.exports.postForgetPassword1 = async (req, res, next) => {
  // get info register
  const { email } = req.body;

  // validate info register
  const { error } = validateEmail({ email });

  const errorText = [];
  if (error) {
    errorText.push(error.details[0].message);
  }

  if (errorText.length === 0) {
    // check email exists
    try {
      const member = await Member.findOne({ email });
      if (!member) {
        errorText.push('Email chưa được đăng ký');
      } else {
         // generate verify token
        const verifyToken = await crypto.randomBytes(16);

        // generate jwt token
        const token = jwt.sign(
          { data: { email, verifyToken: verifyToken.toString('hex') } },
          process.env.JWT_SECRET
        );
        member.verifyToken = verifyToken.toString('hex')
        await member.save()

        // send email verify account
        let html = await new Promise((resolve, rejects) => {
          readFile(join(__dirname, '..', 'mail/mail.html'), 'utf8', (err, data) => {
            if (err) {
              rejects(err)
            } else {
              resolve(data)
            }
          })
        })
        html = html.replace('{{content}}', 'Xác nhận email thành công')
        html = html.replace('{{link}}', `${key.host}/login/forget-verify/${token}`)
        html = html.replace('{{srcLink}}', 'https://res.cloudinary.com/haitrando/image/upload/v1621047384/ohchat/change-pass-btn_f7g4vd.jpg')
        html = html.replace('{{width}}', '117')
        html = html.replace('{{height}}', '33')
        const info = await sendMail(email, 'Đổi mật khẩu', html);
      }
    } catch (err) {
      return next(err);
    }
  }

  // have error
  if (errorText.length > 0) {
    res.render('login/forget-password', {
      titleSide: 'OH Chat',
      errorText,
      email
    });
  } else {
    res.render('login/forget-password', {
      titleSide: 'OH Chat',
      successText: ['Gửi yêu cầu xác nhận thành công, hãy vào email đăng ký đển xác nhận'],
      email
    });
  }
};

// get forget password step 2
module.exports.getForgetPassword2 = (req, res, next) => {
  const { token } = req.params;
  try {
    const { data: dataToken } = jwt.verify(token, process.env.JWT_SECRET);
    res.render('login/forget-password-s2', {
      titleSite: 'OH Chat',
      token: dataToken.verifyToken,
      email: dataToken.email
    });
  } catch (error) {
    next(error)
  }
};

// post forget password step 2
module.exports.postForgetPassword2 = async (req, res, next) => {
  // get info register
  const { email, token, password, password2 } = req.body;

  // validate info register
  const { error } = validateResetPassword({ email, password, password2 });

  const errorText = [];
  if (error) {
    errorText.push(error.details[0].message);
  }

  if (errorText.length === 0) {
    // check email exists
    try {
      const member = await Member.findOne({ email, verifyToken: token });
      if (!member) {
        errorText.push('Email không hợp lệ');
      } else {
        // create hash password
        const salt = await bcrypt.genSalt(10);
        const passHash = await bcrypt.hash(password, salt);
        member.verifyToken = ''
        member.password = passHash
        await member.save()

        req.flash('success', 'Đổi mật khẩu thành công');
        return res.redirect('/')
      }
    } catch (err) {
      return next(err);
    }
  }

  // have error
  if (errorText.length > 0) {
    res.render('login/forget-password-s2', {
      titleSide: 'OH Chat',
      errorText,
      email,
      token
    });
  }
};