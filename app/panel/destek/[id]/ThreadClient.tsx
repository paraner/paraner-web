"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Check, Paperclip, X } from "lucide-react";
import { showToast } from "../../../components/toast";
import { useSubmitLock } from "../../../../lib/useSubmitLock";
import { TZ } from "../../../../lib/format";
import { TICKET_FILE_ACCEPT, dosyaGecerliMi, boyutMetni } from "../../../../lib/ticketAttachments";
import Ek from "./Ek";
import {
  sendMessage,
  resolveTicket,
  subscribeMessages,
  TICKET_STATUS_META,
  type Ticket,
  type TicketMessage,
} from "../../../../lib/support";

function timeLabel(iso: string) {
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      timeZone: TZ });
  } catch {
    return "";
  }
}

export default function ThreadClient({
  ticket,
  initialMessages,
  userId,
  isAgent,
  backHref = "/panel/destek",
  headerAction,
}: {
  ticket: Ticket;
  initialMessages: TicketMessage[];
  userId: string;
  isAgent: boolean;
  /** Kabuk-özel başlık aksiyonu (admin: talep silme). Müşteri panelinde verilmez. */
  headerAction?: React.ReactNode;
  /** Geri oku nereye dönsün — admin panelinden açılınca /admin/destek (yoksa ekip
      müşteri paneline düşer; admin.* host'unda /panel app.paraner.com'a redirect edilir). */
  backHref?: string;
}) {
  const router = useRouter();
  const lock = useSubmitLock();
  const [messages, setMessages] = useState<TicketMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [dosya, setDosya] = useState<File | null>(null);
  const [status, setStatus] = useState(ticket.status);
  const endRef = useRef<HTMLDivElement>(null);

  // Bu ticket bana mı ait? Değilse (agent başkasının ticket'ına yazıyor) → sender_type 'agent'
  // ⚠️ user_id null = sahibi silinmiş. Bunu ASLA "sahibi benim" saymamalı → açık kontrol.
  // (Zaten müşteri sahipsiz talebi RLS'ten geçiremez; bu ekran ona yalnız agent tarafında açılır.)
  const ownerDeleted = ticket.user_id === null;
  const iAmOwner = !ownerDeleted && ticket.user_id === userId;
  const mySenderType: "user" | "agent" = iAmOwner ? "user" : "agent";
  const meta = TICKET_STATUS_META[status] ?? TICKET_STATUS_META.open;

  /* Sunucudan yeni veri gelince (router.refresh() sonrası) listeyi TAZELE.
     ⚠️ Bu olmadan `useState(initialMessages)` yalnız ilk mount'ta tohumlanır ve prop
     değişimini yok sayar → refresh() ekrana hiçbir şey yansıtmaz, yalnız F5 çalışırdı.
     Sunucu listesi otorite; iyimser eklediğimiz mesaj zaten orada olacağı için birleştirme
     gerekmiyor, ama henüz yazılmamışsa kaybolmasın diye yereldeki fazlalar korunuyor. */
  useEffect(() => {
    setMessages((prev) => {
      const sunucuIds = new Set(initialMessages.map((m) => m.id));
      const yereldeKalan = prev.filter((m) => !sunucuIds.has(m.id));
      return yereldeKalan.length ? [...initialMessages, ...yereldeKalan] : initialMessages;
    });
  }, [initialMessages]);

  // Realtime: yeni mesaj gelince ekle (kendi eklediğimiz mükerrer olmasın → id kontrolü)
  useEffect(() => {
    const unsub = subscribeMessages(ticket.id, (m) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    });
    return unsub;
  }, [ticket.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    // Yalnız ek gönderilebilsin (ekran görüntüsü tek başına anlamlı olabilir)
    if ((!body && !dosya) || sending || !lock.acquire()) return;
    setSending(true);
    const yeni = await sendMessage(ticket.id, body, mySenderType, dosya);
    setSending(false);
    lock.release();
    if (!yeni) {
      showToast({ title: "Gönderilemedi", message: "Mesaj iletilemedi, tekrar dene.", variant: "error" });
      return;
    }
    setText("");
    setDosya(null);
    /* Mesajı HEMEN listeye ekle — realtime echo'suna güvenme. Echo gecikirse/düşerse
       gönderen kendi mesajını sayfayı yenileyene kadar göremiyordu (2026-07-20).
       Echo sonradan gelirse id kontrolü mükerrer eklemeyi engelliyor (aşağıdaki abone). */
    setMessages((prev) => (prev.some((x) => x.id === yeni.id) ? prev : [...prev, yeni]));
    setStatus(mySenderType === "agent" ? "answered" : "open");
    router.refresh();
  }

  async function handleResolve() {
    const ok = await resolveTicket(ticket.id);
    if (ok) {
      setStatus("resolved");
      showToast({ title: "Çözüldü", message: "Talep çözüldü olarak işaretlendi.", variant: "success" });
      router.refresh();
    }
  }

  return (
    <div className="thread-wrap">
      <div className="thread-head">
        <Link href={backHref} className="thread-back" aria-label="Geri">
          <ArrowLeft size={18} />
        </Link>
        <div className="thread-head-main">
          <div className="thread-subject">{ticket.subject}</div>
          <div className="thread-sub">
            {ownerDeleted
              ? "Silinmiş müşteri · "
              : isAgent && !iAmOwner
                ? "Müşteri talebi · "
                : ""}
            Talep #{ticket.id.slice(0, 8)}
          </div>
        </div>
        <span className={`badge ${meta.badge}`}>{meta.label}</span>
        {status !== "resolved" && status !== "closed" && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleResolve}>
            <Check size={15} /> Çözüldü
          </button>
        )}
        {/* Kabuk-özel aksiyon yuvası. Admin talep SİLME butonunu buraya koyuyor.
            ⚠️ Buton bu bileşenin İÇİNE yazılmadı BİLEREK: ThreadClient müşteri panelinde de
            kullanılıyor (tek kaynak) — silme aksiyonunu buraya gömmek admin server-action
            referansını müşteri paketine sokardı. Yuva boşsa müşteri hiçbir şey görmez. */}
        {headerAction}
      </div>

      <div className="thread-body">
        {messages.map((m) => {
          // sender_id null = gönderen silinmiş → kimse "benim" saymamalı, etiket dürüst olsun.
          const senderDeleted = m.sender_id === null;
          const mine = !senderDeleted && m.sender_id === userId;
          const isAgentMsg = m.sender_type === "agent";
          return (
            <div key={m.id} className={`msg-row${mine ? " mine" : ""}`}>
              <div className={`msg-bubble${isAgentMsg ? " agent" : ""}`}>
                {!mine && (
                  <div className="msg-sender">
                    {senderDeleted
                      ? isAgentMsg
                        ? "Destek ekibi (silinmiş)"
                        : "Silinmiş kullanıcı"
                      : isAgentMsg
                        ? "Destek ekibi"
                        : "Kullanıcı"}
                  </div>
                )}
                <div className="msg-body">{m.body}</div>
                {m.attachment_url && <Ek path={m.attachment_url} />}
                <div className="msg-time">{timeLabel(m.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {status === "resolved" || status === "closed" ? (
        <div className="thread-closed">
          Bu talep {meta.label.toLocaleLowerCase("tr")}. Yeni bir sorun için Destek&apos;ten yeni talep oluşturabilirsin.
        </div>
      ) : (
        <form className="thread-compose-wrap" onSubmit={handleSend}>
          {/* Seçilen ek, GÖNDERİLMEDEN ÖNCE görünür + kaldırılabilir olmalı — yoksa kullanıcı
              neyi gönderdiğini bilmiyor (yanlış ekran görüntüsü gönderme riski). */}
          {dosya && (
            <div className="thread-ek-secili">
              <Paperclip size={13} />
              <span className="thread-ek-ad">{dosya.name}</span>
              <span className="msg-ek-dim">{boyutMetni(dosya.size)}</span>
              <button type="button" onClick={() => setDosya(null)} disabled={sending} aria-label="Eki kaldır">
                <X size={13} />
              </button>
            </div>
          )}
          <div className="thread-compose">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isAgent && !iAmOwner ? "Kullanıcıya yanıt yaz…" : "Mesajını yaz…"}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            {/* Ek — ataç. Gizli input, etiket görünür buton gibi davranıyor (native dosya
                düğmesi tema dışı kalıyor ve TR metni işletim sisteminden geliyor). */}
            <label className="thread-clip" title="Dosya ekle (görsel veya PDF, en fazla 10 MB)">
              <Paperclip size={17} />
              <input
                type="file"
                accept={TICKET_FILE_ACCEPT}
                disabled={sending}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  e.target.value = ""; // aynı dosya tekrar seçilebilsin
                  if (!f) return;
                  const hata = dosyaGecerliMi(f);
                  if (hata) {
                    showToast({ title: "Dosya eklenemedi", message: hata, variant: "error" });
                    return;
                  }
                  setDosya(f);
                }}
              />
            </label>
            <button
              type="submit"
              className="thread-send"
              disabled={(!text.trim() && !dosya) || sending}
              aria-label="Gönder"
            >
              <Send size={17} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
