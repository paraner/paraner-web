/* Admin sayfa başlığı — tek kaynak (2026-07-23, denetim cila: "21 yerde kopya başlık").
   Müşteri panelinin `components/ui/PageHead` bileşeninin admin karşılığı; ama admin KENDİ
   stilini kullanır (`admin-h1`/`admin-sub` — bilerek daha ağır, iç panel görünümü) → ayrı bileşen.

   ⚠️ GÖRSEL-NÖTR: aksiyon YOKKEN sarmalayıcı div koymaz, düz `<h1>` + `<p>` üretir — yani
   eski elle yazılmış işaretlemeyle BİREBİR aynı (margin/boşluk kaymaz). Aksiyon verilince
   flex satırına geçer (başlık solda, aksiyon sağda).

   `sub` React.ReactNode: alt yazılar çoğu sayfada JSX içeriyor (kalın, sayaç, fiyat sabitleri).
   Sunucu VE istemci bileşenlerinden import edilebilir (hook yok, "use client" gerekmez). */
export default function AdminPageHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const inner = (
    <>
      <h1 className="admin-h1">{title}</h1>
      {sub != null && <p className="admin-sub">{sub}</p>}
    </>
  );
  if (!action) return inner;
  return (
    <div className="admin-page-head">
      <div>{inner}</div>
      {action}
    </div>
  );
}
