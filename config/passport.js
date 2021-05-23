const LocalStrategy = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const fs = require('fs');
const request = require('request');
const path = require('path');
const bcrypt = require('bcrypt');

const key = require('../config/key');
const cloudinary = require('../utils/cloudinary');

const Member = require('../models/Member');

const loginSuccText = 'Đăng nhập thành công'
const loginErrorText = 'Thông tin đăng nhập không hợp lệ'

// login with email and password
module.exports.local = (passport) => {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          // find member by email
          const member = await Member.findOne({ email });
          if (!member) {
            return done(null, false, {
              message: loginErrorText,
            });
          }

          if (member.type !== 'local') {
            return done(null, false, {
              message: loginErrorText,
            });
          }

          // check password
          const checkPassword = await bcrypt.compare(password, member.password);
          if (!checkPassword) {
            return done(null, false, {
              message: loginErrorText,
            });
          }

          // check member active
          if (!member.active) {
            return done(null, false, {
              message:
                'Tài khoản chưa được xác nhận, xin hãy vào email đã đăng ký để xác nhận',
            });
          }

          // pass login
          return done(null, member, { message: loginSuccText });
        } catch (err) {
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

// login with facebook
module.exports.facebook = (passport) => {
  // config
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${key.host}/login/facebook/callback`,
        profileFields: [
          'id',
          'displayName',
          'name',
          'gender',
          'picture.type(large)',
        ],
      },

      async (accessToken, refreshToken, profile, done) => {
        try {
          // find member by OAuthId
          let member = await Member.findOne({ OAuthId: profile.id });
          if (!member) {
            // member not exists
            // download avatar member in facebook and upload to cloudinary
            let avatar = '/images/default-avatar.jpg';
            const pathFile = path.join(
              __dirname,
              '..',
              'public/images/user/avatar',
              profile.id + '.jpg'
            );
            if (profile.photos) {
              // download
              await download(profile.photos[0].value, pathFile, () => { /* */ });

              // upload
              const result = await cloudinary.upload(
                pathFile,
                profile.id,
                'ohchat/avatar'
              );
              avatar = result.secure_url;
            }

            // create new member
            member = await Member.create({
              name: profile.displayName,
              avatar,
              type: 'facebook',
              OAuthId: profile.id,
              active: true
            });
          }

          // pass login
          return done(null, member, { message: loginSuccText });
        } catch (error) {
          return done(error);
        }
      }
    )
  );
};

// login with google
module.exports.google = (passport) => {
  passport.use(
    // config
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_APP_ID,
        clientSecret: process.env.GOOGLE_APP_SECRET,
        callbackURL: `${key.host}/login/google/callback`,
      },

      async (accessToken, refreshToken, profile, done) => {
        try {
          // find member with email
          let member = await Member.findOne({ email: profile.emails[0].value });
          if (!member) {
            // member not exists
            // download avatar of member from google account and the upload to cloundinary
            let avatar = '/images/default-avatar.jpg';
            const pathFile = path.join(
              __dirname,
              '..',
              'public/images/user/avatar',
              profile.id + '.jpg'
            );
            if (profile.photos) {
              // download
              await download(profile.photos[0].value, pathFile, () => {});
              // upload
              const result = await cloudinary.upload(
                pathFile,
                profile.id,
                'ohchat/avatar'
              );
              avatar = result.secure_url;
            }

            // create new member
            member = await Member.create({
              email: profile.emails[0].value,
              name: profile.displayName,
              avatar,
              type: 'google',
              OAuthId: profile.id,
              active: true
            });
            return done(null, member, { message: loginSuccText });
          } else {
            // email exists
            if (member.OAuthId !== profile.id) {
              done(null, false, { message: 'Email đã được sử dụng' });
            } else {
              return done(null, member, { message: loginSuccText });
            }
          }
        } catch (error) {
          return done(error);
        }
      }
    )
  );
};

// down load file from an uri
function download(uri, filename, callback) {
  return new Promise((resolve, rejects) => {
     request.head(uri, function (err, res, body) {
       if (err) {
         rejects(err)
       } else {
         // console.log('content-type:', res.headers['content-type']);
        // console.log('content-length:', res.headers['content-length']);
        request(uri).pipe(fs.createWriteStream(filename))
          .on('close', () => resolve(callback))
          .on('error', (error) => {
            rejects(error)
          });
       }
    });
  })
}
