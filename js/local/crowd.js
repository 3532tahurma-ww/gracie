// js/local/crowd.js - Other people's comments under her posts, so posts look lived-in (like the like counts).
// Made up but stable: seeded by the photo, so a post always has the same comments, from the same accounts.
// Some of them got a reply from her. Your own comments go between them by time (server.js /api/feed).
// The lines are in js/data/social-tr.js (Gracie.SOCIAL.crowd).
window.SL = window.SL || {};

SL.crowd = (() => {
    const T = (window.Gracie && Gracie.SOCIAL && Gracie.SOCIAL.crowd) || { names: ["ada"], any: ["❤️"], place: [], caption: [], reply: [] };
    const HANDLES = [n => `${n}.${"abcdeklmrsty"[n.length % 12]}`, n => `${n}_${10 + (n.length * 7) % 89}`, n => `the.${n}`, n => `${n}.official`,
                     n => `${n}x`, n => `itss${n}`, n => `${n}.daily`, n => `${n}__`];

    function comments(cid, post) {
        const r = SL.util.rng(`${cid}/${post.photo}/comments`);
        const n = r.randint(2, 9);
        // the post went up around noon of its date; comments came in over the next day or two
        const base = (post.date ? Date.parse(post.date + "T12:00:00Z") / 1000 : SL.util.now() - 30 * 86400);
        const used = new Set(), said = new Set(), out = [];
        for (let i = 0; i < n; i++) {
            const author = r.choice(HANDLES)(r.choice(T.names));
            const roll = r.random();
            const text = post.location && T.place.length && roll < 0.18 ? r.choice(T.place).replace("{place}", post.location.split(",")[0])
                : post.caption && T.caption.length && roll < 0.3 ? r.choice(T.caption) : r.choice(T.any);
            if (used.has(author) || said.has(text)) continue;  // one comment per account, no two alike
            used.add(author); said.add(text);
            const ts = base + r.uniform(0.02, 1.5) * 86400;
            out.push({ author, text, ts, where: "crowd", reply: T.reply.length && r.random() < 0.3 ? r.choice(T.reply) : null });
        }
        return out.sort((a, b) => a.ts - b.ts);
    }
    return { comments };
})();
