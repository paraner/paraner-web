/* Destek/ticket ORTAK tipleri + sabitleri — sunucu ve istemci birlikte kullanır.
   ⚠️ Bu dosyada "use client" YOK ve OLMAMALI. Sebep: `lib/support.ts` bir istemci modülü
   ("use client"); oradan bir sabiti SUNUCU bileşenine import edersen Next sana değeri değil
   bir istemci-referansı proxy'si verir → `TICKET_COLS.split is not a function`, ya da
   `TICKET_STATUS_META[status]` erişiminde patlama. Sunucu sayfaları bu dosyadan okur. */

export type TicketStatus = "open" | "answered" | "resolved" | "closed";

export type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  status: TicketStatus;
  priority: string;
  category: string | null;
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
  "id, user_id, subject, status, priority, category, assignee_id, created_at, updated_at, last_message_at";

export const TICKET_STATUS_META: Record<TicketStatus, { label: string; badge: string }> = {
  open: { label: "Açık", badge: "amber" },
  answered: { label: "Yanıtlandı", badge: "blue" },
  resolved: { label: "Çözüldü", badge: "green" },
  closed: { label: "Kapandı", badge: "gray" },
};
