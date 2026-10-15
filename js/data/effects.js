/*
 * Mesaj efektleri (baloncukta ✨, ya da mesaj kutusundaki ✨ ile sonraki mesaja)
 *   bubble: baloncuğun kendisine uygulanır (animasyonlar css/effects.css'te .fx-<id>)
 *   screen: mesaj gelince ekrana emoji yağar
 * Anahtar kelimelere de efekt bağlanabilir; kelime geçen mesajlar o efektle görünür.
 */
window.Stories = window.Stories || {};

Stories.Effects = {
  bubble: [
    { id: 'shake', label: 'Titreme', icon: '📳' },
    { id: 'slam', label: 'Çarpma', icon: '💥' },
    { id: 'loud', label: 'Bağırma', icon: '📢' },
    { id: 'gentle', label: 'Fısıltı', icon: '🤫' },
    { id: 'glow', label: 'Parıltı', icon: '🌟' },
    { id: 'rainbow', label: 'Gökkuşağı', icon: '🌈' },
    { id: 'ink', label: 'Görünmez mürekkep', icon: '🫥' }
  ],
  screen: [
    { id: 'hearts', label: 'Kalpler', icon: '💖', emojis: ['💖', '💗', '💕', '❤️'] },
    { id: 'confetti', label: 'Konfeti', icon: '🎉', emojis: ['🎉', '🎊', '✨', '🥳'] },
    { id: 'fireworks', label: 'Havai fişek', icon: '🎆', emojis: ['🎆', '🎇', '✨'] },
    { id: 'rain', label: 'Yağmur', icon: '🌧️', emojis: ['💧', '💦', '🌧️'] },
    { id: 'fire', label: 'Ateş', icon: '🔥', emojis: ['🔥', '💥', '🔥'] }
  ]
};
