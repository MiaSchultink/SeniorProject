const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin');
const isAuth = require('../middlewear/is-auth');
const isAdmin = require('../middlewear/is-admin');

router.get('/control-panel', isAuth, isAdmin, adminController.getControlPanel);

router.get('/users', isAuth, isAdmin, adminController.getAllUsers);
router.get('/searches', isAuth, isAdmin, adminController.getAllSearches);
router.post('/user/delete', isAuth, isAdmin, adminController.deleteUser)

module.exports = router;
