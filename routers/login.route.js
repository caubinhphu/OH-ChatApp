const express = require('express');
const controller = require('../controllers/login.controller');
const { checkNotAuthenticated } = require('../middlewares/login.middleware');
const passport = require('passport');

const router = express.Router();

router.get('/facebook', checkNotAuthenticated, controller.getLoginFacebook);

router.get(
  '/facebook/callback',
  checkNotAuthenticated,
  controller.getLoginFacebookCallback
);

router.get('/google', checkNotAuthenticated, controller.getLoginGoogle);

router.get(
  '/google/callback',
  checkNotAuthenticated,
  controller.getLoginGoogleCallback
);

router.post('/', checkNotAuthenticated, controller.postLogin);

router.route('/register')
  .get(checkNotAuthenticated, controller.getRegister)
  .post(checkNotAuthenticated, controller.postRegister)

router.get('/logout', controller.getLogout);

router.get('/verify/:token', checkNotAuthenticated, controller.getVerifyEmail);

module.exports = router;
