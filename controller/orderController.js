const { pool } = require('../config/database');

// Sipariş oluşturma (public - e-posta ile doğrulama)
const createOrder = async (req, res) => {
    try {
        const { listingId } = req.params;
        const { 
            email, 
            quantity, 
            paymentMethod, 
            deliveryAddress, 
            deliveryPhone, 
            deliveryNotes 
        } = req.body;

        // Gerekli alanları kontrol et
        if (!email || !quantity || !paymentMethod || !deliveryAddress || !deliveryPhone) {
            return res.status(400).json({
                error: 'E-posta, miktar, ödeme yöntemi, teslimat adresi ve telefon zorunludur'
            });
        }

        // E-posta formatını kontrol et
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Geçerli bir e-posta adresi giriniz'
            });
        }

        // Miktarı kontrol et
        const quantityNum = parseFloat(quantity);
        if (isNaN(quantityNum) || quantityNum <= 0) {
            return res.status(400).json({
                error: 'Miktar geçerli bir pozitif sayı olmalıdır'
            });
        }

        // Ödeme yöntemini kontrol et
        const validPaymentMethods = ['credit_card', 'bank_transfer', 'cash_on_delivery', 'digital_wallet'];
        if (!validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({
                error: 'Geçerli bir ödeme yöntemi seçiniz'
            });
        }

        // İlanın var olup olmadığını ve aktif olup olmadığını kontrol et
        const listingResult = await pool.query(
            `SELECT l.*, u.first_name, u.last_name, u.username, u.phone as farmer_phone
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

        // Miktarın mevcut stoktan fazla olup olmadığını kontrol et
        if (quantityNum > listing.quantity) {
            return res.status(400).json({
                error: `Maksimum ${listing.quantity} ${listing.unit} sipariş verebilirsiniz`
            });
        }

        // E-posta adresinin sistemde kayıtlı olup olmadığını kontrol et
        const userResult = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND is_active = true',
            [email]
        );

        let buyerId = null;
        if (userResult.rows.length > 0) {
            buyerId = userResult.rows[0].id;
        } else {
            return res.status(400).json({
                error: 'Bu e-posta adresi sistemde kayıtlı değil. Lütfen önce kayıt olunuz.',
                requiresRegistration: true
            });
        }

        // Fiyat hesaplama
        const unitPrice = parseFloat(listing.price);
        const totalPrice = quantityNum * unitPrice;

        // Siparişi veritabanına kaydet
        const result = await pool.query(
            `INSERT INTO orders (
                listing_id, buyer_email, buyer_id, quantity, unit_price, total_price,
                payment_method, delivery_address, delivery_phone, delivery_notes,
                payment_status, order_status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', 'pending', CURRENT_TIMESTAMP)
            RETURNING id, listing_id, buyer_email, buyer_id, quantity, unit_price, total_price,
                     payment_method, payment_status, order_status, delivery_address, 
                     delivery_phone, delivery_notes, created_at`,
            [
                listingId, email, buyerId, quantityNum, unitPrice, totalPrice,
                paymentMethod, deliveryAddress, deliveryPhone, deliveryNotes || null
            ]
        );

        const newOrder = result.rows[0];

        res.status(201).json({
            message: 'Sipariş başarıyla oluşturuldu',
            order: {
                id: newOrder.id,
                listingId: newOrder.listing_id,
                buyerEmail: newOrder.buyer_email,
                buyerId: newOrder.buyer_id,
                quantity: newOrder.quantity,
                unitPrice: newOrder.unit_price,
                totalPrice: newOrder.total_price,
                paymentMethod: newOrder.payment_method,
                paymentStatus: newOrder.payment_status,
                orderStatus: newOrder.order_status,
                deliveryAddress: newOrder.delivery_address,
                deliveryPhone: newOrder.delivery_phone,
                deliveryNotes: newOrder.delivery_notes,
                createdAt: newOrder.created_at,
                listing: {
                    productType: listing.product_type,
                    farmerName: `${listing.first_name} ${listing.last_name}`,
                    farmerUsername: listing.username,
                    farmerPhone: listing.farmer_phone
                }
            }
        });

    } catch (error) {
        console.error('Sipariş oluşturma hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Alıcının siparişlerini listele (token gerekli)
const getMyOrders = async (req, res) => {
    try {
        const buyerId = req.user.userId;
        const { status, paymentStatus, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT o.*, l.product_type, l.harvest_date, l.location as listing_location,
                   u.first_name as farmer_first_name, u.last_name as farmer_last_name,
                   u.username as farmer_username, u.phone as farmer_phone
            FROM orders o
            JOIN listings l ON o.listing_id = l.id
            JOIN users u ON l.farmer_id = u.id
            WHERE o.buyer_id = $1
        `;
        const queryParams = [buyerId];
        let paramCount = 1;

        // Sipariş durumu filtresi
        if (status) {
            paramCount++;
            query += ` AND o.order_status = $${paramCount}`;
            queryParams.push(status);
        }

        // Ödeme durumu filtresi
        if (paymentStatus) {
            paramCount++;
            query += ` AND o.payment_status = $${paramCount}`;
            queryParams.push(paymentStatus);
        }

        // Sıralama ve sayfalama
        query += ` ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        queryParams.push(parseInt(limit), offset);

        const result = await pool.query(query, queryParams);

        // Toplam sayıyı al
        let countQuery = `
            SELECT COUNT(*) as total
            FROM orders o
            WHERE o.buyer_id = $1
        `;
        const countParams = [buyerId];
        let countParamCount = 1;

        if (status) {
            countParamCount++;
            countQuery += ` AND o.order_status = $${countParamCount}`;
            countParams.push(status);
        }

        if (paymentStatus) {
            countParamCount++;
            countQuery += ` AND o.payment_status = $${countParamCount}`;
            countParams.push(paymentStatus);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        const orders = result.rows.map(row => ({
            id: row.id,
            listingId: row.listing_id,
            quantity: row.quantity,
            unitPrice: row.unit_price,
            totalPrice: row.total_price,
            paymentMethod: row.payment_method,
            paymentStatus: row.payment_status,
            orderStatus: row.order_status,
            deliveryAddress: row.delivery_address,
            deliveryPhone: row.delivery_phone,
            deliveryNotes: row.delivery_notes,
            farmerNotes: row.farmer_notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            listing: {
                productType: row.product_type,
                harvestDate: row.harvest_date,
                location: row.listing_location
            },
            farmer: {
                firstName: row.farmer_first_name,
                lastName: row.farmer_last_name,
                username: row.farmer_username,
                phone: row.farmer_phone
            }
        }));

        res.json({
            orders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Sipariş listeleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Çiftçinin aldığı siparişleri listele (token gerekli)
const getFarmerOrders = async (req, res) => {
    try {
        const farmerId = req.user.userId;
        const { status, paymentStatus, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT o.*, l.product_type, l.harvest_date, l.location as listing_location,
                   u.first_name as buyer_first_name, u.last_name as buyer_last_name,
                   u.username as buyer_username, u.phone as buyer_phone
            FROM orders o
            JOIN listings l ON o.listing_id = l.id
            JOIN users u ON o.buyer_id = u.id
            WHERE l.farmer_id = $1
        `;
        const queryParams = [farmerId];
        let paramCount = 1;

        // Sipariş durumu filtresi
        if (status) {
            paramCount++;
            query += ` AND o.order_status = $${paramCount}`;
            queryParams.push(status);
        }

        // Ödeme durumu filtresi
        if (paymentStatus) {
            paramCount++;
            query += ` AND o.payment_status = $${paramCount}`;
            queryParams.push(paymentStatus);
        }

        // Sıralama ve sayfalama
        query += ` ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        queryParams.push(parseInt(limit), offset);

        const result = await pool.query(query, queryParams);

        // Toplam sayıyı al
        let countQuery = `
            SELECT COUNT(*) as total
            FROM orders o
            JOIN listings l ON o.listing_id = l.id
            WHERE l.farmer_id = $1
        `;
        const countParams = [farmerId];
        let countParamCount = 1;

        if (status) {
            countParamCount++;
            countQuery += ` AND o.order_status = $${countParamCount}`;
            countParams.push(status);
        }

        if (paymentStatus) {
            countParamCount++;
            countQuery += ` AND o.payment_status = $${countParamCount}`;
            countParams.push(paymentStatus);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        const orders = result.rows.map(row => ({
            id: row.id,
            listingId: row.listing_id,
            buyerEmail: row.buyer_email,
            quantity: row.quantity,
            unitPrice: row.unit_price,
            totalPrice: row.total_price,
            paymentMethod: row.payment_method,
            paymentStatus: row.payment_status,
            orderStatus: row.order_status,
            deliveryAddress: row.delivery_address,
            deliveryPhone: row.delivery_phone,
            deliveryNotes: row.delivery_notes,
            farmerNotes: row.farmer_notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            listing: {
                productType: row.product_type,
                harvestDate: row.harvest_date,
                location: row.listing_location
            },
            buyer: {
                firstName: row.buyer_first_name,
                lastName: row.buyer_last_name,
                username: row.buyer_username,
                phone: row.buyer_phone
            }
        }));

        res.json({
            orders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Çiftçi sipariş listeleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Sipariş detayı
const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.userId;

        const result = await pool.query(
            `SELECT o.*, l.product_type, l.harvest_date, l.location as listing_location,
                    u1.first_name as buyer_first_name, u1.last_name as buyer_last_name,
                    u1.username as buyer_username, u1.phone as buyer_phone,
                    u2.first_name as farmer_first_name, u2.last_name as farmer_last_name,
                    u2.username as farmer_username, u2.phone as farmer_phone
             FROM orders o
             JOIN listings l ON o.listing_id = l.id
             JOIN users u1 ON o.buyer_id = u1.id
             JOIN users u2 ON l.farmer_id = u2.id
             WHERE o.id = $1 AND (o.buyer_id = $2 OR l.farmer_id = $2)`,
            [orderId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Sipariş bulunamadı veya bu siparişi görme yetkiniz yok'
            });
        }

        const order = result.rows[0];

        res.json({
            id: order.id,
            listingId: order.listing_id,
            buyerEmail: order.buyer_email,
            quantity: order.quantity,
            unitPrice: order.unit_price,
            totalPrice: order.total_price,
            paymentMethod: order.payment_method,
            paymentStatus: order.payment_status,
            orderStatus: order.order_status,
            deliveryAddress: order.delivery_address,
            deliveryPhone: order.delivery_phone,
            deliveryNotes: order.delivery_notes,
            farmerNotes: order.farmer_notes,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            listing: {
                productType: order.product_type,
                harvestDate: order.harvest_date,
                location: order.listing_location
            },
            buyer: {
                firstName: order.buyer_first_name,
                lastName: order.buyer_last_name,
                username: order.buyer_username,
                phone: order.buyer_phone
            },
            farmer: {
                firstName: order.farmer_first_name,
                lastName: order.farmer_last_name,
                username: order.farmer_username,
                phone: order.farmer_phone
            }
        });

    } catch (error) {
        console.error('Sipariş detay hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Sipariş durumu güncelleme (çiftçi)
const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { orderStatus, farmerNotes } = req.body;
        const farmerId = req.user.userId;

        // Geçerli sipariş durumlarını kontrol et
        const validStatuses = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'];
        if (!orderStatus || !validStatuses.includes(orderStatus)) {
            return res.status(400).json({
                error: 'Geçerli bir sipariş durumu belirtiniz'
            });
        }

        // Siparişin çiftçiye ait olup olmadığını kontrol et
        const orderResult = await pool.query(
            `SELECT o.*, l.farmer_id 
             FROM orders o
             JOIN listings l ON o.listing_id = l.id
             WHERE o.id = $1`,
            [orderId]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Sipariş bulunamadı'
            });
        }

        const order = orderResult.rows[0];

        if (order.farmer_id !== farmerId) {
            return res.status(403).json({
                error: 'Bu siparişi güncelleme yetkiniz yok'
            });
        }

        // Siparişi güncelle
        const result = await pool.query(
            `UPDATE orders 
             SET order_status = $1, farmer_notes = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [orderStatus, farmerNotes || null, orderId]
        );

        res.json({
            message: 'Sipariş durumu başarıyla güncellendi',
            order: {
                id: result.rows[0].id,
                orderStatus: result.rows[0].order_status,
                farmerNotes: result.rows[0].farmer_notes,
                updatedAt: result.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('Sipariş durumu güncelleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Ödeme durumu güncelleme (çiftçi)
const updatePaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentStatus } = req.body;
        const farmerId = req.user.userId;

        // Geçerli ödeme durumlarını kontrol et
        const validStatuses = ['pending', 'paid', 'failed', 'refunded'];
        if (!paymentStatus || !validStatuses.includes(paymentStatus)) {
            return res.status(400).json({
                error: 'Geçerli bir ödeme durumu belirtiniz'
            });
        }

        // Siparişin çiftçiye ait olup olmadığını kontrol et
        const orderResult = await pool.query(
            `SELECT o.*, l.farmer_id 
             FROM orders o
             JOIN listings l ON o.listing_id = l.id
             WHERE o.id = $1`,
            [orderId]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Sipariş bulunamadı'
            });
        }

        const order = orderResult.rows[0];

        if (order.farmer_id !== farmerId) {
            return res.status(403).json({
                error: 'Bu siparişi güncelleme yetkiniz yok'
            });
        }

        // Siparişi güncelle
        const result = await pool.query(
            `UPDATE orders 
             SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [paymentStatus, orderId]
        );

        res.json({
            message: 'Ödeme durumu başarıyla güncellendi',
            order: {
                id: result.rows[0].id,
                paymentStatus: result.rows[0].payment_status,
                updatedAt: result.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('Ödeme durumu güncelleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

module.exports = {
    createOrder,
    getMyOrders,
    getFarmerOrders,
    getOrderById,
    updateOrderStatus,
    updatePaymentStatus
};
