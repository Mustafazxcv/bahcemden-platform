const { pool } = require('../config/database');

// Çiftçi arama (herkese açık)
const searchFarmers = async (req, res) => {
    try {
        const { 
            search, 
            location, 
            productType, 
            minRating, 
            page = 1, 
            limit = 10 
        } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT DISTINCT u.id, u.first_name, u.last_name, u.username, u.phone, u.email,
                   u.created_at as farmer_since,
                   COALESCE(farm_stats.farm_count, 0) as farm_count,
                   COALESCE(listing_stats.listing_count, 0) as listing_count,
                   COALESCE(rating_stats.average_rating, 0) as average_rating,
                   COALESCE(rating_stats.total_ratings, 0) as total_ratings
            FROM users u
            LEFT JOIN (
                SELECT farmer_id, COUNT(*) as farm_count
                FROM farms
                GROUP BY farmer_id
            ) farm_stats ON u.id = farm_stats.farmer_id
            LEFT JOIN (
                SELECT farmer_id, COUNT(*) as listing_count
                FROM listings
                WHERE is_active = true
                GROUP BY farmer_id
            ) listing_stats ON u.id = listing_stats.farmer_id
            LEFT JOIN (
                SELECT l.farmer_id, 
                       AVG(r.rating) as average_rating,
                       COUNT(r.id) as total_ratings
                FROM listings l
                LEFT JOIN ratings r ON l.id = r.listing_id
                WHERE l.is_active = true
                GROUP BY l.farmer_id
            ) rating_stats ON u.id = rating_stats.farmer_id
            WHERE u.user_type = 'farmer' AND u.is_active = true
        `;
        
        const queryParams = [];
        let paramCount = 0;

        // Arama filtresi (isim, kullanıcı adı, e-posta)
        if (search) {
            paramCount++;
            query += ` AND (
                u.first_name ILIKE $${paramCount} OR 
                u.last_name ILIKE $${paramCount} OR 
                u.username ILIKE $${paramCount} OR 
                u.email ILIKE $${paramCount}
            )`;
            queryParams.push(`%${search}%`);
        }

        // Konum filtresi (çiftliklerden)
        if (location) {
            paramCount++;
            query += ` AND EXISTS (
                SELECT 1 FROM farms f 
                WHERE f.farmer_id = u.id AND f.location ILIKE $${paramCount}
            )`;
            queryParams.push(`%${location}%`);
        }

        // Ürün türü filtresi (ilanlardan)
        if (productType) {
            paramCount++;
            query += ` AND EXISTS (
                SELECT 1 FROM listings l 
                WHERE l.farmer_id = u.id AND l.is_active = true AND l.product_type ILIKE $${paramCount}
            )`;
            queryParams.push(`%${productType}%`);
        }

        // Minimum puan filtresi
        if (minRating) {
            paramCount++;
            query += ` AND COALESCE(rating_stats.average_rating, 0) >= $${paramCount}`;
            queryParams.push(parseFloat(minRating));
        }

        // Sıralama ve sayfalama
        query += ` ORDER BY COALESCE(rating_stats.average_rating, 0) DESC, u.created_at DESC 
                   LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        queryParams.push(parseInt(limit), offset);

        const result = await pool.query(query, queryParams);

        // Toplam sayıyı al
        let countQuery = `
            SELECT COUNT(DISTINCT u.id) as total
            FROM users u
            WHERE u.user_type = 'farmer' AND u.is_active = true
        `;
        const countParams = [];
        let countParamCount = 0;

        if (search) {
            countParamCount++;
            countQuery += ` AND (
                u.first_name ILIKE $${countParamCount} OR 
                u.last_name ILIKE $${countParamCount} OR 
                u.username ILIKE $${countParamCount} OR 
                u.email ILIKE $${countParamCount}
            )`;
            countParams.push(`%${search}%`);
        }

        if (location) {
            countParamCount++;
            countQuery += ` AND EXISTS (
                SELECT 1 FROM farms f 
                WHERE f.farmer_id = u.id AND f.location ILIKE $${countParamCount}
            )`;
            countParams.push(`%${location}%`);
        }

        if (productType) {
            countParamCount++;
            countQuery += ` AND EXISTS (
                SELECT 1 FROM listings l 
                WHERE l.farmer_id = u.id AND l.is_active = true AND l.product_type ILIKE $${countParamCount}
            )`;
            countParams.push(`%${productType}%`);
        }

        if (minRating) {
            countParamCount++;
            countQuery += ` AND EXISTS (
                SELECT 1 FROM listings l
                LEFT JOIN ratings r ON l.id = r.listing_id
                WHERE l.farmer_id = u.id AND l.is_active = true
                GROUP BY l.farmer_id
                HAVING AVG(r.rating) >= $${countParamCount}
            )`;
            countParams.push(parseFloat(minRating));
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        const farmers = result.rows.map(row => ({
            id: row.id,
            firstName: row.first_name,
            lastName: row.last_name,
            username: row.username,
            phone: row.phone,
            email: row.email,
            farmerSince: row.farmer_since,
            stats: {
                farmCount: parseInt(row.farm_count),
                listingCount: parseInt(row.listing_count),
                averageRating: parseFloat(row.average_rating) || 0,
                totalRatings: parseInt(row.total_ratings)
            }
        }));

        res.json({
            farmers,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            },
            filters: {
                search,
                location,
                productType,
                minRating
            }
        });

    } catch (error) {
        console.error('Çiftçi arama hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Çiftçi detayı (herkese açık)
const getFarmerById = async (req, res) => {
    try {
        const { farmerId } = req.params;

        // Çiftçi bilgilerini al
        const farmerResult = await pool.query(
            `SELECT u.id, u.first_name, u.last_name, u.username, u.phone, u.email,
                    u.created_at as farmer_since,
                    COALESCE(farm_stats.farm_count, 0) as farm_count,
                    COALESCE(listing_stats.listing_count, 0) as listing_count,
                    COALESCE(rating_stats.average_rating, 0) as average_rating,
                    COALESCE(rating_stats.total_ratings, 0) as total_ratings
             FROM users u
             LEFT JOIN (
                 SELECT farmer_id, COUNT(*) as farm_count
                 FROM farms
                 GROUP BY farmer_id
             ) farm_stats ON u.id = farm_stats.farmer_id
             LEFT JOIN (
                 SELECT farmer_id, COUNT(*) as listing_count
                 FROM listings
                 WHERE is_active = true
                 GROUP BY farmer_id
             ) listing_stats ON u.id = listing_stats.farmer_id
             LEFT JOIN (
                 SELECT l.farmer_id, 
                        AVG(r.rating) as average_rating,
                        COUNT(r.id) as total_ratings
                 FROM listings l
                 LEFT JOIN ratings r ON l.id = r.listing_id
                 WHERE l.is_active = true
                 GROUP BY l.farmer_id
             ) rating_stats ON u.id = rating_stats.farmer_id
             WHERE u.id = $1 AND u.user_type = 'farmer' AND u.is_active = true`,
            [farmerId]
        );

        if (farmerResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Çiftçi bulunamadı'
            });
        }

        const farmer = farmerResult.rows[0];

        // Çiftçinin çiftliklerini al
        const farmsResult = await pool.query(
            `SELECT id, farm_name, description, location, area, area_unit, 
                    contact_info, additional_info, images_info, created_at
             FROM farms 
             WHERE farmer_id = $1 
             ORDER BY created_at DESC`,
            [farmerId]
        );

        // Çiftçinin aktif ilanlarını al
        const listingsResult = await pool.query(
            `SELECT l.id, l.product_type, l.quantity, l.unit, l.price, 
                    l.harvest_date, l.description, l.location, l.contact_info,
                    l.images_info, l.created_at,
                    COALESCE(rating_stats.average_rating, 0) as average_rating,
                    COALESCE(rating_stats.total_ratings, 0) as total_ratings
             FROM listings l
             LEFT JOIN (
                 SELECT listing_id, 
                        AVG(rating) as average_rating,
                        COUNT(id) as total_ratings
                 FROM ratings
                 GROUP BY listing_id
             ) rating_stats ON l.id = rating_stats.listing_id
             WHERE l.farmer_id = $1 AND l.is_active = true
             ORDER BY l.created_at DESC`,
            [farmerId]
        );

        // Çiftçinin sertifikalarını al
        const certificatesResult = await pool.query(
            `SELECT id, certificate_name, file_info, created_at
             FROM certificates 
             WHERE farmer_id = $1 
             ORDER BY created_at DESC`,
            [farmerId]
        );

        const farmerData = {
            id: farmer.id,
            firstName: farmer.first_name,
            lastName: farmer.last_name,
            username: farmer.username,
            phone: farmer.phone,
            email: farmer.email,
            farmerSince: farmer.farmer_since,
            stats: {
                farmCount: parseInt(farmer.farm_count),
                listingCount: parseInt(farmer.listing_count),
                averageRating: parseFloat(farmer.average_rating) || 0,
                totalRatings: parseInt(farmer.total_ratings)
            },
            farms: farmsResult.rows.map(farm => ({
                id: farm.id,
                farmName: farm.farm_name,
                description: farm.description,
                location: farm.location,
                area: farm.area,
                areaUnit: farm.area_unit,
                contactInfo: farm.contact_info,
                additionalInfo: farm.additional_info,
                imagesInfo: typeof farm.images_info === 'string' ? JSON.parse(farm.images_info) : farm.images_info,
                createdAt: farm.created_at
            })),
            listings: listingsResult.rows.map(listing => ({
                id: listing.id,
                productType: listing.product_type,
                quantity: listing.quantity,
                unit: listing.unit,
                price: listing.price,
                harvestDate: listing.harvest_date,
                description: listing.description,
                location: listing.location,
                contactInfo: listing.contact_info,
                imagesInfo: typeof listing.images_info === 'string' ? JSON.parse(listing.images_info) : listing.images_info,
                createdAt: listing.created_at,
                rating: {
                    average: parseFloat(listing.average_rating) || 0,
                    total: parseInt(listing.total_ratings)
                }
            })),
            certificates: certificatesResult.rows.map(cert => ({
                id: cert.id,
                certificateName: cert.certificate_name,
                fileInfo: typeof cert.file_info === 'string' ? JSON.parse(cert.file_info) : cert.file_info,
                createdAt: cert.created_at
            }))
        };

        res.json(farmerData);

    } catch (error) {
        console.error('Çiftçi detay hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Çiftçi istatistikleri (herkese açık)
const getFarmerStats = async (req, res) => {
    try {
        const { farmerId } = req.params;

        // Çiftçinin genel istatistiklerini al
        const statsResult = await pool.query(
            `SELECT 
                COUNT(DISTINCT f.id) as total_farms,
                COUNT(DISTINCT l.id) as total_listings,
                COUNT(DISTINCT CASE WHEN l.is_active = true THEN l.id END) as active_listings,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(r.id) as total_ratings,
                MIN(r.rating) as min_rating,
                MAX(r.rating) as max_rating
             FROM users u
             LEFT JOIN farms f ON u.id = f.farmer_id
             LEFT JOIN listings l ON u.id = l.farmer_id
             LEFT JOIN ratings r ON l.id = r.listing_id
             WHERE u.id = $1 AND u.user_type = 'farmer' AND u.is_active = true`,
            [farmerId]
        );

        // Yıldız dağılımını al
        const distributionResult = await pool.query(
            `SELECT r.rating, COUNT(*) as count
             FROM listings l
             JOIN ratings r ON l.id = r.listing_id
             WHERE l.farmer_id = $1
             GROUP BY r.rating
             ORDER BY r.rating`,
            [farmerId]
        );

        // Son 30 günlük ilan istatistikleri
        const recentListingsResult = await pool.query(
            `SELECT COUNT(*) as recent_listings
             FROM listings
             WHERE farmer_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
            [farmerId]
        );

        const stats = statsResult.rows[0];
        const distribution = {};
        for (let i = 1; i <= 5; i++) {
            distribution[i] = 0;
        }
        distributionResult.rows.forEach(row => {
            distribution[row.rating] = parseInt(row.count);
        });

        res.json({
            farmerId: parseInt(farmerId),
            totalFarms: parseInt(stats.total_farms),
            totalListings: parseInt(stats.total_listings),
            activeListings: parseInt(stats.active_listings),
            recentListings: parseInt(recentListingsResult.rows[0].recent_listings),
            rating: {
                average: parseFloat(stats.average_rating) || 0,
                total: parseInt(stats.total_ratings),
                min: parseInt(stats.min_rating) || 0,
                max: parseInt(stats.max_rating) || 0,
                distribution
            }
        });

    } catch (error) {
        console.error('Çiftçi istatistik hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

module.exports = {
    searchFarmers,
    getFarmerById,
    getFarmerStats
};
