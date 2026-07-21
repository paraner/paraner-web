"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import Modal from "../../../../components/ui/Modal";
import {
  DELETE_REASONS,
  NOTE_REQUIRED_FOR,
  DELETE_NOTE_MAX,
  type DeleteReasonId,
} from "../../../../lib/deleteReasons";

/* Kalıcı silme onayı — sebep + not (2026-07-20, Mehmet).
   Neden `confirmDialog` DEĞİL: o bileşen `Promise<boolean>` döndürüyor, form/input alamıyor
   ve 30+ çağıranı var (app/panel/* tümü) → dönüş tipini genişletmek hepsini riske atardı.
   Silme tek ekran olduğu için ona özel modal daha ucuz ve güvenli.

   Tasarım kararı: "sil" butonu, sebep seçilene kadar KAPALI. Sebepsiz silme mümkün olmamalı —
   denetim kaydının tek değeri "neden" alanında. */
export default function SilModal({
  email,
  busy,
  onClose,
  onConfirm,
}: {
  email: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: DeleteReasonId, note: string) => void;
}) {
  const [reason, setReason] = useState<DeleteReasonId | "">("");
  const [note, setNote] = useState("");

  const notZorunlu = reason !== "" && NOTE_REQUIRED_FOR.includes(reason);
  const gonderilebilir = reason !== "" && (!notZorunlu || note.trim().length > 0);

  return (
    <Modal title="Hesabı kalıcı sil" onClose={onClose} busy={busy}>
      <p style={{ margin: "0 0 14px", fontSize: 13, lineHeight: 1.5 }}>
        <b>{email}</b> ve tüm verisi (profiller, işlemler, faturalar) kalıcı olarak silinecek.{" "}
        <b style={{ color: "var(--danger)" }}>Bu işlem geri alınamaz.</b> Silinen kişiye
        &quot;Görüşmek üzere&quot; maili gider.
      </p>

      <p className="admin-td-dim" style={{ fontSize: 12.5, margin: "0 0 14px", lineHeight: 1.5 }}>
        Sebep ve not <b>denetim kaydına</b> yazılır — ileride &quot;bu hesabı kim, neden
        sildi&quot; sorusunun cevabı burada durur.
      </p>

      <label className="sil-alan">
        <span className="admin-field-label">Silme sebebi</span>
        <select
          className="admin-select sil-genis"
          value={reason}
          onChange={(e) => setReason(e.target.value as DeleteReasonId | "")}
          disabled={busy}
          autoFocus
        >
          <option value="">— Sebep seç —</option>
          {DELETE_REASONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        {reason !== "" && (
          <span className="admin-td-dim" style={{ fontSize: 12, display: "block", marginTop: 5 }}>
            {DELETE_REASONS.find((r) => r.id === reason)?.hint}
          </span>
        )}
      </label>

      <label className="sil-alan">
        <span className="admin-field-label">
          Not {notZorunlu ? <b style={{ color: "var(--danger)" }}>(zorunlu)</b> : "(isteğe bağlı)"}
        </span>
        <textarea
          className="sil-not"
          rows={3}
          maxLength={DELETE_NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={busy}
          placeholder={
            notZorunlu
              ? "Ne olduğunu yaz — 'Diğer' tek başına bir şey anlatmıyor."
              : "Örn. destek talebi #a1b2 üzerinden yazılı olarak istedi."
          }
        />
        <span className="admin-td-dim" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
          {note.length}/{DELETE_NOTE_MAX}
        </span>
      </label>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
          Vazgeç
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          disabled={busy || !gonderilebilir}
          onClick={() => reason !== "" && onConfirm(reason, note)}
        >
          <Trash2 size={14} />
          {busy ? "Siliniyor…" : "Kalıcı olarak sil"}
        </button>
      </div>
    </Modal>
  );
}
