"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

/* Sunucudan gelen listeyi state'e tohumlar AMA sunucu verisi DEĞİŞİNCE state'i tazeler.
 *
 * ⚠️ NEDEN VAR (24.07, canlıda yakalandı): Panel modülleri sunucu verisini
 * `useState(initialX)` ile tohumluyor. React state'i yalnız İLK render'da kurar; sonradan
 * gelen yeni prop'u GÖRMEZDEN GELİR. Kendi ekleme/silme akışlarında sorun yok (modül kendi
 * state'ini de güncelliyor) — ama veri DIŞARIDAN değişirse (Parla işlem ekledi, başka
 * sekmede/telefonda değişiklik oldu) `router.refresh()` sunucuyu yeniden çalıştırsa bile
 * ekrandaki liste eski kalıyordu. Kullanıcı "eklemedi" sanıp sayfayı elle yeniliyordu.
 *
 * Kullanım: `const [list, setList] = useServerSynced(initialTransactions);`
 * Modülün kendi iyimser güncellemeleri aynen çalışır; sunucudan YENİ veri geldiğinde
 * (prop kimliği değişince) liste onunla eşitlenir — sunucu her zaman doğru kaynaktır.
 */
export function useServerSynced<T>(initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initial);
  const sonPropRef = useRef<T>(initial);

  useEffect(() => {
    // Yalnız prop GERÇEKTEN değiştiyse yaz (her render'da state ezilmesin)
    if (initial !== sonPropRef.current) {
      sonPropRef.current = initial;
      setValue(initial);
    }
  }, [initial]);

  return [value, setValue];
}
