/*
 * Amor Stories - Bot modu motoru (uygulama ve tools/bot-editor.html birlikte kullanır)
 *
 * Veri (js/data/bot-rules.js → Stories.BOT_RULES):
 *   rules : [{ id, name, category, when: [...], reply: [...], traits: [], chars: [], note }]
 *   groups: [{ name: 'selam', words: ['selam', 'merhaba', 'slm'] }]          → kuralda "@selam"
 *   verbs : [{ verb: 'gitmek', stems: ['git', 'gid'] }]                      → kuralda "+gitmek"
 *   addons: [{ ..., when, add: [...], mode, chance }]  🪄 karakterin mesajına otomatik ek (aşağıda addons())
 *
 * Kuraldaki bir kelime (when öğesi) şunlardan biri olabilir; "|" ile alternatifler yazılır:
 *   kahve      → mesajda geçmesi yeterli (ekler olur: "kahveyi")
 *   yap-       → kelime başında bu kök ("yap", "yapmak", "yapabiliyorum", "yaptım")
 *   =sa        → sadece tam kelime ("sa" evet, "saat"/"masa" hayır)
 *   +yapmak    → fiil listesindeki tüm kökleri (kelime başında)
 *   @selam     → kelime grubundaki herhangi bir kelime (grupta da yap- ve +fiil kullanılabilir)
 * when sırası önemlidir: "X, Y" ile "Y, X" farklı kurallardır. when boşsa kural "yedek cevap"tır.
 * reply: seçeneklerden biri rastgele; "||" ayrı baloncuk; {sen} kullanıcının, {ben} karakterin adı.
 * traits: karakterde HEPSİ olmalı. chars: sadece bu adlar (tam ad ya da ilk ad).
 * Eşleşenler arasında en özel kural kazanır: daha çok kelime > kişilik şartı > karakter şartı. Eşitlikte rastgele.
 */
window.Stories = window.Stories || {};

Stories.Bot = (() => {
  // Küçük harf, noktalama yok, uzatılmış harfler tek ("selaaam" → "selam"); başta ve sonda boşluk (kelime başı araması için)
  const norm = s => ' ' + String(s || '').toLocaleLowerCase('tr')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/(\p{L})\1{2,}/gu, '$1')
    .replace(/\s+/g, ' ').trim() + ' ';
  const clean = s => norm(s).trim();
  const lower = s => String(s || '').toLocaleLowerCase('tr').trim();

  // Bir kuralı kelimesini eşleştiricilere çevirir: [{ s: 'yap', start: true }, ...]
  function expand(term, data, depth = 0) {
    const out = [];
    String(term || '').split('|').map(t => t.trim()).filter(Boolean).forEach(t => {
      if (t[0] === '@' && depth < 3) {
        const g = (data.groups || []).find(x => lower(x.name) === lower(t.slice(1)));
        if (g) (g.words || []).forEach(w => out.push(...expand(w, data, depth + 1)));
      } else if (t[0] === '+') {
        const v = (data.verbs || []).find(x => lower(x.verb) === lower(t.slice(1)));
        const stems = v ? v.stems : [lower(t.slice(1)).replace(/m[ae]k$/, '')];
        stems.map(clean).filter(Boolean).forEach(s => out.push({ s, start: true }));
      } else if (t[0] === '=') {
        const s = clean(t.slice(1));
        if (s) out.push({ s, start: true, whole: true });
      } else if (t.endsWith('-')) {
        const s = clean(t.slice(0, -1));
        if (s) out.push({ s, start: true });
      } else {
        const s = clean(t);
        if (s) out.push({ s, start: false });
      }
    });
    return out;
  }

  // Kelimeler mesajda bu sırayla geçiyor mu?
  function inOrder(msg, when, data) {
    let from = 0;
    for (const term of when) {
      let best = -1, end = 0;
      for (const m of expand(term, data)) {
        let i, e;
        if (m.start) {
          const k = msg.indexOf(' ' + m.s + (m.whole ? ' ' : ''), Math.max(0, from - 1));
          i = k === -1 ? -1 : k + 1;
        } else i = msg.indexOf(m.s, from);
        if (i === -1) continue;
        e = i + m.s.length;
        if (best === -1 || i < best) { best = i; end = e; }
      }
      if (best === -1) return false;
      from = end;
    }
    return true;
  }

  function fits(rule, ch) {
    const traits = (rule.traits || []).filter(Boolean);
    if (traits.length && !traits.every(t => (ch.traits || []).some(x => lower(x) === lower(t)))) return false;
    const names = (rule.chars || []).map(lower).filter(Boolean);
    if (names.length) {
      const full = lower(ch.name), first = full.split(' ')[0];
      if (!names.some(n => n === full || n === first)) return false;
    }
    return true;
  }

  const words = r => (r.when || []).filter(Boolean);
  const score = r => words(r).length * 100 + (r.traits || []).filter(Boolean).length * 10 + ((r.chars || []).filter(Boolean).length ? 20 : 0);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const asData = d => (Array.isArray(d) ? { rules: d } : (d || { rules: [] }));

  // Mesaja ve karaktere göre en iyi kural: { rule, score, fallback } ya da null.  data: BOT_RULES (ya da sadece kural dizisi)
  function best(data, text, ch) {
    data = asData(data);
    const msg = norm(text);
    const usable = (data.rules || []).filter(r => (r.reply || []).some(x => String(x).trim()) && fits(r, ch));
    const hit = usable.filter(r => words(r).length && inOrder(msg, words(r), data));
    const pool = hit.length ? hit : usable.filter(r => !words(r).length);
    if (!pool.length) return null;
    const top = Math.max(...pool.map(score));
    const rule = pick(pool.filter(r => score(r) === top));
    return { rule, score: top, fallback: !hit.length };
  }

  /* 🪄 Otomatik ekler: karakterin yazdığı mesaja göre ek.
   * Ek: { id, name, category, when: [...], add: ['😏', ...], mode, chance: 0-100, traits, chars, note }
   *   mode: 'prepend' başına ekle · 'append' sonuna ekle · 'before' önce ayrı mesaj · 'message' sonra ayrı mesaj
   *   when boşsa her mesaja uygulanır. Her moddan en özel olan seçilir; olasılık uygulamada zarla bakılır.
   * Dönüş: { prepend, append, before, message } (her biri ek ya da null) */
  const ADD_MODES = ['prepend', 'append', 'before', 'message'];
  function addons(data, text, ch) {
    data = asData(data);
    const msg = norm(text);
    const out = { prepend: null, append: null, before: null, message: null };
    const hit = (data.addons || []).filter(a => (a.add || []).some(x => String(x).trim()) && fits(a, ch) &&
      (!words(a).length || inOrder(msg, words(a), data)));
    ADD_MODES.forEach(mode => {
      const pool = hit.filter(a => (a.mode || 'append') === mode);
      if (!pool.length) return;
      const top = Math.max(...pool.map(score));
      out[mode] = pick(pool.filter(a => score(a) === top));
    });
    return out;
  }
  const addText = (a, vars) => pick((a.add || []).map(String).filter(x => x.trim()))
    .replace(/\{sen\}/gi, vars.sen || 'sen').replace(/\{ben\}/gi, vars.ben || '');

  // Bir kelime/mesaj bir terimi yakalıyor mu? (editördeki "dene" kutuları için)
  const catches = (text, term, data) => inOrder(norm(text), [term], asData(data));

  // Kuraldan cevap: baloncuk dizisi
  function reply(rule, vars) {
    const opts = (rule.reply || []).map(String).filter(x => x.trim());
    const txt = pick(opts).replace(/\{sen\}/gi, vars.sen || 'sen').replace(/\{ben\}/gi, vars.ben || '');
    return txt.split('||').map(s => s.trim()).filter(Boolean);
  }

  return { norm, expand, inOrder, fits, best, reply, score, catches, addons, addText, ADD_MODES };
})();
