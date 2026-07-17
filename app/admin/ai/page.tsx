import { requireAdminPage } from "../../../lib/adminGuard";
import { hasAdminKey } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";
import AdminKeyNotice from "../AdminKeyNotice";
import AiClient, { type AiRow } from "./AiClient";

export const metadata = { title: "AI Kullanımı", robots: { index: false, follow: false } };

/** Ayın ilk günü (YYYY-MM-01) — RPC ay bazlı sorguluyor. */
function monthStart(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** Son 6 ay (seçici için), en yenisi başta. */
function lastMonths(n = 6): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    out.push(monthStart(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1))));
  }
  return out;
}

export default async function AiPage({
  searchParams,
}: {
  searchParams: Promise<{ ay?: string }>;
}) {
  await requireAdminPage(); // müşteri e-postaları listeleniyor → agent göremez
  if (!hasAdminKey()) return <AdminKeyNotice />;

  const sp = await searchParams;
  const months = lastMonths();
  // Elle girilen ?ay= değerine güvenme — yalnız listedekiler.
  const ay = sp.ay && months.includes(sp.ay) ? sp.ay : months[0];

  /* ⚠️ RPC KULLANICI OTURUMUYLA çağrılır (service_role ile DEĞİL): guard auth.uid()'e
     bakıyor, service_role'ün kullanıcı kimliği yok → "Yetkisiz işlem" alırdık.
     SECURITY DEFINER olduğu için RLS yine aşılıyor. */
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_ai_usage", { p_ay: ay });

  if (error) {
    return (
      <div>
        <h1 className="admin-h1">AI Kullanımı</h1>
        <p className="admin-sub">
          Veri okunamadı: {error.message}
          {/* Kurulum yapılmadıysa asıl sebep bu — tahmin ettirme, söyle. */}
          {(error.message.includes("admin_ai_usage") || error.message.includes("function")) &&
            " — paraner-app/supabase/ai-token-maliyet.sql çalıştırıldı mı?"}
        </p>
      </div>
    );
  }

  return <AiClient rows={(data ?? []) as AiRow[]} months={months} selected={ay} />;
}
