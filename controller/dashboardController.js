const { pool } = require('../config/database');

// Dashboard bilgilerini getir
const getDashboard = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Kullanıcı bilgilerini al
        const userResult = await pool.query(
            'SELECT id, first_name, last_name, username, email, phone, user_type, created_at FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Kullanıcı bulunamadı'
            });
        }

        const user = userResult.rows[0];

        // Çiftçi ise detaylı bilgileri al
        if (user.user_type === 'farmer') {
            await getFarmerDashboard(req, res, user);
        } else {
            await getBuyerDashboard(req, res, user);
        }

    } catch (error) {
        console.error('Dashboard hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Çiftçi dashboard'u
const getFarmerDashboard = async (req, res, user) => {
    try {
        const userId = user.id;

        // Genel istatistikler
        const statsResult = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM farms WHERE farmer_id = $1) as total_farms,
                (SELECT COUNT(*) FROM listings WHERE farmer_id = $1) as total_listings,
                (SELECT COUNT(*) FROM listings WHERE farmer_id = $1 AND is_active = true) as active_listings,
                (SELECT COUNT(*) FROM offers WHERE listing_id IN (SELECT id FROM listings WHERE farmer_id = $1)) as total_offers,
                (SELECT COUNT(*) FROM offers WHERE listing_id IN (SELECT id FROM listings WHERE farmer_id = $1) AND status = 'pending') as pending_offers,
                (SELECT COUNT(*) FROM orders WHERE listing_id IN (SELECT id FROM listings WHERE farmer_id = $1)) as total_orders,
                (SELECT COUNT(*) FROM orders WHERE listing_id IN (SELECT id FROM listings WHERE farmer_id = $1) AND order_status = 'pending') as pending_orders,
                (SELECT COUNT(*) FROM certificates WHERE farmer_id = $1) as total_certificates,
                (SELECT COALESCE(AVG(r.rating), 0) FROM listings l LEFT JOIN ratings r ON l.id = r.listing_id WHERE l.farmer_id = $1) as average_rating,
                (SELECT COUNT(*) FROM ratings r JOIN listings l ON r.listing_id = l.id WHERE l.farmer_id = $1) as total_ratings
        `, [userId]);

        const stats = statsResult.rows[0];

        // Son 7 günlük istatistikler
        const weeklyStatsResult = await pool.query(`
            SELECT 
                COUNT(CASE WHEN o.created_at >= NOW() - INTERVAL '7 days' THEN o.id END) as orders_this_week,
                COUNT(CASE WHEN l.created_at >= NOW() - INTERVAL '7 days' THEN l.id END) as listings_this_week,
                COUNT(CASE WHEN off.created_at >= NOW() - INTERVAL '7 days' THEN off.id END) as offers_this_week,
                COALESCE(SUM(CASE WHEN o.created_at >= NOW() - INTERVAL '7 days' THEN o.total_price END), 0) as revenue_this_week
            FROM users u
            LEFT JOIN listings l ON u.id = l.farmer_id
            LEFT JOIN offers off ON l.id = off.listing_id
            LEFT JOIN orders o ON l.id = o.listing_id
            WHERE u.id = $1
        `, [userId]);

        const weeklyStats = weeklyStatsResult.rows[0];

        // Son 5 çiftlik
        const recentFarmsResult = await pool.query(
            `SELECT id, farm_name, location, area, area_unit, created_at
             FROM farms 
             WHERE farmer_id = $1 
             ORDER BY created_at DESC 
             LIMIT 5`,
            [userId]
        );

        // Son 5 ilan
        const recentListingsResult = await pool.query(
            `SELECT id, product_type, quantity, unit, price, harvest_date, is_active, created_at,
                    COALESCE(rating_stats.average_rating, 0) as average_rating,
                    COALESCE(rating_stats.total_ratings, 0) as total_ratings,
                    COALESCE(order_stats.total_orders, 0) as total_orders
             FROM listings l
             LEFT JOIN (
                 SELECT listing_id, 
                        AVG(rating) as average_rating,
                        COUNT(id) as total_ratings
                 FROM ratings
                 GROUP BY listing_id
             ) rating_stats ON l.id = rating_stats.listing_id
             LEFT JOIN (
                 SELECT listing_id, COUNT(id) as total_orders
                 FROM orders
                 GROUP BY listing_id
             ) order_stats ON l.id = order_stats.listing_id
             WHERE farmer_id = $1 
             ORDER BY created_at DESC 
             LIMIT 5`,
            [userId]
        );

        // Son 5 teklif
        const recentOffersResult = await pool.query(
            `SELECT o.id, o.offer_price, o.message, o.status, o.created_at,
                    l.product_type, u.first_name, u.last_name, u.username
             FROM offers o
             JOIN listings l ON o.listing_id = l.id
             JOIN users u ON o.buyer_id = u.id
             WHERE l.farmer_id = $1 
             ORDER BY o.created_at DESC 
             LIMIT 5`,
            [userId]
        );

        // Son 5 sipariş
        const recentOrdersResult = await pool.query(
            `SELECT o.id, o.quantity, o.total_price, o.payment_status, o.order_status, o.created_at,
                    l.product_type, u.first_name, u.last_name, u.username
             FROM orders o
             JOIN listings l ON o.listing_id = l.id
             JOIN users u ON o.buyer_id = u.id
             WHERE l.farmer_id = $1 
             ORDER BY o.created_at DESC 
             LIMIT 5`,
            [userId]
        );

        // Son 5 sertifika
        const recentCertificatesResult = await pool.query(
            `SELECT id, certificate_name, created_at
             FROM certificates 
             WHERE farmer_id = $1 
             ORDER BY created_at DESC 
             LIMIT 5`,
            [userId]
        );

        // Aylık gelir grafiği (son 12 ay)
        const monthlyRevenueResult = await pool.query(
            `SELECT 
                TO_CHAR(o.created_at, 'YYYY-MM') as month,
                COALESCE(SUM(o.total_price), 0) as revenue,
                COUNT(o.id) as order_count
             FROM orders o
             JOIN listings l ON o.listing_id = l.id
             WHERE l.farmer_id = $1 
                AND o.created_at >= NOW() - INTERVAL '12 months'
                AND o.payment_status = 'paid'
             GROUP BY TO_CHAR(o.created_at, 'YYYY-MM')
             ORDER BY month DESC`,
            [userId]
        );

        // Ürün türüne göre satış dağılımı
        const productSalesResult = await pool.query(
            `SELECT 
                l.product_type,
                COUNT(o.id) as order_count,
                COALESCE(SUM(o.total_price), 0) as total_revenue,
                COALESCE(SUM(o.quantity), 0) as total_quantity
             FROM orders o
             JOIN listings l ON o.listing_id = l.id
             WHERE l.farmer_id = $1 AND o.payment_status = 'paid'
             GROUP BY l.product_type
             ORDER BY total_revenue DESC`,
            [userId]
        );

        res.json({
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                username: user.username,
                email: user.email,
                phone: user.phone,
                userType: user.user_type,
                memberSince: user.created_at
            },
            stats: {
                totalFarms: parseInt(stats.total_farms),
                totalListings: parseInt(stats.total_listings),
                activeListings: parseInt(stats.active_listings),
                totalOffers: parseInt(stats.total_offers),
                pendingOffers: parseInt(stats.pending_offers),
                totalOrders: parseInt(stats.total_orders),
                pendingOrders: parseInt(stats.pending_orders),
                totalCertificates: parseInt(stats.total_certificates),
                averageRating: parseFloat(stats.average_rating) || 0,
                totalRatings: parseInt(stats.total_ratings)
            },
            weeklyStats: {
                ordersThisWeek: parseInt(weeklyStats.orders_this_week),
                listingsThisWeek: parseInt(weeklyStats.listings_this_week),
                offersThisWeek: parseInt(weeklyStats.offers_this_week),
                revenueThisWeek: parseFloat(weeklyStats.revenue_this_week) || 0
            },
            recentActivity: {
                farms: recentFarmsResult.rows.map(farm => ({
                    id: farm.id,
                    farmName: farm.farm_name,
                    location: farm.location,
                    area: farm.area,
                    areaUnit: farm.area_unit,
                    createdAt: farm.created_at
                })),
                listings: recentListingsResult.rows.map(listing => ({
                    id: listing.id,
                    productType: listing.product_type,
                    quantity: listing.quantity,
                    unit: listing.unit,
                    price: listing.price,
                    harvestDate: listing.harvest_date,
                    isActive: listing.is_active,
                    averageRating: parseFloat(listing.average_rating) || 0,
                    totalRatings: parseInt(listing.total_ratings),
                    totalOrders: parseInt(listing.total_orders),
                    createdAt: listing.created_at
                })),
                offers: recentOffersResult.rows.map(offer => ({
                    id: offer.id,
                    offerPrice: offer.offer_price,
                    message: offer.message,
                    status: offer.status,
                    productType: offer.product_type,
                    buyerName: `${offer.first_name} ${offer.last_name}`,
                    buyerUsername: offer.username,
                    createdAt: offer.created_at
                })),
                orders: recentOrdersResult.rows.map(order => ({
                    id: order.id,
                    quantity: order.quantity,
                    totalPrice: order.total_price,
                    paymentStatus: order.payment_status,
                    orderStatus: order.order_status,
                    productType: order.product_type,
                    buyerName: `${order.first_name} ${order.last_name}`,
                    buyerUsername: order.username,
                    createdAt: order.created_at
                })),
                certificates: recentCertificatesResult.rows.map(cert => ({
                    id: cert.id,
                    certificateName: cert.certificate_name,
                    createdAt: cert.created_at
                }))
            },
            analytics: {
                monthlyRevenue: monthlyRevenueResult.rows.map(row => ({
                    month: row.month,
                    revenue: parseFloat(row.revenue),
                    orderCount: parseInt(row.order_count)
                })),
                productSales: productSalesResult.rows.map(row => ({
                    productType: row.product_type,
                    orderCount: parseInt(row.order_count),
                    totalRevenue: parseFloat(row.total_revenue),
                    totalQuantity: parseFloat(row.total_quantity)
                }))
            }
        });

    } catch (error) {
        console.error('Çiftçi dashboard hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Alıcı dashboard'u
const getBuyerDashboard = async (req, res, user) => {
    try {
        const userId = user.id;

        // Genel istatistikler
        const statsResult = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM offers WHERE buyer_id = $1) as total_offers,
                (SELECT COUNT(*) FROM offers WHERE buyer_id = $1 AND status = 'pending') as pending_offers,
                (SELECT COUNT(*) FROM offers WHERE buyer_id = $1 AND status = 'accepted') as accepted_offers,
                (SELECT COUNT(*) FROM orders WHERE buyer_id = $1) as total_orders,
                (SELECT COUNT(*) FROM orders WHERE buyer_id = $1 AND order_status = 'pending') as pending_orders,
                (SELECT COUNT(*) FROM orders WHERE buyer_id = $1 AND order_status = 'delivered') as delivered_orders,
                (SELECT COUNT(*) FROM ratings WHERE email = (SELECT email FROM users WHERE id = $1)) as total_ratings_given,
                COALESCE((SELECT SUM(total_price) FROM orders WHERE buyer_id = $1 AND payment_status = 'paid'), 0) as total_spent
        `, [userId]);

        const stats = statsResult.rows[0];

        // Son 7 günlük istatistikler
        const weeklyStatsResult = await pool.query(`
            SELECT 
                COUNT(CASE WHEN o.created_at >= NOW() - INTERVAL '7 days' THEN o.id END) as orders_this_week,
                COUNT(CASE WHEN off.created_at >= NOW() - INTERVAL '7 days' THEN off.id END) as offers_this_week,
                COALESCE(SUM(CASE WHEN o.created_at >= NOW() - INTERVAL '7 days' THEN o.total_price END), 0) as spent_this_week
            FROM users u
            LEFT JOIN offers off ON u.id = off.buyer_id
            LEFT JOIN orders o ON u.id = o.buyer_id
            WHERE u.id = $1
        `, [userId]);

        const weeklyStats = weeklyStatsResult.rows[0];

        // Son 5 teklif
        const recentOffersResult = await pool.query(
            `SELECT o.id, o.offer_price, o.message, o.status, o.created_at,
                    l.product_type, l.price as listing_price, u.first_name, u.last_name, u.username
             FROM offers o
             JOIN listings l ON o.listing_id = l.id
             JOIN users u ON l.farmer_id = u.id
             WHERE o.buyer_id = $1 
             ORDER BY o.created_at DESC 
             LIMIT 5`,
            [userId]
        );

        // Son 5 sipariş
        const recentOrdersResult = await pool.query(
            `SELECT o.id, o.quantity, o.total_price, o.payment_status, o.order_status, o.created_at,
                    l.product_type, u.first_name, u.last_name, u.username
             FROM orders o
             JOIN listings l ON o.listing_id = l.id
             JOIN users u ON l.farmer_id = u.id
             WHERE o.buyer_id = $1 
             ORDER BY o.created_at DESC 
             LIMIT 5`,
            [userId]
        );

        // Son 5 yıldız verdiği ürünler
        const recentRatingsResult = await pool.query(
            `SELECT r.id, r.rating, r.created_at,
                    l.product_type, u.first_name, u.last_name, u.username
             FROM ratings r
             JOIN listings l ON r.listing_id = l.id
             JOIN users u ON l.farmer_id = u.id
             WHERE r.email = (SELECT email FROM users WHERE id = $1)
             ORDER BY r.created_at DESC 
             LIMIT 5`,
            [userId]
        );

        // Aylık harcama grafiği (son 12 ay)
        const monthlySpendingResult = await pool.query(
            `SELECT 
                TO_CHAR(o.created_at, 'YYYY-MM') as month,
                COALESCE(SUM(o.total_price), 0) as spent,
                COUNT(o.id) as order_count
             FROM orders o
             WHERE o.buyer_id = $1 
                AND o.created_at >= NOW() - INTERVAL '12 months'
                AND o.payment_status = 'paid'
             GROUP BY TO_CHAR(o.created_at, 'YYYY-MM')
             ORDER BY month DESC`,
            [userId]
        );

        // En çok sipariş verdiği ürün türleri
        const favoriteProductsResult = await pool.query(
            `SELECT 
                l.product_type,
                COUNT(o.id) as order_count,
                COALESCE(SUM(o.total_price), 0) as total_spent,
                COALESCE(SUM(o.quantity), 0) as total_quantity
             FROM orders o
             JOIN listings l ON o.listing_id = l.id
             WHERE o.buyer_id = $1 AND o.payment_status = 'paid'
             GROUP BY l.product_type
             ORDER BY total_spent DESC`,
            [userId]
        );

        // En çok alışveriş yaptığı çiftçiler
        const favoriteFarmersResult = await pool.query(
            `SELECT 
                u.first_name, u.last_name, u.username,
                COUNT(o.id) as order_count,
                COALESCE(SUM(o.total_price), 0) as total_spent
             FROM orders o
             JOIN listings l ON o.listing_id = l.id
             JOIN users u ON l.farmer_id = u.id
             WHERE o.buyer_id = $1 AND o.payment_status = 'paid'
             GROUP BY u.id, u.first_name, u.last_name, u.username
             ORDER BY total_spent DESC
             LIMIT 5`,
            [userId]
        );

        res.json({
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                username: user.username,
                email: user.email,
                phone: user.phone,
                userType: user.user_type,
                memberSince: user.created_at
            },
            stats: {
                totalOffers: parseInt(stats.total_offers),
                pendingOffers: parseInt(stats.pending_offers),
                acceptedOffers: parseInt(stats.accepted_offers),
                totalOrders: parseInt(stats.total_orders),
                pendingOrders: parseInt(stats.pending_orders),
                deliveredOrders: parseInt(stats.delivered_orders),
                totalRatingsGiven: parseInt(stats.total_ratings_given),
                totalSpent: parseFloat(stats.total_spent) || 0
            },
            weeklyStats: {
                ordersThisWeek: parseInt(weeklyStats.orders_this_week),
                offersThisWeek: parseInt(weeklyStats.offers_this_week),
                spentThisWeek: parseFloat(weeklyStats.spent_this_week) || 0
            },
            recentActivity: {
                offers: recentOffersResult.rows.map(offer => ({
                    id: offer.id,
                    offerPrice: offer.offer_price,
                    message: offer.message,
                    status: offer.status,
                    productType: offer.product_type,
                    listingPrice: offer.listing_price,
                    farmerName: `${offer.first_name} ${offer.last_name}`,
                    farmerUsername: offer.username,
                    createdAt: offer.created_at
                })),
                orders: recentOrdersResult.rows.map(order => ({
                    id: order.id,
                    quantity: order.quantity,
                    totalPrice: order.total_price,
                    paymentStatus: order.payment_status,
                    orderStatus: order.order_status,
                    productType: order.product_type,
                    farmerName: `${order.first_name} ${order.last_name}`,
                    farmerUsername: order.username,
                    createdAt: order.created_at
                })),
                ratings: recentRatingsResult.rows.map(rating => ({
                    id: rating.id,
                    rating: rating.rating,
                    productType: rating.product_type,
                    farmerName: `${rating.first_name} ${rating.last_name}`,
                    farmerUsername: rating.username,
                    createdAt: rating.created_at
                }))
            },
            analytics: {
                monthlySpending: monthlySpendingResult.rows.map(row => ({
                    month: row.month,
                    spent: parseFloat(row.spent),
                    orderCount: parseInt(row.order_count)
                })),
                favoriteProducts: favoriteProductsResult.rows.map(row => ({
                    productType: row.product_type,
                    orderCount: parseInt(row.order_count),
                    totalSpent: parseFloat(row.total_spent),
                    totalQuantity: parseFloat(row.total_quantity)
                })),
                favoriteFarmers: favoriteFarmersResult.rows.map(row => ({
                    farmerName: `${row.first_name} ${row.last_name}`,
                    farmerUsername: row.username,
                    orderCount: parseInt(row.order_count),
                    totalSpent: parseFloat(row.total_spent)
                }))
            }
        });

    } catch (error) {
        console.error('Alıcı dashboard hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

module.exports = {
    getDashboard
};
