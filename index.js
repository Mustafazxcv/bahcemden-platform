const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const { initDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Güvenlik middleware'leri
app.use(helmet());
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:3001',
        'http://localhost:8080',
        process.env.CLIENT_URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 100, // IP başına maksimum 100 istek
    message: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.'
});
app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Ana route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Bahcemden API',
        endpoints: {
            register: 'POST /api/auth/register',
            login: 'POST /api/auth/login'
        }
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint bulunamadı',
        path: req.originalUrl 
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Hata:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Sunucu hatası',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Server'ı başlat
const startServer = async () => {
    try {
        // Veritabanını başlat
        await initDatabase();
        
        // Server'ı başlat
        app.listen(PORT, () => {
            console.log(`Server ${PORT} portunda çalışıyor`);
            console.log(`API: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Server başlatma hatası:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;
