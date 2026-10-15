/*
 * Sohbet temaları: arka planlar ve baloncuk stilleri (sohbette 🎨 Tema)
 * Baloncuk alanları CSS değişkenlerine dönüşür: me/her = arka plan, meFg/herFg = yazı rengi,
 * meBorder/herBorder = kenarlık, radius = köşe yuvarlaklığı, tail = baloncuğun sivri köşesi,
 * font = yazı tipi, shadow = gölge.
 * 'char' değeri karakterin kendi rengini kullanır.
 */
window.Stories = window.Stories || {};

Stories.Themes = {
  backgrounds: [
    { id: 'amor', label: 'Amor', css: 'linear-gradient(180deg, #3b1d63 0%, #241444 45%, #160d2c 100%)' },
    { id: 'rose', label: 'Gül', css: 'linear-gradient(180deg, #6b1f45 0%, #3f1129 50%, #1f0814 100%)' },
    { id: 'ocean', label: 'Okyanus', css: 'linear-gradient(180deg, #14476e 0%, #0c2a46 50%, #06141f 100%)' },
    { id: 'forest', label: 'Orman', css: 'linear-gradient(180deg, #1d4d38 0%, #10301f 50%, #07170f 100%)' },
    { id: 'sunset', label: 'Gün batımı', css: 'linear-gradient(180deg, #7a2e4f 0%, #4a1f45 45%, #1c1030 100%)' },
    { id: 'night', label: 'Gece mavisi', css: 'radial-gradient(circle at 30% 10%, #2a3a7a 0%, #141a3c 45%, #070914 100%)' },
    { id: 'coffee', label: 'Kahve', css: 'linear-gradient(180deg, #4a3226 0%, #2c1d16 55%, #160e0a 100%)' },
    { id: 'dark', label: 'Karanlık', css: '#111116' },
    // Amor'un mağaza / kalp düzeyi arka planları (cls: görünüm css/style.css'teki .bg-<id> sınıfından gelir)
    { id: 'ucan-kalpler', label: 'Uçan kalpler', cls: 'bg-ucan-kalpler' },
    { id: 'kalp-kolye', label: 'Mücevher kalp', cls: 'bg-kalp-kolye' },
    { id: 'pembe-ruya', label: 'Pembe rüya', cls: 'bg-pembe-ruya' },
    { id: 'galaksi', label: 'Galaksi', css: 'radial-gradient(circle at 30% 20%, #4c1d95 0%, #1e1b4b 40%, #0b0820 100%)' }
  ],
  bubbles: [
    { id: 'amor', label: 'Amor', me: '#ff3d8b', her: '#2c2442' },
    { id: 'imessage', label: 'iMessage', me: '#0a84ff', her: '#3a3a3c', radius: '20px', tail: '20px' },
    { id: 'whatsapp', label: 'WhatsApp', me: '#005c4b', her: '#202c33', radius: '10px', tail: '2px' },
    { id: 'insta', label: 'Instagram', me: 'linear-gradient(135deg, #7b5cff, #c13584 60%, #ff3d8b)', her: '#262626', radius: '22px', tail: '22px' },
    { id: 'char', label: 'Karakter rengi', me: '#ff3d8b', her: 'char' },
    { id: 'pastel', label: 'Pastel', me: '#ffd6e7', meFg: '#4a1d33', her: '#e6e1ff', herFg: '#2a2140' },
    { id: 'mono', label: 'Siyah beyaz', me: '#ffffff', meFg: '#111111', her: '#2b2b2b', radius: '16px' },
    { id: 'neon', label: 'Neon', me: 'rgba(255, 61, 139, .12)', meBorder: '2px solid #ff3d8b', her: 'rgba(52, 227, 168, .1)', herBorder: '2px solid #34e3a8' },
    { id: 'retro', label: 'Retro', me: '#ffd23f', meFg: '#111111', meBorder: '2px solid #111', her: '#ffffff', herFg: '#111111', herBorder: '2px solid #111', radius: '4px', tail: '4px' },
    { id: 'glass', label: 'Cam', me: 'rgba(255, 255, 255, .22)', her: 'rgba(255, 255, 255, .1)', meBorder: '1px solid rgba(255,255,255,.35)', herBorder: '1px solid rgba(255,255,255,.18)' },
    { id: 'cloud', label: 'Bulut', me: '#ffffff', meFg: '#3b2a5c', her: '#e9e4ff', herFg: '#2a2140', radius: '26px', tail: '26px', shadow: '0 4px 14px rgba(0, 0, 0, .28)' },
    { id: 'comic', label: 'Çizgi roman', me: '#fff6c9', meFg: '#111111', meBorder: '3px solid #111', her: '#ffffff', herFg: '#111111', herBorder: '3px solid #111', radius: '18px', tail: '3px', font: "'Comic Sans MS', 'Comic Neue', cursive", shadow: '4px 4px 0 #111' },
    { id: 'terminal', label: 'Terminal', me: '#0b1a0b', meFg: '#39ff7a', meBorder: '1px solid #39ff7a', her: '#0d0d0d', herFg: '#e6e6e6', herBorder: '1px solid #555', radius: '2px', tail: '2px', font: "Consolas, 'Courier New', monospace" },
    { id: 'paper', label: 'Not kâğıdı', me: '#fff59d', meFg: '#3e2f00', her: '#fdfdf6', herFg: '#333333', radius: '3px', tail: '3px', font: "'Segoe Print', 'Bradley Hand', cursive", shadow: '2px 3px 8px rgba(0, 0, 0, .35)' },
    { id: 'gold', label: 'Altın', me: 'linear-gradient(135deg, #f9e29c, #d4a437 55%, #b8862b)', meFg: '#2b1d00', her: 'linear-gradient(135deg, #2b2b2b, #141414)', herFg: '#f3d27a', herBorder: '1px solid #b8862b', radius: '14px', shadow: '0 3px 12px rgba(212, 164, 55, .3)' },
    // Amor'un baloncukları. cls: ek süs (kalp mücevheri) css/stories.css'te .sbub-<ad>
    { id: 'kalp', label: 'Kalp mücevheri', cls: 'sbub-kalp', me: 'linear-gradient(100deg, #ff7a6b 0%, #ff4fa0 45%, #f83cb0 100%)', her: 'linear-gradient(160deg, #f45fc8 0%, #ff8fb5 60%, #ffb38a 100%)', herFg: '#4a0f2e', meBorder: '1.5px solid rgba(255,255,255,.55)', herBorder: '1.5px solid rgba(255,255,255,.55)', shadow: '0 4px 14px rgba(255,60,150,.35), inset 0 1px 0 rgba(255,255,255,.5)' },
    { id: 'seker', label: 'Pamuk şeker', me: 'linear-gradient(135deg, #ffb3d9, #b8c6ff)', meFg: '#4a2a5a', her: 'linear-gradient(135deg, #d7f3ff, #ffe0f0)', herFg: '#4a2a5a', meBorder: '1.5px solid rgba(255,255,255,.7)', herBorder: '1.5px solid rgba(255,255,255,.7)' },
    { id: 'altin-isilti', label: 'Altın ışıltı', me: 'linear-gradient(135deg, #fde68a, #f59e0b 55%, #fbbf24)', meFg: '#4a2c00', her: '#2c2442', herBorder: '1.5px solid #f8d34a', shadow: '0 4px 14px rgba(245,158,11,.35)' },
    { id: 'gece-neonu', label: 'Gece neonu', me: 'rgba(40,5,30,.7)', meBorder: '2px solid #ec4899', her: 'rgba(15,10,35,.75)', herBorder: '2px solid #22d3ee', shadow: '0 0 12px rgba(236,72,153,.6)' },
    { id: 'galaksi', label: 'Galaksi', me: 'radial-gradient(circle at 15% 25%, rgba(255,255,255,.8) 0 1px, transparent 2px), radial-gradient(circle at 72% 60%, rgba(255,255,255,.7) 0 1px, transparent 2px), radial-gradient(circle at 45% 82%, rgba(255,255,255,.6) 0 1px, transparent 2px), linear-gradient(135deg, #6d28d9, #db2777)', her: 'radial-gradient(circle at 15% 25%, rgba(255,255,255,.8) 0 1px, transparent 2px), radial-gradient(circle at 72% 60%, rgba(255,255,255,.7) 0 1px, transparent 2px), radial-gradient(circle at 45% 82%, rgba(255,255,255,.6) 0 1px, transparent 2px), linear-gradient(135deg, #1e1b4b, #4c1d95)' }
  ],
  // Hazır temalar: arka plan + baloncuk birlikte (Amor'daki kalp düzeyi temaları)
  presets: [
    { id: 'kalp', label: 'Kalp teması', icon: '💖', bg: 'ucan-kalpler', bubble: 'kalp', note: 'Amor Lv.4: uçan kalpler + kalpli baloncuklar' },
    { id: 'mucevher', label: 'Mücevher kalp', icon: '💎', bg: 'kalp-kolye', bubble: 'kalp', note: 'Amor Lv.5: mücevher kalp + kalpli baloncuklar' }
  ],
  // Grupta üyelere tek tek verilebilen baloncuk renkleri
  memberColors: [
    ['#ff6fa8', '#ff3d8b'], ['#a78bfa', '#7b5cff'], ['#5fb4ff', '#2f6bff'], ['#34e3a8', '#0e9f8e'], ['#ffb72b', '#ff7a3d'],
    ['#c86bff', '#ff5fb0'], ['#ff8a65', '#e0334f'], ['#4dd0e1', '#0097a7'], ['#9ccc65', '#558b2f'], ['#8b9bb4', '#4b5670']
  ]
};
