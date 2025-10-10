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

// Teklif detayı (offerId sadece sayısal)
router.get('/:offerId(\\d+)', authenticateToken, checkUserActive, getOfferById);

// Teklif onaylama/reddetme (sadece çiftçi) (offerId sadece sayısal)
router.put('/:offerId(\\d+)/respond', authenticateToken, checkUserActive, respondToOffer);

// Teklif silme (sadece alıcı) (offerId sadece sayısal)
router.delete('/:offerId(\\d+)', authenticateToken, checkUserActive, deleteOffer);

module.exports = router;
