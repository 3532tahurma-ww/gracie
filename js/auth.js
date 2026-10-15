// js/auth.js - Gracie's login, sign-up wizard and welcome overlay (screens from Gracie 240-11).
// There is no server: accounts live in this browser (localStorage "gracie_accounts"), each one tied to
// one profile of the in-page backend. The password only keeps other people on the same device out of
// your chats; it is not real security (anyone with the device can read localStorage).

const ACC_KEY = "gracie_accounts", SESSION_KEY = "gracie_session";
const REG_STEPS = [
    { key: "display_name", emoji: "😊", bubble: "Sana ne diyelim?", subtitle: "Herkes seni bu isimle görecek." },
    { key: "credentials", emoji: "👋", bubble: "Merhaba! Şimdi hesabını oluşturalım", subtitle: "Bu cihazda giriş yaparken kullanacaksın." },
    { key: "age", emoji: "🎂", bubble: "Yaşını çok merak ediyorum", subtitle: "Gracie'ye katılmak için 18 yaşından büyük olmalısın." },
    { key: "city", emoji: "📍", bubble: "Süperrr, peki nerede yaşıyorsun?", subtitle: "Yakınındakilerle tanışman kolaylaşsın." },
    { key: "gender", emoji: "💙", bubble: "Biraz daha tanıyalım seni", subtitle: "Kimleri görmek istediğini seç." },
    { key: "bio", emoji: "✍️", bubble: "Kendinden kısaca bahseder misin?", subtitle: "Birkaç cümle yeter, sonra da değiştirebilirsin.", skippable: true },
    { key: "interests", emoji: "🐾", bubble: "Son bir soru: neyle ilgilenirsin?", subtitle: "Ortak noktalar sohbeti kolaylaştırır.", skippable: true },
];
const REG_INTERESTS = ["Evcil hayvanlar", "Spor", "Sinema", "Müzik", "Seyahat", "Yemek", "Sanat", "Kitap", "Dans", "Doğa"];
const REG_CITIES = ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa", "Eskişehir", "Muğla", "Adana", "Mersin", "Trabzon",
    "Kocaeli", "Konya", "Samsun", "Denizli", "Çanakkale", "Tekirdağ", "Kayseri", "Gaziantep", "Diyarbakır", "Edirne"];
const reg = { i: 0, w: null, busy: false };

function accounts() {
    try { return JSON.parse(localStorage.getItem(ACC_KEY)) || {}; } catch (e) { return {}; }
}
function saveAccounts(a) {
    try { localStorage.setItem(ACC_KEY, JSON.stringify(a)); } catch (e) {}
}
function sessionUser() {
    try { return localStorage.getItem(SESSION_KEY); } catch (e) { return null; }
}
function setSession(key) {
    try { key ? localStorage.setItem(SESSION_KEY, key) : localStorage.removeItem(SESSION_KEY); } catch (e) {}
}
function currentAccount() {
    const key = sessionUser();
    return key ? accounts()[key] || null : null;
}
// cyrb53: a quick string hash, so the password isn't stored as plain text
function passHash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const userKey = u => String(u || "").trim().toLocaleLowerCase("tr");

// ---------------- Screens ----------------
function fadeSwap(from, to) {
    from.classList.add("page-fade");
    setTimeout(() => {
        from.style.display = "none";
        to.style.display = "flex";
        to.classList.add("page-fade");
        requestAnimationFrame(() => to.classList.remove("page-fade"));
    }, 200);
}
function showAuth() {
    $("#app").classList.add("hidden");
    $("#registerScreen").style.display = "none";
    $("#authScreen").style.display = "flex";
    $("#loginError").textContent = "";
    $("#loginPassword").value = "";
    renderAuthSaved();
}
function showRegister() {
    reg.i = 0;
    reg.w = { display_name: "", username: "", password: "", age: "", city: "", gender: "male", interested_in: "female", bio: "", interests: [] };
    renderRegStep();
    fadeSwap($("#authScreen"), $("#registerScreen"));
}
function showLogin() {
    renderAuthSaved();
    fadeSwap($("#registerScreen"), $("#authScreen"));
}
function renderAuthSaved() {
    const list = Object.values(accounts());
    $("#authSaved").classList.toggle("hidden", !list.length);
    $("#authSavedList").innerHTML = list.map(a => `<button type="button" data-user="${esc(a.username)}">${esc(a.display_name)} · @${esc(a.username)}</button>`).join("");
    $$("[data-user]", $("#authSavedList")).forEach(b => b.addEventListener("click", () => {
        $("#loginUsername").value = b.dataset.user;
        $("#loginPassword").focus();
    }));
}
$$("[data-show-register]").forEach(a => a.addEventListener("click", showRegister));
$$("[data-show-login]").forEach(a => a.addEventListener("click", showLogin));

// ---------------- Login ----------------
async function startSession(acc) {
    await api(`/api/profiles/${acc.profile_id}/activate`, { method: "POST" });
    setSession(userKey(acc.username));
    await loadState();
    $("#authScreen").style.display = "none";
    $("#registerScreen").style.display = "none";
    await enterApp();
}
$("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const err = $("#loginError"), btn = $("#loginForm button[type=submit]");
    const acc = accounts()[userKey($("#loginUsername").value)];
    err.textContent = "";
    if (!acc || acc.pass !== passHash($("#loginPassword").value)) { err.textContent = "Kullanıcı adı ya da parola hatalı."; return; }
    btn.disabled = true;
    try { await startSession(acc); }
    catch (ex) { err.textContent = ex.status === 404 ? "Bu hesabın profili silinmiş. Yeni bir hesap oluştur." : ex.message; }
    btn.disabled = false;
});

function logout() {
    setSession(null);
    showView("home");
    showAuth();
}
$$("[data-logout]").forEach(b => b.addEventListener("click", logout));

// ---------------- Sign-up wizard ----------------
function renderRegStep() {
    const step = REG_STEPS[reg.i], w = reg.w;
    $("#regError").textContent = "";
    $("#regProgress").innerHTML = REG_STEPS.map((s, i) =>
        `<div class="dot ${i < reg.i ? "done" : ""} ${i === reg.i ? "active" : ""}"></div>`).join("");
    const opt = (v, cur, label) => `<option value="${v}" ${v === cur ? "selected" : ""}>${label}</option>`;
    const skip = step.skippable ? `<div class="reg-skip-link" data-reg-skip>Şimdilik geç</div>` : "";
    let fields = "";
    if (step.key === "display_name") {
        fields = `<input type="text" id="regWizDisplayName" maxlength="40" placeholder="Görünen adın" value="${esc(w.display_name)}">`;
    } else if (step.key === "credentials") {
        if (!w.username) w.username = suggestUsername(w.display_name);
        fields = `<label>Kullanıcı adı</label><input type="text" id="regWizUsername" maxlength="30" value="${esc(w.username)}">
            <label>Parola</label><input type="password" id="regWizPassword" value="${esc(w.password)}">`;
    } else if (step.key === "age") {
        fields = `<input type="number" id="regWizAge" min="18" max="99" placeholder="18+" value="${esc(w.age)}">`;
    } else if (step.key === "city") {
        fields = `<select id="regWizCity"><option value="">Şehrini seç</option>${REG_CITIES.map(c => opt(c, w.city, c)).join("")}</select>`;
    } else if (step.key === "gender") {
        fields = `<label>Cinsiyetin</label><select id="regWizGender">${opt("male", w.gender, "Erkek")}${opt("female", w.gender, "Kadın")}${opt("other", w.gender, "Diğer")}</select>
            <label>Kimlerle tanışmak istersin?</label><select id="regWizInterestedIn">${opt("female", w.interested_in, "Kadınlar")}${opt("male", w.interested_in, "Erkekler")}${opt("everyone", w.interested_in, "Herkes")}</select>`;
    } else if (step.key === "bio") {
        fields = `<textarea id="regWizBio" rows="3" maxlength="300" placeholder="Kahve, kitap, uzun yürüyüşler…">${esc(w.bio)}</textarea>${skip}`;
    } else if (step.key === "interests") {
        fields = `<div class="reg-chip-grid">${REG_INTERESTS.map(o =>
            `<div class="reg-chip-option ${w.interests.includes(o) ? "selected" : ""}" data-interest="${esc(o)}">${esc(o)}</div>`).join("")}</div>${skip}`;
    }
    const body = $("#regStepBody");
    body.innerHTML = `<span class="reg-step-emoji">${step.emoji}</span>
        <div class="reg-step-bubble">${esc(step.bubble)}</div>
        <div class="reg-step-subtitle">${esc(step.subtitle)}</div>${fields}`;
    $$("[data-interest]", body).forEach(el => el.addEventListener("click", () => {
        const o = el.dataset.interest, k = w.interests.indexOf(o);
        if (k >= 0) w.interests.splice(k, 1); else w.interests.push(o);
        el.classList.toggle("selected");
    }));
    const sk = $("[data-reg-skip]", body);
    if (sk) sk.addEventListener("click", regAdvance);
    $("#regBackBtn").style.visibility = reg.i === 0 ? "hidden" : "visible";
    $("#regNextBtn").textContent = reg.i === REG_STEPS.length - 1 ? "Hesabımı oluştur" : "Devam →";
    // onkeydown assignment (not addEventListener) so Enter doesn't pile up one listener per step
    body.onkeydown = e => { if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") { e.preventDefault(); regNext(); } };
    const first = $("input, select, textarea", body);
    if (first) setTimeout(() => first.focus(), 50);
}
function suggestUsername(name) {
    const base = String(name || "").toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "").slice(0, 16);
    return base ? base + Math.floor(10 + Math.random() * 90) : "";
}
function collectRegStep() {
    const key = REG_STEPS[reg.i].key, w = reg.w, val = id => $(id).value.trim();
    if (key === "display_name") {
        w.display_name = val("#regWizDisplayName");
        if (!w.display_name) return "Bir isim yazmalısın.";
    } else if (key === "credentials") {
        w.username = val("#regWizUsername"); w.password = $("#regWizPassword").value;
        if (!w.username || !w.password) return "Kullanıcı adı ve parola gerekli.";
        if (!/^[\wçğıöşü.]{3,30}$/i.test(w.username)) return "Kullanıcı adı 3-30 karakter olmalı (harf, rakam, _ ve .).";
        if (w.password.length < 4) return "Parola en az 4 karakter olmalı.";
        if (accounts()[userKey(w.username)]) return "Bu kullanıcı adı bu cihazda zaten alınmış.";
    } else if (key === "age") {
        w.age = parseInt($("#regWizAge").value, 10);
        if (!(w.age >= 18 && w.age <= 99)) return "18-99 arasında geçerli bir yaş girmelisin.";
    } else if (key === "city") {
        w.city = val("#regWizCity");
        if (!w.city) return "Bir şehir seçmelisin.";
    } else if (key === "gender") {
        w.gender = $("#regWizGender").value; w.interested_in = $("#regWizInterestedIn").value;
    } else if (key === "bio") {
        w.bio = val("#regWizBio");
    }
    return null;
}
function regNext() {
    const err = collectRegStep();
    if (err) { $("#regError").textContent = err; return; }
    regAdvance();
}
function regAdvance() {
    if (reg.i === REG_STEPS.length - 1) { submitRegWizard(); return; }
    reg.i++;
    renderRegStep();
}
$("#regNextBtn").addEventListener("click", regNext);
$("#regBackBtn").addEventListener("click", () => { if (reg.i > 0) { reg.i--; renderRegStep(); } });

// a random look for the drawn profile card; it can be changed any time under Profile
function randomAppearance() {
    const pick = l => l[Math.floor(Math.random() * l.length)];
    const o = AV.options, hairStyle = pick(o.hairStyles), hairColor = pick(Object.keys(o.hair));
    return {
        height_cm: Math.round(160 + (Math.random() + Math.random()) * 18), body_type: pick(BODY_TYPES),
        skin_tone: pick(Object.keys(o.skin)), eye_color: pick(Object.keys(o.eyes)),
        hair_style: hairStyle, hair_color: hairColor, hair: hairStyle === "bald" ? "bald" : `${hairStyle} ${hairColor}`,
        facial_hair: pick(FACIAL), glasses: Math.random() < 0.25, style: pick(STYLES), notable: null,
    };
}
async function submitRegWizard() {
    if (reg.busy) return;
    reg.busy = true;
    const w = reg.w, btn = $("#regNextBtn");
    btn.disabled = true;
    try {
        const r = await api("/api/profiles", { method: "POST", body: { name: w.display_name, age: w.age, appearance: randomAppearance() } });
        const all = accounts();
        all[userKey(w.username)] = {
            username: w.username, pass: passHash(w.password), profile_id: r.profile.id, display_name: w.display_name,
            age: w.age, city: w.city, gender: w.gender, interested_in: w.interested_in, bio: w.bio, interests: w.interests,
            created: Date.now(),
        };
        saveAccounts(all);
        await startSession(all[userKey(w.username)]);
        fxBurst(["🎉", "🎊", "✨", "💙", "💫"], 28);
        showWelcomeOverlay(w.display_name);
    } catch (ex) {
        $("#regError").textContent = ex.message;
    } finally {
        btn.disabled = false;
        reg.busy = false;
    }
}

// ---------------- Welcome overlay ----------------
function showWelcomeOverlay(name) {
    const photos = (state.characters || []).map(c => c.photo).filter(Boolean).slice(0, 8);
    $("#welcomeCollage").innerHTML = photos.map(url => `<div class="welcome-collage-tile"><img src="${esc(url)}" alt=""></div>`).join("");
    $("#welcomeGreeting").textContent = `Hoş geldin, ${name}! 💙`;
    $("#welcomeOverlay").classList.add("show");
}
$("#welcomeGo").addEventListener("click", () => {
    $("#welcomeOverlay").classList.remove("show");
    showView("home");
    toast("İlk bağların yolda 💙 Biri seni fark edince haber vereceğim");
});

// ---------------- Account card (Profile page) ----------------
function renderAccountInfo() {
    const a = currentAccount(), el = $("#accountInfo");
    if (!a) { el.innerHTML = ""; return; }
    const row = (k, v) => v ? `<div class="settings-row"><div><div class="t">${k}</div><div class="d">${esc(v)}</div></div></div>` : "";
    el.innerHTML = row("Kullanıcı adı", "@" + a.username) + row("Şehir", a.city) + row("Hakkında", a.bio) +
        row("İlgi alanları", (a.interests || []).join(", "));
}
