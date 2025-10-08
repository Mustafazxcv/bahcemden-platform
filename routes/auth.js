const express = require('express');
const { register, login } = require('../controller/authController');

const router = express.Router();

// Kayıt endpoint'i
router.post('/register', register);

// Giriş endpoint'i
router.post('/login', login);


module.exports = router;
