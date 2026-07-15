import { UsersRound } from "lucide-react";

export default function AdminEkipPage() {
  return (
    <div>
      <h1 className="admin-h1">Ekip</h1>
      <p className="admin-sub">Destek personeli ve yöneticileri buradan yöneteceksin.</p>
      <div className="admin-panel" style={{ maxWidth: 560 }}>
        <div className="admin-panel-head">
          <UsersRound size={16} /> Yakında
        </div>
        <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6, margin: "6px 0 0" }}>
          E-posta ile personel davet et; her birine <b>Destek</b> (agent) ya da <b>Yönetici</b> (admin)
          rolü ver. Şimdilik roller Supabase&apos;den <code>user_roles</code> tablosuna elle ekleniyor;
          davet arayüzü bir sonraki adımda gelecek.
        </p>
      </div>
    </div>
  );
}
