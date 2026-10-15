// js/effects.js - Gracie's effects (styles in css/effects.css):
//   ✨ bubble / screen effects and 😊 emoji effects from Amor Stories (js/data/effects.js, js/data/emojis.js),
//   🔑 keywords with a counter and an effect, the emoji shortcut bar, a long-press menu for bubbles on phones,
//   the typing pen, her status and mood ring, level-up card, first-move heart, rising blue hearts 💙,
//   stories that grow from the avatar, feed parallax and the "new stories" pill, sounds and vibration.
// Classic script (not a module): index.html loads all js/*.js in order and they share one global scope.

const FXD = window.Stories && Stories.Effects || { bubble: [], screen: [] };
const EMD = window.Stories && Stories.Emojis || { bar: [], effects: {}, list: [] };
const fxById = id => FXD.bubble.concat(FXD.screen).find(f => f.id === id);
const isScreenFx = id => FXD.screen.some(f => f.id === id);
state.keywords = [];
state.nextFx = null;

// ---------------- Which effect a message has ----------------
const noVs = s => String(s || "").replace(/️/g, "");  // ❤ and ❤️ count the same
const countWord = (text, word) => {
    const t = String(text || "").toLocaleLowerCase("tr"), w = String(word || "").toLocaleLowerCase("tr");
    if (!w) return 0;
    let n = 0, i = 0;
    while ((i = t.indexOf(w, i)) !== -1) { n++; i += w.length; }
    return n;
};
// chosen for the message > from a keyword (hers: her keywords and the general ones; yours: the general ones)
function effectOf(m) {
    const meta = m.meta || {};
    if (meta.deleted || meta.effect === "none") return null;
    if (meta.effect) return fxById(meta.effect) ? meta.effect : null;
    const k = state.keywords.find(x => x.effect && (!x.cid || (x.cid === state.cid && m.role === "saneme")) && countWord(m.text, x.word));
    return k ? k.effect : null;
}
const emojiBar = () => storageList("gracie_emojibar").length ? storageList("gracie_emojibar") : EMD.bar.slice();
const emojiFxMap = () => Object.assign({}, EMD.effects, storageObj("gracie_emojifx"));
function emojiFxOf(text) {
    const t = noVs(text);
    let best = null, at = Infinity;
    Object.entries(emojiFxMap()).forEach(([e, fx]) => {
        if (!fx) return;
        const i = t.indexOf(noVs(e));
        if (i !== -1 && i < at) { at = i; best = fx; }
    });
    return best;
}
// classes on a drawn bubble; animate = it just arrived (play the entrance, rain the screen effect)
function applyFx(el, m, animate) {
    if (!el || !m) return;
    const fx = effectOf(m), efx = (m.meta || {}).effect === "none" ? null : emojiFxOf(m.text);
    if (fx && !isScreenFx(fx)) el.classList.add("fx-" + fx);
    if (efx) el.classList.add("efx", "efx-" + efx);
    if (!animate || !fxOn()) return;
    if (fx && isScreenFx(fx)) fxBurst(fxById(fx).emojis, 26);
    if (fx && !isScreenFx(fx)) { el.classList.remove("play"); void el.offsetWidth; el.classList.add("play"); }
    if (efx) { el.classList.remove("eplay"); void el.offsetWidth; el.classList.add("eplay"); }
    if (noVs(m.text).includes("💙")) blueHearts();
}
msgBox.addEventListener("click", e => {
    const ink = e.target.closest(".msg.fx-ink:not(.shown)");
    if (ink) ink.classList.add("shown");
});

// ---------------- ✨ effect picker (next message, a sent bubble, a keyword) ----------------
function fxPicker(cur, title, cb, allowAuto) {
    const item = f => `<button type="button" data-fx="${f.id}" class="${cur === f.id ? "on" : ""}"><span>${f.icon}</span>${esc(f.label)}</button>`;
    const sh = openSheet(`
        <div class="g-head"><b>✨ ${esc(title)}</b><button class="icon-btn" data-sheet-close>✕</button></div>
        <div class="g-label">Baloncuk efektleri</div><div class="fx-grid">${FXD.bubble.map(item).join("")}</div>
        <div class="g-label">Ekran efektleri</div><div class="fx-grid">${FXD.screen.map(item).join("")}</div>
        <div class="fx-grid" style="margin-top:12px">
            ${allowAuto ? `<button type="button" data-fx="auto" class="${!cur ? "on" : ""}"><span>🔑</span>Otomatik</button>` : ""}
            <button type="button" data-fx="none" class="${cur === "none" || (!allowAuto && !cur) ? "on" : ""}"><span>🚫</span>Efekt yok</button></div>
        ${allowAuto ? `<p class="section-sub" style="margin:10px 2px 0">Otomatik: mesajda efekt bağlı bir anahtar kelime ya da efektli emoji varsa o kullanılır.</p>` : ""}`);
    sh.el.addEventListener("click", e => {
        const b = e.target.closest("[data-fx]");
        if (!b) return;
        sh.close();
        cb(b.dataset.fx);
    });
}
function renderFxBtn() {
    const f = state.nextFx && fxById(state.nextFx);
    $("#fxBtn").classList.toggle("armed", !!f);
    $("#fxBtn").textContent = f ? f.icon : "✨";
    $("#fxBtn").title = f ? `Sonraki mesaj "${f.label}" efektiyle gidecek (dokun: değiştir)` : "Sonraki mesaja efekt ekle";
}
$("#fxBtn").addEventListener("click", () => fxPicker(state.nextFx || "none", "Sonraki mesajın efekti", v => {
    state.nextFx = v === "none" ? null : v;
    renderFxBtn();
    if (state.nextFx && isScreenFx(state.nextFx)) fxBurst(fxById(state.nextFx).emojis, 12);
    input.focus();
}));
// used by the senders (reply.js / chattools.js): the armed effect goes with the next message, then disarms
function takeNextFx() { const f = state.nextFx; state.nextFx = null; renderFxBtn(); return f; }
async function setMessageFx(m) {
    fxPicker((m.meta || {}).effect || "", "Bu mesajın efekti", async v => {
        const effect = v === "auto" ? null : v;
        try { const saved = await api(chatUrl(`/messages/${m.id}/effect`), { method: "PUT", body: { effect } }); m.meta = saved.meta; }
        catch (ex) { toast(ex.message); return; }
        const wrap = $(`.msg-wrap[data-id="${m.id}"]`, msgBox);
        if (wrap) { $(".msg", wrap).outerHTML = bubbleHTML(m, false); applyFx($(".msg", wrap), m, true); }
    }, true);
}
msgBox.addEventListener("click", e => {
    const b = e.target.closest("[data-setfx]");
    if (b) { const m = findMsg(b.dataset.setfx); if (m) setMessageFx(m); }
});

// ---------------- 😊 Emoji shortcuts ----------------
function renderEmojiBar() {
    const map = emojiFxMap();
    $("#emojiBar").innerHTML = emojiBar().map((e, i) => `<button type="button" data-eb="${i}" class="${map[e] ? "has-fx" : ""}" title="${map[e] ? "Efekt: " + esc((EMD.list.find(x => x.id === map[e]) || {}).label || "") : ""}">${e}</button>`).join("")
        + `<button type="button" class="eb-edit" data-eb-edit title="Kısayolları ve emoji efektlerini düzenle">✎</button>`;
}
$("#emojiBar").addEventListener("click", e => {
    if (e.target.closest("[data-eb-edit]")) { emojiSheet(); return; }
    const b = e.target.closest("[data-eb]");
    if (!b) return;
    const emo = emojiBar()[+b.dataset.eb], s = input.selectionStart ?? input.value.length, t = input.selectionEnd ?? s;
    input.value = input.value.slice(0, s) + emo + input.value.slice(t);
    input.selectionStart = input.selectionEnd = s + emo.length;
    input.dispatchEvent(new Event("input"));
    input.focus();
    b.animate && b.animate([{ transform: "scale(1.4)" }, { transform: "scale(1)" }], { duration: 250 });
});
function emojiSheet() {
    const draw = () => {
        const map = emojiFxMap();
        return emojiBar().map((e, i) => `<div class="em-row"><span class="e">${e}</span>
            <select data-emfx="${i}"><option value="">Efekt yok</option>${EMD.list.map(f => `<option value="${f.id}" ${map[e] === f.id ? "selected" : ""}>${f.icon} ${esc(f.label)}</option>`).join("")}</select>
            <button class="icon-btn" data-emdel="${i}" title="Kaldır">✕</button></div>`).join("");
    };
    const sh = openSheet(`
        <div class="g-head"><b>😊 Emoji kısayolları</b><button class="icon-btn" data-sheet-close>✕</button></div>
        <p class="section-sub" style="margin:0 2px 8px">Efektli bir emoji mesajda geçince baloncuk o efekti alır: 💧 ıslanır, 🔥 yanar, ❄️ donar…</p>
        <form class="kw-form" data-emadd><input type="text" placeholder="Emoji ekle (birden fazla da olur)" maxlength="40"><button class="btn small" type="submit">Ekle</button></form>
        <div data-emlist style="margin-top:8px">${draw()}</div>
        <button class="btn ghost block" data-emreset style="margin-top:12px">Varsayılana dön</button>`);
    const list = $("[data-emlist]", sh.el), save = (bar, fx) => { if (bar) storageSave("gracie_emojibar", bar); if (fx) storageSet("gracie_emojifx", fx); list.innerHTML = draw(); renderEmojiBar(); };
    sh.el.addEventListener("change", e => {
        const s = e.target.closest("[data-emfx]");
        if (!s) return;
        const emo = emojiBar()[+s.dataset.emfx], fx = storageObj("gracie_emojifx");
        fx[emo] = s.value;
        save(null, fx);
        if (s.value) { const m = { text: emo, meta: {} }; fxBurst([emo], 8); void m; }
    });
    sh.el.addEventListener("click", e => {
        const d = e.target.closest("[data-emdel]");
        if (d) { const bar = emojiBar(); bar.splice(+d.dataset.emdel, 1); save(bar.length ? bar : [EMD.bar[0]]); return; }
        if (e.target.closest("[data-emreset]")) { try { localStorage.removeItem("gracie_emojibar"); localStorage.removeItem("gracie_emojifx"); } catch (ex) {} list.innerHTML = draw(); renderEmojiBar(); }
    });
    $("[data-emadd]", sh.el).addEventListener("submit", e => {
        e.preventDefault();
        const inp = $("input", e.target), add = [...String(inp.value).matchAll(/\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*/gu)].map(x => x[0]);
        if (!add.length) { toast("Emoji bulunamadı"); return; }
        const bar = emojiBar();
        add.forEach(a => { if (!bar.includes(a)) bar.push(a); });
        inp.value = "";
        save(bar);
    });
}

// ---------------- 🔑 Keywords (counted; an effect on the messages that say them) ----------------
async function loadKeywords() {
    try { state.keywords = (await api("/api/keywords")).keywords; } catch (e) { state.keywords = []; }
}
async function keywordSheet() {
    const c = charById(state.cid);
    if (!c) return;
    await loadKeywords();  // fresh counts
    let scope = c.id;  // c.id = her words, "" = general (everyone's messages)
    const sh = openSheet(`
        <div class="g-head"><b>🔑 Anahtar kelimeler</b><button class="icon-btn" data-sheet-close>✕</button></div>
        <p class="section-sub" style="margin:0 2px 6px">Kelimenin kaç kez geçtiği sayılır. Efekt bağlarsan o kelimenin geçtiği mesajlar efektli görünür ("seni seviyorum" → kalpler).</p>
        <div class="kw-scope"><button data-scope="${esc(c.id)}">${esc(c.name)}</button><button data-scope="">🌐 Genel</button></div>
        <form class="kw-form" data-kwadd><input type="text" maxlength="30"><button class="btn small" type="submit">Ekle</button></form>
        <div data-kwlist style="margin-top:6px"></div>`);
    const draw = () => {
        $$("[data-scope]", sh.el).forEach(b => b.classList.toggle("on", b.dataset.scope === scope));
        $("[data-kwadd] input", sh.el).placeholder = scope ? `${c.name} için kelime (ör. kahve)` : "Herkes için kelime";
        const list = state.keywords.filter(k => (k.cid || "") === scope);
        $("[data-kwlist]", sh.el).innerHTML = list.length ? list.map(k => {
            const f = fxById(k.effect), here = state.messages.reduce((n, m) => n + (!k.cid || m.role === "saneme" ? countWord(m.text, k.word) : 0), 0);
            return `<div class="kw-row"><div class="info"><b>${esc(k.word)}</b>
                <small>${k.cid ? `${esc(c.name)} <b>${k.said}</b> kez söyledi · sohbetlerinizde toplam ${k.inChats}` : `tüm sohbetlerde <b>${k.inChats}</b> kez`} · bu sohbette ${here}</small></div>
                <button class="kw-fx ${f ? "on" : ""}" data-kfx="${k.id}">${f ? `${f.icon} ${esc(f.label)}` : "✨ Efekt"}</button>
                <button class="kw-del" data-kdel="${k.id}" title="Sil">✕</button></div>`;
        }).join("") : `<div class="empty-state" style="padding:16px">Henüz kelime yok</div>`;
    };
    const apply = async (promise) => {
        try { state.keywords = (await promise).keywords; } catch (ex) { toast(ex.message); }
        draw(); renderAll();
    };
    draw();
    sh.el.addEventListener("click", e => {
        const sc = e.target.closest("[data-scope]");
        if (sc) { scope = sc.dataset.scope; draw(); return; }
        const d = e.target.closest("[data-kdel]");
        if (d) { apply(api(`/api/keywords/${d.dataset.kdel}`, { method: "DELETE" })); return; }
        const fb = e.target.closest("[data-kfx]");
        if (fb) {
            const k = state.keywords.find(x => x.id === fb.dataset.kfx);
            fxPicker(k.effect || "none", `"${k.word}" için efekt`, v => {
                apply(api(`/api/keywords/${k.id}`, { method: "PUT", body: { effect: v === "none" ? "" : v } }));
                if (v !== "none" && isScreenFx(v)) fxBurst(fxById(v).emojis, 14);
            });
        }
    });
    $("[data-kwadd]", sh.el).addEventListener("submit", e => {
        e.preventDefault();
        const inp = $("input", e.target), word = inp.value.trim();
        if (!word) return;
        inp.value = "";
        apply(api("/api/keywords", { method: "POST", body: { word, cid: scope || null } }));
    });
}

// ---------------- Long press on a bubble (phones): one menu with everything ----------------
function msgSheet(m) {
    const theirs = m.role !== "user", rx = ((m.meta || {}).reactions || {}).user, deleted = (m.meta || {}).deleted;
    const sh = openSheet(`
        ${theirs && !deleted ? `<div class="msg-sheet-rx">${REACTIONS.map(e => `<button data-rx2="${e}" class="${rx === e ? "on" : ""}">${e}</button>`).join("")}</div>` : ""}
        ${deleted ? "" : `<button class="g-opt" data-a="reply"><span class="ic">↩</span><span><b>Yanıtla</b></span></button>`}
        ${deleted || !(m.text || "").trim() ? "" : `<button class="g-opt" data-a="edit"><span class="ic">✏️</span><span><b>Düzenle</b></span></button>`}
        ${deleted ? "" : `<button class="g-opt" data-a="fx"><span class="ic">✨</span><span><b>Efekt</b></span></button>`}
        <button class="g-opt" data-a="del"><span class="ic">🗑</span><span><b>Sil</b></span></button>`);
    sh.el.addEventListener("click", async e => {
        const r = e.target.closest("[data-rx2]"), a = e.target.closest("[data-a]");
        if (r) {
            sh.close();
            try { const res = await api(chatUrl(`/messages/${m.id}/react`), { method: "POST", body: { emoji: rx === r.dataset.rx2 ? null : r.dataset.rx2 } }); m.meta = res.meta; refreshBubble(m); sfx("react"); }
            catch (ex) { toast(ex.message); }
            return;
        }
        if (!a) return;
        sh.close();
        if (a.dataset.a === "reply") setReplyTo(m);
        if (a.dataset.a === "edit") startEdit(m);
        if (a.dataset.a === "fx") setMessageFx(m);
        if (a.dataset.a === "del") { const b = document.createElement("button"); b.dataset.del = m.id; msgBox.appendChild(b); b.click(); b.remove(); }
    });
}

// ---------------- Her status and mood ----------------
function moodRing() {
    const c = charById(state.cid), head = $("#headAvatar");
    head.className = head.className.replace(/\bmood-\w+/g, "").trim();
    if (c && c.mood && fxOn()) head.classList.add("mood-" + c.mood);
    const lab = c && c.mood && window.Amor && Amor.Mood && Amor.Mood.LABELS[c.mood];
    head.title = lab ? `${lab.emoji} ${lab.name} · profilini gör` : "Profilini gör";
}
function presenceText(c) {
    const p = c && c.presence;
    return p && p.kind !== "free" ? p.text : "";
}
// after her reply: closer? new mood?
function onReplyDone(cid, ev) {
    const c = charById(cid);
    if (!c) return;
    if (ev.mood) c.mood = ev.mood;
    if (ev.presence) c.presence = ev.presence;
    if (ev.level_up) { c.level = ev.level_up.lv; if (cid === state.cid) setTimeout(() => levelUp(c, ev.level_up), 700); }
    if (cid === state.cid) { moodRing(); updatePresence(); }
}
function levelUp(c, lu) {
    const hearts = Array.from({ length: 6 }, (_, i) => `<span class="${i < lu.lv ? "on" : ""} ${i === lu.lv - 1 ? "new" : ""}">💙</span>`).join("");
    const el = document.createElement("div");
    el.className = "lv-card";
    el.innerHTML = `<div class="box"><img src="${esc(c.photo || "icon.png")}" alt=""><div class="k">Yakınlık seviyesi ${lu.lv}</div>
        <div class="n">${esc(lu.name)}</div><div class="t">${esc(c.name)} ile aranız ısınıyor</div><div class="hearts">${hearts}</div></div>`;
    document.body.appendChild(el);
    fxRing(); fxBurst(["💙", "✨", "🩵"], 18); sfx("level"); buzz([30, 60, 30]);
    const close = () => { el.style.transition = "opacity .25s"; el.style.opacity = "0"; setTimeout(() => el.remove(), 260); };
    el.addEventListener("click", close);
    setTimeout(close, 3800);
}

// ---------------- First move: a heart-shaped notification ----------------
document.body.insertAdjacentHTML("beforeend", `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <clipPath id="gracieHeartClip" clipPathUnits="objectBoundingBox"><path d="M.5 .96C.17 .72 0 .52 0 .3A.27 .27 0 0 1 .5 .14 .27 .27 0 0 1 1 .3C1 .52 .83 .72 .5 .96Z"/></clipPath></defs></svg>`);
function firstMoveHeart(c, m) {
    $$(".first-move").forEach(x => x.remove());
    const el = document.createElement("div");
    el.className = "first-move";
    el.innerHTML = `<span class="heart"><svg viewBox="0 0 100 96"><path d="M50 94C17 70 0 50 0 29A27 27 0 0 1 50 14 27 27 0 0 1 100 29C100 50 83 70 50 94Z" fill="none" stroke="#00aff0" stroke-width="7"/></svg>
        <img src="${esc(c.photo || "icon.png")}" alt=""></span><span><b>${esc(c.name)} sana ilk mesajı attı 💙</b><small>${esc((m && m.text) || "")}</small></span>`;
    document.body.appendChild(el);
    sfx("level"); buzz([40, 80, 40]);
    const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 360); };
    el.addEventListener("click", () => { close(); openChat(c.id); });
    setTimeout(close, 6500);
}

// ---------------- 💙 rising blue hearts ----------------
function blueHearts(n = 16) {
    if (!fxOn()) return;
    const layer = document.createElement("div");
    layer.className = "blue-hearts";
    for (let i = 0; i < n; i++) {
        const h = document.createElement("img");
        h.src = "icon.png"; h.alt = "";
        h.style.left = 4 + Math.random() * 90 + "%";
        h.style.width = 22 + Math.random() * 30 + "px";
        h.style.setProperty("--sway", (Math.random() * 60 - 30) + "px");
        h.style.animationDuration = 3 + Math.random() * 2.5 + "s";
        h.style.animationDelay = Math.random() * 1.2 + "s";
        layer.appendChild(h);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 7000);
}

// ---------------- Stories grow from the avatar you tapped, and shrink back into it ----------------
let storyOrigin = null;
document.addEventListener("click", e => {
    const a = e.target.closest("[data-story-of], [data-av-of], #headAvatar, [data-mc-avatar], [data-avatar-open], .conv-av");
    if (!a) return;
    const r = a.getBoundingClientRect();
    storyOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, true);
function storyGrowIn() {
    const v = $("#storyViewer"), card = $(".sv-card", v);
    v.classList.remove("shrink", "grow");
    if (!storyOrigin || !fxOn()) return;
    const r = card.getBoundingClientRect();
    card.style.transformOrigin = `${storyOrigin.x - r.left}px ${storyOrigin.y - r.top}px`;
    void card.offsetWidth;
    v.classList.add("grow");
    setTimeout(() => v.classList.remove("grow"), 420);
}
function storyShrinkOut(done) {
    const v = $("#storyViewer");
    if (!storyOrigin || !fxOn() || !v.classList.contains("show")) { done(); return; }
    v.classList.add("shrink");
    setTimeout(() => { v.classList.remove("shrink"); storyOrigin = null; done(); }, 260);
}

// ---------------- Feed: parallax + "new stories" pill ----------------
let paraQueued = false;
function parallax() {
    if (paraQueued) return;
    paraQueued = true;
    requestAnimationFrame(() => {
        paraQueued = false;
        if (!fxOn()) return;
        const vh = window.innerHeight;
        $$("#feed .fp-photo > img.loaded, .ex-feed.show .fp-photo > img.loaded").forEach(img => {
            const r = img.parentNode.getBoundingClientRect();
            if (r.bottom < -100 || r.top > vh + 100) return;
            const off = (r.top + r.height / 2 - vh / 2) / vh;
            img.style.transform = `translateY(${(off * -22).toFixed(1)}px) scale(1.07)`;
        });
    });
}
$("#view-home").addEventListener("scroll", parallax, { passive: true });
window.addEventListener("scroll", parallax, { passive: true });
let knownStories = null;
function noteNewStories() {
    const ids = new Set((state.storyGroups || []).flatMap(g => g.stories.map(s => s.id)));
    if (knownStories) {
        const fresh = (state.storyGroups || []).filter(g => g.stories.some(s => !knownStories.has(s.id)));
        if (fresh.length) showNewPill(fresh.map(g => g.character));
    }
    knownStories = ids;
}
function showNewPill(people) {
    const home = $("#view-home"), wrap = $(".home-main", home);
    if (!wrap) return;
    $$(".new-pill", wrap).forEach(p => p.remove());
    const scroller = home.scrollTop > 120 ? home : document.scrollingElement;
    if (scroller.scrollTop < 120 && home.scrollTop < 120) return;  // you're at the top: you see them anyway
    const b = document.createElement("button");
    b.className = "new-pill";
    b.innerHTML = `${people.slice(0, 3).map(c => `<img src="${esc(c.photo || "icon.png")}" alt="">`).join("")} Yeni hikayeler ↑`;
    b.addEventListener("click", () => {
        home.scrollTo({ top: 0, behavior: "smooth" }); window.scrollTo({ top: 0, behavior: "smooth" });
        b.remove();
        const strip = $("#homeStories");
        strip.classList.remove("flash"); void strip.offsetWidth; strip.classList.add("flash");
    });
    wrap.prepend(b);
    setTimeout(() => b.remove(), 15000);
}

// ---------------- Sounds and vibration ----------------
// soft tones made with Web Audio (no files): send ↗, like (pop), react (tick), level (three notes)
const SFX = { send: [[660, 0, .07], [990, .06, .09]], like: [[520, 0, .05], [780, .04, .08]], react: [[1200, 0, .05]], level: [[660, 0, .12], [880, .11, .12], [1320, .22, .2]] };
function sfx(kind) {
    if (!NOTIFY.sound || !audioCtx || !SFX[kind]) return;
    try {
        const t = audioCtx.currentTime;
        SFX[kind].forEach(([freq, delay, len]) => {
            const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
            osc.type = "sine"; osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.0001, t + delay);
            gain.gain.exponentialRampToValueAtTime(kind === "react" ? 0.06 : 0.1, t + delay + 0.012);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + len + 0.1);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(t + delay); osc.stop(t + delay + len + 0.15);
        });
    } catch (e) {}
}
const hapticOn = () => { try { return localStorage.getItem("gracie_haptic") !== "0"; } catch (e) { return true; } };
function buzz(pattern = 18) {
    if (!hapticOn() || document.hidden || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (e) {}
}
$("#hapticSwitch").checked = hapticOn();
$("#hapticSwitch").addEventListener("change", e => {
    try { localStorage.setItem("gracie_haptic", e.target.checked ? "1" : "0"); } catch (ex) {}
    if (e.target.checked) buzz(30);
});

renderEmojiBar();
renderFxBtn();
