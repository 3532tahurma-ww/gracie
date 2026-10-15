// js/backup.js - Saving everything as JSON: a full backup of this device (all accounts, chats, characters,
// relationships, settings) and restoring it; plus one chat as a readable JSON (Settings, and the 🤖 chat menu).
// The file format is described in YEDEK-JSON.md.
// Classic script (not a module): index.html loads all js/*.js in order and they share one global scope.

const BACKUP_SKIP = ["gracie_session"];  // who is logged in stays per device
function downloadJson(name, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const fileSafe = s => String(s || "").toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------------- Full backup ----------------
function backupData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k.startsWith("gracie_") || BACKUP_SKIP.includes(k)) continue;
        const v = localStorage.getItem(k);
        try { data[k] = JSON.parse(v); } catch (e) { data[k] = v; }
    }
    return { app: "gracie", kind: "backup", version: 1, exported_at: new Date().toISOString(), data };
}
function exportBackup() {
    try { downloadJson(`gracie-yedek-${stamp()}.json`, backupData()); toast("Yedek indirildi 💾"); }
    catch (e) { toast("Yedek alınamadı: " + e.message); }
}
async function importBackup(file) {
    let obj;
    try { obj = JSON.parse(await file.text()); } catch (e) { toast("Dosya okunamadı: geçerli bir JSON değil"); return; }
    if (!obj || obj.app !== "gracie" || obj.kind !== "backup" || !obj.data) { toast("Bu bir Gracie yedeği değil"); return; }
    const accounts = Object.values((obj.data.gracie_accounts) || {}).map(a => "@" + a.username).join(", ") || "hesap yok";
    if (!confirm(`Bu yedek geri yüklensin mi?\n\n${obj.exported_at ? obj.exported_at.slice(0, 16).replace("T", " ") : ""} · ${accounts}\n\nBu cihazdaki tüm Gracie verileri yedektekilerle değiştirilir.`)) return;
    const old = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("gracie_") && !BACKUP_SKIP.includes(k)) old.push(k); }
    try {
        old.forEach(k => localStorage.removeItem(k));
        Object.entries(obj.data).forEach(([k, v]) => { if (k.startsWith("gracie_")) localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)); });
    } catch (e) { toast("Geri yüklenemedi: " + e.message); return; }
    localStorage.removeItem("gracie_session");
    location.reload();
}
$("#backupBtn").addEventListener("click", exportBackup);
$("#restoreBtn").addEventListener("click", () => $("#restoreFile").click());
$("#restoreFile").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; if (f) importBackup(f); });

// ---------------- One chat, readable (for other tools / AIs) ----------------
async function exportChat(cid) {
    const c = charById(cid);
    if (!c) return;
    let prof = {}, threads = { current: 1, threads: [] };
    try { prof = await api(`/api/c/${encodeURIComponent(cid)}/profile`); threads = await api(chatUrl("/threads", cid)); } catch (e) {}
    const cur = threads.threads.find(t => t.n === threads.current);
    const who = m => m.role === "user" ? "me" : "her";
    const out = {
        app: "gracie", kind: "chat", version: 1, exported_at: new Date().toISOString(),
        me: { name: state.profile.name, age: state.profile.age },
        character: { id: c.id, name: c.name, age: c.age, city: c.city, occupation: c.occupation, bio: c.bio, personality: c.archetype,
                     interests: prof.interests || [], about: (prof.prompts || []).map(p => ({ q: p.q, a: p.a })) },
        chat: { title: cur ? cur.title : "Sohbet 1", mode: c.mode || "amor", addons: !!c.addons, theme: c.theme || null },
        messages: state.messages.filter(m => !(m.meta || {}).deleted).map(m => {
            const meta = m.meta || {}, x = { from: who(m), text: m.text, time: new Date(m.ts * 1000).toISOString() };
            if (meta.written) x.written_by_me = true;
            if (meta.bot) x.bot_rule = true;
            if (meta.edited) x.edited = true;
            if (meta.reply_to) x.reply_to = { from: meta.reply_to.role === "user" ? "me" : "her", text: meta.reply_to.text };
            if (meta.photo) x.photo = meta.photo.url;
            if (meta.sticker) x.sticker = meta.sticker.label;
            if (meta.story) x.story_reply = meta.story.text;
            if (meta.post) x.post_comment = meta.post.caption || "";
            if (meta.reactions) x.reactions = { me: meta.reactions.user || null, her: meta.reactions.saneme || null };
            return x;
        }),
    };
    downloadJson(`gracie-sohbet-${fileSafe(c.name)}-${fileSafe(out.chat.title)}.json`, out);
    toast("Sohbet indirildi 💾");
}
