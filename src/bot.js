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
        
        // Viewport ayarla (GitHub Actions için önemli)
        await this.page.setViewport({ width: 1280, height: 720 });
        
        // User agent ayarla
        await this.page.setUserAgent(
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
        
        // Extra headers ekle
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        });
        
        console.log('✅ Browser hazır!');
    }

    // Giriş yap
    async login() {
        try {
            console.log('🔐 Giriş yapılıyor...');
            
            // Sayfaya git ve daha esnek bekleme stratejisi kullan
            await this.page.goto(config.urls.login, { 
                waitUntil: 'domcontentloaded',
                timeout: 60000 
            });
            
            // Sayfanın tamamen yüklenmesi için ek bekleme
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Sayfa içeriğini kontrol et
            const pageContent = await this.page.content();
            console.log('📄 Sayfa yüklendi, içerik uzunluğu:', pageContent.length);
            
            // Element'in var olup olmadığını kontrol et
            const tcInputExists = await this.page.$(config.selectors.login.tcInput);
            if (!tcInputExists) {
                console.log('❌ TC Input elementi bulunamadı, sayfa içeriği kontrol ediliyor...');
                const bodyText = await this.page.evaluate(() => document.body.innerText);
                console.log('📄 Sayfa metni:', bodyText.substring(0, 200) + '...');
                throw new Error('Login formu yüklenemedi');
            }
            
            // Element'i bekle (daha uzun timeout ile)
            await this.page.waitForSelector(config.selectors.login.tcInput, { 
                timeout: 60000,
                visible: true 
            });
            
            // TC Kimlik girişi
            await this.page.type(config.selectors.login.tcInput, config.credentials.tcKimlik, { delay: 100 });
            
            // Şifre girişi
            await this.page.type(config.selectors.login.passwordInput, config.credentials.sifre, { delay: 100 });
            
            // Kısa bekle (insan gibi davran)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Login butonuna tıkla
            await this.page.click(config.selectors.login.loginButton);
            
            // Giriş sonrası sayfanın yüklenmesini bekle (daha esnek)
            try {
                await this.page.waitForNavigation({ 
                    waitUntil: 'domcontentloaded',
                    timeout: 60000 
                });
            } catch (navError) {
                console.log('⚠️ Navigation timeout, sayfa kontrol ediliyor...');
                // Sayfanın yüklenmesi için ek bekleme
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            // Giriş kontrolü - eğer hala login sayfasındaysak hata var
            const currentUrl = this.page.url();
            console.log('📍 Giriş sonrası URL:', currentUrl);
            
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
                waitUntil: 'domcontentloaded',
                timeout: 60000 
            });
            
            // Sayfanın tamamen yüklenmesi için ek bekleme
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            console.log('📋 Seanslar sayfasına gidildi');
            console.log('📍 Şu anki URL:', this.page.url());
            
            // "Seans Seç" butonunu bul ve tıkla
            try {
                await this.page.waitForSelector('[id*="lbtnSeansSecim"]', { 
                    timeout: 10000,
                    visible: true 
                });
                console.log('🎯 Seans Seç butonu bulundu');
                
                await this.page.click('[id*="lbtnSeansSecim"]');
                console.log('✅ Seans Seç butonuna tıklandı');
                
                // Rezervasyon sayfası yüklenmesini bekle (daha esnek)
                try {
                    await this.page.waitForNavigation({ 
                        waitUntil: 'domcontentloaded',
                        timeout: 60000 
                    });
                } catch (navError) {
                    console.log('⚠️ Navigation timeout, sayfa kontrol ediliyor...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
                
            } catch (error) {
                console.log('⚠️ Seans Seç butonu bulunamadı:', error.message);
                // Sayfa içeriğini kontrol et
                const bodyText = await this.page.evaluate(() => document.body.innerText);
                console.log('📄 Sayfa metni:', bodyText.substring(0, 200) + '...');
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
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Seans seçimi yap
            try {
                console.log('🔍 Uygun seans aranıyor...');
                await this.sendNotification('🔍 Uygun seans aranıyor...');

                // Seans checkbox'ını bul (daha uzun timeout ile)
                const seansCheckbox = await this.page.waitForSelector('input[type="checkbox"][id*="cboxSeans"]', {
                    timeout: 10000,
                    visible: true
                });

                if (seansCheckbox) {
                    // Checkbox'a tıkla
                    await seansCheckbox.click();
                    console.log('✅ Seans seçildi');
                    await this.sendNotification('✅ Seans seçildi');

                    // Sayfa yenilenmesini bekle (checkbox tıklanınca sayfa yenilenebilir)
                    await new Promise(resolve => setTimeout(resolve, 3000));
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
                        const checkbox = await this.page.waitForSelector(selector, { 
                            timeout: 5000,
                            visible: true 
                        });
                        if (checkbox) {
                            await checkbox.click();
                            console.log(`✅ BAŞARILI! Onay checkbox bulundu ve tıklandı: ${selector}`);
                            console.log(`📊 Selector sırası: ${i + 1}/${checkboxSelectors.length}`);
                            await this.sendNotification(`✅ Rezervasyon onaylandı (${selector})`);
                            checkboxFound = true;
                            break;
                        }
                    } catch (selectorError) {
                        console.log(`❌ Selector başarısız: ${selector} - ${selectorError.message}`);
                        continue;
                    }
                }
                
                if (!checkboxFound) {
                    throw new Error('Onay checkbox\'ı bulunamadı');
                }
                
                // Checkbox tıklanması sonrası kısa bekleme
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error('❌ Onay checkbox hatası:', error.message);
                await this.sendNotification('❌ Onay checkbox hatası: ' + error.message);
                return false;
            }
            
            // Kaydet butonunu bul ve tıkla
            try {
                const buttonSelectors = [
                    '[id*="btnKaydet"]',
                    'input[type="submit"][value*="Kaydet"]',
                    'button[type="submit"]',
                    'input[type="button"][value*="Kaydet"]'
                ];
                
                let buttonFound = false;
                for (let i = 0; i < buttonSelectors.length; i++) {
                    const selector = buttonSelectors[i];
                    try {
                        console.log(`🔍 Kaydet butonu deneniyor: ${selector}`);
                        const button = await this.page.waitForSelector(selector, { 
                            timeout: 5000,
                            visible: true 
                        });
                        if (button) {
                            await button.click();
                            console.log(`✅ BAŞARILI! Kaydet butonu bulundu ve tıklandı: ${selector}`);
                            console.log(`📊 Selector sırası: ${i + 1}/${buttonSelectors.length}`);
                            await this.sendNotification(`✅ Kaydet butonuna tıklandı (${selector})`);
                            buttonFound = true;
                            break;
                        }
                    } catch (selectorError) {
                        console.log(`❌ Kaydet butonu selector başarısız: ${selector} - ${selectorError.message}`);
                        continue;
                    }
                }
                
                if (!buttonFound) {
                    throw new Error('Kaydet butonu bulunamadı');
                }
                
            } catch (error) {
                console.error('❌ Kaydet butonu hatası:', error.message);
                await this.sendNotification('❌ Kaydet butonu hatası: ' + error.message);
                return false;
            }
            
            // SMS doğrulama kontrolü
            try {
                console.log('📱 SMS doğrulama kodu gerekiyor...');
                
                // SMS kodu input alanını bekle (birden fazla selector dene)
                const smsSelectors = [
                    'input[type="text"][id*="txtSmsKod"]',
                    'input[type="text"][id*="txtDogrulamaKodu"]',
                    '#pageContent_txtDogrulamaKodu',
                    'input[type="text"][name*="sms"]',
                    'input[type="text"][name*="kod"]'
                ];
                
                let smsInputFound = false;
                let smsInputSelector = null;
                
                for (const selector of smsSelectors) {
                    try {
                        console.log(`🔍 SMS input deneniyor: ${selector}`);
                        await this.page.waitForSelector(selector, { 
                            timeout: 5000,
                            visible: true 
                        });
                        smsInputFound = true;
                        smsInputSelector = selector;
                        console.log(`✅ SMS input bulundu: ${selector}`);
                        break;
                    } catch (error) {
                        console.log(`❌ SMS input bulunamadı: ${selector}`);
                        continue;
                    }
                }
                
                if (!smsInputFound) {
                    console.log('⚠️ SMS input bulunamadı, sayfa içeriği kontrol ediliyor...');
                    const bodyText = await this.page.evaluate(() => document.body.innerText);
                    console.log('📄 Sayfa metni:', bodyText.substring(0, 300) + '...');
                    
                    // Test modunda ise devam et, gerçek modda hata ver
                    if (process.argv.includes('--test')) {
                        console.log('🧪 Test modu: SMS doğrulama atlanıyor...');
                        await this.sendNotification('🧪 Test modu: SMS doğrulama atlandı');
                        return true;
                    } else {
                        throw new Error('SMS doğrulama alanı bulunamadı');
                    }
                }
                
                // SMS kodunu bekle
                const smsCode = await this.waitForVerificationCode();
                
                // SMS kodunu gir
                await this.page.type(smsInputSelector, smsCode, { delay: 100 });
                console.log('✅ Doğrulama kodu girildi');
                await this.sendNotification('✅ Doğrulama kodu girildi');
                
                // Doğrula butonunu bul ve tıkla
                const doğrulaSelectors = [
                    'input[type="button"][value*="Doğrula"]',
                    'input[type="submit"][value*="Doğrula"]',
                    '#btnCepTelDogrulamaGonder',
                    'button[type="submit"]',
                    'input[type="button"][id*="btnDogrula"]'
                ];
                
                let doğrulaButtonFound = false;
                for (const selector of doğrulaSelectors) {
                    try {
                        console.log(`🔍 Doğrula butonu deneniyor: ${selector}`);
                        await this.page.waitForSelector(selector, { 
                            timeout: 3000,
                            visible: true 
                        });
                        await this.page.click(selector);
                        console.log(`✅ Doğrula butonuna tıklandı: ${selector}`);
                        doğrulaButtonFound = true;
                        break;
                    } catch (error) {
                        console.log(`❌ Doğrula butonu bulunamadı: ${selector}`);
                        continue;
                    }
                }
                
                if (!doğrulaButtonFound) {
                    console.log('⚠️ Doğrula butonu bulunamadı, manuel tıklama deneniyor...');
                    // Sayfadaki tüm butonları bul ve doğrula içereni tıkla
                    const buttons = await this.page.$$('input[type="button"], button');
                    for (const button of buttons) {
                        const text = await button.evaluate(el => el.value || el.textContent);
                        if (text && text.toLowerCase().includes('doğrula')) {
                            await button.click();
                            console.log('✅ Doğrula butonu manuel olarak tıklandı');
                            doğrulaButtonFound = true;
                            break;
                        }
                    }
                }
                
                if (doğrulaButtonFound) {
                    await this.sendNotification('✅ Doğrulama kodu gönderildi');
                } else {
                    await this.sendNotification('⚠️ Doğrula butonu bulunamadı, manuel kontrol gerekebilir');
                }
                
                // İşlem sonucunu bekle
                await new Promise(resolve => setTimeout(resolve, 5000));
                
            } catch (error) {
                console.error('❌ SMS doğrulama hatası:', error.message);
                
                // Test modunda ise devam et
                if (process.argv.includes('--test')) {
                    console.log('🧪 Test modu: SMS doğrulama hatası atlanıyor...');
                    await this.sendNotification('🧪 Test modu: SMS doğrulama hatası atlandı');
                    return true;
                } else {
                    await this.sendNotification('❌ SMS doğrulama hatası: ' + error.message);
                    return false;
                }
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
