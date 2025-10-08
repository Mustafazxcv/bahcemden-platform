# Çiftlik Yönetimi API

## Genel Bakış
Çiftçiler kendi çiftliklerini ekleyip yönetebilirler. Çiftlik bilgileri, resimleri ve detayları ile birlikte saklanır.

## API Endpoints

### 1. Çiftlik Ekleme
```
POST /api/farms
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
farmName: "Organik Tarım Çiftliği"
description: "Doğal ve organik üretim yapılan çiftlik"
location: "İstanbul, Şile"
area: "50"
areaUnit: "dönüm"
contactInfo: "0532 123 45 67"
additionalInfo: "Sertifikalı organik üretim"
images: [resim dosyaları - maksimum 10 adet]
```

**Response:**
```json
{
  "message": "Çiftlik başarıyla eklendi",
  "farm": {
    "id": 1,
    "farmName": "Organik Tarım Çiftliği",
    "description": "Doğal ve organik üretim yapılan çiftlik",
    "location": "İstanbul, Şile",
    "area": 50,
    "areaUnit": "dönüm",
    "contactInfo": "0532 123 45 67",
    "additionalInfo": "Sertifikalı organik üretim",
    "imagesInfo": [
      {
        "filename": "file-1234567890.jpg",
        "originalName": "ciftlik1.jpg",
        "mimetype": "image/jpeg",
        "size": 1024000
      }
    ],
    "createdAt": "2024-01-10T10:00:00.000Z"
  }
}
```

### 2. Çiftçinin Çiftliklerini Listeleme
```
GET /api/farms/my/farms
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (opsiyonel): Sayfa numarası (varsayılan: 1)
- `limit` (opsiyonel): Sayfa başına çiftlik sayısı (varsayılan: 10)

**Response:**
```json
{
  "farms": [
    {
      "id": 1,
      "farmName": "Organik Tarım Çiftliği",
      "description": "Doğal ve organik üretim yapılan çiftlik",
      "location": "İstanbul, Şile",
      "area": 50,
      "areaUnit": "dönüm",
      "contactInfo": "0532 123 45 67",
      "additionalInfo": "Sertifikalı organik üretim",
      "imagesInfo": [
        {
          "filename": "file-1234567890.jpg",
          "originalName": "ciftlik1.jpg",
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

### 3. Tüm Çiftlikleri Listeleme (Herkese Açık)
```
GET /api/farms
```

**Query Parameters:**
- `location` (opsiyonel): Konum filtresi
- `areaMin` (opsiyonel): Minimum alan
- `areaMax` (opsiyonel): Maksimum alan
- `page` (opsiyonel): Sayfa numarası
- `limit` (opsiyonel): Sayfa başına çiftlik sayısı

**Örnek:**
```
GET /api/farms?location=İstanbul&areaMin=10&areaMax=100
```

**Response:**
```json
{
  "farms": [
    {
      "id": 1,
      "farmName": "Organik Tarım Çiftliği",
      "description": "Doğal ve organik üretim yapılan çiftlik",
      "location": "İstanbul, Şile",
      "area": 50,
      "areaUnit": "dönüm",
      "contactInfo": "0532 123 45 67",
      "additionalInfo": "Sertifikalı organik üretim",
      "imagesInfo": [
        {
          "filename": "file-1234567890.jpg",
          "originalName": "ciftlik1.jpg",
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
  }
}
```

### 4. Çiftlik Detayı (Herkese Açık)
```
GET /api/farms/:id
```

**Response:**
```json
{
  "id": 1,
  "farmName": "Organik Tarım Çiftliği",
  "description": "Doğal ve organik üretim yapılan çiftlik",
  "location": "İstanbul, Şile",
  "area": 50,
  "areaUnit": "dönüm",
  "contactInfo": "0532 123 45 67",
  "additionalInfo": "Sertifikalı organik üretim",
  "imagesInfo": [
    {
      "filename": "file-1234567890.jpg",
      "originalName": "ciftlik1.jpg",
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

### 5. Çiftlik Güncelleme
```
PUT /api/farms/:id
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data - Tümü Opsiyonel):**
```
farmName: "Güncellenmiş Çiftlik Adı"
description: "Güncellenmiş açıklama"
location: "Ankara, Mamak"
area: "75"
areaUnit: "hektar"
contactInfo: "0533 987 65 43"
additionalInfo: "Güncellenmiş ek bilgiler"
images: [yeni resim dosyaları]
```

**Response:**
```json
{
  "message": "Çiftlik başarıyla güncellendi",
  "farm": {
    "id": 1,
    "farmName": "Güncellenmiş Çiftlik Adı",
    "description": "Güncellenmiş açıklama",
    "location": "Ankara, Mamak",
    "area": 75,
    "areaUnit": "hektar",
    "contactInfo": "0533 987 65 43",
    "additionalInfo": "Güncellenmiş ek bilgiler",
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

### 6. Çiftlik Silme
```
DELETE /api/farms/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Çiftlik başarıyla silindi"
}
```

### 7. Resim İndirme
```
GET /api/farms/:farmId/images/:imageIndex
```

**Response:** Resim dosyası (binary)

## Desteklenen Dosya Türleri
- **JPEG** (`image/jpeg`, `image/jpg`)
- **PNG** (`image/png`)
- **GIF** (`image/gif`)

## Limitler
- **Maksimum dosya boyutu**: 5MB per file
- **Maksimum dosya sayısı**: 10 adet
- **Sadece çiftçiler** çiftlik ekleyebilir

## Hata Kodları
- `400`: Geçersiz istek (eksik alanlar, geçersiz alan değeri)
- `401`: Token gerekli
- `403`: Sadece çiftçiler çiftlik ekleyebilir
- `404`: Çiftlik bulunamadı / Resim bulunamadı
- `413`: Dosya çok büyük
- `415`: Desteklenmeyen dosya türü
- `500`: Sunucu hatası

## Kullanım Örnekleri

### JavaScript (Fetch API)
```javascript
// Çiftlik ekleme
const formData = new FormData();
formData.append('farmName', 'Organik Tarım Çiftliği');
formData.append('description', 'Doğal üretim yapılan çiftlik');
formData.append('location', 'İstanbul, Şile');
formData.append('area', '50');
formData.append('areaUnit', 'dönüm');
formData.append('images', imageFile1);
formData.append('images', imageFile2);

const response = await fetch('/api/farms', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();

// Çiftlikleri listeleme
const farmsResponse = await fetch('/api/farms?location=İstanbul');
const farms = await farmsResponse.json();

// Çiftlik detayı
const farmResponse = await fetch('/api/farms/1');
const farm = await farmResponse.json();
```

### cURL
```bash
# Çiftlik ekleme
curl -X POST http://localhost:3000/api/farms \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "farmName=Organik Tarım Çiftliği" \
  -F "description=Doğal üretim yapılan çiftlik" \
  -F "location=İstanbul, Şile" \
  -F "area=50" \
  -F "areaUnit=dönüm" \
  -F "images=@ciftlik1.jpg" \
  -F "images=@ciftlik2.jpg"

# Çiftlikleri listeleme
curl http://localhost:3000/api/farms?location=İstanbul

# Çiftlik detayı
curl http://localhost:3000/api/farms/1

# Resim indirme
curl -O http://localhost:3000/api/farms/1/images/0
```

## Veritabanı Yapısı
```sql
CREATE TABLE farms (
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
```

Bu API, çiftçilerin çiftliklerini kolayca yönetmelerine ve kullanıcıların çiftlikleri görüntülemelerine olanak tanır.
