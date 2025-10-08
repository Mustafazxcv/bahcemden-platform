const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const certificateRoutes = require('./routes/certificates');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');
const farmRoutes = require('./routes/farms');
const inventoryRoutes = require('./routes/inventory');
const listingRoutes = require('./routes/listings');
const offerRoutes = require('./routes/offers');
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
        'https://bahcemden.com.tr',
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
app.use('/api/certificates', certificateRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/offers', offerRoutes);

// Ana route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Bahcemden API',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                changePassword: 'PUT /api/auth/change-password',
                changeEmail: 'PUT /api/auth/change-email'
            },
            certificates: {
                create: 'POST /api/certificates',
                myCertificates: 'GET /api/certificates/my',
                delete: 'DELETE /api/certificates/:id',
                download: 'GET /api/certificates/:id/download'
            },
            messages: {
                send: 'POST /api/messages',
                list: 'GET /api/messages',
                conversation: 'GET /api/messages/conversation/:otherUserId',
                delete: 'DELETE /api/messages/:id'
            },
            users: {
                list: 'GET /api/users',
                detail: 'GET /api/users/:id',
                profile: 'GET /api/users/profile/me'
            },
            farms: {
                list: 'GET /api/farms',
                detail: 'GET /api/farms/:id',
                create: 'POST /api/farms',
                myFarms: 'GET /api/farms/my/farms',
                update: 'PUT /api/farms/:id',
                delete: 'DELETE /api/farms/:id',
                downloadImage: 'GET /api/farms/:farmId/images/:imageIndex'
            },
            inventory: {
                create: 'POST /api/inventory',
                list: 'GET /api/inventory',
                categories: 'GET /api/inventory/categories',
                detail: 'GET /api/inventory/:id',
                update: 'PUT /api/inventory/:id',
                delete: 'DELETE /api/inventory/:id'
            },
            listings: {
                list: 'GET /api/listings',
                filters: 'GET /api/listings/filters',
                detail: 'GET /api/listings/:id',
                create: 'POST /api/listings',
                myListings: 'GET /api/listings/my/listings',
                update: 'PUT /api/listings/:id',
                delete: 'DELETE /api/listings/:id',
                downloadImage: 'GET /api/listings/:listingId/images/:imageIndex'
            },
            offers: {
                create: 'POST /api/offers',
                myOffers: 'GET /api/offers/my',
                listingOffers: 'GET /api/offers/listing/:listingId',
                detail: 'GET /api/offers/:offerId',
                respond: 'PUT /api/offers/:offerId/respond',
                delete: 'DELETE /api/offers/:offerId'
            }
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
