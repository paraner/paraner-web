"use client";

import { useEffect } from "react";

// Statik splash boyandıktan hemen sonra panele geç. Tam sayfa yönlendirmesinde
// tarayıcı, /panel hazır olana kadar bu splash'ı ekranda TUTAR → logo kesintisiz görünür,
// siyah ekran olmaz. Panel kendi splash'ıyla devralır (aynı wordmark → dikişsiz).
export default function AcilisRedirect() {
  useEffect(() => {
    window.location.replace("/panel");
  }, []);
  return null;
}
