// js/local/characters.js - Gracie's characters: Amor identities (js/amor/generator.js) on Gracie photo sets.
// Photo sets come from js/data/people.js (tools/build-people.ps1 from fotograflar/<folder>/):
// people/<set>/{full,md,sm}/<file>.jpg, the first file (profil.jpg) is the profile photo.
// Identities are made once per device (Amor.Store world) and shared by every account. js/data/people-defs.js
// (or Gracie Stüdyo) is applied on every start; a new photo in a folder becomes a new post.
// The rest of the local backend sees them through the same interface the Sanéme characters had (SL.chars).
window.SL = window.SL || {};

SL.chars = (() => {
    const SETS = window.Gracie && Gracie.SETS || [];
    const DEFS = window.Gracie && Gracie.PEOPLE_DEFS || {};
    const SOCIAL = window.Gracie && Gracie.SOCIAL || { stories: {}, notes: {} };
    const SEED_VERSION = 2;
    const GROUP_ORDER = { gracie: 0, carmen: 1, dontstop: 2, amor: 3 };
    const setOf = {};
    SETS.forEach(s => setOf[s.id] = s);

    // Amor's generator needs these: photo sets in its own format, and the extra jobs
    Amor.PHOTO_SETS = SETS.map(s => ({ id: s.id, dir: "full/", profile: s.files[0], photos: s.files.slice(1) }));
    // (arch: [] so random characters never draw them; only people-defs.js gives them out)
    (Gracie.EXTRA_JOBS || []).forEach(j => { if (!Amor.JOBS.some(x => x.title === j.title)) Amor.JOBS.push({ ...j, arch: [] }); });

    const rnd = () => Math.random();
    const pick = arr => arr[Math.floor(rnd() * arr.length)];
    const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

    // one identity per photo set; defs override what's given, the rest is random from the Amor pools
    function make(set) {
        const def = DEFS[set.id] || {};
        const id = Amor.Gen.draft({ setId: set.id, name: def.name, archetype: def.archetype });
        id.id = "p-" + set.id;
        id.group = set.group;
        id.deco = ["", ""];
        applyDef(id, def);
        id.posts = [];
        addPosts(id, shuffle(set.files), 0);
        return id;
    }
    // every photo is a post (the profile photo too); startDay = how many days ago the newest of them went up
    function addPosts(id, files, startDay) {
        const arch = Amor.archetype(id.archetype), home = Amor.CITIES.find(c => c.name === id.cityName) || Amor.CITIES[0];
        const caps = shuffle(arch.captions);
        let day = startDay;
        files.forEach((photo, i) => {
            day += startDay === 0 && i === 0 ? Math.floor(rnd() * 3) : 2 + Math.floor(rnd() * 11);
            const caption = rnd() < 0.85 ? caps[i % caps.length].replace(/\{fav\}/g, home.fav).replace(/\{like\}/g, (id.likes || [])[0] || "") : "";
            const r = rnd();
            id.posts.push({ photo, text: caption, date: daysAgo(day), location: r < 0.25 ? home.fav : r < 0.5 ? `${id.district}, ${home.name}` : "" });
        });
    }
    // people-defs.js wins over the random identity; returns true if something changed
    function applyDef(id, def) {
        let changed = false;
        const put = (k, v) => { if (v != null && v !== "" && id[k] !== v) { id[k] = v; changed = true; } };
        put("name", def.name);
        if (def.archetype && id.archetype !== def.archetype) {
            const arch = Amor.archetype(def.archetype);
            id.archetype = arch.id;
            id.big5 = { ...arch.big5 };
            id.likes = shuffle(arch.likes).slice(0, 5);
            id.dislikes = shuffle(arch.dislikes).slice(0, 3);
            changed = true;
        }
        if (def.age) put("age", +def.age);
        put("job", def.job);
        const city = def.city && Amor.CITIES.find(c => c.name === def.city);
        if (city && id.cityName !== city.name) { id.cityName = city.name; id.district = pick(city.districts); changed = true; }
        put("bio", def.bio);
        put("about", def.about);
        return changed;
    }
    // the photo folder changed: posts for new photos (newest, "just posted"), none for removed ones
    function syncPosts(id) {
        const files = (setOf[id.setId] || { files: [] }).files, before = (id.posts || []).length;
        id.posts = (id.posts || []).filter(p => files.includes(p.photo));
        const fresh = files.filter(f => !id.posts.some(p => p.photo === f));
        if (fresh.length) addPosts(id, fresh, 0);
        return fresh.length > 0 || id.posts.length !== before;
    }

    // byId: hydrated (what the engine uses); rawPosts: post photos as file names (hydrate turns them into Amor paths)
    let byId = {}, rawPosts = {}, order = [];
    function load() {
        Amor.CHARACTERS = Amor.Store.state.characters.map(Amor.Gen.hydrate);
        byId = {}; Amor.CHARACTERS.forEach(c => byId[c.id] = c);
        rawPosts = {}; Amor.Store.state.characters.forEach(c => rawPosts[c.id] = c.posts || []);
        order = Amor.CHARACTERS.map(c => c.id);
    }
    // fill in missing characters (new photo sets), drop ones whose set is gone; force = make everyone anew
    function seed(force) {
        const s = Amor.Store.state;
        if (force || (s.seedVersion || 0) < SEED_VERSION) { s.characters = []; s.seedVersion = SEED_VERSION; }
        s.characters = s.characters.filter(c => setOf[c.setId]);
        s.characters.forEach(c => {
            if (!c.group || c.group !== setOf[c.setId].group) c.group = setOf[c.setId].group;
            syncPosts(c);
            applyDef(c, DEFS[c.setId] || {});
        });
        const have = new Set(s.characters.map(c => c.setId));
        SETS.filter(x => !have.has(x.id)).forEach(x => s.characters.push(make(x)));
        s.characters.sort((a, b) => (GROUP_ORDER[a.group] ?? 9) - (GROUP_ORDER[b.group] ?? 9));
        Amor.Store.save();
        load();
    }
    seed(false);

    const ids = () => order.slice();
    const has = cid => !!byId[cid];
    const amor = cid => byId[cid];
    const setId = cid => byId[cid].setId;
    const photoFiles = cid => (setOf[setId(cid)] || { files: [] }).files.slice();
    const profileFile = cid => photoFiles(cid)[0] || null;
    const photoUrl = (cid, file) => file ? `people/${encodeURIComponent(setId(cid))}/full/${file}` : null;
    const sizedUrl = (cid, file, size) => file ? `people/${encodeURIComponent(setId(cid))}/${size}/${file}` : null;
    const lqip = () => null;

    // the persona shape the rest of the backend expects (Sanéme's persona.json)
    function load1(cid) {
        const c = byId[cid];
        const prompts = [];
        if (c.about) prompts.push({ q: "Hakkımda", a: c.about });
        if (c.likes && c.likes.length) prompts.push({ q: "Sevdiklerim", a: c.likes.join(", ") });
        if (c.dislikes && c.dislikes.length) prompts.push({ q: "Sevmediklerim", a: c.dislikes.join(", ") });
        if (c.zodiac) prompts.push({ q: "Burcum", a: c.zodiac });
        const b = c.big5 || {};
        return { id: cid, name: c.name, age: c.age, city: c.city, district: c.district, country: "", occupation: c.job, bio: c.bio,
                 likes: c.likes || [], hobbies: [], prompts, posts: rawPosts[cid], timezone: "Europe/Istanbul",
                 profile_photo: profileFile(cid), cover_photo: rawPosts[cid].map(p => p.photo).find(f => f !== profileFile(cid)) || profileFile(cid),
                 big_five: { openness: b.O, conscientiousness: b.C, extraversion: b.E, agreeableness: b.A, neuroticism: b.N },
                 archetype: c.archetype };
    }

    function photos(cid) {
        const p = load1(cid), files = photoFiles(cid);
        const ordered = [p.profile_photo].concat(files.filter(f => f !== p.profile_photo));
        return { profile_photo: sizedUrl(cid, p.profile_photo, "md"), cover_photo: sizedUrl(cid, p.cover_photo, "md"), photos: ordered.map(f => photoUrl(cid, f)), files: ordered };
    }
    function posts(cid, liked = []) {
        return rawPosts[cid].map(x => {
            const base = 40 + SL.util.hashStr(`${cid}/${x.photo}`) % 260, on = liked.includes(x.photo);
            return { photo: x.photo, url: photoUrl(cid, x.photo), thumb: sizedUrl(cid, x.photo, "md"), lqip: null, caption: x.text || "", date: x.date || "",
                     location: x.location || "", likes: base + (on ? 1 : 0), liked: on };
        }).sort((a, b) => (b.date || "0000").localeCompare(a.date || "0000"));
    }
    function stats(cid) {
        const c = byId[cid];
        return { posts: rawPosts[cid].length, followers: c.followers || 500, following: c.following || 200 };
    }
    function card(cid) {
        const p = load1(cid);
        return { id: cid, name: p.name, age: p.age, city: p.city || "", country: "", occupation: p.occupation || "", bio: p.bio || "",
                 photo: sizedUrl(cid, profileFile(cid), "sm"), cover: sizedUrl(cid, p.cover_photo, "md"), timezone: p.timezone, group: byId[cid].group,
                 colors: byId[cid].colors || null, archetype: byId[cid].archLabel || "" };
    }

    // stories and notes: her archetype's lines + the shared ones, with her own details filled in
    function storyFile(cid) {
        const c = byId[cid];
        const fill = s => s.replace(/\{city\}/g, c.city).replace(/\{district\}/g, c.district || c.city).replace(/\{fav\}/g, c.fav || c.city)
            .replace(/\{like\}/g, (c.likes || [])[0] || "kahve").replace(/\{doing\}/g, (c.doing || ["takılıyorum"])[0]);
        const lines = (bank, kind) => [...(bank.any || []), ...(bank[c.archetype] || [])].map(([text, when], i) => ({ id: `${kind}${i}`, text: fill(text), when }));
        const bgs = ["pink", "night", "coffee", "sunset", "mint"];
        return { pool: lines(SOCIAL.stories || {}, "s").map((s, i) => ({ ...s, bg: bgs[i % bgs.length] })), notes: lines(SOCIAL.notes || {}, "n") };
    }

    return { ids, has, load: load1, amor, photoUrl, sizedUrl, photoFiles, lqip, photos, posts, stats, card, storyFile, seed, reload: load };
})();
