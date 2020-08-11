const LocalStrategy = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const fs = require('fs');
const request = require('request');
const path = require('path');

const bcrypt = require('bcrypt');

const key = require('../config/key');

const Member = require('../models/Member.model');

module.exports.local = (passport) => {
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

module.exports.facebook = (passport) => {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${key.host}/login/facebook/callback`,
      },

      async (accessToken, refreshToken, profile, done) => {
        try {
          let member = await Member.findOne({ OAuthId: profile.id });
          if (!member) {
            member = await Member.create({
              name: profile.displayName,
              type: 'facebook',
              OAuthId: profile.id,
            });
          }
          done(null, member, { message: 'Đăng nhập thành công' });
        } catch (error) {
          done(error);
        }
      }
    )
  );
};

module.exports.google = (passport) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_APP_ID,
        clientSecret: process.env.GOOGLE_APP_SECRET,
        callbackURL: `${key.host}/login/google/callback`,
      },

      async (accessToken, refreshToken, profile, done) => {
        try {
          let member = await Member.findOne({ email: profile.emails[0].value });
          if (!member) {
            download(
              profile.photos[0].value,
              path.join(
                __dirname,
                '..',
                'public/images/user/avatar',
                profile.id + '.jpg'
              ),
              () => {}
            );
            const avatar = `/images/user/avatar/${profile.id}.jpg`;

            member = await Member.create({
              email: profile.emails[0].value,
              name: profile.displayName,
              avatar,
              type: 'google',
              OAuthId: profile.id,
            });
            done(null, member, { message: 'Đăng nhập thành công' });
          } else {
            done(null, false, { message: 'Email đã được sử dụng' });
          }
        } catch (error) {
          done(error);
        }
      }
    )
  );
};

function download(uri, filename, callback) {
  request.head(uri, function (err, res, body) {
    // console.log('content-type:', res.headers['content-type']);
    // console.log('content-length:', res.headers['content-length']);
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
}
