// js/local/server.js - The app's "server", running inside the page.
// The desktop app's frontend talks to a FastAPI backend (/api/...). The web version keeps that
// exact frontend and answers the same requests here, from the browser's storage:
//     SL.api(path, {method, body})  - the REST endpoints (same paths, same JSON)
//     SL.replyEvents(cid)           - her reply as a stream of events (read, reaction, bubble, done)
//     SL.LiveEvents                 - live events (new bubbles, first moves, comment replies)
// Background jobs (first moves, answering comments) run on timers while the app is open.
window.SL = window.SL || {};

(() => {
    const S = SL.store, C = SL.chars, now = SL.util.now;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    class HttpError extends Error { constructor(status, detail) { super(detail); this.status = status; } }
    const err = (status, detail) => { throw new HttpError(status, detail); };

    // ---- live events (the stand-in for /api/events, Server-Sent Events) ----
    const listeners = {};
    function publish(ev) { (listeners[ev.type] || []).forEach(cb => { try { cb({ data: JSON.stringify(ev) }); } catch (e) { console.error(e); } }); }
    class LiveEvents {
        addEventListener(type, cb) { (listeners[type] = listeners[type] || []).push(cb); }
    }
    SL.LiveEvents = LiveEvents;

    // ---- helpers ----
    const activeProfile = () => { const id = S.getSetting("active_profile"); return id ? S.getProfile(id) : null; };
    const requireProfile = () => activeProfile() || err(400, "Create a profile first");
    const character = cid => C.has(cid) ? C.load(cid) : err(404, "No such character");
    const likedPosts = (pid, cid) => S.getSetting(`likes:${pid}:${cid}`) || [];
    const preview = m => ({ id: m.id, role: m.role, text: (m.text || "").slice(0, 140) });
    const card = cid => ({ ...C.card(cid), last: null });

    // ---- the Amor engine (js/amor/): her mood, closeness, memory and replies, per Gracie profile ----
    function useAmor(profile, cid) {
        Amor.Store.open(profile.id);
        const u = Amor.Store.state.user;
        if (u.name !== profile.name || String(u.age) !== String(profile.age)) { u.name = profile.name; u.age = String(profile.age); Amor.Store.save(); }
        return cid ? C.amor(cid) : null;
    }
    // Amor closeness level (1-6) -> Sanéme stage (photos, reactions)
    const stageOf = c => ["stranger", "stranger", "acquaintance", "curious", "crush", "crush", "crush"][Amor.Engine.level(c).lv] || "stranger";
    const moodLabel = c => Amor.Mood.label(Amor.Mood.current(c).values);
    // when you two got a bond: she liked your card (openers.js, they come one by one over days) or you wrote first.
    // Kept once it happened, so it never comes undone.
    function matchedAt(profile, cid) {
        const k = `matched:${profile.id}:${cid}`, saved = S.getSetting(k);
        if (saved) return saved;
        const pl = SL.openers.plan(profile, C.load(cid));
        let at = pl.likes && pl.liked_at && pl.liked_at <= now() ? pl.liked_at : null;
        if (!at) { const first = S.allMessages(profile.id, cid)[0]; if (first) at = first.ts; }
        if (at) S.setSetting(k, at);
        return at;
    }
    // what she's up to right now (Amor's daily schedule + social battery), for the chat header
    function presenceOf(c) {
        const st = Amor.Schedule.status(c);
        if (st.state === "sleep") return { kind: "sleep", text: "😴 uyuyor" };
        if (!Amor.Mood.isOnline(c)) return { kind: "drained", text: "🪫 sosyal pili bitti" };
        if (st.state === "busy") return { kind: "busy", text: `⏰ ${st.status}` };
        return { kind: "free", text: "" };
    }
    // reply mode per chat: "amor" (default, the Amor engine), "bot" (your rules, js/data/bot-rules.js), "off" (you write her side)
    const MODES = ["amor", "bot", "off"];
    const modeOf = (pid, cid) => S.getSetting(`mode:${pid}:${cid}`) || "amor";
    const autoOn = (pid, cid) => modeOf(pid, cid) !== "off";
    // 🪄 add-ons (Amor Stories): a word/verb in her message adds text before/after it or a separate bubble
    const addonsOn = (pid, cid) => !!S.getSetting(`addons:${pid}:${cid}`);
    // chat look: { bg, bubble } from js/data/themes.js
    const themeOf = (pid, cid) => S.getSetting(`theme:${pid}:${cid}`) || null;
    // several chats with the same character: the open one is "thread:<pid>:<cid>", their names "threads:<pid>:<cid>"
    const threadKey = (pid, cid) => `thread:${pid}:${cid}`;
    const curThread = (pid, cid) => S.getSetting(threadKey(pid, cid)) || 1;
    S.setThreadResolver(curThread);
    function threadList(pid, cid) {
        const names = S.getSetting(`threads:${pid}:${cid}`) || {}, stats = S.threadStats(pid, cid);
        const nums = [...new Set([1, ...Object.keys(names).map(Number), ...Object.keys(stats).map(Number)])].sort((a, b) => a - b);
        return nums.map(n => ({ n, title: names[n] || `Sohbet ${n}`, count: (stats[n] || {}).count || 0,
                                last: (stats[n] || {}).last ? preview(stats[n].last) : null, ts: (stats[n] || {}).last ? stats[n].last.ts : 0 }));
    }
    // her as the bot rules see her: name + personality label (+ traits from people-defs.js)
    function botChar(cid) {
        const c = C.amor(cid), def = (window.Gracie && Gracie.PEOPLE_DEFS || {})[c.setId] || {};
        return { name: c.name, traits: [c.archLabel, ...(def.traits || [])].filter(Boolean) };
    }
    const typingMs = s => Math.round(Math.max(700, Math.min(3500, String(s).length * 55)));
    // apply the add-ons to her bubbles: prepend to the first, append to the last, before/after as own bubbles
    function withAddons(profile, cid, parts) {
        if (!addonsOn(profile.id, cid) || !parts.length || !window.Stories || !Stories.Bot) return parts;
        const ch = botChar(cid), res = Stories.Bot.addons(Stories.BOT_RULES || {}, parts.join(" "), ch);
        const vars = { sen: profile.name, ben: ch.name.split(" ")[0] };
        const text = a => a && Math.random() * 100 < (a.chance == null ? 100 : +a.chance) ? Stories.Bot.addText(a, vars).trim() : "";
        const out = [...parts], pre = text(res.prepend), post = text(res.append), before = text(res.before), after = text(res.message);
        if (pre && !out[0].trim().startsWith(pre)) out[0] = `${pre} ${out[0].trim()}`;
        if (post && !out[out.length - 1].trim().endsWith(post)) out[out.length - 1] = `${out[out.length - 1].trim()} ${post}`;
        if (before) out.unshift(before);
        if (after) out.push(after);
        return out;
    }
    // Amor's interest check reads your earlier messages from its own chat list
    function syncChat(pid, cid, history) {
        Amor.Store.state.chats[cid] = history.map(m => ({ from: m.role === "user" ? "me" : "her", text: m.text || "", ts: m.ts * 1000 }));
    }

    // ---- comments (his comment, her reply under the post) ----
    const COMMENT_PENDING_S = 120;
    function commentsOf(pid, cid) {
        const out = {}, msgs = S.getMessages(pid, cid);
        msgs.forEach((m, i) => {
            const post = (m.meta || {}).post;
            if (m.role !== "user" || !post) return;
            const reply = msgs.slice(i + 1).find(x => x.role === "saneme" && !(x.meta || {}).deleted);
            (out[post.photo] = out[post.photo] || []).push({ text: m.text, ts: m.ts, reply: reply ? reply.text : null, where: "dm" });
        });
        const rows = S.getComments(pid, cid), replies = {};
        rows.filter(r => r.role === "saneme").forEach(r => replies[r.reply_to] = r);
        const t = now();
        rows.filter(r => r.role === "user").forEach(r => {
            const rep = replies[r.id];
            (out[r.photo] = out[r.photo] || []).push({ id: r.id, text: r.text, ts: r.ts, where: "post", reply: rep ? rep.text : null,
                                                       reply_ts: rep ? rep.ts : null, pending: !rep && t - r.ts < COMMENT_PENDING_S });
        });
        Object.values(out).forEach(l => l.sort((a, b) => a.ts - b.ts));
        return out;
    }
    async function answerComment(me, persona, post, c) {
        await sleep(SL.util.rng().uniform(2500, 6000));
        const pid = me.id, cid = persona.id;
        try {
            const her = useAmor(me, cid), expect = Amor.Store.state.expect[cid];
            const res = Amor.Engine.respond(her, [c.text]);
            Amor.Store.state.expect[cid] = expect;  // a comment doesn't change what she waits for in the DMs
            Amor.Store.save();
            const r = S.addComment(pid, cid, post.photo, "saneme", res.parts.slice(0, 2).join(" ").slice(0, 300), c.id);
            publish({ type: "comment", pid, cid, photo: post.photo, reply_to: c.id, reply: r.text, reply_ts: r.ts });
            publish({ type: "activity", pid });
        } catch (e) {
            console.error(e);
            publish({ type: "comment", pid, cid, photo: post.photo, reply_to: c.id, failed: true });
        }
    }

    // ---- the routes ----
    const routes = [];
    const route = (method, pattern, fn) => routes.push({ method, re: new RegExp("^" + pattern.replace(/\{(\w+)\}/g, "(?<$1>[^/?]+)") + "(?:\\?.*)?$"), fn });

    route("GET", "/api/state", () => {
        const profile = activeProfile();
        const last = profile ? S.lastMessages(profile.id) : {};
        if (profile) useAmor(profile);
        return { profile, profiles: S.listProfiles(),
                 characters: C.ids().map(cid => ({ ...C.card(cid), last: last[cid] || null, mood: moodLabel(C.amor(cid)),
                                                   presence: profile ? presenceOf(C.amor(cid)) : null,
                                                   level: profile ? Amor.Engine.level(C.amor(cid)).lv : 1,
                                                   matched_at: profile ? matchedAt(profile, cid) : null,
                                                   // closeness for the Bağların page: { lv 1-6, name, pts, prev, next }
                                                   bond: profile ? Amor.Engine.level(C.amor(cid)) : null,
                                                   mode: profile ? modeOf(profile.id, cid) : "amor", addons: profile ? addonsOn(profile.id, cid) : false,
                                                   theme: profile ? themeOf(profile.id, cid) : null,
                                                   thread: profile ? curThread(profile.id, cid) : 1,
                                                   threads: profile ? Object.keys(S.threadStats(profile.id, cid)).length : 0,
                                                   threadTitle: profile ? ((S.getSetting(`threads:${profile.id}:${cid}`) || {})[curThread(profile.id, cid)] || `Sohbet ${curThread(profile.id, cid)}`) : "" })),
                 now: now() };
    });
    route("GET", "/api/c/{cid}/chat", ({ cid }) => {
        character(cid);
        const me = activeProfile();
        return { character: C.card(cid), messages: me ? S.getMessages(me.id, cid) : [] };
    });
    route("GET", "/api/c/{cid}/profile", ({ cid }) => {
        const p = character(cid), me = activeProfile();
        let you = null;
        if (me) { const n = S.countMessages(me.id, cid); you = { matched_at: matchedAt(me, cid), messages: n.user + n.saneme }; }
        return { id: cid, name: p.name, age: p.age, city: p.city, district: p.district || "", country: p.country || "", occupation: p.occupation || "",
                 bio: p.bio || "", prompts: p.prompts || [], interests: [...(p.likes || []), ...(p.hobbies || [])].slice(0, 10),
                 ...C.photos(cid), posts: C.posts(cid, me ? likedPosts(me.id, cid) : []), you, stats: C.stats(cid),
                 highlights: SL.stories.highlights(cid), note: SL.stories.note(cid, now()) };
    });
    route("GET", "/api/feed", () => {
        const me = activeProfile(), items = [];
        C.ids().forEach(cid => {
            const comments = me ? commentsOf(me.id, cid) : {};
            C.posts(cid, me ? likedPosts(me.id, cid) : []).forEach(post => {
                // other people's comments + yours, by time
                const all = [...SL.crowd.comments(cid, post), ...(comments[post.photo] || [])].sort((a, b) => a.ts - b.ts);
                items.push({ ...post, cid, comments: all });
            });
        });
        // a different order every time the app opens (stable while it's open, so the feed doesn't jump)
        return { posts: SL.util.rng(`feed-${SL.SESSION}`).shuffle(items) };
    });
    route("POST", "/api/c/{cid}/posts/like", ({ cid }, body) => {
        const p = character(cid), me = requireProfile();
        if (!C.photoFiles(cid).includes(body.photo)) err(404, "No such post");
        const liked = new Set(likedPosts(me.id, cid));
        liked.has(body.photo) ? liked.delete(body.photo) : liked.add(body.photo);
        S.setSetting(`likes:${me.id}:${cid}`, [...liked].sort());
        const post = C.posts(cid, [...liked]).find(x => x.photo === body.photo);
        if (post.liked) { const her = useAmor(me, cid); Amor.Mood.nudge(her, { valence: 0.02 }); Amor.Interest.add(her, 0.01); Amor.Store.save(); }
        return { liked: post.liked, likes: post.likes };
    });
    route("POST", "/api/c/{cid}/posts/comment", ({ cid }, body) => {
        const p = character(cid), me = requireProfile();
        const text = (body.text || "").trim();
        if (!text || text.length > 500) err(422, "Comment must be 1-500 characters");
        const post = C.posts(cid).find(x => x.photo === body.photo) || err(404, "No such post");
        const c = S.addComment(me.id, cid, body.photo, "user", text);
        answerComment(me, p, post, c);
        return { comment: { id: c.id, text: c.text, ts: c.ts, where: "post", reply: null, pending: true } };
    });
    route("GET", "/api/notes", () => {
        const t = now();
        const out = C.ids().map(cid => SL.stories.note(cid, t)).filter(Boolean).sort((a, b) => b.posted_at - a.posted_at);
        return { notes: out };
    });
    route("GET", "/api/stories", () => {
        const t = now();
        const out = C.ids().map(cid => {
            const up = SL.stories.active(cid, t);
            return up.length ? { character: C.card(cid), stories: up.map(s => SL.stories.pub(cid, s)) } : null;
        }).filter(Boolean);
        out.sort((a, b) => b.stories[b.stories.length - 1].posted_at - a.stories[a.stories.length - 1].posted_at);
        return { groups: out, now: t };
    });
    route("GET", "/api/activity", () => {
        const me = requireProfile(), t = now(), week = t - 7 * 86400, ev = [];
        C.ids().forEach(cid => {
            const p = C.load(cid), msgs = S.getMessages(me.id, cid);
            // a bond: she liked your card, or you two started talking
            const mAt = matchedAt(me, cid);
            if (mAt) {
                const pl = SL.openers.plan(me, p), liked = pl.likes && pl.liked_at && pl.liked_at <= t;
                ev.push({ type: "match", cid, ts: mAt, text: liked ? "profil kartını beğendi. Artık bağlısınız 💙" : "ile aranızda bir bağ kuruldu 💙" });
            }
            msgs.forEach((m, i) => {
                const meta = m.meta || {};
                if (meta.opener && (i === 0 || !(msgs[i - 1].meta || {}).opener)) ev.push({ type: "opener", cid, ts: m.ts, text: `sana ilk mesajı attı: "${(m.text || "").slice(0, 60)}"` });
                if (m.role === "user" && (meta.reactions || {}).saneme)
                    ev.push({ type: "reaction", cid, ts: meta.read_at || m.ts, text: `mesajına ${meta.reactions.saneme} tepkisi verdi: "${(m.text || "").slice(0, 60)}"` });
                if (m.role === "user" && (meta.post || meta.story || meta.note)) {
                    const reply = msgs.slice(i + 1).find(x => x.role === "saneme");
                    if (reply && reply.ts <= t) {
                        const what = meta.post ? "yorumunu" : meta.story ? "hikaye yanıtını" : "not yanıtını";
                        ev.push({ type: "answer", cid, ts: reply.ts, text: `${what} cevapladı: "${(reply.text || "").slice(0, 60)}"`,
                                  thumb: (meta.post || meta.story || {}).url || (meta.story || {}).photo });
                    }
                }
            });
            S.getComments(me.id, cid).filter(r => r.role === "saneme").forEach(r =>
                ev.push({ type: "comment", cid, ts: r.ts, photo: r.photo, text: `yorumuna yanıt verdi: "${r.text.slice(0, 60)}"`, thumb: C.sizedUrl(cid, r.photo, "sm") }));
            SL.stories.active(cid, t).forEach(s => ev.push({ type: "story", cid, ts: s.posted_at, text: "yeni bir hikaye paylaştı", thumb: C.sizedUrl(cid, s.photo, "sm"), bg: s.bg || "pink" }));
            const n = SL.stories.note(cid, t);
            if (n) ev.push({ type: "note", cid, ts: n.posted_at, text: `bir not bıraktı: "${n.text}"` });
            C.posts(cid).forEach(post => {
                if (!post.date) return;
                const [y, mo, d] = post.date.split("-").map(Number);
                const ts = SL.util.midnight(p.timezone || "UTC", y, mo, d) + 12 * 3600;
                if (ts <= t) ev.push({ type: "post", cid, ts, photo: post.photo, thumb: C.sizedUrl(cid, post.photo, "sm"), text: post.caption ? `bir gönderi paylaştı: "${post.caption.slice(0, 60)}"` : "bir gönderi paylaştı" });
            });
        });
        const out = ev.filter(e => e.ts >= week || e.type === "match").sort((a, b) => b.ts - a.ts).slice(0, 80);
        return { events: out, now: t };
    });
    route("GET", "/api/llm", () => ({ reachable: true, loaded: true, model: "Amor", gpu: false, local: true }));
    route("GET", "/api/language", () => ({ entries: [] }));
    route("POST", "/api/c/{cid}/mode", ({ cid }, body) => {
        character(cid);
        const me = requireProfile();
        if (!MODES.includes(body.mode)) err(422, "Bilinmeyen mod");
        S.setSetting(`mode:${me.id}:${cid}`, body.mode === "amor" ? null : body.mode);
        return { ok: true, mode: body.mode };
    });
    route("POST", "/api/c/{cid}/addons", ({ cid }, body) => {
        character(cid);
        const me = requireProfile();
        S.setSetting(`addons:${me.id}:${cid}`, body.on ? true : null);
        return { ok: true, addons: !!body.on };
    });
    route("POST", "/api/c/{cid}/theme", ({ cid }, body) => {
        character(cid);
        const me = requireProfile();
        const t = body && (body.bg || body.bubble) ? { bg: body.bg || "gracie", bubble: body.bubble || "gracie" } : null;
        S.setSetting(`theme:${me.id}:${cid}`, t && (t.bg !== "gracie" || t.bubble !== "gracie") ? t : null);
        return { ok: true, theme: themeOf(me.id, cid) };
    });

    // chats with the same character
    route("GET", "/api/c/{cid}/threads", ({ cid }) => {
        character(cid);
        const me = requireProfile();
        return { current: curThread(me.id, cid), threads: threadList(me.id, cid) };
    });
    route("POST", "/api/c/{cid}/threads", ({ cid }, body) => {
        character(cid);
        const me = requireProfile();
        const n = Math.max(...threadList(me.id, cid).map(t => t.n)) + 1;
        const names = { ...(S.getSetting(`threads:${me.id}:${cid}`) || {}) };
        names[n] = String(body.title || "").trim().slice(0, 40) || `Sohbet ${n}`;
        S.setSetting(`threads:${me.id}:${cid}`, names);
        S.setSetting(threadKey(me.id, cid), n);
        useAmor(me); Amor.Store.state.expect[cid] = null;  // a new chat: she isn't waiting for an answer from the old one
        return { ok: true, current: n, threads: threadList(me.id, cid) };
    });
    route("POST", "/api/c/{cid}/threads/{n}/open", ({ cid, n }) => {
        character(cid);
        const me = requireProfile();
        S.setSetting(threadKey(me.id, cid), +n === 1 ? null : +n);
        return { ok: true, current: +n };
    });
    route("PUT", "/api/c/{cid}/threads/{n}", ({ cid, n }, body) => {
        character(cid);
        const me = requireProfile();
        const names = { ...(S.getSetting(`threads:${me.id}:${cid}`) || {}) };
        names[n] = String(body.title || "").trim().slice(0, 40) || `Sohbet ${n}`;
        S.setSetting(`threads:${me.id}:${cid}`, names);
        return { ok: true, threads: threadList(me.id, cid) };
    });
    route("DELETE", "/api/c/{cid}/threads/{n}", ({ cid, n }) => {
        character(cid);
        const me = requireProfile();
        S.deleteThread(me.id, cid, +n);
        const names = { ...(S.getSetting(`threads:${me.id}:${cid}`) || {}) };
        delete names[n];
        S.setSetting(`threads:${me.id}:${cid}`, Object.keys(names).length ? names : null);
        if (curThread(me.id, cid) === +n) {
            const next = (threadList(me.id, cid).find(t => t.count) || { n: 1 }).n;
            S.setSetting(threadKey(me.id, cid), next === 1 ? null : next);
        }
        return { ok: true, current: curThread(me.id, cid), threads: threadList(me.id, cid) };
    });

    // her side, written by you (Amor Stories): saved as her bubbles, with the add-ons if they're on
    route("POST", "/api/c/{cid}/messages/her", ({ cid }, body) => {
        character(cid);
        const me = requireProfile();
        const text = String(body.text || "").trim();
        if (!text || text.length > 2000) err(422, "Mesaj 1-2000 karakter olmalı");
        const meta = { written: true };
        if (body.effect) meta.effect = String(body.effect).slice(0, 20);
        if (body.reply_to) { const target = S.getMessage(me.id, cid, body.reply_to) || err(404, "Yanıtlanan mesaj yok"); meta.reply_to = preview(target); }
        let t = now();
        const messages = withAddons(me, cid, [text]).map((p, i) => S.addMessage(me.id, cid, "saneme", p, t + i * 0.001, i === 0 ? meta : { written: true }));
        return { messages };
    });
    route("PUT", "/api/c/{cid}/messages/{mid}", ({ cid, mid }, body) => {
        character(cid);
        const me = requireProfile();
        const text = String(body.text || "").trim();
        if (!text || text.length > 2000) err(422, "Mesaj 1-2000 karakter olmalı");
        return S.editMessage(me.id, cid, mid, text) || err(404, "Mesaj yok");
    });
    route("PUT", "/api/c/{cid}/messages/{mid}/effect", ({ cid, mid }, body) => {
        character(cid);
        const me = requireProfile();
        S.getMessage(me.id, cid, mid) || err(404, "Mesaj yok");
        return S.updateMeta(me.id, cid, mid, { effect: body.effect ? String(body.effect).slice(0, 20) : null });
    });

    // 🔑 keywords (Amor Stories): per character (or general), counted, optionally with an effect
    const kwKey = pid => `keywords:${pid}`;
    const countIn = (text, word) => {
        const t = String(text || "").toLocaleLowerCase("tr"), w = String(word || "").toLocaleLowerCase("tr");
        if (!w) return 0;
        let n = 0, i = 0;
        while ((i = t.indexOf(w, i)) !== -1) { n++; i += w.length; }
        return n;
    };
    function keywordStats(pid, k) {
        let said = 0, inChats = 0;
        (k.cid ? [k.cid] : C.ids()).forEach(cid => S.allMessages(pid, cid).forEach(m => {
            const n = countIn(m.text, k.word);
            if (!n) return;
            inChats += n;
            if (k.cid && m.role === "saneme") said += n;
        }));
        return { said, inChats };
    }
    const keywordList = pid => (S.getSetting(kwKey(pid)) || []).map(k => ({ ...k, ...keywordStats(pid, k) }));
    route("GET", "/api/keywords", () => ({ keywords: keywordList(requireProfile().id) }));
    route("POST", "/api/keywords", (_, body) => {
        const me = requireProfile(), word = String(body.word || "").trim().slice(0, 30);
        if (!word) err(422, "Kelime boş olamaz");
        const cid = body.cid && C.has(body.cid) ? body.cid : null;
        const list = S.getSetting(kwKey(me.id)) || [];
        if (list.some(k => k.cid === cid && k.word.toLocaleLowerCase("tr") === word.toLocaleLowerCase("tr"))) err(409, "Bu kelime zaten var");
        list.push({ id: "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), cid, word, effect: "" });
        S.setSetting(kwKey(me.id), list);
        return { keywords: keywordList(me.id) };
    });
    route("PUT", "/api/keywords/{id}", ({ id }, body) => {
        const me = requireProfile(), list = S.getSetting(kwKey(me.id)) || [];
        const k = list.find(x => x.id === id) || err(404, "Kelime yok");
        k.effect = body.effect ? String(body.effect).slice(0, 20) : "";
        S.setSetting(kwKey(me.id), list);
        return { keywords: keywordList(me.id) };
    });
    route("DELETE", "/api/keywords/{id}", ({ id }) => {
        const me = requireProfile();
        S.setSetting(kwKey(me.id), (S.getSetting(kwKey(me.id)) || []).filter(k => k.id !== id));
        return { keywords: keywordList(me.id) };
    });

    route("DELETE", "/api/c/{cid}/messages/{mid}", ({ cid, mid }) => {
        character(cid);
        const me = requireProfile();
        S.getMessage(me.id, cid, mid) || err(404, "Mesaj yok");
        S.deleteMessage(me.id, cid, mid);
        return { ok: true };
    });
    // Settings: make every character anew from the photo sets and js/data/people-defs.js (chats stay)
    route("POST", "/api/people/reseed", () => {
        C.seed(true);
        return { ok: true, count: C.ids().length };
    });
    route("GET", "/api/stickers", () => ({ stickers: SL.chatmedia.list() }));

    // profiles (you)
    function checkProfile(b) {
        if (!b || !b.name || !String(b.name).trim() || String(b.name).length > 40) err(422, "Name must be 1-40 characters");
        if (!(b.age >= 18 && b.age <= 99)) err(422, "You must be at least 18");
        return { name: String(b.name).trim(), age: +b.age, appearance: b.appearance || {} };
    }
    route("GET", "/api/profiles", () => ({
        profiles: S.listProfiles().map(p => ({ ...p, message_counts: S.countMessages(p.id) })), active: S.getSetting("active_profile") }));
    route("POST", "/api/profiles", (_, b) => { const p = S.createProfile(checkProfile(b)); S.setSetting("active_profile", p.id); return { ok: true, profile: p }; });
    route("PUT", "/api/profiles/{id}", ({ id }, b) => { const p = S.updateProfile(id, checkProfile(b)) || err(404, "Profile not found"); return { ok: true, profile: p }; });
    route("POST", "/api/profiles/{id}/activate", ({ id }) => { const p = S.getProfile(id) || err(404, "Profile not found"); S.setSetting("active_profile", id); return { ok: true, profile: p }; });
    route("DELETE", "/api/profiles/{id}", ({ id }) => {
        S.getProfile(id) || err(404, "Profile not found");
        S.clearChat(id); S.deleteProfile(id);
        if (S.getSetting("active_profile") === id) S.setSetting("active_profile", null);
        return { ok: true };
    });

    // chat
    route("POST", "/api/c/{cid}/messages", ({ cid }, body) => {
        const p = character(cid), profile = requireProfile(), meta = {}, t = now();
        if (body.reply_to) { const target = S.getMessage(profile.id, cid, body.reply_to) || err(404, "The message you're replying to doesn't exist"); meta.reply_to = preview(target); }
        if (body.story_id) {
            const st = SL.stories.get(cid, t, body.story_id) || err(404, "That story is gone");
            meta.story = { id: st.id, text: st.text, photo: C.sizedUrl(cid, st.photo, "sm") };
        }
        if (body.note_id) { const n = SL.stories.getNote(cid, t, body.note_id) || err(404, "That note is gone"); meta.note = { id: n.id, text: n.text }; }
        if (body.post_photo) {
            const post = C.posts(cid).find(x => x.photo === body.post_photo) || err(404, "No such post");
            meta.post = { photo: post.photo, url: post.url, caption: post.caption };
        }
        if (body.share_cid || body.share_photo) {
            const owner = C.has(body.share_cid) ? C.load(body.share_cid) : null;
            const post = owner && C.posts(body.share_cid).find(x => x.photo === body.share_photo);
            if (!post) err(404, "No such post");
            meta.shared = { cid: body.share_cid, name: owner.name, photo: post.photo, url: post.url, caption: post.caption, own: body.share_cid === cid };
        }
        let text = (body.text || "").trim();
        if (text.length > 2000) err(422, "The message is too long");
        if (body.sticker) { const st = SL.chatmedia.stickerMeta(body.sticker) || err(404, "No such sticker"); meta.sticker = st; text = st.emoji; }
        if (!text && !meta.shared) err(422, "The message is empty");
        if (body.effect) meta.effect = String(body.effect).slice(0, 20);  // ✨ bubble / screen effect (js/data/effects.js)
        return S.addMessage(profile.id, cid, "user", text, t, Object.keys(meta).length ? meta : null);
    });
    route("POST", "/api/c/{cid}/messages/{mid}/react", ({ cid, mid }, body) => {
        character(cid);
        const profile = requireProfile();
        if (body.emoji != null && !SL.reactions.ALLOWED_USER_REACTIONS.includes(body.emoji)) err(400, "Unsupported reaction");
        const msg = S.getMessage(profile.id, cid, mid) || err(404, "Message not found");
        const rx = { ...((msg.meta || {}).reactions || {}) };
        if (body.emoji) rx.user = body.emoji; else delete rx.user;
        return S.updateMeta(profile.id, cid, mid, { reactions: Object.keys(rx).length ? rx : null });
    });
    route("GET", "/api/c/{cid}/debug", ({ cid }) => { character(cid); const me = activeProfile(); return (me && S.lastTurn(me.id, cid)) || {}; });
    route("DELETE", "/api/c/{cid}/messages", ({ cid }) => {
        character(cid);
        const profile = requireProfile();
        S.clearChat(profile.id, cid);
        useAmor(profile); Amor.Store.forget(cid);
        publish({ type: "activity", pid: profile.id, cid });
        return { ok: true, reset: [cid] };
    });
    route("DELETE", "/api/chats", () => {
        const profile = requireProfile();
        S.clearChat(profile.id);
        useAmor(profile); Amor.Store.forget();
        publish({ type: "activity", pid: profile.id, cid: null });
        return { ok: true, reset: C.ids() };
    });

    async function api(path, opts = {}) {
        const method = (opts.method || "GET").toUpperCase();
        await Promise.resolve();  // like a request: never synchronous
        for (const r of routes) {
            if (r.method !== method) continue;
            const m = path.match(r.re);
            if (!m) continue;
            const params = {};
            Object.entries(m.groups || {}).forEach(([k, v]) => params[k] = decodeURIComponent(v));
            try { return JSON.parse(JSON.stringify(r.fn(params, opts.body || {}) ?? null)); }
            catch (e) { if (e instanceof HttpError) throw e; console.error(e); throw new HttpError(500, `${e.name}: ${e.message}`); }
        }
        throw new HttpError(404, `Not found: ${method} ${path}`);
    }

    // ---- her reply (the stand-in for POST /api/c/<id>/reply?stream=1) ----
    const replying = new Set();
    let lastChatActivity = 0;

    async function* replyEvents(cid) {
        const persona = character(cid), profile = requireProfile(), key = `${profile.id}|${cid}`;
        if (!autoOn(profile.id, cid)) { yield { type: "done", debug: null }; return; }  // auto mode off: you write her side
        if (replying.has(key)) { yield { type: "json", data: { busy: true } }; return; }
        replying.add(key);
        lastChatActivity = Date.now();
        try { yield* reply(profile, persona); }
        finally { replying.delete(key); lastChatActivity = Date.now(); publish({ type: "activity", pid: profile.id, cid }); }
    }

    async function* reply(profile, persona) {
        const pid = profile.id, cid = persona.id, r = SL.util.rng();
        const history = S.getMessages(pid, cid, 400);
        if (!history.length || history[history.length - 1].role !== "user") { yield { type: "done", debug: null }; return; }
        const pending = [];
        for (let i = history.length - 1; i >= 0 && history[i].role === "user"; i--) pending.unshift(history[i]);
        const texts = pending.map(m => m.text || "");

        const her = useAmor(profile, cid);
        syncChat(pid, cid, history);
        const labelBefore = moodLabel(her), stage = stageOf(her);
        const att = { stage, level: Amor.Engine.level(her), interest: SL.util.round(Amor.Interest.get(her), 2) };

        // she notices the message and opens the chat: "Seen"
        await sleep(r.uniform(500, 1600));
        const readAt = now();
        pending.forEach(m => S.updateMeta(pid, cid, m.id, { read_at: readAt }));
        yield { type: "read", read_at: readAt };

        if (modeOf(pid, cid) === "bot") { yield* botReply(profile, cid, texts, history, stage); return; }

        // she lost interest: sometimes she leaves you on "Seen" (Amor: Interest.ignoreChance)
        const pIgnore = Amor.Interest.ignoreChance(her);
        if (pIgnore && r.random() < pIgnore) {
            const debug = { time: new Date().toISOString().slice(0, 19), stage, thought: `görüldüde bıraktı (ilgi ${att.interest})`, raw: "-", parts: [],
                            delays_ms: [], style_trace: [`ilgisi düşük: görüldüde bırakma olasılığı ${pIgnore}`], user_messages: texts, llm_ms: 0, history_turns: history.length };
            S.addTurn(pid, cid, debug);
            yield { type: "done", debug };
            return;
        }

        // a reaction on his last message - and sometimes that's the whole reply
        const rx = SL.reactions.decide(pending, labelBefore, r);
        // a sweet message gets a ❤️ once she's into him - and never a cold 👍
        const lastIntent = Amor.Engine.detect(texts[texts.length - 1]).intent;
        const sweetMsg = ["flirt", "miss", "compliment", "kiss", "hug"].includes(lastIntent);
        if (["insult", "creepy"].includes(lastIntent)) { rx.emoji = null; rx.reaction_only = false; }  // no 👍 on an insult
        if (sweetMsg) {
            const warm = stage === "curious" || stage === "crush";
            rx.emoji = warm && r.random() < (stage === "crush" ? 0.55 : 0.3) ? "❤️" : null;
            rx.reaction_only = false;
        }
        if (rx.kind === "none" && /\?\s*$/.test(texts[texts.length - 1])) rx.emoji = null;  // a 👍 on a question reads cold
        if (rx.emoji) {
            const lastMsg = pending[pending.length - 1];
            const rmap = { ...(((S.getMessage(pid, cid, lastMsg.id) || {}).meta || {}).reactions || {}), saneme: rx.emoji };
            S.updateMeta(pid, cid, lastMsg.id, { reactions: rmap });
            yield { type: "reaction", reaction: { message_id: lastMsg.id, emoji: rx.emoji } };
        }
        const debugBase = { time: new Date().toISOString().slice(0, 19), stage, user_messages: texts, reaction: rx, llm_ms: 0, history_turns: history.length };
        const moodOf = () => { const m = Amor.Mood.current(her); const lab = Amor.Mood.label(m.values);
            return { label: lab, text: (Amor.Mood.LABELS[lab] || {}).name || lab, values: m.values, cause: m.cause }; };
        if (rx.reaction_only) {
            const debug = { ...debugBase, thought: `sadece tepki (${rx.emoji})`, raw: "-", parts: [], delays_ms: [],
                            style_trace: [`sadece tepki (${rx.emoji}): p ${rx.p_only}, cevap yok`], mood: moodOf() };
            S.addTurn(pid, cid, debug);
            yield { type: "done", debug };
            return;
        }

        const media = SL.chatmedia.decide(persona, stage, texts.join(" "), history, r);
        const lvBefore = Amor.Engine.level(her).lv;
        const res = Amor.Engine.respond(her, texts);
        const trace = [], parts = withAddons(profile, cid, res.parts);
        const delays = parts.map(p => res.parts.indexOf(p) >= 0 ? res.delays[res.parts.indexOf(p)] : typingMs(p));
        if (parts.join("|") !== res.parts.join("|")) trace.push("🪄 otomatik ek uygulandı");

        let t = now();
        const replies = [];
        const push = (text, meta, delayMs) => {
            t += delayMs / 1000;
            const msg = S.addMessage(pid, cid, "saneme", text, t, meta && Object.keys(meta).length ? meta : null);
            msg.delay_ms = delayMs;
            replies.push(msg);
            return msg;
        };
        if (media.send && media.photo) {
            yield { type: "bubble", message: push("", { photo: media.photo }, 2200) };
            trace.push(`sent a photo (${media.why}, p ${media.p}): ${media.photo.file}`);
        } else if (media.refuse) trace.push(`didn't send a photo (${media.why}, stage ${stage})`);
        const quote = SL.reactions.quoteTarget(pending, r);
        for (let i = 0; i < parts.length; i++) {
            const meta = {};
            if (i === 0 && quote) { meta.reply_to = preview(quote); trace.push("quoted his earlier question"); }
            yield { type: "bubble", message: push(parts[i], meta, delays[i]) };
        }
        Amor.Store.save();
        const lv = Amor.Engine.level(her);
        const debug = { ...debugBase, thought: `niyet: ${Amor.Engine.detect(texts[texts.length - 1]).intent} · ${lv.name} (Lv.${lv.lv}) · ilgi ${SL.util.round(Amor.Interest.get(her), 2)}`,
                        raw: parts.join("\n"), parts, delays_ms: replies.map(m => m.delay_ms),
                        style_trace: [...trace, res.leave ? "sosyal pili bitti: sohbetten çıktı" : null].filter(Boolean),
                        media: { send: media.send, refuse: media.refuse, why: media.why, p: media.p, photo: media.photo && media.photo.file },
                        mood: moodOf(), facts_known: Object.keys((Amor.Store.state.memory || {})[cid] || {}).length };
        S.addTurn(pid, cid, debug);
        // closer now? (Amor levels: Yeni tanışma → Tanıdık → Arkadaş → Yakın → Özel → Ruh eşi)
        const level_up = lv.lv > lvBefore ? { lv: lv.lv, name: lv.name } : null;
        yield { type: "done", debug, level_up, mood: moodLabel(her), presence: presenceOf(her) };
    }

    // ---- 📜 bot mode: your own rules (js/data/bot-rules.js, bot-editoru.bat) answer instead of the Amor engine ----
    async function* botReply(profile, cid, texts, history, stage) {
        const pid = profile.id, ch = botChar(cid);
        const m = window.Stories && Stories.Bot ? Stories.Bot.best(Stories.BOT_RULES || { rules: [] }, texts.join(" "), ch) : null;
        const base = { time: new Date().toISOString().slice(0, 19), stage, user_messages: texts, llm_ms: 0, history_turns: history.length };
        if (!m) {
            const debug = { ...base, thought: "bot modu: uygun kural yok (bot-editoru.bat ile ekle)", raw: "-", parts: [], delays_ms: [], style_trace: [] };
            S.addTurn(pid, cid, debug);
            yield { type: "done", debug };
            return;
        }
        const parts = withAddons(profile, cid, Stories.Bot.reply(m.rule, { sen: profile.name, ben: ch.name.split(" ")[0] }));
        let t = now();
        const delays = [];
        for (const p of parts) {
            const d = typingMs(p);
            t += d / 1000; delays.push(d);
            const msg = S.addMessage(pid, cid, "saneme", p, t, { bot: true });
            msg.delay_ms = d;
            yield { type: "bubble", message: msg };
        }
        const debug = { ...base, thought: `bot modu: "${m.rule.name || m.rule.id}" kuralı${m.fallback ? " (yedek cevap)" : ""}`, raw: parts.join("\n"),
                        parts, delays_ms: delays, style_trace: [`kural: ${(m.rule.when || []).join(", ") || "yedek"}`] };
        S.addTurn(pid, cid, debug);
        yield { type: "done", debug };
    }

    // ---- first moves: some characters text first (openers.js decides who and when) ----
    function openerTick() {
        const profile = activeProfile();
        if (!profile || Date.now() - lastChatActivity < 40000 || replying.size) return;
        const t = now();
        SL.openers.markSince(t);
        for (const cid of C.ids()) {
            const persona = C.load(cid);
            if (!SL.openers.due(profile, persona, t)) continue;
            const n = S.countMessages(profile.id, cid);
            if (n.user + n.saneme || !autoOn(profile.id, cid)) { SL.openers.setStatus(profile.id, cid, "skip"); continue; }
            const her = useAmor(profile, cid);
            if (!Amor.Mood.isOnline(her)) continue;  // asleep or drained: she'll text when she's up
            const stage = stageOf(her);
            const { parts, delays } = Amor.Engine.opener(her);
            let at = now();
            parts.forEach((text, i) => {
                at += (i ? delays[i] : 0) / 1000;
                const msg = S.addMessage(profile.id, cid, "saneme", text, at, { opener: true });
                publish({ type: "bubble", pid: profile.id, cid, message: msg, opener: true });
            });
            SL.openers.setStatus(profile.id, cid, "sent");
            S.addTurn(profile.id, cid, { time: new Date().toISOString().slice(0, 19), stage, thought: "ilk hamle: önce o yazdı", raw: parts.join("\n"),
                                        parts, delays_ms: delays, style_trace: ["ilk hamle: önce o yazdı"], user_messages: [], llm_ms: 0 });
            publish({ type: "activity", pid: profile.id, cid });
            return;  // one per tick, so they don't all arrive in the same second
        }
    }
    setInterval(openerTick, 30000);
    setTimeout(openerTick, 8000);

    SL.api = api;
    SL.replyEvents = replyEvents;
    SL.publish = publish;
    SL.openerTick = openerTick;  // (tests / the console can run a first-move check right away)
})();
