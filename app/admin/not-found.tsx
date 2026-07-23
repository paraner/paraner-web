import Link from "next/link";

/* Admin kabuğu "bulunamadı" sınırı (2026-07-23, denetim cila).
   ⚠️ NEDEN VAR: `notFound()` (örn. /admin/musteriler/[id] silinmiş kişide) en yakın
   not-found.tsx'i arar; admin altında YOKTU → kök global not-found'a düşüyor ve admin
   kabuğunun DIŞINDA, SIDEBAR'SIZ açılıyordu (kullanıcı panelden düşmüş gibi). Bu dosya
   app/admin/layout.tsx içinde render olur → sidebar + üst bar korunur. */
export default function AdminNotFound() {
  return (
    <div className="admin-content">
      <h1 className="admin-h1">Bulunamadı</h1>
      <p className="admin-sub">
        Aradığın kayıt yok ya da silinmiş olabilir. Oturumun açık — listeye dönebilirsin.
      </p>
      <Link href="/admin/musteriler" className="btn btn-primary btn-sm" style={{ marginTop: 6 }}>
        Müşterilere dön
      </Link>
    </div>
  );
}
