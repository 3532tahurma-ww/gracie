// js/local/openers.js - Bonds over time, and first moves (port of backend/openers.py).
// Every character looks at your profile card once and decides two things, seeded by (profile, character)
// so they never flip: does she like it, and is she bold enough to text first?
// The ones who like it don't all show up at once: they notice you one after the other, in a seeded order,
// the first about half a minute after sign-up and then further and further apart:
//     k-th bond at  30 s + 20 min × k^1.6   →  ~3 in the first hour, ~10 the first day, the rest over the next days
// (after the first two, a time in her night, 1-8am, moves to her morning). The bold ones text first a while later.
// The moment of a bond is kept once it happened (server.js matchedAt), so adding characters never undoes one.
window.SL = window.SL || {};

SL.openers = (() => {
    const SINCE = "openers_since";
    const FIRST_S = 30, STEP_MIN = 20, POWER = 1.6;
    const since = () => SL.store.getSetting(SINCE);
    function markSince(t) { if (!since()) SL.store.setSetting(SINCE, t); }
    const delay = (r, lo, hi) => Math.exp(r.uniform(Math.log(lo), Math.log(hi))) * 60;  // log-uniform minutes
    // nobody texts a stranger at 4am: a time in her night (1-8am) moves to her next morning
    function awake(ts, tz, r) {
        const l = SL.util.local(tz, ts);
        if (l.h >= 1 && l.h < 8) return ts + ((8 - l.h) * 3600 - l.mi * 60 - l.s) + r.uniform(0, 150) * 60;
        return ts;
    }
    function decide(profile, persona) {
        const b5 = persona.big_five || {};
        const r = SL.util.rng(`${profile.id}-${persona.id}-first-move`);
        const pLike = 0.35 + 0.3 * (b5.openness ?? 0.5) + 0.15 * (b5.agreeableness ?? 0.5);
        const pBold = 0.15 + 0.6 * (b5.extraversion ?? 0.5) - 0.2 * (b5.neuroticism ?? 0.5);
        return { likes: r.random() < pLike, bold: r.random() < pBold, pLike, pBold };
    }
    // when each of the ones who like you notices you
    const cache = new Map();
    function schedule(profile) {
        const base = Math.max(profile.created_at || 0, since() || 0), ids = SL.chars.ids();
        const key = `${profile.id}|${base}|${ids.length}`;
        if (cache.has(key)) return cache.get(key);
        const likers = ids.map(cid => ({ cid, persona: SL.chars.load(cid), o: SL.util.rng(`${profile.id}-${cid}-order`).random() }))
            .filter(x => decide(profile, x.persona).likes).sort((a, b) => a.o - b.o);
        const out = {};
        likers.forEach((x, k) => {
            const at = base + FIRST_S + (k ? STEP_MIN * 60 * Math.pow(k, POWER) : 0);
            out[x.cid] = k < 2 ? at : awake(at, x.persona.timezone || "UTC", SL.util.rng(`${profile.id}-${x.cid}-awake`));
        });
        cache.set(key, out);
        return out;
    }
    function plan(profile, persona) {
        const d = decide(profile, persona), tz = persona.timezone || "UTC";
        const likedAt = d.likes ? schedule(profile)[persona.id] || null : null;
        const r = SL.util.rng(`${profile.id}-${persona.id}-text-at`);
        const textAt = likedAt ? awake(likedAt + delay(r, 1, 3 * 60), tz, r) : null;
        return { likes: d.likes, texts_first: d.likes && d.bold, liked_at: likedAt, text_at: textAt,
                 p_like: SL.util.round(d.pLike, 2), p_bold: SL.util.round(d.pBold, 2) };
    }
    const key = (pid, cid) => `opener:${pid}:${cid}`;
    const status = (pid, cid) => SL.store.getSetting(key(pid, cid));
    const setStatus = (pid, cid, v) => SL.store.setSetting(key(pid, cid), v);
    function due(profile, persona, t) {
        const pl = plan(profile, persona);
        if (!pl.texts_first || !pl.text_at || t < pl.text_at) return false;
        const st = status(profile.id, persona.id);
        return st !== "sent" && st !== "skip";
    }
    return { since, markSince, plan, status, setStatus, due };
})();
