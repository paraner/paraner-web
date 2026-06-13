"use client";

// Kategori seçici — açılır liste (ikon + renk + tik) + "Yeni kategori" satır içi
// oluşturma (ad + ikon + renk, mobil ile birebir). Liste body'e portal edilir
// (modalın overflow'undan kırpılmaz), yer yoksa yukarı açılır, kendi içinde kayar.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Plus, X, Pencil, Trash2 } from "lucide-react";
import type { Category } from "../../lib/categories";
import { CategoryIcon, AVAILABLE_ICONS } from "../../lib/categoryIcons";

// Renk paleti — mobil AVAILABLE_COLORS ile birebir
const COLORS = [
  "#E24B4A", "#D85A30", "#EF9F27", "#BA7517", "#1D9E75", "#00BFA6", "#0EA5E9", "#378ADD",
  "#1A6BFA", "#6366F1", "#8B5CF6", "#7F77DD", "#D4537E", "#EC4899", "#888780", "#64748B",
];
const POP_H = 340; // tahmini popover yüksekliği (yön kararı için)

export default function CategoryPicker({
  value,
  onChange,
  categories,
  onCreate,
  customIds = [],
  onUpdate,
  onDelete,
}: {
  value: string;
  onChange: (id: string) => void;
  categories: Category[];
  onCreate: (label: string, color: string, icon: string) => string; // yeni id döndürür
  customIds?: string[]; // düzenlenebilir/silinebilir (özel) kategori id'leri
  onUpdate?: (id: string, label: string, color: string, icon: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(AVAILABLE_ICONS[2]); // "star"
  const [color, setColor] = useState(COLORS[5]); // teal
  const customSet = new Set(customIds);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);

  const selected = categories.find((c) => c.id === value);

  // Konumlandır (aç + scroll/resize). Oluşturma formu için min 300px genişlik.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.max(r.width, 300);
      let left = r.left;
      if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
      if (left < 8) left = 8;
      const below = window.innerHeight - r.bottom;
      const openUp = below < POP_H && r.top > below;
      setPos(
        openUp
          ? { left, width, bottom: window.innerHeight - r.top + 6 }
          : { left, width, top: r.bottom + 6 }
      );
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, creating]);

  // Dış tık / Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        !popRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      )
        closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeMenu();
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

  function closeMenu() {
    setOpen(false);
    setCreating(false);
    setEditingId(null);
    setName("");
    setIcon(AVAILABLE_ICONS[2]);
    setColor(COLORS[5]);
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setName(c.label);
    setIcon(c.icon || AVAILABLE_ICONS[2]);
    setColor(c.color);
    setCreating(true);
  }

  function handleDelete(c: Category) {
    if (!confirm(`"${c.label}" kategorisi silinsin mi?`)) return;
    onDelete?.(c.id);
    closeMenu();
  }

  function submitCreate() {
    const label = name.trim();
    if (!label) return;
    if (editingId) {
      onUpdate?.(editingId, label, color, icon);
      onChange(editingId);
    } else {
      onChange(onCreate(label, color, icon));
    }
    closeMenu();
  }

  const popover = open && pos && (
    <div
      ref={popRef}
      className="cat-menu"
      style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width }}
    >
      {!creating ? (
        <>
          <div className="cat-list">
            {categories.map((c) => {
              const isCustom = customSet.has(c.id);
              return (
                <div key={c.id} className={`cat-opt${value === c.id ? " on" : ""}`}>
                  <button
                    type="button"
                    className="cat-opt-main"
                    onClick={() => {
                      onChange(c.id);
                      closeMenu();
                    }}
                  >
                    <span className="cat-ic" style={{ background: `${c.color}22` }}>
                      <CategoryIcon name={c.icon} color={c.color} size={16} />
                    </span>
                    <span className="cat-opt-name">{c.label}</span>
                  </button>
                  {isCustom ? (
                    <span className="cat-opt-actions">
                      <button
                        type="button"
                        className="cat-opt-act"
                        onClick={() => startEdit(c)}
                        aria-label="Düzenle"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="cat-opt-act danger"
                        onClick={() => handleDelete(c)}
                        aria-label="Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  ) : (
                    value === c.id && <Check size={16} className="cat-check" />
                  )}
                </div>
              );
            })}
          </div>
          <button type="button" className="cat-add" onClick={() => setCreating(true)}>
            <Plus size={16} /> Yeni kategori
          </button>
        </>
      ) : (
        <div className="cat-create">
          <div className="cat-create-head">
            <span>{editingId ? "Kategoriyi düzenle" : "Yeni kategori"}</span>
            <button
              type="button"
              className="cat-create-x"
              onClick={() => setCreating(false)}
              aria-label="Vazgeç"
            >
              <X size={15} />
            </button>
          </div>
          <input
            className="cat-create-input"
            placeholder="Kategori adı"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitCreate();
              }
            }}
            autoFocus
            maxLength={24}
          />

          <div className="cat-create-label">İkon</div>
          <div className="cat-icon-grid">
            {AVAILABLE_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                className={`cat-icon-opt${icon === ic ? " on" : ""}`}
                style={icon === ic ? { borderColor: color, color } : undefined}
                onClick={() => setIcon(ic)}
                aria-label={ic}
              >
                <CategoryIcon name={ic} size={18} />
              </button>
            ))}
          </div>

          <div className="cat-create-label">Renk</div>
          <div className="cat-swatches">
            {COLORS.map((s) => (
              <button
                key={s}
                type="button"
                className={`cat-swatch${color === s ? " on" : ""}`}
                style={{ background: s }}
                onClick={() => setColor(s)}
                aria-label={`Renk ${s}`}
              />
            ))}
          </div>

          <button
            type="button"
            className="cat-create-save"
            disabled={!name.trim()}
            onClick={submitCreate}
          >
            <CategoryIcon name={icon} size={16} color="#04130f" />
            {editingId ? "Kaydet" : "Kategori Ekle"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="cat-select">
      <button
        ref={triggerRef}
        type="button"
        className="cat-trigger"
        onClick={() => (open ? closeMenu() : setOpen(true))}
        aria-expanded={open}
      >
        {selected ? (
          <>
            <span className="cat-ic" style={{ background: `${selected.color}22` }}>
              <CategoryIcon name={selected.icon} color={selected.color} size={16} />
            </span>
            <span className="cat-trigger-name">{selected.label}</span>
          </>
        ) : (
          <span className="cat-trigger-name ph">Kategori seç</span>
        )}
        <ChevronDown className={`cat-chev${open ? " open" : ""}`} size={18} />
      </button>
      {typeof document !== "undefined" && createPortal(popover, document.body)}
    </div>
  );
}
