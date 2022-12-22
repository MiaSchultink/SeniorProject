
const express = require('express');
const router = express.Router();

const searchController = require('../controllers/search');
const isAuth = require('../middlewear/is-auth');

router.get('/new', searchController.getNewSearch)
router.post('/new', searchController.startNewSearch);

router.get('/saved', isAuth,  searchController.getSavedSearches);
router.get('/saved/:searchId', isAuth, searchController.getSingleSearch);

router.post('/saved/delete/:searchId', isAuth, searchController.deleteSearch);
router.get('/saved/edit/:searchId', isAuth, searchController.getEditSearch);

router.post('/saved/json', isAuth, searchController.searchToJson);
router.post('/saved/csv',isAuth, searchController.searchToCSV);
router.post('/saved/pdf', isAuth, searchController.searchToPDF);


module.exports = router;
