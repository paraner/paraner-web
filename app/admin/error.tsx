"use client";

/* Admin kabuğu hata sınırı (2026-07-19).
   ⚠️ NEDEN VAR: rol sorgusu geçici olarak patladığında (PostgREST şema önbelleği)
   kullanıcı ya müşteri paneline atılıyordu ya "sayfa yok" görüyordu — ikisi de yanlış
   teşhis. Artık ne olduğu yazıyor ve tek tıkla tekrar denenebiliyor; oturum kaybolmuyor. */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="admin-content">
      <h1 className="admin-h1">Bir şeyler ters gitti</h1>
      <p className="admin-sub">
        Sayfa yüklenemedi. Genelde geçicidir — tekrar denemen yeterli. Oturumun açık.
      </p>
      <button type="button" className="btn btn-primary btn-sm" onClick={reset}>
        Tekrar dene
      </button>
      <p className="admin-note" style={{ marginTop: 14 }}>
        Teknik ayrıntı: {error.message}
      </p>
    </div>
  );
}
