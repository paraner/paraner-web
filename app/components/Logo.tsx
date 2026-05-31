import Link from "next/link";

// Paraner logosu — teal gradyan kare + kelime markası. Ana sayfaya götürür.
export default function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Paraner ana sayfa">
      <span className="logo-mark">₺</span>
      <span className="logo-text">Paraner</span>
    </Link>
  );
}
