// Hero başlığı — harf harf "blur in up" girişi (Magic UI blurInUp/by-character
// efektinin saf CSS karşılığı; bağımlılıksız). Her harf bir inline-block span,
// gecikmeli animasyon. Erişilebilirlik: h1'de aria-label, harfler aria-hidden.

const START = 0.1; // sn — ilk harf gecikmesi
const STEP = 0.025; // sn — harf başına artış

function splitChars(text: string, offset: number, extraClass = "") {
  return text.split("").map((ch, i) => (
    <span
      key={`${offset}-${i}`}
      className={`hc${extraClass ? " " + extraClass : ""}`}
      style={{ animationDelay: `${(START + (offset + i) * STEP).toFixed(3)}s` }}
      aria-hidden
    >
      {ch === " " ? " " : ch}
    </span>
  ));
}

export default function HeroTitle() {
  const line1 = "Paranı yönet,";
  const line2 = "geleceğini kur.";
  return (
    <h1 className="hero-title" aria-label={`${line1} ${line2}`}>
      {splitChars(line1, 0)}
      <br />
      <em>{splitChars(line2, line1.length, "hc-em")}</em>
    </h1>
  );
}
