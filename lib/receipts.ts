// Fiş / makbuz / belge ekleri — mobil ile AYNI mekanizma:
// public `receipts` bucket'ı, yol `${profileId}/${txId}_${ts}.${ext}`,
// transactions.receipt_urls / receipt_thumbnails / receipt_url güncellenir.
import { createClient } from "./supabase/client";

export const MAX_RECEIPTS = 3;
// Kabul edilen türler — görsel + PDF (mobil ile uyumlu)
export const RECEIPT_ACCEPT = "image/*,application/pdf";

export function isPdfUrl(url: string): boolean {
  return url.toLowerCase().split("?")[0].endsWith(".pdf");
}

// Bir dosyayı receipts bucket'ına yükle → public URL döndür.
export async function uploadReceipt(
  profileId: string,
  txId: string,
  file: File
): Promise<string> {
  const supabase = createClient();
  const ext =
    file.name.split(".").pop()?.toLowerCase() ||
    (file.type === "application/pdf" ? "pdf" : "jpg");
  const filePath = `${profileId}/${txId}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("receipts")
    .upload(filePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
  if (error) throw error;
  return supabase.storage.from("receipts").getPublicUrl(filePath).data.publicUrl;
}

// Storage'dan bir eki (ve varsa thumbnail'ını) sil.
export async function removeReceiptFiles(urls: (string | null)[]) {
  const supabase = createClient();
  const paths = urls
    .filter((u): u is string => !!u)
    .map((u) => u.split("/receipts/")[1])
    .filter(Boolean)
    .map((p) => decodeURIComponent(p));
  if (paths.length) await supabase.storage.from("receipts").remove(paths);
}
