import { KeyRound } from "lucide-react";

// service_role anahtarı henüz eklenmemişken gösterilir (kurulum yönergesi).
export default function AdminKeyNotice() {
  return (
    <div>
      <h1 className="admin-h1">Yönetim Paneli</h1>
      <p className="admin-sub">Müşteri verilerini görmek için son bir kurulum adımı kaldı.</p>

      <div className="admin-panel" style={{ maxWidth: 640 }}>
        <div className="admin-panel-head">
          <KeyRound size={16} /> service_role anahtarı gerekli
        </div>
        <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, margin: "6px 0 14px" }}>
          Bu panel tüm müşterileri görebilmek için RLS&apos;i güvenli biçimde aşan sunucu anahtarını
          kullanır (yalnız sunucuda, tarayıcıya asla gitmez).
        </p>
        <ol style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.9, paddingLeft: 18, margin: 0 }}>
          <li>Supabase Dashboard → <b>Project Settings → API</b></li>
          <li><b>service_role</b> (secret) anahtarını kopyala</li>
          <li>Yerelde <code>.env.local</code>&apos;a ekle: <code>SUPABASE_SERVICE_ROLE_KEY=…</code></li>
          <li>Vercel → Project → Settings → <b>Environment Variables</b>&apos;a aynısını ekle → redeploy</li>
        </ol>
        <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 12 }}>
          Eklendiğinde bu sayfa otomatik olarak metrikleri gösterir.
        </p>
      </div>
    </div>
  );
}
