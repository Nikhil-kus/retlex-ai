import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { headers } from "next/headers";
export const dynamic = 'force-dynamic';

export default async function QRPrintPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;

  const shopQuery = query(collection(db, "shops"), where("qrCodeId", "==", shopId));
  const shopSnapshot = await getDocs(shopQuery);
  const shop = shopSnapshot.empty ? null : { id: shopSnapshot.docs[0].id, ...shopSnapshot.docs[0].data() } as any;

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Shop not found.
      </div>
    );
  }

  // Derive base URL from request headers (works on Vercel and locally)
  const headersList = await headers();
  const host = headersList.get('host') || 'retlex-ai.vercel.app';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const qrUrl = `${baseUrl}/qr/${shopId}`;
  const qrImageUrl = `https://chart.googleapis.com/chart?cht=qr&chs=400x400&chl=${encodeURIComponent(qrUrl)}&choe=UTF-8&chld=H|1`;

  return (
    <>
      {/* Auto-print on load */}
      <script dangerouslySetInnerHTML={{ __html: `window.onload = function(){ window.print(); }` }} />

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;900&family=Inter:wght@400;600;700;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', 'Noto Sans Devanagari', sans-serif; background: white; }
        @media print {
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}} />

      <div style={{
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0',
        overflow: 'hidden',
      }}>

        {/* Top gradient banner */}
        <div style={{
          width: '100%',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          padding: '32px 24px 24px',
          textAlign: 'center',
          color: 'white',
        }}>
          {/* Shop name */}
          <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '4px' }}>
            {shop.name}
          </div>
          {shop.address && (
            <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '2px' }}>{shop.address}</div>
          )}
          {shop.mobile && (
            <div style={{ fontSize: '13px', opacity: 0.85 }}>📞 {shop.mobile}</div>
          )}
        </div>

        {/* Main content */}
        <div style={{ width: '100%', padding: '28px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>

          {/* Headline bilingual */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 900, color: '#1e1b4b', lineHeight: 1.15 }}>
              अपना बिल खुद देखें
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#4f46e5', marginTop: '4px' }}>
              View Your Bill Instantly
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', marginTop: '8px', maxWidth: '340px', margin: '8px auto 0' }}>
              बिलिंग के बाद इस QR को स्कैन करें और अपना बिल तुरंत देखें
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
              Scan after billing to see your receipt in seconds
            </div>
          </div>

          {/* QR code box */}
          <div style={{
            background: 'white',
            border: '3px solid #e0e7ff',
            borderRadius: '24px',
            padding: '20px',
            boxShadow: '0 8px 32px rgba(79,70,229,0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageUrl}
              alt="Scan QR Code"
              width={220}
              height={220}
              style={{ borderRadius: '12px', display: 'block' }}
            />
            <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
              {qrUrl}
            </div>
          </div>

          {/* How to scan — Google Lens instruction */}
          <div style={{
            background: '#f0fdf4',
            border: '1.5px solid #bbf7d0',
            borderRadius: '16px',
            padding: '16px 20px',
            width: '100%',
            maxWidth: '420px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', marginBottom: '10px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📷 कैसे स्कैन करें / How to Scan
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { step: '1', hi: 'Google Lens खोलें', en: 'Open Google Lens (camera icon in Google app)' },
                { step: '2', hi: 'QR कोड पर कैमरा लगाएं', en: 'Point your camera at this QR code' },
                { step: '3', hi: 'लिंक पर टैप करें', en: 'Tap the link that appears' },
                { step: '4', hi: 'अपना बिल देखें और डाउनलोड करें', en: 'View & download your bill instantly' },
              ].map(({ step, hi, en }) => (
                <div key={step} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: '#16a34a', color: 'white',
                    fontSize: '11px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: '1px',
                  }}>{step}</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#14532d' }}>{hi}</div>
                    <div style={{ fontSize: '11px', color: '#166534', opacity: 0.8 }}>{en}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Google Lens icon hint */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: '#fafafa', border: '1.5px solid #e2e8f0',
            borderRadius: '14px', padding: '12px 20px',
            width: '100%', maxWidth: '420px',
          }}>
            {/* Google Lens colored icon (SVG) */}
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="8" fill="#f8fafc"/>
              <path d="M18 8C12.477 8 8 12.477 8 18s4.477 10 10 10 10-4.477 10-10S23.523 8 18 8z" fill="#e8f0fe"/>
              <path d="M18 13a5 5 0 100 10A5 5 0 0018 13z" fill="white" stroke="#4285F4" strokeWidth="1.5"/>
              <circle cx="18" cy="18" r="2.5" fill="#4285F4"/>
              <path d="M18 8v3M18 25v3M8 18h3M25 18h3" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M11.5 11.5l2 2M22.5 22.5l2 2M11.5 24.5l2-2M22.5 13.5l2-2" stroke="#34A853" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                Google Lens से स्कैन करें
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Any camera app works · किसी भी कैमरा ऐप से काम करता है
              </div>
            </div>
          </div>

          {/* Bottom tagline */}
          <div style={{ textAlign: 'center', marginTop: '4px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#4f46e5' }}>
              🛒 खरीदारी आसान, बिल तुरंत
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              Shopping made simple · Powered by Retlex
            </div>
          </div>
        </div>

        {/* Print button — hidden when printing */}
        <div className="no-print" style={{ padding: '16px', textAlign: 'center' }}>
          <button
            onClick={() => window.print()}
            style={{
              background: '#4f46e5', color: 'white', border: 'none',
              padding: '12px 32px', borderRadius: '12px', fontSize: '15px',
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            🖨️ Print / Download
          </button>
        </div>
      </div>
    </>
  );
}
