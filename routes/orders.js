const express = require('express');
const {
    createOrder,
    getMyOrders,
    getFarmerOrders,
    getOrderById,
    updateOrderStatus,
    updatePaymentStatus
} = require('../controller/orderController');
const { authenticateToken, checkUserActive } = require('../middleware/auth');

const router = express.Router();

// Sipariş oluşturma (public - e-posta ile doğrulama)
router.post('/:listingId', createOrder);

// Alıcının siparişlerini listele (token gerekli)
router.get('/my', authenticateToken, checkUserActive, getMyOrders);

// Çiftçinin aldığı siparişleri listele (token gerekli)
router.get('/farmer', authenticateToken, checkUserActive, getFarmerOrders);

// Sipariş detayı (token gerekli)
router.get('/:orderId', authenticateToken, checkUserActive, getOrderById);

// Sipariş durumu güncelleme (sadece çiftçi)
router.put('/:orderId/status', authenticateToken, checkUserActive, updateOrderStatus);

// Ödeme durumu güncelleme (sadece çiftçi)
router.put('/:orderId/payment', authenticateToken, checkUserActive, updatePaymentStatus);

module.exports = router;
