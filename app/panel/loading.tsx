/* Yükleniyor ekranı — bu kabuğun TÜM sayfaları için (alt sayfaların kendi loading'i yoksa).

   ⚠️ TASARIM KARARI (Mehmet, 2026-07-19): gösterge SAYFANIN ORTASINDA, sol menüde DEĞİL.
   Denenip ELENEN iki yaklaşım:
     1) Menüde tıklanan öğeye dönen halka → "sol panel dahil edilmesin" denildi.
     2) Gri iskelet çubukları → "yükleniyor" demiyordu; uzun beklemede "takıldı mı?" hissi.
   Sol menü bu sırada normal ve TIKLANABİLİR kalır: loading yalnız içerik alanını kaplar
   (Next'in layout/loading ayrımı) → kullanıcı fikrini değiştirip başka sayfaya geçebilir. */
export default function SayfaYukleniyor() {
  return (
    <div className="page-loading" aria-busy="true" aria-label="Yükleniyor">
      <span className="page-loading-ring" />
      <span className="page-loading-text">Yükleniyor…</span>
    </div>
  );
}
