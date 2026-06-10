// Panel'in TÜM sayfaları için ortak yükleniyor iskeleti.
// Sayfa verisi gelene kadar ANINDA gösterilir → geçiş "tak" hisseder, donma olmaz.
// (app/panel/loading.tsx, alt sayfaların kendi loading'i yoksa hepsini kapsar.)
export default function PanelLoading() {
  return (
    <div aria-busy="true" aria-label="Yükleniyor">
      <div className="skel skel-title" />
      <div className="skel skel-sub" />

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="skel skel-line sm" />
          <div className="skel skel-line lg" />
        </div>
        <div className="kpi-card">
          <div className="skel skel-line sm" />
          <div className="skel skel-line lg" />
        </div>
        <div className="kpi-card">
          <div className="skel skel-line sm" />
          <div className="skel skel-line lg" />
        </div>
      </div>

      <div className="skel skel-section" />
      <div className="tx-list">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="tx-row">
            <div className="tx-main">
              <span className="skel skel-dot" />
              <div className="tx-left" style={{ gap: 6 }}>
                <span className="skel skel-line" style={{ width: 160 }} />
                <span className="skel skel-line sm" style={{ width: 100 }} />
              </div>
            </div>
            <span className="skel skel-line" style={{ width: 80 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
