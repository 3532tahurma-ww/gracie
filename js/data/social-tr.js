/*
 * Gracie - sosyal içerik havuzları (elle düzenlenebilir)
 * ------------------------------------------------------
 * stories : 24 saatlik hikayelerin yazıları. when: morning | afternoon | evening | night | any
 * notes   : mesajlar listesinde avatarın üstündeki kısa notlar
 * crowd   : gönderilerin altındaki başka kullanıcıların yorumları ve karakterin onlara cevapları
 * Yer tutucular: {city} şehir, {district} semt, {fav} şehrin sevilen yeri, {like} sevdiği bir şey, {doing} şu an ne yaptığı
 * Kişiliğe özel satırlar (nese, soguk, utangac, flortoz, dramatik, olgun) genel satırlara eklenir.
 */
window.Gracie = window.Gracie || {};

Gracie.SOCIAL = {
  stories: {
    any: [
      ['günaydın ☀️', 'morning'], ['kahvesiz başlamıyor bu gün ☕', 'morning'], ['erken kalkan yol alır diyorlar, ben uykumu alıyorum', 'morning'],
      ['{fav} 💙', 'afternoon'], ['bugün {district} taraflarındayım', 'afternoon'], ['{doing}', 'any'], ['şu an: {doing}', 'any'],
      ['{like} > her şey', 'any'], ['hava çok güzel ya', 'afternoon'], ['akşam planı yok, öneri? 👀', 'evening'],
      ['bu şarkıyı tekrar tekrar dinliyorum 🎧', 'evening'], ['gün batımı 🌅', 'evening'], ['uyuyamayanlar burada mı 🌙', 'night'],
      ['iyi geceler 🌙', 'night'], ['bugün kendime iyi davrandım ✨', 'evening'], ['{city} akşamları başka güzel', 'evening']
    ],
    nese: [['bugün enerjim tavan 💃', 'any'], ['gülmekten karnım ağrıdı 😂', 'evening'], ['herkese günaydınnn 🌸', 'morning']],
    soguk: [['iş.', 'afternoon'], ['sessizlik.', 'night'], ['kahve. sonra konuşuruz.', 'morning']],
    utangac: [['kitabımı bitirdim... ağladım biraz 📖', 'night'], ['yağmur sesi 🌧️', 'any'], ['bugün kimseyle konuşmak istemiyorum ama sen yazabilirsin 🙈', 'evening']],
    flortoz: [['bu akşam güzel görünüyorum değil mi 😏', 'evening'], ['biri beni dışarı çıkarsın 💅', 'evening'], ['yeni ruj 💋', 'afternoon']],
    dramatik: [['neden hep bana oluyor bunlar 😭', 'any'], ['bu film beni mahvetti', 'night'], ['hayat bir sahne ve ben başroldeyim 🎭', 'afternoon']],
    olgun: [['kendine vakit ayırmayı unutma 🍃', 'morning'], ['güzel bir kitap ve çay', 'evening'], ['bugün için minnettarım', 'night']]
  },
  notes: {
    any: [
      ['kahve içecek biri? ☕', 'morning'], ['{doing}', 'any'], ['bugün {district}', 'afternoon'], ['uykum var 😴', 'night'],
      ['şarkı önerisi lütfen 🎧', 'evening'], ['{like} 💙', 'any'], ['canım sıkılıyor, yaz', 'evening'], ['dışarı çıkmak istiyorum', 'afternoon'],
      ['film önerin var mı 🎬', 'evening'], ['hafta sonu gelsin artık', 'any']
    ],
    nese: [['herkes mutlu olsun bugün 🌸', 'any']],
    soguk: [['meşgulüm.', 'any']],
    utangac: [['... 🙈', 'any']],
    flortoz: [['canım sıkıldı, biri eğlendirsin 😏', 'evening']],
    dramatik: [['kimse beni anlamıyor 😭', 'night']],
    olgun: [['sakin bir gün diliyorum 🍃', 'morning']]
  },
  crowd: {
    names: ['mert', 'elif', 'deniz', 'can', 'zeynep', 'arda', 'ece', 'kerem', 'selin', 'yusuf', 'nil', 'aylin', 'emir', 'defne', 'irem', 'baran',
            'melis', 'ozan', 'ceren', 'kaan', 'derin', 'tuna', 'buse', 'efe', 'asya', 'umut', 'naz', 'alp', 'duru', 'berk'],
    any: ['çok güzelsin 😍', 'bu ne güzellik', 'kraliçe 👑', 'efsane', '😍😍', 'ışık harika', 'bayıldım', 'çok tatlı 🥺', 'vay be', 'aşırı iyi çıkmışsın',
          'bu enerjiyi istiyorum', '🔥🔥', 'en sevdiğim fotoğrafın', 'çok yakışmış', 'ay çok güzel', '❤️', 'daha çok paylaş!!', 'profil fotoğrafı olmalı bu',
          'gözlerin 😍', 'harikasın', 'masallardan çıkmış gibi'],
    place: ['{place} çok güzel görünüyor', 'aa sen de mi {place}?!', '{place} 😍', '{place} özledim', 'ben de oradaydım geçen hafta!!'],
    caption: ['bu açıklama 😂', 'açıklama 😭', 'aynen öyle', 'çok haklısın', 'ahahah'],
    reply: ['teşekkürlerr 🥰', 'hahah sağ ol', '😘', 'çok tatlısın', 'yapmaa 🥹', '❤️', 'sen de çok tatlısın', 'hehe teşekkürler']
  }
};
