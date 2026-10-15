// js/chattools.js - Amor Stories in the DMs: write her side, edit / delete bubbles, reply mode (Amor / bot rules / off),
// 🪄 add-ons, several chats with the same character, and the chat look (Amor's backgrounds and bubbles, js/data/themes.js).
// Classic script (not a module): index.html loads all js/*.js in order and they share one global scope.

const TH = window.Stories && Stories.Themes || { backgrounds: [], bubbles: [], presets: [] };
const GRACIE_BG = { id: "gracie", label: "Gracie" }, PHOTO_BG = { id: "photo", label: "Onun fotoğrafı" }, GRACIE_BUBBLE = { id: "gracie", label: "Gracie" };
const BGS = [GRACIE_BG, PHOTO_BG, ...TH.backgrounds], BUBBLES = [GRACIE_BUBBLE, ...TH.bubbles];
const MODE_INFO = {
    amor: { icon: "🤖", label: "Amor (otomatik)", d: "Kendi ruh hali, hafızası ve kişiliğiyle kendisi cevap verir." },
    bot: { icon: "📜", label: "Bot kuralları", d: "Senin yazdığın kurallarla cevap verir (bot-editoru.bat)." },
    off: { icon: "✋", label: "Kapalı", d: "Cevap vermez; onun mesajlarını sen yazarsın." },
};
state.side = "me";
state.editing = null;

// ---------------- A sheet (bottom on phones, centered on a computer) ----------------
function openSheet(html, cls = "") {
    const el = document.createElement("div");
    el.className = "g-sheet";
    el.innerHTML = `<div class="g-panel ${cls}" role="dialog"><div class="g-grip"></div>${html}</div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    const close = () => { el.classList.remove("show"); setTimeout(() => el.remove(), 220); };
    el.addEventListener("click", e => { if (e.target === el || e.target.closest("[data-sheet-close]")) close(); });
    return { el, close };
}
document.addEventListener("keydown", e => { if (e.key === "Escape") $$(".g-sheet").forEach(s => s.remove()); });

// ---------------- Header + composer reflect the chat's settings ----------------
function renderChatTools() {
    const c = charById(state.cid);
    if (!c) return;
    const mode = MODE_INFO[c.mode || "amor"];
    $("#chatMenuBtn").textContent = mode.icon;
    $("#chatMenuBtn").title = `Cevap modu: ${mode.label}${c.addons ? " · 🪄 ekler açık" : ""}`;
    $("#chatMenuBtn").classList.toggle("active", c.mode !== "off");
    // who you're writing as
    const her = state.side === "her";
    $("#sideBtn").innerHTML = her ? (c.photo ? `<img src="${esc(c.photo)}" alt="">` : esc(c.name[0])) : "🙋";
    $("#sideBtn").title = her ? `${c.name} olarak yazıyorsun (dokun: kendin olarak yaz)` : `Kendin olarak yazıyorsun (dokun: ${c.name} olarak yaz)`;
    $("#sendForm").classList.toggle("as-her", her);
    $("#msgInput").placeholder = state.editing ? "Mesajı düzenle…" : her ? `${c.name} olarak yaz…` : `${c.name} kişisine mesaj yaz…`;
    // the chat's name when there are several
    $$("[data-persona-meta]").forEach(e => e.textContent = `${c.age} · ${c.city}` + (c.threadTitle && (c.threads > 1 || c.thread > 1) ? ` · ${c.threadTitle}` : ""));
    applyTheme();
    moodRing();
}
$("#sideBtn").addEventListener("click", () => {
    state.side = state.side === "her" ? "me" : "her";
    renderChatTools();
    input.focus();
});

// ---------------- Her side, written by you ----------------
async function sendAsHer(text) {
    const body = { text }, effect = takeNextFx();
    if (effect) body.effect = effect;
    if (state.replyTo) body.reply_to = state.replyTo.id;
    input.value = ""; input.style.height = "auto";
    setReplyTo(null);
    try {
        const r = await api(chatUrl("/messages/her"), { method: "POST", body });
        for (const m of r.messages) { state.messages.push(m); appendMessage(m, true); }
        touchCurrentChat();
        sfx("send");
    } catch (ex) { sysNote("Gönderilemedi: " + ex.message); input.value = text; }
}

// ---------------- Edit / delete a bubble (yours or hers) ----------------
function startEdit(m) {
    state.editing = m;
    state.replyTo = null; state.replyStory = null;
    $("#replyWho").textContent = m.role === "user" ? "Mesajını düzenliyorsun" : `${herName()} mesajını düzenliyorsun`;
    $("#replyText").textContent = m.text;
    $("#replyBar").classList.remove("hidden");
    input.value = m.text;
    input.dispatchEvent(new Event("input"));
    input.focus();
    renderChatTools();
}
function stopEdit() {
    if (!state.editing) return;
    state.editing = null;
    input.value = ""; input.style.height = "auto";
    $("#replyBar").classList.add("hidden");
    renderChatTools();
}
async function saveEdit(text) {
    const m = state.editing;
    try {
        const saved = await api(chatUrl(`/messages/${m.id}`), { method: "PUT", body: { text } });
        Object.assign(findMsg(m.id) || m, saved);
        stopEdit();
        renderAll(); touchCurrentChat();
    } catch (ex) { toast(ex.message); }
}
$("#replyCancel").addEventListener("click", stopEdit);
input.addEventListener("keydown", e => { if (e.key === "Escape") stopEdit(); });
msgBox.addEventListener("click", async e => {
    const ed = e.target.closest("[data-edit]");
    if (ed) { const m = findMsg(ed.dataset.edit); if (m) startEdit(m); return; }
    const del = e.target.closest("[data-del]");
    if (!del) return;
    const m = findMsg(del.dataset.del);
    if (!m || !confirm("Bu mesaj silinsin mi?")) return;
    try { await api(chatUrl(`/messages/${m.id}`), { method: "DELETE" }); } catch (ex) { toast(ex.message); return; }
    state.messages = state.messages.filter(x => x.id !== m.id);
    if (state.editing && state.editing.id === m.id) stopEdit();
    renderAll(); touchCurrentChat();
});

// ---------------- Chat menu: reply mode, add-ons, chats with her ----------------
async function chatMenu() {
    const c = charById(state.cid);
    if (!c) return;
    let threads = { current: 1, threads: [] };
    try { threads = await api(chatUrl("/threads")); } catch (e) {}
    const sh = openSheet(`
        <div class="g-head"><b>${esc(c.name)} · sohbet ayarları</b><button class="icon-btn" data-sheet-close>✕</button></div>
        <div class="g-label">Cevap modu</div>
        ${Object.entries(MODE_INFO).map(([id, x]) => `<button class="g-opt ${(c.mode || "amor") === id ? "on" : ""}" data-mode="${id}">
            <span class="ic">${x.icon}</span><span><b>${x.label}</b><small>${x.d}</small></span></button>`).join("")}
        <div class="g-label">Ekler</div>
        <button class="g-opt ${c.addons ? "on" : ""}" data-addons><span class="ic">🪄</span><span><b>Otomatik ekler ${c.addons ? "açık" : "kapalı"}</b>
            <small>Onun mesajında bir kelime ya da fiil geçince başına/sonuna ek ya da ayrı mesaj ekler (bot-editoru.bat → Ekler).</small></span></button>
        <div class="g-label">${esc(c.name)} ile sohbetler</div>
        ${threads.threads.map(t => `<div class="g-thread ${t.n === threads.current ? "on" : ""}">
            <button class="g-opt" data-th-open="${t.n}"><span class="ic">${t.n === threads.current ? "💬" : "🗂️"}</span>
                <span><b>${esc(t.title)}</b><small>${t.count} mesaj${t.last ? " · " + esc(t.last.text.slice(0, 40)) : ""}</small></span></button>
            <button class="icon-btn" data-th-rename="${t.n}" title="Adını değiştir">✏️</button>
            ${threads.threads.length > 1 ? `<button class="icon-btn" data-th-del="${t.n}" title="Bu sohbeti sil">🗑</button>` : ""}</div>`).join("")}
        <button class="g-opt" data-th-new><span class="ic">➕</span><span><b>Yeni sohbet</b><small>Aynı karakterle sıfırdan bir sohbet; eskisi burada kalır.</small></span></button>
        <div class="g-label">Efektler</div>
        <button class="g-opt" data-keywords><span class="ic">🔑</span><span><b>Anahtar kelimeler</b>
            <small>Kelimeleri say ve efekt bağla ("seni seviyorum" → kalpler, "doğum günün kutlu olsun" → konfeti).</small></span></button>
        <button class="g-opt" data-emojis><span class="ic">😊</span><span><b>Emoji kısayolları ve efektleri</b>
            <small>💧 ıslatır, 🔥 yakar, ❄️ dondurur… Mesaj kutusunun üstündeki emojiler.</small></span></button>
        <div class="g-label">Kaydet</div>
        <button class="g-opt" data-export><span class="ic">💾</span><span><b>Bu sohbeti JSON olarak indir</b>
            <small>Karakterin bilgileri ve tüm mesajlar okunur bir dosyada (başka uygulamalarda / yapay zekalarda kullanmak için).</small></span></button>`);
    sh.el.addEventListener("click", async e => {
        const mode = e.target.closest("[data-mode]");
        if (mode) {
            await api(chatUrl("/mode"), { method: "POST", body: { mode: mode.dataset.mode } });
            c.mode = mode.dataset.mode;
            sh.close(); renderChatTools();
            toast(`Cevap modu: ${MODE_INFO[c.mode].label}`);
            const last = state.messages[state.messages.length - 1];
            if (c.mode !== "off" && last && last.role === "user") scheduleReply(c.id, 800);
            return;
        }
        if (e.target.closest("[data-addons]")) {
            await api(chatUrl("/addons"), { method: "POST", body: { on: !c.addons } });
            c.addons = !c.addons;
            sh.close(); renderChatTools();
            toast(c.addons ? "🪄 Otomatik ekler açık" : "🪄 Otomatik ekler kapalı");
            return;
        }
        if (e.target.closest("[data-export]")) { sh.close(); await exportChat(c.id); return; }
        if (e.target.closest("[data-keywords]")) { sh.close(); keywordSheet(); return; }
        if (e.target.closest("[data-emojis]")) { sh.close(); emojiSheet(); return; }
        const open = e.target.closest("[data-th-open]");
        if (open) { sh.close(); await switchThread(+open.dataset.thOpen); return; }
        const ren = e.target.closest("[data-th-rename]");
        if (ren) {
            const t = threads.threads.find(x => x.n === +ren.dataset.thRename);
            const title = prompt("Sohbetin adı:", t ? t.title : "");
            if (title == null) return;
            await api(chatUrl(`/threads/${ren.dataset.thRename}`), { method: "PUT", body: { title } });
            sh.close(); await refreshThreadInfo(); chatMenu();
            return;
        }
        const del = e.target.closest("[data-th-del]");
        if (del) {
            const t = threads.threads.find(x => x.n === +del.dataset.thDel);
            if (!confirm(`"${t ? t.title : "Sohbet"}" ve içindeki tüm mesajlar silinsin mi?`)) return;
            await api(chatUrl(`/threads/${del.dataset.thDel}`), { method: "DELETE" });
            sh.close(); await reopenChat();
            return;
        }
        if (e.target.closest("[data-th-new]")) {
            const title = prompt("Yeni sohbetin adı (boş bırakabilirsin):", "");
            if (title == null) return;
            await api(chatUrl("/threads"), { method: "POST", body: { title } });
            sh.close(); await reopenChat();
            toast("Yeni sohbet açıldı");
        }
    });
}
$("#chatMenuBtn").addEventListener("click", chatMenu);
async function switchThread(n) {
    await api(chatUrl(`/threads/${n}/open`), { method: "POST" });
    await reopenChat();
}
// the open chat changed under the same character: reload its messages and the list row
async function reopenChat() {
    stopEdit(); setReplyTo(null);
    await refreshThreadInfo();
    await openChat(state.cid, { reload: true });
}
async function refreshThreadInfo() {
    const c = charById(state.cid);
    if (!c) return;
    try {
        const r = await api(chatUrl("/threads"));
        const cur = r.threads.find(t => t.n === r.current);
        c.thread = r.current; c.threads = r.threads.length; c.threadTitle = cur ? cur.title : "";
        c.last = cur && cur.last ? { ...cur.last, ts: cur.ts } : null;
    } catch (e) {}
    renderSidebar();
}

// ---------------- Chat look (Amor's backgrounds and bubbles) ----------------
const themeClassList = [...BGS, ...BUBBLES].map(x => x.cls).filter(Boolean);
function charGradient(c) {
    const col = c.colors && c.colors.length ? c.colors : ["#7fd4f7", "#0089c4"];
    return `linear-gradient(135deg, ${col[0]}, ${col[1] || col[0]})`;
}
function applyTheme() {
    const c = charById(state.cid), t = (c && c.theme) || { bg: "gracie", bubble: "gracie" };
    const box = msgBox;
    box.removeAttribute("style");
    box.classList.remove("themed-bg", "themed-bubble", ...themeClassList);
    const bg = BGS.find(b => b.id === t.bg);
    if (bg && bg.id !== "gracie") {
        box.classList.add("themed-bg");
        if (bg.id === "photo" && c) box.style.background = `linear-gradient(rgba(0, 20, 40, .35), rgba(0, 20, 40, .7)), url("${c.cover || c.photo}") center / cover no-repeat`;
        else if (bg.cls) box.classList.add(bg.cls);
        else if (bg.css) box.style.background = bg.css;
    }
    const b = BUBBLES.find(x => x.id === t.bubble);
    if (b && b.id !== "gracie") {
        box.classList.add("themed-bubble");
        if (b.cls) box.classList.add(b.cls);
        const set = (k, v) => { if (v) box.style.setProperty(k, v); };
        set("--me-bg", b.me); set("--me-fg", b.meFg); set("--her-bg", b.her === "char" && c ? charGradient(c) : b.her); set("--her-fg", b.herFg);
        set("--me-border", b.meBorder); set("--her-border", b.herBorder); set("--b-radius", b.radius); set("--b-tail", b.tail);
        set("--b-font", b.font); set("--b-shadow", b.shadow);
    }
    paintBubbles();
}
function bgPreview(b, c) {
    if (b.id === "gracie") return `style="background:var(--white)"`;
    if (b.id === "photo") return `style="background:url('${esc(c.cover || c.photo)}') center / cover"`;
    return b.cls ? `class="${b.cls}"` : `style="background:${b.css}"`;
}
function bubblePreview(b, c) {
    if (b.id === "gracie") return `<span class="tb-me" style="background:var(--accent);color:#fff;border-radius:14px">selam</span><span class="tb-her" style="background:var(--accent-pale);color:var(--ink);border-radius:14px">merhaba</span>`;
    const st = (bg, fg, br) => `background:${bg};color:${fg || "#fff"};${br ? `border:${br};` : ""}border-radius:${b.radius || "14px"};${b.font ? `font-family:${b.font};` : ""}`;
    return `<span class="tb-me" style="${st(b.me, b.meFg, b.meBorder)}">selam</span><span class="tb-her" style="${st(b.her === "char" ? charGradient(c) : b.her, b.herFg, b.herBorder)}">merhaba</span>`;
}
async function setTheme2(c, patch) {
    const t = { bg: "gracie", bubble: "gracie", ...(c.theme || {}), ...patch };
    const r = await api(chatUrl("/theme"), { method: "POST", body: t });
    c.theme = r.theme;
    applyTheme();
}
function themeSheet() {
    const c = charById(state.cid);
    if (!c) return;
    const t = c.theme || { bg: "gracie", bubble: "gracie" };
    const sh = openSheet(`
        <div class="g-head"><b>🎨 Sohbet teması</b><button class="icon-btn" data-sheet-close>✕</button></div>
        ${TH.presets && TH.presets.length ? `<div class="g-label">Hazır temalar</div><div class="t-presets">${TH.presets.map(p => `
            <button class="t-preset" data-preset="${p.id}" title="${esc(p.note || "")}"><span ${bgPreview(BGS.find(b => b.id === p.bg) || GRACIE_BG, c)}></span><b>${p.icon} ${esc(p.label)}</b></button>`).join("")}</div>` : ""}
        <div class="g-label">Arka plan</div>
        <div class="t-grid">${BGS.map(b => `<button class="t-bg ${t.bg === b.id ? "on" : ""}" data-bg="${b.id}"><span ${bgPreview(b, c)}></span><small>${esc(b.label)}</small></button>`).join("")}</div>
        <div class="g-label">Baloncuk</div>
        <div class="t-grid">${BUBBLES.map(b => `<button class="t-bub ${t.bubble === b.id ? "on" : ""}" data-bub="${b.id}"><span class="t-bub-box">${bubblePreview(b, c)}</span><small>${esc(b.label)}</small></button>`).join("")}</div>
        <button class="btn ghost block" data-reset style="margin-top:14px">Gracie görünümüne dön</button>`, "wide");
    sh.el.addEventListener("click", async e => {
        const p = e.target.closest("[data-preset]"), bg = e.target.closest("[data-bg]"), bub = e.target.closest("[data-bub]");
        if (p) { const x = TH.presets.find(q => q.id === p.dataset.preset); await setTheme2(c, { bg: x.bg, bubble: x.bubble }); }
        else if (bg) await setTheme2(c, { bg: bg.dataset.bg });
        else if (bub) await setTheme2(c, { bubble: bub.dataset.bub });
        else if (e.target.closest("[data-reset]")) await setTheme2(c, { bg: "gracie", bubble: "gracie" });
        else return;
        const cur = c.theme || { bg: "gracie", bubble: "gracie" };
        $$("[data-bg]", sh.el).forEach(x => x.classList.toggle("on", x.dataset.bg === cur.bg));
        $$("[data-bub]", sh.el).forEach(x => x.classList.toggle("on", x.dataset.bub === cur.bubble));
    });
}
$("#themeBtn").addEventListener("click", themeSheet);
