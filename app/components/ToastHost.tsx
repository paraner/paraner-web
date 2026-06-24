"use client";

import { useEffect, useState } from "react";
import { subscribeToasts, dismissToast, type ToastItem } from "./toast";

// Sağ üstte yığılan bildirimleri render eder. Panel layout'ta bir kez mount edilir.
export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="toast-host">
      {items.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.variant}`}
          role="status"
          onClick={() => dismissToast(t.id)}
        >
          <span className="toast-dot" />
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            {t.message && <div className="toast-msg">{t.message}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
