require('dotenv').config();

const config = {
    // Kullanıcı bilgileri
    credentials: {
        tcKimlik: process.env.TC_KIMLIK,
        sifre: process.env.SIFRE
    },

  // Telegram ayarları
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    verificationTimeout: 300000 // 5 dakika
},

    // Site URL'leri
    urls: {
        login: 'https://online.spor.istanbul/uyegiris',
        base: 'https://online.spor.istanbul'
    },

    // Browser ayarları
    browser: {
        headless: process.env.HEADLESS === 'true',
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox']
    },

    // Rezervasyon ayarları
    reservation: {
        // Hangi saatleri dene (öncelik sırasına göre)
        preferredTimes: ['09:00', '10:00', '11:00', '19:00', '20:00'],
        
        // Hangi günler için rezervasyon yap
        daysAhead: 7, // Bugünden kaç gün sonrası için
        
        // Retry ayarları
        maxRetries: 3,
        retryDelay: 2000, // ms
    },

    // Zamanlama
    schedule: {
        // Her gün saat 21:00'da rezervasyon açılıyor
        // 30 saniye önceden hazır ol
        cronExpression: '30 59 20 * * *', // 20:59:30
        timezone: 'Europe/Istanbul'
    },

    // Selectors (HTML elementleri)
    selectors: {
        login: {
            tcInput: '#txtTCPasaport',
            passwordInput: '#txtSifre', 
            loginButton: '#btnGirisYap'
        },
        // Bunları rezervasyon sayfasını görünce tamamlayacağız
        reservation: {
            // dateSelector: '[data-date]',
            // timeSelector: '[data-time]', 
            // courtSelector: '[data-court]',
            // confirmButton: '#confirmReservation'
        }
    }
};

module.exports = config;