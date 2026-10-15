// js/chat.js - The chat: bubbles, seen, presence, reactions, quoted replies, photos and stickers.
// Classic script (not a module): index.html loads all js/*.js in order and they share one global scope,
// exactly like the single <script> they were split from.

// ---------------- Messages ----------------
// Clock: the server may run on a virtual clock (admin "+1 day"); line the browser up with it.
let clockSkew = 0;
const nowMs = () => Date.now() + clockSkew;

const msgBox = $("#messages");
const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const dayKey = ts => new Date(ts * 1000).toDateString();
function dayLabel(ts) {
    const d = new Date(ts * 1000), today = new Date(nowMs()), y = new Date(nowMs()); y.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Bugün";
    if (d.toDateString() === y.toDateString()) return "Dün";
    return d.toLocaleDateString("tr-TR", { month: "long", day: "numeric" });
}
function scrollBottom() { msgBox.scrollTop = msgBox.scrollHeight; }

// Your bubbles share one gradient the height of the chat window: each bubble shows the slice of it
// that's behind it (--gy), so colours follow the bubble's place on screen and shift while scrolling.
let paintQueued = false;
function paintBubbles() {
    if (paintQueued) return;
    paintQueued = true;
    requestAnimationFrame(() => {
        paintQueued = false;
        const box = msgBox.getBoundingClientRect();
        if (!box.height) return;
        msgBox.style.setProperty("--gh", box.height + "px");
        $$(".msg.mine", msgBox).forEach(b => {
            const top = b.getBoundingClientRect().top - box.top;
            if (top > -400 && top < box.height + 400) b.style.setProperty("--gy", -top + "px");
        });
    });
}
msgBox.addEventListener("scroll", paintBubbles, { passive: true });
window.addEventListener("resize", paintBubbles);
new MutationObserver(paintBubbles).observe(msgBox, { childList: true, subtree: true });

const EMOJI_ONLY_RE = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u;
// conversation starters shown in an empty chat; clicking one puts it in the input box
const ICEBREAKERS = [
    "selam 👋", "merhaba! günün nasıl geçiyor?", "önemli soru: kahve mi çay mı?", "şu an ne yapıyorsun?",
    "son zamanlarda güzel bir film izledin mi?", "profilinde {city} yazıyor, neresi?", "en son tekrar tekrar dinlediğin şarkı ne?",
    "kedi mi köpek mi?", "dürüst ol, her zamanki kahve siparişin ne?", "hafta sonu planın var mı?",
];
function pickIcebreakers(n) {
    const pool = [...ICEBREAKERS];
    const out = [pool.shift()];  // always offer a plain "hey"
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    const city = ((state.persona && state.persona.city) || "").toLocaleLowerCase("tr");
    return out.map(t => t.replace("{city}", city));
}

const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];
const herName = () => (state.persona ? state.persona.name : "Gracie");

function quoteHTML(m) {
    const meta = m.meta || {};
    if (meta.story) {
        return `<div class="msg-quote story-quote">${meta.story.photo
            ? `<img src="${esc(meta.story.photo)}" alt="">` : `<span class="sq-swatch"></span>`}
            <div><b>${m.role === "user" ? "Hikayesine yanıt verdin" : "Hikaye"}</b><span>${esc(meta.story.text)}</span></div></div>`;
    }
    if (meta.post) {
        return `<div class="msg-quote story-quote"><img src="${esc(meta.post.url)}" alt="">
            <div><b>${m.role === "user" ? "Gönderisine yorum yaptın" : "Gönderi"}</b><span>${esc(meta.post.caption || "fotoğraf")}</span></div></div>`;
    }
    if (meta.note) {
        return `<div class="msg-quote"><b>${m.role === "user" ? "Notuna yanıt verdin" : "Not"}</b><span>${esc(meta.note.text)}</span></div>`;
    }
    if (meta.reply_to) {
        const who = meta.reply_to.role === "user" ? "Sen" : herName();
        return `<div class="msg-quote" data-jump="${meta.reply_to.id}"><b>${esc(who)}</b><span>${esc(meta.reply_to.text)}</span></div>`;
    }
    return "";
}
function reactionHTML(m) {
    const rx = (m.meta || {}).reactions || {};
    // on her bubbles you see YOUR reaction, on yours you see HERS
    const e = m.role === "user" ? rx.saneme : rx.user;
    return e ? `<span class="msg-reaction" title="${m.role === "user" ? herName() + " tepki verdi" : "Tepki verdin"}">${e}</span>` : "";
}
function bubbleHTML(m, animate) {
    const mine = m.role === "user", meta = m.meta || {};
    if (meta.photo) {
        return `<div class="msg ${mine ? "mine" : "theirs"} photo-msg ${animate ? "msg-pop-in" : ""}" data-photo-url="${esc(meta.photo.url)}" title="${esc(meta.photo.caption || "")}"><img src="${esc(meta.photo.url)}" alt="photo">${m.text ? `<span class="msg-text">${esc(m.text)}</span>` : ""}${reactionHTML(m)}</div>`;
    }
    if (meta.sticker) {
        return `<div class="msg ${mine ? "mine" : "theirs"} sticker-msg ${animate ? "msg-pop-in" : ""}" title="${esc(meta.sticker.label)}"><span class="stk">${esc(meta.sticker.emoji)}</span><span class="stk-l">${esc(meta.sticker.label)}</span>${reactionHTML(m)}</div>`;
    }
    if (meta.shared) {
        // a post you sent her: the post as a card (opens the post), your message under it
        const sh = meta.shared, owner = charById(sh.cid), who = esc((sh.name || "").toLowerCase());
        return `<div class="msg ${mine ? "mine" : "theirs"} shared-msg ${animate ? "msg-pop-in" : ""}">
            <div class="sh-card" data-pm-open="${esc(sh.cid + "/" + sh.photo)}" title="${esc(sh.name)} gönderisini aç">
                <div class="sh-head"><img src="${esc(owner && owner.photo || sh.url)}" alt=""><b>${who}</b></div>
                <img class="sh-photo" src="${esc(sh.url)}" alt="" loading="lazy">
                ${sh.caption ? `<div class="sh-cap"><b>${who}</b> ${esc(sh.caption)}</div>` : ""}
            </div>${m.text ? `<span class="msg-text sh-text">${langify(esc(m.text))}</span>` : ""}${reactionHTML(m)}</div>`;
    }
    if (meta.deleted) {
        return `<div class="msg ${mine ? "mine" : "theirs"} deleted ${animate ? "deleting" : ""}"><span class="del-ghost"></span><span class="del-txt">🚫 Bu mesaj silindi</span></div>`;
    }
    const shortEmoji = EMOJI_ONLY_RE.test(m.text.trim()) && [...m.text.trim()].length <= 6;
    const emojiOnly = shortEmoji && !quoteHTML(m);
    const bigEmoji = shortEmoji && !emojiOnly;  // e.g. a ❤️ sent as a story reaction: big, under the quote
    return `<div class="msg ${mine ? "mine" : "theirs"} ${animate ? "msg-pop-in" : ""} ${emojiOnly ? "emoji-only" : ""} ${bigEmoji ? "big-emoji" : ""}">${quoteHTML(m)}<span class="msg-text">${langify(esc(m.text))}</span>${reactionHTML(m)}</div>`;
}

let lastRendered = null;
function appendMessage(m, animate) {
    $(".chat-empty", msgBox)?.remove();
    const typing = $("#typingRow");
    if (!lastRendered || dayKey(lastRendered.ts) !== dayKey(m.ts)) {
        const sep = document.createElement("div");
        sep.className = "day-sep"; sep.textContent = dayLabel(m.ts);
        msgBox.insertBefore(sep, typing);
    }
    const mine = m.role === "user", deleted = (m.meta || {}).deleted;
    const wrap = document.createElement("div");
    wrap.className = `msg-wrap ${mine ? "mine" : "theirs"}` + (lastRendered && lastRendered.role !== m.role ? " gap" : "") + (animate ? " slide-in" : "");
    wrap.dataset.id = m.id;
    wrap.innerHTML = `<div class="msg-row">${bubbleHTML(m, animate)}
            ${deleted ? "" : `<button class="msg-act" data-reply="${m.id}" title="Yanıtla">↩</button>`}
            ${deleted || !(m.text || "").trim() || (m.meta || {}).sticker ? "" : `<button class="msg-act" data-edit="${m.id}" title="Düzenle">✏️</button>`}
            ${deleted ? "" : `<button class="msg-act" data-setfx="${m.id}" title="Efekt">✨</button>`}
            <button class="msg-act" data-del="${m.id}" title="Sil">🗑</button></div>
        <div class="msg-time">${fmtTime(m.ts)}${(m.meta || {}).edited ? " · düzenlendi" : ""}${mine ? `<span class="msg-tick ${m.meta && m.meta.read_at ? "read" : ""}">${m.meta && m.meta.read_at ? "✓✓" : "✓"}</span>` : ""}</div>`;
    msgBox.insertBefore(wrap, typing);
    lastRendered = m;
    applyFx($(".msg", wrap), m, animate);  // ✨ / emoji effects (js/effects.js)
    renderSidebar();
    if (animate && deleted) {
        // it shows up like a normal bubble for a moment... then she deletes it
        setTimeout(() => $(".msg", wrap)?.classList.remove("deleting"), 1300);
    }
    scrollBottom();
}
function renderAll() {
    msgBox.innerHTML = ""; lastRendered = null;
    // older messages have no read_at: if she replied after them, she saw them by then
    let nextHer = null;
    for (let i = state.messages.length - 1; i >= 0; i--) {
        const m = state.messages[i];
        if (m.role === "saneme") nextHer = m;
        else if (nextHer && !(m.meta && m.meta.read_at)) m.meta = { ...(m.meta || {}), read_at: nextHer.ts };
    }
    if (!state.messages.length) {
        msgBox.innerHTML = `<div class="chat-empty">
            <div class="es-icon">👋</div>
            <div class="es-title">${esc(herName())} ile merhabalaş</div>
            <div>Eşleştiniz ama henüz kimse yazmadı. Bir açılış cümlesi ister misin?</div>
            <div class="icebreakers">${pickIcebreakers(4).map((t, i) =>
                `<button class="icebreaker" style="animation-delay:${0.05 + i * 0.06}s" data-ice="${esc(t)}">${esc(t)}</button>`).join("")}</div>
        </div>`;
        $$("[data-ice]", msgBox).forEach(b => b.addEventListener("click", () => {
            input.value = b.dataset.ice;
            input.dispatchEvent(new Event("input"));
            input.focus();
        }));
    }
    state.messages.forEach(m => appendMessage(m, false));
    updateSeen();
    updatePresence();
}
const findMsg = id => state.messages.find(m => m.id === +id);

// "Seen 14:32" under your last message once she has read it (Instagram style)
function updateSeen() {
    const last = state.messages[state.messages.length - 1];
    const wrap = last && last.role === "user" && last.meta && last.meta.read_at && $(`.msg-wrap[data-id="${last.id}"]`, msgBox);
    const text = wrap ? `Görüldü ${fmtTime(last.meta.read_at)}` : "";
    // keep a label that's already right, so it fades in once instead of on every refresh
    $$(".seen-label", msgBox).forEach(e => { if (!(wrap && e.parentNode === wrap && e.textContent === text)) e.remove(); });
    if (!wrap || $(".seen-label", wrap)) return;
    const s = document.createElement("div");
    s.className = "seen-label"; s.textContent = text;
    wrap.appendChild(s);
    renderSidebar();
}
function markAllRead(readAt) {
    const at = readAt || nowMs() / 1000;
    state.messages.forEach(m => { if (m.role === "user" && !(m.meta && m.meta.read_at)) m.meta = { ...(m.meta || {}), read_at: at }; });
    $$(".msg-tick:not(.read)", msgBox).forEach(t => {
        t.classList.add("read", "tick-ping"); t.textContent = "✓✓";
        setTimeout(() => t.classList.remove("tick-ping"), 600);
    });
    updateSeen();
}
function refreshBubble(m) {
    const wrap = $(`.msg-wrap[data-id="${m.id}"]`, msgBox);
    if (!wrap) return;
    const old = $(".msg", wrap);
    old.outerHTML = bubbleHTML(m, false);
    applyFx($(".msg", wrap), m, false);
    const rxEl = $(".msg-reaction", wrap);
    if (rxEl) { rxEl.classList.add("pop"); }
    renderSidebar();
}

// Presence (light version until the Presence Engine exists): online while she's active,
// otherwise "active 23m ago" with a grey dot
let typingNow = false;
function updatePresence() {
    if (typingNow) return;
    const el = $("#chatStatus"), dot = $(".chat-header .avatar .dot");
    const lastHer = [...state.messages].reverse().find(m => m.role === "saneme");
    const mins = lastHer ? (nowMs() / 1000 - lastHer.ts) / 60 : Infinity;
    const online = mins < 6 || busyChats.has(state.cid);
    dot.className = "dot " + (online ? "ok" : "off");
    // not around: what she's doing (asleep, in class... from Amor's schedule), otherwise when she was last active
    const busy = presenceText(charById(state.cid));
    el.textContent = online ? "çevrimiçi" : busy ? busy : !isFinite(mins) ? "çevrimdışı"
        : mins < 60 ? `${Math.max(1, Math.round(mins))} dk önce aktifti`
        : mins < 1440 ? `${Math.round(mins / 60)} sa önce aktifti` : `${Math.round(mins / 1440)} gün önce aktifti`;
    renderSidebar();
}
setInterval(updatePresence, 30000);

function setStatus(mode) {
    typingNow = mode === "typing";
    const el = $("#chatStatus");
    el.classList.toggle("typing", typingNow);
    $(".chat-header .avatar").classList.toggle("typing", typingNow);
    if (typingNow) {
        $(".chat-header .avatar .dot").className = "dot ok";
        el.innerHTML = `<span class="pen">✍️</span>yazıyor<span class="typing-dots"><span></span><span></span><span></span></span>`;
    } else updatePresence();
    let row = $("#typingRow");
    if (typingNow && !row) {
        row = document.createElement("div");
        row.id = "typingRow"; row.className = "msg-wrap theirs gap";
        row.innerHTML = `<div class="msg theirs typing-bubble"><span></span><span></span><span></span></div>`;
        msgBox.appendChild(row); scrollBottom();
    } else if (!typingNow && row) row.remove();
    renderSidebar();
}
function sysNote(text) {
    const n = document.createElement("div");
    n.className = "sys-note"; n.textContent = text;
    msgBox.insertBefore(n, $("#typingRow")); scrollBottom();
}

// ---------------- Reactions (double-click / long-press a bubble) ----------------
const picker = document.createElement("div");
picker.className = "rx-picker hidden";
picker.innerHTML = REACTIONS.map(e => `<button data-rx="${e}">${e}</button>`).join("");
document.body.appendChild(picker);
let pickerFor = null;
function openPicker(wrap) {
    const m = findMsg(wrap.dataset.id);
    if (!m || (m.meta && m.meta.deleted) || m.role === "user") return;  // you react to HER bubbles
    pickerFor = m;
    const r = $(".msg", wrap).getBoundingClientRect();
    picker.classList.remove("hidden");
    picker.style.left = Math.min(window.innerWidth - picker.offsetWidth - 8, Math.max(8, r.left)) + "px";
    picker.style.top = Math.max(8, r.top - picker.offsetHeight - 8) + "px";
    $$("[data-rx]", picker).forEach(b => b.classList.toggle("on", ((m.meta || {}).reactions || {}).user === b.dataset.rx));
}
const closePicker = () => { picker.classList.add("hidden"); pickerFor = null; };
picker.addEventListener("click", async e => {
    const b = e.target.closest("[data-rx]");
    if (!b || !pickerFor) return;
    const m = pickerFor, cur = ((m.meta || {}).reactions || {}).user;
    closePicker();
    try {
        const r = await api(chatUrl(`/messages/${m.id}/react`), { method: "POST", body: { emoji: cur === b.dataset.rx ? null : b.dataset.rx } });
        m.meta = r.meta;
        refreshBubble(m);
        sfx("react");
    } catch (ex) { toast(ex.message); }
});
document.addEventListener("pointerdown", e => { if (!picker.contains(e.target) && !e.target.closest(".msg")) closePicker(); });
msgBox.addEventListener("dblclick", e => {
    const wrap = e.target.closest(".msg-wrap[data-id]");
    if (wrap && e.target.closest(".msg")) { e.preventDefault(); window.getSelection()?.removeAllRanges(); openPicker(wrap); }
});
let pressT = null;
msgBox.addEventListener("touchstart", e => {
    const wrap = e.target.closest(".msg-wrap[data-id]");
    // long press on a phone: one menu with reactions, reply, edit, effect and delete (js/effects.js)
    if (wrap && e.target.closest(".msg")) pressT = setTimeout(() => { const m = findMsg(wrap.dataset.id); if (m) { buzz(12); msgSheet(m); } }, 480);
}, { passive: true });
["touchend", "touchmove", "touchcancel"].forEach(ev => msgBox.addEventListener(ev, () => clearTimeout(pressT), { passive: true }));

// ---------------- Quoted replies (↩ button, or swipe a bubble right on a phone) ----------------
function setReplyTo(m, story) {
    state.replyTo = m || null; state.replyStory = story || null;
    const bar = $("#replyBar");
    if (!m && !story) { bar.classList.add("hidden"); return; }
    $("#replyWho").textContent = story ? `${herName()} kişisinin ${story.kind === "note" ? "notuna" : "hikayesine"} yanıt veriyorsun` : `${m.role === "user" ? "Kendine" : herName()} yanıt veriyorsun`;
    $("#replyText").textContent = story ? story.text : m.text;
    bar.classList.remove("hidden");
    input.focus();
}
$("#replyCancel").addEventListener("click", () => setReplyTo(null));
msgBox.addEventListener("click", e => {
    const r = e.target.closest("[data-reply]");
    if (r) { setReplyTo(findMsg(r.dataset.reply)); return; }
    const j = e.target.closest("[data-jump]");
    if (j) {
        const t = $(`.msg-wrap[data-id="${j.dataset.jump}"]`, msgBox);
        if (t) { t.scrollIntoView({ behavior: "smooth", block: "center" }); t.classList.remove("flash"); void t.offsetWidth; t.classList.add("flash"); }
    }
});
let swipe = null;
msgBox.addEventListener("touchstart", e => {
    const wrap = e.target.closest(".msg-wrap[data-id]");
    if (wrap) swipe = { wrap, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0 };
}, { passive: true });
msgBox.addEventListener("touchmove", e => {
    if (!swipe) return;
    swipe.dx = e.touches[0].clientX - swipe.x;
    if (Math.abs(e.touches[0].clientY - swipe.y) > 30) { swipe.wrap.style.transform = ""; swipe = null; return; }
    if (swipe.dx > 0) swipe.wrap.style.transform = `translateX(${Math.min(70, swipe.dx)}px)`;
}, { passive: true });
msgBox.addEventListener("touchend", () => {
    if (!swipe) return;
    swipe.wrap.style.transform = "";
    if (swipe.dx > 60) { const m = findMsg(swipe.wrap.dataset.id); if (m && !(m.meta || {}).deleted) setReplyTo(m); }
    swipe = null;
});

// ---------------- Photos in the chat + stickers ----------------
msgBox.addEventListener("click", e => {
    const ph = e.target.closest("[data-photo-url]");
    if (!ph) return;
    const all = $$("[data-photo-url]", msgBox).map(el => ({ url: el.dataset.photoUrl, caption: el.title }));
    openLightbox(all, Math.max(0, all.findIndex(x => x.url === ph.dataset.photoUrl)));
});
let STICKERS = null;
async function toggleStickers(open) {
    const panel = $("#stkPanel");
    open = open ?? panel.classList.contains("hidden");
    if (open && !STICKERS) {
        try { STICKERS = (await api("/api/stickers")).stickers; } catch (e) { toast(e.message); return; }
        panel.innerHTML = STICKERS.map(s => `<button type="button" data-stk="${esc(s.id)}" title="${esc(s.label)}"><span>${esc(s.emoji)}</span><span>${esc(s.label)}</span></button>`).join("");
    }
    panel.classList.toggle("hidden", !open);
    $("#stkBtn").classList.toggle("on", open);
}
$("#stkBtn").addEventListener("click", () => toggleStickers());
$("#stkPanel").addEventListener("click", async e => {
    const b = e.target.closest("[data-stk]");
    if (!b) return;
    toggleStickers(false);
    const s = STICKERS.find(x => x.id === b.dataset.stk);
    try { await sendMessage(s.emoji, { sticker: s.id }); } catch (ex) { sysNote("Gönderilemedi: " + ex.message); }
});
