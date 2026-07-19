/* Destek/ticket ORTAK tipleri + sabitleri — sunucu ve istemci birlikte kullanır.
   ⚠️ Bu dosyada "use client" YOK ve OLMAMALI. Sebep: `lib/support.ts` bir istemci modülü
   ("use client"); oradan bir sabiti SUNUCU bileşenine import edersen Next sana değeri değil
   bir istemci-referansı proxy'si verir → `TICKET_COLS.split is not a function`, ya da
   `TICKET_STATUS_META[status]` erişiminde patlama. Sunucu sayfaları bu dosyadan okur. */

export type TicketStatus = "open" | "answered" | "resolved" | "closed";

/* ── DEPARTMANLAR — TEK KAYNAK ──────────────────────────────────────────────
   ⚠️ Değer listesi DB'deki CHECK ile BİREBİR aynı olmalı (sql/destek/destek-departman.sql:32 ve
   staff_departments). Buraya yeni departman eklemek YETMEZ: önce DB CHECK'i genişlet,
   yoksa insert sessizce değil GÜRÜLTÜLÜ patlar (iyi haber: sessiz bozulma yok).
   ⚠️ Mobil de talep açıyor (paraner-app/lib/support.ts) — orada da aynı liste olmalı.
   Departman kolonu DB'de DEFAULT 'teknik' → mobil eski sürüm kırılmaz.

   `ipucu` müşteriye gösterilir: yanlış departman seçimini azaltan asıl şey bu cümle.
   `oncelik` = talebin BAŞLANGIÇ önceliği. Müşteriye SORULMUYOR (bilinçli karar,
   2026-07-18: herkes "yüksek" seçer, alan bilgi taşımaz olur) — agent değiştirebilir. */
export type Department = "teknik" | "satis" | "faturalama" | "oneri";

export const DEPARTMENTS: {
  id: Department;
  label: string;
  ipucu: string;
  oncelik: "low" | "normal" | "high";
}[] = [
  {
    id: "teknik",
    label: "Teknik Destek",
    ipucu: "Uygulama hatası, giriş yapamama, veriler görünmüyor, mobil-web senkron sorunu.",
    oncelik: "normal",
  },
  {
    id: "satis",
    label: "Satış & Abonelik",
    ipucu: "Paket yükseltme, kurumsal/özel teklif, \u0022hangi plan bana uygun\u0022 soruları.",
    oncelik: "high",
  },
  {
    id: "faturalama",
    label: "Faturalandırma & Ödeme",
    ipucu: "Ödeme alınamadı, iade, fatura talebi, abonelik iptali.",
    oncelik: "high",
  },
  {
    id: "oneri",
    label: "Öneri & Geri Bildirim",
    ipucu: "Yeni özellik isteği, iyileştirme fikri, memnuniyet/şikâyet.",
    oncelik: "low",
  },
];

export const DEPARTMENT_META: Record<Department, { label: string; badge: string }> = {
  teknik: { label: "Teknik", badge: "blue" },
  satis: { label: "Satış", badge: "green" },
  faturalama: { label: "Faturalandırma", badge: "amber" },
  oneri: { label: "Öneri", badge: "gray" },
};

/** Bilinmeyen/eski değer gelse bile ekran patlamasın (mobil eski sürüm, elle yazılmış kayıt). */
export const departmentLabel = (d: string | null | undefined) =>
  DEPARTMENT_META[(d ?? "teknik") as Department]?.label ?? "Teknik";

export type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  status: TicketStatus;
  priority: string;
  category: string | null;
  /** Hangi ekibe düşecek — sql/destek/destek-departman.sql. Eski kayıtlarda DEFAULT 'teknik'. */
  department: Department;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: "user" | "agent";
  body: string;
  attachment_url: string | null;
  created_at: string;
};

/* Ticket sorgularının kolon listesi — TEK KAYNAK. Her sayfa bunu kullanmalı.
   ⚠️ Elle kopyalama YAPMA: admin gelen kutusu kendi listesini yazmıştı, içine olmayan bir
   "currency" kolonu kaçmıştı → PostgREST 400 → data null → sayfa sessizce "talep yok" dedi. */
export const TICKET_COLS =
  "id, user_id, subject, status, priority, category, department, assignee_id, created_at, updated_at, last_message_at";

export const TICKET_STATUS_META: Record<TicketStatus, { label: string; badge: string }> = {
  open: { label: "Açık", badge: "amber" },
  answered: { label: "Yanıtlandı", badge: "blue" },
  resolved: { label: "Çözüldü", badge: "green" },
  closed: { label: "Kapandı", badge: "gray" },
};
