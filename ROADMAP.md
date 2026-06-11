# Roadmap

Bu yol haritasi, mevcut TA RSS uygulamasini server zorunlulugu olmayan, Railway destekli ve browser-first bir surume tasimak icin hazirlandi.

## Faz 0 - Plan ve Karar Kaydi

Durum: Baslatildi

Hedefler:

- Yeni projenin hedef mimarisini netlestirmek.
- Hangi ozelliklerin tasinacagini, hangilerinden vazgecilecegini yazmak.
- Repo temizligini saglamak.
- Ilk commit ile README ve yol haritasini GitHub'a gondermek.

Cikti:

- `README.md`
- `ROADMAP.md`
- Temiz `.gitignore`

## Faz 1 - Minimal Railway Uygulama Iskeleti

Hedef:

- Tek repo icinde frontend ve backend iskeletini kurmak.
- Railway'de calisabilecek minimal Node.js uygulamasi hazirlamak.
- Lokal calistirma komutlarini netlestirmek.

Plan:

- `package.json`
- `src/server.js`
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `GET /health`
- Static frontend servis etme
- Mevcut TA RSS arayuzunden renk, spacing, buton ve kart stillerini tasima icin UI envanteri cikarma

Kabul kriteri:

- `npm run dev` ile lokal uygulama acilir.
- `/health` 200 doner.
- Railway deploy icin temel dosyalar hazirdir.

## Faz 2 - IndexedDB Veri Katmani

Hedef:

- Kullanici verisini tarayicida saklayan temel veri katmanini kurmak.

Plan:

- IndexedDB wrapper
- Store versiyonlama
- Varsayilan ayarlar
- JSON export/import
- Veri sifirlama araci

Kabul kriteri:

- RSS kaynaklari tarayicida kaydedilir ve sayfa yenilenince kalir.
- Ayarlar JSON olarak disa aktarilip geri yuklenebilir.

## Faz 3 - RSS Kaynaklari ve Railway RSS Proxy

Hedef:

- RSS kaynaklarini browser UI'dan yonetmek.
- CORS sorunlarini Railway backend ile asmak.

Plan:

- RSS kaynak ekle/sil/duzenle
- `POST /api/rss/test`
- `POST /api/rss/fetch`
- Feed parse ve normalize
- Kaynak bazli hata raporu

Kabul kriteri:

- Kullanici RSS kaynaklarini kaydeder.
- "RSS cek" islemi haberleri IndexedDB'ye yazar.
- CORS engelli feed'ler backend uzerinden cekilebilir.

## Faz 4 - AI Skorlama Proxy

Hedef:

- AI key'i frontend'e koymadan haber skorlamak.

Plan:

- Railway env: `GEMINI_API_KEY` veya alternatif provider key
- `POST /api/ai/score`
- `POST /api/ai/score-batch`
- Kategori ve blacklist prompt tasarimi
- Skor sonucunu IndexedDB `scoreCache` icine yazma
- Kota/model/JSON parse hatalarini UI'da acik gostermek

Kabul kriteri:

- Secili haber veya batch haberler skorlanir.
- Skor cache tekrar cagriyi azaltir.
- API hatalari sessizce yutulmaz.

## Faz 5 - Bulten Hazirlama

Hedef:

- Skorlanan haberlerden tek bulten taslagi olusturmak.

Plan:

- Haber filtreleme ve siralama
- Manuel secim
- Kategori bazli gruplama
- Bulten basligi, giris metni ve gorsel ayarlari
- HTML onizleme

Kabul kriteri:

- Kullanici bultene girecek haberleri secer.
- Bulten onizlemesi tarayicida dogru gorunur.

## Faz 5.5 - UI Parity

Hedef:

- Railway surumunun mevcut TA RSS arayuzune mumkun oldugunca yakin hissettirmesini saglamak.

Plan:

- Eski `admin.html` uzerinden renk paleti, kart yapilari ve workflow adimlarini referans almak
- RSS kaynaklari, AI skorlama, secim ve bulten onizleme ekranlarini ayni zihinsel modelle tasarlamak
- Kullanici metinlerini ve aksiyon adlarini mevcut uygulamayla uyumlu tutmak

Kabul kriteri:

- Mevcut kullanici Railway surumunde temel akisi yeniden ogrenmeden tamamlayabilir.

## Faz 6 - EML Uretimi

Hedef:

- Toplu gonderim yerine tek `.eml` dosyasi uretmek.

Plan:

- MIME/EML builder
- HTML body
- Plain text fallback
- Inline veya remote image stratejisi
- `.eml` download

Kabul kriteri:

- Kullanici tek tikla `.eml` indirir.
- EML Outlook'ta acilir ve manuel gonderime hazir olur.

## Faz 7 - Railway Deploy

Hedef:

- Uygulamayi GitHub baglantili Railway auto deploy ile yayinlamak.

Plan:

- Railway projesini GitHub reposuna baglama
- `main` branch auto deploy
- Environment variables
- Health check
- Domain/URL dogrulama

Kabul kriteri:

- Uygulama public Railway URL uzerinden acilir.
- RSS ve AI proxy endpointleri Railway'de calisir.
- GitHub `main` branch'e push sonrasi Railway deploy otomatik baslar.

## Faz 8 - Sertlestirme

Hedef:

- Gunluk kullanim icin hata toleransi ve veri guvenligini artirmak.

Plan:

- UI hata durumlari
- Rate limit ve timeout yonetimi
- Import/export geri uyumlulugu
- Basit telemetry/log
- IndexedDB migration testleri
- EML render testleri

Kabul kriteri:

- Kullanici veri kaybetmeden surum guncelleyebilir.
- RSS/AI hatalari anlasilir mesajlarla gorunur.

## Faz 9 - Opsiyonel Cloud Sync

Hedef:

- IndexedDB varsayilanini bozmadan, isteyen kullanicilar icin Railway DB tabanli hesapli mod eklemek.

Plan:

- Railway Postgres veya uygun Railway DB servisini secmek
- Kullanici yonetimi ve session mimarisi belirlemek
- Kullanici bazli RSS kaynaklari, ayarlar, kategoriler, blacklist ve skor cache saklamak
- Local Mode ile Cloud Sync Mode arasinda export/import veya sync akisi tasarlamak
- Veri izolasyonu, backup, migration ve silme politikalarini netlestirmek

Kabul kriteri:

- Login olan kullanici farkli cihazdan kendi ayarlarini gorebilir.
- Login olmayan kullanici Local Mode ile uygulamayi kullanmaya devam edebilir.
- Cloud Sync, ilk surumun server'siz kullanim kolayligini bozmaz.

## Faz 10 - Outlook Sender Companion

Hedef:

- Railway web uygulamasini toplu gonderim karmasikligindan uzak tutarken, ihtiyac duyan kullanicilar icin Windows/Outlook uzerinden kisiye ozel gonderim yapan ayri bir helper sunmak.

Fikir:

- Kullanici Railway web uygulamasinda bulteni hazirlar ve `.eml` olarak indirir.
- Kullanici ayri Python tabanli desktop helper'i acar.
- Helper `.eml` dosyasini import eder.
- Kullanici Excel/CSV alici listesini yukler.
- Helper Outlook COM uzerinden her alici icin isme ozel mail olusturur ve gonderir veya taslak olarak kaydeder.

Plan:

- `.eml` parse ve HTML body okuma
- Excel/CSV alici listesi import
- Kisiye ozel alanlar: ad, soyad, e-posta, opsiyonel segment
- Outlook COM entegrasyonu
- Test gonderimi
- Taslak olusturma modu
- Gonderim raporu CSV
- Hata durumunda kaldigi yerden devam etme

Kabul kriteri:

- Web uygulamasi toplu gonderim ozelligi tasimaz.
- Helper, kullanicinin kendi Outlook hesabindan kisiye ozel gonderim yapabilir.
- Kullanicinin EML ve alici listesi lokal makinede kalir.
- Gonderim oncesi test ve taslak modu vardir.
