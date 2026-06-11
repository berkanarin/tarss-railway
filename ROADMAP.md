# Roadmap

Bu yol haritasi, mevcut TA RSS uygulamasini Railway destekli ve browser-first bir surume tasimak icin kullanilir. Projenin ilk calisan surumu canliya alinmistir; bundan sonraki calisma sertlestirme, UI parity iyilestirmeleri ve opsiyonel gelecek modlari uzerinden ilerler.

Canli uygulama:

https://ta-rss-production.up.railway.app

## Durum Ozeti

Tamamlanan ana fazlar:

- Faz 0: Plan ve karar kaydi
- Faz 1: Minimal Railway uygulama iskeleti
- Faz 2: IndexedDB veri katmani
- Faz 3: RSS kaynaklari ve Railway RSS proxy
- Faz 4: AI skorlama proxy ve lokal fallback
- Faz 5: Bulten hazirlama akisi
- Faz 5.5: TA RSS workflow UI parity baslangici
- Faz 6: EML uretimi
- Faz 7: Railway deploy ve GitHub source baglantisi

Aktif sonraki odak:

- Faz 8: Sertlestirme
- Faz 9: Opsiyonel Cloud Sync
- Faz 10: Outlook Sender Companion

## Faz 0 - Plan ve Karar Kaydi

Durum: Tamamlandi

Cikti:

- `README.md`
- `ROADMAP.md`
- Temiz proje klasoru
- GitHub repo: `berkanarin/tarss-railway`

## Faz 1 - Minimal Railway Uygulama Iskeleti

Durum: Tamamlandi

Cikti:

- `package.json`
- `src/server.js`
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `GET /health`
- Static frontend servis etme

Kabul durumu:

- `npm run dev` ile lokal uygulama aciliyor.
- `/health` 200 donuyor.
- Railway Node app olarak calisiyor.

## Faz 2 - IndexedDB Veri Katmani

Durum: Tamamlandi

Cikti:

- IndexedDB wrapper
- Store versiyonlama
- Varsayilan ayarlar
- Varsayilan kategoriler
- JSON export/import
- Veri sifirlama araci

Kabul durumu:

- RSS kaynaklari ve ayarlar tarayicida kaydediliyor.
- Sayfa yenilenince IndexedDB verisi korunuyor.
- JSON yedek al/yukle akisi var.

## Faz 3 - RSS Kaynaklari ve Railway RSS Proxy

Durum: Tamamlandi

Cikti:

- RSS kaynak ekle/sil/duzenle
- Google News RSS URL olusturucu
- `POST /api/rss/fetch`
- Feed parse ve normalize
- Kaynak bazli hata raporu

Kabul durumu:

- Kullanici RSS kaynaklarini kaydediyor.
- "RSS Cek" islemi haberleri IndexedDB'ye yaziyor.
- CORS engelli feed'ler backend uzerinden cekilebiliyor.

Not:

- Ayrik `POST /api/rss/test` endpointi henuz yok; Google News test ve RSS cekme akisi simdilik `/api/rss/fetch` uzerinden calisiyor.

## Faz 4 - AI Skorlama Proxy

Durum: Tamamlandi

Cikti:

- `POST /api/ai/score-batch`
- Gemini REST entegrasyonu icin `GEMINI_API_KEY` / `GOOGLE_API_KEY` destegi
- Kategori ve blacklist prompt tasarimi
- AI key yokken lokal anahtar kelime fallback skorlama
- Skor sonucunun haber kaydina yazilmasi

Kabul durumu:

- Batch haberler skorlanabiliyor.
- API key yokken ucundan uca test ve demo akisi bozulmuyor.
- API hatalari UI toast mesaji olarak gorunuyor.

Not:

- Ayrik `POST /api/ai/score` endpointi henuz yok.
- `scoreCache` store'u ayrildi, ancak cache optimizasyonu sertlestirme fazinda iyilestirilecek.

## Faz 5 - Bulten Hazirlama

Durum: Tamamlandi

Cikti:

- Haber filtreleme
- Skor ve kaynak filtreleri
- Haber secim akisi
- Haber duzenleme modal'i
- Secilenler sekmesi
- Bulten basligi, mail konusu ve giris metni
- HTML onizleme

Kabul durumu:

- Kullanici bultene girecek haberleri seciyor.
- Duzenlenen haber secim ve bulten onizlemesine yansiyor.
- Bulten onizlemesi tarayicida dogru uretiliyor.

## Faz 5.5 - UI Parity

Durum: Baslangic parity tamamlandi, ince ayar devam edecek

Cikti:

- Eski `TA RSS/admin.html` workflow kart modeli referans alindi.
- Ana dashboard, workflow modal, sekmeler, kartlar, buton hiyerarsisi ve renk dili TA RSS'e yaklastirildi.
- Kategoriler, RSS kaynaklari, Google News RSS, RSS haberleri, secilenler ve EML cikti adimlari eski zihinsel modele gore ayrildi.

Kabul durumu:

- Kullanici temel akisi yeniden ogrenmeden tamamlayabilir.

Devam edecek ince ayarlar:

- Eski TA RSS'teki daha detayli bulten gorsel ayarlari
- Manuel duyuru/egitim/haber ekleme
- Secilenler icin daha zengin istatistik ve siralama secenekleri
- Eski uygulamadaki mikro metin ve buton ikonlarinin daha fazla eslestirilmesi

## Faz 6 - EML Uretimi

Durum: Tamamlandi

Cikti:

- MIME/EML builder
- HTML body
- Plain text fallback
- `.eml` download

Kabul durumu:

- Kullanici secili haberlerden tek `.eml` indiriyor.
- EML Outlook'ta manuel acilabilecek formattadir.

Gelecek iyilestirmeler:

- Daha detayli Outlook render testi
- Inline image veya guvenilir remote image stratejisi
- Ek bulten sablonlari

## Faz 7 - Railway Deploy

Durum: Tamamlandi

Cikti:

- Railway project: `Berkan Deploys`
- Service: `TA RSS`
- Repo source: `berkanarin/tarss-railway`
- Branch: `main`
- Production URL: https://ta-rss-production.up.railway.app

Son dogrulanan deploy:

- Commit: `4a7e9c0`
- Mesaj: `Complete TA RSS browser workflow`
- Deployment status: `SUCCESS`

Kabul durumu:

- Uygulama public Railway URL uzerinden aciliyor.
- `/health` calisiyor.
- RSS fetch ve AI score endpointleri canli Railway'de calisiyor.
- GitHub source baglantisi `TA RSS` servisine bagli.

Not:

- Auto deploy tetiklenmediginde CLI ile source disconnect/connect yapilarak GitHub source yeniden baglandi ve deploy tetiklendi.

## Faz 8 - Sertlestirme

Durum: Siradaki ana faz

Hedef:

- Gunluk kullanim icin hata toleransi, veri guvenligi ve UX netligini artirmak.

Plan:

- RSS kaynak bazli hata raporunu UI'da daha belirgin gostermek
- Rate limit, timeout ve retry politikalarini netlestirmek
- AI skor cache kullanimini iyilestirmek
- Import/export geri uyumlulugu
- IndexedDB migration testleri
- EML render testleri
- Canli URL icin smoke test script'i
- Log ve debug paneli
- Google News test sonucundan kaynak kategori/dil/oncelik secerek ekleme

Kabul kriteri:

- Kullanici veri kaybetmeden surum guncelleyebilir.
- RSS/AI hatalari anlasilir mesajlarla gorunur.
- Uygulama gunde birden fazla RSS turunu stabil tasir.

## Faz 9 - Opsiyonel Cloud Sync

Durum: Gelecek plan

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

Durum: Gelecek plan

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
