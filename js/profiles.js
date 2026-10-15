// js/profiles.js - Your saved profile cards.
// Classic script (not a module): index.html loads all js/*.js in order and they share one global scope,
// exactly like the single <script> they were split from.

// ---------------- Saved profiles ----------------
function profileSub(p) {
    const a = p.appearance || {};
    const c = p.message_counts;
    return [`${p.age}`, a.body_type, a.style, c ? `${c.user + c.saneme} mesaj` : null].filter(Boolean).join(" · ");
}
function renderSavedList(el, list, onPick, pickLabel) {
    if (!list.length) { el.innerHTML = `<p class="section-sub" style="margin:0">Henüz kayıtlı profil yok.</p>`; return; }
    el.innerHTML = list.map(p => {
        const isActive = state.profile && p.id === state.profile.id;
        return `<div class="profile-row">
            <div class="p-avatar has-svg">${AV.svg(p.appearance)}</div>
            <div class="p-info">
                <div class="name">${esc(p.name)}${isActive ? `<span class="active-pill">aktif</span>` : ""}</div>
                <div class="sub">${esc(profileSub(p))}</div>
            </div>
            ${isActive ? "" : `<button class="btn ghost small" data-pick="${esc(p.id)}">${pickLabel}</button>`}
        </div>`;
    }).join("");
    $$("[data-pick]", el).forEach(b => b.addEventListener("click", () => onPick(b.dataset.pick)));
}
async function refreshProfiles() {
    const r = await api("/api/profiles");
    state.profiles = r.profiles;
    return r.profiles;
}
async function switchProfile(id) {
    await api(`/api/profiles/${id}/activate`, { method: "POST" });
    await loadState();
    enterApp();
    toast(`Artık ${state.profile.name} olarak sohbet ediyorsun`);
}
async function renderProfileView(creating) {
    const form = $("#profileForm");
    $("#profileFormTitle").textContent = creating ? "Yeni profil kartı" : "Profil kartı";
    renderProfileForm(form, creating ? null : state.profile, creating ? "Oluştur ve geç" : "Kaydet", async saved => {
        if (creating) { await loadState(); enterApp(); return; }
        state.profile = saved;
        const btn = $("#profileForm button[type=submit]");
        btn.textContent = "Kaydedildi ✓"; setTimeout(() => btn.textContent = "Kaydet", 1500);
        toast("Profil kaydedildi");
    });
    renderAccountInfo();
}
