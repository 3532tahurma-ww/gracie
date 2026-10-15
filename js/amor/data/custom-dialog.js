/* diyalog-editoru.bat ile duzenlenir (tools/dialog-editor.html) */
window.Amor = window.Amor || {};
Amor.CUSTOM_DIALOG = {
 "intents": {},
 "lines": {
  "flortoz": {
   "fallback": [
    "hmm 😏",
    "anlat anlat",
    "oha {laugh}",
    "sonraa?",
    "ciddi misin 😂",
    "bilmem ki 💋",
    "ilginç adamsın 😏",
    "offff yerim",
    "ye beni aşk"
   ]
  }
 },
 "kume": {
  "scenarios": {
   "bulusma": {
    "id": "bulusma",
    "name": "Örnek: buluşma ayarlama",
    "states": [
     {
      "id": "sohbet",
      "kind": "S",
      "name": "Sohbet",
      "desc": "Gündelik sohbet",
      "icon": "💬",
      "color": "#8b87a0",
      "emojis": [
       "💬",
       "😊"
      ],
      "emojiChance": 0.5,
      "stay": [
       "hmm anlat",
       "başka ne var?"
      ],
      "x": 100,
      "y": 200,
      "noTopic": true,
      "start": true
     },
     {
      "id": "teklif",
      "kind": "X",
      "name": "Teklif",
      "desc": "Buluşma teklif edildi",
      "icon": "💌",
      "color": "#7b5cff",
      "emojis": [
       "💌",
       "🙈"
      ],
      "emojiChance": 0.5,
      "stay": [
       "eee? nereye?",
       "cevabını bekliyorum"
      ],
      "x": 330,
      "y": 200,
      "noTopic": false,
      "start": false
     },
     {
      "id": "kararsiz",
      "kind": "X1",
      "name": "Kararsız",
      "desc": "Karar verilemiyor",
      "icon": "🤔",
      "color": "#d98a00",
      "emojis": [
       "🤔"
      ],
      "emojiChance": 0.5,
      "stay": [
       "hadi ama",
       "çok düşünme"
      ],
      "x": 560,
      "y": 90,
      "noTopic": false,
      "start": false
     },
     {
      "id": "plan",
      "kind": "X2",
      "name": "Plan",
      "desc": "Gün ve saat belli",
      "icon": "📅",
      "color": "#1f9d6a",
      "emojis": [
       "📅",
       "✨"
      ],
      "emojiChance": 0.5,
      "stay": [
       "görüşmeye az kaldı",
       "ne giysem acaba"
      ],
      "x": 790,
      "y": 200,
      "noTopic": false,
      "start": false
     },
     {
      "id": "iptal",
      "kind": "X2",
      "name": "Vazgeçti",
      "desc": "Buluşma iptal",
      "icon": "💔",
      "color": "#e5484d",
      "emojis": [
       "💔"
      ],
      "emojiChance": 0.3,
      "stay": [
       "…",
       "tamam"
      ],
      "x": 560,
      "y": 330,
      "noTopic": false,
      "start": false
     }
    ],
    "edges": [
     {
      "id": "selam",
      "name": "Selam",
      "desc": "",
      "from": [
       "sohbet"
      ],
      "to": "sohbet",
      "need": "greet",
      "kw": [],
      "lines": [],
      "tl": "",
      "yield": false,
      "use": []
     },
     {
      "id": "teklif",
      "name": "Teklif",
      "desc": "",
      "from": [
       "sohbet",
       "kararsiz"
      ],
      "to": "teklif",
      "need": "kw",
      "kw": [
       "buluşalım",
       "görüşelim",
       "kahve içelim",
       "dışarı çıkalım",
       "tanışalım"
      ],
      "lines": [
       "aa ciddi misin?|nereye gidelim?",
       "olabilir aslında… ne zaman?"
      ],
      "tl": "",
      "yield": false
     },
     {
      "id": "kararsiz",
      "name": "Kararsızlık",
      "desc": "",
      "from": [
       "teklif"
      ],
      "to": "kararsiz",
      "need": "kw",
      "kw": [
       "bilmem",
       "emin değilim",
       "belki",
       "sonra bakarız",
       "düşüneyim"
      ],
      "lines": [
       "hmm ama sen teklif ettin ya|hadi karar ver",
       "düşün düşün, ben buradayım"
      ],
      "tl": "",
      "yield": false
     },
     {
      "id": "plan",
      "name": "Plan",
      "desc": "",
      "from": [
       "teklif",
       "kararsiz"
      ],
      "to": "plan",
      "need": "kw",
      "kw": [
       "yarın",
       "akşam",
       "cumartesi",
       "pazar",
       "saat",
       "anlaştık"
      ],
      "lines": [
       "tamamdır, not aldım",
       "süper, sabırsızlanıyorum"
      ],
      "tl": "",
      "yield": false
     },
     {
      "id": "iptal",
      "name": "İptal",
      "desc": "",
      "from": [
       "teklif",
       "kararsiz",
       "plan"
      ],
      "to": "iptal",
      "need": "kw",
      "kw": [
       "vazgeçtim",
       "iptal",
       "olmaz",
       "gelemem",
       "erteleyelim"
      ],
      "lines": [
       "hıı… peki",
       "anladım, başka zaman artık"
      ],
      "tl": "",
      "yield": false
     },
     {
      "id": "baris",
      "name": "Barışma",
      "desc": "",
      "from": [
       "iptal"
      ],
      "to": "teklif",
      "need": "kw",
      "kw": [
       "şaka",
       "yine de",
       "tekrar düşündüm"
      ],
      "lines": [
       "hmm, ikna etmeye çalış bakalım"
      ],
      "tl": "",
      "yield": false
     },
     {
      "id": "kapat",
      "name": "Konu kapandı",
      "desc": "",
      "from": [
       "plan",
       "iptal"
      ],
      "to": "sohbet",
      "need": "kw",
      "kw": [
       "neyse",
       "başka konu",
       "boşver"
      ],
      "lines": [
       "peki, ne anlatıyordun?"
      ],
      "tl": "",
      "yield": false
     }
    ],
    "samples": [
     [
      "Teklif → plan",
      [
       "selam",
       "bu hafta kahve içelim mi?",
       "bilmem ki emin değilim",
       "cumartesi olur mu?",
       "neyse boşver"
      ]
     ],
     [
      "İptal ve barış",
      [
       "dışarı çıkalım mı",
       "erteleyelim ya gelemem",
       "şaka şaka yine de gel",
       "yarın saat 8 de"
      ]
     ]
    ],
    "live": true
   },
   "okul": {
    "id": "okul",
    "name": "Konu: Okul / sınav",
    "live": true,
    "states": [
     {
      "id": "S",
      "kind": "S",
      "name": "S",
      "desc": "Başlangıç",
      "icon": "👋",
      "color": "#8b87a0",
      "emojis": [
       "👋"
      ],
      "emojiChance": 0.5,
      "stay": [
       "hmm anlat bakalım",
       "okul nasıl gidiyor?"
      ],
      "stayRules": [],
      "x": 90,
      "y": 220,
      "start": true
     },
     {
      "id": "X",
      "kind": "X",
      "name": "X",
      "desc": "Okul konusu açıldı",
      "icon": "📚",
      "color": "#7b5cff",
      "emojis": [
       "📚",
       "✏️"
      ],
      "emojiChance": 0.5,
      "stay": [
       "eee, okul nasıl?",
       "anlat bakalım"
      ],
      "stayRules": [
       {
        "kw": [
         "hoca",
         "öğretmen"
        ],
        "lines": [
         "hocalar hep böyle ya",
         "hoca ne dedi?"
        ],
        "use": []
       }
      ],
      "x": 300,
      "y": 220,
      "start": false
     },
     {
      "id": "X1a",
      "kind": "X1",
      "name": "X-1a",
      "desc": "Ders çalışıyor",
      "icon": "✏️",
      "color": "#d98a00",
      "emojis": [
       "✏️",
       "💪"
      ],
      "emojiChance": 0.5,
      "stay": [
       "kolay gelsin",
       "hangi derse çalışıyorsun?"
      ],
      "stayRules": [],
      "x": 540,
      "y": 80,
      "start": false
     },
     {
      "id": "X1b",
      "kind": "X1",
      "name": "X-1b",
      "desc": "Sınav stresi",
      "icon": "😰",
      "color": "#d98a00",
      "emojis": [
       "🫂"
      ],
      "emojiChance": 0.5,
      "stay": [
       "derin nefes al",
       "yapacaksın, eminim"
      ],
      "stayRules": [],
      "x": 540,
      "y": 360,
      "start": false
     },
     {
      "id": "X2a",
      "kind": "X2",
      "name": "X-2a",
      "desc": "Geçti / iyi not",
      "icon": "🎓",
      "color": "#1f9d6a",
      "emojis": [
       "🎉",
       "🎓"
      ],
      "emojiChance": 0.5,
      "stay": [
       "başka ne var ne yok?",
       "iyi ki halloldu"
      ],
      "stayRules": [],
      "x": 800,
      "y": 80,
      "start": false
     },
     {
      "id": "X2b",
      "kind": "X2",
      "name": "X-2b",
      "desc": "Kaldı / kötü not",
      "icon": "📉",
      "color": "#1f9d6a",
      "emojis": [
       "🤍"
      ],
      "emojiChance": 0.3,
      "stay": [
       "canını sıkma",
       "olur böyle şeyler"
      ],
      "stayRules": [],
      "x": 800,
      "y": 360,
      "start": false
     }
    ],
    "edges": [
     {
      "id": "close",
      "name": "Kapatma",
      "desc": "konu yarıda bırakılır",
      "from": [
       "X",
       "X1a",
       "X1b",
       "X2a",
       "X2b"
      ],
      "to": "S",
      "need": "kw",
      "kw": [
       "neyse",
       "boşver",
       "konuyu değiştir",
       "geçelim"
      ],
      "lines": [
       "tamam, okulu kapattık|başka ne var?"
      ]
     },
     {
      "id": "how",
      "name": "Nasılsın",
      "desc": "cevap «Nasılsın» konuşma kümesinden",
      "from": [
       "S"
      ],
      "to": "S",
      "need": "how",
      "kw": [],
      "lines": [],
      "use": [
       "how_are_you"
      ]
     },
     {
      "id": "greet",
      "name": "Selam",
      "desc": "cevap «Selamlaşma» konuşma kümesinden",
      "from": [
       "S"
      ],
      "to": "S",
      "need": "greet",
      "kw": [],
      "lines": [],
      "use": [
       "greet"
      ]
     },
     {
      "id": "open",
      "name": "Okul konusu",
      "desc": "mesajda okul kelimesi geçti",
      "from": [
       "S"
      ],
      "to": "X",
      "need": "kw",
      "kw": [
       "okul",
       "ders",
       "sınav",
       "vize",
       "final",
       "quiz",
       "ödev",
       "hoca",
       "üniversite",
       "kampüs",
       "lise",
       "sınıf",
       "dönem"
      ],
      "lines": [
       "aa okul mu? anlat",
       "{w} mı? nasıl gidiyor?"
      ]
     },
     {
      "id": "study",
      "name": "Çalışma",
      "desc": "ders çalışma süreci başlar",
      "from": [
       "X"
      ],
      "to": "X1a",
      "need": "kw",
      "kw": [
       "çalışıyorum",
       "çalışmaya başladım",
       "ödev yapıyorum",
       "tekrar ediyorum",
       "hazırlanıyorum",
       "kütüphane"
      ],
      "lines": [
       "kolay gelsin, hangi ders?",
       "aferin, çalışkan seni"
      ]
     },
     {
      "id": "stress",
      "name": "Stres",
      "desc": "sınav kaygısı",
      "from": [
       "X",
       "X1a"
      ],
      "to": "X1b",
      "need": "kw",
      "kw": [
       "stres",
       "korkuyorum",
       "heyecan",
       "gerginim",
       "yetişmeyecek",
       "panik"
      ],
      "lines": [
       "sakin ol{h}, yetişir",
       "çok normal stres yapman|ama sen hazırsın"
      ]
     },
     {
      "id": "calm",
      "name": "Sakinleşme",
      "desc": "stres geçti, çalışmaya dönüş",
      "from": [
       "X1b"
      ],
      "to": "X1a",
      "need": "kw",
      "kw": [
       "sakinleştim",
       "toparladım",
       "kendime geldim"
      ],
      "lines": [
       "işte böyle, devam"
      ]
     },
     {
      "id": "pass",
      "name": "Geçti",
      "desc": "iyi sonuç",
      "from": [
       "X1a",
       "X1b"
      ],
      "to": "X2a",
      "need": "kw",
      "kw": [
       "geçtim",
       "yüksek aldım",
       "iyi geçti",
       "tam puan"
      ],
      "lines": [
       "tebrikler!!|biliyordum yapacağını",
       "helal olsun sana"
      ]
     },
     {
      "id": "fail",
      "name": "Kaldı",
      "desc": "kötü sonuç",
      "from": [
       "X1a",
       "X1b"
      ],
      "to": "X2b",
      "need": "kw",
      "kw": [
       "kaldım",
       "düşük aldım",
       "kötü geçti",
       "berbat geçti"
      ],
      "lines": [
       "üzüldüm ama telafisi var",
       "bir dahakine{h}, boşver"
      ]
     },
     {
      "id": "praise",
      "name": "Övgü",
      "desc": "övünür → karakter över",
      "from": [
       "X2a"
      ],
      "to": "",
      "need": "kw",
      "kw": [
       "başardım",
       "gurur"
      ],
      "lines": [
       "aferin sana!",
       "gurur duydum seninle"
      ]
     },
     {
      "id": "satisfy",
      "name": "Tatmin",
      "desc": "konu tatminle kapanır",
      "from": [
       "X2a"
      ],
      "to": "S",
      "need": "kw",
      "kw": [
       "rahatladım",
       "oh be",
       "mutluyum"
      ],
      "lines": [
       "hak ettin bu rahatlığı"
      ]
     },
     {
      "id": "comfort",
      "name": "Teselli",
      "desc": "teselli kabul edildi",
      "from": [
       "X2b"
      ],
      "to": "S",
      "need": "kw",
      "kw": [
       "sağ ol",
       "haklısın",
       "telafi ederim"
      ],
      "lines": [
       "hep buradayım"
      ]
     },
     {
      "id": "retry",
      "name": "Yeniden çalışma",
      "desc": "telafi süreci",
      "from": [
       "X2b"
      ],
      "to": "X1a",
      "need": "kw",
      "kw": [
       "tekrar çalışacağım",
       "bütünlemeye çalışıyorum",
       "yeniden"
      ],
      "lines": [
       "bu sefer olacak, eminim"
      ]
     }
    ],
    "samples": [
     [
      "İyi sonuç",
      [
       "selam",
       "yarın sınavım var",
       "kütüphanede çalışıyorum",
       "çok stres oldum ya",
       "toparladım",
       "geçtim!",
       "başardım işte",
       "oh be rahatladım"
      ]
     ],
     [
      "Kötü sonuç",
      [
       "okul berbat",
       "ödev yapıyorum",
       "kötü geçti",
       "sağ ol"
      ]
     ],
     [
      "Nasılsın",
      [
       "selam",
       "nasılsın?"
      ]
     ]
    ]
   },
   "futbol": {
    "id": "futbol",
    "name": "Konu: Futbol",
    "live": true,
    "states": [
     {
      "id": "S",
      "kind": "S",
      "name": "S",
      "desc": "Başlangıç",
      "icon": "👋",
      "color": "#8b87a0",
      "emojis": [
       "👋"
      ],
      "emojiChance": 0.5,
      "stay": [
       "hmm anlat bakalım",
       "bugün ne yaptın?"
      ],
      "stayRules": [],
      "x": 90,
      "y": 220,
      "start": true
     },
     {
      "id": "X",
      "kind": "X",
      "name": "X",
      "desc": "Maç konusu açıldı",
      "icon": "⚽",
      "color": "#7b5cff",
      "emojis": [
       "⚽"
      ],
      "emojiChance": 0.5,
      "stay": [
       "hangi takımlısın sen?",
       "maç ne zaman?"
      ],
      "stayRules": [
       {
        "kw": [
         "hakem"
        ],
        "lines": [
         "hakemler hep böyle ya",
         "hakem yine ne yaptı?"
        ],
        "use": []
       }
      ],
      "x": 300,
      "y": 220,
      "start": false
     },
     {
      "id": "X1a",
      "kind": "X1",
      "name": "X-1a",
      "desc": "Maç izleniyor",
      "icon": "📺",
      "color": "#d98a00",
      "emojis": [
       "📺",
       "🍿"
      ],
      "emojiChance": 0.5,
      "stay": [
       "kimin önde?",
       "nasıl gidiyor maç?"
      ],
      "stayRules": [],
      "x": 540,
      "y": 80,
      "start": false
     },
     {
      "id": "X1b",
      "kind": "X1",
      "name": "X-1b",
      "desc": "Zor maç",
      "icon": "😬",
      "color": "#d98a00",
      "emojis": [
       "😬"
      ],
      "emojiChance": 0.5,
      "stay": [
       "dayanın!",
       "daha bitmedi"
      ],
      "stayRules": [],
      "x": 540,
      "y": 360,
      "start": false
     },
     {
      "id": "X2a",
      "kind": "X2",
      "name": "X-2a",
      "desc": "Kazandık",
      "icon": "🏆",
      "color": "#1f9d6a",
      "emojis": [
       "🏆",
       "🎉"
      ],
      "emojiChance": 0.5,
      "stay": [
       "güzel maçtı",
       "bu akşam keyifler yerinde"
      ],
      "stayRules": [],
      "x": 800,
      "y": 80,
      "start": false
     },
     {
      "id": "X2b",
      "kind": "X2",
      "name": "X-2b",
      "desc": "Kaybettik",
      "icon": "😞",
      "color": "#1f9d6a",
      "emojis": [
       "🤍"
      ],
      "emojiChance": 0.3,
      "stay": [
       "olur böyle",
       "bir sonraki maça bak"
      ],
      "stayRules": [],
      "x": 800,
      "y": 360,
      "start": false
     }
    ],
    "edges": [
     {
      "id": "close",
      "name": "Kapatma",
      "desc": "konu yarıda bırakılır",
      "from": [
       "X",
       "X1a",
       "X1b",
       "X2a",
       "X2b"
      ],
      "to": "S",
      "need": "kw",
      "kw": [
       "neyse",
       "boşver",
       "konuyu değiştir",
       "geçelim"
      ],
      "lines": [
       "tamam, maçı bırakalım|başka ne var?"
      ]
     },
     {
      "id": "how",
      "name": "Nasılsın",
      "desc": "cevap «Nasılsın» konuşma kümesinden",
      "from": [
       "S"
      ],
      "to": "S",
      "need": "how",
      "kw": [],
      "lines": [],
      "use": [
       "how_are_you"
      ]
     },
     {
      "id": "greet",
      "name": "Selam",
      "desc": "cevap «Selamlaşma» konuşma kümesinden",
      "from": [
       "S"
      ],
      "to": "S",
      "need": "greet",
      "kw": [],
      "lines": [],
      "use": [
       "greet"
      ]
     },
     {
      "id": "open",
      "name": "Futbol konusu",
      "desc": "mesajda futbol kelimesi geçti",
      "from": [
       "S"
      ],
      "to": "X",
      "need": "kw",
      "kw": [
       "maç",
       "futbol",
       "gol",
       "derbi",
       "lig",
       "galatasaray",
       "fenerbahçe",
       "beşiktaş",
       "trabzonspor",
       "cimbom",
       "fener",
       "taraftar",
       "stadyum",
       "şampiyon",
       "penaltı",
       "transfer"
      ],
      "lines": [
       "maç mı var? hangi takım?",
       "{w} mı? anlat bakalım"
      ]
     },
     {
      "id": "watch",
      "name": "İzleme",
      "desc": "maç başladı",
      "from": [
       "X"
      ],
      "to": "X1a",
      "need": "kw",
      "kw": [
       "izliyorum",
       "başladı",
       "devre",
       "canlı"
      ],
      "lines": [
       "kimin önde?",
       "keyifli seyirler"
      ]
     },
     {
      "id": "tense",
      "name": "Zorlanma",
      "desc": "maç kötü gidiyor",
      "from": [
       "X",
       "X1a"
      ],
      "to": "X1b",
      "need": "kw",
      "kw": [
       "gol yedik",
       "gerideyiz",
       "geriye düştük",
       "kırmızı kart",
       "sakatlandı"
      ],
      "lines": [
       "eyvah, dayanın!",
       "daha bitmedi, umut var"
      ]
     },
     {
      "id": "comeback",
      "name": "Toparlanma",
      "desc": "skor döndü",
      "from": [
       "X1b"
      ],
      "to": "X1a",
      "need": "kw",
      "kw": [
       "gol attık",
       "eşitledik",
       "toparladık"
      ],
      "lines": [
       "işte bu!!",
       "hadi bir gol daha"
      ]
     },
     {
      "id": "win",
      "name": "Kazanma",
      "desc": "maç kazanıldı",
      "from": [
       "X1a",
       "X1b"
      ],
      "to": "X2a",
      "need": "kw",
      "kw": [
       "kazandık",
       "galibiz",
       "yendik"
      ],
      "lines": [
       "tebrikler!!",
       "oley, helal olsun"
      ]
     },
     {
      "id": "lose",
      "name": "Kaybetme",
      "desc": "maç kaybedildi",
      "from": [
       "X1a",
       "X1b"
      ],
      "to": "X2b",
      "need": "kw",
      "kw": [
       "kaybettik",
       "yenildik",
       "berabere bitti",
       "elendik"
      ],
      "lines": [
       "üzüldüm ya",
       "boş ver, rövanşı var"
      ]
     },
     {
      "id": "party",
      "name": "Kutlama",
      "desc": "kazanma sevinci",
      "from": [
       "X2a"
      ],
      "to": "",
      "need": "kw",
      "kw": [
       "kutluyoruz",
       "bayram",
       "harikaydı"
      ],
      "lines": [
       "kutlayın bakalım!",
       "bu akşam uyku yok o zaman"
      ]
     },
     {
      "id": "satisfy",
      "name": "Tatmin",
      "desc": "konu tatminle kapanır",
      "from": [
       "X2a"
      ],
      "to": "S",
      "need": "kw",
      "kw": [
       "mutluyum",
       "keyfim yerinde",
       "oh be"
      ],
      "lines": [
       "keyfin hep yerinde olsun"
      ]
     },
     {
      "id": "comfort",
      "name": "Teselli",
      "desc": "teselli kabul edildi",
      "from": [
       "X2b"
      ],
      "to": "S",
      "need": "kw",
      "kw": [
       "sağ ol",
       "haklısın",
       "bir dahaki"
      ],
      "lines": [
       "hep buradayım"
      ]
     },
     {
      "id": "rematch",
      "name": "Rövanş",
      "desc": "yeni maç",
      "from": [
       "X2b"
      ],
      "to": "X1a",
      "need": "kw",
      "kw": [
       "rövanş",
       "yine oynuyoruz",
       "bir sonraki maç"
      ],
      "lines": [
       "rövanşta alırsınız"
      ]
     }
    ],
    "samples": [
     [
      "Kazanma",
      [
       "selam",
       "akşam fenerbahçe maçı var",
       "maçı izliyorum",
       "gol yedik ya",
       "eşitledik!",
       "kazandık!!",
       "kutluyoruz",
       "mutluyum"
      ]
     ],
     [
      "Kaybetme",
      [
       "maç var bugün",
       "başladı",
       "kaybettik",
       "sağ ol"
      ]
     ]
    ]
   },
   "scmv31drtj4kl": {
    "id": "scmv31drtj4kl",
    "name": "Konu: Spor salonu / diyet",
    "live": true,
    "states": [
     {
      "id": "S",
      "kind": "S",
      "name": "S",
      "desc": "Başlangıç",
      "icon": "👋",
      "color": "#8b87a0",
      "emojis": [
       "👋"
      ],
      "emojiChance": 0.5,
      "stay": [
       "neler yapıyorsun görüşmeyeli?",
       "başka ne var ne yok?"
      ],
      "stayRules": [],
      "x": 90,
      "y": 220,
      "start": true,
      "stayUse": []
     },
     {
      "id": "X",
      "kind": "X",
      "name": "X",
      "desc": "Spor/Diyet konusu açıldı",
      "icon": "🏋️",
      "color": "#7b5cff",
      "emojis": [
       "💪",
       "👀"
      ],
      "emojiChance": 0.5,
      "stay": [
       "spor nasıl gidiyor?",
       "anlat bakalım hedefleri"
      ],
      "stayRules": [
       {
        "kw": [
         "protein",
         "toz"
        ],
        "lines": [
         "protein tozu falan kullanıyor musun?",
         "beslenmene dikkat et ama"
        ],
        "use": []
       }
      ],
      "x": 300,
      "y": 220,
      "start": false,
      "stayUse": []
     },
     {
      "id": "X1a",
      "kind": "X1",
      "name": "X-1a",
      "desc": "Antrenman/Diyet sürecinde",
      "icon": "🏃",
      "color": "#d98a00",
      "emojis": [
       "🔥",
       "💪"
      ],
      "emojiChance": 0.5,
      "stay": [
       "böyle devam",
       "ter atıyorsun ne güzel"
      ],
      "stayRules": [],
      "x": 540,
      "y": 80,
      "start": false,
      "stayUse": []
     },
     {
      "id": "X1b",
      "kind": "X1",
      "name": "X-1b",
      "desc": "Zorlanıyor",
      "icon": "😫",
      "color": "#d98a00",
      "emojis": [
       "🫂"
      ],
      "emojiChance": 0.5,
      "stay": [
       "dayan biraz",
       "ilk başlarda zor olur"
      ],
      "stayRules": [],
      "x": 540,
      "y": 360,
      "start": false,
      "stayUse": []
     },
     {
      "id": "X2a",
      "kind": "X2",
      "name": "X-2a",
      "desc": "Hedefe ulaştı",
      "icon": "🏆",
      "color": "#1f9d6a",
      "emojis": [
       "🎉",
       "😎"
      ],
      "emojiChance": 0.5,
      "stay": [
       "darısı başıma",
       "kutlamak lazım bunu"
      ],
      "stayRules": [],
      "x": 800,
      "y": 80,
      "start": false,
      "stayUse": []
     },
     {
      "id": "X2b",
      "kind": "X2",
      "name": "X-2b",
      "desc": "Bıraktı/Bozdu",
      "icon": "🍔",
      "color": "#1f9d6a",
      "emojis": [
       "😅"
      ],
      "emojiChance": 0.4,
      "stay": [
       "arada olur öyle",
       "kendini çok sıkma zaten"
      ],
      "stayRules": [],
      "x": 800,
      "y": 360,
      "start": false,
      "stayUse": []
     }
    ],
    "edges": [
     {
      "id": "close",
      "name": "Kapatma",
      "desc": "",
      "from": [
       "X",
       "X1a",
       "X1b",
       "X2a",
       "X2b"
      ],
      "to": "S",
      "need": "kw",
      "kw": [
       "neyse",
       "boşver",
       "konuyu değiştir",
       "geçelim",
       "kapatalım"
      ],
      "lines": [
       "tamam kapattık konuyu|başka neler yaptın?"
      ],
      "use": []
     },
     {
      "id": "how",
      "name": "Nasılsın",
      "desc": "",
      "from": [
       "S"
      ],
      "to": "S",
      "need": "how",
      "kw": [],
      "lines": [],
      "use": [
       "how_are_you"
      ]
     },
     {
      "id": "greet",
      "name": "Selam",
      "desc": "",
      "from": [
       "S"
      ],
      "to": "S",
      "need": "greet",
      "kw": [],
      "lines": [],
      "use": [
       "greet"
      ]
     },
     {
      "id": "open",
      "name": "Spor konusu",
      "desc": "spor veya diyet konusu açıldı",
      "from": [
       "S"
      ],
      "to": "X",
      "need": "kw",
      "kw": [
       "spora başladım",
       "diyete",
       "spor salonu",
       "fitness",
       "kilo vermek",
       "kilo almam",
       "salona yazıldım"
      ],
      "lines": [
       "aa cidden mi?|çok iyi fikir",
       "hadi bakalım, hedefin ne?"
      ],
      "use": []
     },
     {
      "id": "doing_well",
      "name": "İyi gidiyor",
      "desc": "",
      "from": [
       "X",
       "X1b"
      ],
      "to": "X1a",
      "need": "kw",
      "kw": [
       "ağırlık",
       "kardiyo",
       "yürüdüm",
       "salondayım",
       "sağlıklı besleniyorum",
       "dikkat ediyorum",
       "salona gittim"
      ],
      "lines": [
       "harikasın, aynen devam",
       "helal olsun sana{h}|vazgeçmek yok"
      ],
      "use": []
     },
     {
      "id": "struggling",
      "name": "Zorlanma",
      "desc": "",
      "from": [
       "X",
       "X1a"
      ],
      "to": "X1b",
      "need": "kw",
      "kw": [
       "yoruldum",
       "kaslarım ağrıyor",
       "açım",
       "tatlı krizi",
       "hamlamışım",
       "zorlanıyorum",
       "bıktım"
      ],
      "lines": [
       "kolay değil tabii{h}",
       "başlangıçta öyle olur|sonra alışırsın"
      ],
      "use": []
     },
     {
      "id": "success",
      "name": "Başardı",
      "desc": "",
      "from": [
       "X1a",
       "X1b"
      ],
      "to": "X2a",
      "need": "kw",
      "kw": [
       "kilo verdim",
       "inceldim",
       "kas yaptım",
       "hedefime ulaştım",
       "fit oldum",
       "gelişme var"
      ],
      "lines": [
       "tebrikler!!|emeklerinin karşılığını almışsın",
       "vay be, gurur duydum"
      ],
      "use": []
     },
     {
      "id": "fail",
      "name": "Bozdu",
      "desc": "",
      "from": [
       "X1a",
       "X1b"
      ],
      "to": "X2b",
      "need": "kw",
      "kw": [
       "diyeti bozdum",
       "bıraktım",
       "pes ettim",
       "salonu bıraktım",
       "pizza yedim",
       "tatlı yedim",
       "üşendim"
      ],
      "lines": [
       "sağlık olsun, canından kıymetli değil ya",
       "neyse bir kereden bir şey olmaz|dengelemek önemli"
      ],
      "use": []
     },
     {
      "id": "satisfy",
      "name": "Tatmin",
      "desc": "",
      "from": [
       "X2a"
      ],
      "to": "S",
      "need": "kw",
      "kw": [
       "çok mutluyum",
       "kendimi iyi hissediyorum",
       "hafifledim",
       "harika hissediyorum"
      ],
      "lines": [
       "senin adına çok sevindim"
      ],
      "use": []
     },
     {
      "id": "comfort",
      "name": "Teselli",
      "desc": "",
      "from": [
       "X2b"
      ],
      "to": "S",
      "need": "kw",
      "kw": [
       "sağ ol",
       "haklısın",
       "sağlık olsun",
       "boşverdim"
      ],
      "lines": [
       "aynen öyle, keyfine bak"
      ],
      "use": []
     },
     {
      "id": "retry",
      "name": "Tekrar başlama",
      "desc": "",
      "from": [
       "X2b"
      ],
      "to": "X1a",
      "need": "kw",
      "kw": [
       "tekrar başlayacağım",
       "yarın devam",
       "pazartesi",
       "yeniden başlıyorum",
       "dönüyorum"
      ],
      "lines": [
       "işte bu motivasyonu seviyorum",
       "hadi göreyim seni"
      ],
      "use": []
     }
    ],
    "samples": [
     [
      "Hedefe ulaşma",
      [
       "selam",
       "spora başladım",
       "kardiyo yapıyorum her gün",
       "ama kaslarım ağrıyor yoruldum",
       "yine de kilo verdim",
       "kendimi iyi hissediyorum"
      ]
     ],
     [
      "Diyeti bozma",
      [
       "nasılsın",
       "diyete başladım",
       "çok açım ya zorlanıyorum",
       "dayanamayıp tatlı yedim diyeti bozdum",
       "haklısın boşverdim"
      ]
     ]
    ]
   }
  },
  "order": [
   "futbol",
   "okul",
   "bulusma",
   "scmv31drtj4kl"
  ],
  "removed": [
   "kume"
  ],
  "active": "futbol",
  "persona": {
   "nese": {
    "habits": [
     "iyiyim > iyidir ya",
     "sen nasılsın > sen?",
     "ne yapıyorsun > napıyon",
     "tamam > tmm"
    ],
    "tail": [
     " ya",
     " :d"
    ],
    "max": 3,
    "likes": [
     "okul:X2a"
    ],
    "dislikes": [
     "futbol:X2b",
     "futbol:X2a",
     "futbol:X1b"
    ],
    "emojis": []
   },
   "soguk": {
    "habits": [
     "tebrikler, çok sevindim > tebrikler",
     "helal olsun, gurur duydum > güzel",
     "devam et, dinliyorum > devam et"
    ],
    "tail": [
     "."
    ],
    "max": 1,
    "likes": [
     "okul:X1a"
    ],
    "dislikes": [
     "futbol:X"
    ]
   },
   "utangac": {
    "habits": [
     "iyiyim > ii",
     "sen nasılsın > sen?",
     "anlat > şey… anlatsana"
    ],
    "tail": [
     "..."
    ],
    "max": 2,
    "likes": [
     "okul:X1a"
    ],
    "dislikes": [
     "futbol:X1b"
    ]
   },
   "flortoz": {
    "habits": [
     "iyiyim > fena değilim :d",
     "ne yapıyorsun > napıyosun bakalım",
     "aferin sana > aferin benim akıllıma"
    ],
    "tail": [
     " 😏"
    ],
    "max": 2,
    "likes": [
     "futbol:X2a"
    ],
    "dislikes": [
     "okul:X1a"
    ]
   },
   "dramatik": {
    "habits": [
     "sonunda > SONUNDAAA",
     "çok > ÇOK",
     "süper > MUHTEŞEM",
     "gurur duydum > GURUR DUYDUM"
    ],
    "tail": [
     "!!!"
    ],
    "max": 3,
    "likes": [
     "futbol:X1b",
     "okul:X1b"
    ],
    "dislikes": []
   },
   "olgun": {
    "habits": [
     "napıyon > ne yapıyorsun",
     "eee > Eee"
    ],
    "tail": [
     "."
    ],
    "max": 2,
    "likes": [
     "okul:X2a"
    ],
    "dislikes": [
     "futbol:X1b"
    ]
   }
  },
  "talk": {
   "refuse": {
    "nese": [
     "ayy bu konu hiç bana göre değil ya|başka şey anlat",
     "hmm bunu pek sevmem, sen başka ne yaptın?"
    ],
    "soguk": [
     "Bu konu ilgimi çekmiyor.",
     "Başka bir şey konuşalım."
    ],
    "utangac": [
     "şey… bu konuda pek konuşmasak mı?",
     "bu konu beni biraz geriyor…"
    ],
    "flortoz": [
     "bu konu beni sıkar|bana biraz kendini anlat",
     "yok yok, bunu konuşmayalım"
    ],
    "dramatik": [
     "HAYIR bu konuyu açma lütfen",
     "bu konu bana hiç iyi gelmiyor, gerçekten"
    ],
    "olgun": [
     "Açıkçası bu konuya pek girmek istemiyorum.",
     "Bunu konuşmasak daha iyi olur bence."
    ]
   },
   "love": {
    "nese": [
     "ayy bayılırım buna!!",
     "en sevdiğim konu ya"
    ],
    "soguk": [
     "Bu konu ilginç aslında.",
     "Bunu severim."
    ],
    "utangac": [
     "ben de buna bayılırım aslında…",
     "bu konuyu çok severim {laugh}"
    ],
    "flortoz": [
     "ooo tam benim konum",
     "bayılırım böyle şeylere"
    ],
    "dramatik": [
     "AYY EN SEVDİĞİM ŞEY",
     "bu konu benim aşkım resmen"
    ],
    "olgun": [
     "Bu konuyu konuşmayı çok severim.",
     "Ne güzel, bunu konuşmayı seviyorum."
    ]
   }
  },
  "talkMap": {
   "greet": {
    "outs": [
     {
      "id": "sabah",
      "name": "Sabah selamı",
      "lines": [
       "günaydın{h}! uyandın mı?",
       "günaydııın|kahveni içtin mi?"
      ]
     },
     {
      "id": "aksam",
      "name": "Akşam selamı",
      "lines": [
       "iyi akşamlar{h}|günün nasıl geçti?",
       "akşamın güzel olsun"
      ]
     },
     {
      "id": "samimi",
      "name": "Samimi selam",
      "lines": [
       "heyy naber{h}",
       "oo kimler gelmiş"
      ]
     }
    ],
    "ins": [
     {
      "kw": "günaydın",
      "out": "sabah"
     },
     {
      "kw": "gnydn",
      "out": "sabah"
     },
     {
      "kw": "sabah",
      "out": "sabah"
     },
     {
      "kw": "aydınlık",
      "out": "sabah"
     },
     {
      "kw": "iyi akşamlar",
      "out": "aksam"
     },
     {
      "kw": "akşam",
      "out": "aksam"
     },
     {
      "kw": "hey",
      "out": "samimi"
     },
     {
      "kw": "slm",
      "out": "samimi"
     }
    ]
   },
   "question": {
    "outs": [],
    "ins": []
   },
   "fallback": {
    "outs": [],
    "ins": []
   },
   "tell_name": {
    "outs": [],
    "ins": []
   },
   "opener": {
    "outs": [],
    "ins": []
   },
   "any": {
    "outs": [],
    "ins": []
   },
   "love": {
    "outs": [],
    "ins": []
   },
   "refuse": {
    "outs": [],
    "ins": []
   },
   "insult": {
    "outs": [],
    "ins": []
   },
   "night": {
    "outs": [],
    "ins": []
   },
   "morning": {
    "outs": [],
    "ins": []
   }
  },
  "useTopic": true
 }
};
