const express = require('express');
const {
    getUsers,
    getUserById,
    getMyProfile
} = require('../controller/userController');
const { authenticateToken, checkUserActive } = require('../middleware/auth');

const router = express.Router();

// Kullanıcıları listele (herkese açık - mesajlaşma için)
router.get('/', getUsers);

// Tek kullanıcı detayı (herkese açık)
router.get('/:id', getUserById);

// Kendi profili (token gerekli)
router.get('/profile/me', authenticateToken, checkUserActive, getMyProfile);

module.exports = router;
