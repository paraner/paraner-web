"use client";

import { useEffect, useState } from "react";
import { registerConfirm, type ConfirmOptions } from "./confirm";
import ConfirmDialog from "./ConfirmDialog";

// confirmDialog() çağrılarını tek bir modala bağlar. Panel layout'ta bir kez mount edilir.
export default function ConfirmProvider() {
  const [pending, setPending] = useState<{
    opts: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  useEffect(() => {
    registerConfirm((opts) => new Promise<boolean>((resolve) => setPending({ opts, resolve })));
    return () => registerConfirm(null);
  }, []);

  const close = (v: boolean) => {
    pending?.resolve(v);
    setPending(null);
  };

  return (
    <ConfirmDialog
      open={!!pending}
      title={pending?.opts.title ?? "Onayla"}
      message={pending?.opts.message ?? ""}
      confirmLabel={pending?.opts.confirmLabel}
      cancelLabel={pending?.opts.cancelLabel}
      danger={pending?.opts.danger}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );
}
