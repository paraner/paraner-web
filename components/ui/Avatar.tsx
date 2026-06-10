"use client";

import { useState } from "react";

// Profil/işletme avatarı — foto/logo varsa onu, yoksa (veya yüklenemezse) baş harfi gösterir.
// Bireysel profil fotoğrafı da işletme logosu da aynı (avatar_url) kolondan gelir.
export default function Avatar({
  name,
  url,
  small = false,
}: {
  name: string | null;
  url: string | null | undefined;
  small?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const letter = (name ?? "P").charAt(0).toUpperCase();
  const showImg = url && !imgError;
  return (
    <span className={`profile-avatar${small ? " sm" : ""}`}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" onError={() => setImgError(true)} />
      ) : (
        letter
      )}
    </span>
  );
}
