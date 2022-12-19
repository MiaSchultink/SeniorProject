
const express = require('express');
const router = express.Router();

const trialsController = require('../controllers/trials')

router.get('/new', trialsController.getNewSearch)
router.post('/new', trialsController.startNewSearch);

module.exports = router;
