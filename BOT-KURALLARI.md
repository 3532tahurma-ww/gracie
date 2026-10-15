# Bot modu kuralları

Bu belge, Amor Stories'in **🤖 Bot modu**nun kurallarını anlatır: kuralın nasıl yazıldığı, mesajla nasıl eşleştiği, hangi kuralın kazandığı ve kuralların JSON olarak nasıl dışa/içe aktarıldığı. Hem kendin kural yazarken hem de kuralları başka bir yapay zekaya yazdırırken kullanabilirsin.

- **Kuralların yeri:** `js/data/bot-rules.js` (uygulama bunu okur).
- **Düzenleme:** `bot-editoru.bat` → tarayıcıda Bot editörü → **Kaydet**.
- **Dışa / içe aktarma:** editörde **⬇️ Dışa aktar** / **⬆️ İçe aktar** (JSON).
- **Motor:** `js/bot.js` (uygulama ve editör aynı kodu kullanır).

---

## 1. Kısaca

Bot modu açıkken sen bir mesaj yazarsın. Uygulama kuralları tarar, **mesajında kelimeleri sırayla geçen** ve **karaktere uyan** kurallar arasından **en özelini** seçer, onun cevaplarından birini karakterin ağzından yazar.

```
kahve                    → "Kahve mi? Ben varım ☕"          X → Z
seni  →  +sevmek         → "Ben de seni ❤️"                  X, Y → C
+sevmek  →  seni         → "Ters söyleyince daha tatlı 🥺"   Y, X → B
seni  →  +sevmek  + Soğuk → "Hıh. Tamam."                     aynı kelimeler, soğuk karakterde
(kelime yok)             → "Hmm 🤔"                           yedek cevap
```

---

## 2. Dışa aktarılan dosya (JSON)

```json
{
  "format": "amor-stories-bot",
  "version": 1,
  "rules":  [ ... ],
  "groups": [ ... ],
  "verbs":  [ ... ]
}
```

| Alan | Açıklama |
|---|---|
| `format` | `"amor-stories-bot"`. İçe aktarırken zorunlu değil, ama yazılması iyi olur. |
| `version` | Şimdilik `1`. |
| `rules` | Kurallar ([§3](#3-kural)). |
| `addons` | 🪄 Otomatik ekler ([§9](#9-otomatik-ekler)). |
| `groups` | Kelime grupları ([§5](#5-kelime-grupları)). |
| `verbs` | Fiil listesi ([§6](#6-fiiller)). |

`js/data/bot-rules.js` de aynı nesneyi tutar (`format` / `version` olmadan): `Stories.BOT_RULES = { "rules": [...], "addons": [...], "groups": [...], "verbs": [...] };`

---

## 3. Kural

```json
{
  "id": "r_seni_seviyorum_soguk",
  "name": "Seni seviyorum (soğuk)",
  "category": "Romantik",
  "when": ["seni", "+sevmek"],
  "reply": ["Hıh. Tamam.", "...Peki."],
  "traits": ["Soğuk"],
  "chars": [],
  "note": "Soğuk karakterlerde"
}
```

| Alan | Tür | Açıklama |
|---|---|---|
| `id` | metin | Benzersiz kimlik. İçe aktarırken **birleştirme** bu kimliğe göre yapılır (aynı kimlik → güncellenir). Yoksa otomatik verilir. |
| `name` | metin | Kuralın adı (editörde listede görünür). |
| `category` | metin | Kategori (editörde gruplama). Boşsa "Genel", kelimesiz kurallarda "Yedek". |
| `when` | metin dizisi | **Sırayla** geçmesi gereken kelimeler ([§4](#4-kelime-yazımı-when)). **Boş dizi = yedek cevap.** |
| `reply` | metin dizisi | Cevap seçenekleri ([§8](#8-cevap-yazımı-reply)). Boşsa kural hiç kullanılmaz. |
| `traits` | metin dizisi | **Kişilik şartı:** karakterde bu özelliklerin **hepsi** olmalı. Boşsa herkes. |
| `chars` | metin dizisi | **Karakter şartı:** sadece bu adlı karakterler (tam ad ya da ilk ad: `"Vesper"` = "Vesper Laine"). Boşsa herkes. |
| `note` | metin | Sadece editörde görünen not. |

`traits` değerleri karakterin profilindeki özelliklerle birebir eşleşmelidir (büyük/küçük harf fark etmez): `js/data/traits.js`'teki hazır listeler ya da karakterin "Diğer özellikler"i.

---

## 4. Kelime yazımı (`when`)

`when` dizisinin her öğesi bir "kelime"dir ve şunlardan biri olabilir:

| Yazım | Ne yakalar | Örnek |
|---|---|---|
| `kahve` | Mesajın **herhangi bir yerinde** geçmesi yeter (ekler olur). | "kahveyi", "Kahve?" ✓ |
| `yap-` | **Kelime başında** bu kök. | yap, yapmak, yapabiliyorum, yaptım ✓ · "kayak" ✗ |
| `=sa` | Sadece **tam kelime**. | "sa" ✓ · "saat", "masa" ✗ |
| `+yapmak` | **Fiil**: fiil listesindeki tüm kökler, kelime başında ([§6](#6-fiiller)). | yapıyorsun, yapacaksın, yaptın ✓ |
| `@selam` | **Kelime grubu**: gruptaki herhangi bir kelime ([§5](#5-kelime-grupları)). | selam, merhaba, slm ✓ |
| `a\|b\|c` | **Alternatif (veya)**: biri yeter. Her parça yukarıdakilerden biri olabilir. | `+gelmek\|+buluşmak` |

Editörde alternatifler çipte `/` ile gösterilir (`+buluşmak / +görüşmek`); dosyada `|` yazılır.

### Sıra (VE)

`when` dizisindeki öğeler mesajda **bu sırayla** geçmelidir:

```
["seni", "+sevmek"]   → "seni çok seviyorum" ✓   "seviyorum seni" ✗
["+sevmek", "seni"]   → "seviyorum seni" ✓       "seni seviyorum" ✗
```

- **Aynı çipte `|`** = VEYA (biri yeter).
- **Ayrı öğeler** = VE, sırayla (hepsi, bu sırada).

---

## 5. Kelime grupları

```json
{ "name": "selam", "words": ["selam", "merhaba", "slm", "hey", "=sa", "günaydın"] }
```

- Kuralda `@selam` olarak kullanılır; gruptaki **herhangi bir** kelime yeter.
- `words` içinde de bütün yazımlar kullanılabilir: `yap-`, `=sa`, `+fiil`, hatta başka bir `@grup` (en fazla 3 kat iç içe).
- Grup adında boşluk olmaz (`iyi_geceler` gibi yaz). Kuralda büyük/küçük harf fark etmez.
- Kuralda olmayan bir grup (`@yok`) hiçbir şey yakalamaz; editörde kırmızı görünür.

---

## 6. Fiiller

```json
{ "verb": "gitmek", "stems": ["git", "gid"] }
```

- Kuralda `+gitmek` yazılınca `stems` içindeki **her kök kelime başında** aranır: git, gitmek, gitti, **gid**iyorum, **gid**elim…
- **Ünsüz yumuşaması** için ikinci kök ekle: git/gid, et/ed, hisset/hissed.
- **Düzensiz fiiller**de çekimleri kök olarak yaz: `demek` → `diyor, dedi, demek, derim, dersin, dese`.
- **Çok kısa kökler** (`al`, `ol`) başka kelimeleri de yakalar (alo, olay). Onlarda uzun çekimleri yaz: `alıyor, aldı, alır, alacak, almak…`
- Listede olmayan `+koşmak` yazılırsa sadece `-mak/-mek` atılmış hâli (`koş`) aranır.

---

## 7. Eşleştirme nasıl çalışır?

1. **Sadeleştirme:** Mesaj ve kelimeler küçük harfe çevrilir (Türkçe kuralıyla: I → ı, İ → i), noktalama atılır, 3 ve daha fazla tekrarlanan harf teke iner (`Selaaam!!` → `selam`, `canımmm` → `canım`), boşluklar teklenir.
2. **Uygun kurallar:** `reply` boş olmayan ve karaktere uyan (`traits` hepsi var, `chars` adı tutuyor) kurallar alınır.
3. **Eşleşenler:** `when` dolu olup kelimeleri mesajda sırayla geçen kurallar.
4. **Hiçbiri yoksa:** karaktere uyan **yedek cevaplar** (`when` boş) kullanılır. O da yoksa cevap verilmez (uygulama "uygun kural yok" uyarısı gösterir).
5. **En özel kural kazanır** (puan):

   | | Puan |
   |---|---|
   | `when`'deki her öğe | 100 |
   | `traits`'teki her özellik | 10 |
   | `chars` doluysa | 20 |

   Eşit puanlılar arasından **rastgele** biri seçilir. Örnek: `seni → +sevmek` (200) ile `seni → +sevmek` + Soğuk (210) eşleşirse soğuk karakterde ikincisi kazanır.
6. **Grup sohbetinde:** her üye için ayrı ayrı en iyi kural bulunur; asıl kuralla eşleşen üye, yedek cevaptan eşleşenin önüne geçer; en yüksek puanlı üye cevap verir (eşitlikte rastgele).

Kurallar dosyadaki **sırasına göre değil**, bu puana göre seçilir; dosya sırası önemsizdir.

---

## 8. Cevap yazımı (`reply`)

| Yazım | Anlamı |
|---|---|
| Her dizi öğesi (editörde her satır) | Bir cevap seçeneği; biri rastgele seçilir. |
| `\|\|` | Aynı cevapta **ayrı baloncuk**: `"Ah, merhaba\|\|Seni beklemiyordum"` → 2 mesaj |
| `{sen}` | Kullanıcının adı (Ben sayfasındaki ad; boşsa "sen") |
| `{ben}` | Cevap veren karakterin ilk adı |

Bot cevapları normal mesaj gibi sohbete kaydedilir: düzenlenebilir, ↶ ile geri alınabilir, karakterin **anahtar kelime efektleri** onlarda da çalışır.

---

## 9. Otomatik ekler

Bot modundan **bağımsız** çalışır. Karakter adına yazılan her mesajda (elle yazdığın ya da bot cevabı) kelimeler geçerse mesajın **sonuna** bir şey ekler ya da hemen arkasından **ayrı bir mesaj** gönderir. Uygulamada sohbet ⋮ → **🪄 Otomatik ekler: Aç**; editörde **🪄 Otomatik ekler** sekmesi.

```json
{
  "id": "a_yap_emoji",
  "name": "Yapmak → 😏",
  "category": "Emoji",
  "when": ["+yapmak"],
  "add": ["😏", "😌", "✨"],
  "mode": "append",
  "chance": 60,
  "traits": [],
  "chars": [],
  "note": ""
}
```

| Alan | Açıklama |
|---|---|
| `when` | Karakterin mesajında sırayla geçmesi gereken kelimeler; yazım kurallarla aynı ([§4](#4-kelime-yazımı-when)). **Boşsa her mesaja** uygulanır. |
| `add` | Eklenecekler; biri rastgele seçilir. Emoji ya da metin. `{sen}` / `{ben}` kullanılabilir. |
| `mode` | `"prepend"`: mesajın **başına** ekler ("bunu yaptım" → "Hıh, bunu yaptım"). `"append"`: **sonuna** ekler ("bunu yaptım 😏"). `"before"`: mesajdan **önce** aynı karakterden ayrı bir mesaj gönderir. `"message"`: mesajdan **sonra** ayrı bir mesaj gönderir. Yazılmazsa `"append"`. |
| `chance` | Olasılık, 0-100 (yazılmazsa 100). Eşleşince yüzde kaç ihtimalle uygulanacağı; böylece her mesajda tekrar etmez. |
| `traits`, `chars`, `id`, `name`, `category`, `note` | Kurallardaki gibi ([§3](#3-kural)). |

**Nasıl seçilir?** Mesajla eşleşen ekler arasından **her mod için bir tane** (en özel olanı, puanlama kurallarla aynı) seçilir; sonra olasılık zarı atılır. Yani bir mesaja her türden en fazla bir ek gelir (başına, sonuna, önce, sonra; dördü birlikte de olabilir). Mesaj zaten aynı ekle başlıyor/bitiyorsa tekrar eklenmez. Senin ("Sen") mesajlarına, notlara ve fotoğraflara ek yapılmaz.

Örnekler: `+yapmak → 😏` (sonuna, %60) · `+sevmek → ❤️` (sonuna, %80) · kelimesiz + **Utangaç** → `🙈` (sonuna, %25: utangaç karakterin her mesajına arada bir) · `+özlemek → "Ne zaman görüşüyoruz?"` (sonra ayrı mesaj, %70) · kelimesiz + **Alaycı** → `"Hıh,"` (başına, %30) · `+gitmek → "Bekle bir saniye..."` (önce ayrı mesaj).

---

## 10. İçe aktarma

**⬆️ İçe aktar** şu biçimleri kabul eder:

- Tam dosya: `{ "format": "amor-stories-bot", "rules": [...], "addons": [...], "groups": [...], "verbs": [...] }`
- `format` olmadan: `{ "rules": [...] }` ya da sadece `{ "addons": [...] }` (diğer listeler isteğe bağlı)
- Sadece kural dizisi: `[ { "when": [...], "reply": [...] }, ... ]`

Eksik alanlar boş değerle tamamlanır, `id` yoksa yeni kimlik verilir. Cevabı olmayan kurallar ve tanımsız `@grup`lar uyarı olarak gösterilir.

| Seçenek | Ne olur |
|---|---|
| **Birleştir** | Aynı `id`'li kurallar ve ekler dosyadakiyle **değişir**, yeniler **eklenir**. Aynı adlı gruplara yeni kelimeler, aynı adlı fiillere yeni kökler eklenir; yeni gruplar/fiiller eklenir. Editördeki diğer her şey kalır. |
| **Tümünü değiştir** | Editördeki kurallar, ekler, gruplar ve fiiller dosyadakiyle değişir. |

İçe aktardıktan sonra `js/data/bot-rules.js`'e yazmak için **Kaydet**'e bas. Kaydetmeden önce emin değilsen, önce **⬇️ Dışa aktar** ile mevcut hâlin yedeğini al.

---

## 11. Örnekler

```json
{
  "format": "amor-stories-bot",
  "version": 1,
  "rules": [
    { "id": "r_kahve", "name": "Kahve", "category": "Sohbet", "when": ["@icecek"], "reply": ["Kahve mi? Ben varım ☕"], "traits": [], "chars": [], "note": "" },
    { "id": "r_bulusma", "name": "Buluşma teklifi", "category": "Sohbet", "when": ["+buluşmak|+görüşmek|+gelmek"], "reply": ["Olur, ne zaman?", "Hmm... düşüneyim 🤔||Tamam, olur"], "traits": [], "chars": [], "note": "" },
    { "id": "r_ne_yapiyorsun", "name": "Ne yapıyorsun", "category": "Sohbet", "when": ["ne", "+yapmak"], "reply": ["Hiç, uzanıyorum 😌"], "traits": [], "chars": [], "note": "" },
    { "id": "r_selam_vesper", "name": "Vesper'in selamı", "category": "Selamlaşma", "when": ["@selam"], "reply": ["Selam {sen}, seni bekliyordum 🖤"], "traits": [], "chars": ["Vesper"], "note": "" },
    { "id": "r_yedek_utangac", "name": "Yedek (utangaç)", "category": "Yedek", "when": [], "reply": ["B-bilmiyorum ki... 🙈"], "traits": ["Utangaç"], "chars": [], "note": "" }
  ],
  "groups": [
    { "name": "selam", "words": ["selam", "merhaba", "slm", "hey", "=sa"] },
    { "name": "icecek", "words": ["kahve", "çay", "latte"] }
  ],
  "verbs": [
    { "verb": "buluşmak", "stems": ["buluş"] },
    { "verb": "görüşmek", "stems": ["görüş"] },
    { "verb": "gelmek", "stems": ["gel"] },
    { "verb": "yapmak", "stems": ["yap"] }
  ]
}
```

| Mesaj | Karakter | Kazanan kural |
|---|---|---|
| "çay içelim mi?" | herkes | Kahve |
| "yarın görüşelim mi" | herkes | Buluşma teklifi |
| "Ne yapacaksın bugün?" | herkes | Ne yapıyorsun |
| "selaaam" | Vesper Laine | Vesper'in selamı (karakter şartı +20) |
| "bugün hava güzel" | Utangaç biri | Yedek (utangaç) |

---

## 12. Yapay zekaya kural yazdırmak

Mevcut kuralları **⬇️ Dışa aktar** ile indir, bu belgeyle birlikte ver:

> Ekteki dosya Amor Stories bot kuralları; biçimi BOT-KURALLARI.md'de anlatılıyor. "Romantik" kategorisine 10 yeni kural ekle: Utangaç ve Flörtöz karakterler için ayrı cevaplar olsun (`traits`), fiilleri `+fiil` ile yaz, eksik fiilleri `verbs`'e, ortak kelimeleri `groups`'a ekle. Her kuralın benzersiz bir `id`'si, `name`'i ve 3-4 cevabı olsun; bazı cevaplar `||` ile iki baloncuk olsun. Sadece **yeni** kuralları, gerekli grup ve fiillerle birlikte geçerli JSON olarak ver.

Gelen dosyayı **⬆️ İçe aktar → Birleştir** ile ekle, **🧪 Dene** panelinde dene, beğenirsen **Kaydet**.

**Yapay zekanın uyması gerekenler:**

1. `when` öğeleri sadece [§4](#4-kelime-yazımı-when)'teki yazımları kullansın; kullandığı her `@grup` `groups`'ta, her `+fiil` `verbs`'te tanımlı olsun.
2. `when` sırası anlamlıdır; aynı kelimelerin ters sırası ayrı bir kuraldır.
3. `traits` değerleri karakterlerdeki özellik adlarıyla birebir aynı olsun (`js/data/traits.js`).
4. `reply` boş olmasın; `||`, `{sen}`, `{ben}` dışında özel yazım kullanmasın.
5. Yeni kuralların `id`'leri mevcut kurallarla çakışmasın (çakışırsa birleştirme o kuralın üzerine yazar).
6. Geçerli JSON: çift tırnak, sonda virgül yok, yorum yok.

---

## 13. İpuçları

- **Kısa kelimeler** (sa, ok, ya) başka kelimelerin içinde de geçer; bunlar için `=sa` (tam kelime) kullan.
- **Genelden özele** yaz: önce herkes için bir kural, sonra aynı kelimelerle `traits` ya da `chars` şartlı özel kurallar. Puan sistemi özel olanı kendiliğinden seçer.
- **Yedek cevap** her zaman bulunsun; ayrıca karakter tiplerine göre (`traits`) farklı yedekler yaz.
- Fiillerde kök kelime başında arandığı için `+sevmek` "sevgilim"i de yakalar. İstemezsen kökü uzat (`sevi`, `sevdi`, `sevm`…).
- Değişikliklerden sonra uygulamayı yenile. Editörün kaydettiği her seferde `sw.js` sürümü kendiliğinden artar.
