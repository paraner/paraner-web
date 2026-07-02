import { useRef } from "react";

// Çift-submit (double-submit) kilidi — SENKRON useRef.
// `disabled={saving}` / `if (saving) return` yeterli DEĞİL: setSaving(true) asenkron
// olduğundan, React yeniden render edip butonu disabled yapana kadar iki hızlı
// tık/Enter da handler'a girer → mükerrer kayıt + çift bakiye. useRef ANINDA set
// edildiği için ikinci çağrı acquire()'da erken döner. (Mobil tarafındaki
// useSubmitLock ile aynı mantık — bkz. paraner-app GUVENLIK.md 12.06.)
//
// Kullanım:
//   const lock = useSubmitLock();
//   async function handleSave(e) {
//     e.preventDefault();
//     ...validasyon (acquire'dan ÖNCE)...
//     if (!lock.acquire()) return;   // ikinci tık burada elenir
//     setSaving(true);
//     try { ...kaydet... } finally { setSaving(false); lock.release(); }
//   }
export function useSubmitLock() {
  const locked = useRef(false);
  return {
    acquire(): boolean {
      if (locked.current) return false;
      locked.current = true;
      return true;
    },
    release(): void {
      locked.current = false;
    },
  };
}
