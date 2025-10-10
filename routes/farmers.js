const express = require('express');
const {
    searchFarmers,
    getFarmerById,
    getFarmerStats
} = require('../controller/farmerController');

const router = express.Router();

// Çiftçi arama (herkese açık)
router.get('/search', searchFarmers);

// Çiftçi detayı (herkese açık)
router.get('/:farmerId', getFarmerById);

// Çiftçi istatistikleri (herkese açık)
router.get('/:farmerId/stats', getFarmerStats);

module.exports = router;
