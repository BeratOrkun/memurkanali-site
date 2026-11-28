/*
 * Memur Kanalı - site ayarları
 * ----------------------------------------------------------------------------
 * API_URL: İlan verilerinin (JSON) okunacağı adres.
 *   - Site ve veriler aynı GitHub Pages'te ise "api/" olarak bırakın.
 *   - Siteyi başka bir yerde (kendi alan adınız, hosting) yayınlıyorsanız
 *     GitHub Pages adresinizi yazın, örnek:
 *       API_URL: "https://KULLANICI-ADI.github.io/memurkanali/api/"
 *     (Sondaki "/" işareti gerekli.)
 */
self.MK_AYARLAR = {
  API_URL: "api/",
  SITE_ADI: "Memur Kanalı",
  // İletişim adresi (Menü > Hakkında bölümünde görünür). Boş bırakılabilir.
  ILETISIM: "",
  // Açık sayfada kaç dakikada bir yeni veri gelmiş mi diye bakılsın
  KONTROL_DAKIKA: 15
};
