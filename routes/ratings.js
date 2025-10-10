const express = require('express');
const {
    addRating,
    getListingRating,
    getRatingByEmail
} = require('../controller/ratingController');

const router = express.Router();

// Yıldız verme (tokensız, e-posta ile doğrulama)
router.post('/:listingId', addRating);

// İlanın yıldız istatistiklerini getir (herkese açık)
router.get('/:listingId', getListingRating);

// E-posta adresinin belirli ilana verdiği yıldızı sorgula (herkese açık)
router.get('/:listingId/check', getRatingByEmail);

module.exports = router;
