# Sertifika Yükleme API

## Genel Bakış
Çiftçiler sertifika adı ve dosya (PDF, PNG, JPEG) yükleyebilirler. Sadece çiftçi kullanıcılar bu işlemi yapabilir.

## API Endpoints

### 1. Sertifika Ekleme
```
POST /api/certificates
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
certificateName: "Organik Tarım Sertifikası"
file: [PDF/PNG/JPEG dosyası]
```

**Response:**
```json
{
  "message": "Sertifika başarıyla eklendi",
  "certificate": {
    "id": 1,
    "certificateName": "Organik Tarım Sertifikası",
    "fileInfo": {
      "filename": "file-1234567890.pdf",
      "originalName": "organik-sertifika.pdf",
      "mimetype": "application/pdf",
      "size": 1024000
    },
    "createdAt": "2024-01-10T10:00:00.000Z"
  }
}
```

### 2. Çiftçinin Sertifikalarını Listeleme
```
GET /api/certificates/my
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "certificates": [
    {
      "id": 1,
      "certificateName": "Organik Tarım Sertifikası",
      "fileInfo": {
        "filename": "file-1234567890.pdf",
        "originalName": "organik-sertifika.pdf",
        "mimetype": "application/pdf",
        "size": 1024000
      },
      "createdAt": "2024-01-10T10:00:00.000Z"
    }
  ]
}
```

### 3. Sertifika Silme
```
DELETE /api/certificates/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Sertifika başarıyla silindi"
}
```

### 4. Dosya İndirme
```
GET /api/certificates/:id/download
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** Dosya indirme (binary)

## Desteklenen Dosya Türleri
- **PDF** (`application/pdf`)
- **PNG** (`image/png`)
- **JPEG** (`image/jpeg`, `image/jpg`)

## Limitler
- **Maksimum dosya boyutu**: 5MB
- **Sadece çiftçiler** sertifika ekleyebilir

## Hata Kodları
- `400`: Sertifika adı veya dosya eksik
- `401`: Token gerekli
- `403`: Sadece çiftçiler sertifika ekleyebilir
- `404`: Sertifika bulunamadı
- `413`: Dosya çok büyük
- `415`: Desteklenmeyen dosya türü

## Kullanım Örneği

### JavaScript (Fetch API)
```javascript
const formData = new FormData();
formData.append('certificateName', 'Organik Tarım Sertifikası');
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/certificates', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
```

### cURL
```bash
curl -X POST http://localhost:3000/api/certificates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "certificateName=Organik Tarım Sertifikası" \
  -F "file=@sertifika.pdf"
```

## Veritabanı Yapısı
```sql
CREATE TABLE certificates (
    id SERIAL PRIMARY KEY,
    farmer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    certificate_name VARCHAR(200) NOT NULL,
    file_info JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
