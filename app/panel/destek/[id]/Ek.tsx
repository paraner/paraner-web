"use client";

import { useEffect, useState } from "react";
import { FileText, ImageIcon, ExternalLink } from "lucide-react";
import { signedTicketFileUrl, isPdfPath, dosyaAdi } from "../../../../lib/ticketAttachments";

/* Mesaj balonundaki ek. Bucket PRIVATE → dosya doğrudan URL ile açılamaz, her
   görüntülemede süreli imzalı link üretilir.

   ⚠️ Görseli <img src> ile göstermek CAZİP ama imzalı link süreli (5 dk): sohbet açık
   kalırsa görsel sessizce kırık kutuya döner. Bu yüzden önizleme yerine "aç" bağlantısı —
   tıklandığı AN taze link üretiliyor, hiç bayatlamıyor.

   Erişim RLS'ten geçmezse (başkasının talebi) link null döner → "açılamadı" yazar,
   sessizce boş kalmaz. */
export default function Ek({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [durum, setDurum] = useState<"bos" | "yukleniyor" | "hata">("bos");
  const pdf = isPdfPath(path);

  useEffect(() => {
    // Yol değişirse eski linki taşıma
    setUrl(null);
    setDurum("bos");
  }, [path]);

  async function ac() {
    if (url) return; // zaten var, <a> kendi açar
    setDurum("yukleniyor");
    const u = await signedTicketFileUrl(path);
    if (!u) {
      setDurum("hata");
      return;
    }
    setUrl(u);
    setDurum("bos");
    window.open(u, "_blank", "noopener,noreferrer");
  }

  if (durum === "hata") {
    return <span className="msg-ek-hata">Ek açılamadı (yetkin olmayabilir)</span>;
  }

  return (
    <a
      className="msg-ek"
      href={url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (!url) {
          e.preventDefault();
          void ac();
        }
      }}
      title={dosyaAdi(path)}
    >
      {pdf ? <FileText size={14} /> : <ImageIcon size={14} />}
      <span className="msg-ek-ad">{pdf ? "PDF eki" : "Görsel eki"}</span>
      {durum === "yukleniyor" ? <span className="msg-ek-dim">açılıyor…</span> : <ExternalLink size={12} />}
    </a>
  );
}
