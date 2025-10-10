const { pool } = require('../config/database');

// Teklif gönderme
const sendOffer = async (req, res) => {
    try {
        const { listingId, offerPrice, message } = req.body;
        const buyerId = req.user.userId;

        // Gerekli alanları kontrol et
        if (!listingId || !offerPrice) {
            return res.status(400).json({
                error: 'İlan ID ve teklif fiyatı zorunludur'
            });
        }

        // Sayısal değerleri kontrol et
        const offerPriceNum = parseFloat(offerPrice);
        if (isNaN(offerPriceNum) || offerPriceNum <= 0) {
            return res.status(400).json({
                error: 'Teklif fiyatı geçerli bir pozitif sayı olmalıdır'
            });
        }

        // İlanın var olup olmadığını ve aktif olup olmadığını kontrol et
        const listingResult = await pool.query(
            `SELECT l.*, u.first_name, u.last_name 
             FROM listings l
             JOIN users u ON l.farmer_id = u.id
             WHERE l.id = $1 AND l.is_active = true AND u.is_active = true`,
            [listingId]
        );

        if (listingResult.rows.length === 0) {
            return res.status(404).json({
                error: 'İlan bulunamadı veya aktif değil'
            });
        }

        const listing = listingResult.rows[0];

        // Kullanıcının kendi ilanına teklif atıp atamayacağını kontrol et
        if (listing.farmer_id === buyerId) {
            return res.status(400).json({
                error: 'Kendi ilanınıza teklif atamazsınız'
            });
        }

        // Kullanıcının daha önce bu ilana teklif atıp atmadığını kontrol et
        const existingOfferResult = await pool.query(
            'SELECT id FROM offers WHERE listing_id = $1 AND buyer_id = $2',
            [listingId, buyerId]
        );

        if (existingOfferResult.rows.length > 0) {
            return res.status(400).json({
                error: 'Bu ilana daha önce teklif attınız'
            });
        }

        // Teklifi veritabanına kaydet
        const result = await pool.query(
            `INSERT INTO offers (
                listing_id, buyer_id, offer_price, message, status, created_at
            ) VALUES ($1, $2, $3, $4, 'pending', CURRENT_TIMESTAMP)
            RETURNING id, listing_id, buyer_id, offer_price, message, status, created_at`,
            [listingId, buyerId, offerPriceNum, message || null]
        );

        const newOffer = result.rows[0];

        res.status(201).json({
            message: 'Teklif başarıyla gönderildi',
            offer: {
                id: newOffer.id,
                listingId: newOffer.listing_id,
                buyerId: newOffer.buyer_id,
                offerPrice: newOffer.offer_price,
                message: newOffer.message,
                status: newOffer.status,
                createdAt: newOffer.created_at
            }
        });

    } catch (error) {
        console.error('Teklif gönderme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Alıcının tekliflerini listele
const getMyOffers = async (req, res) => {
    try {
        const buyerId = req.user.userId;
        const { status, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT o.*, l.product_type, l.quantity, l.unit, l.price as listing_price,
                   l.location, l.harvest_date, u.first_name, u.last_name, u.username
            FROM offers o
            JOIN listings l ON o.listing_id = l.id
            JOIN users u ON l.farmer_id = u.id
            WHERE o.buyer_id = $1
        `;
        const queryParams = [buyerId];
        let paramCount = 1;

        // Durum filtresi
        if (status) {
            paramCount++;
            query += ` AND o.status = $${paramCount}`;
            queryParams.push(status);
        }

        // Sıralama ve sayfalama
        query += ` ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        queryParams.push(parseInt(limit), offset);

        const result = await pool.query(query, queryParams);

        // Toplam sayıyı al
        let countQuery = `
            SELECT COUNT(*) as total
            FROM offers o
            WHERE o.buyer_id = $1
        `;
        const countParams = [buyerId];
        let countParamCount = 1;

        if (status) {
            countParamCount++;
            countQuery += ` AND o.status = $${countParamCount}`;
            countParams.push(status);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        const offers = result.rows.map(row => ({
            id: row.id,
            listingId: row.listing_id,
            offerPrice: row.offer_price,
            message: row.message,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            listing: {
                productType: row.product_type,
                quantity: row.quantity,
                unit: row.unit,
                price: row.listing_price,
                location: row.location,
                harvestDate: row.harvest_date
            },
            farmer: {
                firstName: row.first_name,
                lastName: row.last_name,
                username: row.username
            }
        }));

        res.json({
            offers,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Teklif listeleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Çiftçinin aldığı teklifleri listele
const getListingOffers = async (req, res) => {
    try {
        const { listingId } = req.params;
        const farmerId = req.user.userId;
        const { status, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // İlanın çiftçiye ait olup olmadığını kontrol et
        const listingResult = await pool.query(
            'SELECT id FROM listings WHERE id = $1 AND farmer_id = $2',
            [listingId, farmerId]
        );

        if (listingResult.rows.length === 0) {
            return res.status(404).json({
                error: 'İlan bulunamadı veya bu ilanı görme yetkiniz yok'
            });
        }

        let query = `
            SELECT o.*, u.first_name, u.last_name, u.username, u.phone
            FROM offers o
            JOIN users u ON o.buyer_id = u.id
            WHERE o.listing_id = $1
        `;
        const queryParams = [listingId];
        let paramCount = 1;

        // Durum filtresi
        if (status) {
            paramCount++;
            query += ` AND o.status = $${paramCount}`;
            queryParams.push(status);
        }

        // Sıralama ve sayfalama
        query += ` ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        queryParams.push(parseInt(limit), offset);

        const result = await pool.query(query, queryParams);

        // Toplam sayıyı al
        let countQuery = `
            SELECT COUNT(*) as total
            FROM offers o
            WHERE o.listing_id = $1
        `;
        const countParams = [listingId];
        let countParamCount = 1;

        if (status) {
            countParamCount++;
            countQuery += ` AND o.status = $${countParamCount}`;
            countParams.push(status);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        const offers = result.rows.map(row => ({
            id: row.id,
            offerPrice: row.offer_price,
            message: row.message,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            buyer: {
                firstName: row.first_name,
                lastName: row.last_name,
                username: row.username,
                phone: row.phone
            }
        }));

        res.json({
            offers,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('İlan teklifleri listeleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Teklif onaylama/reddetme
const respondToOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        const { action } = req.body; // 'accept' veya 'reject'
        const farmerId = req.user.userId;

        if (!action || !['accept', 'reject'].includes(action)) {
            return res.status(400).json({
                error: 'Geçerli bir aksiyon belirtin (accept veya reject)'
            });
        }

        // Teklifin var olup olmadığını ve çiftçiye ait olup olmadığını kontrol et
        const offerResult = await pool.query(
            `SELECT o.*, l.farmer_id 
             FROM offers o
             JOIN listings l ON o.listing_id = l.id
             WHERE o.id = $1`,
            [offerId]
        );

        if (offerResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Teklif bulunamadı'
            });
        }

        const offer = offerResult.rows[0];

        if (offer.farmer_id !== farmerId) {
            return res.status(403).json({
                error: 'Bu teklife yanıt verme yetkiniz yok'
            });
        }

        if (offer.status !== 'pending') {
            return res.status(400).json({
                error: 'Bu teklif zaten yanıtlanmış'
            });
        }

        const newStatus = action === 'accept' ? 'accepted' : 'rejected';

        // Teklifi güncelle
        const result = await pool.query(
            `UPDATE offers 
             SET status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [newStatus, offerId]
        );

        // Eğer teklif kabul edildiyse, diğer pending teklifleri reddet
        if (action === 'accept') {
            await pool.query(
                `UPDATE offers 
                 SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
                 WHERE listing_id = $1 AND id != $2 AND status = 'pending'`,
                [offer.listing_id, offerId]
            );
        }

        res.json({
            message: `Teklif başarıyla ${action === 'accept' ? 'kabul edildi' : 'reddedildi'}`,
            offer: {
                id: result.rows[0].id,
                status: result.rows[0].status,
                updatedAt: result.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('Teklif yanıtlama hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Teklif detayı
const getOfferById = async (req, res) => {
    try {
        const { offerId } = req.params;
        const userId = req.user.userId;
        
        // Parametre doğrulama: offerId sayısal olmalı
        const offerIdNum = parseInt(offerId, 10);
        if (!Number.isInteger(offerIdNum) || offerIdNum <= 0) {
            return res.status(400).json({ error: 'Geçersiz teklif ID' });
        }

        const result = await pool.query(
            `SELECT o.*, l.product_type, l.quantity, l.unit, l.price as listing_price,
                    l.location, l.harvest_date, l.farmer_id,
                    u1.first_name as buyer_first_name, u1.last_name as buyer_last_name, 
                    u1.username as buyer_username, u1.phone as buyer_phone,
                    u2.first_name as farmer_first_name, u2.last_name as farmer_last_name,
                    u2.username as farmer_username, u2.phone as farmer_phone
             FROM offers o
             JOIN listings l ON o.listing_id = l.id
             JOIN users u1 ON o.buyer_id = u1.id
             JOIN users u2 ON l.farmer_id = u2.id
             WHERE o.id = $1 AND (o.buyer_id = $2 OR l.farmer_id = $2)`,
            [offerIdNum, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Teklif bulunamadı veya bu teklifi görme yetkiniz yok'
            });
        }

        const offer = result.rows[0];

        res.json({
            id: offer.id,
            listingId: offer.listing_id,
            offerPrice: offer.offer_price,
            message: offer.message,
            status: offer.status,
            createdAt: offer.created_at,
            updatedAt: offer.updated_at,
            listing: {
                id: offer.listing_id,
                productType: offer.product_type,
                quantity: offer.quantity,
                unit: offer.unit,
                price: offer.listing_price,
                location: offer.location,
                harvestDate: offer.harvest_date
            },
            buyer: {
                id: offer.buyer_id,
                firstName: offer.buyer_first_name,
                lastName: offer.buyer_last_name,
                username: offer.buyer_username,
                phone: offer.buyer_phone
            },
            farmer: {
                id: offer.farmer_id,
                firstName: offer.farmer_first_name,
                lastName: offer.farmer_last_name,
                username: offer.farmer_username,
                phone: offer.farmer_phone
            }
        });

    } catch (error) {
        console.error('Teklif detay hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Teklif silme (sadece alıcı)
const deleteOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        const buyerId = req.user.userId;

        // Teklifin var olup olmadığını ve alıcıya ait olup olmadığını kontrol et
        const offerResult = await pool.query(
            'SELECT * FROM offers WHERE id = $1 AND buyer_id = $2',
            [offerId, buyerId]
        );

        if (offerResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Teklif bulunamadı veya bu teklifi silme yetkiniz yok'
            });
        }

        const offer = offerResult.rows[0];

        // Sadece pending durumundaki teklifler silinebilir
        if (offer.status !== 'pending') {
            return res.status(400).json({
                error: 'Sadece bekleyen teklifler silinebilir'
            });
        }

        // Teklifi sil
        await pool.query('DELETE FROM offers WHERE id = $1', [offerId]);

        res.json({
            message: 'Teklif başarıyla silindi'
        });

    } catch (error) {
        console.error('Teklif silme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

module.exports = {
    sendOffer,
    getMyOffers,
    getListingOffers,
    respondToOffer,
    getOfferById,
    deleteOffer
};
