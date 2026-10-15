/* bot-editoru.bat ile duzenlenir (tools/bot-editor.html). Bicim: js/bot.js'in basindaki aciklama. */
window.Stories = window.Stories || {};
Stories.BOT_RULES = {
  "rules": [
    {
      "id": "r_mv8cf8uw2ccb",
      "name": "Selam",
      "category": "Selamlaşma",
      "when": [
        "@selam"
      ],
      "reply": [
        "Selam {sen}! 👋",
        "Heyy, nasılsın?",
        "Merhaba 🙂"
      ],
      "traits": [],
      "chars": [],
      "note": ""
    },
    {
      "id": "r_selam_utangac",
      "name": "Selam (utangaç)",
      "category": "Selamlaşma",
      "when": [
        "@selam"
      ],
      "reply": [
        "S-selam... 🙈",
        "Ah, merhaba||Seni görmeyi beklemiyordum"
      ],
      "traits": [
        "Utangaç"
      ],
      "chars": [],
      "note": "Utangaç karakterler farklı selam verir"
    },
    {
      "id": "r_nasilsin",
      "name": "Nasılsın",
      "category": "Selamlaşma",
      "when": [
        "@nasilsin"
      ],
      "reply": [
        "İyiyim, sen?",
        "Fena değil 🙂||Senden ne haber?"
      ],
      "traits": [],
      "chars": [],
      "note": ""
    },
    {
      "id": "r_ne_yapiyorsun",
      "name": "Ne yapıyorsun",
      "category": "Sohbet",
      "when": [
        "ne",
        "+yapmak"
      ],
      "reply": [
        "Hiç, uzanıyorum 😌",
        "Seni düşünüyordum desem? 🙈"
      ],
      "traits": [],
      "chars": [],
      "note": "+yapmak: yapıyorsun, yapacaksın, yaptın... hepsini yakalar"
    },
    {
      "id": "r_seni_seviyorum",
      "name": "Seni seviyorum",
      "category": "Romantik",
      "when": [
        "seni",
        "+sevmek"
      ],
      "reply": [
        "Ben de seni ❤️",
        "Bunu duymak çok güzel 🥰"
      ],
      "traits": [],
      "chars": [],
      "note": "Sıra önemli: önce 'seni' sonra 'sevmek' fiili"
    },
    {
      "id": "r_seviyorum_seni",
      "name": "Seviyorum seni (ters)",
      "category": "Romantik",
      "when": [
        "+sevmek",
        "seni"
      ],
      "reply": [
        "Böyle ters söyleyince daha da tatlı oldu 🥺"
      ],
      "traits": [],
      "chars": [],
      "note": "Aynı kelimeler ters sırada: farklı cevap"
    },
    {
      "id": "r_seni_seviyorum_soguk",
      "name": "Seni seviyorum (soğuk)",
      "category": "Romantik",
      "when": [
        "seni",
        "+sevmek"
      ],
      "reply": [
        "Hıh. Tamam.",
        "...Peki."
      ],
      "traits": [
        "Soğuk"
      ],
      "chars": [],
      "note": "Soğuk karakterlerde"
    },
    {
      "id": "r_ozledim",
      "name": "Özledim",
      "category": "Romantik",
      "when": [
        "+özlemek"
      ],
      "reply": [
        "Ben de seni özledim 🥺",
        "Gel o zaman||Bekliyorum"
      ],
      "traits": [],
      "chars": [],
      "note": ""
    },
    {
      "id": "r_kahve",
      "name": "Kahve",
      "category": "Sohbet",
      "when": [
        "@icecek"
      ],
      "reply": [
        "Kahve mi? Ben varım ☕",
        "Önce kahve, sonra dünya ☕"
      ],
      "traits": [],
      "chars": [],
      "note": ""
    },
    {
      "id": "r_bulusalim",
      "name": "Buluşma teklifi",
      "category": "Sohbet",
      "when": [
        "+buluşmak|+görüşmek|+gelmek"
      ],
      "reply": [
        "Olur, ne zaman?",
        "Hmm... düşüneyim 🤔||Tamam, olur"
      ],
      "traits": [],
      "chars": [],
      "note": "buluşalım mı / görüşelim / gelir misin"
    },
    {
      "id": "r_yedek",
      "name": "Yedek cevap",
      "category": "Yedek",
      "when": [],
      "reply": [
        "Hmm 🤔",
        "Anlat bakalım",
        "Öyle mi?",
        "Devam et, dinliyorum"
      ],
      "traits": [],
      "chars": [],
      "note": "Hiçbir kural eşleşmezse"
    },
    {
      "id": "r_yedek_utangac",
      "name": "Yedek (utangaç)",
      "category": "Yedek",
      "when": [],
      "reply": [
        "B-bilmiyorum ki... 🙈",
        "Hı hı..."
      ],
      "traits": [
        "Utangaç"
      ],
      "chars": [],
      "note": "Utangaç karakterin yedek cevabı"
    },
    {
      "id": "r_mv8d890hjbsw",
      "name": "",
      "category": "Selamlaşma",
      "when": [
        "@nasilsin",
        "+yapmak|+sevmek"
      ],
      "reply": [
        "heyyyy"
      ],
      "traits": [],
      "chars": [],
      "note": ""
    }
  ],
  "addons": [
    {
      "id": "a_sev_kalp",
      "name": "Sevmek → kalp",
      "category": "Emoji",
      "when": [
        "+sevmek"
      ],
      "add": [
        "❤️",
        "💕",
        "🥰"
      ],
      "mode": "append",
      "chance": 80,
      "traits": [],
      "chars": [],
      "note": ""
    },
    {
      "id": "a_utangac_emoji",
      "name": "Utangaç",
      "category": "Kişilik",
      "when": [
        "+sikmek"
      ],
      "add": [
        "🙈",
        "😳"
      ],
      "mode": "append",
      "chance": 100,
      "traits": [
        "Utangaç"
      ],
      "chars": [],
      "note": "Kelime yok: utangaç karakterin her mesajına %25 ihtimalle"
    },
    {
      "id": "r_mv8eb6smybhw",
      "name": "Flörtöz",
      "category": "Kişilik",
      "when": [
        "+sikmek"
      ],
      "add": [
        "💋",
        "❤️‍🔥"
      ],
      "mode": "append",
      "chance": 100,
      "traits": [
        "Flörtöz"
      ],
      "chars": [],
      "note": ""
    },
    {
      "id": "r_mv8exp4glcg7",
      "name": "Romantik",
      "category": "Kişilik",
      "when": [
        "+sikmek"
      ],
      "add": [
        "💞",
        "🩷"
      ],
      "mode": "append",
      "chance": 100,
      "traits": [
        "Romantik"
      ],
      "chars": [],
      "note": ""
    },
    {
      "id": "r_mv8f1dvs2f3m",
      "name": "Olgun",
      "category": "Kişilik",
      "when": [
        "+sikmek"
      ],
      "add": [
        "🥰",
        "😘"
      ],
      "mode": "append",
      "chance": 100,
      "traits": [
        "olgun"
      ],
      "chars": [],
      "note": ""
    },
    {
      "id": "r_mv8f990qgrzc",
      "name": "Sertçe",
      "category": "Ek mesaj",
      "when": [
        "sertçe"
      ],
      "add": [
        "aahhh",
        "offfff",
        "çok iyiii"
      ],
      "mode": "append",
      "chance": 100,
      "traits": [],
      "chars": [],
      "note": ""
    },
    {
      "id": "r_mv8fepg034qt",
      "name": "Şap şap",
      "category": "Ek mesaj",
      "when": [
        "şap",
        "şap"
      ],
      "add": [
        "sesler yükseliyo of"
      ],
      "mode": "append",
      "chance": 100,
      "traits": [],
      "chars": [],
      "note": ""
    },
    {
      "id": "r_mv8g5w5r2prc",
      "name": "Vurdurt",
      "category": "Ek mesaj",
      "when": [
        "+vurdurtmak"
      ],
      "add": [
        "ahh acıyo yavaş",
        "ahhhh ağrıdı"
      ],
      "mode": "append",
      "chance": 100,
      "traits": [],
      "chars": [],
      "note": ""
    },
    {
      "id": "r_mv8gaj8hfekn",
      "name": "Şaplak",
      "category": "Ek mesaj",
      "when": [
        "+şaplak atmak"
      ],
      "add": [
        "kızardı offf"
      ],
      "mode": "append",
      "chance": 100,
      "traits": [],
      "chars": [],
      "note": ""
    }
  ],
  "groups": [
    {
      "name": "selam",
      "words": [
        "selam",
        "merhaba",
        "slm",
        "hey",
        "günaydın",
        "iyi akşamlar"
      ]
    },
    {
      "name": "nasilsin",
      "words": [
        "nasılsın",
        "naber",
        "ne haber",
        "nasıl gidiyor",
        "iyi misin"
      ]
    },
    {
      "name": "icecek",
      "words": [
        "kahve",
        "çay",
        "latte",
        "espresso"
      ]
    },
    {
      "name": "sevgi",
      "words": [
        "+sevmek",
        "aşık",
        "canım",
        "bebeğim",
        "aşkım"
      ]
    }
  ],
  "verbs": [
    {
      "verb": "yapmak",
      "stems": [
        "yap"
      ]
    },
    {
      "verb": "gelmek",
      "stems": [
        "gel"
      ]
    },
    {
      "verb": "gitmek",
      "stems": [
        "git",
        "gid"
      ]
    },
    {
      "verb": "etmek",
      "stems": [
        "etm",
        "ett",
        "eti",
        "ede",
        "edi",
        "eder",
        "edec",
        "edeb"
      ]
    },
    {
      "verb": "demek",
      "stems": [
        "diyor",
        "dedi",
        "demek",
        "derim",
        "dersin",
        "dese",
        "deme"
      ]
    },
    {
      "verb": "yemek",
      "stems": [
        "yiyor",
        "yedi",
        "yerim",
        "yersin",
        "yiyece",
        "yiyeli",
        "yese"
      ]
    },
    {
      "verb": "olmak",
      "stems": [
        "olu",
        "oldu",
        "olm",
        "olur",
        "olaca",
        "olsa",
        "olsun",
        "olabil"
      ]
    },
    {
      "verb": "sevmek",
      "stems": [
        "sev"
      ]
    },
    {
      "verb": "istemek",
      "stems": [
        "iste",
        "isti"
      ]
    },
    {
      "verb": "bilmek",
      "stems": [
        "bil"
      ]
    },
    {
      "verb": "görmek",
      "stems": [
        "gör"
      ]
    },
    {
      "verb": "bakmak",
      "stems": [
        "bak"
      ]
    },
    {
      "verb": "konuşmak",
      "stems": [
        "konuş"
      ]
    },
    {
      "verb": "anlamak",
      "stems": [
        "anla",
        "anlı"
      ]
    },
    {
      "verb": "anlatmak",
      "stems": [
        "anlat"
      ]
    },
    {
      "verb": "söylemek",
      "stems": [
        "söyle",
        "söyli"
      ]
    },
    {
      "verb": "sormak",
      "stems": [
        "sor"
      ]
    },
    {
      "verb": "beklemek",
      "stems": [
        "bekle",
        "bekli"
      ]
    },
    {
      "verb": "özlemek",
      "stems": [
        "özle",
        "özli"
      ]
    },
    {
      "verb": "düşünmek",
      "stems": [
        "düşün"
      ]
    },
    {
      "verb": "hissetmek",
      "stems": [
        "hisset",
        "hissed"
      ]
    },
    {
      "verb": "uyumak",
      "stems": [
        "uyu"
      ]
    },
    {
      "verb": "uyanmak",
      "stems": [
        "uyan"
      ]
    },
    {
      "verb": "içmek",
      "stems": [
        "iç"
      ]
    },
    {
      "verb": "okumak",
      "stems": [
        "oku"
      ]
    },
    {
      "verb": "yazmak",
      "stems": [
        "yaz"
      ]
    },
    {
      "verb": "çalışmak",
      "stems": [
        "çalış"
      ]
    },
    {
      "verb": "oynamak",
      "stems": [
        "oyna",
        "oyni"
      ]
    },
    {
      "verb": "gülmek",
      "stems": [
        "gül"
      ]
    },
    {
      "verb": "ağlamak",
      "stems": [
        "ağla",
        "ağlı"
      ]
    },
    {
      "verb": "kızmak",
      "stems": [
        "kızdı",
        "kızıyor",
        "kızma",
        "kızar",
        "kızgın"
      ]
    },
    {
      "verb": "korkmak",
      "stems": [
        "kork"
      ]
    },
    {
      "verb": "vermek",
      "stems": [
        "ver"
      ]
    },
    {
      "verb": "almak",
      "stems": [
        "alıyor",
        "aldı",
        "alır",
        "alaca",
        "almak",
        "alsa",
        "alabil"
      ]
    },
    {
      "verb": "çıkmak",
      "stems": [
        "çık"
      ]
    },
    {
      "verb": "girmek",
      "stems": [
        "gir"
      ]
    },
    {
      "verb": "kalmak",
      "stems": [
        "kal"
      ]
    },
    {
      "verb": "dönmek",
      "stems": [
        "dön"
      ]
    },
    {
      "verb": "beğenmek",
      "stems": [
        "beğen"
      ]
    },
    {
      "verb": "sarılmak",
      "stems": [
        "sarıl"
      ]
    },
    {
      "verb": "öpmek",
      "stems": [
        "öp"
      ]
    },
    {
      "verb": "dokunmak",
      "stems": [
        "dokun"
      ]
    },
    {
      "verb": "yatmak",
      "stems": [
        "yat"
      ]
    },
    {
      "verb": "buluşmak",
      "stems": [
        "buluş"
      ]
    },
    {
      "verb": "görüşmek",
      "stems": [
        "görüş"
      ]
    },
    {
      "verb": "tanışmak",
      "stems": [
        "tanış"
      ]
    },
    {
      "verb": "unutmak",
      "stems": [
        "unut"
      ]
    },
    {
      "verb": "hatırlamak",
      "stems": [
        "hatırla",
        "hatırlı"
      ]
    },
    {
      "verb": "inanmak",
      "stems": [
        "inan"
      ]
    },
    {
      "verb": "güvenmek",
      "stems": [
        "güven"
      ]
    },
    {
      "verb": "kıskanmak",
      "stems": [
        "kıskan"
      ]
    },
    {
      "verb": "utanmak",
      "stems": [
        "utan"
      ]
    },
    {
      "verb": "yorulmak",
      "stems": [
        "yorul",
        "yorgun"
      ]
    },
    {
      "verb": "acıkmak",
      "stems": [
        "acık"
      ]
    },
    {
      "verb": "affetmek",
      "stems": [
        "affet",
        "affed"
      ]
    },
    {
      "verb": "yardım etmek",
      "stems": [
        "yardım"
      ]
    },
    {
      "verb": "sikmek",
      "stems": [
        "sik",
        "sok",
        "kök",
        "pompa"
      ]
    },
    {
      "verb": "ağlatmak",
      "stems": [
        "ağlat"
      ]
    },
    {
      "verb": "sızlatmak",
      "stems": [
        "sızlat"
      ]
    },
    {
      "verb": "vurdurtmak",
      "stems": [
        "vurdurt",
        "vurdur",
        "vur"
      ]
    },
    {
      "verb": "şaplak atmak",
      "stems": [
        "şaplak at"
      ]
    }
  ]
};
