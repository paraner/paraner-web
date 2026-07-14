// CSV üretimi — formül enjeksiyonuna karşı güvenli.
// Excel/LibreOffice/Sheets bir hücre =, +, -, @, TAB veya CR ile başlıyorsa onu
// FORMÜL olarak yorumlar → =HYPERLINK(...) ile veri sızdırma / DDE ile komut. Bu
// yüzden riskli hücrelerin başına tek tırnak (') koyup metin olmaya zorlarız.
// Ayrıca çift tırnakları RFC 4180'e göre ikiye katlarız (yoksa " içeren ad CSV'yi bozar).
function safeCell(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  const guarded = /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  return `"${guarded.replace(/"/g, '""')}"`;
}

// Satır dizisini (başlık + veriler) UTF-8 BOM'lu CSV metnine çevirir.
// BOM → Excel Türkçe karakterleri doğru okur.
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return "﻿" + rows.map((r) => r.map(safeCell).join(",")).join("\n");
}

// ─── İÇE AKTARMA ───────────────────────────────────────────────────────────
// CSV metnini satır/hücre dizisine çevirir (RFC 4180: tırnaklı alanlar, "" kaçışı,
// hücre içinde virgül ve satır sonu). Ayırıcı otomatik: Excel TR sürümü ";" yazar.
export function parseCsv(text: string): string[][] {
  // BOM'u at (Excel yazıyor) + satır sonlarını normalle
  const src = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  // Ayırıcıyı ilk satırdan tahmin et: hangisi daha çoksa o (tırnak DIŞINDAKİLERE bakarak)
  const head = src.split("\n")[0] ?? "";
  const outside = head.replace(/"[^"]*"/g, "");
  const delim = (outside.match(/;/g)?.length ?? 0) > (outside.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } // "" → tek tırnak
        else inQuotes = false;
      } else cell += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === delim) { row.push(cell); cell = ""; continue; }
    if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }

  // Dışa aktarmada formül koruması için eklenen baştaki tek tırnağı geri al (tur kapansın)
  return rows
    .map((r) => r.map((v) => v.trim().replace(/^'(?=[=+\-@])/, "")))
    .filter((r) => r.some((v) => v !== ""));
}

// Hazır CSV metnini dosya olarak indirir (tarayıcı).
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
