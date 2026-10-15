/*
 * Amor - Küme Sistemi (kişilik tabanlı, durum geçişli diyalog)
 * ------------------------------------------------------------
 * K = (Q, W, C, δ, ρ)
 *   Q: kümeler       S / X / X-1 (X-1a, X-1b…) / X-2 (X-2a, X-2b…) — her senaryonun kendi kümeleri, kümelere özel emojiler
 *   W: anahtar kelimeler  her bağlantının kendi kelimeleri
 *   C: cevap havuzları    bağlantı cümleleri + konuşma kümeleri (niyetler) ve fonksiyonları (girdi → çıktı)
 *   δ: bağlantılar   bulunulan kümeden çıkanlar sırayla denenir, ilk tutan kazanır
 *   ρ: kişilik havuzu    sevdikleri / sevmedikleri kümeler + yazım tarzı (ifadeler, ekler, emojiler)
 * Veri: custom-dialog.js → kume (diyalog editörü kaydeder); yoksa buradaki hazır senaryolar.
 * Uygulama (engine.js) turn() ile, editör (tools/kume-lab.js) aynı işlevlerle çalışır.
 */
window.Amor = window.Amor || {};

Amor.Kume = (() => {
  const KINDS = {
    S: { name: 'S', label: 'Başlangıç', color: '#8b87a0', x: 100 },
    X: { name: 'X', label: 'Konu açıldı', color: '#7b5cff', x: 310 },
    X1: { name: 'X-1', label: 'Süreç', color: '#d98a00', x: 530 },
    X2: { name: 'X-2', label: 'Sonuç', color: '#1f9d6a', x: 760 },
    O: { name: 'K', label: 'Diğer', color: '#0b84d8', x: 420 }
  };
  const COLORS = ['#8b87a0', '#7b5cff', '#d98a00', '#1f9d6a', '#e5484d', '#0b84d8', '#d63ca0', '#5a7d2a'];
  const NEED = {
    kw: 'Anahtar kelime', intent: 'Konuşma kümesi (niyet)', greet: 'Selamlaşma (selam, günaydın)', how: 'Nasılsın / naber'
  };
  // Konuşma kümeleri: editördeki niyetler + özel durumlar + deneyin kendi iki kümesi (Reddetme, Sevdiği)
  const TALK_SPECIAL = ['question', 'fallback', 'tell_name', 'opener'];
  // Örnek fonksiyon: Selamlaşma kümesinde girdiye göre çıktı
  const TALKMAP = {
    greet: {
      outs: [
        { id: 'sabah', name: 'Sabah selamı', lines: ['günaydın{h}! uyandın mı?', 'günaydııın|kahveni içtin mi?'] },
        { id: 'aksam', name: 'Akşam selamı', lines: ['iyi akşamlar{h}|günün nasıl geçti?', 'akşamın güzel olsun'] },
        { id: 'samimi', name: 'Samimi selam', lines: ['heyy naber{h}', 'oo kimler gelmiş'] }
      ],
      ins: [
        { kw: 'günaydın', out: 'sabah' }, { kw: 'gnydn', out: 'sabah' }, { kw: 'sabah', out: 'sabah' }, { kw: 'aydınlık', out: 'sabah' },
        { kw: 'iyi akşamlar', out: 'aksam' }, { kw: 'akşam', out: 'aksam' },
        { kw: 'hey', out: 'samimi' }, { kw: 'slm', out: 'samimi' }
      ]
    }
  };
  const TALK = {
    refuse: {
      nese: ['ayy bu konu hiç bana göre değil ya|başka şey anlat', 'hmm bunu pek sevmem, sen başka ne yaptın?'],
      soguk: ['Bu konu ilgimi çekmiyor.', 'Başka bir şey konuşalım.'],
      utangac: ['şey… bu konuda pek konuşmasak mı?', 'bu konu beni biraz geriyor…'],
      flortoz: ['bu konu beni sıkar|bana biraz kendini anlat', 'yok yok, bunu konuşmayalım'],
      dramatik: ['HAYIR bu konuyu açma lütfen', 'bu konu bana hiç iyi gelmiyor, gerçekten'],
      olgun: ['Açıkçası bu konuya pek girmek istemiyorum.', 'Bunu konuşmasak daha iyi olur bence.']
    },
    love: {
      nese: ['ayy bayılırım buna!!', 'en sevdiğim konu ya'],
      soguk: ['Bu konu ilginç aslında.', 'Bunu severim.'],
      utangac: ['ben de buna bayılırım aslında…', 'bu konuyu çok severim {laugh}'],
      flortoz: ['ooo tam benim konum', 'bayılırım böyle şeylere'],
      dramatik: ['AYY EN SEVDİĞİM ŞEY', 'bu konu benim aşkım resmen'],
      olgun: ['Bu konuyu konuşmayı çok severim.', 'Ne güzel, bunu konuşmayı seviyorum.']
    }
  };

  /* ---------- Şablonlar ---------- */
  const S_ = (id, kind, name, desc, icon, emojis, stay, x, y, extra = {}) =>
    ({ id, kind, name, desc, icon, color: KINDS[kind].color, emojis, emojiChance: 0.5, stay, stayRules: [], x, y, start: false, ...extra });
  const E_ = (id, name, from, to, need, kw, lines, extra = {}) => ({ id, name, desc: '', from, to, need, kw, lines, ...extra });

  const KUME = () => ({
    id: 'kume', name: 'Küme: konu döngüsü', live: false,
    states: [
      S_('S', 'S', 'S', 'Başlangıç / selamlaşma', '👋', ['👋', '😊'], ['hmm anlat bakalım', 'başka ne var ne yok?', 'bugün neler yaptın?'], 90, 220, { start: true }),
      S_('X', 'X', 'X', 'Yeni konu açıldı', '💡', ['👀', '💡'], ['eee, sonra?', 'anlat biraz daha', 'hmm, nasıl yani?'], 300, 220, {
        stayRules: [
          { kw: ['üzülüyorum', 'korkuyorum', 'endişeliyim', 'gerginim'], lines: ['anlıyorum, normal böyle hissetmen', 'üzülme{h}, birlikte düşünürüz'] },
          { kw: ['neden', 'niye', 'nasıl yani'], lines: ['bilmiyorum ki, sen anlat', 'iyi soru|sence neden?'] }
        ] }),
      S_('X1a', 'X1', 'X-1a', 'Süreç: çalışıyor', '⏳', ['💪', '⏳'], ['hmm, sonra?', 'devam et, dinliyorum'], 540, 60),
      S_('X1b', 'X1', 'X-1b', 'Süreç: zorlanıyor', '😮‍💨', ['🫂', '😮‍💨'], ['zor ama geçecek', 'yanındayım, anlat'], 540, 380),
      S_('X2a', 'X2', 'X-2a', 'Başarı · tatmin', '🎉', ['🎉', '✨', '🥳'], ['başka ne var ne yok?', 'iyi ki halloldu'], 800, 60, {
        stayRules: [{ kw: ['teşekkür', 'eyvallah', 'sağ ol'], lines: ['ne demek, hak ettin', 'asıl sana teşekkürler{h}'] }] }),
      S_('X2b', 'X2', 'X-2b', 'Kötü sonuç · teselli', '💔', ['🫂', '🤍'], ['canını sıkma', 'olur böyle şeyler'], 800, 380, { emojiChance: 0.4 })
    ],
    edges: [
      E_('close', 'Kapatma', ['X', 'X1a', 'X1b', 'X2a', 'X2b'], 'S', 'kw', ['neyse', 'boşver', 'geçelim', 'konuyu değiştir', 'unut gitsin', 'önemli değil'],
        ['tamam boşver o zaman|başka ne var?', 'peki, kapattık o konuyu'], { desc: 'konu yarıda bırakılır' }),
      E_('how', 'Nasılsın', ['S'], 'S', 'how', [], ['iyiyim, sen nasılsın?', 'iyiyim ya, sen nasılsın?'], { desc: 'konu kelimesi yoksa' }),
      E_('greet', 'Selam', ['S'], 'S', 'greet', [], ['selam{h}|nasılsın?', 'heyy selam', 'selam, ne var ne yok?'], { desc: 'konu kelimesi yoksa' }),
      E_('new', 'Yeni konu', ['S', 'X1a', 'X1b', 'X2a', 'X2b'], 'X', 'kw', ['bak ne oldu', 'bu arada', 'biliyor musun', 'sana bir şey anlatayım', 'haberin var mı'], ['aa, anlat bakalım', 'hmm, ne oldu?', 'dinliyorum{h}'], { desc: 'yeni bir şey anlatılmaya başlandı' }),
      E_('fail', 'Kötü sonuç', ['X1a', 'X1b'], 'X2b', 'kw', ['kaybettik', 'kaldım', 'olmadı', 'reddedildi', 'başaramadım'],
        ['eh olsun, bir dahakine', 'üzüldüm ya|ama sen elinden geleni yaptın', 'boşver, geçer'], { desc: 'iş kötü bitti' }),
      E_('start', 'Başlama', ['X'], 'X1a', 'kw', ['başladı', 'başladım', 'başladık', 'başlıyorum', 'uğraşıyorum', 'hazırlanıyorum', 'giriştim', 'koyuldum'],
        ['kolay gelsin, nasıl gidiyor?', 'aa başladın mı? anlat bakalım', 'hadi bakalım, kolay gelsin'], { desc: 'süreç başlar' }),
      E_('struggle', 'Zorlanma', ['X', 'X1a'], 'X1b', 'kw', ['zor', 'zorlanıyorum', 'yoruldum', 'anlamıyorum', 'sıkıldım', 'bunaldım'],
        ['ah ya, zorlandın mı?', 'mola ver biraz, sonra devam'], { desc: 'süreç zorlaştı' }),
      E_('recover', 'Toparlanma', ['X1b'], 'X1a', 'kw', ['toparladım', 'açıldım', 'anladım', 'kolaylaştı', 'yoluna girdi'],
        ['işte bu!', 'gördün mü, açıldın'], { desc: 'zorluk aşıldı, süreç devam' }),
      E_('cont', 'Sürüyor', ['X1a', 'X1b'], '', 'kw', ['hâlâ', 'hala', 'bitmedi', 'uzadı', 'sürüyor', 'yarısındayım', 'daha var'],
        ['bitmedi mi daha?', 'sabır… az kaldı', 'hâlâ mı? çok uzadı ya'], { desc: 'süreç devam ediyor (aynı kümede kalır)' }),
      E_('finish', 'Bitiş', ['X1a', 'X1b'], 'X2a', 'kw', ['bitti', 'bitirdim', 'bitirdik', 'tamamladım', 'hallettim', 'teslim ettim', 'çözdüm',
        'geçtim', 'kazandım', 'kazandık', 'kabul edildi', 'açıklandı'],
        ['oh be sonunda', 'bitti mi yani? süper', 'tebrikler, çok sevindim'], { desc: 'süren iş iyi biter' }),
      E_('praise', 'Övgü', ['X2a'], '', 'kw', ['başardım', 'yaptım işte', 'gurur', 'nasıl ama', 'gördün mü', 'aferin bana', 'helal bana'],
        ['aferin sana!', 'helal olsun, gurur duydum', 'biliyordum yapacağını{h}'], { desc: 'kullanıcı başarısıyla övünür → karakter över' }),
      E_('satisfy', 'Tatmin', ['X2a'], 'S', 'kw', ['rahatladım', 'oh be', 'mutluyum', 'içim rahat', 'değdi', 'huzurluyum', 'kafam rahat'],
        ['oh ne güzel, rahatla şimdi', 'hak ettin bu rahatlığı|başka ne var ne yok?', 'mutlu olmana sevindim{h}'], { desc: 'kullanıcı rahatladı → konu kapanır' }),
      E_('comfort', 'Teselli kabul', ['X2b'], 'S', 'kw', ['sağ ol', 'iyi geldi', 'toparlarım', 'geçer', 'haklısın'],
        ['tabii ki, hep buradayım', 'sen toparlarsın, biliyorum'], { desc: 'teselli işe yaradı → konu kapanır' }),
      E_('restart', 'Yeniden başlama', ['X2a', 'X2b'], 'X1a', 'kw', ['yine', 'tekrar', 'yeniden', 'baştan', 'bir daha'],
        ['yine mi başladı?', 'eyvah, tekrar mı', 'hadi bakalım, bir tur daha'], { desc: 'biten süreç tekrar başlar' })
    ],
    samples: [
      ['Tam döngü', ['selam', 'bak ne oldu, yarın sınavım var', 'bu akşam ders çalışmaya başladım', 'konu çok zor ya, anlamıyorum', 'tamam toparladım şimdi', 'sonunda bitirdim', 'başardım işte!', 'oh be rahatladım', 'bu arada akşam maç var']],
      ['Kötü sonuç', ['bu arada akşam maç var', 'maç başladı', 'kaybettik ya', 'sağ ol iyi geldi']],
      ['Bitmiş konu yeniden', ['bak ne oldu, toplantı uzadı', 'sunumu hazırlamaya başladım', 'hallettim', 'patron yine istedi', 'hâlâ sürüyor', 'teslim ettim']],
      ['Kapatıp yeniden açma', ['bu arada film izliyorum', 'izlemeye başladım', 'neyse boşver', 'biliyor musun, sınava çalışmaya başladım', 'sonuç açıklandı, geçtim']],
      ['Kelimesiz mesajlar', ['bak ne oldu, kedim hasta', 'hmm', 'çok üzülüyorum', 'ilaçlara başladık', 'ok']],
      ['Nasılsın? (kişilik)', ['selam', 'nasılsın?']]
    ]
  });

  const BULUSMA = () => ({
    id: 'bulusma', name: 'Örnek: buluşma ayarlama', live: true,
    states: [
      S_('sohbet', 'S', 'Sohbet', 'Gündelik sohbet', '💬', ['💬', '😊'], ['hmm anlat', 'başka ne var?'], 100, 200, { start: true }),
      S_('teklif', 'X', 'Teklif', 'Buluşma teklif edildi', '💌', ['💌', '🙈'], ['eee? nereye?', 'cevabını bekliyorum'], 330, 200),
      S_('kararsiz', 'X1', 'Kararsız', 'Karar verilemiyor', '🤔', ['🤔'], ['hadi ama', 'çok düşünme'], 560, 80),
      S_('gun', 'X1', 'Gün seçimi', 'Kabul edildi, gün aranıyor', '🗓️', ['🗓️', '😊'], ['ne zaman müsaitsin?', 'hangi gün olsun?'], 560, 320),
      S_('plan', 'X2', 'Plan', 'Gün ve saat belli', '📅', ['📅', '✨'], ['görüşmeye az kaldı', 'ne giysem acaba'], 800, 80),
      S_('iptal', 'X2', 'Vazgeçti', 'Buluşma iptal', '💔', ['💔'], ['…', 'tamam'], 800, 320, { color: '#e5484d', emojiChance: 0.3 })
    ],
    edges: [
      E_('selam', 'Selam', ['sohbet'], 'sohbet', 'greet', [], ['selam{h}', 'heyy']),
      E_('teklif', 'Teklif', ['sohbet', 'kararsiz'], 'teklif', 'kw', ['buluşalım', 'görüşelim', 'kahve içelim', 'dışarı çıkalım', 'tanışalım'],
        ['aa ciddi misin?|nereye gidelim?', 'olabilir aslında… ne zaman?']),
      E_('kararsiz', 'Kararsızlık', ['teklif'], 'kararsiz', 'kw', ['bilmem', 'emin değilim', 'belki', 'sonra bakarız', 'düşüneyim'],
        ['hmm ama sen teklif ettin ya|hadi karar ver', 'düşün düşün, ben buradayım']),
      E_('kabul', 'Kabul', ['teklif'], 'gun', 'kw', ['olur', 'tamam', 'neden olmasın', 'gelirim', 'hadi'],
        ['yaşasın!|ne zaman olsun?', 'süper, gün söyle']),
      E_('plan', 'Plan', ['kararsiz', 'gun'], 'plan', 'kw', ['yarın', 'akşam', 'cumartesi', 'pazar', 'saat', 'anlaştık'],
        ['tamamdır, not aldım', 'süper, sabırsızlanıyorum']),
      E_('iptal', 'İptal', ['kararsiz', 'gun', 'plan'], 'iptal', 'kw', ['vazgeçtim', 'iptal', 'olmaz', 'gelemem', 'erteleyelim'],
        ['hıı… peki', 'anladım, başka zaman artık']),
      E_('baris', 'Barışma', ['iptal'], 'teklif', 'kw', ['şaka', 'yine de', 'tekrar düşündüm'], ['hmm, ikna etmeye çalış bakalım']),
      E_('kapat', 'Konu kapandı', ['plan', 'iptal'], 'sohbet', 'kw', ['neyse', 'başka konu', 'boşver'], ['peki, ne anlatıyordun?'])
    ],
    samples: [
      ['Teklif → plan', ['selam', 'bu hafta kahve içelim mi?', 'bilmem ki emin değilim', 'cumartesi olur mu?', 'neyse boşver']],
      ['İptal ve barış', ['dışarı çıkalım mı', 'olur, gelirim', 'erteleyelim ya gelemem', 'şaka şaka yine de gel', 'tamam gelirim', 'yarın saat 8 de']]
    ]
  });

  const BLANK = name => ({
    id: uid('sc'), name, live: false,
    states: [S_('bas', 'S', 'S', 'Başlangıç', '👋', ['👋'], ['hmm anlat bakalım'], 100, 200, { start: true })],
    edges: [E_('selam', 'Selam', ['bas'], 'bas', 'greet', [], ['selam{h}|nasılsın?'])],
    samples: []
  });

  /* Konu senaryoları: her konunun kendi X-1 (süreç) ve X-2 (sonuç) yolları */
  const close_ = lines => E_('close', 'Kapatma', ['X', 'X1a', 'X1b', 'X2a', 'X2b'], 'S', 'kw', ['neyse', 'boşver', 'konuyu değiştir', 'geçelim'], lines, { desc: 'konu yarıda bırakılır' });
  const hello_ = () => [
    E_('how', 'Nasılsın', ['S'], 'S', 'how', [], [], { use: ['how_are_you'], desc: 'cevap «Nasılsın» konuşma kümesinden' }),
    E_('greet', 'Selam', ['S'], 'S', 'greet', [], [], { use: ['greet'], desc: 'cevap «Selamlaşma» konuşma kümesinden' })
  ];
  const OKUL = () => ({
    id: 'okul', name: 'Konu: Okul / sınav', live: true,
    states: [
      S_('S', 'S', 'S', 'Başlangıç', '👋', ['👋'], ['hmm anlat bakalım', 'okul nasıl gidiyor?'], 90, 220, { start: true }),
      S_('X', 'X', 'X', 'Okul konusu açıldı', '📚', ['📚', '✏️'], ['eee, okul nasıl?', 'anlat bakalım'], 300, 220, {
        stayRules: [{ kw: ['hoca', 'öğretmen'], lines: ['hocalar hep böyle ya', 'hoca ne dedi?'], use: [] }] }),
      S_('X1a', 'X1', 'X-1a', 'Ders çalışıyor', '✏️', ['✏️', '💪'], ['kolay gelsin', 'hangi derse çalışıyorsun?'], 540, 80),
      S_('X1b', 'X1', 'X-1b', 'Sınav stresi', '😰', ['🫂'], ['derin nefes al', 'yapacaksın, eminim'], 540, 360),
      S_('X2a', 'X2', 'X-2a', 'Geçti / iyi not', '🎓', ['🎉', '🎓'], ['başka ne var ne yok?', 'iyi ki halloldu'], 800, 80),
      S_('X2b', 'X2', 'X-2b', 'Kaldı / kötü not', '📉', ['🤍'], ['canını sıkma', 'olur böyle şeyler'], 800, 360, { emojiChance: 0.3 })
    ],
    edges: [
      close_(['tamam, okulu kapattık|başka ne var?']), ...hello_(),
      E_('open', 'Okul konusu', ['S'], 'X', 'kw', ['okul', 'ders', 'sınav', 'vize', 'final', 'quiz', 'ödev', 'hoca', 'üniversite', 'kampüs', 'lise', 'sınıf', 'dönem'], ['aa okul mu? anlat', '{w} mı? nasıl gidiyor?'], { desc: 'mesajda okul kelimesi geçti' }),
      E_('study', 'Çalışma', ['X'], 'X1a', 'kw', ['çalışıyorum', 'çalışmaya başladım', 'ödev yapıyorum', 'tekrar ediyorum', 'hazırlanıyorum', 'kütüphane'],
        ['kolay gelsin, hangi ders?', 'aferin, çalışkan seni'], { desc: 'ders çalışma süreci başlar' }),
      E_('stress', 'Stres', ['X', 'X1a'], 'X1b', 'kw', ['stres', 'korkuyorum', 'heyecan', 'gerginim', 'yetişmeyecek', 'panik'],
        ['sakin ol{h}, yetişir', 'çok normal stres yapman|ama sen hazırsın'], { desc: 'sınav kaygısı' }),
      E_('calm', 'Sakinleşme', ['X1b'], 'X1a', 'kw', ['sakinleştim', 'toparladım', 'kendime geldim'], ['işte böyle, devam'], { desc: 'stres geçti, çalışmaya dönüş' }),
      E_('pass', 'Geçti', ['X1a', 'X1b'], 'X2a', 'kw', ['geçtim', 'yüksek aldım', 'iyi geçti', 'tam puan'],
        ['tebrikler!!|biliyordum yapacağını', 'helal olsun sana'], { desc: 'iyi sonuç' }),
      E_('fail', 'Kaldı', ['X1a', 'X1b'], 'X2b', 'kw', ['kaldım', 'düşük aldım', 'kötü geçti', 'berbat geçti'],
        ['üzüldüm ama telafisi var', 'bir dahakine{h}, boşver'], { desc: 'kötü sonuç' }),
      E_('praise', 'Övgü', ['X2a'], '', 'kw', ['başardım', 'gurur'], ['aferin sana!', 'gurur duydum seninle'], { desc: 'övünür → karakter över' }),
      E_('satisfy', 'Tatmin', ['X2a'], 'S', 'kw', ['rahatladım', 'oh be', 'mutluyum'], ['hak ettin bu rahatlığı'], { desc: 'konu tatminle kapanır' }),
      E_('comfort', 'Teselli', ['X2b'], 'S', 'kw', ['sağ ol', 'haklısın', 'telafi ederim'], ['hep buradayım'], { desc: 'teselli kabul edildi' }),
      E_('retry', 'Yeniden çalışma', ['X2b'], 'X1a', 'kw', ['tekrar çalışacağım', 'bütünlemeye çalışıyorum', 'yeniden'], ['bu sefer olacak, eminim'], { desc: 'telafi süreci' })
    ],
    samples: [
      ['İyi sonuç', ['selam', 'yarın sınavım var', 'kütüphanede çalışıyorum', 'çok stres oldum ya', 'toparladım', 'geçtim!', 'başardım işte', 'oh be rahatladım']],
      ['Kötü sonuç', ['okul berbat', 'ödev yapıyorum', 'kötü geçti', 'sağ ol']],
      ['Nasılsın', ['selam', 'nasılsın?']]
    ]
  });
  const FUTBOL = () => ({
    id: 'futbol', name: 'Konu: Futbol', live: true,
    states: [
      S_('S', 'S', 'S', 'Başlangıç', '👋', ['👋'], ['hmm anlat bakalım', 'bugün ne yaptın?'], 90, 220, { start: true }),
      S_('X', 'X', 'X', 'Maç konusu açıldı', '⚽', ['⚽'], ['hangi takımlısın sen?', 'maç ne zaman?'], 300, 220, {
        stayRules: [{ kw: ['hakem'], lines: ['hakemler hep böyle ya', 'hakem yine ne yaptı?'], use: [] }] }),
      S_('X1a', 'X1', 'X-1a', 'Maç izleniyor', '📺', ['📺', '🍿'], ['kimin önde?', 'nasıl gidiyor maç?'], 540, 80),
      S_('X1b', 'X1', 'X-1b', 'Zor maç', '😬', ['😬'], ['dayanın!', 'daha bitmedi'], 540, 360),
      S_('X2a', 'X2', 'X-2a', 'Kazandık', '🏆', ['🏆', '🎉'], ['güzel maçtı', 'bu akşam keyifler yerinde'], 800, 80),
      S_('X2b', 'X2', 'X-2b', 'Kaybettik', '😞', ['🤍'], ['olur böyle', 'bir sonraki maça bak'], 800, 360, { emojiChance: 0.3 })
    ],
    edges: [
      close_(['tamam, maçı bırakalım|başka ne var?']), ...hello_(),
      E_('open', 'Futbol konusu', ['S'], 'X', 'kw', ['maç', 'futbol', 'gol', 'derbi', 'lig', 'galatasaray', 'fenerbahçe', 'beşiktaş', 'trabzonspor', 'cimbom', 'fener', 'taraftar', 'stadyum', 'şampiyon', 'penaltı', 'transfer'], ['maç mı var? hangi takım?', '{w} mı? anlat bakalım'], { desc: 'mesajda futbol kelimesi geçti' }),
      E_('watch', 'İzleme', ['X'], 'X1a', 'kw', ['izliyorum', 'başladı', 'devre', 'canlı'], ['kimin önde?', 'keyifli seyirler'], { desc: 'maç başladı' }),
      E_('tense', 'Zorlanma', ['X', 'X1a'], 'X1b', 'kw', ['gol yedik', 'gerideyiz', 'geriye düştük', 'kırmızı kart', 'sakatlandı'],
        ['eyvah, dayanın!', 'daha bitmedi, umut var'], { desc: 'maç kötü gidiyor' }),
      E_('comeback', 'Toparlanma', ['X1b'], 'X1a', 'kw', ['gol attık', 'eşitledik', 'toparladık'], ['işte bu!!', 'hadi bir gol daha'], { desc: 'skor döndü' }),
      E_('win', 'Kazanma', ['X1a', 'X1b'], 'X2a', 'kw', ['kazandık', 'galibiz', 'yendik'], ['tebrikler!!', 'oley, helal olsun'], { desc: 'maç kazanıldı' }),
      E_('lose', 'Kaybetme', ['X1a', 'X1b'], 'X2b', 'kw', ['kaybettik', 'yenildik', 'berabere bitti', 'elendik'],
        ['üzüldüm ya', 'boş ver, rövanşı var'], { desc: 'maç kaybedildi' }),
      E_('party', 'Kutlama', ['X2a'], '', 'kw', ['kutluyoruz', 'bayram', 'harikaydı'], ['kutlayın bakalım!', 'bu akşam uyku yok o zaman'], { desc: 'kazanma sevinci' }),
      E_('satisfy', 'Tatmin', ['X2a'], 'S', 'kw', ['mutluyum', 'keyfim yerinde', 'oh be'], ['keyfin hep yerinde olsun'], { desc: 'konu tatminle kapanır' }),
      E_('comfort', 'Teselli', ['X2b'], 'S', 'kw', ['sağ ol', 'haklısın', 'bir dahaki'], ['hep buradayım'], { desc: 'teselli kabul edildi' }),
      E_('rematch', 'Rövanş', ['X2b'], 'X1a', 'kw', ['rövanş', 'yine oynuyoruz', 'bir sonraki maç'], ['rövanşta alırsınız'], { desc: 'yeni maç' })
    ],
    samples: [
      ['Kazanma', ['selam', 'akşam fenerbahçe maçı var', 'maçı izliyorum', 'gol yedik ya', 'eşitledik!', 'kazandık!!', 'kutluyoruz', 'mutluyum']],
      ['Kaybetme', ['maç var bugün', 'başladı', 'kaybettik', 'sağ ol']]
    ]
  });

  // likes / dislikes: "senaryo:küme" — iki listede olmayan küme nötr (konuşmayı kabul eder), sevmediğine girilmez (Reddetme)
  const PERSONA = {
    nese: { habits: ['iyiyim > iyidir ya', 'sen nasılsın > sen?', 'ne yapıyorsun > napıyon', 'tamam > tmm'], tail: [' ya', ' :d'], max: 3,
      likes: ['futbol:X2a', 'okul:X2a'], dislikes: [] },
    soguk: { habits: ['tebrikler, çok sevindim > tebrikler', 'helal olsun, gurur duydum > güzel', 'devam et, dinliyorum > devam et'], tail: ['.'], max: 1,
      likes: ['okul:X1a'], dislikes: ['futbol:X'] },
    utangac: { habits: ['iyiyim > ii', 'sen nasılsın > sen?', 'anlat > şey… anlatsana'], tail: ['...'], max: 2,
      likes: ['okul:X1a'], dislikes: ['futbol:X1b'] },
    flortoz: { habits: ['iyiyim > fena değilim :d', 'ne yapıyorsun > napıyosun bakalım', 'aferin sana > aferin benim akıllıma'], tail: [' 😏'], max: 2,
      likes: ['futbol:X2a'], dislikes: ['okul:X1a'] },
    dramatik: { habits: ['sonunda > SONUNDAAA', 'çok > ÇOK', 'süper > MUHTEŞEM', 'gurur duydum > GURUR DUYDUM'], tail: ['!!!'], max: 3,
      likes: ['futbol:X1b', 'okul:X1b'], dislikes: [] },
    olgun: { habits: ['napıyon > ne yapıyorsun', 'eee > Eee'], tail: ['.'], max: 2,
      likes: ['okul:X2a'], dislikes: ['futbol:X1b'] }
  };
  const BUILTIN = { okul: OKUL, futbol: FUTBOL, kume: KUME, bulusma: BULUSMA };
  const DEF = () => ({ scenarios: Object.fromEntries(Object.entries(BUILTIN).map(([k, f]) => [k, f()])), order: Object.keys(BUILTIN), removed: [],
    active: 'okul', persona: clone(PERSONA), talk: clone(TALK), talkMap: clone(TALKMAP) });

  /* "her küme" (*) kaldırıldı: yol çizilmeden atlama olmasın. Başlangıca giden selam / nasılsın sadece başlangıçtan,
   * diğerleri hedef dışındaki bütün kümelerden çalışan açık bir yol olur (editörde istenmeyen kaynak kaldırılır). */
  function noStar(sc) {
    const start = (sc.states.find(s => s.start) || sc.states[0] || {}).id;
    sc.edges.forEach(e => {
      if (!(e.from || []).includes('*')) return;
      e.from = ['greet', 'how'].includes(e.need) && (e.to || start) === start ? [start]
        : sc.states.map(s => s.id).filter(id => id !== e.to);
    });
    return sc;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid(p) { return p + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }

  // raw: custom-dialog.js → kume (editörün kaydettiği). Eksik hazır senaryoları, kişilik havuzlarını ve cümleleri tamamlar, kullanıcınınkilere dokunmaz.
  function load(raw) {
    if (!raw || !raw.scenarios || !raw.order || !raw.order.length) return DEF();
    const c = { ...DEF(), ...clone(raw) };
    // Hazır senaryo sadece editörde bilerek silindiyse (removed) geri gelmez
    c.removed = c.removed || [];
    delete c.seeded;
    Object.entries(BUILTIN).forEach(([id, f]) => {
      if (c.removed.includes(id)) return;
      if (!c.scenarios[id]) c.scenarios[id] = f();
      if (!c.order.includes(id)) c.order.unshift(id);
    });
    Object.values(c.scenarios).forEach(sc => {
      if (sc.live === undefined) sc.live = sc.id !== 'kume';
      noStar(sc);
      // Konular kaldırıldı: konu bağlantısı hazır şablonda varsa şablondakiyle, yoksa anahtar kelime bağlantısıyla değişir
      const tpl = BUILTIN[sc.id] && BUILTIN[sc.id]();
      sc.edges = sc.edges.map(e => !/^topic/.test(e.need) ? e : (tpl && tpl.edges.find(x => x.id === e.id)) || { ...e, need: 'kw' });
    });
    Object.entries(PERSONA).forEach(([aid, p]) => {
      const cur = c.persona[aid] = c.persona[aid] || clone(p);
      if (!cur.likes) cur.likes = [...p.likes];
      if (!cur.dislikes) cur.dislikes = [...p.dislikes];
    });
    c.talk = { refuse: { ...TALK.refuse, ...((c.talk || {}).refuse || {}) }, love: { ...TALK.love, ...((c.talk || {}).love || {}) } };
    if (!c.talkMap) c.talkMap = clone(TALKMAP);
    return c;
  }

  /* ---------- Motor (uygulama ve editör ortak) ---------- */
  const E = () => Amor.Engine;
  const stIn = (sc, id) => sc.states.find(s => s.id === id);
  const edIn = (sc, id) => sc.edges.find(e => e.id === id);
  const startOf = sc => (sc.states.find(s => s.start) || sc.states[0]).id;
  const fromOk = (e, sid) => e.from.includes('*') || e.from.includes(sid);
  const toOf = (e, sid) => e.to || sid;   // '' = aynı kümede kalır
  const live = (sc, e, sid) => fromOk(e, sid) && !!stIn(sc, sid) && !!stIn(sc, toOf(e, sid));

  // Kelimenin başı eşleşir: "bitti" → "bittiii", "bitirdim"
  function hit(list, text) {
    const t = ' ' + text;
    return (list || []).find(w => { const p = E().norm(w); return p && t.includes(' ' + p); }) || null;
  }

  /* Konuşma kümesinin fonksiyonu: girdi → çıktı (cevap grubu).
   * Girdi tek kelime / kelime grubu ya da "x + y" kombinasyonu: her parça mesajın herhangi bir yerinde geçmeli (aralarına kelime girebilir).
   * En özel girdi önce denenir: önce parça sayısı, sonra uzunluk. */
  const parts = kw => String(kw || '').split('+').map(x => x.trim()).filter(Boolean);
  const weight = kw => parts(kw).length * 1000 + E().norm(kw).length;
  function talkMatch(cfg, id, text) {
    const m = cfg.talkMap[id];
    if (!m || !text) return null;
    const t = E().norm(text);
    const ins = m.ins.filter(x => m.outs.some(o => o.id === x.out)).sort((a, b) => weight(b.kw) - weight(a.kw));
    const i = ins.find(x => { const p = parts(x.kw); return p.length && p.every(w => hit([w], t)); });
    return i ? { input: i, out: m.outs.find(o => o.id === i.out) } : null;
  }
  // owner: karakter (lines + archetype) ya da arketip (lines + id). Niyet cümleleri ondan; Reddetme / Sevdiği kişilik havuzundan
  function talkLines(cfg, owner, id) {
    const aid = owner && (owner.archetype || owner.id);
    if (id === 'refuse' || id === 'love') return (cfg.talk[id] || {})[aid] || [];
    return (owner && owner.lines && owner.lines[id]) || [];
  }
  // Havuz = kendi cümleleri + seçilen konuşma kümelerinin cümleleri; mesaj bir kümenin girdisine uyarsa sadece o çıktının cümleleri
  function compose(cfg, owner, own, use, label, text, name = x => x) {
    const hits = (use || []).map(id => ({ id, m: talkMatch(cfg, id, text) })).filter(x => x.m && x.m.out.lines.length);
    if (hits.length) return { pool: hits.flatMap(x => x.m.out.lines),
      src: label + ' · ' + hits.map(x => `«${name(x.id)}» fonksiyonu: «${x.m.input.kw}» → «${x.m.out.name}»`).join(', ') };
    const refs = (use || []).filter(id => talkLines(cfg, owner, id).length);
    const pool = [...(own || []), ...refs.flatMap(id => talkLines(cfg, owner, id))];
    return { pool: pool.length ? pool : ['hmm'], src: label + (refs.length ? ' + konuşma kümesi ' + refs.map(id => `«${name(id)}»`).join(', ') : '') };
  }

  /* δ: bulunulan kümeden çıkan bağlantılar sırayla denenir, ilk tutan kazanır.
   * Tutmazsa kümede kalınır; kümenin kelimeli kalma cevaplarından ilk tutanı seçilir (rule). */
  function delta(cfg, sc, s, raw, name = x => x) {
    const text = E().norm(raw);
    const d = E().detect(raw);
    // "selam, yarın sınavım var": bu kümeden çıkan bir anahtar kelime bağlantısı da tutuyorsa selam / nasılsın ona yol verir
    const kwOther = sc.edges.some(e => e.need === 'kw' && live(sc, e, s.st) && hit(e.kw, text));
    for (const e of sc.edges) {
      if (!live(sc, e, s.st)) continue;
      const kw = hit(e.kw, text);
      let ok = false, word = null;
      if (e.need === 'kw') { ok = !!kw; word = kw; }
      // konuşma kümesinin ƒ girdileri de o kümeyi tetikler ("iyi akşamlar" → Selamlaşma)
      else if (e.need === 'greet') { const f = talkMatch(cfg, 'greet', raw); ok = ((['greet', 'morning'].includes(d.intent) || d.greet) && d.intent !== 'how_are_you' || !!f) && !kwOther; word = f ? f.input.kw : d.word || 'selam'; }
      else if (e.need === 'how') { const f = talkMatch(cfg, 'how_are_you', raw); ok = (d.intent === 'how_are_you' || !!f) && !kwOther; word = f ? f.input.kw : d.word || 'nasılsın'; }
      else if (e.need === 'intent') { const f = e.intent && talkMatch(cfg, e.intent, raw); ok = !!e.intent && (d.intent === e.intent || !!f); word = f ? f.input.kw : d.word || name(e.intent); }
      if (!ok) continue;
      return { edge: e.id, st: toOf(e, s.st), word };
    }
    const rules = (stIn(sc, s.st) || {}).stayRules || [];
    for (let i = 0; i < rules.length; i++) {
      const kw = hit(rules[i].kw, text);
      if (kw) return { edge: null, st: s.st, word: kw, rule: i };
    }
    return { edge: null, st: s.st, word: null };
  }
  // C: bağlantının (ya da kalmanın) cevap havuzu
  function poolFor(cfg, sc, r, from, owner, text, name = x => x) {
    const stName = id => { const s = stIn(sc, id); return s ? `${s.icon || ''} ${s.name}`.trim() : '?'; };
    if (!r.edge) {
      const s = stIn(sc, from), rule = r.rule != null && s && (s.stayRules || [])[r.rule];
      if (rule && (rule.lines.length || (rule.use || []).length)) return compose(cfg, owner, rule.lines, rule.use, `«${stName(from)}» kalma · kelime «${r.word}»`, text, name);
      return compose(cfg, owner, s && s.stay, s && s.stayUse, `«${stName(from)}» kümesinde kalma cümleleri`, text, name);
    }
    const e = edIn(sc, r.edge);
    return compose(cfg, owner, e.lines, e.use, `bağlantı «${e.name}»`, text, name);
  }

  // Kişiliğin bu kümeye tutumu: 'like' | 'dislike' | null (nötr: konuşmayı kabul eder)
  function pref(cfg, aid, sid, scId) {
    const P = cfg.persona[aid] || {}, ref = scId + ':' + sid;
    return (P.dislikes || []).includes(ref) ? 'dislike' : (P.likes || []).includes(ref) ? 'like' : null;
  }

  // ρ: ifade tercihleri / yazım alışkanlıkları ("kalıp > söyleyiş"), rastgele değil her zaman
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function habits(P, s, trace) {
    (P && P.habits || []).forEach(hb => {
      const [from, to] = hb.split('>').map(x => x.trim());
      if (!from || to === undefined) return;
      const re = new RegExp(reEsc(from), 'giu');
      if (re.test(s)) { s = s.replace(re, to); if (trace) trace.push(`«${from}» → «${to}»`); }
    });
    return s;
  }
  // ρ: cümle sonu ekleri (1..tailMax farklı ek); soru / ünlemle biten cümleye eklenmez
  function tails(P, s, trace) {
    if (!P || !P.tail || !P.tail.length || /[?!.…]$/.test(s) || Math.random() >= (P.tailChance ?? 0.5)) return s;
    const low = s.toLocaleLowerCase('tr');
    const free = P.tail.filter(x => x.trim() && !low.endsWith(x.trim().toLocaleLowerCase('tr'))); // "…konu ya" + " ya" olmasın
    if (!free.length) return s;
    const n = 1 + Math.floor(Math.random() * Math.min(P.tailMax || 1, free.length));
    const tl = [...free].sort(() => Math.random() - 0.5).slice(0, n);
    if (trace) trace.push(`son ek ${tl.map(x => `«${x.trim()}»`).join(' ')}`);
    return s + tl.join('');
  }

  /* ---------- Uygulama: karakterin küme durumu ----------
   * Store.state.kume[karakter] = { sc, st, ts }. Sadece "uygulamada kullan" (live) senaryolar çalışır. */
  let RT = null;
  const runtime = () => RT || (RT = load(Amor.CUSTOM_DIALOG && Amor.CUSTOM_DIALOG.kume));
  const persona = aid => runtime().persona[aid] || null;
  // Niyetin konuşma kümesi fonksiyonu: mesaj bir girdiye uyarsa o çıktının cümleleri, uymazsa null
  function intentPool(id, text) {
    const m = talkMatch(runtime(), id, text);
    return m && m.out.lines.length ? m.out.lines : null;
  }
  // Mesaj hangi konuşma kümesinin fonksiyon girdisine uyuyor (en uzun girdi kazanır): { id, kw } ya da null
  function fnIntent(text) {
    const cfg = runtime();
    let best = null;
    Object.keys(cfg.talkMap || {}).forEach(id => {
      if (id === 'refuse' || id === 'love') return;
      const m = talkMatch(cfg, id, text);
      if (m && (!best || weight(m.input.kw) > weight(best.kw))) best = { id, kw: m.input.kw };
    });
    return best;
  }
  // Karakter şu an hangi senaryoda ve kümede: { sc, st } ya da null (konu yok / unutuldu)
  function where(c) {
    const cfg = runtime(), ks = ((Amor.Store.state.kume || {})[c.id]);
    if (!ks || Date.now() - (ks.ts || 0) > 30 * 60000) return null;
    const sc = cfg.scenarios[ks.sc], st = sc && sc.live && stIn(sc, ks.st);
    return st ? { sc, st, kind: KINDS[st.kind] } : null;
  }
  /* Bir kullanıcı turu. Senaryoya girildiyse ya da süren senaryoda bir bağlantı / kelimeli kalma tuttuysa cevap havuzunu döner;
   * hiçbir şey tutmazsa null (motor konuşma kümesinin normal cevabını verir). */
  function turn(c, text) {
    const cfg = runtime(), S = Amor.Store.state, all = S.kume = S.kume || {};
    let ks = all[c.id];
    if (ks && (Date.now() - (ks.ts || 0) > 30 * 60000 || !cfg.scenarios[ks.sc] || !cfg.scenarios[ks.sc].live || !stIn(cfg.scenarios[ks.sc], ks.st))) { delete all[c.id]; ks = null; }
    let found = null;
    if (ks) {
      const sc = cfg.scenarios[ks.sc], r = delta(cfg, sc, { st: ks.st }, text);
      if (r.edge || r.rule != null) found = { scId: ks.sc, sc, r, from: ks.st };
    }
    // başka bir senaryoya giriş: başlangıç kümesinden çıkan (başlangıçta kalmayan) bir bağlantı
    if (!found) for (const scId of cfg.order) {
      const sc = cfg.scenarios[scId];
      if (!sc || !sc.live || (ks && scId === ks.sc)) continue;
      const start = startOf(sc), r = delta(cfg, sc, { st: start }, text);
      if (r.edge && r.st !== start) { found = { scId, sc, r, from: start }; break; }
    }
    if (!found) {
      if (ks) ks.ts = Date.now(); // yol yoksa küme değişmez
      return null;
    }
    const { scId, sc, r, from } = found, aid = c.archetype;
    // Sevmediği kümeye girmez: "Sevmediğini reddetme" cümlesi, küme değişmez
    if (r.st !== from && pref(cfg, aid, r.st, scId) === 'dislike') {
      const p = compose(cfg, c, [], ['refuse'], 'reddetme', text);
      if (ks && ks.sc === scId) ks.ts = Date.now();
      return { pool: p.pool[0] === 'hmm' && p.pool.length === 1 ? ['bunu konuşmasak?'] : p.pool, refused: true, state: stIn(sc, from) };
    }
    const p = poolFor(cfg, sc, r, from, c, text);
    const target = stIn(sc, r.st);
    if (r.st === startOf(sc)) delete all[c.id]; // başlangıca dönüş: senaryo biter
    else all[c.id] = { sc: scId, st: r.st, ts: Date.now() };
    const love = r.st !== from && pref(cfg, aid, r.st, scId) === 'like' ? talkLines(cfg, c, 'love') : null;
    return { pool: p.pool, src: p.src, state: target, word: r.word, love };
  }

  return {
    KINDS, COLORS, NEED, TALK_SPECIAL, TALK, TALKMAP, PERSONA, BUILTIN, S_, E_, BLANK, KUME, DEF, clone, uid, load, noStar,
    stIn, edIn, startOf, fromOk, toOf, live, hit, parts, talkMatch, talkLines, compose, delta, poolFor, pref, habits, tails,
    runtime, persona, intentPool, fnIntent, turn, where, reload: () => { RT = null; }
  };
})();
