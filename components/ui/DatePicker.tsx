"use client";

// Özel tarih seçici — native <input type=date> yerine. Koyu+teal tema, TR,
// Pazartesi başlangıçlı takvim, ay/yıl gezinme, "Bugün". Popover body'e portal
// edilir (modalın overflow:auto'sundan kırpılmaması için), tetiğe göre konumlanır.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import { formatDate } from "../../lib/format";
import { ymd, todayStr } from "../../lib/date";

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const POP_H = 358; // tahmini popover yüksekliği (yön kararı için)

function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const [y, m, d] = (s || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

export default function DatePicker({
  value,
  onChange,
  max,
  placeholder = "Tarih seç",
}: {
  value: string; // YYYY-MM-DD veya ""
  onChange: (next: string) => void;
  max?: string; // bu tarihten sonrası seçilemez (YYYY-MM-DD)
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"days" | "months" | "years">("days");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  const parsed = parseYmd(value);
  const today = new Date();
  const [view, setView] = useState(() => ({
    y: parsed?.y ?? today.getFullYear(),
    m: parsed?.m ?? today.getMonth(),
  }));

  // Dışarıdan değer değişirse görünen ayı ona getir
  useEffect(() => {
    const p = parseYmd(value);
    if (p) setView({ y: p.y, m: p.m });
  }, [value]);

  // Konumlandır (aç + scroll/resize)
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom;
      const openUp = below < POP_H && r.top > below;
      const width = Math.max(r.width, 300);
      let left = r.left;
      if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
      if (left < 8) left = 8;
      setPos({
        left,
        top: openUp ? Math.max(8, r.top - POP_H - 6) : r.bottom + 6,
        width,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // Dış tık / Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !popRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      )
        close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    setMode("days");
  }

  const maxP = max ? parseYmd(max) : null;
  function afterMax(y: number, m: number, d: number) {
    if (!maxP) return false;
    if (y !== maxP.y) return y > maxP.y;
    if (m !== maxP.m) return m > maxP.m;
    return d > maxP.d;
  }

  function pick(d: number) {
    onChange(ymd(new Date(view.y, view.m, d)));
    close();
  }

  function buildDays(): (number | null)[] {
    const startDow = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Pzt=0
    const count = new Date(view.y, view.m + 1, 0).getDate();
    const cells: (number | null)[] = Array(startDow).fill(null);
    for (let d = 1; d <= count; d++) cells.push(d);
    return cells;
  }

  const prevMonth = () =>
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const nextMonth = () =>
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));

  const isSel = (d: number) =>
    parsed && parsed.y === view.y && parsed.m === view.m && parsed.d === d;
  const isToday = (d: number) =>
    today.getFullYear() === view.y && today.getMonth() === view.m && today.getDate() === d;

  const todayDisabled =
    !!maxP && afterMax(today.getFullYear(), today.getMonth(), today.getDate());

  const popover = open && pos && (
    <div ref={popRef} className="dp-pop" style={{ left: pos.left, top: pos.top, width: pos.width }}>
      {mode === "days" && (
        <>
          <div className="dp-head">
            <button type="button" className="dp-nav" onClick={prevMonth} aria-label="Önceki ay">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="dp-title" onClick={() => setMode("months")}>
              {MONTHS[view.m]} {view.y}
            </button>
            <button type="button" className="dp-nav" onClick={nextMonth} aria-label="Sonraki ay">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="dp-grid dp-dow">
            {WEEKDAYS.map((w) => (
              <span key={w} className="dp-dow-c">{w}</span>
            ))}
          </div>
          <div className="dp-grid">
            {buildDays().map((d, i) =>
              d === null ? (
                <span key={i} className="dp-cell empty" />
              ) : (
                <button
                  key={i}
                  type="button"
                  disabled={afterMax(view.y, view.m, d)}
                  className={`dp-cell${isSel(d) ? " sel" : ""}${isToday(d) ? " today" : ""}`}
                  onClick={() => pick(d)}
                >
                  {d}
                </button>
              )
            )}
          </div>
          <div className="dp-foot">
            <button
              type="button"
              className="dp-today-btn"
              disabled={todayDisabled}
              onClick={() => {
                onChange(todayStr());
                close();
              }}
            >
              Bugün
            </button>
            {value && (
              <button
                type="button"
                className="dp-clear-btn"
                onClick={() => {
                  onChange("");
                  close();
                }}
              >
                Temizle
              </button>
            )}
          </div>
        </>
      )}

      {mode === "months" && (
        <>
          <div className="dp-head">
            <button type="button" className="dp-nav" onClick={() => setView((v) => ({ ...v, y: v.y - 1 }))} aria-label="Önceki yıl">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="dp-title" onClick={() => setMode("years")}>
              {view.y}
            </button>
            <button type="button" className="dp-nav" onClick={() => setView((v) => ({ ...v, y: v.y + 1 }))} aria-label="Sonraki yıl">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="dp-mgrid">
            {MONTHS.map((mn, i) => (
              <button
                key={mn}
                type="button"
                className={`dp-mcell${view.m === i ? " sel" : ""}`}
                onClick={() => {
                  setView((v) => ({ ...v, m: i }));
                  setMode("days");
                }}
              >
                {mn.slice(0, 3)}
              </button>
            ))}
          </div>
        </>
      )}

      {mode === "years" &&
        (() => {
          const start = view.y - 6;
          const years = Array.from({ length: 12 }, (_, i) => start + i);
          return (
            <>
              <div className="dp-head">
                <button type="button" className="dp-nav" onClick={() => setView((v) => ({ ...v, y: v.y - 12 }))} aria-label="Geri">
                  <ChevronLeft size={18} />
                </button>
                <span className="dp-title-static">
                  {years[0]} – {years[years.length - 1]}
                </span>
                <button type="button" className="dp-nav" onClick={() => setView((v) => ({ ...v, y: v.y + 12 }))} aria-label="İleri">
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="dp-mgrid">
                {years.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    className={`dp-mcell${view.y === yr ? " sel" : ""}`}
                    onClick={() => {
                      setView((v) => ({ ...v, y: yr }));
                      setMode("months");
                    }}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </>
          );
        })()}
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`dp-trigger${open ? " open" : ""}`}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <CalIcon size={16} className="dp-trigger-ic" />
        <span className={`dp-trigger-val${value ? "" : " ph"}`}>
          {value ? formatDate(value) : placeholder}
        </span>
      </button>
      {typeof document !== "undefined" && createPortal(popover, document.body)}
    </>
  );
}
