const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'bahcemden',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maksimum bağlantı sayısı
    idleTimeoutMillis: 30000, // 30 saniye
    connectionTimeoutMillis: 2000, // 2 saniye
});

// Bağlantı testi
pool.on('connect', () => {
    console.log('PostgreSQL veritabanına bağlandı');
});

pool.on('error', (err) => {
    console.error('PostgreSQL bağlantı hatası:', err);
});

// Veritabanı başlatma fonksiyonu
const initDatabase = async () => {
    try {
        console.log('Veritabanı bağlantısı hazır');
    } catch (error) {
        console.error('Veritabanı başlatma hatası:', error);
        throw error;
    }
};

module.exports = { pool, initDatabase };
