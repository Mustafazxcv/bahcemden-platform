# Bahcemden API Endpoints

## Base URL
```
http://localhost:3000
```

---

## 1. Ana Sayfa
**GET** `/`

### Yanıt
```json
{
  "message": "Bahcemden API",
  "endpoints": {
    "register": "POST /api/auth/register",
    "login": "POST /api/auth/login"
  }
}
```

---

## 2. Kayıt Ol
**POST** `/api/auth/register`

### Gelen Veri (Request Body)
```json
{
  "firstName": "Ahmet",
  "lastName": "Yılmaz",
  "username": "ahmetyilmaz",
  "phone": "+905551234567",
  "email": "ahmet@example.com",
  "password": "123456",
  "userType": "personal"
}
```

### Alan Açıklamaları
- `firstName` (string, zorunlu): Kullanıcının adı
- `lastName` (string, zorunlu): Kullanıcının soyadı
- `username` (string, zorunlu): Benzersiz kullanıcı adı (min 3 karakter)
- `phone` (string, zorunlu): Telefon numarası (benzersiz)
- `email` (string, zorunlu): E-posta adresi (benzersiz, geçerli format)
- `password` (string, zorunlu): Şifre (min 6 karakter)
- `userType` (string, zorunlu): Kullanıcı tipi - `"personal"` veya `"farmer"`

### Başarılı Yanıt (201)
```json
{
  "message": "Kullanıcı başarıyla kaydedildi",
  "user": {
    "id": 1,
    "firstName": "Ahmet",
    "lastName": "Yılmaz",
    "username": "ahmetyilmaz",
    "email": "ahmet@example.com",
    "phone": "+905551234567",
    "userType": "personal",
    "createdAt": "2024-01-01T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Hata Yanıtları

#### 400 - Eksik Alanlar
```json
{
  "error": "Tüm alanlar zorunludur"
}
```

#### 400 - Geçersiz Kullanıcı Tipi
```json
{
  "error": "Kullanıcı tipi sadece \"personal\" veya \"farmer\" olabilir"
}
```

#### 400 - Geçersiz E-posta
```json
{
  "error": "Geçerli bir e-posta adresi giriniz"
}
```

#### 400 - Geçersiz Telefon
```json
{
  "error": "Geçerli bir telefon numarası giriniz"
}
```

#### 400 - Kısa Şifre
```json
{
  "error": "Şifre en az 6 karakter olmalıdır"
}
```

#### 400 - Kısa Kullanıcı Adı
```json
{
  "error": "Kullanıcı adı en az 3 karakter olmalıdır"
}
```

#### 409 - Zaten Kayıtlı
```json
{
  "error": "Bu e-posta, kullanıcı adı veya telefon numarası zaten kayıtlı"
}
```

#### 500 - Sunucu Hatası
```json
{
  "error": "Sunucu hatası"
}
```

---

## 3. Giriş Yap
**POST** `/api/auth/login`

### Gelen Veri (Request Body)
```json
{
  "login": "ahmet@example.com",
  "password": "123456"
}
```

### Alan Açıklamaları
- `login` (string, zorunlu): E-posta adresi veya kullanıcı adı
- `password` (string, zorunlu): Şifre

### Başarılı Yanıt (200)
```json
{
  "message": "Giriş başarılı",
  "user": {
    "id": 1,
    "firstName": "Ahmet",
    "lastName": "Yılmaz",
    "username": "ahmetyilmaz",
    "email": "ahmet@example.com",
    "phone": "+905551234567",
    "userType": "personal",
    "createdAt": "2024-01-01T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Hata Yanıtları

#### 400 - Eksik Alanlar
```json
{
  "error": "E-posta/kullanıcı adı ve şifre gereklidir"
}
```

#### 401 - Geçersiz Bilgiler
```json
{
  "error": "Geçersiz e-posta/kullanıcı adı veya şifre"
}
```

#### 401 - Deaktif Hesap
```json
{
  "error": "Hesabınız deaktif durumda"
}
```

#### 500 - Sunucu Hatası
```json
{
  "error": "Sunucu hatası"
}
```

---

## 4. 404 - Endpoint Bulunamadı
**ANY** `/*`

### Yanıt
```json
{
  "error": "Endpoint bulunamadı",
  "path": "/api/invalid-endpoint"
}
```

---

## Test Örnekleri

### cURL Komutları

#### Kayıt Ol
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ahmet",
    "lastName": "Yılmaz",
    "username": "ahmetyilmaz",
    "phone": "+905551234567",
    "email": "ahmet@example.com",
    "password": "123456",
    "userType": "personal"
  }'
```

#### Giriş Yap
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "ahmet@example.com",
    "password": "123456"
  }'
```

### JavaScript Fetch Örnekleri

#### Kayıt Ol
```javascript
const response = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    firstName: 'Ahmet',
    lastName: 'Yılmaz',
    username: 'ahmetyilmaz',
    phone: '+905551234567',
    email: 'ahmet@example.com',
    password: '123456',
    userType: 'personal'
  })
});

const data = await response.json();
console.log(data);
```

#### Giriş Yap
```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    login: 'ahmet@example.com',
    password: '123456'
  })
});

const data = await response.json();
console.log(data);
```

---

## Notlar

- Tüm endpoint'ler JSON formatında veri alır ve döner
- Şifreler bcrypt ile hashlenir ve veritabanında güvenli şekilde saklanır
- JWT token'ları 7 gün geçerlidir (varsayılan)
- CORS yapılandırması: `http://localhost:3000`, `http://localhost:5173`, `http://localhost:3001`, `http://localhost:8080` ve `CLIENT_URL` environment variable'ı desteklenir
- Rate limiting: IP başına 15 dakikada maksimum 100 istek
- Tüm isteklerde Content-Type: application/json header'ı gereklidir
