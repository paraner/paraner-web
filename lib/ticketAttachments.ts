"use client";

import { createClient } from "./supabase/client";

/* Destek eki — yükleme + görüntüleme (2026-07-20).
   Bucket PRIVATE (sql/destek/destek-ek-dosya.sql) → `receipts`/`avatars` desenindeki
   `getPublicUrl` BURADA ÇALIŞMAZ. Okuma her seferinde süreli imzalı link ile yapılır.

   ⚠️ `ticket_messages.attachment_url` kolonuna TAM URL DEĞİL, bucket içi YOL yazılır
      (`{ticket_id}/{rastgele}.{uzanti}`). Sebep: imzalı linkler süreli — URL saklasaydık
      kayıt birkaç dakika sonra ölü bağlantıya dönerdi. Yol kalıcı, link anında üretilir.
   ⚠️ MOBİL: `attachment_url` mobilde de okunuyor (tip tanımı var, henüz render edilmiyor).
      Mobil ek göstermeye başladığında AYNI kuralı uygulamalı: yol → createSignedUrl. */

export const TICKET_FILE_ACCEPT = "image/png,image/jpeg,image/gif,image/webp,application/pdf";
export const TICKET_FILE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB — bucket sınırıyla AYNI

/** Kullanıcıya gösterilecek boyut metni ("2,4 MB"). */
export function boyutMetni(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function isPdfPath(path: string): boolean {
  return path.toLowerCase().endsWith(".pdf");
}

/** Yoldan dosya adını çıkarır (gösterim için). */
export function dosyaAdi(path: string): string {
  return path.split("/").pop() ?? path;
}

/* İstemci tarafı ön kontrol. Sunucu kapısı ayrıca var (bucket file_size_limit +
   allowed_mime_types) — burası yalnız kullanıcıya ANLAMLI hata vermek için.
   Sadece buna güvenme: devtools'tan aşılabilir. */
export function dosyaGecerliMi(file: File): string | null {
  if (file.size > TICKET_FILE_MAX_BYTES) {
    return `Dosya çok büyük (${boyutMetni(file.size)}). En fazla ${boyutMetni(TICKET_FILE_MAX_BYTES)} olabilir.`;
  }
  const izinli = TICKET_FILE_ACCEPT.split(",");
  if (file.type && !izinli.includes(file.type)) {
    return "Yalnız görsel (PNG, JPG, GIF, WEBP) veya PDF gönderebilirsin.";
  }
  return null;
}

/** Dosyayı talebin klasörüne yükler, DB'ye yazılacak YOLU döndürür. Hata olursa null. */
export async function uploadTicketFile(ticketId: string, file: File): Promise<string | null> {
  const supabase = createClient();
  const uzanti = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  /* Dosya adı KULLANICIDAN gelmiyor: özel karakter/yol kaçışı (`../`) ve aynı adın
     üzerine yazma riskini baştan kesiyoruz. Klasör = talep id → policy oradan yetki soruyor. */
  const yol = `${ticketId}/${crypto.randomUUID()}.${uzanti}`;
  const { error } = await supabase.storage
    .from("ticket-attachments")
    .upload(yol, file, { contentType: file.type || undefined, upsert: false });
  if (error) {
    console.error("[ticket-attachments] yüklenemedi:", error.message);
    return null;
  }
  return yol;
}

/** Görüntüleme için süreli link üretir. RLS geçmezse null (başkasının dosyası). */
export async function signedTicketFileUrl(path: string, saniye = 300): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("ticket-attachments")
    .createSignedUrl(path, saniye);
  if (error || !data) return null;
  return data.signedUrl;
}
