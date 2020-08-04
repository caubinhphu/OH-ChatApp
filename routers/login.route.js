const express = require('express');
const controller = require('../controllers/login.controller');

const router = express.Router();

router.post('/', controller.postLogin);

router.get('/register', controller.getRegister);

module.exports = router;
