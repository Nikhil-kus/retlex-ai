'use client';
/**
 * DebugPanel.tsx — Developer-only floating debug panel.
 * Only active when NEXT_PUBLIC_DEBUG === "true".
 * Reads from debugDataRef; zero impact on app logic.
 */
import { useState, useCallback, useEffect } from 'react';

// ── Trace types ───────────────────────────────────────────────────────────

export interface MergeRecord {
  callSite: string;       // 'onresult-inner' | 'onresult-global' | 'onend'
  s1: string; s2: string;
  s1Len: number; s2Len: number;
  maxOverlap: number;
  result: string; resultLen: number;
  truncation: boolean;
  truncationDetail: string;
}

export interface OnResultRecord {
  eventIndex: number;
  segments: { idx: number; isFinal: boolean; text: string }[];
  mergedSegments: string;
  globalBefore: string;
  fullText: string;
  processedQuery: string;
  truncation: boolean;
  truncationDetail: string;
}

export interface OnEndRecord {
  globalBefore: string; currentBreath: string;
  globalAfter: string;
  truncation: boolean; truncationDetail: string;
}

export interface TraceEntry {
  seq: number; ts: number;
  kind: 'onresult' | 'merge' | 'onend' | 'process';
  onresult?: OnResultRecord;
  merge?: MergeRecord;
  onend?: OnEndRecord;
  process?: { query: string };
}

// ── FuseRow / DecisionRow / CacheEntry ───────────────────────────────────

export interface FuseRow {
  'Product Name': string; 'Product ID': string; 'Search': string;
  'Matched Field': string; 'Matched Value': string;
  'Match Indices': string; 'Raw Fuse Score': string;
}

export interface DecisionRow {
  'Product Name': string; 'Product ID': string; 'Found By': string;
  'Matched Field': string; 'Matched Value': string; 'Match Indices': string;
  'Raw Fuse Score': string; 'querySyl': number | string; 'matchSyl': number | string;
  'Syllable Penalty': string; 'isCandLoose': boolean | string; 'isNameComp': boolean | string;
  'Weight Adj': string; 'Adj Reason': string; 'Final Score': string;
  'Final Rank': number | string; 'bestMatch?': string; 'Removed?': string; 'Removal Reason': string;
}

export interface CacheEntry { key: string; hit: boolean; result: any; }

// ── DebugData ─────────────────────────────────────────────────────────────

export interface DebugData {
  // Voice summary
  spokenText: string; normalizedText: string;
  language: string; processingTimeMs: string;
  bestMatchName: string; bestMatchPath: string;
  // Transcript pipeline
  traceEntries: TraceEntry[];
  traceSeq: number;
  truncationDetected: boolean;
  displayedTranscript: string;
  processedQuery: string;
  globalTranscript: string;
  currentBreath: string;
  // Search
  stage1: FuseRow[]; stage2: FuseRow[]; stage3: any[]; stage4: DecisionRow[];
  // Cache
  cacheEntries: CacheEntry[];
  // Perf
  perfParse: string; perfFuse: string; perfEnrichment: string;
  perfSuggestions: string; perfSetState: string; perfTotal: string; perfItems: number;
}

export type DebugDataRef = React.MutableRefObject<DebugData>;

export function makeEmptyDebugData(): DebugData {
  return {
    spokenText: '', normalizedText: '', language: 'hi-IN', processingTimeMs: '—',
    bestMatchName: '—', bestMatchPath: 'none',
    traceEntries: [], traceSeq: 0, truncationDetected: false,
    displayedTranscript: '', processedQuery: '', globalTranscript: '', currentBreath: '',
    stage1: [], stage2: [], stage3: [], stage4: [], cacheEntries: [],
    perfParse: '—', perfFuse: '—', perfEnrichment: '—',
    perfSuggestions: '—', perfSetState: '—', perfTotal: '—', perfItems: 0,
  };
}

// ── UI helpers ────────────────────────────────────────────────────────────

const TABS = ['🗣 Voice', '🔎 Search', '📦 Cache', '⚡ Perf'] as const;
type Tab = typeof TABS[number];

function Badge({ text, color }: { text: string; color: string }) {
  return <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>{text}</span>;
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12 }}>
      <span style={{ color: '#94a3b8', minWidth: 140, flexShrink: 0 }}>{k}</span>
      <span style={{ color: '#f1f5f9', wordBreak: 'break-all' }}>{v ?? '—'}</span>
    </div>
  );
}

function SortableTable({ rows, highlight }: { rows: Record<string, any>[]; highlight?: (r: any) => 'green' | 'red' | 'orange' | null }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  if (!rows || rows.length === 0) return <p style={{ color: '#64748b', fontSize: 12, padding: '8px 0' }}>No data yet.</p>;
  const cols = Object.keys(rows[0]);
  const sorted = sortCol ? [...rows].sort((a, b) => {
    const av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
    const an = parseFloat(String(av)), bn = parseFloat(String(bv));
    const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  }) : rows;
  const toggleSort = (c: string) => { if (sortCol === c) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(c); setSortDir('asc'); } };
  const rowBg = (row: any) => { const h = highlight?.(row); return h === 'green' ? 'rgba(34,197,94,0.15)' : h === 'red' ? 'rgba(239,68,68,0.15)' : h === 'orange' ? 'rgba(249,115,22,0.15)' : 'transparent'; };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%', minWidth: 500 }}>
        <thead><tr>{cols.map(c => <th key={c} onClick={() => toggleSort(c)} style={{ cursor: 'pointer', padding: '4px 8px', background: '#1e293b', color: '#94a3b8', textAlign: 'left', whiteSpace: 'nowrap', userSelect: 'none', borderBottom: '1px solid #334155' }}>{c}{sortCol === c ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}</th>)}</tr></thead>
        <tbody>{sorted.map((row, i) => <tr key={i} style={{ background: rowBg(row) }}>{cols.map(c => <td key={c} style={{ padding: '3px 8px', color: '#e2e8f0', borderBottom: '1px solid #1e293b', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }} title={String(row[c] ?? '')}>{String(row[c] ?? '—')}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

// ── Transcript Pipeline UI ────────────────────────────────────────────────

function MergeCard({ m, idx }: { m: MergeRecord; idx: number }) {
  const bg = m.truncation ? 'rgba(220,38,38,0.18)' : 'rgba(30,41,59,0.6)';
  const border = m.truncation ? '1.5px solid #dc2626' : '1px solid #334155';
  return (
    <div style={{ background: bg, border, borderRadius: 6, padding: '6px 8px', marginBottom: 4, fontSize: 11 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
        <span style={{ color: '#94a3b8', fontSize: 10 }}>MERGE [{m.callSite}]</span>
        {m.truncation && <Badge text="⚠ TRUNCATION" color="#dc2626" />}
      </div>
      <Kv k={`s1 (${m.s1Len} chars)`} v={<span style={{ color: m.truncation ? '#fca5a5' : '#e2e8f0' }}>"{m.s1}"</span>} />
      <Kv k={`s2 (${m.s2Len} chars)`} v={`"${m.s2}"`} />
      <Kv k="overlap" v={m.maxOverlap} />
      <Kv k={`result (${m.resultLen} chars)`} v={<span style={{ color: m.truncation ? '#f87171' : '#86efac', fontWeight: 700 }}>"{m.result}"</span>} />
      {m.truncation && <div style={{ color: '#f87171', fontWeight: 700, marginTop: 3, fontSize: 11 }}>⚠ {m.truncationDetail}</div>}
    </div>
  );
}

function TraceEntryCard({ entry }: { entry: TraceEntry }) {
  const hasTruncation =
    (entry.merge?.truncation) ||
    (entry.onresult?.truncation) ||
    (entry.onend?.truncation);

  const borderColor = hasTruncation ? '#dc2626' : entry.kind === 'onend' ? '#f59e0b' : entry.kind === 'process' ? '#7c3aed' : '#334155';

  return (
    <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: 8, padding: '7px 10px', marginBottom: 6, fontSize: 11, background: hasTruncation ? 'rgba(220,38,38,0.10)' : '#0f172a' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
        <span style={{ color: '#64748b', fontSize: 10 }}>#{entry.seq}</span>
        <span style={{ fontWeight: 700, color: hasTruncation ? '#f87171' : entry.kind === 'onend' ? '#fbbf24' : entry.kind === 'process' ? '#a78bfa' : '#94a3b8', fontSize: 11, textTransform: 'uppercase' }}>{entry.kind}</span>
        {hasTruncation && <Badge text="⚠ TRUNCATION" color="#dc2626" />}
      </div>

      {entry.kind === 'merge' && entry.merge && <MergeCard m={entry.merge} idx={entry.seq} />}

      {entry.kind === 'onresult' && entry.onresult && (() => {
        const r = entry.onresult;
        return <>
          <Kv k="Event index" v={r.eventIndex} />
          <Kv k="Segments" v={r.segments.map(s => `[${s.idx}] "${s.text}" (${s.isFinal ? 'FINAL' : 'interim'})`).join(' | ')} />
          <Kv k="merged(segments)" v={`"${r.mergedSegments}"`} />
          <Kv k="globalBefore" v={`"${r.globalBefore}"`} />
          <Kv k="fullText" v={<span style={{ color: r.truncation ? '#f87171' : '#86efac', fontWeight: 700 }}>"{r.fullText}"</span>} />
          <Kv k="processedQuery" v={<span style={{ color: '#a78bfa', fontWeight: 700 }}>"{r.processedQuery}"</span>} />
          {r.truncation && <div style={{ color: '#f87171', fontWeight: 700, marginTop: 3 }}>⚠ {r.truncationDetail}</div>}
        </>;
      })()}

      {entry.kind === 'onend' && entry.onend && (() => {
        const e = entry.onend;
        return <>
          <Kv k="globalBefore" v={`"${e.globalBefore}"`} />
          <Kv k="currentBreath" v={`"${e.currentBreath}"`} />
          <Kv k="globalAfter" v={<span style={{ color: e.truncation ? '#f87171' : '#86efac', fontWeight: 700 }}>"{e.globalAfter}"</span>} />
          {e.truncation && <div style={{ color: '#f87171', fontWeight: 700, marginTop: 3 }}>⚠ {e.truncationDetail}</div>}
        </>;
      })()}

      {entry.kind === 'process' && entry.process && (
        <Kv k="query → processVoiceTextToItems" v={<span style={{ color: '#a78bfa', fontWeight: 700 }}>"{entry.process.query}"</span>} />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

interface Props { dataRef: DebugDataRef; updateTick: number; }

export default function DebugPanel({ dataRef, updateTick }: Props) {
  const [open, setOpen]   = useState(false);
  const [tab, setTab]     = useState<Tab>('🗣 Voice');
  const [data, setData]   = useState<DebugData>(makeEmptyDebugData());
  const [copied, setCopied] = useState(false);

  useEffect(() => { setData({ ...dataRef.current }); }, [updateTick, dataRef]);

  const clear = useCallback(() => {
    const empty = makeEmptyDebugData();
    Object.assign(dataRef.current, empty);
    setData({ ...empty });
  }, [dataRef]);

  const copyReport = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(dataRef.current, null, 2)).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }, [dataRef]);

  const downloadReport = useCallback(() => {
    const json = JSON.stringify(dataRef.current, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [dataRef]);

  const sectionTitle = (t: string) => (
    <p style={{ color: '#7c3aed', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', marginTop: 14, marginBottom: 6, letterSpacing: 1 }}>{t}</p>
  );

  const panelStyle: React.CSSProperties = {
    position: 'fixed', bottom: 72, right: 12,
    width: open ? 'min(96vw, 840px)' : 0, maxHeight: open ? 'min(90vh, 680px)' : 0,
    overflow: 'hidden', background: '#0f172a',
    border: open ? '1px solid #334155' : 'none', borderRadius: 12,
    boxShadow: open ? '0 8px 32px rgba(0,0,0,0.7)' : 'none',
    transition: 'width 250ms ease, max-height 250ms ease',
    zIndex: 9999, display: 'flex', flexDirection: 'column', fontFamily: 'monospace',
  };
  const fabStyle: React.CSSProperties = {
    position: 'fixed', bottom: 20, right: 16, width: 44, height: 44,
    borderRadius: '50%', background: open ? '#7c3aed' : '#1e293b',
    border: '2px solid #7c3aed', color: '#fff', fontSize: 20, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 10000, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', transition: 'background 200ms',
  };
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: '6px 6px 0 0', border: 'none',
    background: active ? '#1e293b' : 'transparent',
    color: active ? '#e2e8f0' : '#64748b', cursor: 'pointer',
    fontSize: 12, fontWeight: active ? 700 : 400, fontFamily: 'monospace',
  });

  const hasTruncation = data.truncationDetected;

  return (
    <>
      <button style={fabStyle} onClick={() => setOpen(o => !o)} title="Developer Debug Panel">🐞</button>
      <div style={panelStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #334155', flexShrink: 0 }}>
          <span style={{ color: hasTruncation ? '#f87171' : '#7c3aed', fontWeight: 700, fontSize: 13 }}>
            🐞 Debug Panel {hasTruncation && '⚠ TRUNCATION DETECTED'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={clear} style={{ fontSize: 11, padding: '3px 8px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer' }}>Clear</button>
            <button onClick={copyReport} style={{ fontSize: 11, padding: '3px 8px', background: copied ? '#15803d' : '#1e293b', color: copied ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer' }}>{copied ? '✓ Copied' : 'Copy Report'}</button>
            <button onClick={downloadReport} style={{ fontSize: 11, padding: '3px 8px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer' }}>⬇ Download</button>
            <button onClick={() => setOpen(false)} style={{ fontSize: 14, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, padding: '8px 10px 0', borderBottom: '1px solid #334155', flexShrink: 0 }}>
          {TABS.map(t => <button key={t} style={tabBtnStyle(tab === t)} onClick={() => setTab(t)}>{t}</button>)}
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 14px' }}>

          {/* ── VOICE TAB ──────────────────────────────────────────────── */}
          {tab === '🗣 Voice' && (
            <>
              {/* Summary strip */}
              {sectionTitle('Summary')}
              <div style={{ background: hasTruncation ? 'rgba(220,38,38,0.12)' : '#1e293b', border: `1px solid ${hasTruncation ? '#dc2626' : '#334155'}`, borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                <Kv k="Displayed Transcript"  v={<span style={{ color: '#fbbf24' }}>"{data.displayedTranscript || '—'}"</span>} />
                <Kv k="Processed Query"       v={<span style={{ color: '#a78bfa', fontWeight: 700 }}>"{data.processedQuery || '—'}"</span>} />
                <Kv k="Global Transcript"     v={`"${data.globalTranscript || '—'}"`} />
                <Kv k="Current Breath"        v={`"${data.currentBreath || '—'}"`} />
                <Kv k="Truncation Detected"   v={hasTruncation
                  ? <Badge text="YES ⚠" color="#dc2626" />
                  : <Badge text="NO" color="#15803d" />} />
                <Kv k="Best Match"            v={data.bestMatchName !== '—' ? <Badge text={data.bestMatchName} color={data.bestMatchPath === 'none' ? '#dc2626' : '#16a34a'} /> : '—'} />
                <Kv k="Match Path"            v={data.bestMatchPath} />
                <Kv k="Processing Time"       v={data.processingTimeMs !== '—' ? `${data.processingTimeMs} ms` : '—'} />
              </div>

              {/* Transcript pipeline trace */}
              {sectionTitle('Transcript Pipeline — Chronological Trace')}
              {data.traceEntries.length === 0
                ? <p style={{ color: '#64748b', fontSize: 12 }}>No speech events yet. Start voice input and say a word.</p>
                : data.traceEntries.map(e => <TraceEntryCard key={e.seq} entry={e} />)
              }
            </>
          )}

          {/* ── SEARCH TAB ─────────────────────────────────────────────── */}
          {tab === '🔎 Search' && (
            <>
              {sectionTitle(`Stage 1 — fuse.search("${data.spokenText || '…'}")`)}
              <SortableTable rows={data.stage1} />
              {sectionTitle(`Stage 2 — fuse.search("${data.normalizedText || '…'}") [Hindi→Hinglish]`)}
              <SortableTable rows={data.stage2} />
              {sectionTitle('Stage 3 — Merged candidates (before scoring)')}
              <SortableTable rows={data.stage3} />
              {sectionTitle('Stage 4 — Final ranked decision table')}
              <SortableTable rows={data.stage4} highlight={row => row['bestMatch?'] === '✅ YES' ? 'green' : row['Removed?'] === 'Yes' ? 'red' : null} />
              <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 11 }}>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10,height:10,borderRadius:2,background:'rgba(34,197,94,0.5)',display:'inline-block'}}/>bestMatch</span>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10,height:10,borderRadius:2,background:'rgba(239,68,68,0.5)',display:'inline-block'}}/>Removed</span>
              </div>
            </>
          )}

          {/* ── CACHE TAB ──────────────────────────────────────────────── */}
          {tab === '📦 Cache' && (
            <>
              {sectionTitle('Match Cache Entries')}
              {data.cacheEntries.length === 0
                ? <p style={{ color: '#64748b', fontSize: 12 }}>No cache activity yet.</p>
                : <SortableTable
                    rows={data.cacheEntries.map(e => ({
                      'Cache Key': e.key, 'Hit?': e.hit ? 'Yes' : 'No',
                      'Matched Product': e.result?.name ?? '—',
                      'Product ID': e.result?.productId ?? '—',
                    }))}
                    highlight={row => row['Hit?'] === 'Yes' ? 'orange' : null}
                  />
              }
            </>
          )}

          {/* ── PERF TAB ───────────────────────────────────────────────── */}
          {tab === '⚡ Perf' && (
            <>
              {sectionTitle('Performance Breakdown')}
              <Kv k="Items processed"     v={data.perfItems} />
              <Kv k="Speech → parse"      v={data.perfParse       !== '—' ? `${data.perfParse} ms`       : '—'} />
              <Kv k="Fuse search + score" v={data.perfFuse        !== '—' ? `${data.perfFuse} ms`        : '—'} />
              <Kv k="Enrichment"          v={data.perfEnrichment  !== '—' ? `${data.perfEnrichment} ms`  : '—'} />
              <Kv k="Suggestions"         v={data.perfSuggestions !== '—' ? `${data.perfSuggestions} ms` : '—'} />
              <Kv k="setState"            v={data.perfSetState    !== '—' ? `${data.perfSetState} ms`    : '—'} />
              <Kv k="Total event"         v={data.perfTotal       !== '—' ? `${data.perfTotal} ms`       : '—'} />
            </>
          )}

        </div>
      </div>
    </>
  );
}
