const puppeteer = require('puppeteer');
const cron = require('node-cron');
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');

class IBBTenisBot {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isRunning = false;
        this.telegramBot = new TelegramBot(config.telegram.token, { polling: true });
        this.setupTelegramBot();
        this.verificationCode = null;
        this.verificationPromise = null;
    }

    // Telegram bot kurulumu
    setupTelegramBot() {
        // Test mesajı için handler
        this.telegramBot.onText(/\/test/, async (msg) => {
            const chatId = msg.chat.id.toString();
            if (chatId === config.telegram.chatId) {
                await this.telegramBot.sendMessage(chatId, '✅ Bot çalışıyor!\n\nChat ID: ' + chatId);
            }
        });

        // Ping komutu için handler
        this.telegramBot.onText(/\/ping/, async (msg) => {
            const chatId = msg.chat.id.toString();
            if (chatId === config.telegram.chatId) {
                await this.telegramBot.sendMessage(chatId, '🏓 Pong!');
            }
        });

        // Rezervasyon başlat komutu
        this.telegramBot.onText(/\/rezervasyon/, async (msg) => {
            const chatId = msg.chat.id.toString();
            if (chatId === config.telegram.chatId) {
                await this.sendNotification('🎯 Rezervasyon işlemi başlatılıyor...');
                await this.runReservation();
            }
        });

        // Doğrulama kodu handler'ı
        this.telegramBot.onText(/^(\d{4,6})$/, async (msg, match) => {
            const chatId = msg.chat.id.toString();
            if (chatId === config.telegram.chatId && this.verificationPromise) {
                const code = match[1];
                this.verificationCode = code;
                this.verificationPromise.resolve(code);
                await this.telegramBot.sendMessage(chatId, '✅ Doğrulama kodu alındı: ' + code);
            }
        });

        // Bot başladığında bildirim gönder
        this.sendNotification('🚀 Bot başlatıldı ve Telegram bağlantısı kuruldu!\n\n💡 Komutlar:\n/test - Bot durumunu kontrol et\n/ping - Ping/Pong testi\n/rezervasyon - Rezervasyon işlemini başlat');
        
        console.log('✅ Telegram bot hazır!');
        console.log('📱 Chat ID:', config.telegram.chatId);
    }

    // Doğrulama kodunu bekle
    async waitForVerificationCode() {
        console.log('📱 SMS doğrulama kodu bekleniyor...');
        await this.sendNotification('🔐 Lütfen telefonunuza gelen SMS kodunu Telegram\'a gönderin...');

        return new Promise((resolve, reject) => {
            this.verificationPromise = { resolve, reject };

            // Timeout kontrolü
            setTimeout(() => {
                if (this.verificationPromise) {
                    this.verificationPromise.reject(new Error('Doğrulama kodu zaman aşımına uğradı'));
                    this.verificationPromise = null;
                }
            }, 300000); // 5 dakika timeout
        });
    }

    // Browser'ı başlat
    async init() {
        console.log('🚀 Bot başlatılıyor...');
        this.browser = await puppeteer.launch(config.browser);
        this.page = await this.browser.newPage();
        
        // User agent ayarla
        await this.page.setUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        
        console.log('✅ Browser hazır!');
    }

    // Giriş yap
    async login() {
        try {
            console.log('🔐 Giriş yapılıyor...');
            await this.page.goto(config.urls.login, { waitUntil: 'networkidle2' });

            // TC Kimlik No gir
            await this.page.waitForSelector(config.selectors.login.tcInput);
            await this.page.type(config.selectors.login.tcInput, config.credentials.tcKimlik);
            
            // Şifre gir
            await this.page.type(config.selectors.login.passwordInput, config.credentials.sifre);
            
            // Kısa bekle (insan gibi davran)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Giriş yap butonuna tıkla
            await this.page.click(config.selectors.login.loginButton);
            
            // Giriş sonrası sayfanın yüklenmesini bekle
            await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
            
            // Giriş kontrolü - eğer hala login sayfasındaysak hata var
            const currentUrl = this.page.url();
            if (currentUrl.includes('uyegiris')) {
                throw new Error('Giriş bilgileri yanlış veya giriş başarısız');
            }
            
            console.log('✅ Giriş başarılı!');
            await this.sendNotification('✅ Giriş başarılı!');
            return true;
        } catch (error) {
            console.error('❌ Giriş hatası:', error.message);
            await this.sendNotification('❌ Giriş hatası: ' + error.message);
            return false;
        }
    }

    // Seanslar sayfasına git ve Veledrom seç
    async navigateToVeledrom() {
        try {
            console.log('🚲 Seanslar sayfasına gidiliyor...');
            await this.sendNotification('🚲 Seanslar sayfasına gidiliyor...');
            
            // Direkt URL ile git
            await this.page.goto('https://online.spor.istanbul/uyespor.aspx', { 
                waitUntil: 'networkidle2' 
            });
            
            console.log('📋 Seanslar sayfasına gidildi');
            console.log('📍 Şu anki URL:', this.page.url());
            
            // "Seans Seç" butonunu bul ve tıkla
            try {
                await this.page.waitForSelector('[id*="lbtnSeansSecim"]', { timeout: 5000 });
                console.log('🎯 Seans Seç butonu bulundu');
                
                await this.page.click('[id*="lbtnSeansSecim"]');
                console.log('✅ Seans Seç butonuna tıklandı');
                
                // Rezervasyon sayfası yüklenmesini bekle
                await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
                
            } catch (error) {
                console.log('⚠️ Seans Seç butonu bulunamadı:', error.message);
                return false;
            }
            
            console.log('🚲 Veledrom rezervasyon sayfasına ulaşıldı!');
            console.log('📍 Final URL:', this.page.url());
            
            return true;
        } catch (error) {
            console.error('❌ Veledrom sayfasına gitme hatası:', error.message);
            return false;
        }
    }

    // Rezervasyon yap
    async makeReservation() {
        try {
            console.log('📅 Rezervasyon işlemi başlatılıyor...');
            await this.sendNotification('📅 Rezervasyon işlemi başlatılıyor...');
            
            // Sayfanın yüklenmesini bekle
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Seans seçimi yap
            try {
                console.log('🔍 Uygun seans aranıyor...');
                await this.sendNotification('🔍 Uygun seans aranıyor...');

                // Seans checkbox'ını bul
                const seansCheckbox = await this.page.waitForSelector('input[type="checkbox"][id*="cboxSeans"]', {
                    timeout: 200
                });

                if (seansCheckbox) {
                    // Checkbox'a tıkla
                    await seansCheckbox.click();
                    console.log('✅ Seans seçildi');
                    await this.sendNotification('✅ Seans seçildi');

                    // Sayfa yenilenmesini bekle (checkbox tıklanınca sayfa yenilenebilir)
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    throw new Error('Uygun seans bulunamadı');
                }
            } catch (error) {
                console.error('❌ Seans seçme hatası:', error.message);
                await this.sendNotification('❌ Seans seçme hatası: ' + error.message);
                return false;
            }
            
            // "Rezervasyon işlemimi onaylıyorum" checkbox'ını bul ve işaretle
            try {
                const checkboxSelectors = [
                    'input[type="checkbox"]',
                    'input[type="checkbox"][id*="chkOnay"]',
                ];
                
                let checkboxFound = false;
                for (let i = 0; i < checkboxSelectors.length; i++) {
                    const selector = checkboxSelectors[i];
                    try {
                        console.log(`🔍 Deneniyor: ${selector}`);
                        const checkbox = await this.page.waitForSelector(selector, { timeout: 1500 });
                        if (checkbox) {
                            await checkbox.click();
                            console.log(`✅ BAŞARILI! Onay checkbox bulundu ve tıklandı: ${selector}`);
                            console.log(`📊 Selector sırası: ${i + 1}/${checkboxSelectors.length}`);
                            await this.sendNotification(`✅ Rezervasyon onaylandı (${selector})`);
                            checkboxFound = true;
                            break;
                        }
                    } catch (error) {
                        console.log(`❌ Başarısız: ${selector} - ${error.message}`);
                        continue;
                    }
                }
                
                if (!checkboxFound) {
                    console.log('⚠️ Hiçbir onay kutusu bulunamadı');
                    await this.sendNotification('⚠️ Onay kutusu bulunamadı');
                    return false;
                }
            } catch (error) {
                console.log('⚠️ Checkbox işleme hatası:', error.message);
                await this.sendNotification('❌ Onay kutusu hatası: ' + error.message);
                return false;
            }

            // Kaydet butonunu bul ve tıkla
            try {
                const saveButtonSelectors = [
                    '[id*="btnKaydet"]',
                    'input[type="submit"][value*="Kaydet"]',
                ];
                
                 let saveButtonFound = false;
    for (let i = 0; i < saveButtonSelectors.length; i++) {
        const selector = saveButtonSelectors[i];
        try {
            console.log(`🔍 Kaydet butonu deneniyor: ${selector}`);
            const saveButton = await this.page.waitForSelector(selector, { timeout: 1500 });
            if (saveButton) {
                await saveButton.click();
                console.log(`✅ BAŞARILI! Kaydet butonu bulundu ve tıklandı: ${selector}`);
                console.log(`📊 Selector sırası: ${i + 1}/${saveButtonSelectors.length}`);
                await this.sendNotification(`✅ Kaydet butonuna tıklandı (${selector})`);
                saveButtonFound = true;
                break;
            }
        } catch (error) {
            console.log(`❌ Başarısız: ${selector} - ${error.message}`);
            continue;
        }
    }
    
    if (!saveButtonFound) {
        console.log('⚠️ Kaydet butonu bulunamadı');
        await this.sendNotification('⚠️ Kaydet butonu bulunamadı');
        return false;
    }
} catch (error) {
    console.log('❌ Kaydet butonu hatası:', error.message);
    await this.sendNotification('❌ Kaydet butonu hatası: ' + error.message);
    return false;
}

            // SMS Doğrulama kodu alanını bekle
            try {
                // Doğrulama kodu input'unu bekle
                await this.page.waitForSelector('#pageContent_txtDogrulamaKodu', { timeout: 5000 });
                console.log('📱 SMS doğrulama kodu gerekiyor...');

                // Telegram'dan kodu bekle
                const verificationCode = await this.waitForVerificationCode();

                // Kodu gir
                await this.page.type('#pageContent_txtDogrulamaKodu', verificationCode);
                console.log('✅ Doğrulama kodu girildi');
                await this.sendNotification('✅ Doğrulama kodu girildi');

                // Doğrula butonuna tıkla
                await this.page.click('#btnCepTelDogrulamaGonder');
                console.log('✅ Doğrula butonuna tıklandı');
                await this.sendNotification('✅ Doğrulama kodu gönderildi');

                // Sayfanın yüklenmesini bekle
                await new Promise(resolve => setTimeout(resolve, 3000));

            } catch (error) {
                console.error('❌ SMS doğrulama hatası:', error.message);
                await this.sendNotification('❌ SMS doğrulama hatası: ' + error.message);
                return false;
            }
            
            // İşlem sonrası bekle
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            return true;
            
        } catch (error) {
            console.error('❌ Rezervasyon hatası:', error.message);
            await this.sendNotification('❌ Rezervasyon hatası: ' + error.message);
            return false;
        }
    }

    // Ana rezervasyon işlemi
    async runReservation() {
        if (this.isRunning) {
            console.log('⚠️ Bot zaten çalışıyor, yeni işlem başlatılmadı');
            await this.sendNotification('⚠️ Bot zaten çalışıyor, yeni işlem başlatılmadı');
            return;
        }

        this.isRunning = true;
        
        try {
            await this.init();
            
            const loginSuccess = await this.login();
            if (!loginSuccess) {
                throw new Error('Giriş yapılamadı');
            }
            
            const navigationSuccess = await this.navigateToVeledrom();
            if (!navigationSuccess) {
                throw new Error('Veledrom sayfasına ulaşılamadı');
            }
            
            const reservationSuccess = await this.makeReservation();
            
            if (reservationSuccess) {
                console.log('🎊 Rezervasyon başarılı!');
                await this.sendNotification('✅ Veledrom rezervasyonu başarıyla yapıldı! 🚲');
            } else {
                console.log('😞 Rezervasyon yapılamadı');
                await this.sendNotification('❌ Rezervasyon yapılamadı 😞');
            }
            
        } catch (error) {
            console.error('❌ Genel hata:', error.message);
            await this.sendNotification(`🚨 Bot hatası: ${error.message}`);
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
            this.isRunning = false;
        }
    }

    // Bildirim gönder (Telegram ile)
    async sendNotification(message) {
        console.log(`📢 ${new Date().toLocaleString('tr-TR')}: ${message}`);
        try {
            await this.telegramBot.sendMessage(config.telegram.chatId, message);
        } catch (error) {
            console.error('❌ Telegram mesaj hatası:', error.message);
        }
    }

    // Test için hemen çalıştır
    async testRun() {
        console.log('🧪 Test modu - Bot hemen çalışacak\n');
        await this.runReservation();
    }
}

// Bot'u başlat
const bot = new IBBTenisBot();

// Komut satırı argümanlarını kontrol et
const args = process.argv.slice(2);

if (args.includes('--test')) {
    // Test modu
    bot.testRun();
} else {
    // Normal mod - Telegram komutlarını bekle
    bot.sendNotification('👋 Bot başlatıldı ve komutlarınızı bekliyor!\n\n💡 Komutlar:\n/test - Bot durumunu kontrol et\n/ping - Ping/Pong testi\n/rezervasyon - Rezervasyon işlemini başlat');
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n👋 Bot durduruluyor...');
    if (bot.telegramBot) {
        await bot.sendNotification('🔴 Bot kapatılıyor...');
        bot.telegramBot.stopPolling();
    }
    process.exit(0);
});
