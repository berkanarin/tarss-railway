# TA RSS - Railway Version

TA RSS Railway Version, RSS kaynaklarından tek bir bulten EML dosyasi uretmek icin planlanan web uygulamasidir. Bu surumun ana hedefi, kullanicinin yerel Python server calistirmadan uygulamaya bir URL uzerinden erismesi; kullanici ayarlari ve calisma verilerinin varsayilan olarak tarayicidaki IndexedDB icinde kalmasidir.

Railway tarafindaki backend kalici kullanici veritabani olmak yerine, tarayicinin tek basina guvenilir yapamadigi isler icin araci servis olarak konumlanir.

## Hedef

- Kullanici uygulama URL'sine girer.
- Arayuz, mevcut TA RSS uygulamasinin gorsel dili ve is akisina yakin kalir; kullanici Railway surumune gecince farki minimum hisseder.
- RSS kaynaklari, kategori ayarlari, blacklist, skor cache'i ve secimler tarayicidaki IndexedDB'de saklanir.
- Railway backend RSS cekme, CORS engelini asma ve AI skorlama proxy gorevlerini ustlenir.
- Gunun sonunda kullanici tek bir `.eml` bulten dosyasi indirir.
- Toplu e-posta gonderimi, Outlook COM entegrasyonu ve lokal Python server zorunlulugu bu surumun disinda kalir.

## Mimari Karar

Bu proje iki parcadan olusacak:

- Frontend: IndexedDB kullanan browser-first uygulama.
- Backend: Railway uzerinde calisan stateless API.

Varsayilan veri sahipligi tarayicidadir. Backend kullanici RSS kaynaklarini, secimlerini veya bulten gecmisini kalici olarak tutmaz. Cihazlar arasi tasima icin JSON export/import akisi tasarlanir.

Ileride ikinci bir mod eklenebilir:

- Local Mode: IndexedDB, login yok, hizli kullanim.
- Cloud Sync Mode: Railway DB ve kullanici yonetimi ile cihazlar arasi senkron.

Cloud Sync Mode varsayilan degildir; eklendiginde auth, kullanici bazli veri izolasyonu, migration ve backup kararlari birlikte ele alinmalidir.

## Arayuz Ilkesi

Railway surumu, mevcut TA RSS admin arayuzunu referans alir. Renkler, kart yapisi, workflow adimlari, buton hiyerarsisi, dashboard hissi ve bulten hazirlama akisi korunur. Teknik altyapi degisse de kullanici ayni uygulamanin daha kolay acilan web surumunu kullandigini hissetmelidir.

## Kapsam

Ilk kapsam:

- RSS kaynak yonetimi
- IndexedDB tabanli lokal veri saklama
- Railway RSS proxy
- Railway AI scoring proxy
- Kategori, blacklist ve skor cache yonetimi
- Haber listeleme, filtreleme ve secim
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

IndexedDB store taslagi:

- `settings`: uygulama ve bulten ayarlari
- `rssSources`: RSS kaynaklari
- `articles`: cekilen ve normalize edilen haberler
- `categories`: AI skorlama kategorileri
- `blacklist`: istenmeyen kelime, konu ve rakip listeleri
- `scoreCache`: haber id bazli AI skor sonuclari
- `selections`: bultene alinacak secili haberler
- `exports`: opsiyonel lokal bulten cikti gecmisi

## API Taslagi

Railway backend icin ilk endpoint adaylari:

- `GET /health`
- `POST /api/rss/fetch`
- `POST /api/rss/test`
- `POST /api/ai/score`
- `POST /api/ai/score-batch`
- `POST /api/image/proxy` veya gerekirse `GET /api/image`

Backend stateless kalacagi icin isteklerde gerekli kaynak, kategori ve haber verisi frontend tarafindan gonderilir.

## Guvenlik Notlari

- AI API key frontend'e yazilmaz.
- Gemini/OpenAI key Railway environment variable olarak tutulur.
- Kullanici verisi varsayilan olarak IndexedDB'de kalir.
- IndexedDB silinirse veriler kaybolur; bu nedenle export/import ilk fazlarda ele alinmalidir.

## Lokal Gelistirme

Lokal calisma akisi:

```powershell
npm install
npm run dev
```

Railway deploy stratejisi:

- Railway projesi GitHub reposuna baglanir.
- `main` branch'e push sonrasi auto deploy calisir.
- Environment variables Railway panelinden tanimlanir.
- CLI sadece proje/servis kontrolu ve gerekirse log inceleme icin kullanilir.

## Repo

GitHub:

https://github.com/berkanarin/tarss-railway
