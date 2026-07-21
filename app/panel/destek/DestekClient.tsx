"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LifeBuoy, Plus, Search, ChevronDown, MessageCircle, Mail, ChevronRight, Paperclip, X } from "lucide-react";
import Modal from "../../../components/ui/Modal";
import Field from "../../../components/ui/Field";
import SaveButton from "../../../components/SaveButton";
import { useSubmitLock } from "../../../lib/useSubmitLock";
import { showToast } from "../../components/toast";
import { formatDate } from "../../../lib/format";
import { createTicket, TICKET_STATUS_META, DEPARTMENTS, type Ticket, type Department } from "../../../lib/support";
import { TICKET_FILE_ACCEPT, dosyaGecerliMi, boyutMetni } from "../../../lib/ticketAttachments";

const WHATSAPP = "905322379909";
const WHATSAPP_LABEL = "+90 532 237 99 09";
const EMAIL = "destek@paraner.com";

// Hazır soru-yanıt — Paraner panel modüllerine göre, DÜRÜST.
const FAQ: { q: string; a: string }[] = [
  { q: "Gelir veya gider nasıl eklerim?", a: "Sol menüden İşlemler'e gir, sağ üstten \"İşlem Ekle\"ye bas. Tür (gelir/gider), tutar, kategori ve tarih seçip kaydet. Kayıtların Genel Bakış'a ve raporlara anında yansır." },
  { q: "Yeni hesap veya kart nasıl tanımlarım?", a: "Hesaplar bölümünden \"Hesap Ekle\" ile banka, kasa veya kredi kartı ekleyip başlangıç bakiyesi girebilirsin. Bakiyeler işlemlerinle otomatik güncellenir." },
  { q: "Fatura nasıl oluşturur ve yazdırırım?", a: "Faturalar > \"Fatura Oluştur\" ile satış/alış türü, müşteri, tutar ve KDV girip kaydedersin. Oluşan faturaya tıkla, açılan detayda \"Yazdır / PDF\" ile A4 çıktı alır ya da PDF olarak kaydedersin. Çıktıda şirket bilgilerin ve logon görünür." },
  { q: "Teklif nasıl hazırlarım?", a: "Faturalar altındaki Teklifler bölümünden yeni teklif oluşturursun. Müşteri onayı sonrası teklifi faturaya dönüştürebilirsin." },
  { q: "Müşteri veya tedarikçi (cari) nasıl eklerim?", a: "Müşteriler & Tedarikçiler bölümünden kart eklersin. Vergi numarası ve adres bilgisiyle kaydedersin; bu bilgiler faturalarında kullanılır." },
  { q: "KDV raporumu nereden alırım?", a: "Vergi & Yasal altındaki KDV Raporu'ndan dönem seçip hesaplanan ve indirilecek KDV özetini görür, CSV olarak indirebilirsin." },
  { q: "Çalışan ve maaş nasıl eklerim?", a: "Çalışanlar bölümünden personel kartı açar; maaş, puantaj ve izin bilgilerini buradan yönetirsin." },
  { q: "Şirket bilgilerimi (unvan, VKN, logo) nereden girerim?", a: "Ayarlar > Hesap Bilgileri > Şirket bilgileri sekmesinden firma unvanı, VKN/TCKN, vergi dairesi, adres, IBAN ve logonu girersin. Bu bilgiler faturalarında görünür." },
  { q: "Cüzdanım'da altın ve döviz nasıl takip ederim?", a: "Cüzdanım'dan varlık ekleyip alış maliyetini girersin; güncel kurlarla toplam değerini ve kâr-zararını izlersin." },
  { q: "Verilerimi nasıl dışa veya içe aktarırım?", a: "Ayarlar > Veri & Yedekleme'den işlem, fatura, cari ve ürünlerini CSV olarak dışa aktarır; başka bir programdan (Excel, Paraşüt, Defteran) müşteri veya ürün listeni CSV ile içe aktarırsın." },
  { q: "Şifremi nasıl belirler veya değiştiririm?", a: "Ayarlar > Hesap & Güvenlik > Şifre bölümünden şifre belirler ya da değiştirirsin. Böylece doğrulama kodunun yanı sıra e-posta ve şifrenle de giriş yapabilirsin." },
  { q: "e-Fatura / e-Arşiv gönderebilir miyim?", a: "Şu anda fatura oluşturma, KDV takibi ve yazdırma/PDF destekleniyor. GİB e-Fatura/e-Arşiv entegrasyonu yol haritamızda; hazır olduğunda buradan duyuracağız." },
];

/* showOwner kaldırıldı (2026-07-18): yalnız agent gelen kutusunda kullanılıyordu,
   o blok müşteri panelinden çıkarıldı. Burada her satır zaten kullanıcının KENDİ talebi. */
function TicketRow({ t }: { t: Ticket }) {
  const meta = TICKET_STATUS_META[t.status] ?? TICKET_STATUS_META.open;
  return (
    <Link href={`/panel/destek/${t.id}`} className="ticket-row">
      <div className="ticket-row-main">
        <div className="ticket-row-subject">{t.subject}</div>
        <div className="ticket-row-meta">{formatDate(t.last_message_at)}</div>
      </div>
      <span className={`badge ${meta.badge}`}>{meta.label}</span>
      <ChevronRight size={16} className="ticket-row-chevron" />
    </Link>
  );
}

export default function DestekClient({
  myTickets,
}: {
  userId: string;
  myTickets: Ticket[];
}) {
  const router = useRouter();
  const lock = useSubmitLock();
  const [query, setQuery] = useState("");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  /* Departman ZORUNLU ama önceden seçili DEĞİL: varsayılan bırakılırsa herkes onu gönderir
     ve yönlendirme anlamsızlaşır. null → kullanıcı bilinçli seçmek zorunda. */
  const [dep, setDep] = useState<Department | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [dosya, setDosya] = useState<File | null>(null);

  const q = query.trim().toLocaleLowerCase("tr");
  const filtered = FAQ.map((f, i) => ({ f, i })).filter(
    ({ f }) => !q || (f.q + " " + f.a).toLocaleLowerCase("tr").includes(q)
  );

  const canSend = dep != null && title.trim().length > 0 && message.trim().length > 0;

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend || !lock.acquire()) return;
    setSaving(true);
    const id = await createTicket(title, message, dep!, dosya);
    setSaving(false);
    lock.release();
    if (!id) {
      showToast({ title: "Gönderilemedi", message: "Talep oluşturulamadı, tekrar dene.", variant: "error" });
      return;
    }
    setTicketOpen(false);
    setDep(null);
    setTitle("");
    setMessage("");
    setDosya(null);
    router.push(`/panel/destek/${id}`);
  }

  return (
    <div className="settings-wrap">
      {/* Üst başlık kartı + talep oluştur */}
      <div className="support-hero">
        <span className="support-hero-ic">
          <LifeBuoy size={22} />
        </span>
        <div className="support-hero-main">
          <div className="support-hero-title">Destek</div>
          <div className="support-hero-sub">
            Sorularını yanıtlamak ve sana en iyi desteği sağlamak için buradayız.
          </div>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setTicketOpen(true)}>
          <Plus size={16} /> Destek Talebi Oluştur
        </button>
      </div>

      {/* ⚠️ Agent "Gelen Talepler" kutusu 2026-07-18'de kaldırıldı — iç ekip işi müşteri
          panelinde durmamalı; artık admin.paraner.com/admin/destek'te. Detay: page.tsx başı. */}

      {/* Taleplerim */}
      {myTickets.length > 0 && (
        <div className="support-faq-panel" style={{ marginBottom: 16 }}>
          <div className="support-faq-head">
            <div>
              <h3>Taleplerim</h3>
              <p className="panel-sub" style={{ margin: 0 }}>Oluşturduğun talepler ve güncel durumları.</p>
            </div>
          </div>
          <div className="ticket-list">
            {myTickets.map((t) => <TicketRow key={t.id} t={t} />)}
          </div>
        </div>
      )}

      {/* Hızlı iletişim */}
      <div className="support-channels">
        <a className="support-channel" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">
          <span className="support-ic wa"><MessageCircle size={18} /></span>
          <div>
            <div className="support-channel-title">WhatsApp</div>
            <div className="support-channel-sub">{WHATSAPP_LABEL} · en hızlı yanıt</div>
          </div>
        </a>
        <a className="support-channel" href={`mailto:${EMAIL}`}>
          <span className="support-ic mail"><Mail size={18} /></span>
          <div>
            <div className="support-channel-title">E-posta</div>
            <div className="support-channel-sub">{EMAIL}</div>
          </div>
        </a>
      </div>

      {/* Hazır soru ve yanıtlar */}
      <div className="support-faq-panel">
        <div className="support-faq-head">
          <div>
            <h3>Hazır soru ve yanıtlar</h3>
            <p className="panel-sub" style={{ margin: 0 }}>Sık merak edilen konulara buradan ulaş.</p>
          </div>
          <label className="support-search">
            <Search size={15} />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sorularda ara…" />
          </label>
        </div>

        {filtered.length === 0 ? (
          <p className="panel-sub" style={{ padding: "20px 2px" }}>
            Aramanla eşleşen soru bulunamadı. Talep oluşturup bize yazabilirsin.
          </p>
        ) : (
          <div className="support-faq-list">
            {filtered.map(({ f, i }) => {
              const open = openIdx === i;
              return (
                <div key={i} className={`support-faq-item${open ? " open" : ""}`}>
                  <button type="button" className="support-faq-q" onClick={() => setOpenIdx(open ? null : i)} aria-expanded={open}>
                    <span>{f.q}</span>
                    <ChevronDown size={18} className="support-faq-chevron" />
                  </button>
                  {open && <div className="support-faq-a">{f.a}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {ticketOpen && (
        <Modal title="Yeni Destek Talebi" onClose={() => !saving && setTicketOpen(false)} busy={saving}>
          <form onSubmit={submitTicket}>
            <p className="set-lead" style={{ marginTop: 0 }}>
              Talebini oluştur; yanıtlandığında bildirim ve e-posta ile haber veririz, buradan sohbet gibi devam edersin.
            </p>

            {/* ⚠️ Departman seçimi = TALEBİN KİME GİDECEĞİ. Açılır liste yerine KART:
                her kartın altındaki tek cümle "buraya ne yazılır" diyor → yanlış departman
                seçimi azalır, talep doğru ekibe düşer. Öncelik SORULMUYOR (bilinçli). */}
            <Field label="Konu hangi ekibi ilgilendiriyor?">
              <div className="dep-pick">
                {DEPARTMENTS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`dep-card${dep === d.id ? " on" : ""}`}
                    onClick={() => setDep(d.id)}
                    aria-pressed={dep === d.id}
                  >
                    <span className="dep-card-title">{d.label}</span>
                    <span className="dep-card-hint">{d.ipucu}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Başlık">
              <input className="set-input" style={{ width: "100%" }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Talep başlığı" />
            </Field>
            <Field label="Mesajın">
              <textarea
                className="set-input"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Sorununu veya sorunu kısaca yaz"
                style={{ width: "100%", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
              />
            </Field>

            {/* Ek dosya — Mehmet: "kullanıcıdan ekran görüntüsü isteyebilelim, hatayı daha iyi
                anlayalım". İSTEĞE BAĞLI: zorunlu yapmak talep açmayı yavaşlatır. */}
            <Field label="Ek dosya (isteğe bağlı)">
              {dosya ? (
                <div className="thread-ek-secili">
                  <Paperclip size={13} />
                  <span className="thread-ek-ad">{dosya.name}</span>
                  <span className="msg-ek-dim">{boyutMetni(dosya.size)}</span>
                  <button type="button" onClick={() => setDosya(null)} disabled={saving} aria-label="Eki kaldır">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <label className="ek-sec-btn">
                  <Paperclip size={14} />
                  <span>Dosya seç</span>
                  <input
                    type="file"
                    accept={TICKET_FILE_ACCEPT}
                    disabled={saving}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      e.target.value = ""; // aynı dosya tekrar seçilebilsin
                      if (!f) return;
                      const hata = dosyaGecerliMi(f);
                      if (hata) {
                        showToast({ title: "Dosya eklenemedi", message: hata, variant: "error" });
                        return;
                      }
                      setDosya(f);
                    }}
                  />
                </label>
              )}
              <span className="set-hint">Ekran görüntüsü (PNG, JPG, GIF, WEBP) veya PDF · en fazla 10 MB</span>
            </Field>

            <div className="fg-actions">
              <SaveButton busy={saving} disabled={!canSend || saving}>Talebi Gönder</SaveButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
