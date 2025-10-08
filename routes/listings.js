const express = require('express');
const {
    upload,
    addListing,
    getAllListings,
    getMyListings,
    getListingById,
    updateListing,
    deleteListing,
    downloadImage,
    getFilterOptions
} = require('../controller/listingController');
const { authenticateToken, checkUserActive } = require('../middleware/auth');

const router = express.Router();

// Herkese açık endpoint'ler
// Filtreleme seçeneklerini al
router.get('/filters', getFilterOptions);

// Tüm ilanları listele
router.get('/', getAllListings);

// Tek ilan detayı
router.get('/:id', getListingById);

// Resim indirme
router.get('/:listingId/images/:imageIndex', downloadImage);

// Çiftçi işlemleri (token gerekli)
// İlan ekleme (sadece çiftçiler)
router.post('/', authenticateToken, checkUserActive, upload.array('images', 10), addListing);

// Çiftçinin ilanlarını listele
router.get('/my/listings', authenticateToken, checkUserActive, getMyListings);

// İlan güncelleme (sadece ilan sahibi)
router.put('/:id', authenticateToken, checkUserActive, upload.array('images', 10), updateListing);

// İlan silme (sadece ilan sahibi)
router.delete('/:id', authenticateToken, checkUserActive, deleteListing);

module.exports = router;
