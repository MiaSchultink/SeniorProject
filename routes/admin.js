const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin');
const isAuth = require('../middlewear/is-auth');
const isAdmin = require('../middlewear/is-admin');

router.get('/control-panel', isAuth, isAdmin, adminController.getControlPanel);

module.exports = router;
