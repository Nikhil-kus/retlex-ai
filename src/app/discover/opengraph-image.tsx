import { ImageResponse } from 'next/og';

export const alt = 'Retlex AI — Find what’s nearby. Instantly. Voice billing today. Connected local discovery as the vision.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '64px 74px', background: '#fafaf6', color: '#252924', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg width="44" height="46" viewBox="0 0 44 46"><rect width="44" height="46" rx="12" fill="#c34825" /><path d="M13 17h18l2 17H11l2-17Z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" /><path d="M17 19v-6a5 5 0 0 1 10 0v6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>
        <span style={{ fontSize: 38, fontWeight: 700, letterSpacing: -2 }}>retlex.</span><span style={{ fontSize: 14, color: '#696c64' }}>AI</span>
      </div>
      <div style={{ display: 'flex', marginTop: 50, fontSize: 14, letterSpacing: 3, color: '#696c64' }}>THE NEXT CHAPTER OF LOCAL RETAIL</div>
      <div style={{ display: 'flex', marginTop: 22, fontSize: 78, fontWeight: 700, letterSpacing: -4 }}>Find what’s nearby.</div>
      <div style={{ display: 'flex', fontSize: 78, fontWeight: 700, letterSpacing: -4, color: '#c34825' }}>Instantly.</div>
      <div style={{ display: 'flex', marginTop: 30, fontSize: 21, color: '#696c64' }}>A searchable neighbourhood starts with connected stores.</div>
      <div style={{ display: 'flex', gap: 20, marginTop: 'auto', paddingTop: 26, borderTop: '1px solid #e4e4db', fontSize: 15 }}>
        <span style={{ color: '#456338' }}>Voice billing · Working product</span><span style={{ color: '#88724d' }}>Discovery · Concept demo</span><span style={{ marginLeft: 'auto', color: '#696c64' }}>retlex.shop/discover</span>
      </div>
    </div>, size,
  );
}
