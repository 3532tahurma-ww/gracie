/*
 * Amor - Cevap Motoru (yapay zeka yok, kalıp tabanlı)
 * ---------------------------------------------------
 * 1) Mesajın niyetini bul (selamlama, iltifat, soru...)
 * 2) Mesajın ruh haline ve yakınlığa etkisini uygula
 * 3) Ruh haline göre doğru kalıp havuzunu seç (normal / gergin / üzgün / yorgun)
 * 4) Karakterin yazım tarzını uygula (küçük harf, harf uzatma, emoji, gülme)
 * 5) Balonlara böl ve yazma sürelerini hesapla
 */
window.Amor = window.Amor || {};

Amor.Engine = (() => {
  const S = () => Amor.Store.state;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pickRaw = arr => arr[Math.floor(Math.random() * arr.length)];

  /* ---------- Metin sadeleştirme ---------- */
  const FOLD = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  const fold = s => s.toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, ch => FOLD[ch]);
  const collapse = s => s.replace(/(.)\1+/gu, '$1');
  const norm = s => collapse(fold(s).replace(/[^\p{L}\p{N}\p{Extended_Pictographic}\s]/gu, ' ').replace(/\s+/g, ' ').trim());

  let COMPILED = [], ORDER = [];
  // '^kelime' = sadece mesaj başında
  const pat = w => {
    const start = w.startsWith('^');
    return { w, start, p: collapse(fold(start ? w.slice(1) : w)) };
  };
  function compile() {
    COMPILED = Amor.INTENTS.map(([intent, words]) => ({ intent, pats: words.map(pat) }));
    ORDER = COMPILED.map(x => x.intent);
  }

  /* ---------- Özel diyalog (diyalog-editoru.bat -> js/data/custom-dialog.js) ----------
   * intents[id] = { words, before, effect }  -> kelime listesini değiştirir / yeni niyet ekler
   * lines[arketip]["niyet" | "niyet_close" | "neg:niyet" | "sad:niyet" | "low:niyet"] = cümleler
   * kume = Küme sistemi (senaryolar, konuşma kümesi fonksiyonları, kişilik havuzları) → js/kume.js okur */
  const KEEP = ['fallback', 'greet', 'opener'];
  function applyDialog(D) {
    Object.entries(D.intents || {}).forEach(([id, def]) => {
      const i = Amor.INTENTS.findIndex(r => r[0] === id);
      const words = def.words || (i >= 0 ? Amor.INTENTS[i][1] : null);
      if (words) {
        if (i >= 0 && !def.before) Amor.INTENTS[i][1] = words;
        else {
          if (i >= 0) Amor.INTENTS.splice(i, 1);
          const at = Amor.INTENTS.findIndex(r => r[0] === def.before);
          Amor.INTENTS.splice(at < 0 ? Amor.INTENTS.length : at, 0, [id, words]);
        }
      }
      if (def.effect) Amor.INTENT_EFFECTS[id] = def.effect;
    });
    Object.entries(D.lines || {}).forEach(([aid, pools]) => {
      const a = Amor.ARCHETYPES.find(x => x.id === aid);
      if (!a) return;
      Object.entries(pools).forEach(([key, list]) => {
        const m = key.match(/^(neg|sad|low):(.+)$/);
        const bank = m ? (a.mood[m[1]] = a.mood[m[1]] || {}) : a.lines;
        const k = m ? m[2] : key;
        if (list.length) bank[k] = list;
        else if (m || !KEEP.includes(k)) delete bank[k]; // boş yol -> yedek havuza düşer
      });
    });
    compile();
  }
  if (Amor.CUSTOM_DIALOG) applyDialog(Amor.CUSTOM_DIALOG);
  else compile();

  function matches(text, { start, p }) {
    if (window.Amor?.NLU) return Amor.NLU.matchPattern(text, { start, p }).hit;
    if (start) return text === p || text.startsWith(p + ' ');
    if (!/^\p{L}/u.test(p)) return text.includes(p);
    return (' ' + text).includes(' ' + p);
  }

  function detect(raw) {
    if (window.Amor?.NLU) return Amor.NLU.classifyIntent(raw, COMPILED, ORDER);
    const text = norm(raw);
    const lower = raw.toLocaleLowerCase('tr');
    const nameM = lower.match(/(?:^|\s)(?:benim )?(?:adım|adim|ismim|bana)\s+([a-zçğıöşü]{2,15})(?:\s+de(?:\s|$)|\s|$)/);
    if (nameM && !['ne', 'mi', 'de', 'da'].includes(nameM[1])) {
      return { intent: 'tell_name', name: cap(nameM[1]), text, greet: false };
    }
    let found = 'fallback', word = null;
    for (const { intent, pats } of COMPILED) {
      const hit = pats.find(p => matches(text, p));
      if (hit) { found = intent; word = hit.w; break; }
    }
    if (found === 'fallback' && isQuestion(raw)) found = 'question';
    const greet = found !== 'greet' && COMPILED.find(x => x.intent === 'greet').pats.some(p => matches(text, p));
    return { intent: found, text, greet, word };
  }
  const isQuestion = raw => /\?\s*$/.test(raw) || /(^|\s)(mi|mu)(sin|sun|yim|yum|yiz|yuz|siniz)?(\s|$)/.test(fold(raw));

  const cap = w => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1);

  /* ---------- Yakınlık seviyesi ---------- */
  const LEVELS = [0, 8, 20, 40, 70, 110];
  const LEVEL_NAMES = ['Yeni tanışma', 'Tanıdık', 'Arkadaş', 'Yakın', 'Özel', 'Ruh eşi'];
  function level(c) {
    const pts = S().affinity[c.id] || 0;
    let lv = 1;
    LEVELS.forEach((t, i) => { if (pts >= t) lv = i + 1; });
    const next = LEVELS[lv] ?? null;
    return { lv, pts, name: LEVEL_NAMES[lv - 1], next, prev: LEVELS[lv - 1] };
  }

  /* ---------- Kalıp seçimi (yakın zamanda kullanılanı tekrar etme) ---------- */
  function pick(c, pool) {
    const recent = S().recent[c.id] || [];
    const fresh = pool.filter(l => !recent.includes(l));
    const line = pickRaw(fresh.length ? fresh : pool);
    S().recent[c.id] = [line, ...recent].slice(0, 14);
    return line;
  }

  /* ---------- Yazım tarzı ---------- */
  const EMOJI_RE = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
  const hasEmoji = s => /\p{Extended_Pictographic}/u.test(s);

  function laugh(c) {
    switch (c.style.laugh) {
      case 'ahah': return 'ahah' + 'ah'.repeat(Math.floor(rand(0, 3)));
      case 'keysmash': {
        const L = 'ASDJSKFHSJGKS';
        let s = '';
        const n = Math.floor(rand(6, 11));
        for (let i = 0; i < n; i++) s += L[Math.floor(Math.random() * L.length)];
        return s;
      }
      case 'hihi': return 'hihi';
      case 'hh': return 'hh';
      default: return '😊';
    }
  }

  function hitap(c) {
    const lists = c.hitap || [];
    const list = lists[Math.min(level(c).lv - 1, lists.length - 1)] || [];
    if (!list.length || Math.random() < 0.4) return '';
    return ' ' + pickRaw(list);
  }

  function fill(c, s, extra = {}) {
    const name = extra.name || S().user.name || '';
    const likes = [...(c.likes || [])].sort(() => Math.random() - 0.5);
    return s
      .replace(/\{h\}/g, () => hitap(c))
      .replace(/\{name\}/g, name)
      .replace(/\{self\}/g, c.name)
      .replace(/\{age\}/g, c.age)
      .replace(/\{city_at\}/g, c.cityAt || c.city)
      .replace(/\{city\}/g, c.city)
      .replace(/\{district\}/g, c.district)
      .replace(/\{fav\}/g, c.fav || c.city)
      .replace(/\{job_is\}/g, c.jobIs || c.job)
      .replace(/\{doing\}/g, () => pickRaw(c.doing || ['takılıyorum']))
      .replace(/\{like\}/g, likes[0] || '')
      .replace(/\{like2\}/g, likes[1] || '')
      .replace(/\{laugh\}/g, () => laugh(c))
      .replace(/\{x\} m[ıi](?=[\s?!.,]|$)/g, () => `{x} ${Amor.Memory.soru(extra.x || '')}`)
      .replace(/\{x\}/g, extra.x || '')
      .replace(/\{cause\}/g, extra.cause || '')
      .replace(/\s+([,.!?])/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function stylize(c, part, mods, grp, isLast) {
    let s = part;
    if (mods.flat) {
      s = s.replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim() || 'hm';
    }
    // Bilerek BÜYÜK yazılmış kısımlara dokunma
    if (!/\p{Lu}{4,}/u.test(s) && Math.random() < c.style.lowercase) s = s.toLocaleLowerCase('tr');
    // Düzgün yazan kişilikler (soğuk, olgun) ortak cümlelerde de büyük harfle başlar
    else if (c.style.lowercase < 0.3) s = s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
    if ((grp === 'pos' || grp === 'neu') && Math.random() < c.style.elongate) {
      s = s.replace(/([aeıioöuüm])(\s*)$/i, (m, ch, sp) => ch.repeat(Math.floor(rand(3, 5))) + sp);
    }
    // Kişilik havuzu (js/kume.js): cümle sonu ekleri, kişiliğin emojileri; küme emojisi önce gelir
    const P = Amor.Kume && Amor.Kume.persona(c.archetype);
    if (isLast && P && !mods.flat) s = Amor.Kume.tails(P, s);
    if (isLast && !hasEmoji(s)) {
      const k = mods.kume;
      if (k && (k.emojis || []).length && mods.emoji > 0 && Math.random() < (k.emojiChance ?? 0.5)) s += ' ' + pickRaw(k.emojis);
      else if (Math.random() < (P && P.emojiRate != null ? P.emojiRate : c.style.emojiRate) * mods.emoji) {
        s += ' ' + pickRaw(P && P.emojis && P.emojis.length ? P.emojis : c.style.emojis);
      }
    }
    return s;
  }

  /* ---------- Beklenen cevap (karakter soru sorduysa) ---------- */
  function expectFrom(parts, intent) {
    const t = fold(parts.join(' '));
    const asksBack = /sen\s*\?/.test(t);
    if (/adin ne/.test(t) || (intent === 'ask_name' && asksBack)) return 'name';
    if (/kac yasindasin/.test(t) || (intent === 'ask_age' && asksBack)) return 'age';
    if (/nerelisin/.test(t) || (intent === 'ask_city' && asksBack)) return 'city';
    return null;
  }

  // Cevabın kendisini cümleye almak için: "Tarkan tabii ki!" -> "Tarkan tabii ki"
  const captureAnswer = raw => raw.trim().replace(/[.!?…]+$/, '').split(/\s+/).slice(0, 5).join(' ');

  function applyExpect(c, d, raw) {
    const exp = S().expect[c.id];
    S().expect[c.id] = null;
    if (!exp) return d;

    // Karakterin kendi sorusu ("kedi mi köpek mi?") -> soru bankasındaki tepki
    if (exp.startsWith('q:')) {
      const Q = Amor.QUESTIONS[exp.slice(2)];
      const ok = ['fallback', 'agree', 'disagree', 'answer_good', 'answer_bad', 'question', 'laugh'];
      if (!Q || !ok.includes(d.intent)) return d;
      const f = ' ' + fold(raw).replace(/[^\p{L}\p{N}\s]/gu, ' ');
      const hit = (Q.answers || []).find(a => a.m.some(w => f.includes(' ' + w)));
      if (hit) return { ...d, intent: 'react_q', qLine: pickRaw(hit.r), x: captureAnswer(raw) };
      // "ok", "hmm" gibi kuru bir cevap soruya cevap sayılmaz
      const n = norm(raw);
      if (n.length <= 3 || Amor.DRY.includes(n)) return d;
      if (Q.any) return { ...d, intent: 'react_q', qLine: pickRaw(Q.any), x: captureAnswer(raw) };
      return d;
    }

    if (!['fallback', 'question', 'answer_good', 'greet'].includes(d.intent)) return d;
    const words = raw.trim().split(/\s+/);
    if (exp === 'name' && words.length <= 2 && /^\p{L}{2,15}$/u.test(words[words.length - 1])) {
      return { ...d, intent: 'tell_name', name: cap(words[words.length - 1].toLocaleLowerCase('tr')) };
    }
    const num = raw.match(/\b(1[5-9]|[2-9]\d)\b/);
    if (exp === 'age' && num) return { ...d, intent: 'react_age', x: num[1] };
    if (exp === 'city' && words.length <= 3 && d.intent === 'fallback') return { ...d, intent: 'react_city', x: cap(words[0].toLocaleLowerCase('tr')) };
    return d;
  }

  /* ---------- Yansıtma (js/reflect.js) ----------
   * "bugün sinemaya gittim" -> "aa bugün sinemaya gittin mi, anlat bakalım" */
  const REFLECT_ON = ['fallback', 'answer_good', 'answer_bad', 'agree', 'laugh'];
  function reflectLine(c, raw, intent) {
    if (!Amor.Reflect || !REFLECT_ON.includes(intent)) return null;
    const r = Amor.Reflect.analyze(raw);
    if (!r) return null;
    const s = window.Amor?.NLU ? Amor.NLU.sentiment(raw) : 0;
    const tone = r.tone || (intent === 'answer_bad' || s < -0.25 ? 'bad' : intent === 'answer_good' || s > 0.25 ? 'good' : null);
    const L = Amor.REFLECT_LINES || {};
    const pool = (tone && L[`${r.tense}_${tone}`]) || L[`${r.tense}_any`];
    return pool ? fill(c, pick(c, pool), { x: r.x }) : null;
  }

  /* ---------- Yakınlığa göre havuz ----------
   * Lv.3+ iken "_close" havuzu varsa onu kullanır (daha sıcak, romantik).
   * Normal hali "daha yeni tanışıyoruz" gibi yakınlıkla çelişen niyetlerde her zaman, diğerlerinde %75. */
  const ALWAYS_CLOSE = ['flirt', 'kiss', 'hug', 'meet'];
  function linePool(c, intent) {
    const close = c.lines[intent + '_close'];
    if (close && level(c).lv >= 3 && (ALWAYS_CLOSE.includes(intent) || Math.random() < 0.75)) return close;
    return c.lines[intent] || c.lines.fallback;
  }

  /* ---------- Ana fonksiyon ---------- */
  // messages: karakterin henüz cevaplamadığı kullanıcı mesajları
  // opts.back: karakter çevrimdışıydı, şimdi dönüyor (geç cevap sitemi yok)
  function respond(c, messages, opts = {}) {
    // En öncelikli niyeti seç
    const rank = i => i === 'tell_name' ? -1 : i === 'question' ? 998 : i === 'fallback' ? 999 : ORDER.indexOf(i);
    let best = null;
    messages.forEach(m => {
      const d = detect(m);
      if (!best || rank(d.intent) < rank(best.intent)) best = d;
    });
    const first = detect(messages[0]);
    best.greet = best.greet || (best.intent !== 'greet' && first.intent === 'greet');
    // Konuşma kümesi fonksiyonunun girdileri o kümeyi tetikler ("iyi akşamlar" → Selamlaşma):
    // mesaj anlaşılmadıysa ya da girdi, niyeti bulan kelimeden daha özelse ("iyi akşamlar" > "^iyi")
    const fi = Amor.Kume && Amor.Kume.fnIntent(messages.join(' '));
    if (fi && fi.id !== best.intent && !['tell_name'].includes(best.intent) &&
        (['fallback', 'question'].includes(best.intent) || norm(fi.kw).length > norm(String(best.word || '').replace(/^\^/, '')).length)) {
      best = { ...best, intent: fi.id };
    }
    // Hafıza: mesajlardan bilgi çıkar (şehir, iş, olay...)
    const newFacts = Amor.Memory.learn(c, messages, best.intent);
    best = applyExpect(c, best, messages[messages.length - 1]);

    if (best.intent === 'tell_name' && best.name) S().user.name = best.name;
    if (best.intent === 'react_city') Amor.Memory.remember(c, 'city', best.x);
    if (best.intent === 'react_age') Amor.Memory.remember(c, 'age', Number(best.x));

    // İlgi: kuru / tekrar / aceleci mesajlar düşürür, merak ve özen artırır
    const repeated = Amor.Interest.isRepeat(c, messages);
    Amor.Interest.evaluate(c, messages, best, { repeated, answeredQ: best.intent === 'react_q', newFacts });
    const interest = Amor.Interest.get(c);

    // Ruh hali + yakınlık etkisi
    const eff = Amor.INTENT_EFFECTS[best.intent] || {};
    const E = c.big5.E;
    const sent = window.Amor?.NLU ? Amor.NLU.sentiment(messages.join(' ')) : 0;
    Amor.Mood.nudge(c, {
      valence: ((eff.valence || 0) + sent * 0.05) * (best.intent === 'insult' ? (0.6 + c.big5.N) : 1),
      arousal: eff.arousal || 0,
      energy: -0.004 * messages.length,
      social: -(0.015 + (1 - E) * 0.025) * messages.length
    });
    S().affinity[c.id] = Math.max(0, (S().affinity[c.id] || 0) + (eff.aff ?? 1));

    const mood = Amor.Mood.current(c);
    const mods = Amor.Mood.modifiers(mood.values);
    const grp = Amor.Mood.group(mods.label);

    // Sosyal pil bitti -> sohbetten çık
    if (mood.values.social < 0.12 && !Amor.Schedule.status(c).forced) { // zorla çevrimiçiyken sohbetten çıkmaz
      const line = pick(c, c.mood.leave || Amor.SHARED.leave);
      return finish(c, [fill(c, line)], mods, grp, { leave: true });
    }

    const plan = Amor.Schedule.status(c);
    const casual = ['fallback', 'agree', 'answer_good', 'laugh', 'question', 'disagree'];
    let line, extra = { name: best.name, x: best.x }, askId = null, rf = null;

    // Küme sistemi (js/kume.js): bir senaryoya girildiyse ya da süren senaryoda bağlantı tuttuysa cevap oradan gelir;
    // sevmediği kümeye girmez (reddeder). Ruh hali kötüyse küme yine ilerler, cevapta ruh hali cümleleri kullanılır.
    const text = messages.join(' ');
    const kt = Amor.Kume ? Amor.Kume.turn(c, text) : null;
    let kumeState = null;

    const badMood = grp === 'neg' || grp === 'sad' || grp === 'low';
    if (repeated && Math.random() < 0.7) {
      line = pick(c, Amor.SHARED.repeat);
    } else if (kt && (!badMood || kt.refused)) {
      // Küme cevabı, karakterin önceki sorusuna verilen cevap tepkisinden de önce gelir (senaryo akışı bölünmesin)
      line = pick(c, kt.pool);
      if (kt.love && kt.love.length && Math.random() < 0.7) line += '|' + pick(c, kt.love); // sevdiği küme
      if (kt.word) extra.x = kt.word; // {w}: bağlantıyı tetikleyen kelime
      line = line.replace(/\{w\}/g, '{x}');
      kumeState = kt.state;
    } else if (best.intent === 'react_q') {
      line = best.qLine;
    } else if (best.intent === 'ask_call' && Amor.Call) {
      line = Amor.Call.permit(c, messages.join(' '));
    } else if (best.intent === 'ask_memory') {
      line = Amor.Memory.summary(c).join('|');
    } else if (best.intent.startsWith('react_')) {
      line = pick(c, Amor.SHARED[best.intent]);
    } else if (interest < 0.3 && casual.includes(best.intent)) {
      // sıkıldı: tek kelimelik cevaplar
      line = pick(c, Amor.SHARED.bored);
    } else if (badMood) {
      const bank = c.mood[grp] || {};
      const pool = bank[best.intent] || (best.intent === 'insult' ? c.lines.insult : null) || bank.any || Amor.SHARED[grp];
      line = pick(c, pool);
      // Güvendiği biriyse kötü ruh halinin sebebini ima edebilir
      if (best.intent === 'how_are_you' && mood.cause && level(c).lv >= 3) {
        line += '|' + pick(c, Amor.SHARED.cause);
        extra.cause = mood.cause;
      }
    } else {
      // Konuşma kümesinin fonksiyonu: mesaj bir girdiye uyarsa o çıktının cümleleri ("iyi akşamlar" → akşam selamı)
      const fn = Amor.Kume && Amor.Kume.intentPool(best.intent, text);
      line = pick(c, fn || linePool(c, best.intent));
      // Cümledeki fiili onaylayarak cevap ver
      rf = !repeated && reflectLine(c, messages[messages.length - 1], best.intent);
      if (rf) {
        if (best.intent === 'fallback') { if (Math.random() < 0.85) line = rf; }
        else if (Math.random() < 0.55) line = rf + '|' + line;
      }
      if (best.greet && best.intent !== 'greet' && c.lines.greet) {
        line = pick(c, c.lines.greet).split('|')[0] + '|' + line;
      }
    }

    // Yeni öğrendiği bilgiye tepki ("İzmir mi? hep merak etmişimdir")
    // Küme cevabı verildiyse onu ezmez (hafıza yine öğrenir, sonra hatırlar)
    if (newFacts.length && !kumeState && !(kt && kt.refused) && best.intent !== 'insult' && grp !== 'neg' && !repeated) {
      const fr = Amor.Memory.reaction(c, newFacts[0]);
      if (fr) {
        if (casual.includes(best.intent) || best.intent === 'answer_bad') line = rf && newFacts[0].type === 'event' ? rf + '|' + fr : fr; // olayda önce onay, sonra tepki (şehir/zevk tepkisi zaten yansıtır)
        else if (best.intent === 'greet') line = line.split('|')[0] + '|' + fr; // önce selam, sonra tepki
        else line = fr + '|' + line;
      }
    }

    let parts = line.split('|').map(p => fill(c, p, extra)).filter(Boolean);
    const P = Amor.Kume && Amor.Kume.persona(c.archetype); // kişilik havuzu: en fazla balon
    parts = parts.slice(0, Math.min(Math.max(mods.maxParts, newFacts.length ? 2 : 1), P && P.max ? Math.max(P.max, newFacts.length ? 2 : 1) : 9));

    const good = grp === 'pos' || grp === 'neu';
    // Selamlaşınca: zamanı gelen olayı sor ya da eski bir bilgiyi hatırla
    if (good && interest >= 0.3 && (['greet', 'how_are_you', 'morning'].includes(best.intent) || best.greet)) {
      const fu = Amor.Memory.followup(c);
      const cb = fu ? null : (Math.random() < 0.5 ? Amor.Memory.callback(c) : null);
      if (fu) { parts.push(fill(c, fu.line)); askId = fu.qid; }
      else if (cb) parts.push(fill(c, cb));
    }

    // Yakınsa (Lv.3+) ve keyfi yerindeyse arada tatlı bir cümle ekler
    const noAsk = ['bye', 'night', 'insult', 'tell_name', 'ask_call'].includes(best.intent) || plan.state === 'busy';
    let sweetened = false;
    if (good && !noAsk && !repeated && c.sweet?.length && level(c).lv >= 3 && interest >= 0.5 &&
        Math.random() < 0.12 + 0.05 * (level(c).lv - 3)) {
      parts.push(fill(c, pick(c, c.sweet)));
      sweetened = true;
    }

    // İyi ruh halinde, ilgiliyse ve dışa dönükse soru sorarak sohbeti sürdür
    if (good && !noAsk && !sweetened && !kumeState && !(kt && kt.refused) && !parts.join(' ').includes('?') &&
        Math.random() < E * 0.35 * mods.askBack * (0.4 + interest) && c.questions?.length) {
      const q = pick(c, c.questions);
      parts.push(fill(c, q.q || q));
      if (q.id) askId = q.id;
    }

    // Meşgulse (derste, nöbette...) bir kere söyler, kısa yazar
    if (plan.state === 'busy') {
      parts = parts.slice(0, 1);
      if (S().busyNote?.[c.id] !== plan.key) {
        S().busyNote = S().busyNote || {};
        S().busyNote[c.id] = plan.key;
        parts.unshift(pick(c, Amor.SHARED.busy).replace('{busy}', plan.say));
      }
    }

    return finish(c, parts, kumeState ? { ...mods, kume: kumeState } : mods, grp, { askId }, best.intent);
  }

  function finish(c, rawParts, mods, grp, flags, intent) {
    // Kişilik havuzu: ifade tercihleri / yazım alışkanlıkları ("iyiyim > iyidir ya"), yazım tarzından önce
    const P = Amor.Kume && Amor.Kume.persona(c.archetype);
    if (P) rawParts = rawParts.map(p => Amor.Kume.habits(P, p));
    const parts = rawParts.map((p, i) => stylize(c, p, mods, grp, i === rawParts.length - 1));
    S().expect[c.id] = flags.askId ? 'q:' + flags.askId : expectFrom(rawParts, intent);
    delete flags.askId;
    const delays = parts.map((p, i) => {
      let ms = (p.length / c.style.cps) * 1000 / mods.speed;
      ms = Math.max(600, Math.min(3500, ms));
      if (i === 0) ms += rand(400, 1400) + mods.extraDelay * 1000;
      return Math.round(ms);
    });
    Amor.Store.save();
    return { parts, delays, mood: mods.label, ...flags };
  }

  // Karakterin kendiliğinden attığı mesaj; hafızasında sorulacak bir şey varsa onu sorar
  function opener(c) {
    const mods = Amor.Mood.modifiers(Amor.Mood.current(c).values);
    const fu = Amor.Memory.followup(c);
    const cb = fu ? null : (Math.random() < 0.4 ? Amor.Memory.callback(c) : null);
    let parts, askId = null;
    if (fu || cb) {
      parts = [fill(c, pick(c, c.lines.greet).split('|')[0]), fill(c, fu ? fu.line : cb)];
      askId = fu ? fu.qid : null;
    } else {
      parts = pick(c, linePool(c, 'opener')).split('|').map(p => fill(c, p));
    }
    return finish(c, parts, mods, 'pos', { askId }, 'opener');
  }

  // Çevrimdışıyken gelen mesajlara geri dönüş (reason: 'sleep' uyuyordu, diğer: meşgul/yorgun)
  function comeBack(c, messages, reason) {
    const r = respond(c, messages, { back: true });
    if (r.leave) return r;
    const pool = reason === 'sleep' ? Amor.SHARED.back_sleep : Amor.SHARED.back;
    r.parts.unshift(stylize(c, fill(c, pick(c, pool)), Amor.Mood.modifiers(Amor.Mood.current(c).values), 'neu', false));
    r.delays.unshift(1200);
    return r;
  }

  /* Zorla çevrimiçi yapılınca ilk mesajı. reason: 'sleep' | 'busy' | 'tired' */
  function wake(c, reason) {
    const mods = Amor.Mood.modifiers(Amor.Mood.current(c).values);
    const line = pick(c, Amor.SHARED['forced_' + reason] || Amor.SHARED.back);
    return finish(c, line.split('|').map(p => fill(c, p)), mods, 'neu', {}, 'wake');
  }

  /* ---------- Hediyeden yakınlık ----------
   * Gönderildiği an eklenir (çevrimdışıyken de). Değerin kareköküyle artar:
   * 10 coin ≈ +2°C, 150 ≈ +5, 1000 ≈ +12, 10k ≈ +34. Hediye seven arketipte daha fazla. */
  function giftAffinity(c, value) {
    const gain = Math.round((Math.sqrt(value) / 3 + 1) * (Amor.GIFT_LOVE[c.archetype] ?? 1));
    S().affinity[c.id] = (S().affinity[c.id] || 0) + gain;
    return gain;
  }

  /* ---------- Hediye tepkisi ----------
   * r: Wallet.sendGift sonucu { delivered, qty, value, rel } */
  function giftReact(c, r) {
    const love = Amor.GIFT_LOVE[c.archetype] ?? 1;
    const v = r.value;
    // Değer büyüdükçe etki artar ama logaritmik (10 coin ≈ küçük, 100k ≈ çok büyük)
    Amor.Mood.nudge(c, {
      valence: Math.min(0.6, (0.04 + Math.log10(v + 1) * 0.07) * love),
      arousal: v >= 3000 ? 0.15 : 0.04,
      social: Math.min(0.4, 0.05 + Math.log10(v + 1) * 0.05)
    });
    Amor.Interest.add(c, Math.min(0.1, Math.log10(v + 1) * 0.02 * love));

    const mood = Amor.Mood.current(c);
    const mods = Amor.Mood.modifiers(mood.values);
    const grp = Amor.Mood.group(mods.label);
    const tier = v < 300 ? 'small' : v < 3000 ? 'mid' : 'big';
    const giftName = r.qty > 1 ? `${r.qty} ${r.delivered.name.toLocaleLowerCase('tr')}` : r.delivered.name.toLocaleLowerCase('tr');
    const pool = (c.giftLines && c.giftLines[tier]) || ['teşekkürler {gift}'];
    let parts = pick(c, pool).split('|').map(p => fill(c, p).replace(/\{gift\}/g, giftName));
    if (r.rel) parts.push(r.rel.line);
    // Gerginken bile hediye kabul edilir ama tarzı soğuk kalır
    if (grp !== 'neg') mods.maxParts = Math.max(mods.maxParts, parts.length);
    return finish(c, parts.slice(0, Math.max(mods.maxParts, r.rel ? 2 : 1)), mods, grp === 'neg' ? 'neg' : 'pos', {}, 'gift');
  }

  // Önizleme için: kaydetmeden, ruh hali değiştirmeden örnek cümle
  function sample(c, intent) {
    const line = pickRaw(c.lines[intent] || c.lines.fallback);
    return line.split('|').map(p => fill(c, p)).join(' ');
  }

  return { detect, respond, opener, comeBack, wake, giftReact, giftAffinity, level, norm, sample, applyDialog, LEVELS };
})();
