/*
 * Memur Kanalı - sayfa ve service worker'ın birlikte kullandığı yardımcılar.
 * (Service worker bu dosyayı importScripts ile yükler; DOM kullanmayın.)
 */
(function (kok) {
  "use strict";

  var TR_HARF = { "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i", "û": "u" };

  /** Arama için sadeleştirir: "Öğretmen İZMİR" -> "ogretmen izmir" */
  function sade(s) {
    return String(s || "")
      .toLocaleLowerCase("tr-TR")
      .replace(/[çğıöşüâîû]/g, function (c) { return TR_HARF[c]; })
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  var KAYNAKLAR = {
    kariyerkapisi: "Kariyer Kapısı",
    kamuilan: "Kamu İlan",
    iskur: "İŞKUR",
    osym: "ÖSYM",
    ilangovtr: "ilan.gov.tr",
    yerelyonetim: "Yerel Yönetimler",
    manuel: "Memur Kanalı"
  };
  // Aramada eş anlamlılar: "şoför" yazan "sürücü" ilanlarını da bulsun
  var ES_ANLAM = { polis: "emniyet", sofor: "surucu", surucu: "sofor" };

  /** Arama yalnızca kaynaktan gelen alanlarda yapılır (başlık, kurum, birim, il, ilan türü, kaynak). */
  function aramaMetni(ilan) {
    if (ilan._ara) return ilan._ara;
    var parcalar = [
      ilan.baslik, ilan.kurum, ilan.birim, (ilan.iller || []).join(" "),
      ilan.alt_tur, KAYNAKLAR[ilan.kaynak] || ""
    ];
    var s = " " + sade(parcalar.join(" ")) + " ";
    try { Object.defineProperty(ilan, "_ara", { value: s, enumerable: false }); } catch (e) { /* dondurulmuş nesne */ }
    return s;
  }

  function aramaUyar(ilan, sorgu) {
    var kelimeler = sade(sorgu).split(" ").filter(Boolean);
    if (!kelimeler.length) return true;
    var metin = aramaMetni(ilan);
    return kelimeler.every(function (k) {
      if (metin.indexOf(k) !== -1) return true;
      var es = ES_ANLAM[k];
      return !!(es && metin.indexOf(es) !== -1);
    });
  }

  /**
   * Bir ilanın filtreye uyup uymadığı.
   * filtre: { q, il, kaynaklar[], bitenler }
   * (Eski sürümde kaydedilmiş takiplerdeki kategori / öğrenim / KPSS alanları yok sayılır.)
   */
  function filtreUyar(filtre, ilan, simdi) {
    filtre = filtre || {};
    simdi = simdi || Date.now();
    if (!filtre.bitenler && ilan.bitis && Date.parse(ilan.bitis) < simdi) return false;
    if (filtre.kaynaklar && filtre.kaynaklar.length) {
      var kaynaklar = (ilan.kaynaklar || []).map(function (k) { return k.kod; });
      if (!kaynaklar.length) kaynaklar = [ilan.kaynak];
      if (!filtre.kaynaklar.some(function (k) { return kaynaklar.indexOf(k) !== -1; })) return false;
    }
    if (filtre.il) {
      var iller = ilan.iller || [];
      if (iller.indexOf(filtre.il) === -1 && iller.indexOf("Türkiye Geneli") === -1) return false;
    }
    if (filtre.q && !aramaUyar(ilan, filtre.q)) return false;
    return true;
  }

  /** Filtreyi insanların okuyacağı kısa metne çevirir: "hemşire · İzmir · İŞKUR" */
  function filtreOzeti(f) {
    var p = [];
    if (f.q) p.push("“" + f.q + "”");
    if (f.il) p.push(f.il);
    if (f.kaynaklar && f.kaynaklar.length) p.push(f.kaynaklar.map(function (k) { return KAYNAKLAR[k] || k; }).join(", "));
    return p.join(" · ") || "Tüm ilanlar";
  }

  function apiAdresi(dosya) {
    var ayar = kok.MK_AYARLAR || {};
    var taban = ayar.API_URL || "api/";
    if (taban.slice(-1) !== "/") taban += "/";
    return taban + dosya;
  }

  kok.MK = {
    sade: sade,
    KAYNAKLAR: KAYNAKLAR,
    aramaUyar: aramaUyar,
    filtreUyar: filtreUyar,
    filtreOzeti: filtreOzeti,
    apiAdresi: apiAdresi
  };
})(typeof self !== "undefined" ? self : this);
