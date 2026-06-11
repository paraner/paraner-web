"use client";

import { useState } from "react";
import { formatCurrency } from "../../../lib/format";
import PageHead from "../../../components/ui/PageHead";
import Field from "../../../components/ui/Field";

const RATES = [1, 8, 10, 18, 20];

export default function KdvClient({ currency }: { currency: string }) {
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("20");
  const [mode, setMode] = useState<"add" | "extract">("add"); // add: KDV hariç→ekle, extract: dahil→ayır

  const a = Number(amount.replace(",", ".")) || 0;
  const r = Number(rate.replace(",", ".")) || 0;

  let base: number, vat: number, total: number;
  if (mode === "add") {
    base = a;
    vat = (a * r) / 100;
    total = a + vat;
  } else {
    total = a;
    base = r > -100 ? a / (1 + r / 100) : a;
    vat = total - base;
  }

  return (
    <>
      <PageHead title="KDV Hesapla" sub="KDV ekle veya dahil tutardan ayrıştır" />

      <div className="kdv-wrap">
        <div className="type-toggle" style={{ marginBottom: 18 }}>
          <button
            type="button"
            className={mode === "add" ? "on-income" : ""}
            onClick={() => setMode("add")}
          >
            KDV Hariç Tutardan
          </button>
          <button
            type="button"
            className={mode === "extract" ? "on-income" : ""}
            onClick={() => setMode("extract")}
          >
            KDV Dahil Tutardan
          </button>
        </div>

        <div className="form-row">
          <Field label={mode === "add" ? "Tutar (KDV hariç)" : "Tutar (KDV dahil)"}>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="KDV Oranı (%)">
            <input
              type="text"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </Field>
        </div>

        <div className="kdv-rates">
          {RATES.map((x) => (
            <button
              key={x}
              type="button"
              className={`kdv-rate${Number(rate) === x ? " on" : ""}`}
              onClick={() => setRate(String(x))}
            >
              %{x}
            </button>
          ))}
        </div>

        <div className="kdv-result">
          <div className="kdv-line">
            <span>Matrah (KDV hariç)</span>
            <strong>{formatCurrency(base, currency)}</strong>
          </div>
          <div className="kdv-line">
            <span>KDV (%{r})</span>
            <strong style={{ color: "var(--teal)" }}>{formatCurrency(vat, currency)}</strong>
          </div>
          <div className="kdv-line kdv-total">
            <span>Genel Toplam</span>
            <strong>{formatCurrency(total, currency)}</strong>
          </div>
        </div>
      </div>
    </>
  );
}
