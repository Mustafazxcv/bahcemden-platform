# İlan Yönetimi API

## Genel Bakış
Çiftçiler ürünlerini satışa çıkarabilirler. İlanlar ürün türü, miktarı, fiyatı, hasat tarihi ve fotoğrafları ile birlikte yayınlanır.

## API Endpoints

### 1. İlan Ekleme
```
POST /api/listings
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
productType: "Organik Domates"
quantity: "100"
unit: "kg"
price: "25.50"
harvestDate: "2024-01-15"
description: "Bahçemde yetiştirdiğim organik domatesler"
location: "İstanbul, Kadıköy"
contactInfo: "0532 123 45 67"
isActive: true
images: [resim dosyaları - maksimum 10 adet]
```

**Response:**
```json
{
  "message": "İlan başarıyla eklendi",
  "listing": {
    "id": 1,
    "productType": "Organik Domates",
    "quantity": 100,
    "unit": "kg",
    "price": 25.50,
    "harvestDate": "2024-01-15",
    "description": "Bahçemde yetiştirdiğim organik domatesler",
    "location": "İstanbul, Kadıköy",
    "contactInfo": "0532 123 45 67",
    "isActive": true,
    "imagesInfo": [
      {
        "filename": "file-1234567890.jpg",
        "originalName": "domates1.jpg",
        "mimetype": "image/jpeg",
        "size": 1024000
      }
    ],
    "createdAt": "2024-01-10T10:00:00.000Z"
  }
}
```

### 2. Filtreleme Seçeneklerini Alma (Herkese Açık)
```
GET /api/listings/filters
```

**Response:**
```json
{
  "productTypes": [
    {
      "value": "Organik Domates",
      "label": "Organik Domates",
      "count": 15
    },
    {
      "value": "Buğday",
      "label": "Buğday", 
      "count": 8
    }
  ],
  "locations": [
    {
      "value": "İstanbul, Kadıköy",
      "label": "İstanbul, Kadıköy",
      "count": 12
    },
    {
      "value": "Ankara, Çankaya",
      "label": "Ankara, Çankaya",
      "count": 7
    }
  ],
  "priceRange": {
    "min": 5.50,
    "max": 250.00
  }
}
```

### 3. Tüm İlanları Listeleme (Herkese Açık)
```
GET /api/listings
```

**Query Parameters:**
- `productType` (opsiyonel): Ürün türü filtresi
- `minPrice` (opsiyonel): Minimum fiyat
- `maxPrice` (opsiyonel): Maksimum fiyat
- `location` (opsiyonel): Konum filtresi
- `isActive` (opsiyonel): Aktif ilanlar (true/false)
- `sortBy` (opsiyonel): Sıralama alanı (created_at, price, harvest_date, product_type)
- `sortOrder` (opsiyonel): Sıralama yönü (ASC, DESC)
- `page` (opsiyonel): Sayfa numarası
- `limit` (opsiyonel): Sayfa başına ilan sayısı

**Örnek URL'ler:**
```
GET /api/listings?productType=domates&minPrice=20&maxPrice=50&isActive=true
GET /api/listings?location=İstanbul&sortBy=price&sortOrder=ASC
GET /api/listings?productType=buğday&sortBy=harvest_date&sortOrder=DESC&page=2&limit=20
```

**Response:**
```json
{
  "listings": [
    {
      "id": 1,
      "productType": "Organik Domates",
      "quantity": 100,
      "unit": "kg",
      "price": 25.50,
      "harvestDate": "2024-01-15",
      "description": "Bahçemde yetiştirdiğim organik domatesler",
      "location": "İstanbul, Kadıköy",
      "contactInfo": "0532 123 45 67",
      "isActive": true,
      "imagesInfo": [
        {
          "filename": "file-1234567890.jpg",
          "originalName": "domates1.jpg",
          "mimetype": "image/jpeg",
          "size": 1024000
        }
      ],
      "farmer": {
        "firstName": "Ahmet",
        "lastName": "Yılmaz",
        "username": "ahmetyilmaz"
      },
      "createdAt": "2024-01-10T10:00:00.000Z",
      "updatedAt": "2024-01-10T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 47,
    "itemsPerPage": 10
  },
  "filters": {
    "productType": "domates",
    "minPrice": 20,
    "maxPrice": 50,
    "location": null,
    "isActive": true
  },
  "sorting": {
    "sortBy": "created_at",
    "sortOrder": "DESC"
  }
}
```

### 4. Çiftçinin İlanlarını Listeleme
```
GET /api/listings/my/listings
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `isActive` (opsiyonel): Aktif/Pasif filtresi (belirtilmezse tüm ilanlar gösterilir)
- `page` (opsiyonel): Sayfa numarası
- `limit` (opsiyonel): Sayfa başına ilan sayısı

**Not:** Çiftçinin kendi ilanlarında varsayılan olarak hem aktif hem pasif ilanlar gösterilir. Sadece `isActive=true` veya `isActive=false` parametresi ile filtreleme yapılabilir.

**Response:**
```json
{
  "listings": [
    {
      "id": 1,
      "productType": "Organik Domates",
      "quantity": 100,
      "unit": "kg",
      "price": 25.50,
      "harvestDate": "2024-01-15",
      "description": "Bahçemde yetiştirdiğim organik domatesler",
      "location": "İstanbul, Kadıköy",
      "contactInfo": "0532 123 45 67",
      "isActive": true,
      "imagesInfo": [
        {
          "filename": "file-1234567890.jpg",
          "originalName": "domates1.jpg",
          "mimetype": "image/jpeg",
          "size": 1024000
        }
      ],
      "createdAt": "2024-01-10T10:00:00.000Z",
      "updatedAt": "2024-01-10T10:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 25,
    "itemsPerPage": 10
  }
}
```

### 5. İlan Detayı (Herkese Açık)
```
GET /api/listings/:id
```

**Response:**
```json
{
  "id": 1,
  "productType": "Organik Domates",
  "quantity": 100,
  "unit": "kg",
  "price": 25.50,
  "harvestDate": "2024-01-15",
  "description": "Bahçemde yetiştirdiğim organik domatesler",
  "location": "İstanbul, Kadıköy",
  "contactInfo": "0532 123 45 67",
  "isActive": true,
  "imagesInfo": [
    {
      "filename": "file-1234567890.jpg",
      "originalName": "domates1.jpg",
      "mimetype": "image/jpeg",
      "size": 1024000
    }
  ],
  "farmer": {
    "firstName": "Ahmet",
    "lastName": "Yılmaz",
    "username": "ahmetyilmaz",
    "phone": "+905551234567"
  },
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T10:00:00.000Z"
}
```

### 6. İlan Güncelleme
```
PUT /api/listings/:id
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data - Tümü Opsiyonel):**
```
productType: "Güncellenmiş Ürün"
quantity: "150"
unit: "kg"
price: "30.00"
harvestDate: "2024-01-20"
description: "Güncellenmiş açıklama"
location: "Ankara, Çankaya"
contactInfo: "0533 987 65 43"
isActive: false
images: [yeni resim dosyaları]
```

**Response:**
```json
{
  "message": "İlan başarıyla güncellendi",
  "listing": {
    "id": 1,
    "productType": "Güncellenmiş Ürün",
    "quantity": 150,
    "unit": "kg",
    "price": 30.00,
    "harvestDate": "2024-01-20",
    "description": "Güncellenmiş açıklama",
    "location": "Ankara, Çankaya",
    "contactInfo": "0533 987 65 43",
    "isActive": false,
    "imagesInfo": [
      {
        "filename": "file-9876543210.jpg",
        "originalName": "yeni-resim.jpg",
        "mimetype": "image/jpeg",
        "size": 2048000
      }
    ],
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-12T14:30:00.000Z"
  }
}
```

### 7. İlan Silme
```
DELETE /api/listings/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "İlan başarıyla silindi"
}
```

### 8. Resim İndirme
```
GET /api/listings/:listingId/images/:imageIndex
```

**Response:** Resim dosyası (binary)

## Desteklenen Dosya Türleri
- **JPEG** (`image/jpeg`, `image/jpg`)
- **PNG** (`image/png`)
- **GIF** (`image/gif`)

## Limitler
- **Maksimum dosya boyutu**: 5MB per file
- **Maksimum dosya sayısı**: 10 adet
- **Sadece çiftçiler** ilan ekleyebilir

## Alan Açıklamaları

### Zorunlu Alanlar:
- **productType**: Ürün türü (örn: "Organik Domates", "Buğday")
- **quantity**: Miktar (pozitif sayı)
- **unit**: Birim (örn: "kg", "ton", "adet")
- **price**: Fiyat (pozitif sayı)
- **harvestDate**: Hasat tarihi (YYYY-MM-DD)

### Opsiyonel Alanlar:
- **description**: Açıklama
- **location**: Konum
- **contactInfo**: İletişim bilgileri
- **isActive**: İlan aktif mi (varsayılan: true)
- **images**: Resim dosyaları

## Hata Kodları

| HTTP Kodu | Açıklama |
|-----------|----------|
| 400 | Geçersiz istek (eksik alanlar, geçersiz sayısal değerler) |
| 401 | Token gerekli |
| 403 | Sadece çiftçiler ilan ekleyebilir |
| 404 | İlan bulunamadı / Resim bulunamadı |
| 413 | Dosya çok büyük |
| 415 | Desteklenmeyen dosya türü |
| 500 | Sunucu hatası |

## Kullanım Örnekleri

### JavaScript (Fetch API)
```javascript
// İlan ekleme
const formData = new FormData();
formData.append('productType', 'Organik Domates');
formData.append('quantity', '100');
formData.append('unit', 'kg');
formData.append('price', '25.50');
formData.append('harvestDate', '2024-01-15');
formData.append('description', 'Bahçemde yetiştirdiğim organik domatesler');
formData.append('images', imageFile1);
formData.append('images', imageFile2);

const response = await fetch('/api/listings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();

// İlanları listeleme
const listingsResponse = await fetch('/api/listings?productType=domates&isActive=true');
const listings = await listingsResponse.json();

// İlan detayı
const listingResponse = await fetch('/api/listings/1');
const listing = await listingResponse.json();
```

### cURL
```bash
# İlan ekleme
curl -X POST http://localhost:3000/api/listings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "productType=Organik Domates" \
  -F "quantity=100" \
  -F "unit=kg" \
  -F "price=25.50" \
  -F "harvestDate=2024-01-15" \
  -F "description=Bahçemde yetiştirdiğim organik domatesler" \
  -F "images=@domates1.jpg" \
  -F "images=@domates2.jpg"

# İlanları listeleme
curl http://localhost:3000/api/listings?productType=domates&isActive=true

# İlan detayı
curl http://localhost:3000/api/listings/1

# Resim indirme
curl -O http://localhost:3000/api/listings/1/images/0
```

## Veritabanı Yapısı
```sql
CREATE TABLE listings (
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
```

Bu API, çiftçilerin ürünlerini kolayca satışa çıkarmalarına ve alıcıların ürünleri bulmalarına olanak tanır.
