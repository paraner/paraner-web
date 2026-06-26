import Link from "next/link";
import Image from "next/image";

// Paraner wordmark + P. Masaüstünde sadece wordmark; mobilde kaydırınca "ARANER"
// kayarak P'nin arkasına gider, sadece P kalır (CSS .nav.scrolled tetikler).
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
        width={16}
        height={20}
        className="logo-p"
      />
    </Link>
  );
}
