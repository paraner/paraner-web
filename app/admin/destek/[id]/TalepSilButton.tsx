"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTickets } from "../../../../lib/adminActions";
import { confirmDialog } from "../../../components/confirm";
import { showToast } from "../../../components/toast";

/* Talep silme (yalnız admin). Bileşen ThreadClient'ın `headerAction` yuvasına takılıyor —
   ThreadClient müşteri panelinde de kullanıldığı için silme kodu oraya GÖMÜLMEDİ.
   ⚠️ Bu bileşen sadece BUTONU gizler; asıl yetki kapısı sunucuda `deleteTickets`
   içindeki `requireAdmin()`. Agent isteği elle kursa bile reddedilir. */
export default function TalepSilButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [siliniyor, setSiliniyor] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-danger btn-sm"
      disabled={siliniyor}
      onClick={async () => {
        const ok = await confirmDialog({
          title: "Talep kalıcı olarak silinsin mi?",
          message:
            "Talep, tüm yazışması ve ek dosyaları geri alınamaz biçimde silinir. " +
            "İşlem denetim kaydına yazılır.",
          confirmLabel: "Kalıcı olarak sil",
          danger: true,
        });
        if (!ok) return;
        setSiliniyor(true);
        const r = await deleteTickets([ticketId]);
        showToast({ title: r.message, variant: r.ok ? "success" : "error" });
        if (!r.ok) {
          setSiliniyor(false);
          return;
        }
        /* Silinen talebin sayfasında KALMA: `router.refresh()` burada yetmez, kayıt yok —
           sayfa "Talep bulunamadı" gösterirdi. Listeye dön (refresh listeyi tazeler). */
        router.replace("/admin/destek");
        router.refresh();
      }}
    >
      <Trash2 size={15} /> {siliniyor ? "Siliniyor…" : "Sil"}
    </button>
  );
}
