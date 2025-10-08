const express = require('express');
const { register, login, changePassword, changeEmail } = require('../controller/authController');
const { authenticateToken, checkUserActive } = require('../middleware/auth');

const router = express.Router();

// Kayıt endpoint'i
router.post('/register', register);

// Giriş endpoint'i
router.post('/login', login);

// Şifre değiştirme endpoint'i (token gerekli)
router.put('/change-password', authenticateToken, checkUserActive, changePassword);

// E-posta değiştirme endpoint'i (token gerekli)
router.put('/change-email', authenticateToken, checkUserActive, changeEmail);

module.exports = router;
