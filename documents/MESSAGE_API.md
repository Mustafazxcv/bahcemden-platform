# Mesajlaşma API

## Genel Bakış
Basit mesajlaşma sistemi - kullanıcılar arasında mesaj gönderme/alma. Tarih bilgisi ile birlikte.

## API Endpoints

### 1. Mesaj Gönderme
```
POST /api/messages
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "receiverId": 2,
  "message": "Merhaba, ürününüz hakkında bilgi alabilir miyim?"
}
```

**Response:**
```json
{
  "message": "Mesaj başarıyla gönderildi",
  "data": {
    "id": 1,
    "senderId": 1,
    "receiverId": 2,
    "message": "Merhaba, ürününüz hakkında bilgi alabilir miyim?",
    "createdAt": "2024-01-10T10:00:00.000Z"
  }
}
```

### 2. Mesajları Listeleme
```
GET /api/messages
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `type` (opsiyonel): `all` (tümü), `sent` (gönderilen), `received` (gelen)
- `page` (opsiyonel): Sayfa numarası (varsayılan: 1)
- `limit` (opsiyonel): Sayfa başına mesaj sayısı (varsayılan: 20)

**Örnek:**
```
GET /api/messages?type=received&page=1&limit=10
```

**Response:**
```json
{
  "messages": [
    {
      "id": 1,
      "senderId": 2,
      "receiverId": 1,
      "message": "Tabii, hangi konuda yardımcı olabilirim?",
      "isFromMe": false,
      "sender": {
        "firstName": "Ahmet",
        "lastName": "Yılmaz",
        "username": "ahmetyilmaz"
      },
      "receiver": {
        "firstName": "Mehmet",
        "lastName": "Demir",
        "username": "mehmetdemir"
      },
      "createdAt": "2024-01-10T10:05:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 47,
    "itemsPerPage": 10
  },
  "type": "received"
}
```

### 3. Belirli Kullanıcı ile Konuşma
```
GET /api/messages/conversation/:otherUserId
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (opsiyonel): Sayfa numarası
- `limit` (opsiyonel): Sayfa başına mesaj sayısı (varsayılan: 50)

**Response:**
```json
{
  "otherUser": {
    "id": 2,
    "firstName": "Ahmet",
    "lastName": "Yılmaz",
    "username": "ahmetyilmaz"
  },
  "messages": [
    {
      "id": 1,
      "senderId": 1,
      "receiverId": 2,
      "message": "Merhaba, ürününüz hakkında bilgi alabilir miyim?",
      "isFromMe": true,
      "createdAt": "2024-01-10T10:00:00.000Z"
    },
    {
      "id": 2,
      "senderId": 2,
      "receiverId": 1,
      "message": "Tabii, hangi konuda yardımcı olabilirim?",
      "isFromMe": false,
      "createdAt": "2024-01-10T10:05:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 2,
    "itemsPerPage": 50
  }
}
```

### 4. Mesaj Silme
```
DELETE /api/messages/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Mesaj başarıyla silindi"
}
```

## Hata Kodları

| HTTP Kodu | Açıklama |
|-----------|----------|
| 400 | Geçersiz istek (eksik alanlar, boş mesaj, kendine mesaj) |
| 401 | Token gerekli |
| 404 | Alıcı bulunamadı / Mesaj bulunamadı |
| 500 | Sunucu hatası |

## Kullanım Örnekleri

### JavaScript (Fetch API)
```javascript
// Mesaj gönderme
const response = await fetch('/api/messages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    receiverId: 2,
    message: 'Merhaba, nasılsınız?'
  })
});

const result = await response.json();

// Mesajları listeleme
const messagesResponse = await fetch('/api/messages?type=received', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const messages = await messagesResponse.json();

// Konuşma getirme
const conversationResponse = await fetch('/api/messages/conversation/2', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const conversation = await conversationResponse.json();
```

### cURL
```bash
# Mesaj gönderme
curl -X POST http://localhost:3000/api/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"receiverId": 2, "message": "Merhaba!"}'

# Mesajları listeleme
curl http://localhost:3000/api/messages?type=all \
  -H "Authorization: Bearer YOUR_TOKEN"

# Konuşma getirme
curl http://localhost:3000/api/messages/conversation/2 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Mesaj silme
curl -X DELETE http://localhost:3000/api/messages/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Özellikler

- ✅ **Basit mesajlaşma**: Sadece metin mesajları
- ✅ **Tarih bilgisi**: Her mesajda oluşturulma tarihi
- ✅ **Gelen/Giden ayrımı**: Mesaj türüne göre filtreleme
- ✅ **Konuşma görünümü**: İki kullanıcı arasındaki tüm mesajlar
- ✅ **Mesaj silme**: Kendi mesajlarını silme
- ✅ **Sayfalama**: Büyük mesaj listeleri için
- ✅ **Güvenlik**: Token doğrulama ve sahiplik kontrolü

## Veritabanı Yapısı
```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Basit ve etkili mesajlaşma sistemi hazır!
