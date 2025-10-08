const express = require('express');
const {
    upload,
    addFarm,
    getMyFarms,
    getAllFarms,
    getFarmById,
    updateFarm,
    deleteFarm,
    downloadImage
} = require('../controller/farmController');
const { authenticateToken, checkUserActive } = require('../middleware/auth');

const router = express.Router();

// Herkese açık endpoint'ler
// Tüm çiftlikleri listele
router.get('/', getAllFarms);

// Tek çiftlik detayı
router.get('/:id', getFarmById);

// Resim indirme
router.get('/:farmId/images/:imageIndex', downloadImage);

// Çiftçi işlemleri (token gerekli)
// Çiftlik ekleme (sadece çiftçiler)
router.post('/', authenticateToken, checkUserActive, upload.array('images', 10), addFarm);

// Çiftçinin çiftliklerini listele
router.get('/my/farms', authenticateToken, checkUserActive, getMyFarms);

// Çiftlik güncelleme (sadece çiftlik sahibi)
router.put('/:id', authenticateToken, checkUserActive, upload.array('images', 10), updateFarm);

// Çiftlik silme (sadece çiftlik sahibi)
router.delete('/:id', authenticateToken, checkUserActive, deleteFarm);

module.exports = router;
