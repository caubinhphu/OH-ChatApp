const express = require('express');
const controller = require('../controllers/login.controller');
const { checkNotAuthenticated } = require('../middlewares/login.middleware');

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

router.route('/forget-password')
  .get(checkNotAuthenticated, controller.getForgetPassword1)
  .post(checkNotAuthenticated, controller.postForgetPassword1)

router.get('/verify/:token', checkNotAuthenticated, controller.getVerifyEmail);

router.get('/forget-verify/:token', checkNotAuthenticated, controller.getForgetPassword2);

router.post('/forget-password-s2', checkNotAuthenticated, controller.postForgetPassword2)

module.exports = router;
