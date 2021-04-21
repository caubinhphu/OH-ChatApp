const express = require('express');
// middleware
const { checkAuthenticated } = require('../middlewares/login.middleware');

const controller = require('../controllers/utilities.controller');

const router = express.Router();

router.post('/text', checkAuthenticated, controller.createText)

router.get('/text/check', controller.checkIsAuthorText)

router.get('/text/:textId', controller.getText)

module.exports = router;
