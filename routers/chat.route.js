const express = require('express');

const controller = require('../controllers/chat.controller');

const { checkNotAuthenticated } = require('../middlewares/login.middleware');

const router = express.Router();

router.get('/', checkNotAuthenticated, controller.getIndex);

router.get('/join', controller.getJoin);

router.get('/create', controller.getCreate);

router.get('/chat', controller.getChat);

router.get('/host/chat', controller.getHostChat);

router.get('/test-share', (req, res) => {
  res.render('user/test-share', {
    titleSite: 'OH Chat - Room'
  });
});

module.exports = router;
