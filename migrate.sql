-- Bahçemden Veritabanı Migration
-- Bu dosyayı PostgreSQL'de çalıştırarak veritabanını oluşturun

-- Users tablosu oluşturma
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    username VARCHAR(30) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    user_type VARCHAR(10) CHECK (user_type IN ('personal', 'farmer')) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Updated_at trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger oluşturma
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index'ler oluşturma
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Certificates tablosu oluşturma
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    farmer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    certificate_name VARCHAR(200) NOT NULL,
    file_info JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Certificates tablosu için index'ler
CREATE INDEX IF NOT EXISTS idx_certificates_farmer_id ON certificates(farmer_id);
CREATE INDEX IF NOT EXISTS idx_certificates_created_at ON certificates(created_at);

-- Messages tablosu oluşturma
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages tablosu için index'ler
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Farms tablosu oluşturma
CREATE TABLE IF NOT EXISTS farms (
    id SERIAL PRIMARY KEY,
    farmer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    farm_name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(200) NOT NULL,
    area DECIMAL(10,2) NOT NULL,
    area_unit VARCHAR(20) NOT NULL,
    contact_info TEXT,
    additional_info TEXT,
    images_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farms tablosu için index'ler
CREATE INDEX IF NOT EXISTS idx_farms_farmer_id ON farms(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farms_location ON farms(location);
CREATE INDEX IF NOT EXISTS idx_farms_area ON farms(area);
CREATE INDEX IF NOT EXISTS idx_farms_created_at ON farms(created_at);

-- Farms tablosu için updated_at trigger
CREATE TRIGGER update_farms_updated_at
    BEFORE UPDATE ON farms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inventory items tablosu oluşturma
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    farmer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    description TEXT,
    purchase_date DATE,
    expiry_date DATE,
    cost DECIMAL(15,2),
    supplier VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory items tablosu için index'ler
CREATE INDEX IF NOT EXISTS idx_inventory_items_farmer_id ON inventory_items(farmer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_item_name ON inventory_items(item_name);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_at ON inventory_items(created_at);

-- Inventory items tablosu için updated_at trigger
CREATE TRIGGER update_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Mevcut tabloları güncelle (eğer varsa)
ALTER TABLE inventory_items ALTER COLUMN quantity TYPE DECIMAL(15,3);
ALTER TABLE inventory_items ALTER COLUMN cost TYPE DECIMAL(15,2);

-- Listings tablosu oluşturma
CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    farmer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_type VARCHAR(200) NOT NULL,
    quantity DECIMAL(15,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    harvest_date DATE NOT NULL,
    description TEXT,
    location VARCHAR(200),
    contact_info TEXT,
    is_active BOOLEAN DEFAULT true,
    images_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Listings tablosu için index'ler
CREATE INDEX IF NOT EXISTS idx_listings_farmer_id ON listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_product_type ON listings(product_type);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_harvest_date ON listings(harvest_date);
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(location);
CREATE INDEX IF NOT EXISTS idx_listings_is_active ON listings(is_active);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at);

-- Listings tablosu için updated_at trigger
CREATE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Offers tablosu oluşturma
CREATE TABLE IF NOT EXISTS offers (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    offer_price DECIMAL(15,2) NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Offers tablosu için index'ler
CREATE INDEX IF NOT EXISTS idx_offers_listing_id ON offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_id ON offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON offers(created_at);

-- Offers tablosu için updated_at trigger
CREATE TRIGGER update_offers_updated_at
    BEFORE UPDATE ON offers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ratings tablosu oluşturma (yıldızlama sistemi)
CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
    email VARCHAR(100) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(listing_id, email) -- Her e-posta bir ürüne sadece 1 kez yıldız verebilir
);

-- Ratings tablosu için index'ler
CREATE INDEX IF NOT EXISTS idx_ratings_listing_id ON ratings(listing_id);
CREATE INDEX IF NOT EXISTS idx_ratings_email ON ratings(email);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at);

-- Orders tablosu oluşturma (sipariş sistemi)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
    buyer_email VARCHAR(100) NOT NULL,
    buyer_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- NULL olabilir (misafir sipariş)
    quantity DECIMAL(15,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('credit_card', 'bank_transfer', 'cash_on_delivery', 'digital_wallet')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    order_status VARCHAR(20) DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
    delivery_address TEXT NOT NULL,
    delivery_phone VARCHAR(20) NOT NULL,
    delivery_notes TEXT,
    farmer_notes TEXT, -- Çiftçi notları
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders tablosu için index'ler
CREATE INDEX IF NOT EXISTS idx_orders_listing_id ON orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_email ON orders(buyer_email);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Orders tablosu için updated_at trigger
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Başarı mesajı
SELECT 'Veritabanı başarıyla oluşturuldu!' as message;
