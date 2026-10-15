/*
 * Gracie - hazır karakterlerin tanımları (elle düzenlenebilir)
 * -----------------------------------------------------------
 * Anahtar = fotoğraf setinin id'si (js/data/people.js, tools/build-people.ps1 üretir).
 * Boş bırakılan alanlar Amor havuzundan rastgele seçilir (yaş, şehir, meslek, biyografi...).
 *   name      : görünen ad
 *   archetype : nese | soguk | utangac | flortoz | dramatik | olgun  (konuşma tarzı, Amor motoru)
 *   job       : meslek (EXTRA_JOBS'ta ya da Amor havuzunda olmalı)
 *   age, city : yaş, şehir (Amor havuzundaki şehirlerden)
 *   bio       : profildeki kısa yazı
 *   traits    : özellik etiketleri (bot kuralları bunlara bakar; js/data/traits.js)
 *   about     : profilde "Hakkında" sekmesinde görünen uzun açıklama
 * Amor setlerindeki karakterlere (a-...) de buradan isim/kişilik verebilirsin.
 * Değişiklik yeni kurulumlarda ya da Ayarlar > "Karakterleri yeniden oluştur" sonrası uygulanır.
 */
window.Gracie = window.Gracie || {};

Gracie.PEOPLE_DEFS = {
  // ---- Don't Stop ----
  'ds-ava': { name: 'Ava', archetype: 'soguk', traits: ['Ciddi', 'Özgüvenli', 'Olgun', 'Mantıklı', 'Kısa yazar', 'Resmi konuşur'], job: 'Ofis yöneticisi', bio: 'Çabuk ol, beş dakikaya toplantım var.',
    about: 'Ofisin en meşgul insanı; günü toplantılar ve kahve arasında geçer. Yabancılara mesafeli ve aceleci davranır. Yakınlaştıkça yumuşar: kahve ısmarlar, "günümün en güzel kısmı sensin" der ama kimseye söylememeni ister.' },
  'ds-claire': { name: 'Claire', archetype: 'utangac', traits: ['Utangaç', 'İnatçı', 'Mantıklı', 'Gergin', 'Resmi konuşur', 'Kekeler (b-bir şey)'], job: 'Muhasebeci', bio: 'Lütfen dosyalara dokunma. Sıraları var.',
    about: 'Düzen takıntılı, her şeyin bir sırası olmalı. Heyecanlanınca kekeler. Belli etmemeye çalışsa da seni bekler.' },
  'ds-luna': { name: 'Luna', archetype: 'flortoz', traits: ['Gizemli', 'Kibirli', 'Flörtöz', 'Uzun yazar', 'Resmi konuşur'], job: 'Cadı', bio: 'İksirlere dokunma. Hiçbirine.',
    about: 'Kulesinde yaşayan bir cadı; insanlara "ölümlü" der. Çayları "sadece biraz" büyülüdür. Ay ışığını, büyü kitabını ve geleceği okumayı sever.' },
  'ds-roxy': { name: 'Roxy', archetype: 'nese', traits: ['Asi', 'İnatçı', 'Komik', 'Kısa yazar', 'Argo kullanır'], job: 'Atlet', bio: 'Konuşamam. Antrenman.',
    about: 'Rekabetçi bir koşucu; sürekli antrenmanda. Sert görünür ama sana çalma listesi yapar, "sadece şarkılar!" der.' },
  'ds-chloe': { name: 'Chloe', archetype: 'olgun', traits: ['Sakin', 'Mantıklı', 'Flörtöz', 'Korumacı', 'Resmi konuşur'], job: 'Doktor', bio: 'Doldurmam gereken on yedi dosya var. Kısa kes.',
    about: 'Nöbetten nöbete koşan bir doktor; her şeyi tıbbi dille anlatır. İltifatları bile reçete gibidir: "Reçete: beni daha sık gör."' },
  'ds-scarlett': { name: 'Scarlett', archetype: 'soguk', traits: ['Ciddi', 'Olgun', 'Dürüst', 'Soğuk', 'Resmi konuşur'], job: 'Öğretmen', bio: 'Geç kaldın. Otur.',
    about: 'Kuralcı ve disiplinli bir öğretmen. Az takdir eder ama ettiğinde içtendir: "Seninle gurur duyuyorum. İşte. Söyledim."' },
  'ds-liza': { name: 'Liza', archetype: 'dramatik', traits: ['Alaycı', 'İnatçı', 'Duygusal', 'Uzun yazar'], job: 'Yazar', bio: 'Yazıyorum. Omzumun üstünden okuma.',
    about: 'Parkta not defterine yazan, huysuz görünen bir yazar. Yazdıklarını okuyan tek kişi sensin ve bu hoşuna gidiyor.' },
  'ds-ash': { name: 'Ash', archetype: 'utangac', traits: ['Sakin', 'Gizemli', 'Utangaç', 'Kısa yazar', 'Hep küçük harf'], job: 'Öğrenci', bio: '...Selam.',
    about: 'Parktaki bankında oturan, az konuşan gotik bir kız. Güvercinleri sever. Gün batımını seninle izlemek ister.' },
  'ds-mia': { name: 'Mia', archetype: 'nese', traits: ['Neşeli', 'Sakin', 'Korumacı', 'Olgun', 'Emoji sever'], job: 'Yoga eğitmeni', bio: 'Nefes al... nefes ver. Daha iyi mi?',
    about: 'Sıcak ve huzurlu. Herkese "tatlım" der, hemen çay koyar. Sen uğrayınca ev daha sıcak gelir.' },
  'ds-lily': { name: 'Lily', archetype: 'flortoz', traits: ['Şımarık', 'Komik', 'Flörtöz', 'Çocuksu', 'Harf uzatır (canımmm)', 'Emoji sever'], job: 'Dansçı', bio: 'Ben sadece ödünç alırım. Çoğunlukla~',
    about: 'Gösterişi seven bir dansçı, cümlelerini "~" ile bitirir. İçten içe sahne korkusu var; yanında daha az gösteriş yapar.' },

  // ---- Carmen (kişilikleri sonra doldurabilirsin) ----
  'carmen-maelys': { name: 'Maëlys Virelle' },
  'carmen-romilly': { name: 'Romilly Finch' },
  'carmen-vesper': { name: 'Vesper Laine' },
  'carmen-anwen': { name: 'Anwen Lorne' },
  'carmen-cressida': { name: 'Cressida Vale' },
  'carmen-ottilie': { name: 'Ottilie Wycliffe' },
  'carmen-lenora': { name: 'Lenora Whitcombe' },
  'carmen-leonie': { name: 'Leonie Ashcroft' },
  'carmen-octavia': { name: 'Octavia Gravesend' },
  'carmen-isabeau': { name: 'Isabeau Quill' }
};

// Amor havuzunda olmayan meslekler: is = kendini tanıtırken ("{job_is}"), doing = ne yapıyorsun sorusuna
Gracie.EXTRA_JOBS = [
  { title: 'Ofis yöneticisi', is: 'bir ofiste yöneticiyim', doing: ['toplantıdayım', 'mail yazıyorum', 'rapor bitiriyorum'], arch: ['soguk', 'olgun'] },
  { title: 'Muhasebeci', is: 'muhasebeciyim', doing: ['dosyaları sıraya koyuyorum', 'tablo dolduruyorum'], arch: ['utangac', 'soguk'] },
  { title: 'Cadı', is: 'cadıyım, evet gerçekten', doing: ['iksir kaynatıyorum', 'büyü kitabımı okuyorum', 'ay ışığını bekliyorum'], arch: ['flortoz', 'dramatik'] },
  { title: 'Atlet', is: 'koşucuyum', doing: ['antrenmandayım', 'koşudan yeni döndüm'], arch: ['nese'] },
  { title: 'Doktor', is: 'doktorum', doing: ['nöbetteyim', 'dosya dolduruyorum', 'hastaneden yeni çıktım'], arch: ['olgun', 'soguk'] },
  { title: 'Öğretmen', is: 'öğretmenim', doing: ['sınav kağıdı okuyorum', 'derse hazırlanıyorum'], arch: ['soguk', 'olgun'] },
  { title: 'Yazar', is: 'yazarım', doing: ['yazıyorum', 'parkta not alıyorum'], arch: ['dramatik', 'utangac'] },
  { title: 'Öğrenci', is: 'öğrenciyim', doing: ['ders çalışıyorum güya', 'parktayım'], arch: ['utangac', 'nese'], student: true, max: 26 },
  { title: 'Yoga eğitmeni', is: 'yoga eğitmeniyim', doing: ['derse hazırlanıyorum', 'çay demliyorum'], arch: ['nese', 'olgun'] },
  { title: 'Dansçı', is: 'dansçıyım', doing: ['provadayım', 'yeni bir koreografi çalışıyorum'], arch: ['flortoz', 'nese'] }
];
