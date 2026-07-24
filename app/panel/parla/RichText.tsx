"use client";

/* Parla cevaplarının metin motoru — iki iş yapar:
   ① HAFİF BİÇİMLENDİRME: model kurallara rağmen `**kalın**` ve `* madde` üretebiliyor
      (ekranda ham yıldız olarak görünüyordu). Mobildeki `MarkdownText` ile aynı sadelikte
      çözülüyor: yalnız kalın + madde işareti + başlık. HTML/markdown kütüphanesi YOK —
      model çıktısı doğrudan HTML'e çevrilmez (XSS yüzeyi açmamak için).
   ② DAKTİLO: cevap tek seferde "tak" diye basılmasın, kelime kelime aksın (mobil
      `StreamingText` deseni). Biçimlendirme ÖNCE çözüldüğü için akış sırasında ham yıldız
      görünmez — kelime ortaya çıkarken zaten kalın gelir. */

type Seg = { text: string; bold: boolean; tone?: "pos" | "neg" };

/* Satır İÇİNDEKİ işaretli tutar: "+5.930,00 ₺", "−1.580,00 CHF".
   Etiketi normal renkte bırakıp yalnız rakamı renklendiriyoruz — üç satırı birden
   boyamak ağır duruyordu. */
const INLINE_TUTAR = /([+\u2212-]\s?\d[\d.,]*\s?(?:₺|\$|€|£|¥|₽|₼|₹|₩|₴|zł|R\$|[A-Z]{3}))/;
export type Block = { kind: "p" | "bullet" | "amount"; segs: Seg[]; positive?: boolean };

/* Tutar satırı: "+5.000,00 ₺" / "−600,00 ₺". Sunucu işareti metnin İÇİNE koyuyor →
   sohbet geçmişinden yeniden yüklenince de renkli kalır (gelir yeşil, gider kırmızı,
   uygulamanın her yerindeki dille aynı). */
const TUTAR_RE = /^([+\u2212-])\s?[\d.,]+/;

/** Düz metni işaretli tutarlara göre böler (tutar parçaları renklenir). */
function tutarBol(text: string, bold: boolean): Seg[] {
  const out: Seg[] = [];
  for (const parca of text.split(INLINE_TUTAR)) {
    if (!parca) continue;
    if (INLINE_TUTAR.test(parca) && /^[+\u2212-]/.test(parca)) {
      out.push({ text: parca, bold, tone: parca.startsWith("+") ? "pos" : "neg" });
    } else {
      out.push({ text: parca, bold });
    }
  }
  return out;
}

/** `**kalın**` → parça listesi. Tek geçiş, kütüphanesiz. */
function parseInline(line: string): Seg[] {
  const segs: Seg[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) segs.push(...tutarBol(line.slice(last, m.index), false));
    segs.push(...tutarBol(m[1], true));
    last = m.index + m[0].length;
  }
  if (last < line.length) segs.push(...tutarBol(line.slice(last), false));
  return segs.length ? segs : [{ text: line, bold: false }];
}

export function parseBlocks(content: string): Block[] {
  /* Sondaki boş satırlar ATILIR: kelime taşımadıkları için daktilo sırasında hiç
     çizilmezler, yazma bitip tam metne geçilince birden yükseklik eklerler → metin
     "sonradan oturur" (Mehmet, 25.07). Görünürde hiçbir şey kaybetmiyoruz. */
  return content.replace(/\s+$/, "").split("\n").map((raw) => {
    const line = raw.trimEnd();
    // "* madde", "- madde", "• madde" → madde işaretli satır
    const t = line.match(TUTAR_RE);
    if (t) return { kind: "amount" as const, segs: parseInline(line), positive: t[1] === "+" };
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

          const sinif = seg.tone ? `parla-num ${seg.tone}` : undefined;
          if (reveal === null) {
            kids.push(
              seg.bold
                ? <strong key={si} className={sinif}>{seg.text}</strong>
                : <span key={si} className={sinif}>{seg.text}</span>,
            );
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
          if (out) {
            kids.push(
              seg.bold
                ? <strong key={si} className={sinif}>{out}</strong>
                : <span key={si} className={sinif}>{out}</span>,
            );
          }
        }

        /* Boş satır: kelime taşımaz ama BOŞLUK taşır. Sırası geldiğinde (yani üstündeki
           kelimeler açılmışken) çizilmeli — atlanırsa metin yazarken sıkışık durur,
           bitince araya boşluk girip aşağı kayar. Mobilde de aynı ders (MarkdownText). */
        if (!kids.length) {
          return reveal === null ? null : <div key={bi} className="parla-p" />;
        }
        /* ⚠️ Madde satırında parçalar TEK bir sarmalayıcıya konur. Doğrudan flex'in altına
           konursa her parça (kalın başlık + kalan metin) AYRI SÜTUN olur → "İşlem Takibi:"
           daracık bir kolona sıkışır (Mehmet, 24.07). Sarmalayıcı sayesinde normal metin akışı. */
        if (b.kind === "amount") {
          return <div key={bi} className={`parla-tutar${b.positive ? " pos" : " neg"}`}>{kids}</div>;
        }
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
