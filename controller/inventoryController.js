const { pool } = require('../config/database');

// Envanter ekleme
const addInventoryItem = async (req, res) => {
    try {
        const {
            itemName,
            category,
            quantity,
            unit,
            description,
            purchaseDate,
            expiryDate,
            cost,
            supplier
        } = req.body;
        const farmerId = req.user.userId;

        // Gerekli alanları kontrol et
        if (!itemName || !category || !quantity || !unit) {
            return res.status(400).json({
                error: 'Öğe adı, kategori, miktar ve birim zorunludur'
            });
        }

        // Miktar değerinin sayısal olup olmadığını kontrol et
        const quantityNum = parseFloat(quantity);
        if (isNaN(quantityNum) || quantityNum <= 0) {
            return res.status(400).json({
                error: 'Miktar geçerli bir pozitif sayı olmalıdır'
            });
        }

        // Maliyet değeri varsa kontrol et
        let costNum = null;
        if (cost) {
            costNum = parseFloat(cost);
            if (isNaN(costNum) || costNum < 0) {
                return res.status(400).json({
                    error: 'Maliyet geçerli bir pozitif sayı olmalıdır'
                });
            }
        }

        // Kullanıcının çiftçi olduğunu kontrol et
        const userResult = await pool.query(
            'SELECT user_type FROM users WHERE id = $1',
            [farmerId]
        );

        if (userResult.rows.length === 0 || userResult.rows[0].user_type !== 'farmer') {
            return res.status(403).json({
                error: 'Sadece çiftçiler envanter ekleyebilir'
            });
        }

        // Envanter öğesini veritabanına kaydet
        const result = await pool.query(
            `INSERT INTO inventory_items (
                farmer_id, item_name, category, quantity, unit, description, 
                purchase_date, expiry_date, cost, supplier, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id, item_name, category, quantity, unit, description, 
                     purchase_date, expiry_date, cost, supplier, created_at`,
            [
                farmerId, itemName, category, quantityNum, unit, description,
                purchaseDate, expiryDate, costNum, supplier
            ]
        );

        const newItem = result.rows[0];

        res.status(201).json({
            message: 'Envanter öğesi başarıyla eklendi',
            item: {
                id: newItem.id,
                itemName: newItem.item_name,
                category: newItem.category,
                quantity: newItem.quantity,
                unit: newItem.unit,
                description: newItem.description,
                purchaseDate: newItem.purchase_date,
                expiryDate: newItem.expiry_date,
                cost: newItem.cost,
                supplier: newItem.supplier,
                createdAt: newItem.created_at
            }
        });

    } catch (error) {
        console.error('Envanter ekleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Çiftçinin envanterini listele
const getMyInventory = async (req, res) => {
    try {
        const farmerId = req.user.userId;
        const { category, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT * FROM inventory_items 
            WHERE farmer_id = $1
        `;
        const queryParams = [farmerId];
        let paramCount = 1;

        // Kategori filtresi
        if (category) {
            paramCount++;
            query += ` AND category = $${paramCount}`;
            queryParams.push(category);
        }

        // Sıralama ve sayfalama
        query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        queryParams.push(parseInt(limit), offset);

        const result = await pool.query(query, queryParams);

        // Toplam sayıyı al
        let countQuery = `
            SELECT COUNT(*) as total
            FROM inventory_items 
            WHERE farmer_id = $1
        `;
        const countParams = [farmerId];
        let countParamCount = 1;

        if (category) {
            countParamCount++;
            countQuery += ` AND category = $${countParamCount}`;
            countParams.push(category);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        const items = result.rows.map(row => ({
            id: row.id,
            itemName: row.item_name,
            category: row.category,
            quantity: row.quantity,
            unit: row.unit,
            description: row.description,
            purchaseDate: row.purchase_date,
            expiryDate: row.expiry_date,
            cost: row.cost,
            supplier: row.supplier,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));

        res.json({
            items,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Envanter listeleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Kategorileri listele
const getCategories = async (req, res) => {
    try {
        const farmerId = req.user.userId;

        const result = await pool.query(
            `SELECT DISTINCT category, COUNT(*) as item_count
             FROM inventory_items 
             WHERE farmer_id = $1
             GROUP BY category
             ORDER BY category`,
            [farmerId]
        );

        const categories = result.rows.map(row => ({
            category: row.category,
            itemCount: parseInt(row.item_count)
        }));

        res.json({
            categories
        });

    } catch (error) {
        console.error('Kategori listeleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Tek envanter öğesi detayı
const getInventoryItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const farmerId = req.user.userId;

        const result = await pool.query(
            'SELECT * FROM inventory_items WHERE id = $1 AND farmer_id = $2',
            [id, farmerId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Envanter öğesi bulunamadı'
            });
        }

        const item = result.rows[0];

        res.json({
            id: item.id,
            itemName: item.item_name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            description: item.description,
            purchaseDate: item.purchase_date,
            expiryDate: item.expiry_date,
            cost: item.cost,
            supplier: item.supplier,
            createdAt: item.created_at,
            updatedAt: item.updated_at
        });

    } catch (error) {
        console.error('Envanter detay hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Envanter öğesi güncelleme
const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const farmerId = req.user.userId;
        const {
            itemName,
            category,
            quantity,
            unit,
            description,
            purchaseDate,
            expiryDate,
            cost,
            supplier
        } = req.body;

        // Envanter öğesinin çiftçiye ait olup olmadığını kontrol et
        const itemResult = await pool.query(
            'SELECT * FROM inventory_items WHERE id = $1 AND farmer_id = $2',
            [id, farmerId]
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Envanter öğesi bulunamadı veya bu öğeyi güncelleme yetkiniz yok'
            });
        }

        // Güncellenecek alanları belirle
        const updateFields = [];
        const updateValues = [];
        let paramCount = 0;

        if (itemName !== undefined) {
            paramCount++;
            updateFields.push(`item_name = $${paramCount}`);
            updateValues.push(itemName);
        }

        if (category !== undefined) {
            paramCount++;
            updateFields.push(`category = $${paramCount}`);
            updateValues.push(category);
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

        if (description !== undefined) {
            paramCount++;
            updateFields.push(`description = $${paramCount}`);
            updateValues.push(description);
        }

        if (purchaseDate !== undefined) {
            paramCount++;
            updateFields.push(`purchase_date = $${paramCount}`);
            updateValues.push(purchaseDate);
        }

        if (expiryDate !== undefined) {
            paramCount++;
            updateFields.push(`expiry_date = $${paramCount}`);
            updateValues.push(expiryDate);
        }

        if (cost !== undefined) {
            let costNum = null;
            if (cost !== null && cost !== '') {
                costNum = parseFloat(cost);
                if (isNaN(costNum) || costNum < 0) {
                    return res.status(400).json({
                        error: 'Maliyet geçerli bir pozitif sayı olmalıdır'
                    });
                }
            }
            paramCount++;
            updateFields.push(`cost = $${paramCount}`);
            updateValues.push(costNum);
        }

        if (supplier !== undefined) {
            paramCount++;
            updateFields.push(`supplier = $${paramCount}`);
            updateValues.push(supplier);
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
            UPDATE inventory_items 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(updateQuery, updateValues);

        res.json({
            message: 'Envanter öğesi başarıyla güncellendi',
            item: {
                id: result.rows[0].id,
                itemName: result.rows[0].item_name,
                category: result.rows[0].category,
                quantity: result.rows[0].quantity,
                unit: result.rows[0].unit,
                description: result.rows[0].description,
                purchaseDate: result.rows[0].purchase_date,
                expiryDate: result.rows[0].expiry_date,
                cost: result.rows[0].cost,
                supplier: result.rows[0].supplier,
                createdAt: result.rows[0].created_at,
                updatedAt: result.rows[0].updated_at
            }
        });

    } catch (error) {
        console.error('Envanter güncelleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Envanter öğesi silme
const deleteInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const farmerId = req.user.userId;

        // Envanter öğesinin çiftçiye ait olup olmadığını kontrol et
        const itemResult = await pool.query(
            'SELECT id FROM inventory_items WHERE id = $1 AND farmer_id = $2',
            [id, farmerId]
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Envanter öğesi bulunamadı veya bu öğeyi silme yetkiniz yok'
            });
        }

        // Envanter öğesini veritabanından sil
        await pool.query('DELETE FROM inventory_items WHERE id = $1', [id]);

        res.json({
            message: 'Envanter öğesi başarıyla silindi'
        });

    } catch (error) {
        console.error('Envanter silme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

module.exports = {
    addInventoryItem,
    getMyInventory,
    getCategories,
    getInventoryItemById,
    updateInventoryItem,
    deleteInventoryItem
};
