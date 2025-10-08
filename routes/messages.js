const express = require('express');
const {
    sendMessage,
    getMessages,
    getConversation,
    deleteMessage
} = require('../controller/messageController');
const { authenticateToken, checkUserActive } = require('../middleware/auth');

const router = express.Router();

// Tüm mesaj işlemleri token gerekli
// Mesaj gönderme
router.post('/', authenticateToken, checkUserActive, sendMessage);

// Mesajları listele
router.get('/', authenticateToken, checkUserActive, getMessages);

// Belirli kullanıcı ile konuşma
router.get('/conversation/:otherUserId', authenticateToken, checkUserActive, getConversation);

// Mesaj silme
router.delete('/:id', authenticateToken, checkUserActive, deleteMessage);

module.exports = router;
