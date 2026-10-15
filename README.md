# Gracie 💙

Kendi hayatı, ruh hali ve seninle ilgili hafızası olan karakterlerle tanıştığın sosyal uygulama: akış, hikayeler, beğeni/yorum, profil ızgarası ve DM. **Amor** ve **Amor Stories**'in yerini alır: Amor'un otomatik sohbet motoru ile Amor Stories'in yazarlık araçları (karakter adına yazma, mesaj düzenleme, ekler, birden çok sohbet, temalar) tek uygulamada.

Saf HTML + CSS + JavaScript; sunucu ve yapay zeka modeli yok. Her şey tarayıcıda çalışır, internetsiz açılır, telefona uygulama gibi yüklenebilir.

## Çalıştırma

- **Bilgisayarda:** `index.html`'e çift tıkla (uygulama olarak yükleme hariç her şey çalışır).
- **GitHub Pages:** klasörü bir GitHub deposuna yükle → *Settings → Pages → Branch: `main` / root* → kaydet. Bir dakika sonra `https://<kullanıcı>.github.io/<depo>/` adresinde açılır.
- **Yükleme:** Pages adresinde Ayarlar (☰ Daha fazla) → *Uygulamayı yükle*. iPhone'da: Safari → Paylaş → Ana Ekrana Ekle.

Hesaplar ve sohbetler sadece bu tarayıcıda saklanır (localStorage), hiçbir yere gönderilmez. Taşımak/saklamak için Ayarlar → **Yedek al (JSON)** (biçimi: [YEDEK-JSON.md](YEDEK-JSON.md)).

## Neler var

- **Açılış, giriş ve kayıt sihirbazı** (Gracie'nin görünümü), cihazdaki hesaplar.
- **Ana sayfa:** hikayeler ve herkesin gönderileri; beğeni (çift tık), yorum (karakter gönderinin altında cevaplar), paylaşma.
- **Keşfet:** kişi/şehir/meslek arama, tüm fotoğraflar. **Bildirimler**, **Eşleşmeler**, **profil sayfaları** (gönderi ızgarası, öne çıkanlar, "Hakkında").
- **DM:**
  - Cevap modu (🤖 menüsü, her sohbet için ayrı): **Amor** (otomatik, varsayılan) · **Bot kuralları** · **Kapalı**.
  - **Karakter olarak yaz** (mesaj kutusunun solundaki düğme), mesajları **düzenle / sil** (✏️ 🗑).
  - **🪄 Otomatik ekler:** karakterin mesajında bir kelime/fiil geçince başına-sonuna ek ya da ayrı mesaj.
  - **Aynı karakterle birden çok sohbet** (yeni sohbet, ad verme, silme).
  - **🎨 Tema:** Amor'un ve Amor Stories'in arka planları ve baloncukları, hazır temalar, "Onun fotoğrafı" arka planı.
  - Tepkiler, alıntılı cevap, çıkartmalar, karakterin fotoğraf göndermesi, ilk mesajı onun atması, sohbeti JSON olarak indirme.

## Gracie Stüdyo (`gracie-studyo.bat`)

Uygulamayı geliştirmek için harici araç; tarayıcıda açılır, kaydettiklerin doğrudan proje dosyalarına yazılır:

- **👥 Kişiler ve fotoğraflar:** yeni karakter, fotoğraf yükleme (sürükle bırak), profil fotoğrafı seçme, silme (Geri Dönüşüm Kutusu'na); isim, kişilik, yaş, şehir, meslek, biyografi, hakkında, özellikler → `js/data/people-defs.js` (uygulama her açılışta uygular).
- **💬 Diyalog editörü** (Amor'dan): niyet kelimeleri, kişiliklere göre cevap cümleleri, konuşma kümeleri; deneme kutusu → `js/amor/data/custom-dialog.js`.
- **📜 Bot kuralları ve ekler** (Amor Stories'ten) → `js/data/bot-rules.js`. Kural yazımı: [BOT-KURALLARI.md](BOT-KURALLARI.md).

## Karakterler ve fotoğraflar

70 karakter: Amor'un fotoğraf setleri (isim, yaş, şehir, meslek, kişilik Amor havuzundan), **Don't Stop** ve **Carmen**.

- Fotoğrafların aslı `fotograflar/<karakter>/` klasöründe (her klasör bir karakter, `profil.jpg` profil fotoğrafı). Ekleyince **kisiler-guncelle.bat** (ya da Stüdyo) küçültülmüş kopyaları `people/` klasörüne üretir; sadece değişen klasörler işlenir. Ayrıntı: [fotograflar/OKUBENI.md](fotograflar/OKUBENI.md).
- Var olan karaktere eklenen fotoğraf, onun en yeni gönderisi olur; yeni klasör yeni bir karakter olur.
- `fotograflar/` GitHub'a yüklenmez (`.gitignore`); yayınlanan `people/`'dır.
- Hikaye, not ve kalabalık yorumları: `js/data/social-tr.js`.

## Klasörler

| Yol | İçerik |
|---|---|
| `index.html`, `css/` | Sayfa ve stiller (`gracie.css`: açılış, giriş, kayıt, menüler, temalar) |
| `js/*.js` | Arayüz: `auth` (giriş/kayıt), `chat`, `chattools` (modlar, ekler, sohbetler, tema), `backup` (JSON), `social`, `stories`... |
| `js/local/` | Sayfa içi "sunucu": karakterler, mesaj deposu, akış, hikayeler, cevap akışı (`server.js`) |
| `js/amor/` | Amor'un motoru (ruh hali, yakınlık, hafıza, ilgi, kalıp tabanlı Türkçe cevaplar) + bot kuralları motoru |
| `js/data/` | Fotoğraf listesi (`people.js`, üretilir), tanımlar, sosyal içerik, temalar, bot kuralları |
| `fotograflar/` | Fotoğrafların aslı (sadece bu bilgisayarda) |
| `people/` | Uygulamanın kullandığı küçültülmüş fotoğraflar (`full`, `md`, `sm`) |
| `tools/` | Gracie Stüdyo (`studio.html`, `people-editor.html`, `dialog-editor.html`, `bot-editor.html`, `studio-server.ps1`), `build-people.ps1`, `import-old-photos.ps1` |

Kodu elle değiştirip yayınlarken `sw.js`'teki `VERSION`'ı artır (Stüdyo kaydederken kendisi artırır; fotoğraf güncelleme `IMG_CACHE`'i artırır).
