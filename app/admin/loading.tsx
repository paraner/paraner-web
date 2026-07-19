/* Admin panelinin TÜM sayfaları için ortak yükleniyor iskeleti (denetim 2026-07-18 / O11).
   Müşteri panelinde (app/panel/loading.tsx) vardı, admin'de HİÇ YOKTU — oysa admin sayfaları
   daha ağır: listPeople 10.000 auth kullanıcısı çekiyor, müşteri detayı profil başına 4 paralel
   sorgu atıyor, /admin/ai RPC çağırıyor. İskelet olmadan sidebar'da tıklayınca hiçbir şey
   olmuyor gibi görünüyor (eski sayfa ekranda kalıyor) → kullanıcı ikinci kez tıklıyordu.
   Panel iskeletinin admin karşılığı: aynı `.skel` sınıfları, admin grid'i (.admin-kpi-grid). */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Yükleniyor">
      {/* Gri iskelet tek başına "yükleniyor" demiyordu (Mehmet, 2026-07-19) — soğuk
          başlangıçta saniyelerce beklenince "takıldı mı?" hissi veriyor. Açık yazı + halka. */}
      <div className="admin-loading-flag">
        <span className="admin-nav-spin" />
        Yükleniyor…
      </div>
      <div className="skel skel-title" />
      <div className="skel skel-sub" />

      <div className="admin-kpi-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-kpi">
            <div className="skel skel-line sm" />
            <div className="skel skel-line lg" />
          </div>
        ))}
      </div>

      <div className="admin-panel" style={{ marginTop: 20 }}>
        <div className="skel skel-section" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0" }}
          >
            <span className="skel skel-line" style={{ width: 220 }} />
            <span className="skel skel-line sm" style={{ width: 90 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
