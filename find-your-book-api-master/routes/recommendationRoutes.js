const express = require('express');
const recommendationController = require('../controllers/recommendationController');

const router = express.Router();

router.route('/global/:id')
        .post(recommendationController.getGlobalRec);

router.route('/readertastes/:id')
        .post(recommendationController.getReaderTastes);

router.route('/friendtastes/:id')
        .post(recommendationController.getFriendTastes);

router.route('/readerauthors/:id')
        .post(recommendationController.getReaderAuthors);

router.route('/books/similar/:isbn')
        .get(recommendationController.getSimilarBooks);

router.route('/books/readers/:isbn')
        .get(recommendationController.getReadersBooks);

module.exports = router;