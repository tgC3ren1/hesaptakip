# Hesap Takip

Yatırım ve çekim işlemlerinizi takip edebileceğiniz, kullanıcı girişi olan, koyu temalı bir Next.js uygulaması.

## Özellikler

- **Kullanıcı girişi**: Her kullanıcı kendi hesabıyla kayıt olur, girer ve yalnızca kendi kayıtlarını görür.
- **Kayıt ekleme**: İşlem türü (yatırım / çekim), tutar, tarih ve isteğe bağlı not.
- **Genel Toplam kutusu**: Seçili tarih aralığındaki net sonucu gösterir — pozitifse yeşil, negatifse kırmızı.
- **Yatırım / Çekim kartları**: Yatırım kırmızı, çekim yeşil renkte; her ikisi de TL tutarı ve alt satırda yaklaşık USD karşılığını gösterir.
- **Tarih filtreleri**: Bugün, Bu Hafta, Bu Ay, Geçen Ay, Bu Yıl, Özel Tarih Aralığı.
- **Düzenleme / silme**: Her kayıt satırdan düzenlenebilir ve onay adımıyla silinebilir.
- **USD kuru**: Sayfa açıldığında canlı kur çekilir (frankfurter.app); dilerseniz sağ üstteki kur alanından elle güncelleyebilirsiniz, bu tercih tarayıcınızda saklanır.
- **Mobil ve masaüstü uyumlu** arayüz.

## Teknik yapı

- **Next.js 14** (App Router) + React, sade CSS (Tailwind kullanılmıyor, `app/globals.css` içinde elle yazıldı).
- **Kimlik doğrulama**: NextAuth.js, e-posta/şifre (Credentials) sağlayıcısı ile. Şifreler `bcryptjs` ile hash'lenir.
- **Veri katmanı**: Basit, dosya tabanlı bir depo (`lib/db.js`), veriler `data/db.json` içinde tutulur. Native bir veritabanı modülü gerekmez, bu yüzden kurulum tek komutla biter.
  - Daha ciddi/çok kullanıcılı bir kullanım için `lib/db.js` içindeki fonksiyonları aynı isimlerle koruyup gerçek bir veritabanına (Postgres, SQLite+Prisma vb.) bağlayabilirsiniz — uygulamanın geri kalanı bu fonksiyonları çağırdığı için başka hiçbir yeri değiştirmenize gerek kalmaz.

## Yerelde kurulum

```bash
git clone <repo-url>
cd hesap-takip
npm install
cp .env.example .env.local
```

`.env.local` içindeki `NEXTAUTH_SECRET` değerini rastgele bir anahtarla değiştirin:

```bash
openssl rand -base64 32
```

Ardından geliştirme sunucusunu başlatın:

```bash
npm run dev
```

Tarayıcıda `http://localhost:3000` adresine gidin, "Kayıt olun" ile bir hesap oluşturun ve giriş yapın.

## GitHub'a yükleme

```bash
git init
git add .
git commit -m "İlk sürüm: Hesap Takip"
git branch -M main
git remote add origin <kendi-github-repo-linkiniz>
git push -u origin main
```

`data/db.json` dosyası `.gitignore` içinde olduğu için kullanıcı verileriniz repoya dahil edilmez.

## Canlıya alma (opsiyonel)

Bu proje verileri yerel bir dosyada (`data/db.json`) tuttuğu için, **sunucusuz (serverless)** platformlarda (ör. Vercel) her istekte disk sıfırlanabileceğinden veriler kalıcı olmaz. Kalıcı depolama isteyen bir sunuma çıkmak isterseniz:

- Sürekli çalışan bir sunucu sağlayan bir platform kullanın (ör. Railway, Render, bir VPS veya kendi sunucunuz) ve `data/` klasörünü kalıcı bir disk/volume üzerinde tutun, **veya**
- `lib/db.js` içindeki depolama mantığını gerçek bir veritabanına taşıyın (bu, uygulamanın geri kalanını etkilemez).

## Nasıl genişletilir

- **Yeni işlem türü** eklemek için: `lib/db.js`, API rotalarındaki `["yatirim","cekim"]` doğrulamasını ve `DashboardClient.jsx` içindeki tür seçici/renk eşlemelerini güncelleyin.
- **Farklı para birimi** eklemek için: `lib/format.js` içine yeni bir `formatXXX` fonksiyonu ekleyip `DashboardClient.jsx` içinde kullanın.
- **Grafik/rapor eklemek** için: `/api/transactions` zaten tüm kayıtları döndürüyor; bu veriyi `recharts` gibi bir kütüphaneyle görselleştirebilirsiniz.
