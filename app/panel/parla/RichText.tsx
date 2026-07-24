"use client";

/* Parla cevaplarının metin motoru — iki iş yapar:
   ① HAFİF BİÇİMLENDİRME: model kurallara rağmen `**kalın**` ve `* madde` üretebiliyor
      (ekranda ham yıldız olarak görünüyordu). Mobildeki `MarkdownText` ile aynı sadelikte
      çözülüyor: yalnız kalın + madde işareti + başlık. HTML/markdown kütüphanesi YOK —
      model çıktısı doğrudan HTML'e çevrilmez (XSS yüzeyi açmamak için).
   ② DAKTİLO: cevap tek seferde "tak" diye basılmasın, kelime kelime aksın (mobil
      `StreamingText` deseni). Biçimlendirme ÖNCE çözüldüğü için akış sırasında ham yıldız
      görünmez — kelime ortaya çıkarken zaten kalın gelir. */

type Seg = { text: string; bold: boolean };
export type Block = { kind: "p" | "bullet"; segs: Seg[] };

/** `**kalın**` → parça listesi. Tek geçiş, kütüphanesiz. */
function parseInline(line: string): Seg[] {
  const segs: Seg[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) segs.push({ text: line.slice(last, m.index), bold: false });
    segs.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) segs.push({ text: line.slice(last), bold: false });
  return segs.length ? segs : [{ text: line, bold: false }];
}

export function parseBlocks(content: string): Block[] {
  return content.split("\n").map((raw) => {
    const line = raw.trimEnd();
    // "* madde", "- madde", "• madde" → madde işaretli satır
    const m = line.match(/^\s*[*\-•]\s+(.*)$/);
    if (m) return { kind: "bullet" as const, segs: parseInline(m[1]) };
    return { kind: "p" as const, segs: parseInline(line) };
  });
}

/** Daktilo için toplam kelime sayısı (boş satırlar da bir adım sayılır ki duraklama olsun). */
export function countWords(blocks: Block[]): number {
  let n = 0;
  for (const b of blocks) {
    for (const s of b.segs) n += s.text.split(/(\s+)/).filter((t) => t.trim()).length;
  }
  return Math.max(1, n);
}

/**
 * Blokları çizer. `reveal` verilirse yalnız ilk N kelime görünür (daktilo);
 * null ise metnin tamamı basılır (geçmiş mesajlar — yeniden yazılmaz).
 */
export default function RichText({ blocks, reveal }: { blocks: Block[]; reveal: number | null }) {
  let shown = 0;

  return (
    <>
      {blocks.map((b, bi) => {
        // Bu bloktan sonra kota bittiyse hiç çizme (sonraki satırlar henüz "yazılmadı")
        if (reveal !== null && shown >= reveal) return null;

        const kids: React.ReactNode[] = [];
        for (let si = 0; si < b.segs.length; si++) {
          const seg = b.segs[si];
          if (reveal !== null && shown >= reveal) break;

          if (reveal === null) {
            kids.push(seg.bold ? <strong key={si}>{seg.text}</strong> : <span key={si}>{seg.text}</span>);
            continue;
          }

          // Kelime kelime: boşlukları koru (split ile ayır, aynı sırada geri ekle)
          const parts = seg.text.split(/(\s+)/);
          let out = "";
          for (const p of parts) {
            if (!p.trim()) { out += p; continue; }
            if (shown >= reveal) break;
            out += p;
            shown++;
          }
          if (out) kids.push(seg.bold ? <strong key={si}>{out}</strong> : <span key={si}>{out}</span>);
        }

        if (!kids.length) return null;
        /* ⚠️ Madde satırında parçalar TEK bir sarmalayıcıya konur. Doğrudan flex'in altına
           konursa her parça (kalın başlık + kalan metin) AYRI SÜTUN olur → "İşlem Takibi:"
           daracık bir kolona sıkışır (Mehmet, 24.07). Sarmalayıcı sayesinde normal metin akışı. */
        return b.kind === "bullet"
          ? (
            <div key={bi} className="parla-li">
              <span className="parla-dot" />
              <span className="parla-li-body">{kids}</span>
            </div>
          )
          : <div key={bi} className="parla-p">{kids}</div>;
      })}
    </>
  );
}
