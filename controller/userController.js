const { pool } = require('../config/database');

// Kullanıcıları listele (mesajlaşma için)
const getUsers = async (req, res) => {
    try {
        const { search, userType, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT id, first_name, last_name, username, email, user_type, created_at
            FROM users 
            WHERE is_active = true
        `;
        const queryParams = [];
        let paramCount = 0;

        // Arama filtresi
        if (search) {
            paramCount++;
            query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR username ILIKE $${paramCount})`;
            queryParams.push(`%${search}%`);
        }

        // Kullanıcı tipi filtresi
        if (userType && ['personal', 'farmer'].includes(userType)) {
            paramCount++;
            query += ` AND user_type = $${paramCount}`;
            queryParams.push(userType);
        }

        // Sıralama ve sayfalama
        query += ` ORDER BY first_name, last_name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        queryParams.push(parseInt(limit), offset);

        const result = await pool.query(query, queryParams);

        // Toplam sayıyı al
        let countQuery = `
            SELECT COUNT(*) as total
            FROM users 
            WHERE is_active = true
        `;
        const countParams = [];
        let countParamCount = 0;

        if (search) {
            countParamCount++;
            countQuery += ` AND (first_name ILIKE $${countParamCount} OR last_name ILIKE $${countParamCount} OR username ILIKE $${countParamCount})`;
            countParams.push(`%${search}%`);
        }

        if (userType && ['personal', 'farmer'].includes(userType)) {
            countParamCount++;
            countQuery += ` AND user_type = $${countParamCount}`;
            countParams.push(userType);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        const users = result.rows.map(row => ({
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            username: row.username,
            email: row.email,
            userType: row.user_type,
            createdAt: row.created_at
        }));

        res.json({
            users,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Kullanıcı listeleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Tek kullanıcı detayı
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT id, first_name, last_name, username, email, user_type, created_at FROM users WHERE id = $1 AND is_active = true',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Kullanıcı bulunamadı'
            });
        }

        const user = result.rows[0];

        res.json({
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username,
            email: user.email,
            userType: user.user_type,
            createdAt: user.created_at
        });

    } catch (error) {
        console.error('Kullanıcı detay hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Kullanıcı profili (kendi bilgileri)
const getMyProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await pool.query(
            'SELECT id, first_name, last_name, username, email, phone, user_type, created_at FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Kullanıcı bulunamadı'
            });
        }

        const user = result.rows[0];

        res.json({
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username,
            email: user.email,
            phone: user.phone,
            userType: user.user_type,
            createdAt: user.created_at
        });

    } catch (error) {
        console.error('Profil getirme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

module.exports = {
    getUsers,
    getUserById,
    getMyProfile
};
