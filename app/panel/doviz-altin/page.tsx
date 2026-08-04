import { fetchMarket } from "../../../lib/market";
import DovizAltinClient from "./DovizAltinClient";

// Piyasa verisi SUNUCUDA çekilir (CORS yok) ve Next fetch ile 5 dk cache'lenir —
// bkz. lib/market.ts. Profil/DB gerekmiyor: bu sayfa tamamen kullanıcıdan bağımsız.
export default async function DovizAltinPage() {
  const market = await fetchMarket();

  return (
    <DovizAltinClient
      currencies={market.currencies}
      gold={market.gold}
      isStale={market.isStale ?? false}
      timestamp={market.timestamp}
    />
  );
}
