const express = require('express');
const {
    addInventoryItem,
    getMyInventory,
    getCategories,
    getInventoryItemById,
    updateInventoryItem,
    deleteInventoryItem
} = require('../controller/inventoryController');
const { authenticateToken, checkUserActive } = require('../middleware/auth');

const router = express.Router();

// Tüm envanter işlemleri token gerekli
// Envanter öğesi ekleme (sadece çiftçiler)
router.post('/', authenticateToken, checkUserActive, addInventoryItem);

// Çiftçinin envanterini listele
router.get('/', authenticateToken, checkUserActive, getMyInventory);

// Kategorileri listele
router.get('/categories', authenticateToken, checkUserActive, getCategories);

// Tek envanter öğesi detayı
router.get('/:id', authenticateToken, checkUserActive, getInventoryItemById);

// Envanter öğesi güncelleme (sadece öğe sahibi)
router.put('/:id', authenticateToken, checkUserActive, updateInventoryItem);

// Envanter öğesi silme (sadece öğe sahibi)
router.delete('/:id', authenticateToken, checkUserActive, deleteInventoryItem);

module.exports = router;
