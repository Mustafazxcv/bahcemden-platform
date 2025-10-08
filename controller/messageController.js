const { pool } = require('../config/database');

// Mesaj gönderme
const sendMessage = async (req, res) => {
    try {
        const { receiverId, message } = req.body;
        const senderId = req.user.userId;

        // Gerekli alanları kontrol et
        if (!receiverId || !message) {
            return res.status(400).json({
                error: 'Alıcı ID ve mesaj içeriği zorunludur'
            });
        }

        // receiverId'nin sayısal olup olmadığını kontrol et
        const receiverIdNum = parseInt(receiverId);
        if (isNaN(receiverIdNum)) {
            return res.status(400).json({
                error: 'Alıcı ID\'si geçerli bir sayı olmalıdır'
            });
        }

        // Mesaj içeriği boş mu kontrol et
        if (message.trim().length === 0) {
            return res.status(400).json({
                error: 'Mesaj içeriği boş olamaz'
            });
        }

        // Alıcının var olup olmadığını kontrol et
        const receiverResult = await pool.query(
            'SELECT id, first_name, last_name FROM users WHERE id = $1 AND is_active = true',
            [receiverIdNum]
        );

        if (receiverResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Alıcı bulunamadı'
            });
        }

        const receiver = receiverResult.rows[0];

        // Gönderici kendine mesaj gönderemez
        if (senderId === receiverIdNum) {
            return res.status(400).json({
                error: 'Kendinize mesaj gönderemezsiniz'
            });
        }

        // Mesajı veritabanına kaydet
        const result = await pool.query(
            `INSERT INTO messages (sender_id, receiver_id, message, created_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             RETURNING id, sender_id, receiver_id, message, created_at`,
            [senderId, receiverIdNum, message.trim()]
        );

        const newMessage = result.rows[0];

        res.status(201).json({
            message: 'Mesaj başarıyla gönderildi',
            data: {
                id: newMessage.id,
                senderId: newMessage.sender_id,
                receiverId: newMessage.receiver_id,
                message: newMessage.message,
                createdAt: newMessage.created_at
            }
        });

    } catch (error) {
        console.error('Mesaj gönderme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Mesajları listele (gelen ve giden)
const getMessages = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type = 'all', page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = '';
        let queryParams = [];

        if (type === 'sent') {
            // Gönderilen mesajlar
            query = `
                SELECT m.*, u.first_name as receiver_first_name, u.last_name as receiver_last_name, u.username as receiver_username
                FROM messages m
                JOIN users u ON m.receiver_id = u.id
                WHERE m.sender_id = $1
                ORDER BY m.created_at DESC
                LIMIT $2 OFFSET $3
            `;
            queryParams = [userId, parseInt(limit), offset];
        } else if (type === 'received') {
            // Gelen mesajlar
            query = `
                SELECT m.*, u.first_name as sender_first_name, u.last_name as sender_last_name, u.username as sender_username
                FROM messages m
                JOIN users u ON m.sender_id = u.id
                WHERE m.receiver_id = $1
                ORDER BY m.created_at DESC
                LIMIT $2 OFFSET $3
            `;
            queryParams = [userId, parseInt(limit), offset];
        } else {
            // Tüm mesajlar (gelen ve giden)
            query = `
                SELECT 
                    m.*,
                    sender.first_name as sender_first_name, 
                    sender.last_name as sender_last_name, 
                    sender.username as sender_username,
                    receiver.first_name as receiver_first_name, 
                    receiver.last_name as receiver_last_name, 
                    receiver.username as receiver_username
                FROM messages m
                JOIN users sender ON m.sender_id = sender.id
                JOIN users receiver ON m.receiver_id = receiver.id
                WHERE m.sender_id = $1 OR m.receiver_id = $1
                ORDER BY m.created_at DESC
                LIMIT $2 OFFSET $3
            `;
            queryParams = [userId, parseInt(limit), offset];
        }

        const result = await pool.query(query, queryParams);

        // Toplam sayıyı al
        let countQuery = '';
        let countParams = [];

        if (type === 'sent') {
            countQuery = 'SELECT COUNT(*) as total FROM messages WHERE sender_id = $1';
            countParams = [userId];
        } else if (type === 'received') {
            countQuery = 'SELECT COUNT(*) as total FROM messages WHERE receiver_id = $1';
            countParams = [userId];
        } else {
            countQuery = 'SELECT COUNT(*) as total FROM messages WHERE sender_id = $1 OR receiver_id = $1';
            countParams = [userId];
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        const messages = result.rows.map(row => ({
            id: row.id,
            senderId: row.sender_id,
            receiverId: row.receiver_id,
            message: row.message,
            isFromMe: row.sender_id === userId,
            sender: {
                firstName: row.sender_first_name,
                lastName: row.sender_last_name,
                username: row.sender_username
            },
            receiver: {
                firstName: row.receiver_first_name,
                lastName: row.receiver_last_name,
                username: row.receiver_username
            },
            createdAt: row.created_at
        }));

        res.json({
            messages,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            },
            type
        });

    } catch (error) {
        console.error('Mesaj listeleme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Belirli bir kullanıcı ile olan mesajları getir
const getConversation = async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const userId = req.user.userId;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        // otherUserId parametresi kontrolü
        if (!otherUserId || otherUserId === 'undefined') {
            return res.status(400).json({
                error: 'Geçerli bir kullanıcı ID\'si gerekli'
            });
        }

        // otherUserId'nin sayısal olup olmadığını kontrol et
        const otherUserIdNum = parseInt(otherUserId);
        if (isNaN(otherUserIdNum)) {
            return res.status(400).json({
                error: 'Kullanıcı ID\'si geçerli bir sayı olmalıdır'
            });
        }

        // Diğer kullanıcının var olup olmadığını kontrol et
        const otherUserResult = await pool.query(
            'SELECT id, first_name, last_name, username FROM users WHERE id = $1 AND is_active = true',
            [otherUserIdNum]
        );

        if (otherUserResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Kullanıcı bulunamadı'
            });
        }

        const otherUser = otherUserResult.rows[0];

        // İki kullanıcı arasındaki mesajları getir
        const result = await pool.query(
            `SELECT * FROM messages 
             WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
             ORDER BY created_at ASC
             LIMIT $3 OFFSET $4`,
            [userId, otherUserIdNum, parseInt(limit), offset]
        );

        // Toplam mesaj sayısı
        const countResult = await pool.query(
            `SELECT COUNT(*) as total FROM messages 
             WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)`,
            [userId, otherUserIdNum]
        );

        const total = parseInt(countResult.rows[0].total);

        const messages = result.rows.map(row => ({
            id: row.id,
            senderId: row.sender_id,
            receiverId: row.receiver_id,
            message: row.message,
            isFromMe: row.sender_id === userId,
            createdAt: row.created_at
        }));

        res.json({
            otherUser: {
                id: otherUser.id,
                firstName: otherUser.first_name,
                lastName: otherUser.last_name,
                username: otherUser.username
            },
            messages,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Konuşma getirme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

// Mesaj silme
const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // Mesajın kullanıcıya ait olup olmadığını kontrol et
        const messageResult = await pool.query(
            'SELECT * FROM messages WHERE id = $1 AND (sender_id = $2 OR receiver_id = $2)',
            [id, userId]
        );

        if (messageResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Mesaj bulunamadı veya bu mesajı silme yetkiniz yok'
            });
        }

        // Mesajı sil
        await pool.query('DELETE FROM messages WHERE id = $1', [id]);

        res.json({
            message: 'Mesaj başarıyla silindi'
        });

    } catch (error) {
        console.error('Mesaj silme hatası:', error);
        res.status(500).json({
            error: 'Sunucu hatası'
        });
    }
};

module.exports = {
    sendMessage,
    getMessages,
    getConversation,
    deleteMessage
};
