# İBB Tenis Rezervasyon Botu

Bu bot, İstanbul Büyükşehir Belediyesi (İBB) spor tesislerinde otomatik tenis rezervasyonu yapmak için geliştirilmiştir.

## Özellikler

- 🤖 **Otomatik Rezervasyon**: Puppeteer ile web sitesinde otomatik işlem
- 📱 **Telegram Entegrasyonu**: Bot durumu ve bildirimler Telegram üzerinden
- 🔐 **SMS Doğrulama**: Güvenlik için SMS kodunu Telegram üzerinden alma
- ⏰ **Zamanlanmış Çalışma**: Cron ile otomatik çalışma
- 🧪 **Test Modu**: Hemen test edebilme

## Kurulum

### Gereksinimler

- Node.js 18+
- npm veya yarn
- Chrome/Chromium browser

### Adımlar

1. **Projeyi klonlayın:**
```bash
git clone <repository-url>
cd ibb-tenis-bot
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **Environment değişkenlerini ayarlayın:**
`.env` dosyası oluşturun:
```env
TC_KIMLIK=your_tc_kimlik
SIFRE=your_password
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
HEADLESS=true
```

## Kullanım

### Lokal Çalıştırma

```bash
# Normal mod (Telegram komutlarını bekler)
npm start

# Geliştirme modu (nodemon ile)
npm run dev

# Test modu (hemen çalışır)
npm test
```

### GitHub Actions

GitHub Actions'da çalıştırmak için:

1. **Repository Secrets** ayarlayın:
   - `TC_KIMLIK`: TC Kimlik numaranız
   - `SIFRE`: Şifreniz
   - `TELEGRAM_BOT_TOKEN`: Telegram bot token'ınız
   - `TELEGRAM_CHAT_ID`: Telegram chat ID'niz

2. **Workflow tetikleyin:**
   - Push yapın veya
   - Pull Request oluşturun veya
   - Manuel olarak "Actions" sekmesinden tetikleyin

## Telegram Komutları

Bot çalışırken şu komutları kullanabilirsiniz:

- `/test` - Bot durumunu kontrol et
- `/ping` - Ping/Pong testi
- `/rezervasyon` - Rezervasyon işlemini başlat

## GitHub Actions Sorun Giderme

### Yaygın Hatalar

1. **"waiting for selector failed" hatası:**
   - Browser ayarları optimize edildi
   - Timeout süreleri artırıldı
   - Daha esnek navigation stratejisi kullanıldı

2. **Navigation timeout hatası:**
   - `networkidle0` yerine `domcontentloaded` kullanıldı
   - Ek bekleme süreleri eklendi
   - Hata yakalama mekanizmaları geliştirildi

3. **Element bulunamama:**
   - Multiple selector stratejisi
   - Sayfa içeriği kontrolü
   - Detaylı hata logları

### Debug İpuçları

- GitHub Actions loglarını kontrol edin
- Sayfa içeriği uzunluğunu takip edin
- URL değişikliklerini izleyin
- Element bulma süreçlerini takip edin

## Yapılandırma

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

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## Lisans

Bu proje ISC lisansı altında lisanslanmıştır.

## Destek

Sorunlarınız için GitHub Issues kullanın veya Telegram üzerinden iletişime geçin. 