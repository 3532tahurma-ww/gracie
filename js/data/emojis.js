/*
 * Sohbetteki 😊 Emoji paneli: varsayılan kısayollar ve emoji efektleri
 *   bar     : ilk açılışta panelde görünen emojiler (uygulamada "Düzenle" ile ekleyip çıkarabilirsin)
 *   effects : bu emojiler bir mesajda geçince baloncuğa verdiği efekt (uygulamada emojiye göre değiştirilebilir)
 *   list    : efektlerin adları (animasyonlar css/effects.css'te .efx-<id>)
 * Yeni eşleşme eklemek için effects'e '🍓': 'sparkle' gibi bir satır yaz.
 */
window.Stories = window.Stories || {};

Stories.Emojis = {
  bar: ['💧', '🔥', '❄️', '⚡', '❤️', '👻', '✨', '🌊', '😂', '😭', '🥺', '😏', '🙈', '😳', '💀', '👀', '🫠', '😘', '🥰', '😡'],
  effects: {
    '💧': 'wet', '💦': 'wet', '🌧️': 'wet',
    '🔥': 'burn', '❤️‍🔥': 'burn',
    '❄️': 'frozen', '🥶': 'frozen', '🧊': 'frozen',
    '⚡': 'zap', '🌩️': 'zap',
    '❤️': 'beat', '💓': 'beat', '💗': 'beat', '💖': 'beat',
    '👻': 'ghost', '🫥': 'ghost',
    '✨': 'sparkle', '🌟': 'sparkle', '💫': 'sparkle',
    '🌊': 'wave', '🫠': 'wave'
  },
  list: [
    { id: 'wet', label: 'Islanır', icon: '💧' },
    { id: 'burn', label: 'Yanar', icon: '🔥' },
    { id: 'frozen', label: 'Donar', icon: '❄️' },
    { id: 'zap', label: 'Elektrik', icon: '⚡' },
    { id: 'beat', label: 'Kalp atışı', icon: '❤️' },
    { id: 'ghost', label: 'Hayalet', icon: '👻' },
    { id: 'sparkle', label: 'Parıldar', icon: '✨' },
    { id: 'wave', label: 'Dalgalanır', icon: '🌊' }
  ]
};
