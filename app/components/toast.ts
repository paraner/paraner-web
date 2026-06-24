// Uygulama geneli bildirim (toast) — mobil app'teki showToast/GlobalToast'un web karşılığı.
// Modül-seviyesi basit emitter (harici bağımlılık yok). ToastHost bileşeni dinler ve render eder.
// Her yerden hook'suz çağrılır: import { showToast } from ".../components/toast"

export type ToastVariant = "success" | "error" | "info";
export type ToastItem = { id: number; title: string; message?: string; variant: ToastVariant };

let toasts: ToastItem[] = [];
const listeners = new Set<(t: ToastItem[]) => void>();
let nextId = 1;

function emit() {
  for (const l of listeners) l(toasts);
}

export function subscribeToasts(l: (t: ToastItem[]) => void): () => void {
  listeners.add(l);
  l(toasts);
  return () => {
    listeners.delete(l);
  };
}

export function showToast(t: {
  title: string;
  message?: string;
  variant?: ToastVariant;
  duration?: number;
}): void {
  const id = nextId++;
  const item: ToastItem = {
    id,
    title: t.title,
    message: t.message,
    variant: t.variant ?? "success",
  };
  toasts = [...toasts, item];
  emit();
  const dur = t.duration ?? 3500;
  setTimeout(() => dismissToast(id), dur);
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((x) => x.id !== id);
  emit();
}
