const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../config/database');

// Dosya yükleme ayarları - birden fazla resim için
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = 'uploads/farms';
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

// Çiftlik ekleme
const addFarm = async (req, res) => {
    try {
        const {
            farmName,
            description,
            location,
            area,
            areaUnit,
            contactInfo,
            additionalInfo
        } = req.body;
        const farmerId = req.user.userId;

        // Gerekli alanları kontrol et
        if (!farmName || !description || !location || !area || !areaUnit) {
            return res.status(400).json({
                error: 'Çiftlik adı, açıklama, konum, alan ve alan birimi zorunludur'
            });
        }

        // Alan değerinin sayısal olup olmadığını kontrol et
        const areaNum = parseFloat(area);
        if (isNaN(areaNum) || areaNum <= 0) {
            return res.status(400).json({
                error: 'Alan değeri geçerli bir pozitif sayı olmalıdır'
            });
        }

        // Kullanıcının çiftçi olduğunu kontrol et
        const userResult = await pool.query(
            'SELECT user_type FROM users WHERE id = $1',
            [farmerId]
        );

        if (userResult.rows.length === 0 || userResult.rows[0].user_type !== 'farmer') {
            return res.status(403).json({
                error: 'Sadece çiftçiler çiftlik ekleyebilir'
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

        // Çiftliği veritabanına kaydet
        const result = await pool.query(
            `INSERT INTO farms (
                farmer_id, farm_name, description, location, area, area_unit, 
                contact_info, additional_info, images_info, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id, farm_name, description, location, area, area_unit, 
                     contact_info, additional_info, images_info, created_at`,
            [
                farmerId, farmName, description, location, areaNum, areaUnit,
                contactInfo, additionalInfo, JSON.stringify(imagesInfo)
            ]
        );

        const newFarm = result.rows[0];

        res.status(201).json({
            message: 'Çiftlik başarıyla eklendi',
            farm: {
                id: newFarm.id,
                farmName: newFarm.farm_name,
                description: newFarm.description,
                location: newFarm.location,
                area: newFarm.area,
                areaUnit: newFarm.area_unit,
                contactInfo: newFarm.contact_info,
                additionalInfo: newFarm.additional_info,
                imagesInfo: typeof newFarm.images_info === 'string' ? JSON.parse(newFarm.images_info) : newFarm.images_info,
                createdAt: newFarm.created_at
            }
        });

    } catch (error) {
        console.error('Çiftlik ekleme hatası:', error);
        
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

// Çiftçinin çiftliklerini listele
const getMyFarms = async (req, res) => {
    try {
        const farmerId = req.user.userId;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const result = await pool.query(
            `SELECT * FROM farms 
             WHERE farmer_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2 OFFSET $3`,
            [farmerId, parseInt(limit), offset]
        );

        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM farms WHERE farmer_id = $1',
            [farmerId]
        );

        const total = parseInt(countResult.rows[0].total);

        const farms = result.rows.map(row => ({
            id: row.id,
            farmName: row.farm_name,
            description: row.description,
            location: row.location,
            area: row.area,
            areaUnit: row.area_unit,
            contactInfo: row.contact_info,
            additionalInfo: row.additional_info,
            imagesInfo: typeof row.images_info === 'string' ? JSON.parse(row.images_info) : row.images_info,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        res.json({
            farms,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Çiftlik listeleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Tüm çiftlikleri listele (herkese açık)
const getAllFarms = async (req, res) => {
    try {
        const { location, areaMin, areaMax, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT f.*, u.first_name, u.last_name, u.username
            FROM farms f
            JOIN users u ON f.farmer_id = u.id
            WHERE u.is_active = true
        `;
        const queryParams = [];
        let paramCount = 0;

        // Filtreleme
        if (location) {
            paramCount++;
            query += ` AND f.location ILIKE $${paramCount}`;
            queryParams.push(`%${location}%`);
        }

        if (areaMin) {
            paramCount++;
            query += ` AND f.area >= $${paramCount}`;
            queryParams.push(parseFloat(areaMin));
        }

        if (areaMax) {
            paramCount++;
            query += ` AND f.area <= $${paramCount}`;
            queryParams.push(parseFloat(areaMax));
        }

        // Sıralama ve sayfalama
        query += ` ORDER BY f.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        queryParams.push(parseInt(limit), offset);

        const result = await pool.query(query, queryParams);

        // Toplam sayıyı al
        let countQuery = `
            SELECT COUNT(*) as total
            FROM farms f
            JOIN users u ON f.farmer_id = u.id
            WHERE u.is_active = true
        `;
        const countParams = [];
        let countParamCount = 0;

        if (location) {
            countParamCount++;
            countQuery += ` AND f.location ILIKE $${countParamCount}`;
            countParams.push(`%${location}%`);
        }

        if (areaMin) {
            countParamCount++;
            countQuery += ` AND f.area >= $${countParamCount}`;
            countParams.push(parseFloat(areaMin));
        }

        if (areaMax) {
            countParamCount++;
            countQuery += ` AND f.area <= $${countParamCount}`;
            countParams.push(parseFloat(areaMax));
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        const farms = result.rows.map(row => ({
            id: row.id,
            farmName: row.farm_name,
            description: row.description,
            location: row.location,
            area: row.area,
            areaUnit: row.area_unit,
            contactInfo: row.contact_info,
            additionalInfo: row.additional_info,
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
            farms,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Çiftlik listeleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Tek çiftlik detayı
const getFarmById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT f.*, u.first_name, u.last_name, u.username, u.phone
             FROM farms f
             JOIN users u ON f.farmer_id = u.id
             WHERE f.id = $1 AND u.is_active = true`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Çiftlik bulunamadı'
            });
        }

        const farm = result.rows[0];

        res.json({
            id: farm.id,
            farmName: farm.farm_name,
            description: farm.description,
            location: farm.location,
            area: farm.area,
            areaUnit: farm.area_unit,
            contactInfo: farm.contact_info,
            additionalInfo: farm.additional_info,
            imagesInfo: typeof farm.images_info === 'string' ? JSON.parse(farm.images_info) : farm.images_info,
            farmer: {
                firstName: farm.first_name,
                lastName: farm.last_name,
                username: farm.username,
                phone: farm.phone
            },
            createdAt: farm.created_at,
            updatedAt: farm.updated_at
        });

    } catch (error) {
        console.error('Çiftlik detay hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Çiftlik güncelleme
const updateFarm = async (req, res) => {
    try {
        const { id } = req.params;
        const farmerId = req.user.userId;
        const {
            farmName,
            description,
            location,
            area,
            areaUnit,
            contactInfo,
            additionalInfo
        } = req.body;

        // Çiftliğin çiftçiye ait olup olmadığını kontrol et
        const farmResult = await pool.query(
            'SELECT * FROM farms WHERE id = $1 AND farmer_id = $2',
            [id, farmerId]
        );

        if (farmResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Çiftlik bulunamadı veya bu çiftliği güncelleme yetkiniz yok'
            });
        }

        const farm = farmResult.rows[0];

        // Güncellenecek alanları belirle
        const updateFields = [];
        const updateValues = [];
        let paramCount = 0;

        if (farmName !== undefined) {
            paramCount++;
            updateFields.push(`farm_name = $${paramCount}`);
            updateValues.push(farmName);
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

        if (area !== undefined) {
            const areaNum = parseFloat(area);
            if (isNaN(areaNum) || areaNum <= 0) {
                return res.status(400).json({
                    error: 'Alan değeri geçerli bir pozitif sayı olmalıdır'
                });
            }
            paramCount++;
            updateFields.push(`area = $${paramCount}`);
            updateValues.push(areaNum);
        }

        if (areaUnit !== undefined) {
            paramCount++;
            updateFields.push(`area_unit = $${paramCount}`);
            updateValues.push(areaUnit);
        }

        if (contactInfo !== undefined) {
            paramCount++;
            updateFields.push(`contact_info = $${paramCount}`);
            updateValues.push(contactInfo);
        }

        if (additionalInfo !== undefined) {
            paramCount++;
            updateFields.push(`additional_info = $${paramCount}`);
            updateValues.push(additionalInfo);
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
            if (farm.images_info) {
                try {
                    const oldImagesInfo = typeof farm.images_info === 'string' ? JSON.parse(farm.images_info) : farm.images_info;
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
            UPDATE farms 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(updateQuery, updateValues);

        res.json({
            message: 'Çiftlik başarıyla güncellendi',
            farm: {
                id: result.rows[0].id,
                farmName: result.rows[0].farm_name,
                description: result.rows[0].description,
                location: result.rows[0].location,
                area: result.rows[0].area,
                areaUnit: result.rows[0].area_unit,
                contactInfo: result.rows[0].contact_info,
                additionalInfo: result.rows[0].additional_info,
                imagesInfo: typeof result.rows[0].images_info === 'string' ? JSON.parse(result.rows[0].images_info) : result.rows[0].images_info,
                createdAt: result.rows[0].created_at,
                updatedAt: result.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('Çiftlik güncelleme hatası:', error);
        
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

// Çiftlik silme
const deleteFarm = async (req, res) => {
    try {
        const { id } = req.params;
        const farmerId = req.user.userId;

        // Çiftliğin çiftçiye ait olup olmadığını kontrol et
        const farmResult = await pool.query(
            'SELECT images_info FROM farms WHERE id = $1 AND farmer_id = $2',
            [id, farmerId]
        );

        if (farmResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Çiftlik bulunamadı veya bu çiftliği silme yetkiniz yok'
            });
        }

        const farm = farmResult.rows[0];

        // Resimleri sil
        if (farm.images_info) {
            try {
                const imagesInfo = typeof farm.images_info === 'string' ? JSON.parse(farm.images_info) : farm.images_info;
                for (const image of imagesInfo) {
                    await fs.unlink(image.path);
                }
            } catch (unlinkError) {
                console.error('Resim silme hatası:', unlinkError);
            }
        }

        // Çiftliği veritabanından sil
        await pool.query('DELETE FROM farms WHERE id = $1', [id]);

        res.json({
            message: 'Çiftlik başarıyla silindi'
        });

    } catch (error) {
        console.error('Çiftlik silme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Resim indirme
const downloadImage = async (req, res) => {
    try {
        const { farmId, imageIndex } = req.params;

        const result = await pool.query(
            'SELECT images_info FROM farms WHERE id = $1',
            [farmId]
        );

        if (result.rows.length === 0 || !result.rows[0].images_info) {
            return res.status(404).json({
                error: 'Çiftlik veya resim bulunamadı'
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

module.exports = {
    upload,
    addFarm,
    getMyFarms,
    getAllFarms,
    getFarmById,
    updateFarm,
    deleteFarm,
    downloadImage
};
