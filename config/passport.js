const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

const Member = require('../models/Member.model');

module.exports = function (passport) {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          const member = await Member.findOne({ email });
          if (!member) {
            return done(null, false, {
              message: 'Thông tin đăng nhập không hợp lệ',
            });
          }

          const checkPassword = await bcrypt.compare(password, member.password);
          if (!checkPassword) {
            return done(null, false, {
              message: 'Thông tin đăng nhập không hợp lệ',
            });
          }

          if (!member.active) {
            return done(null, false, {
              message:
                'Tài khoản chưa được xác nhận, xin hãy vào email đã đăng ký để xác nhận',
            });
          }

          return done(null, member, { message: 'Đăng nhập thành công' });
        } catch (error) {
          done(err, false);
        }
      }
    )
  );

  passport.serializeUser((member, done) => {
    done(null, member.id);
  });

  passport.deserializeUser((id, done) => {
    Member.findById(id, (err, member) => {
      done(err, member);
    });
  });
};
