import Link from "next/link";
import Image from "next/image";
import AuthLogo3D from "./AuthLogo3D";

// Paraner wordmark + P. Masaüstünde sadece wordmark; mobilde kaydırınca "ARANER"
// kayarak P'nin arkasına gider, sadece P kalır (CSS .nav.scrolled tetikler).
// spinning=true → kalan P, auth'taki dönen 3B titanyum P ile aynı (nav üst bar).
export default function Logo({ spinning = false }: { spinning?: boolean }) {
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
      {spinning ? (
        <AuthLogo3D className="logo-p logo-p-3d" camZ={3.5} />
      ) : (
        <Image
          src="/paraner-p-titan.png"
          alt=""
          aria-hidden
          width={16}
          height={20}
          className="logo-p"
        />
      )}
    </Link>
  );
}
