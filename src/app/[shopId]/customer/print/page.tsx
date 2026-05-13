import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { headers } from "next/headers";
import QRCode from "qrcode";
export const dynamic = 'force-dynamic';

export default async function CustomerPrintPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;

  const shopDoc = await getDoc(doc(db, 'shops', shopId));
  const shop = shopDoc.exists()
    ? ({ id: shopDoc.id, ...shopDoc.data() } as any)
    : null;

  if (!shop) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'sans-serif' }}>
        Shop not found.
      </div>
    );
  }

  const headersList = await headers();
  const host = headersList.get('host') || 'retlex-ai.vercel.app';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  // QR now points directly to the customer ordering page
  const qrUrl = `${baseUrl}/${shopId}/customer`;

  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 500,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#1e1b4b', light: '#ffffff' },
  });

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `window.onload = function(){ window.print(); }` }} />

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;900&family=Inter:wght@400;500;600;700;900&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', 'Noto Sans Devanagari', sans-serif; background: #f8fafc; color: #1e293b; }
        .page-wrapper { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; display: flex; flex-direction: column; overflow: hidden; }
        .top-banner { background: linear-gradient(135deg, #4338ca 0%, #6d28d9 60%, #7c3aed 100%); padding: 28px 32px 24px; text-align: center; color: white; position: relative; overflow: hidden; }
        .top-banner::before { content: ''; position: absolute; top: -40px; right: -40px; width: 160px; height: 160px; border-radius: 50%; background: rgba(255,255,255,0.06); }
        .top-banner::after { content: ''; position: absolute; bottom: -30px; left: -30px; width: 120px; height: 120px; border-radius: 50%; background: rgba(255,255,255,0.05); }
        .brand-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius: 100px; padding: 4px 14px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 14px; color: rgba(255,255,255,0.95); }
        .shop-name { font-size: 28px; font-weight: 900; letter-spacing: -0.5px; line-height: 1.1; margin-bottom: 6px; }
        .shop-meta { font-size: 13px; opacity: 0.8; line-height: 1.6; }
        .main-content { flex: 1; padding: 28px 32px; display: flex; flex-direction: column; align-items: center; gap: 22px; }
        .headline-block { text-align: center; max-width: 420px; }
        .headline-hi { font-size: 34px; font-weight: 900; color: #1e1b4b; line-height: 1.15; letter-spacing: -0.5px; }
        .headline-en { font-size: 20px; font-weight: 700; color: #4f46e5; margin-top: 4px; }
        .subline-hi { font-size: 14px; color: #475569; margin-top: 10px; line-height: 1.5; }
        .subline-en { font-size: 12px; color: #94a3b8; margin-top: 3px; }
        .qr-container { background: white; border: 3px solid #e0e7ff; border-radius: 28px; padding: 22px 22px 16px; box-shadow: 0 12px 40px rgba(79,70,229,0.14), 0 2px 8px rgba(0,0,0,0.06); display: flex; flex-direction: column; align-items: center; gap: 10px; position: relative; }
        .qr-corner { position: absolute; width: 20px; height: 20px; border-color: #4f46e5; border-style: solid; }
        .qr-corner-tl { top: 10px; left: 10px; border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
        .qr-corner-tr { top: 10px; right: 10px; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
        .qr-corner-bl { bottom: 10px; left: 10px; border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
        .qr-corner-br { bottom: 10px; right: 10px; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }
        .qr-img { width: 240px; height: 240px; display: block; border-radius: 8px; }
        .qr-scan-hint { font-size: 13px; font-weight: 700; color: #4f46e5; letter-spacing: 0.02em; }
        .qr-url { font-size: 10px; color: #94a3b8; text-align: center; word-break: break-all; max-width: 260px; }
        .steps-section { width: 100%; max-width: 440px; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1.5px solid #bbf7d0; border-radius: 20px; padding: 18px 20px; }
        .steps-title { font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.08em; text-align: center; margin-bottom: 14px; }
        .steps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .step-item { display: flex; align-items: flex-start; gap: 10px; }
        .step-num { width: 26px; height: 26px; border-radius: 50%; background: #16a34a; color: white; font-size: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .step-icon { font-size: 18px; line-height: 1; margin-bottom: 2px; }
        .step-hi { font-size: 12px; font-weight: 700; color: #14532d; line-height: 1.3; }
        .step-en { font-size: 10px; color: #166534; opacity: 0.8; line-height: 1.3; }
        .scan-tip { width: 100%; max-width: 440px; background: #fafafa; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 12px 18px; display: flex; align-items: center; gap: 14px; }
        .scan-tip-text-hi { font-size: 13px; font-weight: 700; color: #1e293b; }
        .scan-tip-text-en { font-size: 11px; color: #64748b; margin-top: 2px; }
        .page-footer { padding: 16px 32px 20px; text-align: center; border-top: 1px solid #f1f5f9; }
        .footer-tagline-hi { font-size: 16px; font-weight: 800; color: #4f46e5; }
        .footer-tagline-en { font-size: 11px; color: #94a3b8; margin-top: 3px; }
        .footer-powered { font-size: 10px; color: #cbd5e1; margin-top: 8px; letter-spacing: 0.06em; text-transform: uppercase; }
        .no-print { padding: 16px; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0; }
        .print-btn { background: #4f46e5; color: white; border: none; padding: 12px 36px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .print-btn:hover { background: #4338ca; }
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-wrapper { margin: 0; }
        }
        @media screen { body { padding: 20px 0 40px; } }
      `}} />

      <div className="page-wrapper">
        <div className="top-banner">
          <div className="brand-badge">✦ Retlex AI · Kirana Tech</div>
          <div className="shop-name">{shop.name}</div>
          {(shop.address || shop.mobile) && (
            <div className="shop-meta">
              {shop.address && <div>{shop.address}</div>}
              {shop.mobile && <div>📞 {shop.mobile}</div>}
            </div>
          )}
        </div>

        <div className="main-content">
          <div className="headline-block">
            <div className="headline-hi">सेकंडों में अपना सामान खरीदें</div>
            <div className="headline-en">Buy Yourself in Seconds</div>
            <div className="subline-hi">QR स्कैन करें — बिल देखें, ऑर्डर करें, WhatsApp पर सेव करें</div>
            <div className="subline-en">Scan QR · View bills · Place orders · Save to WhatsApp</div>
          </div>

          <div className="qr-container">
            <div className="qr-corner qr-corner-tl" />
            <div className="qr-corner qr-corner-tr" />
            <div className="qr-corner qr-corner-bl" />
            <div className="qr-corner qr-corner-br" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Scan QR Code" className="qr-img" />
            <div className="qr-scan-hint">📷 यहाँ स्कैन करें · Scan Here</div>
            <div className="qr-url">{qrUrl}</div>
          </div>

          <div className="steps-section">
            <div className="steps-title">📋 कैसे करें · How It Works</div>
            <div className="steps-grid">
              {([
                { num: 1, icon: '📷', hi: 'Camera खोलें', en: 'Open Camera / Google Lens' },
                { num: 2, icon: '🔍', hi: 'QR स्कैन करें', en: 'Scan the QR code' },
                { num: 3, icon: '🧾', hi: 'अपना बिल देखें', en: 'View your bill' },
                { num: 4, icon: '💬', hi: 'WhatsApp पर सेव करें', en: 'Save to WhatsApp' },
              ] as const).map(({ num, icon, hi, en }) => (
                <div key={num} className="step-item">
                  <div className="step-num">{num}</div>
                  <div>
                    <div className="step-icon">{icon}</div>
                    <div className="step-hi">{hi}</div>
                    <div className="step-en">{en}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="scan-tip">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <rect width="40" height="40" rx="10" fill="#f0f4ff"/>
              <circle cx="20" cy="20" r="10" fill="white" stroke="#4285F4" strokeWidth="2"/>
              <circle cx="20" cy="20" r="4" fill="#4285F4"/>
              <line x1="20" y1="8" x2="20" y2="12" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
              <line x1="20" y1="28" x2="20" y2="32" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
              <line x1="8" y1="20" x2="12" y2="20" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
              <line x1="28" y1="20" x2="32" y2="20" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
              <line x1="11.5" y1="11.5" x2="14.5" y2="14.5" stroke="#34A853" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="25.5" y1="25.5" x2="28.5" y2="28.5" stroke="#34A853" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="11.5" y1="28.5" x2="14.5" y2="25.5" stroke="#FBBC04" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="25.5" y1="14.5" x2="28.5" y2="11.5" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div>
              <div className="scan-tip-text-hi">Google Lens या Camera से स्कैन करें</div>
              <div className="scan-tip-text-en">Works with any camera app · किसी भी कैमरा ऐप से काम करता है</div>
            </div>
          </div>
        </div>

        <div className="page-footer">
          <div className="footer-tagline-hi">🛒 खरीदारी आसान, बिल तुरंत</div>
          <div className="footer-tagline-en">Shopping made simple · Bills in seconds</div>
          <div className="footer-powered">Powered by Retlex AI · retlex.ai</div>
        </div>

        <div className="no-print">
          <button className="print-btn" onClick={() => window.print()}>
            🖨️ Print / Download PDF
          </button>
        </div>
      </div>
    </>
  );
}
