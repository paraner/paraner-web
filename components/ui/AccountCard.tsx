// Banka/kasa/POS hesabı kartı — mobil AccountCard ile aynı görünüm. Hem Hesaplar
// kart ızgarasında hem hesap formu canlı önizlemesinde kullanılır (tek kaynak).
import { Building2, Banknote, CreditCard } from "lucide-react";
import { formatCurrency } from "../../lib/format";
import { getCardTheme } from "../../lib/cardThemes";
import { getCurrencySymbol } from "../../lib/currencies";

type AccountType = "bank" | "cash" | "pos";

const TYPE_ICON = { bank: Building2, cash: Banknote, pos: CreditCard };
const TYPE_LABEL: Record<AccountType, string> = {
  bank: "Banka Adı",
  cash: "Nakit Kasa",
  pos: "POS Hesabı",
};

// Nakit kasa illüstrasyonu (banknot destesi + altın bozuk para)
function CashArt({ symbol }: { symbol: string }) {
  return (
    <svg viewBox="0 0 96 72" className="acc-art-svg cash">
      <g transform="rotate(-10 50 26)">
        <rect x={22} y={12} width={56} height={30} rx={5} fill="rgba(255,255,255,0.18)" />
      </g>
      <g transform="rotate(-5 46 32)">
        <rect x={16} y={18} width={56} height={30} rx={5} fill="rgba(255,255,255,0.34)" />
      </g>
      <rect x={10} y={26} width={56} height={30} rx={5} fill="rgba(255,255,255,0.95)" />
      <rect x={14} y={30} width={48} height={22} rx={3} fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth={1.2} />
      <ellipse cx={38} cy={41} rx={8} ry={9.5} fill="rgba(0,0,0,0.09)" />
      <circle cx={20} cy={34} r={2.4} fill="rgba(0,0,0,0.10)" />
      <circle cx={56} cy={48} r={2.4} fill="rgba(0,0,0,0.10)" />
      <circle cx={70} cy={52} r={14} fill="#E9C46A" stroke="rgba(0,0,0,0.18)" strokeWidth={1.2} />
      <circle cx={70} cy={52} r={10.5} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
      <text x={70} y={57.5} fontSize={13} fontWeight={800} fill="#6b4f12" textAnchor="middle">
        {symbol}
      </text>
    </svg>
  );
}

// POS terminal illüstrasyonu
function PosArt() {
  const cols = [22, 36, 50];
  const rows = [54, 65, 76];
  const keypad: React.ReactElement[] = [];
  rows.forEach((cy, r) =>
    cols.forEach((cx, c) =>
      keypad.push(<circle key={`${r}-${c}`} cx={cx} cy={cy} r={3.4} fill="rgba(255,255,255,0.85)" />)
    )
  );
  return (
    <svg viewBox="0 0 72 86" className="acc-art-svg pos">
      <rect x={24} y={2} width={28} height={16} rx={2} fill="rgba(255,255,255,0.28)" />
      <line x1={29} y1={7} x2={47} y2={7} stroke="rgba(0,0,0,0.12)" strokeWidth={1.4} strokeLinecap="round" />
      <line x1={29} y1={11} x2={43} y2={11} stroke="rgba(0,0,0,0.12)" strokeWidth={1.4} strokeLinecap="round" />
      <rect x={10} y={10} width={52} height={74} rx={11} fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.55)" strokeWidth={1.6} />
      <rect x={17} y={18} width={38} height={26} rx={4} fill="rgba(255,255,255,0.92)" />
      <circle cx={36} cy={31} r={8} fill="#34D399" />
      <path d="M32.3 31 l2.6 2.7 l4.8 -5.4" stroke="#fff" strokeWidth={2.1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {keypad}
    </svg>
  );
}

export default function AccountCard({
  name,
  bankName,
  iban,
  accountNo,
  balance,
  currency,
  type,
  theme,
}: {
  name: string;
  bankName?: string | null;
  iban?: string | null;
  accountNo?: string | null;
  balance: number;
  currency: string;
  type: AccountType;
  theme?: string | null;
}) {
  const th = getCardTheme(theme);
  const Icon = TYPE_ICON[type] || Building2;
  const ibanFallback = currency === "USD" || currency === "GBP" ? "Hesap No" : "IBAN";

  return (
    <div
      className="acc-card"
      style={{
        backgroundImage: `linear-gradient(135deg, ${th.colors[0]} 0%, ${th.colors[1]} 55%, ${th.colors[2]} 100%)`,
      }}
    >
      <div
        className="acc-glow"
        style={{ background: `radial-gradient(circle at 50% 50%, ${th.glow} 0%, transparent 68%)` }}
      />

      {type === "cash" && (
        <div className="acc-art">
          <CashArt symbol={getCurrencySymbol(currency)} />
        </div>
      )}
      {type === "pos" && (
        <div className="acc-art pos">
          <PosArt />
        </div>
      )}

      <div className="acc-body">
        <div className="acc-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/paraner-wordmark.png" alt="Paraner" className="acc-logo" />
          <span className="acc-type">
            <Icon className="acc-type-ic" />
            <span className="acc-type-txt">{type === "bank" ? bankName || "Banka Adı" : TYPE_LABEL[type]}</span>
          </span>
        </div>

        <div className="acc-bottom">
          <div className="acc-balance">{formatCurrency(balance, currency)}</div>
          <div className="acc-holder">{name || "—"}</div>
          <div className="acc-row">
            {type === "bank" ? (
              <span className="acc-iban">{iban || accountNo || ibanFallback}</span>
            ) : (
              <span />
            )}
            <span className="acc-cur">{currency}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
