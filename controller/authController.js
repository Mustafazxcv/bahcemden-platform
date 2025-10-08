const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// JWT token oluşturma
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'default_secret_key', {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

// Kayıt işlemi
const register = async (req, res) => {
    try {
        const { 
            firstName, 
            lastName, 
            username, 
            phone, 
            email, 
            password, 
            userType 
        } = req.body;

        // Gerekli alanları kontrol et
        if (!firstName || !lastName || !username || !phone || !email || !password || !userType) {
            return res.status(400).json({
                error: 'Tüm alanlar zorunludur'
            });
        }

        // Kullanıcı tipini kontrol et
        if (!['personal', 'farmer'].includes(userType)) {
            return res.status(400).json({
                error: 'Kullanıcı tipi sadece "personal" veya "farmer" olabilir'
            });
        }

        // E-posta formatını kontrol et
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Geçerli bir e-posta adresi giriniz'
            });
        }

        // Telefon formatını kontrol et (basit)
        const phoneRegex = /^[0-9+\-\s()]+$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                error: 'Geçerli bir telefon numarası giriniz'
            });
        }

        // Şifre uzunluğunu kontrol et
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Şifre en az 6 karakter olmalıdır'
            });
        }

        // Kullanıcı adı kontrolü
        if (username.length < 3) {
            return res.status(400).json({
                error: 'Kullanıcı adı en az 3 karakter olmalıdır'
            });
        }

        // E-posta veya kullanıcı adının zaten var olup olmadığını kontrol et
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2 OR phone = $3',
            [email, username, phone]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: 'Bu e-posta, kullanıcı adı veya telefon numarası zaten kayıtlı'
            });
        }

        // Şifreyi hashle
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Kullanıcıyı veritabanına kaydet
        const result = await pool.query(
            `INSERT INTO users (first_name, last_name, username, phone, email, password, user_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, first_name, last_name, username, email, phone, user_type, created_at`,
            [firstName, lastName, username, phone, email, hashedPassword, userType]
        );

        const newUser = result.rows[0];

        // Token oluştur
        const token = generateToken(newUser.id);

        res.status(201).json({
            message: 'Kullanıcı başarıyla kaydedildi',
            user: {
                id: newUser.id,
                firstName: newUser.first_name,
                lastName: newUser.last_name,
                username: newUser.username,
                email: newUser.email,
                phone: newUser.phone,
                userType: newUser.user_type,
                createdAt: newUser.created_at
            },
            token
        });

    } catch (error) {
        console.error('Kayıt hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Giriş işlemi
const login = async (req, res) => {
    try {
        const { login, password } = req.body; // login: email veya username olabilir

        if (!login || !password) {
            return res.status(400).json({
                error: 'E-posta/kullanıcı adı ve şifre gereklidir'
            });
        }

        // Kullanıcıyı email veya username ile bul
        const userResult = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR username = $1',
            [login]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                error: 'Geçersiz e-posta/kullanıcı adı veya şifre'
            });
        }

        const user = userResult.rows[0];

        // Kullanıcı aktif mi kontrol et
        if (!user.is_active) {
            return res.status(401).json({
                error: 'Hesabınız deaktif durumda'
            });
        }

        // Şifreyi kontrol et
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Geçersiz e-posta/kullanıcı adı veya şifre'
            });
        }

        // Token oluştur
        const token = generateToken(user.id);

        res.json({
            message: 'Giriş başarılı',
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                username: user.username,
                email: user.email,
                phone: user.phone,
                userType: user.user_type,
                createdAt: user.created_at
            },
            token
        });

    } catch (error) {
        console.error('Giriş hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Şifre değiştirme
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.user.userId;

        // Gerekli alanları kontrol et
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                error: 'Tüm alanlar zorunludur'
            });
        }

        // Yeni şifre ve tekrarı eşleşiyor mu kontrol et
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                error: 'Yeni şifreler eşleşmiyor'
            });
        }

        // Şifre uzunluğunu kontrol et
        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'Yeni şifre en az 6 karakter olmalıdır'
            });
        }

        // Kullanıcıyı bul
        const userResult = await pool.query(
            'SELECT password FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Kullanıcı bulunamadı'
            });
        }

        const user = userResult.rows[0];

        // Mevcut şifreyi kontrol et
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                error: 'Mevcut şifre yanlış'
            });
        }

        // Yeni şifre eski şifre ile aynı mı kontrol et
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({
                error: 'Yeni şifre mevcut şifre ile aynı olamaz'
            });
        }

        // Yeni şifreyi hashle
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Şifreyi güncelle
        await pool.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hashedNewPassword, userId]
        );

        res.json({
            message: 'Şifre başarıyla değiştirildi'
        });

    } catch (error) {
        console.error('Şifre değiştirme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// E-posta değiştirme
const changeEmail = async (req, res) => {
    try {
        const { newEmail, password } = req.body;
        const userId = req.user.userId;

        // Gerekli alanları kontrol et
        if (!newEmail || !password) {
            return res.status(400).json({
                error: 'E-posta ve şifre zorunludur'
            });
        }

        // E-posta formatını kontrol et
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newEmail)) {
            return res.status(400).json({
                error: 'Geçerli bir e-posta adresi giriniz'
            });
        }

        // Kullanıcıyı bul
        const userResult = await pool.query(
            'SELECT password, email FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Kullanıcı bulunamadı'
            });
        }

        const user = userResult.rows[0];

        // Şifreyi kontrol et
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Şifre yanlış'
            });
        }

        // Yeni e-posta mevcut e-posta ile aynı mı kontrol et
        if (newEmail.toLowerCase() === user.email.toLowerCase()) {
            return res.status(400).json({
                error: 'Yeni e-posta mevcut e-posta ile aynı olamaz'
            });
        }

        // E-posta adresinin başka bir kullanıcı tarafından kullanılıp kullanılmadığını kontrol et
        const existingEmailResult = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND id != $2',
            [newEmail.toLowerCase(), userId]
        );

        if (existingEmailResult.rows.length > 0) {
            return res.status(409).json({
                error: 'Bu e-posta adresi zaten kullanılıyor'
            });
        }

        // E-postayı güncelle
        await pool.query(
            'UPDATE users SET email = $1 WHERE id = $2',
            [newEmail.toLowerCase(), userId]
        );

        // Güncellenmiş kullanıcı bilgilerini al
        const updatedUserResult = await pool.query(
            'SELECT id, first_name, last_name, username, email, phone, user_type, created_at FROM users WHERE id = $1',
            [userId]
        );

        const updatedUser = updatedUserResult.rows[0];

        res.json({
            message: 'E-posta adresi başarıyla değiştirildi',
            user: {
                id: updatedUser.id,
                firstName: updatedUser.first_name,
                lastName: updatedUser.last_name,
                username: updatedUser.username,
                email: updatedUser.email,
                phone: updatedUser.phone,
                userType: updatedUser.user_type,
                createdAt: updatedUser.created_at
            }
        });

    } catch (error) {
        console.error('E-posta değiştirme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

module.exports = {
    register,
    login,
    changePassword,
    changeEmail
};
