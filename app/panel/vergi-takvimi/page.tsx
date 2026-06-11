import { formatDate } from "../../../lib/format";
import PageHead from "../../../components/ui/PageHead";

// Bilgilendirme amaçlı; resmi takvim için GİB esas alınmalı.
const MONTHLY = [
  { label: "Muhtasar ve Prim Hizmet Beyannamesi", day: 26 },
  { label: "Damga Vergisi Beyannamesi", day: 26 },
  { label: "KDV Beyannamesi ve Ödemesi", day: 28 },
  { label: "SGK Prim Ödemesi", day: 31 }, // ay sonu
];
const FIXED = [
  { label: "Geçici Vergi (4. dönem)", month: 2, day: 17 },
  { label: "Yıllık Gelir Vergisi Beyanı", month: 3, day: 31 },
  { label: "Kurumlar Vergisi Beyanı", month: 4, day: 30 },
  { label: "Geçici Vergi (1. dönem)", month: 5, day: 17 },
  { label: "Geçici Vergi (2. dönem)", month: 8, day: 17 },
  { label: "Geçici Vergi (3. dönem)", month: 11, day: 17 },
];

function lastDay(year: number, month: number) {
  return new Date(year, month, 0).getDate(); // month: 1-12
}

export default function VergiTakvimiPage() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-11

  const items: { label: string; date: Date }[] = [];

  // Aylık tekrar edenler: bu ay ya da gelecek ay
  for (const x of MONTHLY) {
    for (let add = 0; add <= 1; add++) {
      const mm = m + add;
      const yr = y + Math.floor(mm / 12);
      const month = (mm % 12) + 1;
      const day = Math.min(x.day, lastDay(yr, month));
      const d = new Date(yr, month - 1, day);
      if (d >= now) {
        items.push({ label: x.label, date: d });
        break;
      }
    }
  }

  // Sabit tarihliler: bu yıl ya da gelecek yıl
  for (const x of FIXED) {
    let d = new Date(y, x.month - 1, Math.min(x.day, lastDay(y, x.month)));
    if (d < now) d = new Date(y + 1, x.month - 1, Math.min(x.day, lastDay(y + 1, x.month)));
    items.push({ label: x.label, date: d });
  }

  items.sort((a, b) => a.date.getTime() - b.date.getTime());

  const dayMs = 86400000;

  return (
    <>
      <PageHead title="Vergi Takvimi" sub="Yaklaşan vergi ve SGK son tarihleri" />

      <div className="tx-list">
        {items.map((it, i) => {
          const days = Math.round((it.date.getTime() - now.getTime()) / dayMs);
          const cls = days <= 3 ? "red" : days <= 7 ? "amber" : "gray";
          const dateStr = `${it.date.getFullYear()}-${String(it.date.getMonth() + 1).padStart(2, "0")}-${String(it.date.getDate()).padStart(2, "0")}`;
          return (
            <div key={i} className="tx-row">
              <div className="tx-main">
                <span
                  className="tx-dot"
                  style={{
                    background:
                      cls === "red" ? "var(--danger)" : cls === "amber" ? "var(--warning)" : "var(--text-dim)",
                  }}
                />
                <div className="tx-left">
                  <span className="tx-title">{it.label}</span>
                  <span className="tx-meta">{formatDate(dateStr)}</span>
                </div>
              </div>
              <div className="tx-right">
                <span className={`badge ${cls}`}>
                  {days === 0 ? "Bugün" : `${days} gün kaldı`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="kdv-note">
        Tarihler bilgilendirme amaçlıdır; resmi son tarihler için GİB / e-Devlet esas alınmalıdır.
      </p>
    </>
  );
}
