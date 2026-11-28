/*
 * Memur Kanalı - arayüz
 * Tek dosyalık, bağımlılıksız uygulama. Veri: ayarlar.js içindeki API_URL.
 * Bölümler: yardımcılar · veri · ilanlar · ayrıntı · takvim · duyurular · kayıtlı · menü · olaylar · PWA
 */
(function () {
  "use strict";

  var MK = window.MK;
  var AYAR = window.MK_AYARLAR || {};
  var GUN = 86400000;
  var SAYFA_BOYU = 24;
  var SIRALAMALAR = [["yeni", "En yeni"], ["son", "Son başvurusu yaklaşan"], ["kurum", "Kurum adı (A-Z)"]];
  function bosFiltre() { return { q: "", il: "", kaynaklar: [], bitenler: false }; }

  // ===================================================================
  // Yardımcılar
  // ===================================================================
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function guvenliUrl(u) { return /^https?:\/\//i.test(String(u || "")) ? String(u) : null; }
  /** Bağlantıyı çözer: tam adres olduğu gibi, sitede yayınlanan PDF kopyası ("pdf/ki-….pdf") API adresine göre. */
  function linkCoz(u) {
    if (guvenliUrl(u)) return String(u);
    return /^pdf\/[\w.-]+\.pdf$/.test(String(u || "")) ? MK.apiAdresi(u) : null;
  }
  /** Kaynak sitenin ana sayfası veya genel liste sayfası mı (ilanın kendisi değil)? */
  function anaSayfaMi(u) {
    return /^https?:\/\/kamuilan\.sbb\.gov\.tr\/?$/i.test(u || "") || /iskur\.gov\.tr\/ilanlar\//i.test(u || "") ||
      /^https?:\/\/kariyerkapisi\.gov\.tr\/isealim\/?$/i.test(u || "");
  }

  var depo = {
    al: function (k, v) { try { var x = localStorage.getItem("mk_" + k); return x == null ? v : JSON.parse(x); } catch (e) { return v; } },
    koy: function (k, v) { try { localStorage.setItem("mk_" + k, JSON.stringify(v)); } catch (e) { /* gizli sekme */ } },
    ham: function (k) { try { return localStorage.getItem("mk_" + k); } catch (e) { return null; } },
    hamKoy: function (k, v) { try { localStorage.setItem("mk_" + k, v); } catch (e) { /* yok say */ } }
  };

  var IKON = {
    ara: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    filtre: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    yildiz: '<path d="m12 3.2 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17.1 6.6 20l1-6.1-4.4-4.3 6.1-.9z"/>',
    paylas: '<circle cx="18" cy="5.5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="18.5" r="2.6"/><path d="m8.3 13.3 7.4 4M15.7 6.8l-7.4 4"/>',
    takvim: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    konum: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    kisi: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-3.8-5.9"/>',
    saat: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    dis: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5H10"/>',
    dosya: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    sag: '<path d="m9 6 6 6-6 6"/>',
    canta: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/>',
    duyuru: '<path d="M4 10v4a1 1 0 0 0 1 1h2l5 4V5L7 9H5a1 1 0 0 0-1 1z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.8 6a8.5 8.5 0 0 1 0 12"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    zil: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    indir: '<path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M5 21h14"/>',
    gunes: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
    ay: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>',
    yenile: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    kopyala: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    bilgi: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    kep: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4M21.5 9.5v5"/>',
    cop: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4.5h6V7"/>',
    tik: '<path d="m5 12.5 4.5 4.5L19 7.5"/>'
  };
  function ikon(ad, sinif) { return '<svg class="ikon ' + (sinif || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (IKON[ad] || "") + "</svg>"; }

  // Tarih biçimleri
  var fGun = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long" });
  var fGunYil = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
  var fKisa = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });
  var fAyKisa = new Intl.DateTimeFormat("tr-TR", { month: "short" });
  var fAyYil = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });
  var fSaat = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

  function tarihMetni(ms, saatli) {
    if (ms == null || isNaN(ms)) return "";
    var d = new Date(ms);
    var s = d.getFullYear() === new Date().getFullYear() ? fGun.format(d) : fGunYil.format(d);
    if (saatli !== false && !(d.getHours() === 0 && d.getMinutes() === 0)) s += ", saat " + fSaat.format(d);
    return s;
  }
  function kisaTarih(ms) { return ms == null ? "" : fKisa.format(new Date(ms)); }
  /** "1–7 Aralık" veya "28 Kasım – 4 Aralık" */
  function aralikMetni(bas, bit) {
    if (bas == null) return kisaTarih(bit);
    if (bit == null) return kisaTarih(bas) + " itibarıyla";
    var a = new Date(bas), b = new Date(bit);
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
      return a.getDate() === b.getDate() ? kisaTarih(bas) : a.getDate() + "–" + kisaTarih(bit);
    }
    return kisaTarih(bas) + " – " + kisaTarih(bit);
  }
  function gunFarki(ms) {
    var a = new Date(); a.setHours(0, 0, 0, 0);
    var b = new Date(ms); b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / GUN);
  }
  function oncesi(ms) {
    var fark = Math.max(0, Date.now() - ms) / 60000;
    if (fark < 1) return "az önce";
    if (fark < 60) return Math.round(fark) + " dk önce";
    if (fark < 60 * 24) return Math.round(fark / 60) + " saat önce";
    return Math.round(fark / 1440) + " gün önce";
  }
  function sayiBicim(n) { return new Intl.NumberFormat("tr-TR").format(n); }

  // ===================================================================
  // Durum
  // ===================================================================
  var D = {
    yuklendi: false, hata: null, sonYukleme: 0,
    ilanlar: [], harita: new Map(), meta: null,
    takvim: [], duyurular: [], durum: null,
    filtre: bosFiltre(),
    hizli: "",
    sirala: SIRALAMALAR.some(function (s) { return s[0] === depo.al("sirala", "yeni"); }) ? depo.al("sirala", "yeni") : "yeni",
    goster: SAYFA_BOYU,
    ziyaretYeni: new Set(),
    kayitli: depo.al("kayitli", {}),
    alarmlar: depo.al("alarmlar", []),
    kapatilan: depo.al("kapatilan", []),
    sayfa: null,
    takvimSekme: "yaklasan",
    kurulum: null,
    acikIlan: null,
    detayIcerden: false,
    oncekiOdak: null
  };

  // ===================================================================
  // Veri
  // ===================================================================
  function jsonAl(dosya, onbellek) {
    return fetch(MK.apiAdresi(dosya), { cache: onbellek ? "default" : "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(dosya + " alınamadı (" + r.status + ")");
      return r.json();
    });
  }

  function veriYukle() {
    return Promise.all([
      jsonAl("ilanlar.json"),
      jsonAl("takvim.json").catch(function () { return null; }),
      jsonAl("duyurular.json").catch(function () { return null; }),
      jsonAl("durum.json").catch(function () { return null; })
    ]).then(function (s) {
      ilanlariHazirla(s[0]);
      D.takvim = (s[1] && s[1].etkinlikler) || [];
      D.duyurular = (s[2] && s[2].duyurular) || [];
      D.durum = s[3];
      D.yuklendi = true; D.hata = null; D.sonYukleme = Date.now();
    }).catch(function (e) {
      console.error(e);
      if (!D.yuklendi) D.hata = e;
      throw e;
    });
  }

  function ilanlariHazirla(veri) {
    D.meta = veri || {};
    if (veri.kaynaklar) Object.keys(veri.kaynaklar).forEach(function (k) { MK.KAYNAKLAR[k] = veri.kaynaklar[k]; });
    D.ilanlar = (veri.ilanlar || []).filter(function (i) { return i && i.id && i.baslik; });
    D.harita = new Map();
    D.ilanlar.forEach(function (i) {
      i._bitis = i.bitis ? Date.parse(i.bitis) : null;
      i._bas = i.baslangic ? Date.parse(i.baslangic) : null;
      i._eklenme = i.eklenme ? Date.parse(i.eklenme) : null;
      D.harita.set(i.id, i);
      (i.idler || []).forEach(function (t) { D.harita.set(t, i); });
    });
    ziyaretHesapla();
  }

  /** Son ziyaretten bu yana eklenen ilanları bulur, gördüklerimizi kaydeder. */
  function ziyaretHesapla() {
    var onceki = depo.al("gorulen", null);
    var simdi = Date.now();
    if (onceki && Array.isArray(onceki.idler)) {
      var eski = new Set(onceki.idler);
      D.ilanlar.forEach(function (i) {
        var gorulmus = eski.has(i.id) || (i.idler || []).some(function (x) { return eski.has(x); });
        if (!gorulmus && !(i._bitis && i._bitis < simdi)) D.ziyaretYeni.add(i.id);
      });
    }
    var hepsi = [];
    D.ilanlar.forEach(function (i) { hepsi.push(i.id); (i.idler || []).forEach(function (x) { if (x !== i.id) hepsi.push(x); }); });
    depo.koy("gorulen", { t: simdi, idler: hepsi.slice(0, 6000) });
    swAyarYaz();
  }

  // ===================================================================
  // İlan yardımcıları
  // ===================================================================
  function kaynakAdi(kod) { return MK.KAYNAKLAR[kod] || kod || ""; }
  function bitmisMi(i) { return !!(i._bitis && i._bitis < Date.now()); }
  /** Tarih alanı kaynakta ayrı alan olarak yok, ilan metninden okunduysa true. */
  function metindenMi(i, alan) { return (i.metinden || []).indexOf(alan) !== -1; }
  var METINDEN = "ilan metninden";

  function durumBilgisi(i) {
    var simdi = Date.now();
    if (i._bitis && i._bitis < simdi) return { kod: "bitti", sinif: "d-gri", simge: "⛔", kisa: "Süresi doldu", uzun: "Başvuru süresi doldu" };
    if (i._bas && i._bas > simdi) {
      var g0 = gunFarki(i._bas);
      return { kod: "yakinda", sinif: "d-bilgi", simge: "🗓️", kisa: g0 <= 0 ? "Bugün başlıyor" : g0 === 1 ? "Yarın başlıyor" : g0 + " gün sonra başlıyor", uzun: "Başvurular " + tarihMetni(i._bas) + " başlıyor" };
    }
    // Tarih yoksa "açık" gibi bir durum uydurulmaz
    if (!i._bitis) return { kod: "tarihsiz", sinif: "d-bilgi", simge: "ℹ️", kisa: "", uzun: "Son başvuru tarihi kaynakta belirtilmemiş. Resmi ilanı kontrol edin." };
    var g = gunFarki(i._bitis);
    if (g <= 0) return { kod: "songun", sinif: "d-tehlike", simge: "🔥", kisa: "Bugün son gün!", uzun: "Bugün son başvuru günü!" };
    if (g === 1) return { kod: "songun", sinif: "d-tehlike", simge: "⏰", kisa: "Yarın son gün", uzun: "Yarın son başvuru günü" };
    if (g <= 3) return { kod: "yakin", sinif: "d-uyari", simge: "⏰", kisa: "Son " + g + " gün", uzun: "Başvuru için son " + g + " gün" };
    return { kod: "acik", sinif: g <= 7 ? "d-uyari" : "d-basari", simge: "✅", kisa: g + " gün kaldı", uzun: "Başvurular açık · " + g + " gün kaldı" };
  }

  function basHarfler(ad) {
    var k = String(ad || "").replace(/[()"'.,]/g, " ").split(/\s+/).filter(function (w) { return w.length > 1 && !/^(ve|ile|tc|t\.c)$/i.test(w); });
    return ((k[0] ? k[0][0] : "?") + (k[1] ? k[1][0] : "")).toLocaleUpperCase("tr-TR");
  }
  function renkTonu(s) { var h = 0; s = String(s || ""); for (var x = 0; x < s.length; x++) h = (h * 31 + s.charCodeAt(x)) % 360; return h; }
  function avatarHTML(i, sinif) {
    var ad = i.kurum || kaynakAdi(i.kaynak) || i.baslik;
    var logo = guvenliUrl(i.logo);
    return '<div class="avatar ' + (sinif || "") + '" style="--h:' + renkTonu(ad) + '" aria-hidden="true">' + esc(basHarfler(ad)) +
      (logo ? '<img src="' + esc(logo) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : "") + "</div>";
  }
  function kaynakEtiketi(i) {
    var digerleri = (i.kaynaklar || []).length - 1;
    return '<span class="kaynak" style="--kc:var(--k-' + esc(i.kaynak) + ')">' + esc(kaynakAdi(i.kaynak)) +
      (digerleri > 0 ? ' <span class="arti">+' + digerleri + " kaynak</span>" : "") + "</span>";
  }
  function kayitliAnahtar(i) {
    if (D.kayitli[i.id]) return i.id;
    var ids = i.idler || [];
    for (var x = 0; x < ids.length; x++) if (D.kayitli[ids[x]]) return ids[x];
    return null;
  }
  function yildizHTML(i) {
    var k = !!kayitliAnahtar(i);
    return '<button class="yildiz-btn" type="button" data-ac="kaydet" data-id="' + esc(i.id) + '" aria-pressed="' + k + '" aria-label="' + (k ? "Kaydedilenlerden çıkar" : "İlanı kaydet") + '">' + ikon("yildiz") + "</button>";
  }

  /** Ana sayfa kartı: yalnızca kurum (ilanı veren), ilan adı, kaynak ve son başvuru tarihi. */
  function kartHTML(i) {
    var d = durumBilgisi(i);
    var not = metindenMi(i, "bitis") || (d.kod === "yakinda" && metindenMi(i, "baslangic")) ? ' <small class="metinden">(' + METINDEN + ")</small>" : "";
    var alt;
    if (d.kod === "yakinda") alt = ikon("takvim") + "<span>Başvuru: <b>" + esc(aralikMetni(i._bas, i._bitis)) + "</b>" + not + "</span>";
    else if (i._bitis) alt = ikon("saat") + "<span>Son başvuru: <b>" + esc(tarihMetni(i._bitis, false)) + "</b>" + not + "</span>";
    else alt = ikon("saat") + "<span>Son başvuru tarihi belirtilmemiş</span>";
    return '<article class="kart' + (d.kod === "bitti" ? " bitti" : "") + '" style="--kc:var(--k-' + esc(i.kaynak) + ')">' +
      '<button class="kart-tikla" type="button" data-ac="detay" data-id="' + esc(i.id) + '" aria-label="' + esc(i.baslik + " – ayrıntıları gör") + '"></button>' +
      '<div class="kart-ust">' + avatarHTML(i) +
      '<div class="kart-kurum"><span class="kurum">' + esc(i.kurum || kaynakAdi(i.kaynak)) + "</span>" + kaynakEtiketi(i) + "</div>" +
      yildizHTML(i) + "</div>" +
      '<h3 class="kart-baslik">' + esc(i.baslik) + "</h3>" +
      (i.onemli ? '<div class="kart-etiketler"><span class="etiket yeni">ÖNEMLİ</span></div>' : "") +
      '<div class="kart-alt">' + alt + (d.kisa ? '<span class="kalan ' + d.sinif + '">' + esc(d.kisa) + "</span>" : "") + "</div>" +
      "</article>";
  }

  function iskeletHTML(n) {
    var k = "";
    for (var x = 0; x < (n || 6); x++) {
      k += '<div class="kart iskelet"><div class="kart-ust"><div class="avatar" style="background:var(--bg-2)"></div><div style="flex:1;display:grid;gap:8px"><div class="cubuk" style="width:60%"></div><div class="cubuk" style="width:30%;height:10px"></div></div></div>' +
        '<div class="cubuk" style="height:18px;width:92%"></div><div class="cubuk" style="width:70%"></div><div class="kart-alt"><div class="cubuk" style="width:55%"></div></div></div>';
    }
    return k;
  }

  // ===================================================================
  // Filtreleme
  // ===================================================================
  function filtreliListe() {
    var simdi = Date.now();
    var l = D.ilanlar.filter(function (i) { return MK.filtreUyar(D.filtre, i, simdi); });
    if (D.hizli === "ziyaret") l = l.filter(function (i) { return D.ziyaretYeni.has(i.id); });
    return sirala(l);
  }

  function sirala(l) {
    var S = 8.64e15, k = l.slice();
    if (D.sirala === "son") k.sort(function (a, b) { return (a._bitis || S) - (b._bitis || S); });
    else if (D.sirala === "kurum") k.sort(function (a, b) { return String(a.kurum || a.baslik).localeCompare(String(b.kurum || b.baslik), "tr"); });
    else k.sort(function (a, b) { return (b._eklenme || 0) - (a._eklenme || 0) || (a._bitis || S) - (b._bitis || S); });
    var simdi = Date.now();
    var oncelik = function (i) { return (i._bitis && i._bitis < simdi) ? 2 : (i.onemli ? 0 : 1); };
    return k.map(function (i, x) { return [i, x]; })
      .sort(function (a, b) { return oncelik(a[0]) - oncelik(b[0]) || a[1] - b[1]; })
      .map(function (p) { return p[0]; });
  }

  function aktifFiltreSayisi() {
    var f = D.filtre, n = 0;
    if (f.il) n++; if (f.bitenler) n++;
    n += f.kaynaklar.length;
    return n;
  }

  function filtreleriTemizle() {
    D.filtre = bosFiltre();
    D.hizli = ""; D.goster = SAYFA_BOYU;
    var a = $("#ara"); if (a) a.value = "";
  }

  // ===================================================================
  // Sayfa: İlanlar
  // ===================================================================
  /** Listede ilanı bulunan kaynakların adları (yalnızca gerçekten veri gelen kaynaklar). */
  function ilanKaynaklari() {
    var kodlar = {};
    D.ilanlar.forEach(function (i) { (i.kaynaklar || [{ kod: i.kaynak }]).forEach(function (k) { if (k.kod !== "manuel") kodlar[k.kod] = 1; }); });
    return Object.keys(kodlar).map(kaynakAdi).sort(function (a, b) { return a.localeCompare(b, "tr"); });
  }

  /** Sade özet: ilan sayısı, verinin geldiği kaynaklar, son kontrol zamanı. Tahmini metrik yok. */
  function heroHTML() {
    var aktif = D.ilanlar.filter(function (i) { return !bitmisMi(i); });
    var durum = D.durum || {};
    var kontrol = durum.son_kontrol ? Date.parse(durum.son_kontrol) : null;
    var adlar = ilanKaynaklari();
    return '<section class="hero" aria-label="Özet"><div class="hero-desen"></div>' +
      "<h1><b>" + sayiBicim(aktif.length) + "</b> kamu ilanı</h1>" +
      (adlar.length ? '<p class="hero-alt">Kaynak: ' + esc(adlar.join(", ")) + ". Bir ilana dokunun; ilanın ayrıntıları ve resmi sayfasının bağlantısı açılır.</p>" : "") +
      (kontrol ? '<p class="hero-guncel"><span class="nabiz"></span>Son kontrol: ' + esc(fSaat.format(new Date(kontrol))) + " (" + esc(oncesi(kontrol)) + ")</p>" : "") +
      "</section>";
  }

  function seritlerHTML() {
    var h = "";
    var onemli = D.duyurular.filter(function (d) { return d.kaynak === "manuel" && d.onemli && D.kapatilan.indexOf(d.id) === -1; })[0];
    if (onemli) {
      h += '<div class="serit duyuru"><span class="serit-ikon">📣</span><div class="serit-govde"><b>' + esc(onemli.baslik) + "</b>" +
        (onemli.metin ? "<p>" + esc(onemli.metin.length > 220 ? onemli.metin.slice(0, 219) + "…" : onemli.metin) + "</p>" : "") +
        (guvenliUrl(onemli.url) ? '<p><a href="' + esc(onemli.url) + '" target="_blank" rel="noopener noreferrer">Ayrıntılar →</a></p>' : "") +
        '</div><button class="ikon-btn" type="button" data-ac="duyuru-kapat" data-id="' + esc(onemli.id) + '" aria-label="Duyuruyu kapat">' + ikon("x") + "</button></div>";
    }
    if (D.ziyaretYeni.size > 0) {
      h += '<div class="serit yeni"><span class="serit-ikon">✨</span><div class="serit-govde"><b>Son ziyaretinizden bu yana ' + D.ziyaretYeni.size + " yeni ilan eklendi</b></div>" +
        '<button class="btn hafif" type="button" data-ac="hizli" data-k="ziyaret">Göster</button></div>';
    }
    return h;
  }

  function ciz_ilanlar() {
    var ana = $("#icerik");
    if (!D.yuklendi) {
      ana.innerHTML = D.hata ? hataHTML() : '<div class="liste" style="margin-top:8px">' + iskeletHTML(6) + "</div>";
      return;
    }
    ana.innerHTML = heroHTML() +
      '<div class="ilan-ust" style="margin-top:16px">' + seritlerHTML() +
      '<div class="arama" role="search">' + ikon("ara") +
      '<label class="gizli" for="ara">İlan ara</label>' +
      '<input id="ara" type="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="Meslek, kurum veya şehir ara…" value="' + esc(D.filtre.q) + '">' +
      '<button class="ikon-btn temizle" type="button" data-ac="ara-temizle" aria-label="Aramayı temizle"' + (D.filtre.q ? "" : " hidden") + ">" + ikon("x") + "</button></div></div>" +
      '<div class="ilan-duzen">' +
      '<aside class="filtre-panel" id="filtrePanel" aria-label="Filtreler"></aside>' +
      '<section aria-label="İlan listesi">' +
      '<div class="arac"><span class="sonuc-sayisi" id="sonucSayisi" aria-live="polite"></span>' +
      '<button class="btn filtre-ac-btn" type="button" data-ac="panel-ac" id="filtreAcBtn">' + ikon("filtre") + " Filtrele</button>" +
      '<label class="gizli" for="sirala">Sıralama</label><select class="secim" id="sirala" data-ac="sirala">' +
      SIRALAMALAR.map(function (o) {
        return '<option value="' + o[0] + '"' + (D.sirala === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("") + "</select></div>" +
      '<div class="etkin-filtreler" id="etkinFiltreler" style="margin-top:12px"></div>' +
      '<div class="liste" id="liste" style="margin-top:14px"></div>' +
      '<div style="text-align:center;margin-top:16px"><button class="btn daha-fazla" type="button" id="dahaFazla" data-ac="daha" hidden></button></div>' +
      "</section></div>" + altBilgiHTML();
    filtrePaneliCiz();
    listeyiGuncelle();
  }

  function listeyiGuncelle() {
    var liste = filtreliListe();
    var ss = $("#sonucSayisi");
    if (ss) ss.innerHTML = "<b>" + sayiBicim(liste.length) + "</b> ilan";
    var fb = $("#filtreAcBtn");
    if (fb) { var n = aktifFiltreSayisi(); fb.innerHTML = ikon("filtre") + " Filtrele" + (n ? ' <span class="rozet">' + n + "</span>" : ""); }
    etkinFiltrelerCiz();
    var kap = $("#liste");
    if (!kap) return;
    kap.innerHTML = liste.length ? liste.slice(0, D.goster).map(kartHTML).join("") : bosHTML();
    var df = $("#dahaFazla");
    if (df) {
      var kalan = liste.length - D.goster;
      df.hidden = kalan <= 0;
      df.textContent = "Daha fazla göster (" + kalan + " ilan daha)";
    }
    var pg = $("#panelGoster");
    if (pg) pg.textContent = sayiBicim(liste.length) + " ilanı göster";
    var at = $("#araTemizle") || $('[data-ac="ara-temizle"]');
    if (at) at.hidden = !D.filtre.q;
  }

  function etkinFiltrelerCiz() {
    var kap = $("#etkinFiltreler");
    if (!kap) return;
    var f = D.filtre, p = [];
    function pill(alan, deger, metin) {
      return '<button class="etkin" type="button" data-ac="etkin-sil" data-alan="' + alan + '" data-deger="' + esc(deger) + '" aria-label="' + esc(metin) + ' filtresini kaldır">' + esc(metin) + ikon("x") + "</button>";
    }
    if (D.hizli === "ziyaret") p.push(pill("hizli", "", "✨ Son ziyaretimden beri eklenenler"));
    if (f.il) p.push(pill("il", f.il, "📍 " + f.il));
    f.kaynaklar.forEach(function (k) { p.push(pill("kaynaklar", k, kaynakAdi(k))); });
    if (f.bitenler) p.push(pill("bitenler", "", "Süresi dolanlar dahil"));
    if (p.length || f.q) p.push('<button class="btn sade" type="button" data-ac="filtre-temizle" style="min-height:36px">Tümünü temizle</button>');
    kap.innerHTML = p.join("");
    kap.hidden = !p.length;
  }

  function filtrePaneliCiz() {
    var kap = $("#filtrePanel");
    if (!kap) return;
    var simdi = Date.now();
    var ilSay = {};
    D.ilanlar.forEach(function (i) { if (bitmisMi(i)) return; (i.iller || []).forEach(function (il) { ilSay[il] = (ilSay[il] || 0) + 1; }); });
    var iller = Object.keys(ilSay).sort(function (a, b) {
      if (a === "Türkiye Geneli") return -1; if (b === "Türkiye Geneli") return 1;
      return a.localeCompare(b, "tr");
    });
    var kaynaklar = {};
    D.ilanlar.forEach(function (i) { (i.kaynaklar || [{ kod: i.kaynak }]).forEach(function (k) { kaynaklar[k.kod] = 1; }); });
    var f = D.filtre;
    kap.innerHTML = '<div class="panel-ic">' +
      '<div class="panel-baslik"><h2>Filtrele ve sırala</h2><button class="ikon-btn panel-kapat" type="button" data-ac="panel-kapat" aria-label="Filtreleri kapat">' + ikon("x") + "</button></div>" +
      '<div class="grup sadece-mobil"><h3>Sıralama</h3><div class="secenekler">' +
      SIRALAMALAR.map(function (o) { return '<label class="secenek"><input type="radio" name="siraSecim" data-ac="sirala" value="' + o[0] + '"' + (D.sirala === o[0] ? " checked" : "") + "><span>" + o[1] + "</span></label>"; }).join("") +
      "</div></div>" +
      '<div class="grup"><h3><label for="filtreIl">Şehir</label></h3><select class="secim" id="filtreIl" data-ac="il"><option value="">Tüm Türkiye</option>' +
      iller.map(function (il) { return '<option value="' + esc(il) + '"' + (f.il === il ? " selected" : "") + ">" + esc(il) + " (" + ilSay[il] + ")</option>"; }).join("") +
      '</select><p style="font-size:.84rem;color:var(--yazi-3);margin-top:6px">Şehir yalnızca kaynağın şehir bilgisi verdiği ilanlarda vardır. Şehir seçince “Türkiye Geneli” ilanlar da gösterilir.</p></div>' +
      '<div class="grup"><h3>İlan kaynağı</h3><div class="secenekler">' +
      Object.keys(kaynaklar).map(function (k) { return '<label class="secenek"><input type="checkbox" data-ac="kaynak" value="' + esc(k) + '"' + (f.kaynaklar.indexOf(k) !== -1 ? " checked" : "") + '><span><i class="nokta" style="--kc:var(--k-' + esc(k) + ')"></i>' + esc(kaynakAdi(k)) + "</span></label>"; }).join("") +
      "</div></div>" +
      '<div class="grup"><h3>Diğer</h3>' +
      '<label class="anahtar"><span>Süresi dolanları da göster<small>Son 2 günde kapanan ilanlar</small></span><input type="checkbox" data-ac="bitenler"' + (f.bitenler ? " checked" : "") + "></label></div>" +
      '<button class="btn hafif tam" type="button" data-ac="alarm-ekle">' + ikon("zil") + " Bu aramayı takip et</button>" +
      "</div>" +
      '<div class="panel-alt"><button class="btn" type="button" data-ac="filtre-temizle">Temizle</button><button class="btn ana goster" type="button" data-ac="panel-kapat" id="panelGoster">Göster</button></div>';
  }

  function bosHTML() {
    var filtreVar = D.filtre.q || D.hizli || aktifFiltreSayisi();
    return '<div class="bos"><div class="simge">🔎</div><h3>' + (filtreVar ? "Aramanıza uygun ilan bulunamadı" : "Şu an gösterilecek ilan yok") + "</h3>" +
      "<p>" + (filtreVar ? "Farklı bir kelime deneyin ya da filtreleri temizleyin. Bu aramayı takip ederseniz yeni ilan geldiğinde size gösteririz." : "Kaynaklar düzenli olarak otomatik kontrol ediliyor.") + "</p>" +
      (filtreVar ? '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn ana" type="button" data-ac="filtre-temizle">Filtreleri temizle</button><button class="btn" type="button" data-ac="alarm-ekle">' + ikon("zil") + " Bu aramayı takip et</button></div>" : "") +
      "</div>";
  }

  function hataHTML() {
    return '<div class="bos" style="margin-top:12px"><div class="simge">📡</div><h3>İlanlar yüklenemedi</h3><p>İnternet bağlantınızı kontrol edip tekrar deneyin. Sorun sürerse birkaç dakika sonra tekrar bakın.</p>' +
      '<button class="btn ana" type="button" data-ac="yenile">' + ikon("yenile") + " Tekrar dene</button></div>";
  }

  function altBilgiHTML() {
    return '<footer class="alt-bilgi"><p>Memur Kanalı resmi bir kurum sitesi değildir. İlanlar Kariyer Kapısı, ilan.gov.tr, Kamu İlan, İŞKUR, Yerel Yönetimler ve ÖSYM\'nin herkese açık sayfalarından otomatik derlenir; başvurmadan önce resmi ilanı mutlaka kontrol edin.</p>' +
      '<p style="margin-top:8px"><a href="' + esc(MK.apiAdresi("rss.xml")) + '">RSS ile takip et</a> · <a href="#/menu">Hakkında</a></p></footer>';
  }

  // ===================================================================
  // İlan ayrıntısı (çekmece)
  // ===================================================================
  function gTakvimLinki(baslik, bas, bit, aciklama) {
    var f = function (d) { return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); };
    return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent(baslik) +
      "&dates=" + f(bas) + "/" + f(bit) + "&details=" + encodeURIComponent(aciklama || "");
  }

  function icsIndir(dosyaAdi, olaylar) {
    var f = function (d) { return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); };
    var k = function (s) { return String(s || "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, function (m) { return "\\" + m; }); };
    var s = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Memur Kanali//TR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    olaylar.forEach(function (o) {
      s.push("BEGIN:VEVENT", "UID:" + o.uid + "@memurkanali", "DTSTAMP:" + f(Date.now()), "DTSTART:" + f(o.bas), "DTEND:" + f(o.bit),
        "SUMMARY:" + k(o.baslik), "DESCRIPTION:" + k(o.aciklama));
      if (o.url) s.push("URL:" + o.url);
      s.push("BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:" + k("Hatırlatma: " + o.baslik), "END:VALARM", "END:VEVENT");
    });
    s.push("END:VCALENDAR");
    var blob = new Blob([s.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = dosyaAdi;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    toast("Takvim dosyası indirildi. Açınca takviminize eklenir.");
  }

  function siteAdresi(hash) { return location.href.split("#")[0] + hash; }

  function ilanBul(id) { return D.harita.get(id) || null; }

  /** Alt düğmeler: her zaman ilanın kendisine (ilan sayfası / resmi PDF), ana sayfaya asla. */
  function birincilLinkler(i) {
    var basvuru = guvenliUrl(i.basvuru_url), pdf = linkCoz(i.pdf);
    var url = guvenliUrl(i.url);
    if (url && anaSayfaMi(url)) url = null;
    var ilan = url ? { ad: "Resmi ilanı aç", href: url } : pdf ? { ad: "Resmi ilanı aç (PDF)", href: pdf } : null;
    var ek = pdf && url && pdf !== url ? { ad: "PDF ilanı", href: pdf } : null;
    if (basvuru && (!ilan || basvuru !== ilan.href)) return { birinci: { ad: "Başvuru yap", href: basvuru }, ikinci: ilan };
    return { birinci: ilan, ikinci: ek };
  }

  function detayHTML(i) {
    var d = durumBilgisi(i);
    // Yalnızca kaynağın verdiği ilan türü (ör. "A Grubu Kadro Alımları", "Kamu İşçi Alımı")
    var etiket = [];
    if (i.onemli) etiket.push('<span class="etiket yeni">ÖNEMLİ</span>');
    if (i.alt_tur) etiket.push('<span class="etiket' + (/iptal/i.test(i.alt_tur) ? " iptal" : "") + '">' + esc(i.alt_tur) + "</span>");

    var bilgiler = [];
    function b(ad, deger, genis) { if (deger) bilgiler.push('<div class="bilgi' + (genis ? " genis" : "") + '"><dt>' + ad + "</dt><dd>" + deger + "</dd></div>"); }
    function notlu(alan, metin) { return metin + (metindenMi(i, alan) ? ' <small class="metinden">(' + METINDEN + ")</small>" : ""); }
    b("Başvuru başlangıcı", i._bas ? notlu("baslangic", esc(tarihMetni(i._bas))) : "");
    b("Son başvuru", i._bitis ? notlu("bitis", esc(tarihMetni(i._bitis))) : "Belirtilmemiş");
    b("Kontenjan", i.kontenjan ? sayiBicim(i.kontenjan) + " kişi" : "");
    b("Yer", i.iller && i.iller.length ? esc(i.iller.join(", ")) : "", true);
    b("Yayınlanma", i.yayin ? esc(kisaTarih(Date.parse(i.yayin))) : "");

    // Her kaynak için ilanın kendi sayfası ve/veya resmi PDF'i (ana sayfa / genel liste bağlantısı verilmez)
    var kaynakSatirlari = (i.kaynaklar && i.kaynaklar.length ? i.kaynaklar : [{ kod: i.kaynak, url: i.url, pdf: i.pdf }]).map(function (k) {
      var s = "", url = guvenliUrl(k.url), pdf = linkCoz(k.pdf);
      if (url && anaSayfaMi(url)) url = null;
      if (url && url !== pdf) s += '<a class="kaynak-satir" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer"><span class="kaynak" style="--kc:var(--k-' + esc(k.kod) + ')">' + esc(kaynakAdi(k.kod)) + "</span> ilan sayfası" + ikon("dis") + "</a>";
      if (pdf) s += '<a class="kaynak-satir" href="' + esc(pdf) + '" target="_blank" rel="noopener noreferrer">' + ikon("dosya") + " " + esc(kaynakAdi(k.kod)) + " · resmi ilan (PDF)" + ikon("dis") + "</a>";
      return s;
    }).join("");

    var takvimBolum = "";
    if (i._bitis && !bitmisMi(i)) {
      var acik = (i.kurum ? i.kurum + "\n" : "") + siteAdresi("#/ilan/" + encodeURIComponent(i.id));
      takvimBolum = '<div class="bolum"><h3>' + ikon("takvim") + " Son günü unutmayın</h3><div class=\"aksiyonlar iki\">" +
        '<a class="btn" href="' + esc(gTakvimLinki("Son başvuru: " + i.baslik, i._bitis - 3600000, i._bitis, acik)) + '" target="_blank" rel="noopener noreferrer">Google Takvim</a>' +
        '<button class="btn" type="button" data-ac="ics" data-id="' + esc(i.id) + '">Telefon takvimi</button></div></div>';
    }
    var kamuIlanNotu = i.kaynak === "kamuilan" || (i.kaynaklar || []).some(function (k) { return k.kod === "kamuilan"; })
      ? '<p class="not" style="margin-top:10px">Kamu İlan sitesi ilanlara doğrudan bağlantı verilmesine izin vermediği için ilanın resmi PDF\'i Kamu İlan\'dan alınıp burada olduğu gibi sunulur.</p>' : "";

    return '<div class="d-kafa">' + avatarHTML(i, "buyuk") + '<div style="min-width:0"><div class="kurum">' + esc(i.kurum || kaynakAdi(i.kaynak)) + "</div>" +
      (i.birim ? '<div style="color:var(--yazi-3);font-size:.9rem">' + esc(i.birim) + "</div>" : "") + kaynakEtiketi(i) + "</div></div>" +
      '<h2 class="d-baslik" id="dBaslik">' + esc(i.baslik) + "</h2>" +
      (etiket.length ? '<div class="kart-etiketler">' + etiket.join("") + "</div>" : "") +
      '<div class="durum-kutu ' + d.sinif + '"><span class="buyuk" aria-hidden="true">' + d.simge + "</span><div>" + esc(d.uzun) +
      (i._bitis && d.kod !== "bitti" ? "<small>Son başvuru: " + esc(tarihMetni(i._bitis)) + "</small>" : "") +
      ((i.metinden || []).length ? "<small>Bu tarih kaynak sitede ayrı bir alan olarak yok; ilan metninden okundu. Başvurmadan önce resmi ilandan doğrulayın.</small>" : "") +
      "</div></div>" +
      '<dl class="bilgi-izgara" style="margin:0">' + bilgiler.join("") + "</dl>" +
      takvimBolum +
      '<div class="bolum" id="dPozisyonlar" hidden></div>' +
      '<div class="bolum" id="dMetinBolum"' + ((i.detaylar || []).length ? "" : " hidden") + '><h3>' + ikon("dosya") + ' İlan metni</h3><div class="metin" id="dMetin"><div class="cubuk iskelet" style="height:12px;margin:6px 0"></div><div class="cubuk" style="height:12px;width:80%"></div></div></div>' +
      '<div class="bolum" id="dLinkler" hidden></div>' +
      '<div class="bolum"><h3>' + ikon("dis") + ' Resmi kaynaklar</h3><div class="kaynak-listesi">' + kaynakSatirlari + "</div>" + kamuIlanNotu + "</div>" +
      '<div class="bolum" id="paylasMenu" hidden><h3>' + ikon("paylas") + ' Paylaş</h3><div class="paylas-menu">' +
      '<a class="btn" target="_blank" rel="noopener noreferrer" id="pWhatsapp">💬 WhatsApp</a><a class="btn" target="_blank" rel="noopener noreferrer" id="pTelegram">✈️ Telegram</a>' +
      '<button class="btn" type="button" data-ac="kopyala" data-id="' + esc(i.id) + '">' + ikon("kopyala") + " Kopyala</button></div></div>" +
      '<p class="not">Bu bilgiler ' + esc((i.kaynaklar || [{ kod: i.kaynak }]).map(function (k) { return kaynakAdi(k.kod); }).join(", ")) +
      " kaynağından otomatik olarak alınmıştır. Başvurmadan önce lütfen resmi ilan metnini kontrol edin.</p>";
  }

  function metinHTML(m) {
    return String(m || "").split(/\n{2,}/).map(function (p) {
      var g = esc(p).replace(/(https?:\/\/[^\s<>"']+)/g, function (u) {
        var temiz = u.replace(/[.,;:)\]]+$/, ""), kalan = u.slice(temiz.length);
        return '<a href="' + temiz + '" target="_blank" rel="noopener noreferrer">' + temiz + "</a>" + kalan;
      });
      return "<p>" + g.replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }

  function pozisyonlarHTML(poz) {
    return "<h3>" + ikon("kisi") + " Kadrolar ve kontenjanlar</h3>" + poz.map(function (p) {
      var kont = (p.kontenjanlar || []).map(function (k) { return esc(k.il || "") + ": " + k.sayi + " kişi"; }).join(" · ");
      return '<div class="pozisyon"><b>' + esc(p.baslik || p.unvan || "Kadro") + "</b>" +
        (kont ? '<div class="alt">📍 ' + kont + "</div>" : "") +
        (p.asamalar && p.asamalar.length ? '<div class="alt">📝 Değerlendirme: ' + esc(p.asamalar.join(", ")) + "</div>" : "") +
        (p.metin ? "<details><summary>Aranan şartlar</summary><div class=\"metin\" style=\"margin-top:8px\">" + metinHTML(p.metin) + "</div></details>" : "") +
        "</div>";
    }).join("");
  }

  function detayVerisiYukle(i) {
    var ids = (i.detaylar || []).slice(0, 3);
    if (!ids.length) return;
    Promise.all(ids.map(function (id) { return jsonAl("detay/" + encodeURIComponent(id) + ".json", true).catch(function () { return null; }); }))
      .then(function (liste) {
        if (D.acikIlan !== i.id) return;
        liste = liste.filter(Boolean);
        var metinli = liste.filter(function (x) { return x.metin; })[0];
        var notlu = liste.filter(function (x) { return x.not; })[0];
        var mk = $("#dMetin"), bolum = $("#dMetinBolum");
        if (mk) {
          if (metinli) {
            mk.innerHTML = metinHTML(metinli.metin);
            if (metinli.metin.length > 1400) {
              mk.classList.add("kisa");
              mk.insertAdjacentHTML("afterend", '<button class="btn hafif tam" type="button" data-ac="metin-ac" style="margin-top:10px">Metnin tamamını oku</button>');
            }
          } else if (notlu) {
            mk.innerHTML = "<p>" + esc(notlu.not) + "</p>";
          } else if (bolum) {
            bolum.hidden = true;
          }
        }
        var poz = liste.filter(function (x) { return x.pozisyonlar && x.pozisyonlar.length; })[0];
        var pk = $("#dPozisyonlar");
        if (poz && pk) { pk.innerHTML = pozisyonlarHTML(poz.pozisyonlar); pk.hidden = false; }
        var linkler = [];
        liste.forEach(function (x) { (x.linkler || []).forEach(function (l) { if (guvenliUrl(l) && linkler.indexOf(l) === -1) linkler.push(l); }); });
        var lk = $("#dLinkler");
        if (linkler.length && lk) {
          lk.innerHTML = "<h3>" + ikon("dis") + ' İlan metnindeki bağlantılar</h3><div class="kaynak-listesi">' + linkler.slice(0, 6).map(function (l) {
            return '<a class="kaynak-satir" href="' + esc(l) + '" target="_blank" rel="noopener noreferrer" style="font-weight:600;overflow-wrap:anywhere">' + esc(l.replace(/^https?:\/\//, "")) + ikon("dis") + "</a>";
          }).join("") + "</div>";
          lk.hidden = false;
        }
      });
  }

  function detayAc(id, icerden) {
    var i = ilanBul(id) || D.kayitli[id];
    if (!i) {
      if (D.yuklendi) { toast("Bu ilan artık listede değil, süresi dolmuş olabilir."); rotaGit("#/", true); }
      return;
    }
    if (i._bitis === undefined) { i = Object.assign({}, i); i._bitis = i.bitis ? Date.parse(i.bitis) : null; i._bas = i.baslangic ? Date.parse(i.baslangic) : null; }
    D.acikIlan = i.id;
    if (icerden) D.detayIcerden = true;
    var c = $("#cekmece");
    if (!c.classList.contains("acik")) D.oncekiOdak = document.activeElement;
    $("#cekmeceAraclar").innerHTML = yildizHTML(i) + '<button class="ikon-btn" type="button" data-ac="paylas" data-id="' + esc(i.id) + '" aria-label="Paylaş">' + ikon("paylas") + "</button>";
    $("#cekmeceGovde").innerHTML = detayHTML(i);
    $("#cekmeceGovde").scrollTop = 0;
    var l = birincilLinkler(i);
    $("#cekmeceAlt").innerHTML =
      (l.ikinci ? '<a class="btn" href="' + esc(l.ikinci.href) + '" target="_blank" rel="noopener noreferrer">' + esc(l.ikinci.ad) + "</a>" : "") +
      (l.birinci ? '<a class="btn ana buyuk" href="' + esc(l.birinci.href) + '" target="_blank" rel="noopener noreferrer">' + esc(l.birinci.ad) + " " + ikon("dis") + "</a>" : "");
    $("#cekmeceAlt").hidden = !l.birinci;
    c.classList.add("acik"); c.setAttribute("aria-hidden", "false");
    $(".arka-perde", c).classList.add("acik");
    document.body.classList.add("kilitli");
    setTimeout(function () { var k = $('#cekmece [data-ac="kapat"].ikon-btn'); if (k) k.focus({ preventScroll: true }); }, 60);
    document.title = i.baslik + " – Memur Kanalı";
    detayVerisiYukle(i);
  }

  function detayKapat() {
    var c = $("#cekmece");
    if (!c.classList.contains("acik")) return;
    c.classList.remove("acik"); c.setAttribute("aria-hidden", "true");
    $(".arka-perde", c).classList.remove("acik");
    document.body.classList.remove("kilitli");
    D.acikIlan = null;
    document.title = "Memur Kanalı – Tüm Kamu İlanları Tek Yerde";
    if (D.oncekiOdak && D.oncekiOdak.focus && document.contains(D.oncekiOdak)) D.oncekiOdak.focus({ preventScroll: true });
  }

  function detayKapatIstegi() {
    if (/^#\/?ilan\//.test(location.hash)) {
      if (D.detayIcerden) { D.detayIcerden = false; history.back(); }
      else rotaGit("#/" + (D.sayfa && D.sayfa !== "ilanlar" ? D.sayfa : ""), true);
    } else detayKapat();
  }

  function paylas(i) {
    var url = siteAdresi("#/ilan/" + encodeURIComponent(i.id));
    var metin = i.baslik + (i.kurum ? " – " + i.kurum : "") + (i._bitis ? "\nSon başvuru: " + tarihMetni(i._bitis) : "");
    if (navigator.share) {
      navigator.share({ title: i.baslik, text: metin, url: url }).catch(function (e) { if (!e || e.name !== "AbortError") paylasMenusu(metin, url); });
      return;
    }
    paylasMenusu(metin, url);
  }
  function paylasMenusu(metin, url) {
    var m = $("#paylasMenu");
    if (!m) return;
    $("#pWhatsapp").href = "https://wa.me/?text=" + encodeURIComponent(metin + "\n" + url);
    $("#pTelegram").href = "https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(metin);
    m.hidden = false;
    m.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function kopyala(metin) {
    var bitti = function () { toast("Bağlantı kopyalandı ✔"); };
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(metin).then(bitti, function () { prompt("Bağlantıyı kopyalayın:", metin); }); }
    else prompt("Bağlantıyı kopyalayın:", metin);
  }

  function kaydetDegistir(id) {
    var i = ilanBul(id) || D.kayitli[id];
    if (!i) return;
    var anahtar = kayitliAnahtar(i);
    if (anahtar) { delete D.kayitli[anahtar]; toast("Kaydedilenlerden çıkarıldı"); }
    else {
      D.kayitli[i.id] = {
        id: i.id, baslik: i.baslik, kurum: i.kurum, kaynak: i.kaynak, bitis: i.bitis, baslangic: i.baslangic, metinden: i.metinden,
        yayin: i.yayin, url: i.url, basvuru_url: i.basvuru_url, pdf: i.pdf, iller: i.iller, kontenjan: i.kontenjan, logo: i.logo, kayit: new Date().toISOString()
      };
      toast("İlan kaydedildi ⭐ “Kayıtlı” sekmesinden ulaşabilirsiniz.");
    }
    depo.koy("kayitli", D.kayitli);
    var durum = !anahtar;
    $$('.yildiz-btn[data-id="' + (window.CSS && CSS.escape ? CSS.escape(i.id) : i.id) + '"]').forEach(function (b) {
      b.setAttribute("aria-pressed", String(durum));
      b.setAttribute("aria-label", durum ? "Kaydedilenlerden çıkar" : "İlanı kaydet");
    });
    navCiz();
    if (D.sayfa === "kayitli" && !$("#cekmece").classList.contains("acik")) ciz_kayitli();
  }

  // ===================================================================
  // Sayfa: Takvim (ÖSYM)
  // ===================================================================
  var ASAMA = {
    on_basvuru: { ad: "Ön başvuru", renk: "var(--bilgi)" },
    basvuru: { ad: "Başvuru", renk: "var(--ana)" },
    gec_basvuru: { ad: "Geç başvuru", renk: "var(--uyari)" },
    sinav: { ad: "Sınav günü", renk: "var(--k-osym)" },
    on_sonuc: { ad: "Ön başvuru sonucu", renk: "var(--basari)" },
    sonuc: { ad: "Sonuç", renk: "var(--basari)" },
    tercih: { ad: "Tercih", renk: "var(--k-kamuilan)" }
  };
  var ACIK_ASAMALAR = ["on_basvuru", "basvuru", "gec_basvuru", "tercih"];

  function etkinlikler() {
    return D.takvim.map(function (e) {
      var x = Object.assign({}, e);
      x._bas = Date.parse(e.baslangic); x._bit = Date.parse(e.bitis || e.baslangic);
      return x;
    });
  }

  function etkinlikHTML(e) {
    var simdi = Date.now(), a = ASAMA[e.asama] || { ad: e.asama, renk: "var(--ana)" };
    var devam = e._bas <= simdi && e._bit >= simdi;
    var gun = new Date(devam ? simdi : e._bas);
    var tekGun = gunFarki(e._bas) === gunFarki(e._bit);
    var aralik = tekGun ? tarihMetni(e._bas) : aralikMetni(e._bas, e._bit);
    var kalan;
    if (tekGun) {
      var g0 = gunFarki(e._bas);
      kalan = g0 < 0 ? "Tamamlandı" : g0 === 0 ? "Bugün" : g0 === 1 ? "Yarın" : g0 + " gün sonra";
    } else if (devam) {
      var g = gunFarki(e._bit);
      kalan = g <= 0 ? "Bugün son gün!" : "Devam ediyor · son " + g + " gün";
    } else if (e._bas > simdi) {
      var g2 = gunFarki(e._bas);
      kalan = g2 <= 0 ? "Bugün başlıyor" : g2 === 1 ? "Yarın başlıyor" : g2 + " gün sonra başlıyor";
    } else kalan = "Tamamlandı";
    return '<article class="etkinlik" style="--ec:' + a.renk + '">' +
      '<div class="e-tarih" aria-hidden="true"><b>' + gun.getDate() + "</b><span>" + esc(devam ? "Bugün" : fAyKisa.format(gun)) + "</span></div>" +
      '<div class="e-govde"><span class="asama">' + esc(a.ad) + "</span>" +
      '<span class="ad">' + esc(e.ad) + "</span>" + (e.uzun ? '<span class="uzun">' + esc(e.uzun) + "</span>" : "") +
      '<span class="zaman">' + esc(aralik) + " · <b>" + esc(kalan) + "</b></span></div>" +
      '<div class="e-sag"><a class="ikon-btn" href="' + esc(guvenliUrl(e.url) || "https://www.osym.gov.tr") + '" target="_blank" rel="noopener noreferrer" aria-label="ÖSYM sayfasını aç">' + ikon("dis") + "</a>" +
      (e._bit >= simdi ? '<button class="ikon-btn" type="button" data-ac="etkinlik-ics" data-id="' + esc(e.id) + '" aria-label="Takvime ekle">' + ikon("takvim") + "</button>" : "") +
      "</div></article>";
  }

  function ciz_takvim() {
    var ana = $("#icerik");
    if (!D.yuklendi) { ana.innerHTML = D.hata ? hataHTML() : iskeletHTML(4); return; }
    var simdi = Date.now();
    var hepsi = etkinlikler();
    var secim = {
      yaklasan: function (e) { return e._bit >= simdi; },
      acik: function (e) { return ACIK_ASAMALAR.indexOf(e.asama) !== -1 && e._bas <= simdi && e._bit >= simdi; },
      gecmis: function (e) { return e._bit < simdi; }
    };
    var liste = hepsi.filter(secim[D.takvimSekme] || secim.yaklasan);
    liste.sort(function (a, b) {
      var da = a._bas <= simdi && a._bit >= simdi ? simdi : a._bas, db = b._bas <= simdi && b._bit >= simdi ? simdi : b._bas;
      return D.takvimSekme === "gecmis" ? b._bas - a._bas : (a._bit >= simdi && a._bas <= simdi ? a._bit : da) - (b._bit >= simdi && b._bas <= simdi ? b._bit : db);
    });
    var gruplar = [], son = null;
    liste.forEach(function (e) {
      var ref = e._bas <= simdi && e._bit >= simdi ? simdi : e._bas;
      var ad = (e._bas <= simdi && e._bit >= simdi) ? "Şu an devam edenler" : fAyYil.format(new Date(ref));
      if (!son || son.ad !== ad) { son = { ad: ad, liste: [] }; gruplar.push(son); }
      son.liste.push(e);
    });
    var sekmeler = [["yaklasan", "Yaklaşan"], ["acik", "Başvurusu açık"], ["gecmis", "Geçmiş"]];
    ana.innerHTML = '<div class="sayfa-basligi"><div><h1>📅 Sınav Takvimi</h1><p>ÖSYM başvuru, sınav, sonuç ve tercih tarihleri</p></div></div>' +
      '<div class="bolumlu" role="group" aria-label="Takvim görünümü">' + sekmeler.map(function (s) {
        return '<button type="button" data-ac="takvim-sekme" data-k="' + s[0] + '" aria-pressed="' + (D.takvimSekme === s[0]) + '">' + s[1] + "</button>";
      }).join("") + "</div>" +
      (gruplar.length ? gruplar.map(function (g) {
        return '<section class="takvim-ay"><h2>' + esc(g.ad) + "</h2>" + g.liste.map(etkinlikHTML).join("") + "</section>";
      }).join("") : '<div class="bos" style="margin-top:18px"><div class="simge">🗓️</div><h3>Bu görünümde etkinlik yok</h3><p>Başka bir sekme seçebilirsiniz.</p></div>') +
      '<p class="not">Tarihler ÖSYM sınav takviminden otomatik alınır. Başvurular ÖSYM Aday İşlemleri Sistemi (ais.osym.gov.tr) üzerinden yapılır.</p>' + altBilgiHTML();
  }

  // ===================================================================
  // Sayfa: Duyurular
  // ===================================================================
  function ciz_duyurular() {
    var ana = $("#icerik");
    if (!D.yuklendi) { ana.innerHTML = D.hata ? hataHTML() : iskeletHTML(3); return; }
    var manuel = D.duyurular.filter(function (d) { return d.kaynak === "manuel"; });
    var osym = D.duyurular.filter(function (d) { return d.kaynak === "osym"; });
    var mHTML = manuel.length ? manuel.map(function (d) {
      return '<article class="duyuru-kart' + (d.onemli ? " onemli" : "") + '"><div class="ust-bilgi"><span class="kaynak" style="--kc:var(--k-manuel)">Memur Kanalı</span>' +
        (d.tarih ? "<span>" + esc(kisaTarih(Date.parse(d.tarih))) + "</span>" : "") + (d.onemli ? '<span class="etiket yeni">ÖNEMLİ</span>' : "") + "</div>" +
        "<h3>" + esc(d.baslik) + "</h3>" + (d.metin ? "<p>" + esc(d.metin) + "</p>" : "") +
        (guvenliUrl(d.url) ? '<a class="btn hafif" href="' + esc(d.url) + '" target="_blank" rel="noopener noreferrer">Ayrıntılar ' + ikon("dis") + "</a>" : "") + "</article>";
    }).join("") : '<div class="bos"><div class="simge">📭</div><h3>Henüz duyuru yok</h3></div>';
    var oHTML = osym.length ? '<div class="liste-kutu">' + osym.map(function (d) {
      var t = d.tarih ? new Date(Date.parse(d.tarih)) : null;
      return '<a class="liste-satir" href="' + esc(guvenliUrl(d.url) || "https://www.osym.gov.tr") + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="tarih">' + (t ? t.getDate() + "<small>" + esc(fAyKisa.format(t)) + "</small>" : "") + "</span>" +
        '<span class="metin-alan">' + esc(d.baslik) + "</span>" + ikon("dis") + "</a>";
    }).join("") + "</div>" : '<div class="bos"><div class="simge">📭</div><h3>Duyuru bulunamadı</h3></div>';
    ana.innerHTML = '<div class="sayfa-basligi"><div><h1>📣 Duyurular</h1><p>Memur Kanalı duyuruları ve ÖSYM\'den son haberler</p></div></div>' +
      '<div class="iki-sutun"><section><h2 style="font-size:1.15rem;margin:0 0 12px">Memur Kanalı</h2>' + mHTML + "</section>" +
      '<section><h2 style="font-size:1.15rem;margin:18px 0 12px">ÖSYM duyuruları</h2>' + oHTML + "</section></div>" + altBilgiHTML();
  }

  // ===================================================================
  // Sayfa: Kayıtlı ilanlar ve takip edilen aramalar
  // ===================================================================
  function alarmEslesenler(a) {
    var simdi = Date.now();
    return D.ilanlar.filter(function (i) { return MK.filtreUyar(a.f, i, simdi); });
  }
  /** Bu cihazda son ziyaretten sonra listeye giren eşleşen ilanlar. */
  function alarmYeniSayisi(a) {
    return alarmEslesenler(a).filter(function (i) { return D.ziyaretYeni.has(i.id); }).length;
  }

  function ciz_kayitli() {
    var ana = $("#icerik");
    var anahtarlar = Object.keys(D.kayitli);
    var kartlar = [], eskiler = [];
    var gorulen = new Set();
    anahtarlar.forEach(function (k) {
      var i = ilanBul(k);
      if (i) { if (!gorulen.has(i.id)) { gorulen.add(i.id); kartlar.push(i); } }
      else eskiler.push(D.kayitli[k]);
    });
    kartlar.sort(function (a, b) { return (a._bitis || 8.64e15) - (b._bitis || 8.64e15); });
    var bildirimAcik = depo.al("bildirim", false) && "Notification" in window && Notification.permission === "granted";
    var alarmHTML = D.alarmlar.length ? D.alarmlar.map(function (a) {
      var toplam = D.yuklendi ? alarmEslesenler(a).length : 0, yeni = D.yuklendi ? alarmYeniSayisi(a) : 0;
      return '<div class="alarm"><span style="font-size:1.4rem">🔔</span><div><b>' + esc(a.ad) + "</b><small>" + toplam + " ilan" + (yeni ? " · <b style=\"color:var(--vurgu)\">" + yeni + " yeni</b>" : "") + "</small></div>" +
        '<button class="btn hafif" type="button" data-ac="alarm-goster" data-id="' + esc(a.id) + '">Göster</button>' +
        '<button class="ikon-btn" type="button" data-ac="alarm-sil" data-id="' + esc(a.id) + '" aria-label="Takibi bırak">' + ikon("cop") + "</button></div>";
    }).join("") : '<p>Henüz takip ettiğiniz bir arama yok. İlanlar sayfasında arama yapıp <b>“Bu aramayı takip et”</b> düğmesine dokunun; yeni ilan gelince burada gösterelim.</p>';

    ana.innerHTML = '<div class="sayfa-basligi"><div><h1>⭐ Kaydettiklerim</h1><p>Yıldızladığınız ilanlar ve takip ettiğiniz aramalar bu cihazda saklanır.</p></div></div>' +
      '<div class="iki-sutun"><section>' +
      (kartlar.length ? '<div class="liste">' + kartlar.map(kartHTML).join("") + "</div>" :
        '<div class="bos"><div class="simge">⭐</div><h3>Henüz kayıtlı ilanınız yok</h3><p>Beğendiğiniz ilanlardaki yıldız simgesine dokunun; ilan buraya eklenir ve son başvuru gününü kolayca takip edersiniz.</p><a class="btn ana" href="#/">İlanlara göz at</a></div>') +
      (eskiler.length ? '<div class="kutu" style="margin-top:16px"><h2>Listeden kalkan ilanlar</h2>' + eskiler.map(function (e) {
        return '<div class="alarm"><span style="font-size:1.3rem">⌛</span><div><b>' + esc(e.baslik) + "</b><small>" + esc(e.kurum || "") + (e.bitis ? " · son başvuru " + esc(kisaTarih(Date.parse(e.bitis))) : "") + "</small></div>" +
          '<button class="ikon-btn" type="button" data-ac="kaydet" data-id="' + esc(e.id) + '" aria-label="Listeden sil">' + ikon("cop") + "</button></div>";
      }).join("") + "</div>" : "") +
      "</section><section>" +
      '<div class="kutu"><h2>' + ikon("zil") + " Takip ettiğim aramalar</h2>" + alarmHTML + "</div>" +
      '<div class="kutu"><h2>' + ikon("bilgi") + " Bildirimler</h2>" +
      (bildirimAcik
        ? "<p>Bildirimler açık ✔ Takip ettiğiniz aramalara yeni ilan gelince haber vereceğiz.</p>"
        : '<p>Takip ettiğiniz aramalara yeni ilan gelince telefonunuza bildirim gönderelim. En iyi sonuç için uygulamayı ana ekranınıza ekleyin.</p><button class="btn ana tam" type="button" data-ac="bildirim" style="margin-top:12px">' + ikon("zil") + " Bildirimleri aç</button>") +
      "</div></section></div>" + altBilgiHTML();
  }

  function alarmEkle() {
    var f = { q: D.filtre.q.trim(), il: D.filtre.il, kaynaklar: D.filtre.kaynaklar.slice() };
    var ozet = MK.filtreOzeti(f);
    if (ozet === "Tüm ilanlar") { toast("Önce arama kutusuna bir kelime yazın veya bir filtre seçin."); return; }
    var ayni = D.alarmlar.some(function (a) { return JSON.stringify(a.f) === JSON.stringify(f); });
    if (ayni) { toast("Bu aramayı zaten takip ediyorsunuz."); return; }
    D.alarmlar.push({ id: Date.now().toString(36), ad: ozet, f: f, t: Date.now() });
    depo.koy("alarmlar", D.alarmlar);
    swAyarYaz();
    panelKapat();
    toast("🔔 Takibe alındı: " + ozet, { ad: "Bildirim aç", fn: bildirimAc });
    navCiz();
  }

  // ===================================================================
  // Sayfa: Menü / Ayarlar / Hakkında
  // ===================================================================
  function ciz_menu() {
    var ana = $("#icerik");
    var tema = depo.ham("tema") || "oto", yazi = depo.ham("yazi") || "normal";
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone;
    var kurulu = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    var durum = D.durum || {};
    // Her kaynak için yalnızca verinin en son ne zaman başarıyla alındığı gösterilir
    var kaynakHTML = (durum.kaynaklar || []).map(function (k) {
      var son = k.son_basari ? Date.parse(k.son_basari) : null;
      var guncel = k.durum === "ok" || k.durum === "kismi";
      var isik = guncel ? "" : "kismi";
      var acik = son ? "Son güncelleme: " + oncesi(son) : "Henüz veri alınamadı";
      return '<div class="kaynak-durum"><span class="isik ' + isik + '"></span><div><b>' + esc(k.ad) + "</b><small>" + esc(acik) + "</small></div>" +
        (guvenliUrl(k.url) ? '<a class="ikon-btn" href="' + esc(k.url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(k.ad) + ' sitesine git">' + ikon("dis") + "</a>" : "") + "</div>";
    }).join("");
    var kurulumHTML = kurulu ? "<p>Memur Kanalı bu cihazda uygulama olarak yüklü ✔</p>"
      : D.kurulum ? '<p>Memur Kanalı\'nı telefonunuza uygulama gibi yükleyin; tek dokunuşla açılır, internet yokken bile son ilanları gösterir.</p><button class="btn ana tam" type="button" data-ac="yukle" style="margin-top:12px">' + ikon("indir") + " Uygulamayı yükle</button>"
        : ios ? "<p>iPhone / iPad'e yüklemek için Safari'de alttaki <b>Paylaş</b> simgesine dokunun, ardından <b>“Ana Ekrana Ekle”</b>yi seçin.</p>"
          : "<p>Tarayıcınızın menüsünden <b>“Ana ekrana ekle”</b> veya <b>“Uygulamayı yükle”</b> seçeneğiyle Memur Kanalı'nı uygulama gibi kullanabilirsiniz.</p>";
    function bolumlu(ac, deger, secenekler) {
      return '<div class="bolumlu" role="group">' + secenekler.map(function (s) {
        return '<button type="button" data-ac="' + ac + '" data-k="' + s[0] + '" aria-pressed="' + (deger === s[0]) + '">' + s[1] + "</button>";
      }).join("") + "</div>";
    }
    ana.innerHTML = '<div class="sayfa-basligi"><div><h1>⚙️ Menü</h1><p>Görünüm ayarları, uygulama ve hakkında</p></div></div>' +
      '<div class="iki-sutun"><section>' +
      '<div class="kutu"><h2>👀 Görünüm</h2>' +
      '<div class="ayar-satir"><span>Yazı boyutu</span>' + bolumlu("yazi-sec", yazi, [["normal", "Normal"], ["buyuk", "Büyük"], ["cokbuyuk", "Çok büyük"]]) + "</div>" +
      '<div class="ayar-satir"><span>Tema</span>' + bolumlu("tema-sec", tema, [["oto", "Otomatik"], ["acik", "Açık"], ["koyu", "Koyu"]]) + "</div></div>" +
      '<div class="kutu"><h2>📲 Uygulama</h2>' + kurulumHTML + "</div>" +
      '<div class="kutu"><h2>🧭 Nasıl kullanılır?</h2><ol class="adimlar">' +
      "<li><span><b>Arayın:</b> Üstteki kutuya meslek, kurum ya da şehir yazın (örneğin “zabıta”, “hemşire Ankara”).</span></li>" +
      "<li><span><b>Daraltın:</b> “Filtrele” ile şehir ve ilan kaynağına göre seçin.</span></li>" +
      "<li><span><b>İnceleyin:</b> İlana dokunun; kaynaktan alınan bilgiler, ilan metni ve resmi ilan bağlantısı açılır.</span></li>" +
      "<li><span><b>Kaçırmayın:</b> Yıldızla kaydedin, son günü takviminize ekleyin ya da aramayı takip edin.</span></li></ol></div>" +
      "</section><section>" +
      '<div class="kutu"><h2>🔄 Kaynaklar ve güncelleme</h2>' +
      (durum.son_kontrol ? "<p>Son kontrol: <b>" + esc(tarihMetni(Date.parse(durum.son_kontrol))) + "</b>. Kaynaklar gün içinde otomatik kontrol edilir; bir kaynaktan yeni veri alınamazsa o kaynağın son alınan ilanları gösterilir.</p>" : "<p>Durum bilgisi henüz yok.</p>") +
      '<div style="margin-top:10px">' + kaynakHTML + "</div>" +
      '<button class="btn tam" type="button" data-ac="yenile" style="margin-top:12px">' + ikon("yenile") + " Şimdi yenile</button></div>" +
      '<div class="kutu"><h2>ℹ️ Hakkında</h2><p>Memur Kanalı; Kariyer Kapısı, ilan.gov.tr (Basın İlan Kurumu), Cumhurbaşkanlığı Strateji ve Bütçe Başkanlığı Kamu İlan, İŞKUR, Yerel Yönetimler Genel Müdürlüğü ve ÖSYM\'de yayınlanan kamu ilanlarını tek ekranda toplayan bağımsız bir bilgilendirme sitesidir. Resmi bir kurum sitesi değildir; başvurular yalnızca ilgili kurumların resmi sayfalarından yapılır.</p>' +
      '<p style="margin-top:10px">🔒 Kişisel veri toplamıyoruz. Kaydettiğiniz ilanlar ve tercihleriniz yalnızca bu cihazda saklanır.</p>' +
      '<p style="margin-top:10px"><a href="' + esc(MK.apiAdresi("rss.xml")) + '">RSS akışı</a> · <a href="' + esc(MK.apiAdresi("ilanlar.json")) + '">Açık veri (JSON)</a>' +
      (AYAR.ILETISIM ? ' · <a href="mailto:' + esc(AYAR.ILETISIM) + '">İletişim</a>' : "") + "</p></div>" +
      "</section></div>" +
      '<footer class="alt-bilgi"><a href="yonetim.html">Yönetim paneli</a></footer>';
  }

  // ===================================================================
  // Gezinme
  // ===================================================================
  var SAYFALAR = { ilanlar: ciz_ilanlar, takvim: ciz_takvim, duyurular: ciz_duyurular, kayitli: ciz_kayitli, menu: ciz_menu };
  var NAV = [
    { s: "ilanlar", ad: "İlanlar", ikon: "canta", href: "#/" },
    { s: "takvim", ad: "Takvim", ikon: "takvim", href: "#/takvim" },
    { s: "duyurular", ad: "Duyurular", ikon: "duyuru", href: "#/duyurular" },
    { s: "kayitli", ad: "Kayıtlı", ikon: "yildiz", href: "#/kayitli" },
    { s: "menu", ad: "Menü", ikon: "menu", href: "#/menu" }
  ];

  function navCiz() {
    var alarmYeni = 0;
    if (D.yuklendi) D.alarmlar.forEach(function (a) { alarmYeni += alarmYeniSayisi(a); });
    var h = NAV.map(function (n) {
      var rozet = n.s === "kayitli" && alarmYeni ? '<span class="rozet">' + (alarmYeni > 99 ? "99+" : alarmYeni) + "</span>" : "";
      return '<a href="' + n.href + '"' + (D.sayfa === n.s ? ' aria-current="page"' : "") + ">" + ikon(n.ikon) + "<span>" + n.ad + "</span>" + rozet + "</a>";
    }).join("");
    $("#altNav").innerHTML = h;
    $("#ustNav").innerHTML = NAV.map(function (n) {
      return '<a href="' + n.href + '"' + (D.sayfa === n.s ? ' aria-current="page"' : "") + ">" + n.ad + "</a>";
    }).join("");
  }

  function rotaGit(hash, degistir) {
    if (degistir) history.replaceState(null, "", hash); else location.hash = hash;
    rotaUygula();
  }

  function rotaUygula() {
    var h = location.hash.replace(/^#\/?/, "");
    var bol = h.split("?"), yol = bol[0], sorgu = new URLSearchParams(bol[1] || "");
    var p = yol.split("/").filter(Boolean);
    var sayfa = p[0] || "ilanlar", id = null;
    if (sayfa === "ilan") { id = decodeURIComponent(p[1] || ""); sayfa = D.sayfa || "ilanlar"; }
    if (!SAYFALAR[sayfa]) sayfa = "ilanlar";
    if (sorgu.has("q") || sorgu.has("hizli") || sorgu.has("il")) {
      filtreleriTemizle();
      D.filtre.q = sorgu.get("q") || ""; D.hizli = sorgu.get("hizli") === "ziyaret" ? "ziyaret" : "";
      D.filtre.il = sorgu.get("il") || "";
      if (D.sayfa === "ilanlar") D.sayfa = null;
      // Parametreler bir kez uygulansın; geri tuşuyla dönünce filtreler sıfırlanmasın
      if (D.yuklendi) history.replaceState(null, "", "#/" + (sayfa === "ilanlar" ? "" : sayfa));
    }
    if (sayfa !== D.sayfa) {
      D.sayfa = sayfa;
      SAYFALAR[sayfa]();
      if (!id) window.scrollTo(0, 0);
    }
    navCiz();
    if (id) detayAc(id); else detayKapat();
  }

  function sayfayiYenidenCiz() {
    if (D.sayfa && SAYFALAR[D.sayfa]) SAYFALAR[D.sayfa]();
    navCiz();
  }

  // ===================================================================
  // Panel (mobil filtre sayfası)
  // ===================================================================
  function panelAc() {
    var p = $("#filtrePanel");
    if (!p) return;
    p.classList.add("acik"); $("#perde").classList.add("acik"); document.body.classList.add("kilitli");
    setTimeout(function () { var k = $(".panel-kapat", p); if (k) k.focus({ preventScroll: true }); }, 50);
  }
  function panelKapat() {
    var p = $("#filtrePanel");
    if (p) p.classList.remove("acik");
    $("#perde").classList.remove("acik");
    if (!$("#cekmece").classList.contains("acik")) document.body.classList.remove("kilitli");
  }

  // ===================================================================
  // Bildirim (toast)
  // ===================================================================
  var toastZaman;
  function toast(mesaj, eylem) {
    var t = $("#toast");
    t.innerHTML = "<span>" + esc(mesaj) + "</span>" + (eylem ? '<button type="button">' + esc(eylem.ad) + "</button>" : "");
    if (eylem) t.querySelector("button").onclick = function () { t.classList.remove("acik"); eylem.fn(); };
    t.classList.add("acik");
    clearTimeout(toastZaman);
    toastZaman = setTimeout(function () { t.classList.remove("acik"); }, eylem ? 9000 : 3600);
  }

  // ===================================================================
  // Tema ve yazı boyutu
  // ===================================================================
  function etkinTema() {
    var t = document.documentElement.getAttribute("data-tema");
    if (t === "koyu" || t === "acik") return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "koyu" : "acik";
  }
  function temaUygula(t) {
    document.documentElement.setAttribute("data-tema", t);
    depo.hamKoy("tema", t);
    temaIkonu();
  }
  function temaIkonu() {
    var b = $("#btnTema");
    if (b) b.innerHTML = etkinTema() === "koyu" ? ikon("gunes") : ikon("ay");
    var m = document.querySelectorAll('meta[name="theme-color"]');
    if (m.length && document.documentElement.getAttribute("data-tema") !== "oto") {
      m.forEach(function (x) { x.setAttribute("content", etkinTema() === "koyu" ? "#0a1020" : "#2b50e6"); });
    }
  }
  var YAZI = ["normal", "buyuk", "cokbuyuk"], YAZI_AD = { normal: "Normal", buyuk: "Büyük", cokbuyuk: "Çok büyük" };
  function yaziUygula(y, bildir) {
    document.documentElement.setAttribute("data-yazi", y);
    depo.hamKoy("yazi", y);
    if (bildir) toast("Yazı boyutu: " + YAZI_AD[y]);
  }

  // ===================================================================
  // PWA: service worker, yükleme, bildirimler
  // ===================================================================
  function swAyarYaz() {
    if (!("caches" in window)) return;
    var veri = {
      alarmlar: D.alarmlar.map(function (a) { return { ad: a.ad, f: a.f }; }),
      bildirim: !!depo.al("bildirim", false),
      bilinen: D.ilanlar.map(function (i) { return i.id; }),
      api: MK.apiAdresi("ilanlar.json")
    };
    caches.open("mk-ayar").then(function (c) {
      return c.put("ayar.json", new Response(JSON.stringify(veri), { headers: { "Content-Type": "application/json" } }));
    }).catch(function () { /* yok say */ });
  }

  function bildirimAc() {
    if (!("Notification" in window)) { toast("Bu tarayıcı bildirimleri desteklemiyor. Uygulamayı ana ekrana eklemeyi deneyin."); return; }
    var izinIste = Notification.permission === "default" ? Notification.requestPermission() : Promise.resolve(Notification.permission);
    izinIste.then(function (izin) {
      if (izin !== "granted") { toast("Bildirim izni verilmedi. Tarayıcı ayarlarından izin verebilirsiniz."); return; }
      depo.koy("bildirim", true);
      swAyarYaz();
      var arka = false;
      var bitis = function () {
        toast(arka ? "Bildirimler açık. Yeni ilanlar arka planda da kontrol edilecek." : "Bildirimler açık. Yeni ilan gelince haber vereceğiz.");
        if (D.sayfa === "kayitli" || D.sayfa === "menu") sayfayiYenidenCiz();
      };
      if (!("serviceWorker" in navigator)) return bitis();
      navigator.serviceWorker.ready.then(function (reg) {
        if (!reg.periodicSync || !navigator.permissions) return bitis();
        return navigator.permissions.query({ name: "periodic-background-sync" }).then(function (s) {
          if (s.state !== "granted") return bitis();
          return reg.periodicSync.register("mk-yeni-ilan", { minInterval: 6 * 3600 * 1000 }).then(function () { arka = true; bitis(); });
        });
      }).catch(bitis);
    });
  }

  function yeniIlanBildirimi(yeniler) {
    if (!depo.al("bildirim", false) || !("Notification" in window) || Notification.permission !== "granted" || !yeniler.length) return;
    var eslesen = D.alarmlar.length ? yeniler.filter(function (i) { return D.alarmlar.some(function (a) { return MK.filtreUyar(a.f, i); }); }) : yeniler;
    if (!eslesen.length || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then(function (reg) {
      reg.showNotification("Memur Kanalı · " + eslesen.length + " yeni ilan", {
        body: eslesen.slice(0, 3).map(function (i) { return "• " + i.baslik; }).join("\n"),
        icon: "img/ikon-192.png", badge: "img/rozet-96.png", tag: "mk-yeni", data: { url: "./#/?hizli=ziyaret" }
      });
    }).catch(function () { /* yok say */ });
  }

  function swKaydet() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    var oncekiKontrol = navigator.serviceWorker.controller;
    navigator.serviceWorker.register("sw.js").then(function (reg) {
      reg.addEventListener("updatefound", function () {
        var yeni = reg.installing;
        if (!yeni) return;
        yeni.addEventListener("statechange", function () {
          if (yeni.state === "installed" && navigator.serviceWorker.controller) {
            toast("Memur Kanalı'nın yeni sürümü hazır.", { ad: "Güncelle", fn: function () { yeni.postMessage("atla"); } });
          }
        });
      });
    }).catch(function (e) { console.warn("Service worker kaydedilemedi", e); });
    var yenilendi = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!oncekiKontrol || yenilendi) return;
      yenilendi = true; location.reload();
    });
  }

  /** Açık sayfada belirli aralıklarla yeni veri var mı bakar. */
  function guncellemeKontrol(sessiz) {
    return jsonAl("durum.json").then(function (dr) {
      var degisti = !D.durum || dr.son_degisiklik !== D.durum.son_degisiklik;
      D.durum = dr;
      if (!degisti) return;
      var oncekiIdler = new Set(D.ilanlar.map(function (i) { return i.id; }));
      return veriYukle().then(function () {
        var yeniler = D.ilanlar.filter(function (i) { return !oncekiIdler.has(i.id) && !bitmisMi(i); });
        if (yeniler.length) {
          yeniler.forEach(function (i) { D.ziyaretYeni.add(i.id); });
          if (document.hidden) yeniIlanBildirimi(yeniler);
          toast(yeniler.length + " yeni ilan eklendi", { ad: "Göster", fn: function () { D.hizli = "ziyaret"; rotaGit("#/"); sayfayiYenidenCiz(); } });
        }
        if (!sessiz || yeniler.length) sayfayiYenidenCiz();
      });
    }).catch(function () { /* çevrimdışı */ });
  }

  // ===================================================================
  // Olaylar
  // ===================================================================
  var araZaman;
  document.addEventListener("input", function (e) {
    if (e.target.id === "ara") {
      clearTimeout(araZaman);
      var deger = e.target.value;
      araZaman = setTimeout(function () { D.filtre.q = deger; D.goster = SAYFA_BOYU; listeyiGuncelle(); }, 160);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if ($("#cekmece").classList.contains("acik")) { detayKapatIstegi(); return; }
      var p = $("#filtrePanel"); if (p && p.classList.contains("acik")) panelKapat();
    }
    if (e.key === "Enter" && e.target.id === "ara") { e.target.blur(); }
    // Çekmece içinde odak tuzağı
    if (e.key === "Tab" && $("#cekmece").classList.contains("acik")) {
      var odaklanabilir = $$('#cekmece .cekmece-panel a[href], #cekmece .cekmece-panel button:not([hidden]), #cekmece .cekmece-panel summary').filter(function (x) { return x.offsetParent !== null; });
      if (!odaklanabilir.length) return;
      var ilk = odaklanabilir[0], son = odaklanabilir[odaklanabilir.length - 1];
      if (e.shiftKey && document.activeElement === ilk) { e.preventDefault(); son.focus(); }
      else if (!e.shiftKey && document.activeElement === son) { e.preventDefault(); ilk.focus(); }
    }
  });

  document.addEventListener("change", function (e) {
    var ac = e.target.getAttribute && e.target.getAttribute("data-ac");
    if (!ac) return;
    var f = D.filtre;
    if (ac === "sirala") {
      D.sirala = e.target.value; depo.koy("sirala", D.sirala);
      var secim = $("#sirala");
      if (secim && secim !== e.target) secim.value = D.sirala;
      $$('input[name="siraSecim"]').forEach(function (r) { r.checked = r.value === D.sirala; });
    }
    else if (ac === "il") f.il = e.target.value;
    else if (ac === "bitenler") f.bitenler = e.target.checked;
    else if (ac === "kaynak") {
      var dizi = f.kaynaklar;
      var x = dizi.indexOf(e.target.value);
      if (e.target.checked && x === -1) dizi.push(e.target.value);
      if (!e.target.checked && x !== -1) dizi.splice(x, 1);
    } else return;
    D.goster = SAYFA_BOYU;
    listeyiGuncelle();
  });

  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-ac]");
    if (!el || el.tagName === "SELECT" || el.tagName === "INPUT") return;
    var ac = el.getAttribute("data-ac"), id = el.getAttribute("data-id"), k = el.getAttribute("data-k");
    switch (ac) {
      case "detay":
        D.detayIcerden = true;
        location.hash = "#/ilan/" + encodeURIComponent(id);
        break;
      case "kapat": detayKapatIstegi(); break;
      case "kaydet": e.preventDefault(); kaydetDegistir(id); break;
      case "hizli":
        if (D.sayfa !== "ilanlar") { D.hizli = k; rotaGit("#/"); break; }
        D.hizli = D.hizli === k ? "" : k;
        D.goster = SAYFA_BOYU; listeyiGuncelle();
        if (el.closest(".serit")) { var a = $("#liste"); if (a) a.scrollIntoView({ behavior: "smooth", block: "start" }); }
        break;
      case "daha": D.goster += SAYFA_BOYU; listeyiGuncelle(); break;
      case "panel-ac": panelAc(); break;
      case "panel-kapat": panelKapat(); break;
      case "filtre-temizle": filtreleriTemizle(); filtrePaneliCiz(); listeyiGuncelle(); break;
      case "etkin-sil": {
        var alan = el.getAttribute("data-alan"), deger = el.getAttribute("data-deger");
        if (alan === "il") D.filtre.il = "";
        else if (alan === "hizli") D.hizli = "";
        else if (alan === "bitenler") D.filtre.bitenler = false;
        else if (D.filtre[alan]) D.filtre[alan] = D.filtre[alan].filter(function (v) { return v !== deger; });
        filtrePaneliCiz(); listeyiGuncelle(); break;
      }
      case "ara-temizle": { var ara = $("#ara"); if (ara) { ara.value = ""; ara.focus(); } D.filtre.q = ""; listeyiGuncelle(); break; }
      case "alarm-ekle": alarmEkle(); break;
      case "alarm-sil":
        D.alarmlar = D.alarmlar.filter(function (a) { return a.id !== id; });
        depo.koy("alarmlar", D.alarmlar); swAyarYaz(); ciz_kayitli(); navCiz(); toast("Takip bırakıldı"); break;
      case "alarm-goster": {
        var al = D.alarmlar.filter(function (a) { return a.id === id; })[0];
        if (!al) break;
        filtreleriTemizle();
        // Eski sürümde kaydedilmiş takiplerdeki kategori / öğrenim / KPSS alanları alınmaz
        D.filtre.q = al.f.q || ""; D.filtre.il = al.f.il || "";
        D.filtre.kaynaklar = Array.isArray(al.f.kaynaklar) ? al.f.kaynaklar.slice() : [];
        D.sayfa = null; rotaGit("#/"); break;
      }
      case "paylas": { var pi = ilanBul(id) || D.kayitli[id]; if (pi) paylas(pi); break; }
      case "kopyala": kopyala(siteAdresi("#/ilan/" + encodeURIComponent(id))); break;
      case "ics": {
        var ii = ilanBul(id);
        if (ii && ii._bitis) icsIndir("memurkanali-son-basvuru.ics", [{ uid: ii.id, baslik: "Son başvuru: " + ii.baslik, bas: ii._bitis - 3600000, bit: ii._bitis, aciklama: (ii.kurum || "") + "\n" + siteAdresi("#/ilan/" + encodeURIComponent(ii.id)), url: guvenliUrl(ii.basvuru_url) || (anaSayfaMi(ii.url) ? null : guvenliUrl(ii.url)) || linkCoz(ii.pdf) }]);
        break;
      }
      case "etkinlik-ics": {
        var ev = etkinlikler().filter(function (x) { return x.id === id; })[0];
        if (ev) {
          var tekGun = ev._bit - ev._bas < 3600000 * 2;
          icsIndir("osym-takvim.ics", [{ uid: ev.id, baslik: (ASAMA[ev.asama] ? ASAMA[ev.asama].ad + ": " : "") + ev.ad, bas: tekGun ? ev._bas : ev._bas, bit: tekGun ? ev._bas + 3600000 * 3 : ev._bit, aciklama: (ev.uzun || "") + "\n" + (ev.url || ""), url: guvenliUrl(ev.url) }]);
        }
        break;
      }
      case "metin-ac": { var m = $("#dMetin"); if (m) m.classList.remove("kisa"); el.remove(); break; }
      case "duyuru-kapat":
        D.kapatilan.push(id); depo.koy("kapatilan", D.kapatilan.slice(-50));
        var s = el.closest(".serit"); if (s) s.remove(); break;
      case "takvim-sekme": D.takvimSekme = k; ciz_takvim(); break;
      case "tema-sec": temaUygula(k); ciz_menu(); break;
      case "yazi-sec": yaziUygula(k); ciz_menu(); break;
      case "bildirim": bildirimAc(); break;
      case "yukle": yukle(); break;
      case "yenile":
        if (!D.yuklendi) { baslat(); break; }
        toast("Kontrol ediliyor…");
        guncellemeKontrol(false).then(function () { toast("Güncel ✔"); });
        break;
    }
  });

  // Kurum logoları yüklenemezse baş harfler görünsün
  document.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t.tagName === "IMG" && t.parentNode && t.parentNode.classList && t.parentNode.classList.contains("avatar")) t.remove();
  }, true);

  $("#btnTema").addEventListener("click", function () { temaUygula(etkinTema() === "koyu" ? "acik" : "koyu"); if (D.sayfa === "menu") ciz_menu(); });
  $("#btnYazi").addEventListener("click", function () {
    var simdiki = document.documentElement.getAttribute("data-yazi") || "normal";
    yaziUygula(YAZI[(YAZI.indexOf(simdiki) + 1) % YAZI.length], true);
    if (D.sayfa === "menu") ciz_menu();
  });
  $("#btnYukle").addEventListener("click", yukle);
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", temaIkonu);
  }

  window.addEventListener("hashchange", rotaUygula);

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    D.kurulum = e;
    $("#btnYukle").hidden = false;
    if (D.sayfa === "menu") ciz_menu();
  });
  window.addEventListener("appinstalled", function () {
    D.kurulum = null; $("#btnYukle").hidden = true;
    toast("Memur Kanalı yüklendi 🎉");
  });
  function yukle() {
    if (!D.kurulum) { rotaGit("#/menu"); return; }
    D.kurulum.prompt();
    D.kurulum.userChoice.finally(function () { D.kurulum = null; $("#btnYukle").hidden = true; });
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && D.yuklendi && Date.now() - D.sonYukleme > 10 * 60000) guncellemeKontrol(true);
  });

  // ===================================================================
  // Başlat
  // ===================================================================
  function baslat() {
    D.hata = null;
    temaIkonu();
    rotaUygula();
    veriYukle().then(function () {
      var acik = D.acikIlan;
      D.sayfa = null;
      rotaUygula();
      if (acik && !D.acikIlan) detayAc(acik);
    }).catch(function () {
      if (!D.yuklendi) { D.sayfa = null; rotaUygula(); }
    });
  }

  swKaydet();
  baslat();
  setInterval(function () { if (!document.hidden && D.yuklendi) guncellemeKontrol(true); }, Math.max(5, AYAR.KONTROL_DAKIKA || 15) * 60000);
})();
