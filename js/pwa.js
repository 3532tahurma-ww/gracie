// js/pwa.js - Installable app: the service worker (offline) and the "Install" button in Settings.
// A service worker only runs over http(s) (GitHub Pages, a local server) - not from file://.
(function () {
    const btn = document.getElementById("installBtn");
    let deferred = null;
    const standalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    function update() {
        if (!btn) return;
        if (standalone()) { btn.textContent = "Yüklendi ✓"; btn.disabled = true; return; }
        btn.disabled = false;
        btn.textContent = deferred ? "Yükle" : "Nasıl?";
    }
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
        window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(e => console.warn("service worker:", e)));
    }
    window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; update(); });
    window.addEventListener("appinstalled", () => { deferred = null; update(); toast("Gracie yüklendi 💙"); });
    if (btn) btn.addEventListener("click", async () => {
        if (deferred) {
            deferred.prompt();
            await deferred.userChoice.catch(() => null);
            deferred = null;
            update();
        } else if (ios) {
            toast("iPhone'da: Safari → Paylaş → Ana Ekrana Ekle");
        } else if (location.protocol === "file:") {
            toast("Yüklemek için web adresinden aç (ör. GitHub Pages)");
        } else {
            toast("Tarayıcı menüsü → Uygulamayı yükle / Ana ekrana ekle");
        }
    });
    update();
})();
