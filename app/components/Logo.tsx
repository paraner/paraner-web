import Link from "next/link";
import Image from "next/image";

// Paraner wordmark (titanyum). Ana sayfaya götürür. (P-swap animasyonu kaldırıldı.)
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
    </Link>
  );
}
