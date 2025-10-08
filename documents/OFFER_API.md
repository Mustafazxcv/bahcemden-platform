# Teklif Yönetimi API

## Genel Bakış
Kullanıcılar ilanlara teklif atabilir, çiftçiler bu teklifleri onaylayabilir veya reddedebilir. Teklif sistemi ile pazarlık yapılabilir.

## API Endpoints

### 1. Teklif Gönderme
```
POST /api/offers
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "listingId": 1,
  "offerPrice": 22.50,
  "message": "Bu fiyata satarsanız almak istiyorum"
}
```

**Response:**
```json
{
  "message": "Teklif başarıyla gönderildi",
  "offer": {
    "id": 1,
    "listingId": 1,
    "buyerId": 5,
    "offerPrice": 22.50,
    "message": "Bu fiyata satarsanız almak istiyorum",
    "status": "pending",
    "createdAt": "2024-01-10T10:00:00.000Z"
  }
}
```

### 2. Alıcının Tekliflerini Listeleme
```
GET /api/offers/my
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (opsiyonel): Teklif durumu (pending, accepted, rejected)
- `page` (opsiyonel): Sayfa numarası
- `limit` (opsiyonel): Sayfa başına teklif sayısı

**Örnek:**
```
GET /api/offers/my?status=pending&page=1&limit=10
```

**Response:**
```json
{
  "offers": [
    {
      "id": 1,
      "listingId": 1,
      "offerPrice": 22.50,
      "message": "Bu fiyata satarsanız almak istiyorum",
      "status": "pending",
      "createdAt": "2024-01-10T10:00:00.000Z",
      "updatedAt": "2024-01-10T10:00:00.000Z",
      "listing": {
        "productType": "Organik Domates",
        "quantity": 100,
        "unit": "kg",
        "price": 25.50,
        "location": "İstanbul, Kadıköy",
        "harvestDate": "2024-01-15"
      },
      "farmer": {
        "firstName": "Ahmet",
        "lastName": "Yılmaz",
        "username": "ahmetyilmaz"
      }
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

### 3. Çiftçinin Aldığı Teklifleri Listeleme
```
GET /api/offers/listing/:listingId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (opsiyonel): Teklif durumu (pending, accepted, rejected)
- `page` (opsiyonel): Sayfa numarası
- `limit` (opsiyonel): Sayfa başına teklif sayısı

**Örnek:**
```
GET /api/offers/listing/1?status=pending
```

**Response:**
```json
{
  "offers": [
    {
      "id": 1,
      "offerPrice": 22.50,
      "message": "Bu fiyata satarsanız almak istiyorum",
      "status": "pending",
      "createdAt": "2024-01-10T10:00:00.000Z",
      "updatedAt": "2024-01-10T10:00:00.000Z",
      "buyer": {
        "firstName": "Mehmet",
        "lastName": "Demir",
        "username": "mehmetdemir",
        "phone": "+905551234567"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 3,
    "itemsPerPage": 10
  }
}
```

### 4. Teklif Detayı
```
GET /api/offers/:offerId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "listingId": 1,
  "offerPrice": 22.50,
  "message": "Bu fiyata satarsanız almak istiyorum",
  "status": "pending",
  "createdAt": "2024-01-10T10:00:00.000Z",
  "updatedAt": "2024-01-10T10:00:00.000Z",
  "listing": {
    "id": 1,
    "productType": "Organik Domates",
    "quantity": 100,
    "unit": "kg",
    "price": 25.50,
    "location": "İstanbul, Kadıköy",
    "harvestDate": "2024-01-15"
  },
  "buyer": {
    "id": 5,
    "firstName": "Mehmet",
    "lastName": "Demir",
    "username": "mehmetdemir",
    "phone": "+905551234567"
  },
  "farmer": {
    "id": 3,
    "firstName": "Ahmet",
    "lastName": "Yılmaz",
    "username": "ahmetyilmaz",
    "phone": "+905559876543"
  }
}
```

### 5. Teklif Onaylama/Reddetme
```
PUT /api/offers/:offerId/respond
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "action": "accept"
}
```

veya

```json
{
  "action": "reject"
}
```

**Response (Onaylama):**
```json
{
  "message": "Teklif başarıyla kabul edildi",
  "offer": {
    "id": 1,
    "status": "accepted",
    "updatedAt": "2024-01-10T11:30:00.000Z"
  }
}
```

**Response (Reddetme):**
```json
{
  "message": "Teklif başarıyla reddedildi",
  "offer": {
    "id": 1,
    "status": "rejected",
    "updatedAt": "2024-01-10T11:30:00.000Z"
  }
}
```

### 6. Teklif Silme (Sadece Alıcı)
```
DELETE /api/offers/:offerId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Teklif başarıyla silindi"
}
```

## Teklif Durumları

| Durum | Açıklama |
|-------|----------|
| `pending` | Bekleyen teklif (varsayılan) |
| `accepted` | Çiftçi tarafından kabul edilmiş |
| `rejected` | Çiftçi tarafından reddedilmiş |

## Özel Davranışlar

### Teklif Kabul Edildiğinde:
- Teklif durumu `accepted` olur
- **Aynı ilan için diğer tüm pending teklifler otomatik olarak `rejected` olur**
- Sadece bir teklif kabul edilebilir

### Teklif Reddedildiğinde:
- Teklif durumu `rejected` olur
- Diğer teklifler etkilenmez

### Teklif Silme:
- Sadece alıcı kendi teklifini silebilir
- Sadece `pending` durumundaki teklifler silinebilir
- Kabul edilmiş veya reddedilmiş teklifler silinemez

## Hata Kodları

| HTTP Kodu | Açıklama |
|-----------|----------|
| 400 | Geçersiz istek (eksik alanlar, geçersiz sayısal değerler, zaten teklif atılmış) |
| 401 | Token gerekli |
| 403 | Yetki hatası (kendi ilanına teklif, başkasının teklifini yanıtlama) |
| 404 | Teklif/İlan bulunamadı |
| 500 | Sunucu hatası |

## Kullanım Örnekleri

### JavaScript (Fetch API)
```javascript
// Teklif gönderme
const response = await fetch('/api/offers', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    listingId: 1,
    offerPrice: 22.50,
    message: 'Bu fiyata satarsanız almak istiyorum'
  })
});

const result = await response.json();

// Tekliflerimi listeleme
const offersResponse = await fetch('/api/offers/my?status=pending');
const offers = await offersResponse.json();

// Teklif onaylama
const acceptResponse = await fetch('/api/offers/1/respond', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ action: 'accept' })
});

// Teklif reddetme
const rejectResponse = await fetch('/api/offers/1/respond', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ action: 'reject' })
});
```

### cURL
```bash
# Teklif gönderme
curl -X POST http://localhost:3000/api/offers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listingId": 1,
    "offerPrice": 22.50,
    "message": "Bu fiyata satarsanız almak istiyorum"
  }'

# Tekliflerimi listeleme
curl http://localhost:3000/api/offers/my?status=pending \
  -H "Authorization: Bearer YOUR_TOKEN"

# İlan tekliflerini listeleme
curl http://localhost:3000/api/offers/listing/1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Teklif onaylama
curl -X PUT http://localhost:3000/api/offers/1/respond \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "accept"}'

# Teklif reddetme
curl -X PUT http://localhost:3000/api/offers/1/respond \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "reject"}'

# Teklif silme
curl -X DELETE http://localhost:3000/api/offers/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Veritabanı Yapısı
```sql
CREATE TABLE offers (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    offer_price DECIMAL(15,2) NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Bu API, alıcıların ve çiftçilerin teklif sürecini yönetmelerine olanak tanır.
