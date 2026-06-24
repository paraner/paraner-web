// Global onay kutusu — native window.confirm()'ün uygulama-içi şık karşılığı.
// Promise tabanlı: `if (!(await confirmDialog({ message }))) return;`
// ConfirmProvider mount edildiğinde gerçek modalı açar; mount yoksa native confirm'e düşer.

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

let opener: ((opts: ConfirmOptions) => Promise<boolean>) | null = null;

export function registerConfirm(fn: ((opts: ConfirmOptions) => Promise<boolean>) | null): void {
  opener = fn;
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (opener) return opener(opts);
  // Güvenlik ağı: provider henüz mount edilmediyse native confirm.
  if (typeof window !== "undefined") return Promise.resolve(window.confirm(opts.message));
  return Promise.resolve(false);
}
