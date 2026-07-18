"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Check } from "lucide-react";
import { showToast } from "../../../components/toast";
import { useSubmitLock } from "../../../../lib/useSubmitLock";
import { TZ } from "../../../../lib/format";
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
}: {
  ticket: Ticket;
  initialMessages: TicketMessage[];
  userId: string;
  isAgent: boolean;
  /** Geri oku nereye dönsün — admin panelinden açılınca /admin/destek (yoksa ekip
      müşteri paneline düşer; admin.* host'unda /panel app.paraner.com'a redirect edilir). */
  backHref?: string;
}) {
  const router = useRouter();
  const lock = useSubmitLock();
  const [messages, setMessages] = useState<TicketMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const endRef = useRef<HTMLDivElement>(null);

  // Bu ticket bana mı ait? Değilse (agent başkasının ticket'ına yazıyor) → sender_type 'agent'
  const iAmOwner = ticket.user_id === userId;
  const mySenderType: "user" | "agent" = iAmOwner ? "user" : "agent";
  const meta = TICKET_STATUS_META[status] ?? TICKET_STATUS_META.open;

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
    if (!body || sending || !lock.acquire()) return;
    setSending(true);
    const ok = await sendMessage(ticket.id, body, mySenderType);
    setSending(false);
    lock.release();
    if (!ok) {
      showToast({ title: "Gönderilemedi", message: "Mesaj iletilemedi, tekrar dene.", variant: "error" });
      return;
    }
    setText("");
    // Realtime kendi mesajımızı da getirir; anlık his için status'u da güncelle
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
            {isAgent && !iAmOwner ? "Müşteri talebi · " : ""}Talep #{ticket.id.slice(0, 8)}
          </div>
        </div>
        <span className={`badge ${meta.badge}`}>{meta.label}</span>
        {status !== "resolved" && status !== "closed" && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleResolve}>
            <Check size={15} /> Çözüldü
          </button>
        )}
      </div>

      <div className="thread-body">
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          const isAgentMsg = m.sender_type === "agent";
          return (
            <div key={m.id} className={`msg-row${mine ? " mine" : ""}`}>
              <div className={`msg-bubble${isAgentMsg ? " agent" : ""}`}>
                {!mine && (
                  <div className="msg-sender">{isAgentMsg ? "Destek ekibi" : "Kullanıcı"}</div>
                )}
                <div className="msg-body">{m.body}</div>
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
        <form className="thread-compose" onSubmit={handleSend}>
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
          <button type="submit" className="thread-send" disabled={!text.trim() || sending} aria-label="Gönder">
            <Send size={17} />
          </button>
        </form>
      )}
    </div>
  );
}
