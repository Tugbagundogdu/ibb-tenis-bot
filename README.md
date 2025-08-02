# İBB Tenis Rezervasyon Botu

Bu bot, İstanbul Büyükşehir Belediyesi (İBB) spor tesislerinde otomatik tenis rezervasyonu yapmak için geliştirilmiştir.

## 🚀 Özellikler

- 🤖 **Otomatik Rezervasyon**: Puppeteer ile web sitesinde otomatik işlem
- 📱 **Telegram Entegrasyonu**: Bot durumu ve bildirimler Telegram üzerinden
- 🔐 **SMS Doğrulama**: Güvenlik için SMS kodunu Telegram üzerinden alma
- ⏰ **Zamanlanmış Çalışma**: Cron ile otomatik çalışma
- 🧪 **Test Modu**: Hemen test edebilme
- 🕐 **Scheduler**: Sunucuda otomatik çalışma

## 📋 Gereksinimler

- Node.js 18+
- npm veya yarn
- Chrome/Chromium browser

## 🛠️ Kurulum

### 1. Projeyi İndirin
```bash
git clone <repository-url>
cd ibb-tenis-bot
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Environment Değişkenlerini Ayarlayın
`.env` dosyası oluşturun:
```env
# İBB Spor Bilgileri
TC_KIMLIK=your_tc_kimlik
SIFRE=your_password

# Telegram Bot Bilgileri
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Browser Ayarları
HEADLESS=true
```

## 🎯 Kullanım

### Lokal Çalıştırma

```bash
# Normal mod (Telegram komutlarını bekler)
npm start

# Geliştirme modu (nodemon ile)
npm run dev

# Test modu (hemen çalışır)
npm test

# Scheduler (zamanlanmış çalışma)
npm run scheduler

# Test modunda scheduler (her 5 dakikada)
npm run scheduler:test

# Production modunda scheduler (her gün 20:59'da)
npm run scheduler:prod
```

### Sunucuda Çalıştırma

```bash
# Sunucuda projeyi klonlayın
git clone <repository-url>
cd ibb-tenis-bot

# Bağımlılıkları yükleyin
npm install

# .env dosyasını oluşturun ve düzenleyin
cp .env.example .env
nano .env

# Production modunda scheduler başlatın
npm run scheduler:prod

# Arka planda çalıştırmak için
nohup npm run scheduler:prod > bot.log 2>&1 &
```

## 📱 Telegram Komutları

Bot çalışırken şu komutları kullanabilirsiniz:

- `/test` - Bot durumunu kontrol et
- `/ping` - Ping/Pong testi
- `/rezervasyon` - Rezervasyon işlemini başlat

## ⏰ Zamanlama

### Scheduler Ayarları

- **Test Modu**: Her 5 dakikada bir çalışır
- **Production Modu**: Her gün saat 20:59'da çalışır (rezervasyon açılış saatinden 1 dakika önce)

### Manuel Tetikleme

```bash
# Hemen çalıştır
npm test

# Scheduler'ı manuel tetikle
kill -SIGUSR1 <process_id>
```

## 🔧 Yapılandırma

### Browser Ayarları

`src/config.js` dosyasında browser ayarlarını özelleştirebilirsiniz:

```javascript
browser: {
    headless: process.env.HEADLESS !== 'false',
    defaultViewport: { width: 1280, height: 720 },
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        // ... diğer ayarlar
    ]
}
```

### Rezervasyon Ayarları

```javascript
reservation: {
    preferredTimes: ['09:00', '10:00', '11:00', '19:00', '20:00'],
    daysAhead: 7,
    maxRetries: 3,
    retryDelay: 2000
}
```

## 🐛 Sorun Giderme

### Yaygın Sorunlar

1. **Chrome/Chromium kurulumu:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y chromium-browser

# CentOS/RHEL
sudo yum install -y chromium
```

2. **Process yönetimi:**
```bash
# Çalışan process'leri görüntüle
ps aux | grep node

# Process'i durdur
kill <process_id>

# Arka planda çalıştır
nohup npm run scheduler:prod > bot.log 2>&1 &
```

3. **SMS Doğrulama Sorunları:**
- Bot test modunda SMS doğrulamayı atlar
- Gerçek modda Telegram üzerinden SMS kodunu bekler
- 5 dakika timeout süresi vardır

## 📝 Log Dosyaları

Bot çalışırken detaylı loglar oluşturur:
- Console çıktısı
- Telegram bildirimleri
- Hata mesajları

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje ISC lisansı altında lisanslanmıştır.

## 📞 Destek

Sorunlarınız için GitHub Issues kullanın veya Telegram üzerinden iletişime geçin. 