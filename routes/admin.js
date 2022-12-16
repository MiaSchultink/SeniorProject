const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin');
const trialsController = require('../controllers/trials');
const isAuth = require('../middlewear/is-auth');
const isAdmin = require('../middlewear/is-admin');

router.get('/control-panel', isAdmin, adminController.getControlPanel);
router.get('/admin-run', isAdmin, trialsController.run);

module.exports = router;
