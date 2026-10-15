// js/bonds.js - "Bağların": how close you are with everyone you talk to (Amor closeness levels 1-6).
//   🪐 map:  you in the middle, six rings around you; the closer she is, the inner her ring. Her avatar carries her
//           mood ring and online dot; tapping her opens a card (level, progress, last message, chat / profile).
//   ☰ list: everyone you talk to, closest first, with a progress bar to the next level.
// The faces you haven't talked to yet are listed under it ("Yeni yüzler", characters.js renderMatches).
// Classic script (not a module): index.html loads all js/*.js in order and they share one global scope.

const BOND_LEVELS = ["Yeni tanışma", "Tanıdık", "Arkadaş", "Yakın", "Özel", "Ruh eşi"];
const BOND_ICONS = ["🌱", "🙂", "🤝", "💛", "💖", "💞"];
let bondMode = (() => { try { return localStorage.getItem("gracie_bonds_mode") || "map"; } catch (e) { return "map"; } })();
let bondSel = null;

const bondOf = c => c.bond || { lv: c.level || 1, name: BOND_LEVELS[(c.level || 1) - 1], pts: 0, prev: 0, next: null };
const talked = () => (state.characters || []).filter(c => c.last)
    .sort((a, b) => (bondOf(b).lv - bondOf(a).lv) || (bondOf(b).pts - bondOf(a).pts) || ((b.last ? b.last.ts : 0) - (a.last ? a.last.ts : 0)));
const bondProgress = b => b.next == null ? 1 : Math.max(0, Math.min(1, (b.pts - b.prev) / Math.max(1, b.next - b.prev)));
const moodName = c => { const l = c.mood && window.Amor && Amor.Mood && Amor.Mood.LABELS[c.mood]; return l ? `${l.emoji} ${l.name}` : ""; };

function renderBonds() {
    const box = $("#bonds"), people = talked();
    $$("[data-bmode]").forEach(b => b.classList.toggle("on", b.dataset.bmode === bondMode));
    if (!people.length) {
        box.innerHTML = `<div class="bond-empty"><div class="be-ic">🪐</div><b>Henüz kimseyle bağın yok</b>
            <span>Seni beğenenlerden ya da Keşfet'ten birine merhaba de. Konuştukça burada sana doğru yaklaşır.</span></div>`;
        return;
    }
    if (!bondSel || !people.some(c => c.id === bondSel)) bondSel = people[0].id;
    box.innerHTML = bondMode === "list" ? bondListHTML(people) : bondMapHTML(people) + `<div class="bond-card" id="bondCard"></div>`;
    if (bondMode === "map") renderBondCard();
}

// ---------------- 🪐 map ----------------
function bondMapHTML(people) {
    const radius = lv => 13 + (6 - lv) * 6.6;  // % of the map: Ruh eşi 13% ... Yeni tanışma 46%
    const rings = BOND_LEVELS.map((name, i) => {
        const lv = i + 1, r = radius(lv), n = people.filter(c => bondOf(c).lv === lv).length;
        return `<div class="b-ring ${n ? "has" : ""}" style="--r:${r}%"><span class="b-ring-l">${BOND_ICONS[i]} ${name}${n ? ` · ${n}` : ""}</span></div>`;
    }).join("");
    const byLv = {};
    people.forEach(c => (byLv[bondOf(c).lv] = byLv[bondOf(c).lv] || []).push(c));
    const dots = Object.entries(byLv).map(([lv, list]) => list.map((c, i) => {
        const r = radius(+lv), a = (i / list.length) * Math.PI * 2 + (+lv) * 0.9 - Math.PI / 2;
        const x = 50 + Math.cos(a) * r, y = 50 + Math.sin(a) * r, size = 34 + (+lv) * 4;
        const on = c.last && (nowMs() / 1000 - c.last.ts) < 360;
        return `<button class="b-dot mood-${esc(c.mood || "neutral")} ${c.id === bondSel ? "sel" : ""}" data-bond="${esc(c.id)}" title="${esc(c.name)} · ${esc(bondOf(c).name)}"
            style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;--s:${size}px;--d:${(i * 0.37 + +lv * 0.21).toFixed(2)}s">
            <img src="${esc(c.photo || "icon.png")}" alt="">${on ? `<i class="b-on"></i>` : ""}</button>`;
    }).join("")).join("");
    const me = state.profile ? `<span class="b-me">${AV.svg(state.profile.appearance)}</span>` : "";
    return `<div class="bond-map">${rings}<div class="b-center">${me}</div>${dots}</div>`;
}
function renderBondCard() {
    const c = charById(bondSel), el = $("#bondCard");
    if (!c || !el) return;
    const b = bondOf(c), p = bondProgress(b), pres = c.presence && c.presence.kind !== "free" ? c.presence.text : "";
    el.innerHTML = `<img src="${esc(c.photo || "icon.png")}" alt="" class="mood-${esc(c.mood || "neutral")}">
        <div class="bc-main"><div class="bc-top"><b>${esc(c.name)}</b><span class="bc-lv">${BOND_ICONS[b.lv - 1]} ${esc(b.name)}</span></div>
            <div class="bc-bar"><i style="width:${Math.round(p * 100)}%"></i></div>
            <small>${b.next == null ? "En yakın seviyedesiniz 💞" : `Sonraki: ${BOND_ICONS[b.lv]} ${esc(BOND_LEVELS[b.lv])}`}${moodName(c) ? " · " + moodName(c) : ""}${pres ? " · " + esc(pres) : ""}</small>
            ${c.last ? `<p class="bc-last">${c.last.role === "user" ? "Sen: " : ""}${esc((c.last.text || "📷").slice(0, 90))}</p>` : ""}</div>
        <div class="bc-acts"><button class="btn small" data-chat="${esc(c.id)}">Sohbet</button><button class="btn ghost small" data-her="${esc(c.id)}">Profil</button></div>`;
    el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
}

// ---------------- ☰ list ----------------
function bondListHTML(people) {
    let lastLv = null;
    return `<div class="bond-list">${people.map(c => {
        const b = bondOf(c), head = b.lv !== lastLv ? `<div class="bl-h">${BOND_ICONS[b.lv - 1]} ${esc(b.name)}</div>` : "";
        lastLv = b.lv;
        const pres = c.presence && c.presence.kind !== "free" ? c.presence.text : "";
        return `${head}<div class="bl-row" data-chat="${esc(c.id)}">
            <span class="bl-av mood-${esc(c.mood || "neutral")}"><img src="${esc(c.photo || "icon.png")}" alt=""></span>
            <span class="bl-main"><b>${esc(c.name)}</b><span class="bc-bar"><i style="width:${Math.round(bondProgress(b) * 100)}%"></i></span>
                <small>${c.last ? `${c.last.role === "user" ? "Sen: " : ""}${esc((c.last.text || "📷").slice(0, 60))}` : ""}${pres ? " · " + esc(pres) : ""}</small></span>
            <span class="bl-mood" title="${esc(moodName(c))}">${esc(moodName(c).split(" ")[0] || "")}</span></div>`;
    }).join("")}</div>`;
}

// ---------------- a new bond: she noticed you (one by one over days, js/local/openers.js) ----------------
const seenBondsKey = () => `gracie_seen_bonds:${state.profile ? state.profile.id : ""}`;
let bondCheckBusy = false;
async function checkNewBonds() {
    if (!state.profile || bondCheckBusy) return;
    bondCheckBusy = true;
    try {
        const s = await api("/api/state");
        if (!state.profile || !s.profile || s.profile.id !== state.profile.id) return;
        const byId = {};
        s.characters.forEach(c => byId[c.id] = c);
        (state.characters || []).forEach(c => { if (byId[c.id]) c.matched_at = byId[c.id].matched_at; });
        const matched = s.characters.filter(c => c.matched_at).map(c => c.id);
        let seen = null;
        try { seen = JSON.parse(localStorage.getItem(seenBondsKey())); } catch (e) {}
        try { localStorage.setItem(seenBondsKey(), JSON.stringify(matched)); } catch (e) {}
        if (!Array.isArray(seen)) return;  // first look on this device: old bonds come without fanfare
        // only the ones who liked you (a chat you started is a bond too, but you know about that one)
        const news = matched.filter(id => !seen.includes(id) && !byId[id].last);
        // back after a while: a couple of hearts, the rest in one line (no parade of popups)
        news.slice(0, 2).forEach((id, i) => setTimeout(() => { const c = charById(id); if (c) bondHeart(c); }, i * 4500));
        if (news.length > 2) setTimeout(() => toast(`💙 ${news.length - 2} kişi daha seni beğendi · Bağların'a bak`), 9200);
        if (news.length) { loadActivity(); if (!$("#view-matches").classList.contains("hidden")) renderMatches(); }
    } catch (e) {} finally { bondCheckBusy = false; }
}
function bondHeart(c) {
    $$(".first-move").forEach(x => x.remove());
    const el = document.createElement("div");
    el.className = "first-move bond-new";
    el.innerHTML = `<span class="heart"><svg viewBox="0 0 100 96"><path d="M50 94C17 70 0 50 0 29A27 27 0 0 1 50 14 27 27 0 0 1 100 29C100 50 83 70 50 94Z" fill="none" stroke="#00aff0" stroke-width="7"/></svg>
        <img src="${esc(c.photo || "icon.png")}" alt=""></span><span><b>${esc(c.name)} seni beğendi 💙</b><small>Artık bağlısınız · merhaba demek için dokun</small></span>`;
    document.body.appendChild(el);
    if (typeof sfx === "function") sfx("level");
    if (typeof buzz === "function") buzz([30, 70, 30]);
    if (typeof blueHearts === "function") blueHearts(10);
    const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 360); };
    el.addEventListener("click", () => { close(); openChat(c.id); });
    setTimeout(close, 7000);
}
setInterval(checkNewBonds, 20000);

// ---------------- events ----------------
$("#bondToggle").addEventListener("click", e => {
    const b = e.target.closest("[data-bmode]");
    if (!b) return;
    bondMode = b.dataset.bmode;
    try { localStorage.setItem("gracie_bonds_mode", bondMode); } catch (ex) {}
    renderBonds();
});
$("#bonds").addEventListener("click", e => {
    const d = e.target.closest("[data-bond]");
    if (!d) return;
    bondSel = d.dataset.bond;
    $$(".b-dot", $("#bonds")).forEach(x => x.classList.toggle("sel", x.dataset.bond === bondSel));
    renderBondCard();
});
