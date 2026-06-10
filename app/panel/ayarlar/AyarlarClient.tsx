"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import LogoutButton from "../LogoutButton";

export type Profile = {
  id: string;
  profile_name: string | null;
  profile_type: string | null;
  currency: string | null;
  is_active: boolean;
};

export default function AyarlarClient({
  email,
  profiles,
}: {
  email: string;
  profiles: Profile[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const active = profiles.find((p) => p.is_active) ?? profiles[0];
  const [name, setName] = useState(active?.profile_name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [switching, setSwitching] = useState(false);

  const typeLabel = (t: string | null) =>
    t === "business" ? "İşletme" : "Bireysel";

  async function saveName() {
    if (!active || !name.trim() || name.trim() === active.profile_name) return;
    setSavingName(true);
    await supabase
      .from("profiles")
      .update({ profile_name: name.trim() })
      .eq("id", active.id);
    setSavingName(false);
    router.refresh();
  }

  async function switchTo(p: Profile) {
    if (p.is_active || switching) return;
    setSwitching(true);
    const ids = profiles.map((x) => x.id);
    // Önce hepsini pasifle, sonra seçileni aktifle
    await supabase.from("profiles").update({ is_active: false }).in("id", ids);
    await supabase.from("profiles").update({ is_active: true }).eq("id", p.id);
    // Tüm panel aktif profile göre değişir → tam yenile
    router.push("/panel");
    router.refresh();
  }

  return (
    <>
      <h1 className="panel-h1">Ayarlar</h1>
      <p className="panel-sub">Profil ve hesap ayarların</p>

      <div className="settings-block">
        <h3>Profil Bilgileri</h3>
        <div className="tx-list">
          <div className="info-row">
            <span className="k">E-posta</span>
            <span className="v">{email}</span>
          </div>
          <div className="info-row">
            <span className="k">Profil tipi</span>
            <span className="v">{typeLabel(active?.profile_type ?? null)}</span>
          </div>
          <div className="info-row">
            <span className="k">Para birimi</span>
            <span className="v">{active?.currency ?? "TRY"}</span>
          </div>
        </div>
      </div>

      <div className="settings-block">
        <h3>Profil Adı</h3>
        <div className="inline-edit">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Profil adı"
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={saveName}
            disabled={savingName || !name.trim() || name.trim() === active?.profile_name}
          >
            {savingName ? "…" : "Kaydet"}
          </button>
        </div>
      </div>

      {profiles.length > 1 && (
        <div className="settings-block">
          <h3>Profil Değiştir</h3>
          <div className="tx-list">
            {profiles.map((p) => (
              <div
                key={p.id}
                className={`profile-row${p.is_active ? " active" : ""}`}
                onClick={() => switchTo(p)}
              >
                <div>
                  <div className="p-name">{p.profile_name ?? "Profil"}</div>
                  <div className="p-type">{typeLabel(p.profile_type)}</div>
                </div>
                {p.is_active ? (
                  <span className="badge green">Aktif</span>
                ) : (
                  <span className="badge gray">Geç</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="settings-block">
        <h3>Oturum</h3>
        <LogoutButton />
      </div>
    </>
  );
}
