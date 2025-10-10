const { pool } = require('../config/database');

// Yıldız verme (e-posta ile doğrulama)
const addRating = async (req, res) => {
    try {
        const { listingId } = req.params;
        const { email, rating } = req.body;

        // Gerekli alanları kontrol et
        if (!email || !rating) {
            return res.status(400).json({
                error: 'E-posta ve yıldız puanı zorunludur'
            });
        }

        // E-posta formatını kontrol et
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Geçerli bir e-posta adresi giriniz'
            });
        }

        // Yıldız puanını kontrol et
        const ratingNum = parseInt(rating);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({
                error: 'Yıldız puanı 1-5 arasında olmalıdır'
            });
        }

        // İlanın var olup olmadığını kontrol et
        const listingResult = await pool.query(
            'SELECT id FROM listings WHERE id = $1 AND is_active = true',
            [listingId]
        );

        if (listingResult.rows.length === 0) {
            return res.status(404).json({
                error: 'İlan bulunamadı veya aktif değil'
            });
        }

        // E-posta adresinin sistemde kayıtlı olup olmadığını kontrol et
        const userResult = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND is_active = true',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({
                error: 'Bu e-posta adresi sistemde kayıtlı değil'
            });
        }

        // Bu e-posta adresinin daha önce bu ilana yıldız verip vermediğini kontrol et
        const existingRatingResult = await pool.query(
            'SELECT id FROM ratings WHERE listing_id = $1 AND email = $2',
            [listingId, email]
        );

        if (existingRatingResult.rows.length > 0) {
            return res.status(400).json({
                error: 'Bu e-posta adresi daha önce bu ilana yıldız vermiş'
            });
        }

        // Yıldızı veritabanına kaydet
        const result = await pool.query(
            `INSERT INTO ratings (listing_id, email, rating, created_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             RETURNING id, listing_id, email, rating, created_at`,
            [listingId, email, ratingNum]
        );

        const newRating = result.rows[0];

        res.status(201).json({
            message: 'Yıldız başarıyla eklendi',
            rating: {
                id: newRating.id,
                listingId: newRating.listing_id,
                email: newRating.email,
                rating: newRating.rating,
                createdAt: newRating.created_at
            }
        });

    } catch (error) {
        console.error('Yıldız ekleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// İlanın yıldız ortalamasını ve toplam yıldız sayısını getir
const getListingRating = async (req, res) => {
    try {
        const { listingId } = req.params;

        // İlanın var olup olmadığını kontrol et
        const listingResult = await pool.query(
            'SELECT id FROM listings WHERE id = $1',
            [listingId]
        );

        if (listingResult.rows.length === 0) {
            return res.status(404).json({
                error: 'İlan bulunamadı'
            });
        }

        // Yıldız istatistiklerini al
        const ratingResult = await pool.query(
            `SELECT 
                COUNT(*) as total_ratings,
                AVG(rating) as average_rating,
                MIN(rating) as min_rating,
                MAX(rating) as max_rating
             FROM ratings 
             WHERE listing_id = $1`,
            [listingId]
        );

        const stats = ratingResult.rows[0];
        const totalRatings = parseInt(stats.total_ratings);
        const averageRating = stats.average_rating ? parseFloat(stats.average_rating) : 0;

        // Yıldız dağılımını al (1-5 yıldız için kaç tane)
        const distributionResult = await pool.query(
            `SELECT rating, COUNT(*) as count
             FROM ratings 
             WHERE listing_id = $1
             GROUP BY rating
             ORDER BY rating`,
            [listingId]
        );

        const distribution = {};
        for (let i = 1; i <= 5; i++) {
            distribution[i] = 0;
        }
        distributionResult.rows.forEach(row => {
            distribution[row.rating] = parseInt(row.count);
        });

        res.json({
            listingId: parseInt(listingId),
            totalRatings,
            averageRating: Math.round(averageRating * 10) / 10, // 1 ondalık basamak
            minRating: parseInt(stats.min_rating) || 0,
            maxRating: parseInt(stats.max_rating) || 0,
            distribution
        });

    } catch (error) {
        console.error('Yıldız istatistikleri hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// E-posta adresinin belirli bir ilana verdiği yıldızı getir
const getRatingByEmail = async (req, res) => {
    try {
        const { listingId } = req.params;
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                error: 'E-posta parametresi gerekli'
            });
        }

        // E-posta formatını kontrol et
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Geçerli bir e-posta adresi giriniz'
            });
        }

        const result = await pool.query(
            'SELECT id, rating, created_at FROM ratings WHERE listing_id = $1 AND email = $2',
            [listingId, email]
        );

        if (result.rows.length === 0) {
            return res.json({
                hasRated: false,
                rating: null
            });
        }

        const rating = result.rows[0];
        res.json({
            hasRated: true,
            rating: {
                id: rating.id,
                rating: rating.rating,
                createdAt: rating.created_at
            }
        });

    } catch (error) {
        console.error('Yıldız sorgulama hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

module.exports = {
    addRating,
    getListingRating,
    getRatingByEmail
};
