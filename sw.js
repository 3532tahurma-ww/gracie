/*
 * Gracie - service worker (offline + installable)
 * ---------------------------------------------------
 * The app files are cached on install. Online they come from the network first (so an update shows
 * up right away) and the cache is refreshed; offline they come from the cache. Character photos are
 * cached the first time they're seen. When you publish a new version, bump VERSION (gracie-v2, ...)
 * so phones drop the old files.
 */
const VERSION = "gracie-v8";
const IMG_CACHE = "gracie-img-7";  // bump after rebuilding people/ (same file names, new photos)
const CORE = [
    "./", "./index.html", "./manifest.json", "./icon.png", "./avatar.js", "./css/app.css", "./css/pages.css", "./css/gracie.css", "./css/effects.css",
    "./js/data/people.js", "./js/data/people-defs.js", "./js/data/social-tr.js", "./js/data/themes.js", "./js/data/effects.js", "./js/data/emojis.js", "./js/data/bot-rules.js",
    "./js/amor/store.js", "./js/amor/data/pools.js", "./js/amor/data/archetypes.js", "./js/amor/data/intents.js", "./js/amor/data/questions.js", "./js/amor/data/memory-data.js", "./js/amor/data/reflect.js", "./js/amor/data/custom-dialog.js", "./js/amor/schedule.js", "./js/amor/mood.js", "./js/amor/memory.js", "./js/amor/interest.js", "./js/amor/nlu.js", "./js/amor/reflect.js", "./js/amor/engine.js", "./js/amor/kume.js", "./js/amor/generator.js", "./js/amor/bot.js",
    "./js/local/util.js", "./js/local/store.js", "./js/local/characters.js", "./js/local/openers.js", "./js/local/reactions.js",
    "./js/local/chatmedia.js", "./js/local/stories.js", "./js/local/crowd.js", "./js/local/server.js",
    "./js/core.js", "./js/shell.js", "./js/characters.js", "./js/stories.js", "./js/social.js", "./js/lightbox.js", "./js/profiles.js",
    "./js/chat.js", "./js/language.js", "./js/reply.js", "./js/chattools.js", "./js/backup.js", "./js/notify.js", "./js/live.js", "./js/effects.js", "./js/bonds.js", "./js/auth.js", "./js/main.js", "./js/pwa.js",
    "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-big.png", "./icons/apple-touch-icon.png",
];

self.addEventListener("install", e => {
    e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
    e.waitUntil(caches.keys()
        .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== IMG_CACHE).map(k => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
    const req = e.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    // character photos: cache first (they never change under the same name)
    if (url.origin === location.origin && url.pathname.includes("/people/")) {
        e.respondWith(caches.open(IMG_CACHE).then(async cache => {
            const hit = await cache.match(req);
            if (hit) return hit;
            const res = await fetch(req);
            if (res.ok) cache.put(req, res.clone());
            return res;
        }));
        return;
    }
    // app files and Google Fonts: from the cache, refreshed in the background
    if (url.origin === location.origin || url.host.endsWith("googleapis.com") || url.host.endsWith("gstatic.com")) {
        // network first: online you always get the newest version (a fixed bug is fixed on the next open);
        // offline, or when the network hangs for 4 s, the cached copy
        e.respondWith(caches.open(VERSION).then(async cache => {
            const cached = () => cache.match(req, { ignoreSearch: true })
                .then(hit => hit || (req.mode === "navigate" ? cache.match("./index.html") : undefined));
            const net = fetch(req).then(res => {
                if (res.ok || res.type === "opaque") cache.put(req, res.clone());
                return res;
            });
            const slow = new Promise(r => setTimeout(r, 4000)).then(cached);
            try { return await Promise.race([net, slow.then(hit => hit || net)]); }
            catch (err) { return (await cached()) || Response.error(); }
        }));
    }
});
