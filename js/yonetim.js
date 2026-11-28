/*
 * Memur Kanalı - yönetim paneli
 * GitHub Contents API ile veri/manuel.json dosyasını okur ve günceller.
 * Token yalnızca bu tarayıcıda saklanır (isteğe bağlı) ve sadece api.github.com'a gönderilir.
 */
(function () {
  "use strict";

  var DOSYA = "veri/manuel.json";
  var API = "https://api.github.com";
  var S = { depo: "", dal: "main", token: "", sha: null, veri: { duyurular: [], ilanlar: [] }, sekme: "duyurular", duzenlenen: null };

  function $(s) { return document.querySelector(s); }
  var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }
  function bugun() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function slug(s) {
    return (window.MK ? window.MK.sade(s) : String(s).toLowerCase()).replace(/\s+/g, "-").slice(0, 48) || "kayit";
  }
  function urlMi(u) { return !u || /^https?:\/\//i.test(u); }

  var toastZaman;
  function toast(m) {
    var t = $("#toast");
    t.innerHTML = "<span>" + esc(m) + "</span>";
    t.classList.add("acik");
    clearTimeout(toastZaman);
    toastZaman = setTimeout(function () { t.classList.remove("acik"); }, 4200);
  }

  // UTF-8 güvenli Base64
  function b64Kodla(metin) {
    var bayt = new TextEncoder().encode(metin), ikili = "";
    for (var i = 0; i < bayt.length; i += 0x8000) ikili += String.fromCharCode.apply(null, bayt.subarray(i, i + 0x8000));
    return btoa(ikili);
  }
  function b64Coz(b64) {
    var ikili = atob(String(b64).replace(/\s/g, ""));
    var bayt = new Uint8Array(ikili.length);
    for (var i = 0; i < ikili.length; i++) bayt[i] = ikili.charCodeAt(i);
    return new TextDecoder().decode(bayt);
  }

  function gh(yol, secenek) {
    secenek = secenek || {};
    secenek.headers = Object.assign({
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + S.token,
      "X-GitHub-Api-Version": "2022-11-28"
    }, secenek.headers || {});
    return fetch(API + yol, secenek);
  }

  // ------------------------------------------------------------------ Bağlantı
  function depoTahmin() {
    var m = location.hostname.match(/^([^.]+)\.github\.io$/i);
    if (!m) return "";
    var ilk = location.pathname.split("/").filter(Boolean)[0];
    var depo = ilk && !/\.html$/.test(ilk) ? ilk : m[1] + ".github.io";
    // Site ayrı bir "-site" deposundan yayınlanıyorsa veriler kod deposundadır
    return m[1] + "/" + depo.replace(/-site$/, "");
  }

  function kayitliBilgi() {
    try {
      var b = JSON.parse(localStorage.getItem("mk_yonetim") || sessionStorage.getItem("mk_yonetim") || "null");
      return b && b.token ? b : null;
    } catch (e) { return null; }
  }
  function bilgiSakla(hatirla) {
    var b = JSON.stringify({ depo: S.depo, dal: S.dal, token: S.token });
    try {
      if (hatirla) localStorage.setItem("mk_yonetim", b); else sessionStorage.setItem("mk_yonetim", b);
    } catch (e) { /* gizli sekme */ }
  }
  function bilgiSil() {
    try { localStorage.removeItem("mk_yonetim"); sessionStorage.removeItem("mk_yonetim"); } catch (e) { /* yok say */ }
  }

  function yukle() {
    $("#baglantiDurum").textContent = "Bağlanılıyor…";
    return gh("/repos/" + S.depo + "/contents/" + DOSYA + "?ref=" + encodeURIComponent(S.dal), { cache: "no-store" }).then(function (r) {
      if (r.status === 404) { S.sha = null; S.veri = { duyurular: [], ilanlar: [] }; return; }
      if (r.status === 401) throw new Error("Token geçersiz veya süresi dolmuş.");
      if (r.status === 403) throw new Error("Token'ın bu depoya erişim izni yok (Contents: Read and write gerekli).");
      if (!r.ok) throw new Error("GitHub yanıtı: " + r.status);
      return r.json().then(function (d) {
        S.sha = d.sha;
        var veri = JSON.parse(b64Coz(d.content));
        S.veri = { duyurular: Array.isArray(veri.duyurular) ? veri.duyurular : [], ilanlar: Array.isArray(veri.ilanlar) ? veri.ilanlar : [] };
      });
    }).then(function () {
      $("#baglantiKutu").hidden = true;
      $("#duzenleyici").hidden = false;
      $("#depoAdi").textContent = S.depo + " · " + S.dal;
      $("#actionsLink").href = "https://github.com/" + S.depo + "/actions";
      ciz();
    });
  }

  function kaydet(mesaj) {
    var icerik = JSON.stringify(S.veri, null, 2) + "\n";
    var govde = { message: mesaj, content: b64Kodla(icerik), branch: S.dal };
    if (S.sha) govde.sha = S.sha;
    toast("Kaydediliyor…");
    return gh("/repos/" + S.depo + "/contents/" + DOSYA, { method: "PUT", body: JSON.stringify(govde), headers: { "Content-Type": "application/json" } })
      .then(function (r) {
        if (r.status === 409 || r.status === 422) throw new Error("Dosya başka bir yerden değişmiş. Sayfayı yenileyip tekrar deneyin.");
        if (!r.ok) throw new Error("Kaydedilemedi (GitHub yanıtı: " + r.status + ")");
        return r.json();
      }).then(function (d) {
        S.sha = d.content && d.content.sha;
        $("#sonKayit").textContent = "Son kayıt: " + new Date().toLocaleTimeString("tr-TR") + " · site 1–2 dakika içinde güncellenir";
        toast("Kaydedildi ✔ Site 1–2 dakika içinde güncellenecek.");
      }).catch(function (e) { toast(e.message); throw e; });
  }

  // ------------------------------------------------------------------ Liste
  function ciz() {
    var duyuruMu = S.sekme === "duyurular";
    $("#sekmeBaslik").textContent = duyuruMu ? "Duyurular" : "Elle eklenen ilanlar";
    document.querySelectorAll("[data-sekme]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-sekme") === S.sekme)); });
    var liste = S.veri[S.sekme];
    $("#liste").innerHTML = liste.length ? liste.map(function (k, i) {
      var alt = duyuruMu
        ? (k.tarih || "") + (k.onemli ? " · ⭐ önemli (ana sayfada görünür)" : "") + (k.bitis ? " · " + k.bitis + " tarihine kadar" : "")
        : (k.kurum || "") + (k.bitis ? " · son başvuru " + k.bitis : "");
      return '<div class="kayit"><div><b>' + esc(k.baslik) + "</b><small>" + esc(alt) + "</small></div>" +
        '<button class="btn" type="button" data-duzenle="' + i + '">Düzenle</button>' +
        '<button class="btn sade" type="button" data-sil="' + i + '" aria-label="Sil">🗑️</button></div>';
    }).join("") : "<p>Henüz kayıt yok. <b>+ Yeni ekle</b> ile başlayın.</p>";
  }

  // ------------------------------------------------------------------ Form
  function alan(ad, etiket, tur, deger, ek) {
    ek = ek || {};
    if (tur === "textarea") return '<label class="alan"><span>' + etiket + '</span><textarea name="' + ad + '"' + (ek.zorunlu ? " required" : "") + ">" + esc(deger) + "</textarea>" + (ek.not ? "<small>" + ek.not + "</small>" : "") + "</label>";
    return '<label class="alan"><span>' + etiket + '</span><input type="' + tur + '" name="' + ad + '" value="' + esc(deger) + '"' + (ek.zorunlu ? " required" : "") + (ek.yer ? ' placeholder="' + esc(ek.yer) + '"' : "") + ">" + (ek.not ? "<small>" + ek.not + "</small>" : "") + "</label>";
  }
  function onay(ad, etiket, deger) { return '<label class="onay"><input type="checkbox" name="' + ad + '"' + (deger ? " checked" : "") + "> " + etiket + "</label>"; }

  function formAc(indeks) {
    var duyuruMu = S.sekme === "duyurular";
    var k = indeks == null ? {} : S.veri[S.sekme][indeks];
    S.duzenlenen = indeks;
    $("#formBaslik").textContent = (indeks == null ? "Yeni " : "Düzenle: ") + (duyuruMu ? "duyuru" : "ilan");
    var h;
    if (duyuruMu) {
      h = alan("baslik", "Başlık *", "text", k.baslik, { zorunlu: true }) +
        alan("metin", "Metin", "textarea", k.metin) +
        '<div class="iki">' + alan("tarih", "Tarih", "date", k.tarih || bugun()) + alan("bitis", "Yayından kalkma tarihi", "date", k.bitis, { not: "Boş bırakılırsa süresiz gösterilir." }) + "</div>" +
        alan("link", "Bağlantı (isteğe bağlı)", "url", k.link || k.url, { yer: "https://…" }) +
        onay("onemli", "Önemli: ana sayfada en üstte göster", k.onemli);
    } else {
      h = alan("baslik", "İlan başlığı *", "text", k.baslik, { zorunlu: true, yer: "Örn: 25 Sözleşmeli Hemşire Alımı" }) +
        alan("kurum", "Kurum *", "text", k.kurum, { zorunlu: true }) +
        '<div class="iki">' + alan("iller", "Şehir(ler)", "text", Array.isArray(k.iller) ? k.iller.join(", ") : k.iller, { yer: "Ankara, İzmir" }) +
        alan("kontenjan", "Kontenjan", "number", k.kontenjan) + "</div>" +
        '<div class="iki">' + alan("baslangic", "Başvuru başlangıcı", "date", k.baslangic) + alan("bitis", "Son başvuru tarihi *", "date", k.bitis, { zorunlu: true }) + "</div>" +
        alan("url", "Resmi ilan bağlantısı", "url", k.url, { yer: "https://…" }) +
        '<div class="iki">' + alan("basvuru_url", "Başvuru bağlantısı", "url", k.basvuru_url, { yer: "https://…" }) + alan("pdf", "PDF bağlantısı", "url", k.pdf, { yer: "https://…" }) + "</div>" +
        onay("onemli", "Önemli: listenin en üstünde göster", k.onemli) +
        alan("aciklama", "Açıklama / ilan metni", "textarea", k.aciklama, { not: "İlan ayrıntısında “İlan metni” olarak gösterilir." });
    }
    h += '<div class="durum-satir"><button class="btn ana" type="submit">Kaydet ve yayınla</button><button class="btn" type="button" id="vazgec">Vazgeç</button></div>';
    $("#icerikFormu").innerHTML = h;
    $("#formKutu").hidden = false;
    $("#formKutu").scrollIntoView({ behavior: "smooth", block: "start" });
    var ilk = $("#icerikFormu input"); if (ilk) ilk.focus({ preventScroll: true });
  }

  function formOku() {
    var f = $("#icerikFormu");
    var v = function (ad) { var el = f.elements[ad]; return el ? String(el.value || "").trim() : ""; };
    var c = function (ad) { var el = f.elements[ad]; return !!(el && el.checked); };
    var eski = S.duzenlenen == null ? {} : S.veri[S.sekme][S.duzenlenen];
    var k;
    if (S.sekme === "duyurular") {
      k = { id: eski.id || slug(v("baslik")) + "-" + Date.now().toString(36).slice(-4), baslik: v("baslik"), metin: v("metin"), tarih: v("tarih"), link: v("link"), onemli: c("onemli"), bitis: v("bitis") };
      if (!urlMi(k.link)) throw new Error("Bağlantı https:// ile başlamalı.");
    } else {
      k = {
        id: eski.id || slug(v("kurum") + " " + v("baslik")) + "-" + Date.now().toString(36).slice(-4),
        baslik: v("baslik"), kurum: v("kurum"),
        iller: v("iller").split(",").map(function (x) { return x.trim(); }).filter(Boolean),
        kontenjan: v("kontenjan") ? parseInt(v("kontenjan"), 10) : null,
        baslangic: v("baslangic"), bitis: v("bitis"), url: v("url"), basvuru_url: v("basvuru_url"), pdf: v("pdf"),
        onemli: c("onemli"), aciklama: v("aciklama"),
        tarih: eski.tarih || bugun()
      };
      ["url", "basvuru_url", "pdf"].forEach(function (a) { if (!urlMi(k[a])) throw new Error("Bağlantılar https:// ile başlamalı."); });
    }
    Object.keys(k).forEach(function (a) { if (k[a] === "" || k[a] === null || k[a] === false || (Array.isArray(k[a]) && !k[a].length)) delete k[a]; });
    return k;
  }

  // ------------------------------------------------------------------ Olaylar
  $("#baglantiFormu").addEventListener("submit", function (e) {
    e.preventDefault();
    S.depo = $("#depo").value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "");
    S.dal = $("#dal").value.trim() || "main";
    S.token = $("#token").value.trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(S.depo)) { $("#baglantiDurum").textContent = "Depo adı “kullanici/depo” biçiminde olmalı."; return; }
    yukle().then(function () { bilgiSakla($("#hatirla").checked); $("#baglantiDurum").textContent = ""; })
      .catch(function (err) { $("#baglantiDurum").textContent = "⚠️ " + err.message; });
  });

  $("#cikis").addEventListener("click", function () { bilgiSil(); location.reload(); });

  document.addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;
    if (t.hasAttribute("data-sekme")) { S.sekme = t.getAttribute("data-sekme"); $("#formKutu").hidden = true; ciz(); }
    else if (t.id === "yeniBtn") formAc(null);
    else if (t.id === "vazgec") { $("#formKutu").hidden = true; }
    else if (t.hasAttribute("data-duzenle")) formAc(parseInt(t.getAttribute("data-duzenle"), 10));
    else if (t.hasAttribute("data-sil")) {
      var i = parseInt(t.getAttribute("data-sil"), 10), k = S.veri[S.sekme][i];
      if (!confirm("“" + k.baslik + "” silinsin mi?")) return;
      var yedek = S.veri[S.sekme].slice();
      S.veri[S.sekme].splice(i, 1);
      kaydet("Silindi: " + k.baslik).then(ciz).catch(function () { S.veri[S.sekme] = yedek; ciz(); });
    }
  });

  $("#icerikFormu").addEventListener("submit", function (e) {
    e.preventDefault();
    var k;
    try { k = formOku(); } catch (err) { toast(err.message); return; }
    var yedek = S.veri[S.sekme].slice();
    if (S.duzenlenen == null) S.veri[S.sekme].unshift(k); else S.veri[S.sekme][S.duzenlenen] = k;
    kaydet((S.duzenlenen == null ? "Eklendi: " : "Güncellendi: ") + k.baslik)
      .then(function () { $("#formKutu").hidden = true; ciz(); })
      .catch(function () { S.veri[S.sekme] = yedek; ciz(); });
  });

  // ------------------------------------------------------------------ Başlat
  var b = kayitliBilgi();
  $("#depo").value = (b && b.depo) || depoTahmin();
  if (b) {
    S.depo = b.depo; S.dal = b.dal || "main"; S.token = b.token;
    $("#dal").value = S.dal;
    yukle().catch(function (err) { $("#baglantiDurum").textContent = "⚠️ " + err.message; });
  }
})();
