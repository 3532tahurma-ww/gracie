/*
 * Gracie - Amor motorunun kalıcı verisi (Amor/js/store.js yerine)
 * ----------------------------------------------------------------
 * Karakterlerin kimlikleri bu cihazdaki tüm hesaplar için ortaktır:  "gracie_world"
 * Ruh hali, yakınlık, hafıza, ilgi... her Gracie profili için ayrıdır: "gracie_amor:<profil id>"
 * Motor dosyaları (engine, mood, memory...) eskisi gibi Amor.Store.state'i okur/yazar.
 * Mesajlar Gracie'nin kendi deposunda (js/local/store.js); state.chats sadece cevap anında doldurulur.
 */
window.Amor = window.Amor || {};

Amor.Store = (() => {
  const WORLD = 'gracie_world', PREFIX = 'gracie_amor:';
  const WORLD_KEYS = ['characters', 'seedVersion'];
  const defaults = () => ({
    user: { name: '', age: '', city: '' },
    moods: {}, moodLog: {}, chats: {}, affinity: {}, unread: {}, follows: {},
    recent: {}, expect: {}, pending: {}
  });
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* gizli sekme vb. */ } };

  let world = Object.assign({ characters: [] }, read(WORLD) || {});
  let key = null, state = null;
  function attach(s) {
    WORLD_KEYS.forEach(k => { s[k] = world[k]; });
    if (!s.characters) s.characters = [];
    return s;
  }
  state = attach(defaults());

  function open(profileId) {
    if (key === PREFIX + profileId) return;
    save();
    key = PREFIX + profileId;
    state = attach(Object.assign(defaults(), read(key) || {}));
  }

  function save() {
    WORLD_KEYS.forEach(k => { world[k] = state[k]; });
    write(WORLD, world);
    if (!key) return;
    const own = {};
    Object.keys(state).forEach(k => { if (!WORLD_KEYS.includes(k) && k !== 'chats') own[k] = state[k]; });
    write(key, own);
  }

  // Bu profilin karakterlerle ilişkisini sıfırla (karakterler kalır). cid verilirse sadece o karakter.
  function forget(cid) {
    const s = state;
    if (!cid) { const user = s.user; state = attach(defaults()); state.user = user; save(); return; }
    ['moods', 'moodLog', 'affinity', 'unread', 'follows', 'recent', 'expect', 'pending', 'memory', 'interest', 'kume', 'busyNote']
      .forEach(k => { if (s[k]) delete s[k][cid]; });
    save();
  }

  return { get state() { return state; }, open, save, forget };
})();
