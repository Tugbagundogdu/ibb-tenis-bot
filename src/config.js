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
        headless: process.env.HEADLESS !== 'false', // Default true (GitHub'da headless çalışır)
        defaultViewport: { width: 1280, height: 720 },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // GitHub Actions için önemli
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-field-trial-config',
            '--disable-ipc-flooding-protection',
            '--disable-hang-monitor',
            '--disable-prompt-on-repost',
            '--disable-client-side-phishing-detection',
            '--disable-component-extensions-with-background-pages',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--mute-audio',
            '--no-default-browser-check',
            '--safebrowsing-disable-auto-update',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--mute-audio',
            '--no-first-run',
            '--safebrowsing-disable-auto-update',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors',
            '--ignore-certificate-errors-spki-list',
            '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreHTTPSErrors: true,
        timeout: 60000
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