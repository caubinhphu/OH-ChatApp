const express = require('express');

const controller = require('../controllers/chat.controller');

const router = express.Router();

router.get('/', controller.getIndex);

router.get('/chat', controller.getChat);

module.exports = router;
