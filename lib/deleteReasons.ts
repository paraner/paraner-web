/* Kalıcı hesap silme SEBEPLERİ — TEK KAYNAK (2026-07-20, Mehmet kararı).
   Neden ayrı dosya: `lib/adminActions.ts` bir "use server" modülü, oradan sabit export
   EDİLEMEZ (yalnız async fonksiyon). Modal (istemci) ve sunucu doğrulaması ikisi de
   buradan okur → seçenek listesi tek yerde yaşar, kopya sürüklenmez.

   ⚠️ Sunucu tarafı gelen değeri BU listeye karşı doğrular (`isDeleteReason`). İstemciden
   gelen serbest metne güvenilmez: denetim kaydı sonradan kanıt olarak okunacak, içine
   uydurma bir sebep yazılabilmemeli.

   İleride genişletilecek (Mehmet: "şimdilik bunları ekle, ileride daha detaya gireriz"). */

export const DELETE_REASONS = [
  {
    id: "customer_request",
    label: "Müşteri talebi üzerine",
    hint: "Kullanıcı kendi hesabının silinmesini istedi (KVKK silme hakkı).",
  },
  {
    id: "test_account",
    label: "Test / dahili hesap",
    hint: "Bizim açtığımız deneme hesabı temizliği.",
  },
  {
    id: "spam_abuse",
    label: "Spam / kötüye kullanım",
    hint: "Sahte kayıt, istenmeyen içerik veya kural ihlali.",
  },
  {
    id: "duplicate",
    label: "Mükerrer hesap",
    hint: "Aynı kişinin ikinci hesabı birleştirildi/temizlendi.",
  },
  {
    /* Listede olmayan durum için. Bu seçilirse NOT ZORUNLU — yoksa "diğer" hiçbir şey
       anlatmayan bir etiket olur ve denetim kaydı değersizleşir. */
    id: "other",
    label: "Diğer (nota yaz)",
    hint: "Yukarıdakilere uymuyorsa — ne olduğunu nota yazman gerekir.",
  },
] as const;

export type DeleteReasonId = (typeof DELETE_REASONS)[number]["id"];

export function isDeleteReason(v: unknown): v is DeleteReasonId {
  return typeof v === "string" && DELETE_REASONS.some((r) => r.id === v);
}

export function deleteReasonLabel(id: string): string {
  return DELETE_REASONS.find((r) => r.id === id)?.label ?? id;
}

/** Not zorunlu mu? Şimdilik yalnız "Diğer" için. */
export const NOTE_REQUIRED_FOR: readonly DeleteReasonId[] = ["other"];

/** Denetim kaydının okunabilir kalması için üst sınır (jsonb'ye roman yazılmasın). */
export const DELETE_NOTE_MAX = 500;
