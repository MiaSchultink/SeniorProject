const express = require('express');
const router = express.Router();
const userController = require('../controllers/user')

router.get('/login', userController.getLogIn)
router.post('/login', userController.postLogin)

router.get('/saved', userController.getSavedSearches)
module.exports = router;
