const express = require('express');
const {
    upload,
    addCertificate,
    getMyCertificates,
    deleteCertificate,
    downloadFile
} = require('../controller/certificateController');
const { authenticateToken, checkUserActive } = require('../middleware/auth');

const router = express.Router();

// Çiftçi sertifika işlemleri (token gerekli)
// Sertifika ekleme (sadece çiftçiler)
router.post('/', authenticateToken, checkUserActive, upload.single('file'), addCertificate);

// Çiftçinin sertifikalarını listele
router.get('/my', authenticateToken, checkUserActive, getMyCertificates);

// Sertifika silme (sadece sertifika sahibi)
router.delete('/:id', authenticateToken, checkUserActive, deleteCertificate);

// Dosya indirme (sadece sertifika sahibi)
router.get('/:id/download', authenticateToken, checkUserActive, downloadFile);

module.exports = router;
