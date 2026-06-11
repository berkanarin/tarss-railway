# TA RSS - Railway Version

TA RSS Railway Version, RSS kaynaklarindan tek bir bulten EML dosyasi uretmek icin hazirlanan browser-first web uygulamasidir. Kullanici yerel Python server calistirmadan uygulamaya bir URL uzerinden erisir; ayarlar, RSS kaynaklari, kategoriler, haberler, secimler ve yedekler varsayilan olarak tarayicidaki IndexedDB icinde kalir.

Railway tarafindaki backend kalici kullanici veritabani olmak yerine, tarayicinin tek basina guvenilir yapamadigi isler icin araci servis olarak konumlanir.

Canli uygulama:

https://ta-rss-production.up.railway.app

## Hedef

- Kullanici uygulama URL'sine girer.
- Arayuz, mevcut TA RSS admin uygulamasinin gorsel dili ve is akisina yakin kalir; kullanici Railway surumune gecince farki minimum hisseder.
- RSS kaynaklari, kategori ayarlari, blacklist, haberler, skorlar ve secimler tarayicidaki IndexedDB'de saklanir.
- Railway backend RSS cekme, CORS engelini asma ve AI skorlama proxy gorevlerini ustlenir.
- Gunun sonunda kullanici tek bir `.eml` bulten dosyasi indirir.
- Toplu e-posta gonderimi, Outlook COM entegrasyonu ve lokal Python server zorunlulugu bu surumun disinda kalir.

## Mimari Karar

Bu proje iki parcadan olusur:

- Frontend: IndexedDB kullanan browser-first uygulama.
- Backend: Railway uzerinde calisan stateless Node.js API.

Varsayilan veri sahipligi tarayicidadir. Backend kullanici RSS kaynaklarini, secimlerini veya bulten gecmisini kalici olarak tutmaz. Cihazlar arasi tasima icin JSON export/import akisi kullanilir.

Ileride ikinci bir mod eklenebilir:

- Local Mode: IndexedDB, login yok, hizli kullanim.
- Cloud Sync Mode: Railway DB ve kullanici yonetimi ile cihazlar arasi senkron.

Cloud Sync Mode varsayilan degildir; eklendiginde auth, kullanici bazli veri izolasyonu, migration ve backup kararlari birlikte ele alinmalidir.

## Arayuz Ilkesi

Railway surumu, mevcut TA RSS admin arayuzunu referans alir. Renkler, kart yapisi, workflow adimlari, buton hiyerarsisi, dashboard hissi ve bulten hazirlama akisi korunur. Teknik altyapi degisse de kullanici ayni uygulamanin daha kolay acilan web surumunu kullandigini hissetmelidir.

## Mevcut Kapsam

Calisan ana akis:

1. Kategori ve blacklist kurallarini duzenle.
2. RSS kaynaklarini tablo uzerinden ekle, sil ve duzenle.
3. Google News RSS URL'i olustur, test et ve kaynaklara ekle.
4. RSS haberlerini Railway proxy uzerinden cek.
5. Haberleri AI ile skorla veya API key yoksa lokal fallback skorlama kullan.
6. Haberleri filtrele, duzenle ve bultene sec.
7. Bulten basligi, konu ve giris metnini duzenle.
8. Bulteni onizle ve tek `.eml` dosyasi olarak indir.
9. IndexedDB verisini JSON olarak yedekle veya geri yukle.

Mevcut ozellikler:

- RSS kaynak yonetimi
- IndexedDB tabanli lokal veri saklama
- Railway RSS proxy
- Railway AI scoring proxy
- AI key yokken lokal keyword fallback skorlama
- Kategori, blacklist ve skor alanlari
- Google News RSS olusturucu
- Haber listeleme, filtreleme, duzenleme ve secim
- Bulten onizleme
- Tek `.eml` dosyasi uretme ve indirme
- JSON yedekleme ve geri yukleme

Kapsam disi:

- Toplu mail gonderimi
- Outlook otomasyonu
- Ilk surumde kullanici hesabi ve cloud sync
- Server tarafinda kalici kullanici DB'si
- Zamanlanmis otomatik calisma

Gelecek tamamlayici arac:

- Outlook Sender Companion: Web uygulamasinda uretilen `.eml` dosyasini ve alici listesini kullanarak, kullanicinin kendi Windows/Outlook ortaminda kisiye ozel toplu gonderim yapan ayri Python tabanli desktop helper.

## Veri Modeli

IndexedDB store'lari:

- `settings`: uygulama ve bulten ayarlari
- `rssSources`: RSS kaynaklari
- `articles`: cekilen, normalize edilen ve skorlanan haberler
- `categories`: AI skorlama kategorileri
- `blacklist`: istenmeyen kelime, konu ve rakip listeleri
- `scoreCache`: haber id bazli AI skor sonuclari icin ayrilan alan
- `selections`: bultene alinacak secili haberler
- `exports`: opsiyonel lokal bulten cikti gecmisi

## API

Mevcut Railway endpointleri:

- `GET /health`
- `POST /api/rss/fetch`
- `POST /api/ai/score-batch`

Notlar:

- `/api/rss/fetch`, RSS/Atom kaynaklarini Railway uzerinden ceker ve normalize eder.
- `/api/ai/score-batch`, `GEMINI_API_KEY` veya `GOOGLE_API_KEY` varsa Gemini ile skorlar.
- AI key yoksa uygulama, ucundan uca akisin kirilmamasi icin lokal anahtar kelime fallback skorlama kullanir.
- `/api/rss/test`, `/api/ai/score` ve image proxy endpointleri henuz aktif degildir; ihtiyac olursa sonraki fazda eklenecektir.

Backend stateless kalir; isteklerde gerekli kaynak, kategori, blacklist ve haber verisi frontend tarafindan gonderilir.

## Guvenlik Notlari

- AI API key frontend'e yazilmaz.
- Gemini/OpenAI key Railway environment variable olarak tutulur.
- Kullanici verisi varsayilan olarak IndexedDB'de kalir.
- IndexedDB silinirse veriler kaybolur; bu nedenle export/import akisi uygulamada vardir.

## Lokal Gelistirme

```powershell
npm install
npm run dev
```

Varsayilan lokal URL:

http://127.0.0.1:3000

Temel kontroller:

```powershell
node --check src\server.js
node --check public\app.js
node --check public\db.js
Invoke-RestMethod http://127.0.0.1:3000/health
```

## Railway Deploy

Railway deploy stratejisi:

- Railway projesi GitHub reposuna baglidir.
- `main` branch'e push sonrasi deploy tetiklenir.
- Environment variables Railway panelinden tanimlanir.
- CLI proje/servis kontrolu, source reconnect ve log inceleme icin kullanilir.

Railway hedefi:

- Workspace/Project: `Berkan Deploys`
- Service: `TA RSS`
- Repo: `berkanarin/tarss-railway`
- Branch: `main`
- Production URL: https://ta-rss-production.up.railway.app

Son dogrulanan deploy:

- Commit: `4a7e9c0`
- Mesaj: `Complete TA RSS browser workflow`
- Durum: Railway `SUCCESS`

## Repo

GitHub:

https://github.com/berkanarin/tarss-railway
