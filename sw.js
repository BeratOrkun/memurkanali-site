/*
 * Memur Kanalı - service worker
 * - Uygulama dosyalarını ve son verileri önbelleğe alır (internet yokken de açılır)
 * - Veriler (api/) her zaman önce ağdan istenir, ağ yoksa son kopya gösterilir
 * - Destekleyen cihazlarda (Android / Chrome, uygulama yüklüyse) arka planda yeni ilan
 *   kontrolü yapıp bildirim gösterir (periodic background sync)
 *
 * Uygulama dosyalarında (HTML/CSS/JS) değişiklik yaptığınızda SURUM'u artırın.
 */
importScripts("ayarlar.js", "js/ortak.js");

var SURUM = "2026-11-25-2";
var KABUK = "mk-kabuk-" + SURUM;
var VERI = "mk-veri";
var GORSEL = "mk-gorsel";
var DOSYALAR = [
  "./", "index.html", "ayarlar.js", "css/stil.css", "js/ortak.js", "js/uygulama.js",
  "manifest.webmanifest", "img/logo.svg", "img/ikon-192.png", "img/favicon-32.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(KABUK).then(function (c) { return c.addAll(DOSYALAR); }));
});

// Sayfadaki "Güncelle" düğmesi
self.addEventListener("message", function (e) {
  if (e.data === "atla") self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (adlar) {
      return Promise.all(adlar.filter(function (a) { return a.indexOf("mk-kabuk-") === 0 && a !== KABUK; })
        .map(function (a) { return caches.delete(a); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function onbellegeKoy(ad, istek, yanit) {
  if (!yanit || !yanit.ok || yanit.type === "opaque") return;
  var kopya = yanit.clone();
  caches.open(ad).then(function (c) { c.put(istek, kopya); }).catch(function () { /* kota */ });
}

self.addEventListener("fetch", function (e) {
  var istek = e.request;
  if (istek.method !== "GET") return;
  var url = new URL(istek.url);

  // 1) Veriler: önce ağ, ağ yoksa son kopya
  if (url.pathname.indexOf("/api/") !== -1) {
    e.respondWith(
      fetch(istek).then(function (y) { onbellegeKoy(VERI, istek, y); return y; })
        .catch(function () {
          return caches.match(istek, { ignoreSearch: true }).then(function (r) { return r || Response.error(); });
        })
    );
    return;
  }

  if (url.origin !== self.location.origin) return; // kurum logoları vb. tarayıcıya kalsın

  // 2) Sayfa açılışları: önce ağ, yoksa önbellekteki uygulama kabuğu
  if (istek.mode === "navigate") {
    var anaSayfa = /\/(index\.html)?$/.test(url.pathname);
    e.respondWith(
      fetch(istek).then(function (y) {
        if (anaSayfa) onbellegeKoy(KABUK, "index.html", y);
        return y;
      }).catch(function () {
        return caches.match(anaSayfa ? "index.html" : istek, { ignoreSearch: true })
          .then(function (r) { return r || caches.match("index.html"); });
      })
    );
    return;
  }

  // 3) Görseller: önce önbellek
  if (/\.(png|svg|jpg|jpeg|webp|ico)$/.test(url.pathname)) {
    e.respondWith(caches.match(istek).then(function (r) {
      return r || fetch(istek).then(function (y) { onbellegeKoy(GORSEL, istek, y); return y; });
    }));
    return;
  }

  // 4) CSS / JS ve diğerleri: önce ağ (her zaman güncel), yoksa önbellek
  e.respondWith(
    fetch(istek).then(function (y) { onbellegeKoy(KABUK, istek, y); return y; })
      .catch(function () { return caches.match(istek, { ignoreSearch: true }); })
  );
});

// ---------------------------------------------------------------- Arka plan kontrolü
function ayarOku() {
  return caches.open("mk-ayar").then(function (c) { return c.match("ayar.json"); })
    .then(function (r) { return r ? r.json() : null; });
}
function ayarYaz(a) {
  return caches.open("mk-ayar").then(function (c) {
    return c.put("ayar.json", new Response(JSON.stringify(a), { headers: { "Content-Type": "application/json" } }));
  });
}

function yeniIlanKontrol() {
  return ayarOku().then(function (a) {
    if (!a || !a.bildirim) return;
    return fetch(a.api || self.MK.apiAdresi("ilanlar.json"), { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var simdi = Date.now();
        var ilanlar = d.ilanlar || [];
        var bilinen = new Set(a.bilinen || []);
        var yeniler = ilanlar.filter(function (i) {
          var gorulmus = bilinen.has(i.id) || (i.idler || []).some(function (x) { return bilinen.has(x); });
          return !gorulmus && !(i.bitis && Date.parse(i.bitis) < simdi);
        });
        a.bilinen = ilanlar.map(function (i) { return i.id; });
        var kayit = ayarYaz(a);
        if (!yeniler.length) return kayit;
        var eslesen = a.alarmlar && a.alarmlar.length
          ? yeniler.filter(function (i) { return a.alarmlar.some(function (al) { return self.MK.filtreUyar(al.f, i, simdi); }); })
          : yeniler;
        if (!eslesen.length) return kayit;
        return kayit.then(function () {
          return self.registration.showNotification("Memur Kanalı · " + eslesen.length + " yeni ilan", {
            body: eslesen.slice(0, 3).map(function (i) { return "• " + i.baslik + (i.kurum ? " (" + i.kurum + ")" : ""); }).join("\n"),
            icon: "img/ikon-192.png",
            badge: "img/rozet-96.png",
            tag: "mk-yeni",
            data: { url: "./#/?hizli=ziyaret" }
          });
        });
      });
  }).catch(function () { /* çevrimdışı */ });
}

self.addEventListener("periodicsync", function (e) {
  if (e.tag === "mk-yeni-ilan") e.waitUntil(yeniIlanKontrol());
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var hedef = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (pencereler) {
      for (var x = 0; x < pencereler.length; x++) {
        var p = pencereler[x];
        if ("focus" in p) {
          if (p.navigate) p.navigate(hedef).catch(function () { /* yok say */ });
          return p.focus();
        }
      }
      return self.clients.openWindow(hedef);
    })
  );
});
