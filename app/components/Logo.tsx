import Link from "next/link";
import Image from "next/image";

// Paraner logosu — marka ikonu (teal monogram) + kelime markası. Ana sayfaya götürür.
export default function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Paraner ana sayfa">
      <Image
        src="/paraner-logo.png"
        alt="Paraner"
        width={30}
        height={30}
        className="logo-mark"
        priority
      />
      <span className="logo-text">Paraner</span>
    </Link>
  );
}
