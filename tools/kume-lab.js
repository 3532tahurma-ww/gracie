/*
 * Amor - Küme Sistemi deneyi (diyalog editöründe "Deney" sayfası)
 * ----------------------------------------------------------------
 * K = (Q, W, C, δ, ρ) — senaryo kurucu
 *   Q: kümeler       kullanıcı tanımlı; türü S / X / X-1 / X-2 (X-1a, X-1b… gibi birden çok), adı, rengi, kendine özel emojileri
 *   W: anahtar kelimeler  her bağlantının kendi kelimeleri; iki bağlantı aynı kelimeyi taşımaz
 *   C: cevap havuzları    her bağlantının cümleleri + her kümenin "kelime yok" cümleleri (+ istenirse konunun kendi cümleleri)
 *   δ: bağlantılar   nereden (bir ya da çok küme / her küme) → nereye (küme ya da aynı küme); sırayla denenir, ilk tutan kazanır
 *   ρ: kişilik       ifade tercihleri, yazım alışkanlıkları, balon sayısı + arketipin yazım tarzı + kümenin emojileri
 * Uygulamayı etkilemez; ayarlar sadece bu tarayıcıda (localStorage) saklanır.
 */
window.KumeLab = (() => {
  const KEY = 'amor.kume.v3';
  const K = Amor.Kume; // veri ve motor: js/kume.js (uygulamayla ortak)
  const { KINDS, COLORS, NEED, TALK_SPECIAL, S_, E_, BLANK, KUME, DEF, clone, uid } = K;

  let cfg = load();
  let log = [], state = null, recent = [], cmpText = 'nasılsın?', ctx;
  // Görünüm: scenario (senaryo sayfası) · fn (konuşma kümesi fonksiyonu) · persona (kişilik havuzu)
  let view = { mode: 'scenario', id: null }, rootEl = null;
  const curAid = () => view.mode === 'persona' ? view.id : ctx.arch();
  let dState = null, linkFrom = null, linkMode = false;
  const openPools = new Set();

  // raw: proje dosyasındaki (custom-dialog.js → kume) veri; yoksa bu tarayıcıdaki eski deney kaydı; o da yoksa varsayılanlar
  function load(raw) {
    if (raw && raw.scenarios) return K.load(raw);
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) return K.load(s); } catch (e) {}
    return K.load(null);
  }
  // Her değişiklik editöre bildirilir (Kaydet → custom-dialog.js); tarayıcıda da yedek tutulur
  function store() {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {}
    if (ctx && ctx.persist) ctx.persist(clone(cfg));
  }
  const pickRaw = arr => arr[Math.floor(Math.random() * arr.length)];
  function pick(pool) {
    const f = pool.filter(l => !recent.includes(l));
    const line = pickRaw(f.length ? f : pool);
    recent = [line, ...recent].slice(0, 8);
    return line;
  }
  const cut = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
  const h = s => ctx.esc(s == null ? '' : s);

  /* ---------- Senaryo yardımcıları ---------- */
  const SC = () => cfg.scenarios[cfg.active];
  const stOf = id => SC().states.find(s => s.id === id);
  const edOf = id => SC().edges.find(e => e.id === id);
  const startId = () => (SC().states.find(s => s.start) || SC().states[0]).id;
  const fromOk = (e, sid) => e.from.includes('*') || e.from.includes(sid);
  // Her küme her kümeye bağlanabilir; sadece silinmiş kümeye giden bağlantı geçersizdir
  const whyNot = (fid, tid) => stOf(fid) && stOf(tid) ? null : 'küme yok';
  const allowed = (fid, tid) => !whyNot(fid, tid);
  const live = (e, sid) => fromOk(e, sid) && allowed(sid, toOf(e, sid));

  /* ---------- Yollar: başlangıçtan X-2'ye giden bütün ileri yollar ----------
   * İleri = S → X → X-1… → X-2; X-1'ler arası yan geçiş (X-1a → X-1b) olur, aynı küme iki kez geçilmez, geri dönüşler (→ S, → X) yol sayılmaz. */
  const RANK = { S: 0, X: 1, O: 1.5, X1: 2, X2: 3 };
  function paths() {
    const sc = SC(), out = [];
    const next = sid => {
      const f = stOf(sid), res = [];
      // önce bu kümeye özel bağlantılar, sonra "her küme"den gelenler; konu değiştirenler sadece S'den çıkışta yol sayılır
      const cand = [...sc.edges.filter(e => !e.from.includes('*')), ...sc.edges.filter(e => e.from.includes('*'))]

      cand.forEach(e => {
        if (!live(e, sid)) return;
        const tid = toOf(e, sid), t = stOf(tid);
        if (tid === sid || t.kind === 'S') return;
        if (RANK[t.kind] < RANK[f.kind] || (t.kind === f.kind && f.kind !== 'X1')) return;
        if (!res.some(r => r.to === tid)) res.push({ e, to: tid }); // aynı hedefe ilk (öncelikli) bağlantı
      });
      return res;
    };
    (function walk(sid, steps, seen) {
      if (out.length >= 80) return;
      const nx = next(sid).filter(n => !seen.has(n.to));
      if (stOf(sid).kind === 'X2' || !nx.length) { if (steps.length) out.push(steps); return; }
      nx.forEach(n => walk(n.to, [...steps, { from: sid, to: n.to, edge: n.e.id }], new Set([...seen, n.to])));
    })(startId(), [], new Set([startId()]));
    return out.filter(p => stOf(p[p.length - 1].to).kind === 'X2');
  }
  let selPath = null, pathRes = null; // seçili yol (adımların "a>b" anahtarları) ve son testi
  const toOf = (e, sid) => e.to || sid;   // '' = aynı kümede kalır
  const stName = id => { const s = stOf(id); return s ? `${s.icon || ''} ${s.name}`.trim() : '?'; };
  function fresh() { return { st: startId() }; }
  function resetChat() { log = []; recent = []; state = fresh(); }

  // Türe göre sıradaki ad: X-1a, X-1b… (tek başına "X-1" varsa a'dan sonrası)
  function nextName(kind) {
    const base = KINDS[kind].name;
    if (kind === 'S' || kind === 'X') { let n = base, i = 2; while (SC().states.some(s => s.name === n)) n = base + i++; return n; }
    for (const ch of 'abcdefghijklmnopqrstuvwxyz') if (!SC().states.some(s => s.name === base + ch)) return base + ch;
    return base + '?';
  }

  /* ---------- W: anahtar kelimeler ---------- */
  const hit = (list, text) => K.hit(list, text);
  // Aynı kelime (ya da biri ötekinin başı) iki bağlantıda birden varsa: { "bağlantı:kelime": Set(bağlantı) }
  function overlaps() {
    const seen = [], out = {};
    SC().edges.forEach(e => (e.need === 'kw' ? e.kw : []).forEach(w => seen.push({ id: e.id, from: e.from, w, p: ctx.E.norm(w) })));
    // sadece aynı kümeden çıkabilen bağlantılar çakışır (farklı kümelerden denenenler birbirini engellemez)
    const shares = (x, y) => x.includes('*') || y.includes('*') || x.some(f => y.includes(f));
    seen.forEach(a => seen.forEach(b => {
      if (a.id === b.id || !a.p || !b.p || !shares(a.from, b.from)) return;
      if (a.p === b.p || a.p.startsWith(b.p + ' ') || (a.p.startsWith(b.p) && !a.p.includes(' ') && !b.p.includes(' '))) {
        (out[a.id + ':' + a.w] = out[a.id + ':' + a.w] || new Set()).add(b.id);
        (out[b.id + ':' + b.w] = out[b.id + ':' + b.w] || new Set()).add(a.id);
      }
    }));
    return out;
  }


  /* ---------- δ: bağlantılar sırayla denenir (js/kume.js) ---------- */
  const delta = (s, raw) => K.delta(cfg, SC(), s, raw, talkName);

  /* ---------- Konuşma kümeleri ---------- */
  const talkIds = () => [...ctx.A.INTENTS.map(r => r[0]), ...TALK_SPECIAL];
  const talkName = id => id === 'refuse' ? 'Sevmediğini reddetme' : id === 'love' ? 'Sevdiği küme' : ctx.label ? ctx.label(id) : id;
  // Bir konuşma kümesinin seçili kişilikteki cümleleri (niyet cümleleri; Reddetme / Sevdiği kişilik havuzundan)
  const talkLines = (aid, id) => K.talkLines(cfg, archObj(aid), id);
  /* Konuşma kümesinin fonksiyonu: girdi (kelime / kelime grubu) → çıktı (cevap grubu); birden çok girdi aynı çıktıya gidebilir.
   * cfg.talkMap[küme] = { outs: [{ id, name, lines }], ins: [{ kw, out }] } · en uzun (en özel) girdi önce denenir */
  const tmap = id => (cfg.talkMap[id] = cfg.talkMap[id] || { outs: [], ins: [] });
  const talkMatch = (id, text) => K.talkMatch(cfg, id, text);

  // Havuz = kendi cümleleri + konuşma kümeleri; mesaj bir fonksiyon girdisine uyarsa sadece o çıktı
  const compose = (own, use, label, text) => K.compose(cfg, archObj(ctx.arch()), own, use, label, text, talkName);

  /* ---------- C: cevap havuzu (js/kume.js) ---------- */
  const archObj = aid => ctx.archs.find(x => x.id === aid);
  const poolFor = (r, from, text) => K.poolFor(cfg, SC(), r, from, archObj(ctx.arch()), text, talkName);

  /* ---------- ρ: kişilik katmanı ---------- */
  function rho(aid, line, r) {
    const a = ctx.archs.find(x => x.id === aid);
    const P = cfg.persona[aid] || { habits: [], tail: [], max: 3 };
    const ks = stOf(r.st) || {};
    const trace = [];
    const w = r.word || '';
    let s = line.replace(/\{w\}/g, '{x}');
    s = K.habits(P, s, trace); // ifade tercihleri / yazım alışkanlıkları (her zaman uygulanır)
    let parts = ctx.demo(aid, s, w).split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length > P.max) { parts = parts.slice(0, P.max); trace.push(`en fazla ${P.max} balon`); }
    const st = a.style, lively = ks.kind !== 'S' && (ks.emojiChance ?? 0.5) >= 0.45;
    parts = parts.map((p, i) => {
      const last = i === parts.length - 1;
      if (!/\p{Lu}{4,}/u.test(p) && Math.random() < st.lowercase) { if (p !== p.toLocaleLowerCase('tr')) trace.push('küçük harf'); p = p.toLocaleLowerCase('tr'); }
      else if (st.lowercase < 0.3) p = p.charAt(0).toLocaleUpperCase('tr') + p.slice(1);
      if (lively && Math.random() < st.elongate) {
        const q = p.replace(/([aeıioöuüm])(\s*)$/i, (m, ch, sp) => ch.repeat(3 + Math.floor(Math.random() * 2)) + sp);
        if (q !== p) { p = q; trace.push('harf uzatma'); }
      }
      if (last) p = K.tails(P, p, trace);
      if (last && !/\p{Extended_Pictographic}/u.test(p)) {
        // önce kümenin kendi emojisi, tutmazsa kişiliğin emojisi
        if ((ks.emojis || []).length && Math.random() < (ks.emojiChance ?? 0.5)) { const em = pickRaw(ks.emojis); p += ' ' + em; trace.push(`küme emojisi ${em}`); }
        else {
          const ems = P.emojis && P.emojis.length ? P.emojis : st.emojis;
          if (Math.random() < (P.emojiRate ?? st.emojiRate) * (lively ? 1 : 0.4)) { const em = pickRaw(ems); p += ' ' + em; trace.push(`kişilik emojisi ${em}`); }
        }
      }
      return p;
    });
    return { parts, trace };
  }

  /* ---------- Bir tur ---------- */
  // Kişiliğin bu kümeye tutumu (js/kume.js): 'like' | 'dislike' | null (nötr)
  const pref = (aid, sid, scId = cfg.active) => K.pref(cfg, aid, sid, scId);

  function turn(msg, aid) {
    if (!state || !stOf(state.st)) state = fresh();
    const from = state.st;
    let r = delta(state, msg);
    const e = r.edge && edOf(r.edge);
    let c, edgeName = e ? e.name : 'Kelime yok', refused = null;
    if (r.st !== from && pref(aid, r.st) === 'dislike') {
      // Sevmediği kümeye girmez: "Reddetme" konuşma kümesiyle cevap verir, olduğu kümede kalır
      refused = r.st;
      r = { ...r, edge: null, st: from, rule: null };
      c = compose([], ['refuse'], `sevmediği küme «${stName(refused)}» → reddetti`, msg);
      if (c.pool[0] === 'hmm' && c.pool.length === 1) c.pool = ['bunu konuşmasak?'];
      edgeName = `Sevmediğini reddetme (${e.name})`;
    } else c = poolFor(r, from, msg);
    let line = pick(c.pool);
    // Sevdiği kümeye girerken heyecanını da belli eder
    if (r.st !== from && pref(aid, r.st) === 'like' && Math.random() < 0.7) {
      const love = talkLines(aid, 'love');
      if (love.length) { line += '|' + pick(love); c = { ...c, src: c.src + ' + «Sevdiği küme»' }; }
    }
    const p = rho(aid, line, r);
    state = { st: r.st };
    log.push({ msg, from, to: r.st, edge: r.edge, edgeName, refused, word: r.word, parts: p.parts, trace: p.trace, src: c.src, line });
  }

  /* ---------- Diyagram 1: küme haritası (sürüklenebilir) ---------- */
  const NW = 130, NH = 56;
  function border(n, tw) {
    const dx = tw.x - n.x, dy = tw.y - n.y;
    if (!dx && !dy) return { x: n.x, y: n.y };
    const t = 1 / Math.max(Math.abs(dx) / (NW / 2 + 3), Math.abs(dy) / (NH / 2 + 3));
    return { x: n.x + dx * t, y: n.y + dy * t };
  }
  const MARKERS = `<defs><marker id="kar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="ah"/></marker>
    <marker id="karOn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="ah on"/></marker></defs>`;
  function machine(fixedVB) {
    const sc = SC(), last = log[log.length - 1];
    const onKey = last && last.edge ? last.from + '>' + last.to : null;
    // aynı nereden→nereye bağlantıları tek okta topla; "her küme"den gelenler okla değil, hedefin altında yazılır
    const groups = {}, anyTo = {};
    const pth = new Set((selPath || []).map(s => s.from + '>' + s.to)), pthN = new Set((selPath || []).flatMap(s => [s.from, s.to]));
    const add = (k, name) => { (groups[k] = groups[k] || []); if (!groups[k].includes(name)) groups[k].push(name); };
    sc.edges.forEach(e => {
      if (e.from.includes('*')) {
        (anyTo[e.to || '*'] = anyTo[e.to || '*'] || []).push(e.name);
        // seçili yolda "her küme"den gelen bağlantı da okla çizilsin
        (selPath || []).forEach(s => { if (s.edge === e.id) add(s.from + '>' + s.to, e.name); });
        return;
      }
      e.from.forEach(f => { if (!stOf(f) || !allowed(f, toOf(e, f))) return; add(f + '>' + toOf(e, f), e.name); });
    });
    let g = '';
    Object.entries(groups).forEach(([k, names]) => {
      const [f, t] = k.split('>'), a = stOf(f), b = stOf(t);
      if (!a || !b) return;
      const on = k === onKey, lbl = h(cut(names.join(' · '), 30)), cls = `ke ${on ? 'on' : ''} ${pth.has(k) ? 'pth' : ''}`;
      if (f === t) {
        const x = a.x, y = a.y - NH / 2;
        g += `<g class="${cls}"><path d="M${x - 16},${y} C${x - 44},${y - 52} ${x + 44},${y - 52} ${x + 16},${y}" marker-end="url(#${on ? 'karOn' : 'kar'})"/>
          <text x="${x}" y="${y - 44}" text-anchor="middle">${lbl}</text></g>`;
        return;
      }
      const off = groups[t + '>' + f] ? 26 : 10;
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      const c = { x: (a.x + b.x) / 2 - dy / L * off, y: (a.y + b.y) / 2 + dx / L * off };
      const p1 = border(a, c), p2 = border(b, c);
      const lx = 0.25 * p1.x + 0.5 * c.x + 0.25 * p2.x, ly = 0.25 * p1.y + 0.5 * c.y + 0.25 * p2.y;
      g += `<g class="${cls}"><path d="M${p1.x},${p1.y} Q${c.x},${c.y} ${p2.x},${p2.y}" marker-end="url(#${on ? 'karOn' : 'kar'})"/>
        <text x="${lx}" y="${ly - 4}" text-anchor="middle">${lbl}</text></g>`;
    });
    sc.states.forEach(s => {
      const cur = state && s.id === state.st, sel = linkFrom === s.id;
      const sub = s.desc || KINDS[s.kind].label;
      const any = [...(anyTo[s.id] || [])];
      g += `<g class="kn2 ${cur ? 'cur' : ''} ${sel ? 'sel' : ''} ${pthN.has(s.id) ? 'pth' : ''}" data-node="${s.id}" style="--c:${s.color}">
        <rect x="${s.x - NW / 2}" y="${s.y - NH / 2}" width="${NW}" height="${NH}" rx="14"/>
        <text x="${s.x}" y="${s.y - 4}" text-anchor="middle" class="b">${h(cut(`${s.icon || ''} ${s.name}${s.start ? ' ★' : ''}${{ like: ' 💜', dislike: ' ✖' }[pref(ctx.arch(), s.id)] || ''}`.trim(), 18))}</text>
        <text x="${s.x}" y="${s.y + 14}" text-anchor="middle" class="s">${h(cut(sub, 20))}</text>
        ${any.length ? `<text x="${s.x}" y="${s.y + NH / 2 + 14}" text-anchor="middle" class="any">⤵ her kümeden: ${h(cut(any.join(', '), 30))}</text>` : ''}</g>`;
    });
    // Kenarda boşluk bırak ki kümeler dışarı da sürüklenebilsin; sürüklerken çerçeve sabit (fixedVB)
    const W = Math.max(960, ...sc.states.map(s => s.x + 160)), H = Math.max(440, ...sc.states.map(s => s.y + 110));
    const top = Math.min(-10, ...sc.states.map(s => s.y - 100));
    return `<svg class="kmach" id="kMach" viewBox="${fixedVB || `0 ${top} ${W} ${H - top}`}" role="img" aria-label="Küme haritası">${MARKERS}${g}</svg>`;
  }

  /* ---------- Parçalar ---------- */
  const split = s => s.split(',').map(x => x.trim()).filter(Boolean);
  const lines = s => s.split('\n').map(x => x.trim()).filter(Boolean);
  const emojiSplit = v => (window.Intl && Intl.Segmenter ? [...new Intl.Segmenter().segment(v)].map(x => x.segment) : v.split(/\s+/))
    .filter(x => x.trim() && x !== ',');
  const badge = id => { const s = stOf(id); return s ? `<span class="kbadge" style="background:${s.color}22;color:${s.color}">${h(`${s.icon || ''} ${s.name}`.trim())}</span>` : '<span class="kbadge">?</span>'; };
  const fromBadges = e => e.from.includes('*') ? '<span class="kbadge any">her küme</span>' : e.from.map(badge).join(' ') || '<span class="kbadge clash">hiçbir yerden</span>';
  const toBadge = e => e.to ? badge(e.to) : '<span class="kbadge any">aynı küme</span>';

  function chat() {
    if (!log.length) return '<p class="hint">Henüz mesaj yok. Bir mesaj yaz ya da yukarıdan bir örnek seç.</p>';
    return log.map(l => `<div class="kturn">
        <div class="kme"><span>${h(l.msg)}</span></div>
        <div class="bubbles">${l.parts.map(p => `<div class="bub">${h(p)}</div>`).join('')}</div>
        <div class="kmeta">${badge(l.from)} → ${badge(l.to)}
          · bağlantı <b>${h(l.edgeName)}</b>${l.word ? ` · kelime «${h(l.word)}»` : ''}
          <br><small>C: ${h(l.src)} · «${h(l.line)}» · ρ: ${l.trace.length ? h(l.trace.join(', ')) : 'değişiklik yok'}</small></div>
      </div>`).join('');
  }

  function compare() {
    const r = delta(fresh(), cmpText || 'nasılsın?');
    const base = pickRaw(poolFor(r, startId(), cmpText).pool);
    return `<p class="hint" style="margin-top:0">δ: ${badge(r.st)} · bağlantı <b>${h(r.edge ? edOf(r.edge).name : 'Kelime yok')}</b> · C'den seçilen kalıp: <b>«${h(base)}»</b></p>
      <div class="kcmp">${ctx.archs.map(a => {
        const p = rho(a.id, base, r);
        return `<div class="way"><small>${a.icon} ${h(a.label)}</small><div class="bubbles">${p.parts.map(x => `<div class="bub">${h(x)}</div>`).join('')}</div>
          <small>${p.trace.length ? h(p.trace.join(', ')) : 'olduğu gibi'}</small></div>`;
      }).join('')}</div>`;
  }

  function condHtml(e, n = 3) {
    const chips = l => l.slice(0, n).map(w => `<span class="kw">${h(w)}</span>`).join('') + (l.length > n ? `<span class="kw more">+${l.length - n}</span>` : '') || '<small class="hint">kelime yok</small>';
    if (e.need === 'kw') return chips(e.kw);
    if (e.need === 'intent') return `<span class="kw talk">💬 ${h(e.intent ? talkName(e.intent) : 'küme seçilmedi')}</span>`;
    if (e.need === 'greet') return '<span class="kw ext">selam · günaydın</span> <small>başka kelime tutmazsa</small>';
    return '<span class="kw ext">nasılsın · naber</span> <small>başka kelime tutmazsa</small>';
  }

  // Q: kümeler
  function qCard() {
    const sc = SC();
    const card = s => {
      const out = sc.edges.filter(e => fromOk(e, s.id)).length, inn = sc.edges.filter(e => e.to === s.id).length;
      return `<div class="kstate" style="border-top-color:${s.color}">
        <div class="ph"><input class="kicon" data-sfield="${s.id}:icon" value="${h(s.icon)}" title="Kümenin simgesi"><input class="kname" data-sfield="${s.id}:name" value="${h(s.name)}">
          <span class="kbadge" style="background:${KINDS[s.kind].color}22;color:${KINDS[s.kind].color}">${KINDS[s.kind].name} · ${KINDS[s.kind].label}</span><span class="grow"></span>
          <label title="Sohbet bu kümeden başlar"><input type="radio" name="kstart" data-sstart="${s.id}" ${s.start ? 'checked' : ''}> başlangıç</label>
          ${sc.states.length > 1 ? `<button class="kx" data-sdel="${s.id}" title="Kümeyi sil">×</button>` : ''}</div>
        <input class="kdesc" data-sfield="${s.id}:desc" value="${h(s.desc)}" placeholder="açıklama">
        <div class="kswatch">${COLORS.map(c => `<button data-scolor="${s.id}:${c}" class="${c === s.color ? 'on' : ''}" style="background:${c}" title="renk"></button>`).join('')}</div>
        <div><small class="hint">Küme emojileri — bu kümeye girerken cevabın sonuna eklenir</small>
          <div class="kchips">${(s.emojis || []).map((em, i) => `<span class="kw ed emo">${h(em)}<button data-semodel="${s.id}:${i}" title="Sil">×</button></span>`).join('')}
            <input class="kemo" data-semo="${s.id}" placeholder="+ emoji, Enter"></div>
          <div class="row" style="margin-top:4px"><small class="hint" style="margin:0">ihtimal</small><input type="range" min="0" max="1" step="0.05" data-schance="${s.id}" value="${s.emojiChance ?? 0.5}">
            <output>%${Math.round((s.emojiChance ?? 0.5) * 100)}</output></div></div>
        <small class="hint">${inn} bağlantı geliyor · ${out} bağlantı çıkıyor${!out ? ' — <b style="color:var(--warn)">çıkış yok, sohbet burada takılır</b>' : ''}</small>
      </div>`;
    };
    return `<div class="card"><h3>Q · Kümeler</h3>
      <p class="hint" style="margin-top:0">Her küme konuşmanın bir aşaması. Aynı türden birden çok küme olabilir: <b>X-1a, X-1b…</b> farklı süreçler, <b>X-2a, X-2b…</b> farklı sonuçlar;
        her X-1 istediği X-2'ye bağlanabilir. Haritada kümeleri sürükleyerek yerleştir.</p>
      <div class="row" style="margin-bottom:10px"><button class="btn sm pri" data-snew="path">+ Yeni yol (${nextPathName().join(' → ')})</button>${Object.entries(KINDS).map(([k, v]) =>
        `<button class="btn sm" data-snew="${k}" style="border-color:${v.color};color:${v.color}">+ ${k === 'O' ? 'Diğer küme' : nextName(k)}</button>`).join('')}</div>
      <div class="kgrid">${sc.states.map(card).join('')}</div></div>`;
  }

  // δ: seçilen kümeden çıkan bağlantılar soldan sağa denenir
  function deltaCard(last) {
    const sc = SC();
    const s = dState && stOf(dState) ? dState : state.st;
    const steps = sc.edges.filter(e => live(e, s));
    const lastOn = last && last.from === s ? last.edge : undefined;
    const dest = id => { const x = stOf(id); return `<div class="kdest" style="background:${x ? x.color : '#999'}">${h(stName(id))}</div>`; };
    const chain = steps.map((e, i) => `${i ? '<div class="karr">hayır<br>→</div>' : ''}
        <div class="kstep ${e.id === lastOn ? 'on' : ''}" data-kgo="${e.id}" title="${h(e.desc)}">
          <div class="kq"><span class="kn">${i + 1}</span><b>${h(e.name)}</b></div>
          <div class="kcond">${condHtml(e)}</div>
          <div class="kyes">evet ↓</div>${dest(toOf(e, s))}</div>`).join('') +
      `${steps.length ? '<div class="karr">hayır<br>→</div>' : ''}<div class="kstep ${lastOn === null ? 'on' : ''}"><div class="kq"><span class="kn">✓</span><b>Kelime yok</b></div>
        <div class="kcond"><small>hiçbiri tutmadı</small>${(stOf(s).stayRules || []).map(r => condHtml({ need: 'kw', kw: r.kw }, 2)).map(c => `<div class="kcond">${c}</div>`).join('')}</div>
        <div class="kyes">↓ ${(stOf(s).stayRules || []).length ? 'kelimeye göre cevap' : ''}</div>${dest(s)}</div>`;
    const cell = (f, t) => !allowed(f, t) ? `<span class="kno" title="${h(whyNot(f, t))}">—</span>` : sc.edges.filter(e => live(e, f) && toOf(e, f) === t)
      .map(e => `<button class="kpill" style="background:${stOf(t).color}" data-kgo="${e.id}" title="${h(e.desc)}">${h(e.name)}</button>`).join('');
    const matrix = `<div class="kscroll"><table class="kmx"><tr><th>nereden ↓ · nereye →</th>${sc.states.map(t => `<th>${badge(t.id)}</th>`).join('')}</tr>
      ${sc.states.map(f => `<tr class="${f.id === s ? 'sel' : ''}"><th>${badge(f.id)}</th>${sc.states.map(t => `<td>${cell(f.id, t.id)}</td>`).join('')}</tr>`).join('')}</table></div>`;
    return `<div class="card"><h3>δ · Karar zinciri</h3>
      <div class="row" style="margin-bottom:10px"><span class="hint" style="margin:0">Hangi kümedeyken?</span>
        ${sc.states.map(x => `<button class="tab ${x.id === s ? 'on' : ''}" data-kst="${x.id}">${h(stName(x.id))}${state && x.id === state.st ? ' ●' : ''}</button>`).join('')}</div>
      <p class="hint" style="margin-top:0">Karakter <b>${h(stName(s))}</b> kümesindeyken gelen mesaj bu kutulardan soldan sağa geçer; ilk <b>evet</b> diyen kutu yeni kümeyi belirler.
        Sırayı bağlantı kartlarındaki ↑ ↓ ile değiştirirsin. Kutuya tıklayınca bağlantının kartına gidersin.</p>
      <div class="kchain">${chain}</div>
      <details style="margin-top:12px"><summary>Bütün bağlantılar tek tabloda</summary>${matrix}</details></div>`;
  }

  // W: bağlantı kartları (nereden, nereye, koşul, kelimeler, sıra)
  function wCard(ov, nOv) {
    const sc = SC();
    const box = (e, i) => {
      const toc = e.to && stOf(e.to) ? stOf(e.to).color : '#8b87a0';
      const tog = (id, label, on, c, off) => `<button class="ktog ${on ? 'on' : ''}" data-efrom="${e.id}:${id}" style="--c:${c}" ${off ? `disabled title="${h(off)}"` : ''}>${h(label)}</button>`;
      const kwNeed = e.need === 'kw';
      // Geçersiz kaynak / hedef seçilemez (S → yalnız X, X ↛ X-2); "her küme"de geçersiz kümeler atlanır
      const noFrom = s => e.to ? whyNot(s.id, e.to) : null;
      const noTo = t => e.from.some(f => f !== '*' && stOf(f) && !allowed(f, t.id));
      return `<div class="kedge" id="kw-${e.id}" style="border-left-color:${toc}">
        <div class="ph"><span class="kn">${i + 1}</span><input class="kname" data-ename="${e.id}" value="${h(e.name)}">
          <span class="grow"></span><button class="kx" data-emove="${e.id}:-1" title="Önceliği artır">↑</button><button class="kx" data-emove="${e.id}:1" title="Önceliği azalt">↓</button>
          <button class="kx" data-edel="${e.id}" title="Bağlantıyı sil">×</button></div>
        <div class="kflow">${fromBadges(e)}<span class="karrow">→</span>${toBadge(e)}</div>
        <div class="krow"><small>nereden</small><div class="kchips">
          ${sc.states.map(s => tog(s.id, stName(s.id), e.from.includes(s.id), s.color, noFrom(s))).join('')}</div></div>
        <div class="krow"><small>nereye</small><select data-eto="${e.id}"><option value="" ${!e.to ? 'selected' : ''}>aynı kümede kal</option>
          ${sc.states.map(s => `<option value="${s.id}" ${e.to === s.id ? 'selected' : ''} ${noTo(s) ? 'disabled' : ''}>${h(stName(s.id))}${noTo(s) ? ' (geçersiz)' : ''}</option>`).join('')}</select></div>
        <div class="krow"><small>koşul</small><select data-eneed="${e.id}">${Object.entries(NEED).map(([k, v]) => `<option value="${k}" ${e.need === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        ${e.need === 'intent' ? `<div class="krow"><small>hangi küme</small><select data-eintent="${e.id}"><option value="">— seç —</option>
          ${talkIds().map(id => `<option value="${id}" ${e.intent === id ? 'selected' : ''}>${h(talkName(id))}</option>`).join('')}</select></div>` : ''}
        ${kwNeed ? `<div class="kchips">${e.kw.map((w, j) => {
            const c = ov[e.id + ':' + w];
            return `<span class="kw ed ${c ? 'clash' : ''}" ${c ? `title="Başka bağlantıda da var: ${[...c].map(id => edOf(id).name).join(', ')}"` : ''}>${c ? '⚠ ' : ''}${h(w)}<button data-kdel="${e.id}:${j}" title="Sil">×</button></span>`;
          }).join('') || '<small class="hint">kelime yok — bu bağlantı hiç tutmaz</small>'}</div>
          <div class="kadd"><input type="text" data-kadd="${e.id}" placeholder="kelime ekle, Enter (virgülle birden çok)"></div>` : ''}
      </div>`;
    };
    return `<div class="card"><h3>W · Bağlantılar ${nOv ? `<small class="st empty">⚠ ${nOv} çakışan kelime</small>` : '<small class="st">çakışma yok ✓</small>'}</h3>
      <p class="hint" style="margin-top:0">Her kart bir bağlantı: <b>hangi kümelerden → hangi kümeye</b>, neyle tetiklenir. Numara önceliktir (↑ ↓). Bir kelime iki bağlantıda birden olmamalı
        (biri ötekinin başıysa da çakışır: «bit» ve «bitti»). Kelimenin başı eşleşir. Haritada <b>Bağlantı çiz</b> ile iki kümeye tıklayarak da bağlantı kurabilirsin.</p>
      <div class="row" style="margin-bottom:10px"><button class="btn sm" id="kEdNew">+ Yeni bağlantı</button></div>
      <div class="kgrid">${sc.edges.map(box).join('')}</div></div>`;
  }

  /* Konuşma kümesi fonksiyonu: girdiler (sol) → çıktılar (sağ); eşleşmeyen her şey → genel cümleler.
   * Diyagramda girdiye tıkla, sonra çıktıya tıkla: bağlantı değişir. */
  let selTalk = null, selIn = null, fnTest = '';
  // "sınav + yarın" ile "yarın + sınav" aynı girdi
  const ckey = kw => K.parts(kw).map(w => ctx.E.norm(w)).sort().join('+');
  function fnPanel(id) {
    const aid = ctx.arch(), m = tmap(id), L = talkLines(aid, id);
    const test = fnTest ? talkMatch(id, fnTest) : null;
    const outs = [...m.outs, { id: '__gen', name: 'Genel cümleler', lines: L, gen: true }];
    const RH = 34, PAD = 14, H = Math.max(m.ins.length, outs.length) * RH + PAD * 2;
    const iy = i => PAD + (H - PAD * 2 - m.ins.length * RH) / 2 + i * RH + RH / 2;
    const oy = i => PAD + (H - PAD * 2 - outs.length * RH) / 2 + i * RH + RH / 2;
    const IX = 8, IW = 200, OX = 470, OW = 340;
    let g = '';
    m.ins.forEach((x, i) => {
      const o = outs.findIndex(o => o.id === x.out), on = test && test.input === x;
      if (o >= 0) g += `<path d="M${IX + IW},${iy(i)} C${(IX + IW + OX) / 2},${iy(i)} ${(IX + IW + OX) / 2},${oy(o)} ${OX},${oy(o)}" class="fe ${on ? 'on' : ''} ${selIn === i ? 'sel' : ''}"/>`;
    });
    g += `<text x="${(IX + IW + OX) / 2}" y="${H - 4}" text-anchor="middle" class="s">eşleşmeyen her şey → Genel cümleler</text>`;
    m.ins.forEach((x, i) => {
      const on = test && test.input === x;
      g += `<g class="fn in ${selIn === i ? 'sel' : ''} ${on ? 'on' : ''}" data-fin="${i}"><rect x="${IX}" y="${iy(i) - 12}" width="${IW}" height="24" rx="12"/>
        <text x="${IX + 12}" y="${iy(i) + 4}">${h(cut(x.kw, 26))}</text></g>`;
    });
    outs.forEach((o, i) => {
      const on = test ? (test.out === o || (o.gen && !test)) : false, gen = o.gen && fnTest && !test;
      const n = m.ins.filter(x => x.out === o.id).length;
      g += `<g class="fn out ${o.gen ? 'gen' : ''} ${on || gen ? 'on' : ''} ${selIn != null && !o.gen ? 'pick' : ''}" data-fout="${o.id}"><rect x="${OX}" y="${oy(i) - 13}" width="${OW}" height="26" rx="8"/>
        <text x="${OX + 10}" y="${oy(i) + 4}" class="b">${h(cut(o.name, 18))}</text>
        <text x="${OX + OW - 8}" y="${oy(i) + 4}" text-anchor="end" class="s">${o.gen ? `${L.length} cümle` : `${n} girdi · ${o.lines.length} cümle`}</text></g>`;
    });
    const svg = `<svg class="kmach fnsvg" viewBox="0 0 ${OX + OW + 8} ${H}" style="max-height:${H}px">${g}</svg>`;
    const intentWords = ((ctx.A.INTENTS.find(r => r[0] === id) || [])[1] || []).map(w => w.replace(/^[~^]/, ''))
      .filter(w => !m.ins.some(x => ctx.E.norm(x.kw) === ctx.E.norm(w)));
    const outCard = o => `<div class="kpool fnout" id="fo-${o.id}">
        <div class="ph"><input class="kname" data-foname="${o.id}" value="${h(o.name)}"><span class="grow"></span><button class="kx" data-fodel="${o.id}" title="Çıktıyı sil">×</button></div>
        <small class="hint">girdiler — bunlardan biri tutarsa bu cevap. Bir girdideki kelimelerin <b>hepsi</b> mesajda geçmeli (sıra ve aradaki kelimeler önemsiz):</small>
        <div class="kfins">${m.ins.map((x, i) => x.out !== o.id ? '' : `<div class="kfin">
            ${K.parts(x.kw).map((w, j) => `${j ? '<b class="kplus">+</b>' : ''}<span class="kw ed">${h(w)}<button data-fipdel="${i}:${j}" title="Kelimeyi çıkar">×</button></span>`).join('')}
            <input class="kemo" style="width:110px" data-fipart="${i}" placeholder="+ kelime, Enter" title="Bu girdiye kelime ekle: hepsi geçerse tutar">
            <span class="grow"></span><button class="kx" data-fidel="${i}" title="Girdiyi sil">×</button></div>`).join('')}</div>
        <input class="kemo" style="width:220px" data-fiadd="${o.id}" placeholder="+ yeni girdi: kelime ya da kelime + kelime, Enter">
        <small class="hint">çıktı — cevaplar (her satır bir cevap, a|b iki balon):</small>
        <textarea data-folines="${o.id}" rows="${Math.min(5, o.lines.length + 1)}" spellcheck="false">${h(o.lines.join('\n'))}</textarea></div>`;
    return `<div class="kfn">
      <div class="row"><h3 style="margin:0">ƒ Fonksiyon</h3><span class="hint" style="margin:0">girdi → çıktı</span></div>
      <p class="hint">Fonksiyon gibi: her <b>girdi</b> (kelime ya da kelime grubu) tek bir <b>çıktıya</b> gider, bir çıktıya birden çok girdi gidebilir.
        Bir girdi birden çok kelimeden oluşabilir (<b>yarın + sınav</b>): hepsi mesajda geçerse tutar, aralarına başka kelime girebilir.
        Mesajda birden çok girdi tutarsa en özeli kazanır: önce kelimesi çok olan, sonra uzun olan. Örnek: <b>X → A · X + Y → B · Y + Z → C</b>.
        Hiçbiri tutmazsa kümenin genel cümleleri kullanılır.
        Girdiler bu kümeyi tetiklemeye de yeter: «iyi akşamlar» girdisi varsa o mesaj Selamlaşma sayılır.
        Diyagramda bir girdiye, sonra bir çıktıya tıklayarak bağlantısını değiştirebilirsin.${selIn != null ? ` <b style="color:var(--accent)">«${h(m.ins[selIn].kw)}» seçili → çıktıya tıkla</b>` : ''}</p>
      <div class="row" style="margin-bottom:6px"><input type="text" id="kFnTest" value="${h(fnTest)}" placeholder="dene: bir mesaj yaz…">
        <span class="hint" style="margin:0">${fnTest ? (test ? `→ girdi <b>«${h(test.input.kw)}»</b> → çıktı <b>«${h(test.out.name)}»</b>: ${h((test.out.lines[0] || '').split('|').join(' / '))}`
          : '→ hiçbir girdi tutmadı → <b>Genel cümleler</b>') : ''}</span></div>
      <div class="kmapbox">${m.ins.length || m.outs.length ? svg : '<p class="hint" style="padding:10px">Henüz girdi/çıktı yok. «+ çıktı» ile başla.</p>'}</div>
      ${intentWords.length ? `<div class="kchips" style="margin-top:8px"><small class="hint" style="margin:0">niyetin kelimeleri (tıkla → ${m.outs.length ? 'seçili / ilk' : 'yeni'} çıktıya girdi):</small>
        ${intentWords.slice(0, 30).map(w => `<button class="ktog" data-fisug="${h(w)}">${h(w)}</button>`).join('')}</div>` : ''}
      <div class="row" style="margin:10px 0 6px"><b>Çıktılar</b><button class="btn sm" data-foadd="1">+ çıktı</button></div>
      <div class="kgrid">${m.outs.map(outCard).join('')}</div></div>`;
  }

  // Havuz anahtarı → nesne: e:bağlantı · s:küme (kalma) · r:küme:i (kelimeli kalma)
  function poolRef(key) {
    const [k, id, i] = key.split(':');
    if (k === 'e') { const o = edOf(id); return { o, lines: 'lines', useK: 'use', use: o.use }; }
    if (k === 'r') { const o = stOf(id).stayRules[+i]; return { o, lines: 'lines', useK: 'use', use: o.use }; }
    const o = stOf(id); return { o, lines: 'stay', useK: 'stayUse', use: o.stayUse };
  }

  // C: cümleler gidilen kümeye göre gruplu; satırlar sohbet balonu
  const tagPh = s => h(s).replace(/\{(t|w|h|name|laugh|x)\}/g, '<i class="kph">{$1}</i>');
  function cCard() {
    const sc = SC();
    const aid = ctx.arch();
    const pool = (key, title, from, list) => {
      const open = openPools.has(key), use = poolRef(key).use || [];
      // konuşma kümelerinden gelen cümleler (seçili kişilik için, kesikli balon)
      const refs = use.map(id => { const L = talkLines(aid, id);
        return `<div class="kline"><span class="kw talk">💬 ${h(talkName(id))} <small>${L.length}</small><button data-udel="${key}|${id}" title="Çıkar">×</button></span>
          ${L.slice(0, 2).map(l => `<span class="bub ref">${tagPh(l.split('|')[0])}</span>`).join('') || '<small class="hint">bu kişilikte cümlesi yok</small>'}</div>`; }).join('');
      return `<div class="kpool">
        <div class="ph"><b>${h(title)}</b><span class="grow"></span><a data-kopen="${key}">${open ? 'kapat' : 'düzenle'}</a></div>
        <div class="kfrom">${from.map(x => `<span>${h(x)}</span>`).join('')}</div>
        ${open ? `<textarea data-kp="${key}" rows="${Math.min(7, list.length + 1)}" spellcheck="false" placeholder="her satır bir cevap · a|b iki balon">${h(list.join('\n'))}</textarea>`
          : `<div class="klines">${list.map(l => `<div class="kline">${l.split('|').map(b => `<span class="bub">${tagPh(b)}</span>`).join('')}</div>`).join('') || (use.length ? '' : '<small class="hint">boş → "hmm"</small>')}</div>`}
        <div class="klines">${refs}</div>
        <select class="kuse" data-uadd="${key}"><option value="">+ konuşma kümesinden cümle ekle…</option>
          ${[...talkIds(), 'love', 'refuse'].filter(id => !use.includes(id)).map(id => `<option value="${id}">${h(talkName(id))} (${talkLines(aid, id).length})</option>`).join('')}</select>
      </div>`;
    };
    const into = s => sc.edges.filter(e => e.to === s.id || (!e.to && fromOk(e, s.id)));
    return `<div class="card"><h3>C · Cevap havuzları</h3>
      <p class="hint" style="margin-top:0">Karakter bir kümeye girerken o bağlantının cümlelerinden birini seçer (son kullandıklarını tekrar etmez), sonra ρ kişiliğine göre söyler;
        kümenin emojisi de buraya eklenir. <i class="kph">{w}</i> bağlantıyı tetikleyen kelime · yan yana balonlar = <code>|</code> ile ayrılmış ayrı mesajlar.</p>
      <div class="kcols">${sc.states.map(s => `<div class="kcol" style="border-top-color:${s.color}"><div class="kcolh">${badge(s.id)} <small>bu kümeye girerken · ${(s.emojis || []).join(' ')}</small></div>
        ${into(s).map(e => pool('e:' + e.id, e.name, [`${e.from.includes('*') ? 'her küme' : e.from.map(stName).join(', ')}`], e.lines)).join('')}
        ${stayBox(s, pool)}</div>`).join('')}</div></div>`;
  }

  // Kalma: önce kelimeli cevaplar (sırayla, ilk tutan), hiçbiri tutmazsa genel kalma cümleleri
  function stayBox(s, pool) {
    const rules = s.stayRules || [];
    // bu kümeden çıkan bir bağlantının kelimesiyle aynıysa önce bağlantı tutar, kural hiç çalışmaz
    const shadow = w => { const p = ctx.E.norm(w); const e = SC().edges.find(e => live(e, s.id) && e.need === 'kw' && hit(e.kw, p)); return e ? e.name : null; };
    const rule = (r, i) => `<div class="krule">
        <div class="ph"><b>Kelime ${i + 1}</b><span class="grow"></span><button class="kx" data-srx="${s.id}:${i}" title="Sil">×</button></div>
        <div class="kchips">${r.kw.map((w, j) => { const sh = shadow(w);
          return `<span class="kw ed ${sh ? 'clash' : ''}" ${sh ? `title="Önce «${h(sh)}» bağlantısı tutar, bu kelime burada hiç çalışmaz"` : ''}>${sh ? '⚠ ' : ''}${h(w)}<button data-srdel="${s.id}:${i}:${j}" title="Sil">×</button></span>`; }).join('')}
          <input class="kemo" style="width:150px" data-sradd="${s.id}:${i}" placeholder="+ kelime, Enter"></div>
        ${pool(`r:${s.id}:${i}`, 'Cevaplar', [], r.lines)}</div>`;
    return `<div class="kstay"><div class="ph"><b>Kelime yok (kalır)</b><span class="grow"></span><button class="btn sm" data-srnew="${s.id}">+ kelimeli cevap</button></div>
      <small class="hint">${h(stName(s.id))}'de hiçbir bağlantı tutmazsa küme değişmez. Mesajda aşağıdaki kelimelerden biri geçerse onun cevabı, geçmezse genel cevap söylenir.</small>
      ${rules.map(rule).join('')}
      ${pool('s:' + s.id, rules.length ? 'Genel (hiçbir kelime tutmazsa)' : 'Genel cevaplar', [], s.stay)}</div>`;
  }

  function scenarioBar() {
    return `<div class="kscbar"><b>Senaryo</b>
      <select id="kScn">${cfg.order.map(id => `<option value="${id}" ${id === cfg.active ? 'selected' : ''}>${h(cfg.scenarios[id].name)}</option>`).join('')}</select>
      <input id="kScnName" value="${h(SC().name)}" title="Senaryonun adı">
      <label class="klive ${SC().live ? 'on' : ''}" title="İşaretliyse bu senaryo uygulamadaki sohbette çalışır"><input type="checkbox" id="kLive" ${SC().live ? 'checked' : ''}> uygulamada kullan</label>
      <button class="btn sm" data-scn="blank">+ Boş senaryo</button>
      <button class="btn sm" data-scn="copy">Kopyala</button>
      <button class="btn sm" data-scn="kume">+ Küme şablonu</button>
      ${cfg.order.length > 1 ? '<button class="btn sm danger" data-scn="del">Sil</button>' : ''}
      <span class="grow"></span>
      <button class="btn sm" data-scn="export" title="Bu senaryoyu .json dosyası olarak indir">⬇ JSON dışa aktar</button>
      <button class="btn sm" data-scn="exportAll" title="Bütün senaryoları tek .json dosyasında indir">⬇ hepsi</button>
      <button class="btn sm" data-scn="import" title=".json dosyasından senaryo ekle">⬆ JSON içe aktar</button>
      <input type="file" id="kImport" accept=".json,application/json" hidden></div>`;
  }

  /* ---------- JSON dışa / içe aktarma ----------
   * Dosya: { format: "amor-kume", version: 1, scenarios: [ { name, states, edges, samples } ] } */
  // Konuşma kümesi fonksiyonları senaryodan bağımsızdır; dosyaya eklenir, içe aktarırken sadece olmayan kümeler eklenir
  const exportText = all => JSON.stringify({ format: 'amor-kume', version: 1, scenarios: all ? cfg.order.map(id => cfg.scenarios[id]) : [SC()], talkMap: cfg.talkMap }, null, 2);
  function exportJSON(all) {
    const body = exportText(all);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
    const slug = (all ? 'kume-senaryolari' : 'kume-' + SC().name).toLocaleLowerCase('tr').replace(/[^a-z0-9çğıöşü]+/g, '-').replace(/^-|-$/g, '');
    a.download = (slug || 'kume') + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  // Eksik alanları tamamlar, bozuk bağlantıları atar; geçersizse hata fırlatır
  function cleanScenario(raw) {
    if (!raw || !Array.isArray(raw.states) || !raw.states.length || !Array.isArray(raw.edges)) throw new Error('states / edges listesi yok');
    // id yoksa addan üretilir; bağlantılar kümeye id'siyle ya da adıyla başvurabilir
    const ids = new Set(), byName = {};
    const TR = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'C', Ğ: 'G', İ: 'I', Ö: 'O', Ş: 'S', Ü: 'U' };
    const slug = (v, p, i) => String(v || '').replace(/[çğıöşüÇĞİÖŞÜ]/g, c => TR[c]).replace(/[^A-Za-z0-9_-]+/g, '') || p + (i + 1);
    const uniq = id => { let u = id, n = 2; while (ids.has(u)) u = id + '_' + n++; ids.add(u); return u; };
    const states = raw.states.map((s, i) => {
      if (!s || typeof s !== 'object') throw new Error(`${i + 1}. küme geçersiz`);
      const id = uniq(s.id ? String(s.id) : slug(s.name, 'k', i));
      if (s.name) byName[String(s.name)] = id;
      byName[String(s.id || id)] = id;
      s = { ...s, id };
      const kind = KINDS[s.kind] ? s.kind : 'O';
      return { ...S_(String(s.id), kind, String(s.name || s.id), String(s.desc || ''), String(s.icon || ''), [], [], 100 + i * 60, 200), ...s, kind,
        emojis: Array.isArray(s.emojis) ? s.emojis.map(String) : [], stay: Array.isArray(s.stay) ? s.stay.map(String) : [],
        stayRules: Array.isArray(s.stayRules) ? s.stayRules.map(r => ({ kw: (r.kw || []).map(String), lines: (r.lines || []).map(String), use: (r.use || []).map(String) })) : [],
        stayUse: Array.isArray(s.stayUse) ? s.stayUse.map(String) : [],
        x: +s.x || 100 + i * 60, y: +s.y || 200 };
    });
    const ref = v => ids.has(String(v)) ? String(v) : byName[String(v)] || null;
    const eids = new Set();
    const edges = raw.edges.filter(e => e && typeof e === 'object').map((e, i) => {
      let id = e.id ? String(e.id) : slug(e.name, 'b', i), n = 2;
      while (eids.has(id)) id = (e.id || slug(e.name, 'b', i)) + '_' + n++;
      eids.add(id);
      return { ...e, id };
    }).map(e => ({ ...E_(e.id, String(e.name || e.id), [], '', 'kw', [], []), ...e,
      from: (Array.isArray(e.from) ? e.from : [e.from]).map(f => f === '*' ? '*' : ref(f)).filter(Boolean), to: ref(e.to) || '',
      need: NEED[e.need] ? e.need : 'kw', kw: (e.kw || []).map(String), lines: (e.lines || []).map(String),
      use: Array.isArray(e.use) ? e.use.map(String) : [] }));
    if (!states.some(s => s.start)) states[0].start = true;
    return K.noStar({ id: uid('sc'), name: String(raw.name || 'İçe aktarılan senaryo'), live: !!raw.live, states, edges, samples: Array.isArray(raw.samples) ? raw.samples : [] });
  }
  function importJSON(text) {
    const j = JSON.parse(text);
    const list = Array.isArray(j.scenarios) ? j.scenarios : Array.isArray(j) ? j : [j.scenario || j];
    const added = list.map(cleanScenario);
    added.forEach(sc => {
      let name = sc.name, n = 2;
      while (cfg.order.some(id => cfg.scenarios[id].name === name)) name = `${sc.name} (${n++})`;
      sc.name = name; cfg.scenarios[sc.id] = sc; cfg.order.push(sc.id);
    });
    cfg.active = added[added.length - 1].id;
    if (j.talkMap && typeof j.talkMap === 'object') Object.entries(j.talkMap).forEach(([id, m]) => {
      if (cfg.talkMap[id] && cfg.talkMap[id].outs.length) return;
      const f = cleanFn(m);
      if (f) cfg.talkMap[id] = f;
    });
    return added.length;
  }
  /* Fonksiyon verisini temizler: çıktı id'si yoksa adından üretilir; girdi çıktıya id'siyle ya da adıyla başvurabilir;
   * girdi "x + y" yazısı ya da ["x", "y"] dizisi olabilir. Geçersizse null. */
  function cleanFn(m) {
    if (!m || !Array.isArray(m.outs) || !Array.isArray(m.ins)) return null;
    const ids = new Set(), byName = {};
    const outs = m.outs.filter(o => o && typeof o === 'object').map((o, i) => {
      let id = String(o.id || String(o.name || '').toLocaleLowerCase('tr').replace(/[^a-z0-9çğıöşü]+/g, '_').replace(/^_|_$/g, '') || 'c' + (i + 1)), n = 2;
      while (ids.has(id)) id = (o.id || 'c' + (i + 1)) + '_' + n++;
      ids.add(id); if (o.name) byName[String(o.name)] = id; byName[String(o.id || id)] = id;
      return { id, name: String(o.name || id), lines: (o.lines || []).map(String) };
    });
    const ins = m.ins.filter(x => x && x.kw).map(x => ({ kw: K.parts(Array.isArray(x.kw) ? x.kw.join(' + ') : String(x.kw)).join(' + '),
      out: ids.has(String(x.out)) ? String(x.out) : byName[String(x.out)] })).filter(x => x.kw && x.out);
    return { outs, ins };
  }

  /* ---------- Sayfalar ----------
   * page(el, ctx, { mode, id }): scenario (senaryo) · fn (konuşma kümesi fonksiyonu; full = Reddetme / Sevdiği sayfası) · persona (kişilik havuzu) */
  function page(el, c, v) {
    ctx = c; rootEl = el; if (v) view = v;
    let html;
    if (view.mode === 'persona') html = personaView(view.id);
    else if (view.mode === 'fn') {
      if (selTalk !== view.id) { selTalk = view.id; selIn = null; fnTest = ''; }
      html = fnView(view.id, view.full);
    } else {
      if (view.id && cfg.scenarios[view.id] && cfg.active !== view.id) { cfg.active = view.id; resetChat(); dState = null; selPath = null; linkFrom = null; }
      html = scenarioView();
    }
    el.innerHTML = `<div id="kume">${html}</div>`;
    bind(el);
  }
  function render(main, c) { page(main, c, { mode: 'scenario', id: cfg.active }); }

  function scenarioView() {
    if (!state || !stOf(state.st)) resetChat();
    const aid = ctx.arch(), a = ctx.archs.find(x => x.id === aid);
    const last = log[log.length - 1];
    const ov = overlaps(), nOv = Object.keys(ov).length;
    const samples = SC().samples || [];
    return `
      <div class="card"><div class="head"><h2>${h(SC().name)}</h2><code>senaryo</code><span class="grow"></span>
          <button class="btn sm" id="kReset" title="Bütün senaryolar, kişilik havuzları ve fonksiyonlar varsayılana döner">Küme verisini sıfırla</button></div>
        <p class="desc">Kişilik tabanlı, durum geçişli diyalog. <b>Küme konuşmanın neresinde olduğunu, kişilik karakterin nasıl konuştuğunu belirler.</b>
          Kümeleri, bağlantıları, kelimeleri, cümleleri ve kümelere özel emojileri sen belirle. Değişiklikler editörün <b>Kaydet</b>'iyle proje dosyasına yazılır.
          Konuşma kümeleri ve kişilik havuzları kenar listesinden düzenlenir.</p>
        ${scenarioBar()}
        <div class="kmodel">
          <div><b>K = (Q, W, C, δ, ρ)</b></div>
          <div><code>Q</code> kümeler (S · X · X-1a, X-1b… · X-2a, X-2b…)</div>
          <div><code>W</code> her bağlantının kendine özel kelimeleri</div>
          <div><code>C</code> bağlantı cümleleri + konuşma kümeleri</div>
          <div><code>δ</code> bağlantılar: sırayla denenir, ilk tutan kazanır</div>
          <div><code>ρ</code> kişilik havuzu + kümenin emojileri</div>
        </div></div>

      <div class="card"><h3>Test sohbeti <small class="st">kişilik: ${a.icon} ${h(a.label)} (üstteki seçiciden)</small></h3>
        <div class="tabs">${samples.map((s, i) => `<button class="tab" data-ksc="${i}" title="${h(s[1].join(' / '))}">${h(s[0])}</button>`).join('')}
          ${log.length ? '<button class="tab" id="kSaveSample" title="Şu anki mesajları bu senaryoya örnek olarak kaydet">+ örnek olarak kaydet</button>' : ''}</div>
        <div class="row"><input type="text" id="kIn" placeholder="Mesaj yaz, Enter… (birden çok satır yapıştırırsan sırayla gönderilir)" autocomplete="off">
          <button class="btn pri" id="kSend">Gönder</button><button class="btn" id="kAgain" title="Aynı mesajları yeniden çalıştır (ihtimaller değişir)">tekrar</button>
          <button class="btn" id="kClear">Sohbeti sıfırla</button></div>
        <div class="row" style="margin:12px 0 6px"><h3 style="margin:0">Küme haritası</h3><span class="grow"></span>
          <button class="btn sm ${linkMode ? 'pri' : ''}" id="kLink">${linkMode ? (linkFrom ? `${h(stName(linkFrom))} → hedefe tıkla…` : 'kaynak kümeye tıkla…') : '↗ Bağlantı çiz'}</button></div>
        <div id="kMachWrap" class="kmapbox">${machine()}</div>
        <p class="hint">Kümeleri sürükle · tıklayınca karar zincirini gösterir · ★ başlangıç · 💜 / ✖ seçili kişiliğin sevdiği / sevmediği · mor kutu = şu anki küme, mor ok = son geçiş.
          ${last ? `Son geçiş: <b>${h(stName(last.from))} → ${h(stName(last.to))}</b> (${h(last.edgeName)}).` : ''}</p>
        <h3 style="margin:14px 0 6px">Simülasyon mesajlaşması</h3>
        <div class="kchat">${chat()}</div></div>

      ${pathCard()}
      ${qCard()}
      ${deltaCard(last)}
      ${wCard(ov, nOv)}
      ${cCard()}

      <div class="card"><h3>Aynı küme, farklı kişilik</h3>
        <div class="row" style="margin-bottom:8px"><input type="text" id="kCmp" value="${h(cmpText)}"><button class="btn" id="kCmpRun">yeniden</button></div>
        <div id="kCmpOut">${compare()}</div></div>`;
  }

  // Konuşma kümesinin ƒ bölümü; Reddetme / Sevdiği için tam sayfa (her kişiliğin cümleleriyle)
  function fnView(id, full) {
    const usedIn = cfg.order.flatMap(scId => {
      const sc = cfg.scenarios[scId], n = sc.edges.filter(e => e.intent === id || (e.use || []).includes(id)).length +
        sc.states.reduce((k, s) => k + ((s.stayUse || []).includes(id) ? 1 : 0) + (s.stayRules || []).filter(r => (r.use || []).includes(id)).length, 0);
      return n ? [`<button class="kpe" data-kgosc="${scId}">${h(sc.name)} · ${n}</button>`] : [];
    });
    const use = `<div class="kchips" style="margin-top:6px"><small class="hint" style="margin:0">kullanıldığı senaryolar:</small>${usedIn.join('') || '<small class="hint">henüz hiçbir senaryoda kullanılmıyor</small>'}</div>`;
    if (!full) return `<div class="card">${fnPanel(id)}${use}</div>`;
    const what = id === 'refuse' ? 'Kişilik, havuzunda <b>sevmediği</b> bir kümeye girmeye çalışınca bu cümlelerle reddeder ve olduğu kümede kalır.'
      : 'Kişilik, havuzunda <b>sevdiği</b> bir kümeye girerken %70 ihtimalle bu cümlelerden birini ikinci balon olarak ekler.';
    return `<div class="card"><div class="head"><h2>${id === 'refuse' ? '✖' : '💜'} ${h(talkName(id))}</h2><code>konuşma kümesi</code><span class="grow"></span><button class="btn sm" data-texp="${id}" title="Bu konuşma kümesini .json dosyası olarak indir">⬇ JSON dışa aktar</button></div>
        <p class="desc">${what} Hangi kişiliğin neyi sevip sevmediği <b>Kişilik Havuzları</b>'nda seçilir.</p>${use}</div>
      <div class="card"><h3>Cevap yolları · kişiliğe göre</h3><div class="kgrid">${ctx.archs.map(a => `<div>
        <b>${a.icon} ${h(a.label)}</b> <small class="hint">her satır bir cevap · a|b iki balon</small>
        <textarea data-talk2="${id}:${a.id}" rows="3" spellcheck="false">${h(((cfg.talk[id] || {})[a.id] || []).join('\n'))}</textarea></div>`).join('')}</div></div>
      <div class="card">${fnPanel(id)}</div>`;
  }

  // Kişilik havuzu: bütün senaryolarda sevdikleri / sevmedikleri + yazım tarzı (ρ) + Reddetme / Sevdiği cümleleri
  function personaView(aid) {
    const a = ctx.archs.find(x => x.id === aid) || ctx.archs[0];
    const P = cfg.persona[a.id] = cfg.persona[a.id] || { habits: [], tail: [], max: 3, likes: [], dislikes: [] };
    const sb = s => `<span class="kbadge" style="background:${s.color}22;color:${s.color}">${h(`${s.icon || ''} ${s.name}`.trim())}</span>`;
    // Sadece eklenen kümeler listelenir; eklenmeyen her küme nötrdür
    const ok = r => { const [sc, st] = r.split(':'); return cfg.scenarios[sc] && cfg.scenarios[sc].states.find(s => s.id === st); };
    const used = [...(P.likes || []), ...(P.dislikes || [])];
    const pool = (k, title, c, empty) => `<div class="kstay" style="border-color:${c}55"><b>${title}</b>
      <div class="kprefs">${(P[k] || []).filter(ok).map(r => { const [scId] = r.split(':'), s = ok(r);
        return `<div class="kprefrow">${sb(s)}<small class="hint" style="margin:0">${h(cfg.scenarios[scId].name)}${s.desc ? ' · ' + h(s.desc) : ''}</small><span class="grow"></span>
          <button class="kx" data-pdel="${k}|${r}" title="Çıkar (nötr olur)">×</button></div>`; }).join('') || `<small class="hint">${empty}</small>`}</div>
      <select class="kuse" data-padd="${k}"><option value="">+ küme ekle…</option>
        ${cfg.order.map(scId => { const sc = cfg.scenarios[scId], st = sc.states.filter(s => s.kind !== 'S' && !used.includes(scId + ':' + s.id));
          return st.length ? `<optgroup label="${h(sc.name)}">${st.map(s => `<option value="${scId}:${s.id}">${h(`${s.icon || ''} ${s.name}`.trim())}${s.desc ? ' · ' + h(s.desc) : ''}</option>`).join('')}</optgroup>` : ''; }).join('')}</select></div>`;
    const count = k => (P[k] || []).filter(r => { const [sc, st] = r.split(':'); return cfg.scenarios[sc] && cfg.scenarios[sc].states.some(s => s.id === st); }).length;
    return `
      <div class="card"><div class="head"><h2>${a.icon} ${h(a.label)}</h2><code>kişilik havuzu</code><span class="grow"></span>
          <span class="kpe">💜 ${count('likes')} sever</span><span class="kpe">✖ ${count('dislikes')} sevmez</span></div>
        <p class="desc">Kişiliğin iki havuzu var. <b>Sevdiği</b> kümeye girerken heyecanını belli eder («Sevdiği küme» cümlesi eklenir).
          <b>Sevmediği</b> kümeye girmez: «Sevmediğini reddetme» konuşma kümesiyle cevap verip olduğu yerde kalır. İkisinde de olmayan küme <b>nötr</b>dür, o konuda konuşmayı kabul eder.</p></div>

      <div class="card"><h3>Sevdikleri / sevmedikleri</h3>
        <p class="hint" style="margin-top:0">Listeye eklemediğin her küme nötrdür. Bir küme aynı anda iki listede olamaz.</p>
        <div class="grid2">${pool('likes', '💜 Sevdikleri', '#d63ca0', 'henüz yok')}${pool('dislikes', '✖ Sevmedikleri', '#e5484d', 'henüz yok')}</div></div>

      <div class="card"><h3>ρ · Yazım tarzı</h3>
        <div class="grid2">
          <div><b>İfade tercihleri ve yazım alışkanlıkları</b> <small class="hint">her satır: kalıp &gt; söyleyiş · rastgele değil, her zaman uygulanır</small>
            <textarea data-kh="habits" rows="5" spellcheck="false">${h((P.habits || []).join('\n'))}</textarea></div>
          <div><b>En fazla balon</b> <input type="number" data-kh="max" min="1" max="5" value="${P.max || 3}" style="width:70px">
            <p class="hint">Bunların üstüne kişiliğin yazım tarzı uygulanır: küçük harf %${Math.round(a.style.lowercase * 100)}, harf uzatma %${Math.round(a.style.elongate * 100)}.</p></div>
        </div>
        <div class="grid2" style="margin-top:10px">
          <div class="kstay"><b>Cümle sonu ekleri</b>
            <small class="hint">Son balonun sonuna eklenir; soru / ünlemle biten cümleye eklenmez. Harfle başlayan eke boşluk kendiliğinden konur (ya → " ya").</small>
            <div class="kchips">${(P.tail || []).map((x, i) => `<span class="kw ed">${h(x.trim() || '␣')}<button data-ptdel="${i}" title="Sil">×</button></span>`).join('') || '<small class="hint">ek yok</small>'}
              <input class="kemo" style="width:150px" data-ptadd="1" placeholder="+ ek, Enter (virgülle çok)"></div>
            <div class="row"><small class="hint" style="margin:0">ihtimal</small><input type="range" min="0" max="1" step="0.05" data-kh="tailChance" value="${P.tailChance ?? 0.5}">
              <output>%${Math.round((P.tailChance ?? 0.5) * 100)}</output>
              <small class="hint" style="margin:0">aynı anda en fazla</small><input type="number" min="1" max="4" data-kh="tailMax" value="${P.tailMax || 1}" style="width:56px"> ek</div></div>
          <div class="kstay"><b>Kişilik emojileri</b>
            <small class="hint">Kümenin emojisi tutmazsa bunlardan biri eklenir. Boş bırakırsan kişiliğin varsayılanları kullanılır: ${a.style.emojis.join(' ')}</small>
            <div class="kchips">${(P.emojis || []).map((em, i) => `<span class="kw ed emo">${h(em)}<button data-pedel="${i}" title="Sil">×</button></span>`).join('') || '<small class="hint">varsayılanlar</small>'}
              <input class="kemo" data-peadd="1" placeholder="+ emoji, Enter"></div>
            <div class="row"><small class="hint" style="margin:0">ihtimal</small><input type="range" min="0" max="1" step="0.05" data-kh="emojiRate" value="${P.emojiRate ?? a.style.emojiRate}">
              <output>%${Math.round((P.emojiRate ?? a.style.emojiRate) * 100)}</output></div></div>
        </div></div>

      <div class="card"><h3>Sevmediğini reddetme ve Sevdiği küme cümleleri</h3>
        <div class="grid2">
          <div><b>✖ Sevmediğini reddetme</b> <small class="hint">sevmediği kümeye girerken · her satır bir cevap</small>
            <textarea data-talk="refuse" rows="4" spellcheck="false">${h(((cfg.talk.refuse || {})[a.id] || []).join('\n'))}</textarea></div>
          <div><b>💜 Sevdiği küme</b> <small class="hint">sevdiği kümeye girerken %70 ihtimalle ikinci balon</small>
            <textarea data-talk="love" rows="4" spellcheck="false">${h(((cfg.talk.love || {})[a.id] || []).join('\n'))}</textarea></div>
        </div></div>`;
  }

  // Seçili kişiliğin ρ ayarları (yoksa oluşturulur)
  function persona() {
    const aid = curAid(), P = cfg.persona[aid] = cfg.persona[aid] || { habits: [], tail: [], max: 3 };
    P.tail = P.tail || []; P.emojis = P.emojis || [];
    return P;
  }

  function rerun(msgs) { resetChat(); msgs.forEach(m => turn(m, ctx.arch())); }

  /* ---------- Yollar kartı ---------- */
  const pathKey = p => p.map(s => s.edge + ':' + s.to).join('|');
  // Yolu yürüyecek örnek mesajlar: her adım için bağlantının ilk kelimesi
  function pathMessages(p) {
    // konuşma kümesinin ilk kelimesi ("^selam" → "selam")
    const intentWord = id => ((ctx.A.INTENTS.find(r => r[0] === id) || [])[1] || [])[0] || id;
    return p.map(s => {
      const e = edOf(s.edge);
      if (e.need === 'greet') return 'selam';
      if (e.need === 'how') return 'nasılsın';
      if (e.need === 'intent') return String(intentWord(e.intent)).replace(/^[~^]/, '');
      return e.kw[0] || '(kelime yok)';
    });
  }
  function pathCard() {
    const list = paths(), selK = selPath && pathKey(selPath);
    const step = (s, i, res) => {
      const e = edOf(s.edge), r = res && res[i];
      return `<span class="kpe" title="${h(e.desc)}">${h(e.name)}${r ? (r.ok ? ' <b class="ok">✓</b>' : ` <b class="bad" title="gitti: ${h(stName(r.got))}">✗</b>`) : ''}</span><span class="karrow">→</span>${badge(s.to)}`;
    };
    const items = list.map((p, i) => {
      const on = pathKey(p) === selK, res = on && pathRes && pathRes.key === selK ? pathRes.res : null;
      return `<div class="kpath ${on ? 'on' : ''}" data-kpath="${i}">
        <span class="kn">${i + 1}</span>${badge(p[0].from)}<span class="karrow">→</span>${p.map((s, j) => step(s, j, res)).join('')}
        ${on ? `<span class="grow"></span><button class="btn sm pri" data-kptest="${i}" title="${h(pathMessages(p).join(' / '))}">Bu yolu test et</button>` : ''}
        ${res ? `<div class="kpres">${res.every(r => r.ok) ? '✓ yol baştan sona çalışıyor' : '✗ bazı adımlar başka kümeye gitti — kelimeleri ya da sırayı kontrol et'} · mesajlar: ${h(pathMessages(p).join(' / '))}</div>` : ''}
      </div>`;
    });
    return `<div class="card"><h3>Yollar · bütün küme yolları <small class="st">${list.length} yol</small></h3>
      <p class="hint" style="margin-top:0">Başlangıçtan bir sonuca (X-2) giden bütün yollar. Bir yolu seç: haritada <b style="color:#d98a00">turuncu</b> görünür;
        <b>Bu yolu test et</b> her adım için bağlantının ilk kelimesini yazar ve sohbetin gerçekten o yoldan gidip gitmediğini ✓ / ✗ ile gösterir.
        Yeni bir alternatif için <b>+ Yeni yol</b> (X-1c → X-2c) kullan.</p>
      <div class="row" style="margin-bottom:8px"><button class="btn sm" data-snew="path">+ Yeni yol (${nextPathName().join(' → ')})</button>
        ${selPath ? '<button class="btn sm" data-kpath="-1">seçimi kaldır</button>' : ''}</div>
      <div class="kpaths">${items.join('') || '<p class="hint">Henüz başlangıçtan X-2\'ye giden bir yol yok.</p>'}</div></div>`;
  }
  function nextPathName() {
    for (const ch of 'abcdefghijklmnopqrstuvwxyz')
      if (!SC().states.some(s => s.name === 'X-1' + ch || s.name === 'X-2' + ch)) return ['X-1' + ch, 'X-2' + ch];
    return ['X-1?', 'X-2?'];
  }
  // Yeni yol: X-1? ve X-2? kümeleri + X → X-1? (başlama) + X-1? → X-2? (sonuç) bağlantıları
  function newPath() {
    const sc = SC(), [n1, n2] = nextPathName();
    const y = Math.max(-40, ...sc.states.filter(s => s.kind === 'X1' || s.kind === 'X2').map(s => s.y)) + 150;
    const a = S_(uid('k'), 'X1', n1, 'Yeni süreç', '🛤️', [], ['hmm, sonra?'], KINDS.X1.x, y);
    const b = S_(uid('k'), 'X2', n2, 'Yeni sonuç', '🏁', [], ['başka ne var?'], KINDS.X2.x, y);
    sc.states.push(a, b);
    const xs = sc.states.filter(s => s.kind === 'X').map(s => s.id);
    const e1 = E_(uid('e'), `Başlama (${n1})`, xs, a.id, 'kw', [], ['aa öyle mi? anlat'], { desc: `X → ${n1}: bu yolun kelimelerini yaz` });
    const e2 = E_(uid('e'), `Sonuç (${n2})`, [a.id], b.id, 'kw', [], ['oh, demek öyle bitti'], { desc: `${n1} → ${n2}: bu yolun sonuç kelimelerini yaz` });
    // genel "her küme" bağlantılarından önce denensin diye X'ten çıkanların başına yakın koy
    const at = sc.edges.findIndex(e => !e.from.includes('*'));
    sc.edges.splice(at < 0 ? sc.edges.length : at, 0, e1, e2);
    return e1;
  }

  /* ---------- Düzenleme işlemleri ---------- */
  function newState(kind) {
    const sc = SC(), n = sc.states.filter(s => s.kind === kind).length;
    const s = S_(uid('k'), kind, kind === 'O' ? 'K' + (sc.states.length + 1) : nextName(kind), KINDS[kind].label, { S: '👋', X: '💡', X1: '⏳', X2: '🏁', O: '🔹' }[kind],
      [], ['hmm, sonra?'], KINDS[kind].x, 90 + n * 120);
    sc.states.push(s);
    return s;
  }
  function newEdge(from, to) {
    const e = E_(uid('e'), from && to ? `${stName(from)} → ${stName(to)}` : 'Yeni bağlantı', from ? [from] : [], to || '', 'kw', [], ['hmm']);
    SC().edges.push(e);
    return e;
  }
  function delState(id) {
    const sc = SC();
    sc.states = sc.states.filter(s => s.id !== id);
    sc.edges = sc.edges.filter(e => e.to !== id).map(e => ({ ...e, from: e.from.filter(f => f !== id) }));
    if (!sc.states.some(s => s.start)) sc.states[0].start = true;
  }

  function bind(main) {
    const el = main.querySelector('#kume');
    const again = () => page(rootEl, ctx);
    // Senaryo değişti (yeni / kopya / sil / içe aktar / sıfırla): editörde o senaryonun sayfasına geç
    const nav = () => { store(); resetChat(); dState = null; linkFrom = null; selPath = null; if (ctx.go) ctx.go('sc:' + cfg.active); else again(); };
    const stay = () => { const y = window.scrollY; again(); window.scrollTo(0, y); };
    const save = () => { store(); stay(); };
    const send = () => {
      const msgs = el.querySelector('#kIn').value.split('\n').map(s => s.trim()).filter(Boolean);
      if (!msgs.length) return;
      msgs.forEach(m => turn(m, ctx.arch()));
      stay();
      main.querySelector('#kIn').focus({ preventScroll: true });
      const ch = main.querySelector('.kchat'); ch.scrollTop = ch.scrollHeight;
    };
    const flash = id => {
      const box = main.querySelector('#kw-' + id);
      if (box) { box.scrollIntoView({ block: 'center', behavior: 'smooth' }); box.classList.add('flash'); setTimeout(() => box.classList.remove('flash'), 1400); }
    };

    el.addEventListener('click', e => {
      const t = e.target, d = t.dataset, sc = SC();
      if (d.kst) { dState = d.kst; return stay(); }
      if (d.scn === 'export' || d.scn === 'exportAll') return exportJSON(d.scn === 'exportAll');
      if (d.scn === 'import') return el.querySelector('#kImport').click();
      // Konuşma kümesi fonksiyonu
      const fin = t.closest('[data-fin]'), fout = t.closest('[data-fout]');
      if (fin) { selIn = selIn === +fin.dataset.fin ? null : +fin.dataset.fin; return stay(); }
      if (fout) {
        const m = tmap(selTalk), o = fout.dataset.fout;
        if (selIn != null) {
          if (o === '__gen') m.ins.splice(selIn, 1); else m.ins[selIn].out = o; // genele bağlamak = özel girdiyi kaldırmak
          selIn = null; return save();
        }
        const box = main.querySelector('#fo-' + o); if (box) box.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return;
      }
      if (d.foadd) { const m = tmap(selTalk); m.outs.push({ id: uid('o'), name: 'Çıktı ' + (m.outs.length + 1), lines: [] }); return save(); }
      if (d.fodel) { const m = tmap(selTalk); m.outs = m.outs.filter(o => o.id !== d.fodel); m.ins = m.ins.filter(x => x.out !== d.fodel); selIn = null; return save(); }
      if (d.fidel) { tmap(selTalk).ins.splice(+d.fidel, 1); selIn = null; return save(); }
      if (d.fipdel) {
        const [i, j] = d.fipdel.split(':').map(Number), m = tmap(selTalk), ps = K.parts(m.ins[i].kw);
        ps.splice(j, 1);
        if (ps.length) m.ins[i].kw = ps.join(' + '); else m.ins.splice(i, 1);
        selIn = null; return save();
      }
      if (d.fisug) {
        const m = tmap(selTalk);
        if (!m.outs.length) m.outs.push({ id: uid('o'), name: 'Çıktı 1', lines: [] });
        const target = selIn != null ? m.ins[selIn].out : m.outs[0].id;
        m.ins.push({ kw: d.fisug, out: target });
        return save();
      }
      if (d.udel) {
        const [key, id] = d.udel.split('|'), r = poolRef(key);
        r.o[r.useK] = (r.o[r.useK] || []).filter(x => x !== id);
        return save();
      }
      if (d.pdel) { const [k, ref] = d.pdel.split('|'), P = persona(); P[k] = (P[k] || []).filter(x => x !== ref); return save(); }
      if (d.kgosc && ctx.go) return ctx.go('sc:' + d.kgosc);
      if (d.texp && ctx.exportTalk) return ctx.exportTalk(d.texp);
      if (d.ptdel || d.pedel) {
        const P = persona();
        if (d.ptdel) P.tail.splice(+d.ptdel, 1); else P.emojis.splice(+d.pedel, 1);
        return save();
      }
      if (d.srnew) { const s = stOf(d.srnew); (s.stayRules = s.stayRules || []).push({ kw: [], lines: ['hmm'] }); return save(); }
      if (d.srx) { const [sid, i] = d.srx.split(':'); stOf(sid).stayRules.splice(+i, 1); return save(); }
      if (d.srdel) { const [sid, i, j] = d.srdel.split(':'); stOf(sid).stayRules[+i].kw.splice(+j, 1); return save(); }
      if (d.scn) {
        if (d.scn === 'del') {
          if (!confirm(`«${sc.name}» senaryosu silinsin mi?`)) return;
          if (K.BUILTIN[cfg.active]) cfg.removed = [...(cfg.removed || []), cfg.active];
          delete cfg.scenarios[cfg.active]; cfg.order = cfg.order.filter(x => x !== cfg.active); cfg.active = cfg.order[0];
        } else {
          const n = d.scn === 'blank' ? BLANK('Yeni senaryo') : d.scn === 'kume' ? { ...KUME(), id: uid('sc'), name: 'Küme şablonu (kopya)' } : { ...clone(sc), id: uid('sc'), name: sc.name + ' (kopya)' };
          cfg.scenarios[n.id] = n; cfg.order.push(n.id); cfg.active = n.id;
        }
        return nav();
      }
      if (d.kptest) {
        const p = paths()[+d.kptest], msgs = pathMessages(p);
        rerun(msgs);
        pathRes = { key: pathKey(p), res: p.map((s, i) => ({ ok: log[i] && log[i].to === s.to, got: log[i] && log[i].to })) };
        return stay();
      }
      const kp = t.closest('[data-kpath]');
      if (kp && !t.closest('button:not([data-kpath])')) {
        const i = +kp.dataset.kpath, p = i < 0 ? null : paths()[i];
        selPath = p && (!selPath || pathKey(p) !== pathKey(selPath)) ? p : null;
        return stay();
      }
      if (d.snew === 'path') { const e1 = newPath(); store(); stay(); return flash(e1.id); }
      if (d.snew) { const s = newState(d.snew); store(); stay(); const n = main.querySelector(`[data-sfield="${s.id}:name"]`); if (n) n.scrollIntoView({ block: 'center' }); return; }
      if (d.sdel) { if (confirm(`«${stName(d.sdel)}» kümesi ve ona giden bağlantılar silinsin mi?`)) { delState(d.sdel); if (!stOf(state.st)) resetChat(); save(); } return; }
      if (d.scolor) { const [id, c] = d.scolor.split(':'); stOf(id).color = c; return save(); }
      if (d.semodel) { const [id, i] = d.semodel.split(':'); stOf(id).emojis.splice(+i, 1); return save(); }
      if (d.efrom) {
        const [id, f] = d.efrom.split(':'), ed = edOf(id);
        if (f === '*') ed.from = ed.from.includes('*') ? [] : ['*'];
        else { ed.from = ed.from.filter(x => x !== '*'); ed.from = ed.from.includes(f) ? ed.from.filter(x => x !== f) : [...ed.from, f]; }
        return save();
      }
      if (d.emove) {
        const [id, dir] = d.emove.split(':'), i = sc.edges.findIndex(x => x.id === id), j = i + +dir;
        if (j >= 0 && j < sc.edges.length) [sc.edges[i], sc.edges[j]] = [sc.edges[j], sc.edges[i]];
        return save();
      }
      if (d.edel) { if (confirm(`«${edOf(d.edel).name}» bağlantısı silinsin mi?`)) { sc.edges = sc.edges.filter(x => x.id !== d.edel); save(); } return; }
      if (t.id === 'kEdNew') { const ne = newEdge(); store(); stay(); return flash(ne.id); }
      if (d.kdel) { const [id, i] = d.kdel.split(':'); edOf(id).kw.splice(+i, 1); return save(); }
      if (d.kopen) { openPools.has(d.kopen) ? openPools.delete(d.kopen) : openPools.add(d.kopen); return stay(); }
      if (t.id === 'kLink') { linkMode = !linkMode; linkFrom = null; return stay(); }
      const go = t.closest('[data-kgo]');
      if (go) return flash(go.dataset.kgo);
      if (t.id === 'kSend') return send();
      if (t.id === 'kClear') { resetChat(); return stay(); }
      if (t.id === 'kAgain') { rerun(log.map(l => l.msg)); return stay(); }
      if (t.id === 'kSaveSample') {
        const name = prompt('Örneğin adı:', 'Örnek ' + ((sc.samples || []).length + 1));
        if (name) { (sc.samples = sc.samples || []).push([name, log.map(l => l.msg)]); save(); }
        return;
      }
      if (t.id === 'kCmpRun') { el.querySelector('#kCmpOut').innerHTML = compare(); return; }
      if (t.id === 'kReset' && confirm('Bütün senaryolar, kümeler ve kişilik ayarları varsayılana dönsün mü?')) { const keep = cfg.active; cfg = DEF(); if (cfg.scenarios[keep]) cfg.active = keep; return nav(); }
      const sc2 = t.closest('[data-ksc]');
      if (sc2) { rerun(sc.samples[+sc2.dataset.ksc][1]); stay(); }
    });

    // Küme haritası: sürükle, tıkla (karar zinciri), bağlantı çiz
    el.addEventListener('pointerdown', e => {
      const n = e.target.closest('[data-node]');
      if (!n) return;
      e.preventDefault();
      const id = n.dataset.node, s = stOf(id), svg = el.querySelector('#kMach');
      // Sürükleme boyunca çerçeve sabit: svg her harekette yeniden çizilse de ekran→harita dönüşümü değişmez
      const vb = svg.getAttribute('viewBox'), inv = svg.getScreenCTM().inverse(), pt = svg.createSVGPoint();
      const toSvg = ev => { pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(inv); };
      const [vx, vy, vw, vh] = vb.split(' ').map(Number);
      const p0 = toSvg(e), ox = s.x - p0.x, oy = s.y - p0.y;
      let moved = false;
      const move = ev => {
        const p = toSvg(ev);
        const nx = Math.round((p.x + ox) / 5) * 5, ny = Math.round((p.y + oy) / 5) * 5;
        if (!moved && Math.hypot(nx - s.x, ny - s.y) < 6) return;
        moved = true;
        s.x = Math.min(vx + vw - NW / 2, Math.max(vx + NW / 2, nx));
        s.y = Math.min(vy + vh - NH / 2 - 16, Math.max(vy + NH / 2 + 50, ny));
        el.querySelector('#kMachWrap').innerHTML = machine(vb);
      };
      const up = () => {
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        if (moved) { store(); el.querySelector('#kMachWrap').innerHTML = machine(); return; }
        if (linkMode) {
          if (!linkFrom) { linkFrom = id; return stay(); }
          if (linkFrom !== id && !allowed(linkFrom, id)) { alert(whyNot(linkFrom, id) + '.'); return; }
          const ne = newEdge(linkFrom, linkFrom === id ? '' : id);
          linkFrom = null; linkMode = false; store(); stay(); return flash(ne.id);
        }
        dState = id; stay();
        const z = main.querySelector('.kchain'); if (z) z.scrollIntoView({ block: 'center', behavior: 'smooth' });
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    });

    el.addEventListener('keydown', e => {
      const t = e.target, d = t.dataset;
      if (e.key !== 'Enter') return;
      if (t.id === 'kIn') { e.preventDefault(); return send(); }
      if (t.id === 'kCmp') { cmpText = t.value; el.querySelector('#kCmpOut').innerHTML = compare(); return; }
      if (d.kadd) {
        const ed = edOf(d.kadd);
        ed.kw.push(...split(t.value).filter(w => !ed.kw.some(x => ctx.E.norm(x) === ctx.E.norm(w))));
        save();
        const n = main.querySelector(`[data-kadd="${d.kadd}"]`); if (n) n.focus({ preventScroll: true });
      }
      if (d.fiadd) {
        // girdi zaten başka çıktıdaysa buraya taşınır (bir girdi tek çıktıya gider)
        const m = tmap(selTalk);
        split(t.value).forEach(w => {
          w = K.parts(w).join(' + ');
          const ex = m.ins.find(x => ckey(x.kw) === ckey(w));
          if (ex) ex.out = d.fiadd; else if (w) m.ins.push({ kw: w, out: d.fiadd });
        });
        save();
        const n = main.querySelector(`[data-fiadd="${d.fiadd}"]`); if (n) n.focus({ preventScroll: true });
      }
      if (d.fipart) {
        // girdiye tek tek kelime eklenir: "yarın" + "sınav" → "yarın + sınav"
        const m = tmap(selTalk), x = m.ins[+d.fipart], add = split(t.value).flatMap(K.parts);
        if (x && add.length) {
          const ps = K.parts(x.kw), kw = [...ps, ...add.filter(w => !ps.some(p => ctx.E.norm(p) === ctx.E.norm(w)))].join(' + ');
          const dup = m.ins.find(y => y !== x && ckey(y.kw) === ckey(kw));
          if (dup) alert(`«${kw}» girdisi zaten var.`); else x.kw = kw;
        }
        save();
        const n = main.querySelector(`[data-fipart="${d.fipart}"]`); if (n) n.focus({ preventScroll: true });
      }
      if (d.ptadd || d.peadd) {
        const P = persona(), key = d.ptadd ? 'ptadd' : 'peadd';
        if (d.ptadd) {
          // harfle / emojiyle başlayan eke boşluk; noktalama ("!!!", ".") bitişik
          const add = split(t.value).map(x => /^[\p{L}\p{N}\p{Extended_Pictographic}]/u.test(x) ? ' ' + x : x);
          P.tail = [...(P.tail || []), ...add.filter(x => !(P.tail || []).includes(x))];
        } else P.emojis = [...(P.emojis || []), ...emojiSplit(t.value).filter(x => !(P.emojis || []).includes(x))];
        save();
        const n = main.querySelector(`[data-${key}]`); if (n) n.focus({ preventScroll: true });
      }
      if (d.sradd) {
        const [sid, i] = d.sradd.split(':'), r = stOf(sid).stayRules[+i];
        r.kw.push(...split(t.value).filter(w => !r.kw.some(x => ctx.E.norm(x) === ctx.E.norm(w))));
        save();
        const n = main.querySelector(`[data-sradd="${d.sradd}"]`); if (n) n.focus({ preventScroll: true });
      }
      if (d.semo) {
        const s = stOf(d.semo);
        s.emojis = [...(s.emojis || []), ...emojiSplit(t.value).filter(x => !(s.emojis || []).includes(x))];
        save();
        const n = main.querySelector(`[data-semo="${d.semo}"]`); if (n) n.focus({ preventScroll: true });
      }
    });

    el.addEventListener('input', e => {
      const t = e.target, d = t.dataset, aid = curAid();
      if (t.id === 'kFnTest') {
        fnTest = t.value; stay();
        const n = main.querySelector('#kFnTest'); if (n) { n.focus({ preventScroll: true }); n.setSelectionRange(n.value.length, n.value.length); }
        return;
      }
      if (d.foname) { const o = tmap(selTalk).outs.find(x => x.id === d.foname); if (o) o.name = t.value; }
      else if (d.folines) { const o = tmap(selTalk).outs.find(x => x.id === d.folines); if (o) o.lines = lines(t.value); }
      else if (d.talk) { cfg.talk[d.talk] = cfg.talk[d.talk] || {}; cfg.talk[d.talk][aid] = lines(t.value); }
      else if (d.talk2) { const [k, a] = d.talk2.split(':'); cfg.talk[k] = cfg.talk[k] || {}; cfg.talk[k][a] = lines(t.value); }
      else if (d.kp) {
        const [k, id, i] = d.kp.split(':');
        if (k === 'e') edOf(id).lines = lines(t.value);
        else if (k === 'r') stOf(id).stayRules[+i].lines = lines(t.value);
        else stOf(id).stay = lines(t.value);
      } else if (d.sfield) { const [id, f] = d.sfield.split(':'); stOf(id)[f] = t.value; }
      else if (d.ename) edOf(d.ename).name = t.value;
      else if (d.schance) { stOf(d.schance).emojiChance = +t.value; t.nextElementSibling.textContent = '%' + Math.round(t.value * 100); }
      else if (t.id === 'kScnName') SC().name = t.value;
      else if (d.kh) {
        const P = cfg.persona[aid] = cfg.persona[aid] || { habits: [], tail: [], max: 3 };
        const k = d.kh;
        if (k === 'habits') P[k] = lines(t.value);
        else if (k === 'tailChance' || k === 'emojiRate') { P[k] = +t.value; t.nextElementSibling.textContent = '%' + Math.round(t.value * 100); }
        else P[k] = Math.max(1, Math.min(k === 'tailMax' ? 4 : 5, +t.value || 1));
      } else if (t.id === 'kCmp') { cmpText = t.value; return; }
      else return;
      store();
    });

    el.addEventListener('change', e => {
      const t = e.target, d = t.dataset;
      if (t.id === 'kLive') { SC().live = t.checked; return save(); }
      if (t.id === 'kImport' && t.files[0]) {
        const f = t.files[0];
        f.text().then(txt => {
          try { const n = importJSON(txt); nav(); alert(`${n} senaryo içe aktarıldı.`); }
          catch (err) { alert('İçe aktarılamadı: ' + err.message); }
        });
        return;
      }
      if (t.id === 'kScn') { cfg.active = t.value; return nav(); }
      if (d.sstart) { SC().states.forEach(s => { s.start = s.id === d.sstart; }); if (!log.length) resetChat(); return save(); }
      if (d.eto !== undefined) { edOf(d.eto).to = t.value; return save(); }
      if (d.eneed) { edOf(d.eneed).need = t.value; return save(); }
      if (d.eintent) { edOf(d.eintent).intent = t.value; return save(); }
      if (d.padd && t.value) {
        const P = persona(), o = d.padd === 'likes' ? 'dislikes' : 'likes';
        P[o] = (P[o] || []).filter(x => x !== t.value); P[d.padd] = [...(P[d.padd] || []), t.value];
        return save();
      }
      if (d.uadd && t.value) { const r = poolRef(d.uadd); r.o[r.useK] = [...(r.o[r.useK] || []), t.value]; return save(); }
      if (d.talk || d.talk2 || d.foname || d.folines) return save();
      if (d.sfield || d.ename || d.schance || t.id === 'kScnName') return save(); // harita, rozetler ve listeler yeni adla çizilsin
      if (d.kp) return save();
      if (d.kh) el.querySelector('#kCmpOut').innerHTML = compare();
    });
  }

  /* ---------- Stil ---------- */
  const css = document.createElement('style');
  css.textContent = `
    #kume .kmodel { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 4px 14px; margin-top: 10px; font-size: 13px;
      background: var(--bg); border-radius: 10px; padding: 10px 12px; }
    #kume .kmodel code { background: var(--accent-soft); color: var(--accent); border-radius: 5px; padding: 0 5px; font-weight: 800; }
    #kume .kscbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 12px; padding: 10px 12px; border: 1px solid var(--accent); border-radius: 12px; background: var(--accent-soft); }
    #kume .kscbar select, #kume .kscbar input { border: 1px solid var(--line); border-radius: 8px; padding: 5px 8px; background: var(--card); }
    #kume .kmapbox { border: 1px solid var(--line); border-radius: 12px; background: var(--bg); }
    #kume .kchat { max-height: 520px; overflow: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 4px; }
    #kume .kturn { border-bottom: 1px solid var(--line); padding-bottom: 8px; }
    #kume .kme { display: flex; justify-content: flex-end; }
    #kume .kme span { background: var(--accent); color: #fff; border-radius: 14px 14px 4px 14px; padding: 5px 11px; max-width: 80%; }
    #kume .kmeta { font-size: 12.5px; margin-top: 6px; color: var(--ink); }
    #kume .kmeta small { color: var(--mute); }
    #kume .kbadge { display: inline-block; border-radius: 6px; padding: 0 6px; font-size: 11.5px; font-weight: 800; background: var(--bg); white-space: nowrap; }
    #kume .kbadge.any { background: var(--bg); border: 1px solid var(--line); color: var(--mute); }
    #kume .kbadge.clash { background: var(--warn-soft); color: var(--warn); }
    #kume .kx { border: 1px solid var(--line); background: var(--card); border-radius: 7px; width: 24px; height: 24px; padding: 0; line-height: 1; color: var(--mute); }
    #kume .kx:hover { border-color: var(--accent); color: var(--accent); }
    #kume .kname { border: 1px solid transparent; border-radius: 7px; padding: 2px 6px; font-weight: 800; min-width: 0; width: 150px; background: transparent; }
    #kume .kname:hover, #kume .kname:focus { border-color: var(--line); background: var(--card); }
    #kume .kicon { width: 38px; text-align: center; font-size: 18px; border: 1px solid var(--line); border-radius: 8px; padding: 2px; }
    #kume .kdesc { border: 1px solid var(--line); border-radius: 8px; padding: 4px 8px; font-size: 12.5px; width: 100%; }
    #kume .kemo { width: 110px; border: 1px dashed var(--line); border-radius: 20px; padding: 2px 8px; font-size: 12.5px; background: var(--bg); }
    #kume .kw.emo { font-size: 16px; }
    #kume .kswatch { display: flex; gap: 5px; }
    #kume .kswatch button { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--card); box-shadow: 0 0 0 1px var(--line); padding: 0; }
    #kume .kswatch button.on { box-shadow: 0 0 0 2px var(--ink); }
    #kume .kstate { border: 1px solid var(--line); border-top: 5px solid; border-radius: 12px; padding: 8px 10px; display: flex; flex-direction: column; gap: 7px; }
    #kume .kstate .ph, #kume .kedge .ph { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; margin: 0; }
    /* δ zinciri */
    #kume .kchain { display: flex; flex-wrap: wrap; align-items: stretch; gap: 6px 0; }
    #kume .kstep { width: 150px; border: 1px solid var(--line); border-radius: 12px; padding: 8px; display: flex; flex-direction: column; gap: 6px; cursor: pointer; background: var(--card); }
    #kume .kstep:hover { border-color: var(--accent); }
    #kume .kstep.on { outline: 2px solid var(--accent); background: var(--accent-soft); }
    #kume .kq { display: flex; gap: 6px; align-items: center; }
    #kume .kn { width: 20px; height: 20px; border-radius: 50%; background: var(--bg); color: var(--mute); font-size: 11px; font-weight: 800; display: grid; place-items: center; flex: none; }
    #kume .kcond { flex: 1; display: flex; flex-wrap: wrap; gap: 3px; align-content: flex-start; font-size: 12px; }
    #kume .kyes { text-align: center; color: var(--mute); font-size: 11px; font-weight: 700; }
    #kume .kdest { text-align: center; border-radius: 8px; padding: 4px; font-weight: 800; color: #fff; font-size: 12.5px; }
    #kume .karr { align-self: center; text-align: center; color: var(--mute); font-size: 10.5px; font-weight: 700; width: 34px; line-height: 1.2; }
    #kume .kmx { border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 12.5px; }
    #kume .kmx th, #kume .kmx td { border: 1px solid var(--line); padding: 6px; text-align: left; vertical-align: top; }
    #kume .kmx tr.sel th:first-child { background: var(--accent-soft); }
    #kume .kpill { border: 0; border-radius: 20px; padding: 2px 9px; margin: 2px; font-size: 12px; font-weight: 700; color: #fff; }
    /* W bağlantı kartları */
    #kume .kw { display: inline-flex; align-items: center; gap: 3px; background: var(--bg); border: 1px solid var(--line); border-radius: 20px; padding: 1px 8px; font-size: 12px; }
    #kume .kw.more { color: var(--mute); } #kume .kw.ext { border-style: dashed; color: var(--mute); font-style: italic; }
    #kume .kw.ed { padding-right: 3px; }
    #kume .kfins { display: flex; flex-direction: column; gap: 4px; margin: 4px 0; }
    #kume .kfin { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; border: 1px dashed var(--line); border-radius: 10px; padding: 3px 6px; }
    #kume .kplus { color: var(--mute); font-size: 12px; }
    #kume .kw.clash { background: var(--warn-soft); border-color: #f3b4b6; color: var(--warn); font-weight: 700; }
    #kume .kw button { border: 0; background: none; color: var(--mute); width: 18px; height: 18px; border-radius: 50%; line-height: 1; padding: 0; }
    #kume .kw button:hover { background: var(--line); color: var(--warn); }
    #kume .kgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; }
    #kume .kedge { border: 1px solid var(--line); border-left: 5px solid #8b87a0; border-radius: 12px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; transition: box-shadow .3s; }
    #kume .kedge.flash { box-shadow: 0 0 0 3px var(--accent); }
    #kume .kflow { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
    #kume .karrow { font-weight: 800; color: var(--mute); }
    #kume .krow { display: flex; gap: 8px; align-items: baseline; }
    #kume .krow > small { width: 82px; flex: none; color: var(--mute); }
    #kume .krow select { border: 1px solid var(--line); border-radius: 8px; padding: 3px 6px; background: var(--card); max-width: 100%; }
    #kume .ktog { border: 1px solid var(--line); background: var(--card); border-radius: 20px; padding: 1px 8px; font-size: 12px; color: var(--mute); }
    #kume .ktog.on { background: var(--c); border-color: var(--c); color: #fff; font-weight: 700; }
    #kume .kchips { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
    #kume .kadd input { width: 100%; border: 1px dashed var(--line); border-radius: 8px; padding: 4px 8px; background: var(--bg); font-size: 12.5px; }
    /* C havuzları */
    #kume .kcols { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; align-items: start; }
    #kume .kcol { border-radius: 12px; padding: 8px; background: var(--bg); border-top: 5px solid; display: flex; flex-direction: column; gap: 8px; }
    #kume .kcolh { display: flex; gap: 6px; align-items: baseline; flex-wrap: wrap; }
    #kume .kcolh small { color: var(--mute); }
    #kume .kpool { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 7px 9px; }
    #kume .kpool .ph { display: flex; align-items: baseline; margin: 0; }
    #kume .kpool a { color: var(--accent); cursor: pointer; font-size: 12px; font-weight: 700; }
    #kume .kfrom { display: flex; flex-wrap: wrap; gap: 3px; margin: 3px 0 6px; }
    #kume .kfrom span { font-size: 11px; color: var(--mute); background: var(--bg); border-radius: 6px; padding: 0 5px; }
    #kume .kfrom span::before { content: '← '; }
    #kume .klines { display: flex; flex-direction: column; gap: 5px; }
    #kume .kline { display: flex; flex-wrap: wrap; gap: 3px; }
    #kume .kline .bub { font-size: 12.5px; padding: 3px 9px; max-width: 100%; }
    #kume i.kph { font-style: normal; font-weight: 800; color: var(--accent); background: var(--accent-soft); border-radius: 4px; padding: 0 3px; }
    #kume .kcmp { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
    #kume .kcmp .way { background: var(--bg); border-radius: 10px; padding: 7px 10px; }
    #kume .kcmp .way small { color: var(--mute); display: block; }
    #kume textarea { margin-top: 4px; min-height: 48px; }
    #kume .kscroll { overflow-x: auto; }
    /* SVG */
    svg.kmach { width: 100%; height: auto; display: block; font: 12px Nunito, system-ui, sans-serif; touch-action: none; user-select: none; }
    svg.kmach.lanes { width: auto; }
    svg.kmach .ke path { fill: none; stroke: #cfc8e6; stroke-width: 1.6; }
    svg.kmach .ke text { fill: var(--mute); font-size: 11px; paint-order: stroke; stroke: var(--card); stroke-width: 4px; stroke-linejoin: round; }
    svg.kmach .ke.on path { stroke: var(--accent); stroke-width: 2.8; }
    svg.kmach .ke.on text { fill: var(--accent); font-weight: 800; }
    svg.kmach .ah { fill: #cfc8e6; } svg.kmach .ah.on { fill: var(--accent); }
    svg.kmach .kn2 { cursor: grab; }
    svg.kmach .kn2 rect { fill: color-mix(in srgb, var(--c) 14%, white); stroke: var(--c); stroke-width: 1.6; }
    svg.kmach .kn2 text { fill: var(--ink); } svg.kmach .kn2 .b { font-weight: 800; font-size: 14px; } svg.kmach .s { fill: var(--mute); font-size: 11px; }
    svg.kmach .kn2 .any { fill: var(--mute); font-size: 10px; font-style: italic; }
    svg.kmach .kn2.cur rect { fill: var(--c); stroke-width: 3; } svg.kmach .kn2.cur text { fill: #fff; } svg.kmach .kn2.cur .any { fill: var(--mute); }
    svg.kmach .kn2.sel rect { stroke-dasharray: 5 3; stroke-width: 3; }
    svg.kmach .kn2.pth rect { stroke: #f5a524; stroke-width: 3.5; }
    svg.kmach .ke.pth path { stroke: #f5a524; stroke-width: 3.2; }
    svg.kmach .ke.pth text { fill: #b26b00; font-weight: 800; }
    #kume .kpaths { display: flex; flex-direction: column; gap: 6px; max-height: 420px; overflow: auto; }
    #kume .kpath { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; border: 1px solid var(--line); border-radius: 10px; padding: 6px 9px; cursor: pointer; }
    #kume .kpath:hover { border-color: #f5a524; }
    #kume .kpath.on { border: 2px solid #f5a524; background: #fff8ea; }
    #kume .kpe { font-size: 11.5px; color: var(--mute); background: var(--bg); border-radius: 6px; padding: 0 6px; }
    #kume .kpe .ok { color: var(--ok); } #kume .kpe .bad { color: var(--warn); }
    #kume .kpres { width: 100%; font-size: 12.5px; color: var(--mute); }
    #kume .kno { color: var(--line); }
    #kume .klive { border: 1px solid var(--line); border-radius: 8px; padding: 4px 8px; background: var(--card); font-size: 12.5px; color: var(--mute); }
    #kume .klive.on { border-color: var(--ok); color: var(--ok); font-weight: 700; }
    #kume .kw.talk { border-color: #0b84d8; color: #0b5d99; background: #eaf5fd; }
    #kume .bub.ref { background: var(--card); border: 1px dashed #0b84d8; }
    #kume .kuse { border: 1px dashed var(--line); border-radius: 8px; padding: 3px 6px; font-size: 12px; background: var(--bg); color: var(--mute); margin-top: 4px; max-width: 100%; }
    #kume .ktalk { border: 1px solid var(--line); background: var(--card); border-radius: 20px; padding: 3px 10px; font-size: 12.5px; }
    #kume .ktalk small { color: var(--mute); }
    #kume .ktalk.used { border-color: #0b84d8; background: #eaf5fd; }
    #kume .ktalk:hover { border-color: var(--accent); }
    #kume h4.ksub { margin: 10px 0 5px; color: var(--mute); font-size: 11.5px; text-transform: uppercase; letter-spacing: .05em; }
    #kume .ktalk.sel { outline: 2px solid var(--accent); background: var(--accent-soft); }
    #kume .kfn { margin-top: 12px; border: 2px solid var(--accent); border-radius: 12px; padding: 10px 12px; background: var(--card); }
    #kume #kFnTest { flex: 1; min-width: 200px; border: 1px solid var(--line); border-radius: 8px; padding: 5px 9px; }
    #kume .fnout textarea { min-height: 40px; }
    svg.fnsvg .fe { fill: none; stroke: #9ccbee; stroke-width: 1.8; }
    svg.fnsvg .fe.on { stroke: var(--accent); stroke-width: 3; } svg.fnsvg .fe.sel { stroke: #f5a524; stroke-width: 3; stroke-dasharray: 5 3; }
    svg.fnsvg .fn { cursor: pointer; }
    svg.fnsvg .fn rect { fill: var(--card); stroke: #0b84d8; stroke-width: 1.4; }
    svg.fnsvg .fn.out rect { fill: #eaf5fd; }
    svg.fnsvg .fn.gen rect { fill: var(--bg); stroke: var(--mute); stroke-dasharray: 4 3; }
    svg.fnsvg .fn text { fill: var(--ink); } svg.fnsvg .fn .b { font-weight: 800; }
    svg.fnsvg .fn.sel rect { stroke: #f5a524; stroke-width: 3; fill: #fff8ea; }
    svg.fnsvg .fn.pick rect { stroke-dasharray: 3 2; stroke-width: 2; }
    svg.fnsvg .fn.on rect { fill: var(--accent); stroke: var(--accent); } svg.fnsvg .fn.on text { fill: #fff; }
    svg.fnsvg .fn:hover rect { stroke: var(--accent); }
    #kume .kprefs { display: flex; flex-direction: column; gap: 5px; }
    #kume .kprefrow { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; border: 1px solid var(--line); border-radius: 10px; padding: 5px 8px; }
    #kume .kstay { background: var(--card); border: 1px dashed var(--mute); border-radius: 10px; padding: 7px 9px; display: flex; flex-direction: column; gap: 6px; }
    #kume .kstay > .ph { display: flex; align-items: center; margin: 0; }
    #kume .krule { border-left: 3px solid var(--accent); padding-left: 7px; display: flex; flex-direction: column; gap: 4px; }
    #kume .krule .ph { display: flex; align-items: center; margin: 0; font-size: 12.5px; }
    #kume .kstay .kpool { border-style: solid; }
    #kume .ktog:disabled { opacity: .35; cursor: not-allowed; }
    svg.kmach .kn rect { stroke: none; } svg.kmach .kn .b { font-weight: 800; font-size: 11px; }
    svg.kmach .el { font-size: 10px; }
    svg.kmach .lane { fill: #faf9fd; } svg.kmach .lane.alt { fill: #f3f1fa; }
    svg.kmach .ln { fill: var(--ink); font-weight: 700; }
    svg.kmach .lk { fill: none; stroke: #cfc8e6; stroke-width: 1.6; }
    svg.kmach .lk.jump { stroke: var(--accent); stroke-width: 2; stroke-dasharray: 5 4; }`;
  document.head.appendChild(css);

  // Editör entegrasyonu: init (dosyadaki veri), page (sayfa çiz), scenarios (kenar listesi), addScenario
  return { init: raw => { cfg = load(raw); resetChat(); }, page, scenarios: () => cfg.order.map(id => ({ id, name: cfg.scenarios[id].name, live: !!cfg.scenarios[id].live })),
    activeScenario: () => cfg.active,
    addScenario: () => { const n = BLANK('Yeni senaryo'); cfg.scenarios[n.id] = n; cfg.order.push(n.id); cfg.active = n.id; resetChat(); store(); return n.id; },
    render, delta: (s, m) => delta(s, m), overlaps: () => overlaps(), setCtx: c => { ctx = c; }, fresh, SC, cfg: () => cfg, exportText, importJSON, cleanFn, store: () => store(),
    useScenario: id => { cfg.active = id; resetChat(); } };
})();
