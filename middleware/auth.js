const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// JWT token doğrulama middleware'i
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            error: 'Token gerekli' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                error: 'Geçersiz token' 
            });
        }
        req.user = user;
        next();
    });
};

// Kullanıcının aktif olup olmadığını kontrol eden middleware
const checkUserActive = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        
        const result = await pool.query(
            'SELECT is_active FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Kullanıcı bulunamadı'
            });
        }

        if (!result.rows[0].is_active) {
            return res.status(401).json({
                error: 'Hesabınız deaktif durumda'
            });
        }

        next();
    } catch (error) {
        console.error('Kullanıcı aktif kontrolü hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

module.exports = {
    authenticateToken,
    checkUserActive
};
