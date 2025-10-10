const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../config/database');

// Dosya yükleme ayarları - birden fazla resim için
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = 'uploads/listings';
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

// Dosya filtresi - sadece resimler
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Sadece resim dosyalarına izin verilir'), false);
    }
};

// Multer konfigürasyonu - birden fazla dosya için
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit per file
        files: 10 // maksimum 10 dosya
    },
    fileFilter: fileFilter
});

// İlan ekleme
const addListing = async (req, res) => {
    try {
        const {
            productType,
            quantity,
            unit,
            price,
            harvestDate,
            description,
            location,
            contactInfo,
            isActive
        } = req.body;
        const farmerId = req.user.userId;

        // Gerekli alanları kontrol et
        if (!productType || !quantity || !unit || !price || !harvestDate) {
            return res.status(400).json({
                error: 'Ürün türü, miktar, birim, fiyat ve hasat tarihi zorunludur'
            });
        }

        // Sayısal değerleri kontrol et
        const quantityNum = parseFloat(quantity);
        const priceNum = parseFloat(price);
        
        if (isNaN(quantityNum) || quantityNum <= 0) {
            return res.status(400).json({
                error: 'Miktar geçerli bir pozitif sayı olmalıdır'
            });
        }

        if (isNaN(priceNum) || priceNum <= 0) {
            return res.status(400).json({
                error: 'Fiyat geçerli bir pozitif sayı olmalıdır'
            });
        }

        // Kullanıcının çiftçi olduğunu kontrol et
        const userResult = await pool.query(
            'SELECT user_type FROM users WHERE id = $1',
            [farmerId]
        );

        if (userResult.rows.length === 0 || userResult.rows[0].user_type !== 'farmer') {
            return res.status(403).json({
                error: 'Sadece çiftçiler ilan ekleyebilir'
            });
        }

        // Dosya bilgilerini hazırla
        let imagesInfo = [];
        if (req.files && req.files.length > 0) {
            imagesInfo = req.files.map(file => ({
                filename: file.filename,
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path
            }));
        }

        // İlanı veritabanına kaydet
        const result = await pool.query(
            `INSERT INTO listings (
                farmer_id, product_type, quantity, unit, price, harvest_date, 
                description, location, contact_info, is_active, images_info, 
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id, product_type, quantity, unit, price, harvest_date, 
                     description, location, contact_info, is_active, images_info, created_at`,
            [
                farmerId, productType, quantityNum, unit, priceNum, harvestDate,
                description, location, contactInfo, isActive !== undefined ? isActive : true,
                JSON.stringify(imagesInfo)
            ]
        );

        const newListing = result.rows[0];

        res.status(201).json({
            message: 'İlan başarıyla eklendi',
            listing: {
                id: newListing.id,
                productType: newListing.product_type,
                quantity: newListing.quantity,
                unit: newListing.unit,
                price: newListing.price,
                harvestDate: newListing.harvest_date,
                description: newListing.description,
                location: newListing.location,
                contactInfo: newListing.contact_info,
                isActive: newListing.is_active,
                imagesInfo: typeof newListing.images_info === 'string' ? JSON.parse(newListing.images_info) : newListing.images_info,
                createdAt: newListing.created_at
            }
        });

    } catch (error) {
        console.error('İlan ekleme hatası:', error);
        
        // Dosyalar yüklendiyse sil
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    await fs.unlink(file.path);
                } catch (unlinkError) {
                    console.error('Dosya silme hatası:', unlinkError);
                }
            }
        }

        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Tüm ilanları listele (herkese açık)
const getAllListings = async (req, res) => {
    try {
        const { 
            productType, 
            minPrice, 
            maxPrice, 
            location, 
            isActive, 
            sortBy = 'created_at', 
            sortOrder = 'DESC',
            page = 1, 
            limit = 10 
        } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT l.*, u.first_name, u.last_name, u.username
            FROM listings l
            JOIN users u ON l.farmer_id = u.id
            WHERE u.is_active = true
        `;
        const queryParams = [];
        let paramCount = 0;

        // Filtreleme
        if (productType) {
            paramCount++;
            query += ` AND l.product_type ILIKE $${paramCount}`;
            queryParams.push(`%${productType}%`);
        }

        if (minPrice) {
            paramCount++;
            query += ` AND l.price >= $${paramCount}`;
            queryParams.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            paramCount++;
            query += ` AND l.price <= $${paramCount}`;
            queryParams.push(parseFloat(maxPrice));
        }

        if (location) {
            paramCount++;
            query += ` AND l.location ILIKE $${paramCount}`;
            queryParams.push(`%${location}%`);
        }

        if (isActive !== undefined) {
            paramCount++;
            query += ` AND l.is_active = $${paramCount}`;
            queryParams.push(isActive === 'true');
        }

        // Sıralama ve sayfalama
        const allowedSortFields = ['created_at', 'price', 'harvest_date', 'product_type'];
        const allowedSortOrders = ['ASC', 'DESC'];
        
        const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortDirection = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
        
        query += ` ORDER BY l.${sortField} ${sortDirection} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        queryParams.push(parseInt(limit), offset);

        const result = await pool.query(query, queryParams);

        // Toplam sayıyı al
        let countQuery = `
            SELECT COUNT(*) as total
            FROM listings l
            JOIN users u ON l.farmer_id = u.id
            WHERE u.is_active = true
        `;
        const countParams = [];
        let countParamCount = 0;

        if (productType) {
            countParamCount++;
            countQuery += ` AND l.product_type ILIKE $${countParamCount}`;
            countParams.push(`%${productType}%`);
        }

        if (minPrice) {
            countParamCount++;
            countQuery += ` AND l.price >= $${countParamCount}`;
            countParams.push(parseFloat(minPrice));
        }

        if (maxPrice) {
            countParamCount++;
            countQuery += ` AND l.price <= $${countParamCount}`;
            countParams.push(parseFloat(maxPrice));
        }

        if (location) {
            countParamCount++;
            countQuery += ` AND l.location ILIKE $${countParamCount}`;
            countParams.push(`%${location}%`);
        }

        if (isActive !== undefined) {
            countParamCount++;
            countQuery += ` AND l.is_active = $${countParamCount}`;
            countParams.push(isActive === 'true');
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        const listings = result.rows.map(row => ({
            id: row.id,
            productType: row.product_type,
            quantity: row.quantity,
            unit: row.unit,
            price: row.price,
            harvestDate: row.harvest_date,
            description: row.description,
            location: row.location,
            contactInfo: row.contact_info,
            isActive: row.is_active,
            imagesInfo: typeof row.images_info === 'string' ? JSON.parse(row.images_info) : row.images_info,
            farmer: {
                firstName: row.first_name,
                lastName: row.last_name,
                username: row.username
            },
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        res.json({
            listings,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            },
            filters: {
                productType,
                minPrice,
                maxPrice,
                location,
                isActive
            },
            sorting: {
                sortBy: sortField,
                sortOrder: sortDirection
            }
        });

    } catch (error) {
        console.error('İlan listeleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Çiftçinin ilanlarını listele
const getMyListings = async (req, res) => {
    try {
        const farmerId = req.user.userId;
        const { isActive, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT * FROM listings 
            WHERE farmer_id = $1
        `;
        const queryParams = [farmerId];
        let paramCount = 1;

        // Aktif/Pasif filtresi (opsiyonel - eğer belirtilirse filtrele)
        if (isActive !== undefined) {
            paramCount++;
            query += ` AND is_active = $${paramCount}`;
            queryParams.push(isActive === 'true');
        }

        // Sıralama ve sayfalama
        query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        queryParams.push(parseInt(limit), offset);

        const result = await pool.query(query, queryParams);

        // Toplam sayıyı al
        let countQuery = `
            SELECT COUNT(*) as total
            FROM listings 
            WHERE farmer_id = $1
        `;
        const countParams = [farmerId];
        let countParamCount = 1;

        // Aktif/Pasif filtresi (opsiyonel - eğer belirtilirse filtrele)
        if (isActive !== undefined) {
            countParamCount++;
            countQuery += ` AND is_active = $${countParamCount}`;
            countParams.push(isActive === 'true');
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        const listings = result.rows.map(row => ({
            id: row.id,
            productType: row.product_type,
            quantity: row.quantity,
            unit: row.unit,
            price: row.price,
            harvestDate: row.harvest_date,
            description: row.description,
            location: row.location,
            contactInfo: row.contact_info,
            isActive: row.is_active,
            imagesInfo: typeof row.images_info === 'string' ? JSON.parse(row.images_info) : row.images_info,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        res.json({
            listings,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('İlan listeleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Tek ilan detayı
const getListingById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Parametre doğrulama: id sayısal olmalı
        const idNum = parseInt(id, 10);
        if (!Number.isInteger(idNum) || idNum <= 0) {
            return res.status(400).json({ error: 'Geçersiz ilan ID' });
        }

        const result = await pool.query(
            `SELECT l.*, u.first_name, u.last_name, u.username, u.phone
             FROM listings l
             JOIN users u ON l.farmer_id = u.id
             WHERE l.id = $1 AND u.is_active = true`,
            [idNum]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'İlan bulunamadı'
            });
        }

        const listing = result.rows[0];

        res.json({
            id: listing.id,
            productType: listing.product_type,
            quantity: listing.quantity,
            unit: listing.unit,
            price: listing.price,
            harvestDate: listing.harvest_date,
            description: listing.description,
            location: listing.location,
            contactInfo: listing.contact_info,
            isActive: listing.is_active,
            imagesInfo: typeof listing.images_info === 'string' ? JSON.parse(listing.images_info) : listing.images_info,
            farmer: {
                firstName: listing.first_name,
                lastName: listing.last_name,
                username: listing.username,
                phone: listing.phone
            },
            createdAt: listing.created_at,
            updatedAt: listing.updated_at
        });

    } catch (error) {
        console.error('İlan detay hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// İlan güncelleme
const updateListing = async (req, res) => {
    try {
        const { id } = req.params;
        const farmerId = req.user.userId;
        const {
            productType,
            quantity,
            unit,
            price,
            harvestDate,
            description,
            location,
            contactInfo,
            isActive
        } = req.body;

        // İlanın çiftçiye ait olup olmadığını kontrol et
        const listingResult = await pool.query(
            'SELECT * FROM listings WHERE id = $1 AND farmer_id = $2',
            [id, farmerId]
        );

        if (listingResult.rows.length === 0) {
            return res.status(404).json({
                error: 'İlan bulunamadı veya bu ilanı güncelleme yetkiniz yok'
            });
        }

        const listing = listingResult.rows[0];

        // Güncellenecek alanları belirle
        const updateFields = [];
        const updateValues = [];
        let paramCount = 0;

        if (productType !== undefined) {
            paramCount++;
            updateFields.push(`product_type = $${paramCount}`);
            updateValues.push(productType);
        }

        if (quantity !== undefined) {
            const quantityNum = parseFloat(quantity);
            if (isNaN(quantityNum) || quantityNum <= 0) {
                return res.status(400).json({
                    error: 'Miktar geçerli bir pozitif sayı olmalıdır'
                });
            }
            paramCount++;
            updateFields.push(`quantity = $${paramCount}`);
            updateValues.push(quantityNum);
        }

        if (unit !== undefined) {
            paramCount++;
            updateFields.push(`unit = $${paramCount}`);
            updateValues.push(unit);
        }

        if (price !== undefined) {
            const priceNum = parseFloat(price);
            if (isNaN(priceNum) || priceNum <= 0) {
                return res.status(400).json({
                    error: 'Fiyat geçerli bir pozitif sayı olmalıdır'
                });
            }
            paramCount++;
            updateFields.push(`price = $${paramCount}`);
            updateValues.push(priceNum);
        }

        if (harvestDate !== undefined) {
            paramCount++;
            updateFields.push(`harvest_date = $${paramCount}`);
            updateValues.push(harvestDate);
        }

        if (description !== undefined) {
            paramCount++;
            updateFields.push(`description = $${paramCount}`);
            updateValues.push(description);
        }

        if (location !== undefined) {
            paramCount++;
            updateFields.push(`location = $${paramCount}`);
            updateValues.push(location);
        }

        if (contactInfo !== undefined) {
            paramCount++;
            updateFields.push(`contact_info = $${paramCount}`);
            updateValues.push(contactInfo);
        }

        if (isActive !== undefined) {
            paramCount++;
            updateFields.push(`is_active = $${paramCount}`);
            updateValues.push(isActive);
        }

        // Yeni resimler yüklendiyse
        if (req.files && req.files.length > 0) {
            paramCount++;
            updateFields.push(`images_info = $${paramCount}`);
            
            const imagesInfo = req.files.map(file => ({
                filename: file.filename,
                originalName: file.originalname,
                mimetype: file.mimetype,
                size: file.size,
                path: file.path
            }));
            updateValues.push(JSON.stringify(imagesInfo));

            // Eski resimleri sil
            if (listing.images_info) {
                try {
                    const oldImagesInfo = typeof listing.images_info === 'string' ? JSON.parse(listing.images_info) : listing.images_info;
                    for (const image of oldImagesInfo) {
                        await fs.unlink(image.path);
                    }
                } catch (unlinkError) {
                    console.error('Eski resim silme hatası:', unlinkError);
                }
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                error: 'Güncellenecek alan bulunamadı'
            });
        }

        paramCount++;
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(id);

        const updateQuery = `
            UPDATE listings 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(updateQuery, updateValues);

        res.json({
            message: 'İlan başarıyla güncellendi',
            listing: {
                id: result.rows[0].id,
                productType: result.rows[0].product_type,
                quantity: result.rows[0].quantity,
                unit: result.rows[0].unit,
                price: result.rows[0].price,
                harvestDate: result.rows[0].harvest_date,
                description: result.rows[0].description,
                location: result.rows[0].location,
                contactInfo: result.rows[0].contact_info,
                isActive: result.rows[0].is_active,
                imagesInfo: typeof result.rows[0].images_info === 'string' ? JSON.parse(result.rows[0].images_info) : result.rows[0].images_info,
                createdAt: result.rows[0].created_at,
                updatedAt: result.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('İlan güncelleme hatası:', error);
        
        // Yeni dosyalar yüklendiyse sil
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    await fs.unlink(file.path);
                } catch (unlinkError) {
                    console.error('Dosya silme hatası:', unlinkError);
                }
            }
        }

        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// İlan silme
const deleteListing = async (req, res) => {
    try {
        const { id } = req.params;
        const farmerId = req.user.userId;

        // İlanın çiftçiye ait olup olmadığını kontrol et
        const listingResult = await pool.query(
            'SELECT images_info FROM listings WHERE id = $1 AND farmer_id = $2',
            [id, farmerId]
        );

        if (listingResult.rows.length === 0) {
            return res.status(404).json({
                error: 'İlan bulunamadı veya bu ilanı silme yetkiniz yok'
            });
        }

        const listing = listingResult.rows[0];

        // Resimleri sil
        if (listing.images_info) {
            try {
                const imagesInfo = typeof listing.images_info === 'string' ? JSON.parse(listing.images_info) : listing.images_info;
                for (const image of imagesInfo) {
                    await fs.unlink(image.path);
                }
            } catch (unlinkError) {
                console.error('Resim silme hatası:', unlinkError);
            }
        }

        // İlanı veritabanından sil
        await pool.query('DELETE FROM listings WHERE id = $1', [id]);

        res.json({
            message: 'İlan başarıyla silindi'
        });

    } catch (error) {
        console.error('İlan silme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Resim indirme
const downloadImage = async (req, res) => {
    try {
        const { listingId, imageIndex } = req.params;

        const result = await pool.query(
            'SELECT images_info FROM listings WHERE id = $1',
            [listingId]
        );

        if (result.rows.length === 0 || !result.rows[0].images_info) {
            return res.status(404).json({
                error: 'İlan veya resim bulunamadı'
            });
        }

        const imagesInfo = typeof result.rows[0].images_info === 'string' ? 
            JSON.parse(result.rows[0].images_info) : result.rows[0].images_info;

        const imageIndexNum = parseInt(imageIndex);
        if (isNaN(imageIndexNum) || imageIndexNum < 0 || imageIndexNum >= imagesInfo.length) {
            return res.status(400).json({
                error: 'Geçersiz resim indeksi'
            });
        }

        const imageInfo = imagesInfo[imageIndexNum];

        // Dosya var mı kontrol et
        try {
            await fs.access(imageInfo.path);
        } catch (error) {
            return res.status(404).json({
                error: 'Resim dosyası sistemde bulunamadı'
            });
        }

        res.download(imageInfo.path, imageInfo.originalName);

    } catch (error) {
        console.error('Resim indirme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Filtreleme seçeneklerini al
const getFilterOptions = async (req, res) => {
    try {
        // Ürün türleri
        const productTypesResult = await pool.query(
            `SELECT DISTINCT product_type, COUNT(*) as count
             FROM listings l
             JOIN users u ON l.farmer_id = u.id
             WHERE u.is_active = true AND l.is_active = true
             GROUP BY product_type
             ORDER BY product_type`
        );

        // Konumlar
        const locationsResult = await pool.query(
            `SELECT DISTINCT location, COUNT(*) as count
             FROM listings l
             JOIN users u ON l.farmer_id = u.id
             WHERE u.is_active = true AND l.is_active = true AND location IS NOT NULL
             GROUP BY location
             ORDER BY location`
        );

        // Fiyat aralığı
        const priceRangeResult = await pool.query(
            `SELECT MIN(price) as min_price, MAX(price) as max_price
             FROM listings l
             JOIN users u ON l.farmer_id = u.id
             WHERE u.is_active = true AND l.is_active = true`
        );

        const productTypes = productTypesResult.rows.map(row => ({
            value: row.product_type,
            label: row.product_type,
            count: parseInt(row.count)
        }));

        const locations = locationsResult.rows.map(row => ({
            value: row.location,
            label: row.location,
            count: parseInt(row.count)
        }));

        const priceRange = priceRangeResult.rows[0] ? {
            min: parseFloat(priceRangeResult.rows[0].min_price) || 0,
            max: parseFloat(priceRangeResult.rows[0].max_price) || 0
        } : { min: 0, max: 0 };

        res.json({
            productTypes,
            locations,
            priceRange
        });

    } catch (error) {
        console.error('Filtreleme seçenekleri hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

module.exports = {
    upload,
    addListing,
    getAllListings,
    getMyListings,
    getListingById,
    updateListing,
    deleteListing,
    downloadImage,
    getFilterOptions
};
