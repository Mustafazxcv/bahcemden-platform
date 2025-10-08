const express = require('express');
const {
    sendOffer,
    getMyOffers,
    getListingOffers,
    respondToOffer,
    getOfferById,
    deleteOffer
} = require('../controller/offerController');
const { authenticateToken, checkUserActive } = require('../middleware/auth');

const router = express.Router();

// Tüm teklif işlemleri token gerekli
// Teklif gönderme
router.post('/', authenticateToken, checkUserActive, sendOffer);

// Alıcının tekliflerini listele
router.get('/my', authenticateToken, checkUserActive, getMyOffers);

// Çiftçinin aldığı teklifleri listele (belirli ilan için)
router.get('/listing/:listingId', authenticateToken, checkUserActive, getListingOffers);

// Teklif detayı
router.get('/:offerId', authenticateToken, checkUserActive, getOfferById);

// Teklif onaylama/reddetme (sadece çiftçi)
router.put('/:offerId/respond', authenticateToken, checkUserActive, respondToOffer);

// Teklif silme (sadece alıcı)
router.delete('/:offerId', authenticateToken, checkUserActive, deleteOffer);

module.exports = router;
