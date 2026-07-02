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
