# Envanter Yönetimi API

## Genel Bakış
Çiftçiler çiftliklerindeki envanter öğelerini (ekipman, hayvan, ürün, tohum, gübre vb.) yönetebilirler. Kategoriler dinamik olarak oluşturulur.

## API Endpoints

### 1. Envanter Öğesi Ekleme
```
POST /api/inventory
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "itemName": "Traktör",
  "category": "Ekipman",
  "quantity": 2,
  "unit": "adet",
  "description": "John Deere 6120R model traktör",
  "purchaseDate": "2023-05-15",
  "expiryDate": null,
  "cost": 250000,
  "supplier": "John Deere Türkiye"
}
```

**Response:**
```json
{
  "message": "Envanter öğesi başarıyla eklendi",
  "item": {
    "id": 1,
    "itemName": "Traktör",
    "category": "Ekipman",
    "quantity": 2,
    "unit": "adet",
    "description": "John Deere 6120R model traktör",
    "purchaseDate": "2023-05-15",
    "expiryDate": null,
    "cost": 250000,
    "supplier": "John Deere Türkiye",
    "createdAt": "2024-01-10T10:00:00.000Z"
  }
}
```

### 2. Envanter Listeleme
```
GET /api/inventory
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `category` (opsiyonel): Kategori filtresi
- `page` (opsiyonel): Sayfa numarası (varsayılan: 1)
- `limit` (opsiyonel): Sayfa başına öğe sayısı (varsayılan: 20)

**Örnek:**
```
GET /api/inventory?category=Ekipman&page=1&limit=10
```

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "itemName": "Traktör",
      "category": "Ekipman",
      "quantity": 2,
      "unit": "adet",
      "description": "John Deere 6120R model traktör",
      "purchaseDate": "2023-05-15",
      "expiryDate": null,
      "cost": 250000,
      "supplier": "John Deere Türkiye",
      "createdAt": "2024-01-10T10:00:00.000Z",
      "updatedAt": "2024-01-10T10:00:00.000Z"
    },
    {
      "id": 2,
      "itemName": "Organik Gübre",
      "category": "Gübre",
      "quantity": 100,
      "unit": "kg",
      "description": "Kompost gübre",
      "purchaseDate": "2024-01-05",
      "expiryDate": "2024-12-31",
      "cost": 500,
      "supplier": "Doğal Tarım Ltd.",
      "createdAt": "2024-01-05T14:30:00.000Z",
      "updatedAt": "2024-01-05T14:30:00.000Z"
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

### 3. Kategorileri Listeleme
```
GET /api/inventory/categories
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "categories": [
    {
      "category": "Ekipman",
      "itemCount": 5
    },
    {
      "category": "Gübre",
      "itemCount": 8
    },
    {
      "category": "Tohum",
      "itemCount": 12
    },
    {
      "category": "Hayvan",
      "itemCount": 3
    }
  ]
}
```

### 4. Envanter Öğesi Detayı
```
GET /api/inventory/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "itemName": "Traktör",
  "category": "Ekipman",
  "quantity": 2,
  "unit": "adet",
  "description": "John Deere 6120R model traktör",
  "purchaseDate": "2023-05-15",
  "expiryDate": null,
  "cost": 250000,
  "supplier": "John Deere Türkiye",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T10:00:00.000Z"
}
```

### 5. Envanter Öğesi Güncelleme
```
PUT /api/inventory/:id
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (Tümü Opsiyonel):**
```json
{
  "itemName": "Güncellenmiş Traktör",
  "category": "Ekipman",
  "quantity": 3,
  "unit": "adet",
  "description": "Güncellenmiş açıklama",
  "purchaseDate": "2023-06-01",
  "expiryDate": null,
  "cost": 275000,
  "supplier": "Yeni Tedarikçi"
}
```

**Response:**
```json
{
  "message": "Envanter öğesi başarıyla güncellendi",
  "item": {
    "id": 1,
    "itemName": "Güncellenmiş Traktör",
    "category": "Ekipman",
    "quantity": 3,
    "unit": "adet",
    "description": "Güncellenmiş açıklama",
    "purchaseDate": "2023-06-01",
    "expiryDate": null,
    "cost": 275000,
    "supplier": "Yeni Tedarikçi",
    "createdAt": "2024-01-10T10:00:00.000Z",
    "updatedAt": "2024-01-12T14:30:00.000Z"
  }
}
```

### 6. Envanter Öğesi Silme
```
DELETE /api/inventory/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Envanter öğesi başarıyla silindi"
}
```

## Alan Açıklamaları

### Zorunlu Alanlar:
- **itemName**: Öğe adı (örn: "Traktör", "Organik Gübre")
- **category**: Kategori (dinamik - örn: "Ekipman", "Gübre", "Tohum")
- **quantity**: Miktar (pozitif sayı)
- **unit**: Birim (örn: "adet", "kg", "litre", "ton")

### Opsiyonel Alanlar:
- **description**: Açıklama
- **purchaseDate**: Satın alma tarihi (YYYY-MM-DD)
- **expiryDate**: Son kullanma tarihi (YYYY-MM-DD)
- **cost**: Maliyet (pozitif sayı)
- **supplier**: Tedarikçi

## Kategori Örnekleri

### Ekipman:
- Traktör, biçerdöver, sulama sistemi, gübreleme makinesi

### Gübre:
- Organik gübre, kimyasal gübre, kompost

### Tohum:
- Buğday tohumu, domates tohumu, mısır tohumu

### Hayvan:
- İnek, koyun, tavuk, keçi

### Ürün:
- Buğday, domates, elma, mısır

### İlaç:
- Böcek ilacı, hastalık ilacı, yabani ot ilacı

## Hata Kodları

| HTTP Kodu | Açıklama |
|-----------|----------|
| 400 | Geçersiz istek (eksik alanlar, geçersiz sayısal değerler) |
| 401 | Token gerekli |
| 403 | Sadece çiftçiler envanter ekleyebilir |
| 404 | Envanter öğesi bulunamadı |
| 500 | Sunucu hatası |

## Kullanım Örnekleri

### JavaScript (Fetch API)
```javascript
// Envanter öğesi ekleme
const response = await fetch('/api/inventory', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    itemName: 'Traktör',
    category: 'Ekipman',
    quantity: 2,
    unit: 'adet',
    description: 'John Deere 6120R',
    cost: 250000,
    supplier: 'John Deere Türkiye'
  })
});

const result = await response.json();

// Envanter listeleme
const inventoryResponse = await fetch('/api/inventory?category=Ekipman');
const inventory = await inventoryResponse.json();

// Kategorileri listeleme
const categoriesResponse = await fetch('/api/inventory/categories');
const categories = await categoriesResponse.json();
```

### cURL
```bash
# Envanter öğesi ekleme
curl -X POST http://localhost:3000/api/inventory \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemName": "Traktör",
    "category": "Ekipman",
    "quantity": 2,
    "unit": "adet",
    "description": "John Deere 6120R",
    "cost": 250000,
    "supplier": "John Deere Türkiye"
  }'

# Envanter listeleme
curl http://localhost:3000/api/inventory?category=Ekipman \
  -H "Authorization: Bearer YOUR_TOKEN"

# Kategorileri listeleme
curl http://localhost:3000/api/inventory/categories \
  -H "Authorization: Bearer YOUR_TOKEN"

# Envanter güncelleme
curl -X PUT http://localhost:3000/api/inventory/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 3}'

# Envanter silme
curl -X DELETE http://localhost:3000/api/inventory/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Veritabanı Yapısı
```sql
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    farmer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    description TEXT,
    purchase_date DATE,
    expiry_date DATE,
    cost DECIMAL(10,2),
    supplier VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Bu API, çiftçilerin envanterlerini kolayca yönetmelerine olanak tanır. Kategoriler dinamik olarak oluşturulur ve esnek bir yapı sağlar.
