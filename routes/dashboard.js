const express = require('express');
const { getDashboard } = require('../controller/dashboardController');
const { authenticateToken, checkUserActive } = require('../middleware/auth');

const router = express.Router();

// Dashboard bilgilerini getir (token gerekli)
router.get('/', authenticateToken, checkUserActive, getDashboard);

module.exports = router;
