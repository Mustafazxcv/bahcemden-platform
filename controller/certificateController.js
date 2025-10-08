const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../config/database');

// Dosya yükleme ayarları
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = 'uploads/certificates';
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Dosya filtresi - sadece PDF, PNG, JPEG
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Sadece PDF, PNG ve JPEG dosyalarına izin verilir'), false);
    }
};

// Multer konfigürasyonu
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

// Sertifika ekleme
const addCertificate = async (req, res) => {
    try {
        const { certificateName } = req.body;
        const farmerId = req.user.userId;

        // Gerekli alanları kontrol et
        if (!certificateName || !req.file) {
            return res.status(400).json({
                error: 'Sertifika adı ve dosya zorunludur'
            });
        }

        // Kullanıcının çiftçi olduğunu kontrol et
        const userResult = await pool.query(
            'SELECT user_type FROM users WHERE id = $1',
            [farmerId]
        );

        if (userResult.rows.length === 0 || userResult.rows[0].user_type !== 'farmer') {
            return res.status(403).json({
                error: 'Sadece çiftçiler sertifika ekleyebilir'
            });
        }

        // Dosya bilgilerini hazırla
        const fileInfo = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        };

        // Sertifikayı veritabanına kaydet
        const result = await pool.query(
            `INSERT INTO certificates (farmer_id, certificate_name, file_info, created_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             RETURNING id, certificate_name, file_info, created_at`,
            [farmerId, certificateName, JSON.stringify(fileInfo)]
        );

        const newCertificate = result.rows[0];

        res.status(201).json({
            message: 'Sertifika başarıyla eklendi',
            certificate: {
                id: newCertificate.id,
                certificateName: newCertificate.certificate_name,
                fileInfo: typeof newCertificate.file_info === 'string' ? JSON.parse(newCertificate.file_info) : newCertificate.file_info,
                createdAt: newCertificate.created_at
            }
        });

    } catch (error) {
        console.error('Sertifika ekleme hatası:', error);
        
        // Dosya yüklendiyse sil
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                console.error('Dosya silme hatası:', unlinkError);
            }
        }

        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Çiftçinin sertifikalarını listele
const getMyCertificates = async (req, res) => {
    try {
        const farmerId = req.user.userId;

        const result = await pool.query(
            'SELECT * FROM certificates WHERE farmer_id = $1 ORDER BY created_at DESC',
            [farmerId]
        );

        const certificates = result.rows.map(row => ({
            id: row.id,
            certificateName: row.certificate_name,
            fileInfo: typeof row.file_info === 'string' ? JSON.parse(row.file_info) : row.file_info,
            createdAt: row.created_at
        }));

        res.json({
            certificates
        });

    } catch (error) {
        console.error('Sertifika listeleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Sertifika silme
const deleteCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        const farmerId = req.user.userId;

        // Sertifikanın çiftçiye ait olduğunu kontrol et
        const certificateResult = await pool.query(
            'SELECT file_info FROM certificates WHERE id = $1 AND farmer_id = $2',
            [id, farmerId]
        );

        if (certificateResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Sertifika bulunamadı veya bu sertifikayı silme yetkiniz yok'
            });
        }

        const certificate = certificateResult.rows[0];

        // Dosyayı sil
        try {
            const fileInfo = typeof certificate.file_info === 'string' ? JSON.parse(certificate.file_info) : certificate.file_info;
            await fs.unlink(fileInfo.path);
        } catch (unlinkError) {
            console.error('Dosya silme hatası:', unlinkError);
        }

        // Sertifikayı veritabanından sil
        await pool.query('DELETE FROM certificates WHERE id = $1', [id]);

        res.json({
            message: 'Sertifika başarıyla silindi'
        });

    } catch (error) {
        console.error('Sertifika silme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Dosya indirme
const downloadFile = async (req, res) => {
    try {
        const { id } = req.params;
        const farmerId = req.user.userId;

        const result = await pool.query(
            'SELECT file_info FROM certificates WHERE id = $1 AND farmer_id = $2',
            [id, farmerId]
        );

        if (result.rows.length === 0 || !result.rows[0].file_info) {
            return res.status(404).json({
                error: 'Dosya bulunamadı'
            });
        }

        const fileInfo = typeof result.rows[0].file_info === 'string' ? JSON.parse(result.rows[0].file_info) : result.rows[0].file_info;

        // Dosya var mı kontrol et
        try {
            await fs.access(fileInfo.path);
        } catch (error) {
            return res.status(404).json({
                error: 'Dosya sistemde bulunamadı'
            });
        }

        res.download(fileInfo.path, fileInfo.originalName);

    } catch (error) {
        console.error('Dosya indirme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

module.exports = {
    upload,
    addCertificate,
    getMyCertificates,
    deleteCertificate,
    downloadFile
};
