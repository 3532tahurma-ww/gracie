# Gracie JSON dosyaları

Gracie iki tür JSON dosyası üretir. İkisi de UTF-8, girintili (okunur) JSON'dur.

| Dosya | Nereden | Ne için |
|---|---|---|
| `gracie-yedek-<tarih>.json` | Ayarlar → **Yedek al (JSON)** | Bu cihazdaki her şeyin tam yedeği. **Yedekten geri yükle** ile geri yüklenir. |
| `gracie-sohbet-<karakter>-<sohbet>.json` | Sohbette 🤖 → **Bu sohbeti JSON olarak indir** | Tek bir sohbet, okunur biçimde. Başka uygulamalarda / yapay zekalarda kullanmak için (geri yüklenmez). |

---

## 1. Sohbet dosyası (`kind: "chat"`)

```json
{
  "app": "gracie", "kind": "chat", "version": 1,
  "exported_at": "2026-10-15T20:10:00.000Z",
  "me": { "name": "Tahir", "age": 25 },
  "character": {
    "id": "p-ds-luna", "name": "Luna", "age": 25, "city": "Kayseri", "occupation": "Cadı",
    "bio": "İksirlere dokunma. Hiçbirine.", "personality": "Flörtöz",
    "interests": ["gece yürüyüşü", "..."],
    "about": [{ "q": "Hakkımda", "a": "Kulesinde yaşayan bir cadı..." }]
  },
  "chat": { "title": "Sohbet 1", "mode": "amor", "addons": false, "theme": { "bg": "kalp-kolye", "bubble": "kalp" } },
  "messages": [
    { "from": "me",  "text": "selam cadı hanım", "time": "2026-10-15T19:44:00.000Z" },
    { "from": "her", "text": "ölümlü... kuleme hoş geldin", "time": "...", "written_by_me": true },
    { "from": "her", "text": "Fena değil 🙂", "time": "...", "bot_rule": true, "edited": true,
      "reply_to": { "from": "me", "text": "nasılsın" }, "reactions": { "me": "❤️", "her": null } }
  ]
}
```

- `from`: `me` = sen, `her` = karakter.
- `written_by_me`: karakterin mesajını sen yazdın (Kapalı mod / "karakter olarak yaz").
- `bot_rule`: bot kurallarından gelen cevap. İkisi de yoksa cevap Amor motorundan gelmiştir.
- İsteğe bağlı alanlar: `edited`, `reply_to`, `photo` (fotoğraf yolu), `sticker`, `story_reply`, `post_comment`, `reactions`.
- `chat.mode`: `amor` (otomatik), `bot` (kurallar) ya da `off` (kapalı).

## 2. Tam yedek (`kind: "backup"`)

```json
{ "app": "gracie", "kind": "backup", "version": 1, "exported_at": "...", "data": { "<anahtar>": <değer>, ... } }
```

`data`, tarayıcıdaki `gracie_` ile başlayan her kaydın birebir kopyasıdır (giriş yapılmış oturum hariç):

| Anahtar | İçerik |
|---|---|
| `gracie_accounts` | Hesaplar: `{ "<kullanıcı adı>": { username, pass (özet), profile_id, display_name, age, city, gender, interested_in, bio, interests, created } }` |
| `gracie_db` | Profiller, mesajlar, yorumlar ve sohbet ayarları (aşağıda) |
| `gracie_world` | Karakterlerin kimlikleri (bu cihazdaki tüm hesaplar için ortak): `{ characters: [...], seedVersion }` |
| `gracie_amor:<profil id>` | O profilin Amor motoru durumu: ruh halleri, yakınlık, hafıza, ilgi, beklenen cevaplar |
| `gracie_theme`, `gracie_fx`, `gracie_sound`, `gracie_notify`, `gracie_debug` | Görünüm ve ayarlar |
| `gracie_seen_*`, `gracie_story_likes`, `gracie_last_chat`, `gracie_activity_seen:*` | Görülen mesaj/hikayeler, beğenilen hikayeler |

### `gracie_db`

```json
{
  "v": 1, "nextId": 120, "nextComment": 9,
  "profiles": { "tahir-3f2a": { "id": "tahir-3f2a", "name": "Tahir", "age": 25, "appearance": { ... }, "created_at": 1760550000 } },
  "messages": {
    "tahir-3f2a|p-ds-luna": [
      { "id": 1, "role": "user", "text": "selam", "ts": 1760550100.2, "meta": null },
      { "id": 2, "role": "saneme", "text": "oo hoş geldin bakalım 😏", "ts": 1760550103.9, "meta": { "read_at": 1760550101 } },
      { "id": 9, "role": "user", "text": "yeni sohbet", "ts": 1760551000, "th": 2, "meta": null }
    ]
  },
  "comments": [{ "id": 1, "pid": "tahir-3f2a", "cid": "p-ds-luna", "photo": "smile.jpg", "role": "user", "text": "çok güzel", "ts": 1760550200, "reply_to": null }],
  "settings": {
    "active_profile": "tahir-3f2a",
    "mode:tahir-3f2a:p-ds-luna": "off",
    "addons:tahir-3f2a:p-ds-luna": true,
    "theme:tahir-3f2a:p-ds-luna": { "bg": "kalp-kolye", "bubble": "kalp" },
    "thread:tahir-3f2a:p-ds-luna": 2,
    "threads:tahir-3f2a:p-ds-luna": { "2": "Kafede tanışma" },
    "likes:tahir-3f2a:p-ds-luna": ["smile.jpg"]
  },
  "turns": { "...": "son cevabın 🐞 hata ayıklama bilgisi" }
}
```

- Mesaj anahtarı `"<profil id>|<karakter id>"`. `role`: `user` = sen, `saneme` = karakter (eski adı, değişmedi).
- `th`: aynı karakterle kaçıncı sohbet (yoksa 1). Açık olan sohbet `thread:` ayarında, adları `threads:` ayarında.
- `ts` saniye cinsinden zaman (Unix). `meta` alanları: `read_at`, `reply_to`, `reactions` (`user` / `saneme`), `written` (sen yazdın), `bot`, `edited`, `photo`, `sticker`, `story`, `note`, `post`, `shared`, `opener` (ilk mesajı o attı).

### `gracie_world.characters[]` (karakter kimliği, Amor biçimi)

```json
{ "id": "p-ds-luna", "setId": "ds-luna", "group": "dontstop", "name": "Luna", "archetype": "flortoz",
  "age": 25, "cityName": "Kayseri", "district": "...", "job": "Cadı", "height": 168, "weight": 60, "zodiac": "Akrep",
  "bio": "...", "about": "...", "likes": ["..."], "dislikes": ["..."],
  "big5": { "O": 0.7, "C": 0.4, "E": 0.8, "A": 0.6, "N": 0.4 },
  "followers": 4200, "following": 180,
  "posts": [{ "photo": "smile.jpg", "text": "gönderi açıklaması", "date": "2026-09-30", "location": "Kayseri" }] }
```

Fotoğraflar `people/<setId>/{full,md,sm}/<ad>.jpg` dosyalarıdır (yedeğe girmez; `profil.jpg` profil fotoğrafı). Aslı `fotograflar/<klasör>/`.
`archetype`: `nese`, `soguk`, `utangac`, `flortoz`, `dramatik`, `olgun`.

## Başka bir araçla düzenlerken

- Yedeği düzenleyip geri yükleyebilirsin; `app`, `kind` ve `data` alanları kalmalı.
- Yeni mesaj eklerken `id` benzersiz olmalı ve `gracie_db.nextId` en büyük id'den büyük olmalı.
- Karakter kimliğini değiştirirsen (`gracie_world`) yeni isim/kişilik geri yüklemeden sonra hemen kullanılır.
