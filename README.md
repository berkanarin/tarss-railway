# TA RSS - Railway Version

TA RSS Railway Version, RSS kaynaklarından tek bir bulten EML dosyasi uretmek icin planlanan web uygulamasidir. Bu surumun ana hedefi, kullanicinin yerel Python server calistirmadan uygulamaya bir URL uzerinden erismesi; kullanici ayarlari ve calisma verilerinin varsayilan olarak tarayicidaki IndexedDB icinde kalmasidir.

Railway tarafindaki backend kalici kullanici veritabani olmak yerine, tarayicinin tek basina guvenilir yapamadigi isler icin araci servis olarak konumlanir.

## Hedef

- Kullanici uygulama URL'sine girer.
- RSS kaynaklari, kategori ayarlari, blacklist, skor cache'i ve secimler tarayicidaki IndexedDB'de saklanir.
- Railway backend RSS cekme, CORS engelini asma ve AI skorlama proxy gorevlerini ustlenir.
- Gunun sonunda kullanici tek bir `.eml` bulten dosyasi indirir.
- Toplu e-posta gonderimi, Outlook COM entegrasyonu ve lokal Python server zorunlulugu bu surumun disinda kalir.

## Mimari Karar

Bu proje iki parcadan olusacak:

- Frontend: IndexedDB kullanan browser-first uygulama.
- Backend: Railway uzerinde calisan stateless API.

Varsayilan veri sahipligi tarayicidadir. Backend kullanici RSS kaynaklarini, secimlerini veya bulten gecmisini kalici olarak tutmaz. Cihazlar arasi tasima icin JSON export/import akisi tasarlanir.

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
- Kullanici hesabi ve cloud sync
- Server tarafinda kalici kullanici DB'si
- Zamanlanmis otomatik calisma

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

Bu README plan oncelikli ilk commit icindir. Uygulama iskeleti sonraki adimda eklenecek.

Planlanan lokal calisma akisi:

```powershell
npm install
npm run dev
```

Railway deploy akisi:

```powershell
railway login
railway link
railway up
```

## Repo

GitHub:

https://github.com/berkanarin/tarss-railway
