
const express = require('express');
const router = express.Router();

const trialsController = require('../controllers/trials')

router.get('/find', trialsController.run)

module.exports = router;
