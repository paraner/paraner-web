import Link from "next/link";
import Image from "next/image";

// Paraner logosu — üstte tam WORDMARK, kaydırınca (.nav.scrolled) sadece P'ye geçer.
// İki görsel üst üste; CSS opacity + .logo genişliği ile yumuşak çapraz geçiş.
// Footer'da (.nav dışında) her zaman wordmark görünür.
export default function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Paraner ana sayfa">
      <Image
        src="/paraner-wordmark-titan.png"
        alt="Paraner"
        width={118}
        height={24}
        className="logo-wordmark"
        priority
      />
      <Image
        src="/paraner-p-titan.png"
        alt=""
        aria-hidden
        width={24}
        height={30}
        className="logo-p"
      />
    </Link>
  );
}
