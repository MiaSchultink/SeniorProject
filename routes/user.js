const express = require('express');
const router = express.Router();
const userController = require('../controllers/user')

const isAuth = require('../middlewear/is-auth')

router.get('/login', userController.getLogIn);
router.post('/login', userController.postLogin);

router.get('/sign-up', userController.getSignUp);
router.post('/sign-up', userController.postSignUp);
router.post('/logout', isAuth, userController.logout)

router.get('/saved', isAuth,  userController.getSavedSearches);
router.get('/saved/:searchId', isAuth, userController.getSingleSearch);

module.exports = router;
