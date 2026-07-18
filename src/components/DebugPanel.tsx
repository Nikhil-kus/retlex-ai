'use client';

/**
 * DebugPanel.tsx
 * ──────────────────────────────────────────────────────────────────────────
 * Developer-only floating debug panel for the billing page.
 * Rendered only when NEXT_PUBLIC_DEBUG === "true".
 * Reads data from a ref (debugDataRef) that the billing page populates via
 * the existing [TRACE] instrumentation — zero impact on matching logic.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────

export interface FuseRow {
  'Product Name': string;
  'Product ID': string;
  'Search': string;
  'Matched Field': string;
  'Matched Value': string;
  'Match Indices': string;
  'Raw Fuse Score': string;
}

export interface DecisionRow {
  'Product Name': string;
  'Product ID': string;
  'Found By': string;
  'Matched Field': string;
  'Matched Value': string;
  'Match Indices': string;
  'Raw Fuse Score': string;
  'querySyl': number | string;
  'matchSyl': number | string;
  'Syllable Penalty': string;
  'isCandLoose': boolean | string;
  'isNameComp': boolean | string;
  'Weight Adj': string;
  'Adj Reason': string;
  'Final Score': string;
  'Final Rank': number | string;
  'bestMatch?': string;
  'Removed?': string;
  'Removal Reason': string;
}

export interface CacheEntry {
  key: string;
  hit: boolean;
  result: any;
}

export interface DebugData {
  // Voice
  spokenText: string;
  normalizedText: string;
  language: string;
  processingTimeMs: string;

  // Search stages
  stage1: FuseRow[];
  stage2: FuseRow[];
  stage3: any[];
  stage4: DecisionRow[];

  // Cache
  cacheEntries: CacheEntry[];

  // Perf
  perfParse: string;
  perfFuse: string;
  perfEnrichment: string;
  perfSuggestions: string;
  perfSetState: string;
  perfTotal: string;
  perfItems: number;

  // bestMatch summary
  bestMatchName: string;
  bestMatchPath: string; // 'primary' | 'fallback' | 'none'
}

export type DebugDataRef = React.MutableRefObject<DebugData>;

export function makeEmptyDebugData(): DebugData {
  return {
    spokenText: '',
    normalizedText: '',
    language: 'hi-IN',
    processingTimeMs: '—',
    stage1: [],
    stage2: [],
    stage3: [],
    stage4: [],
    cacheEntries: [],
    perfParse: '—',
    perfFuse: '—',
    perfEnrichment: '—',
    perfSuggestions: '—',
    perfSetState: '—',
    perfTotal: '—',
    perfItems: 0,
    bestMatchName: '—',
    bestMatchPath: 'none',
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────

const TABS = ['🗣 Voice', '🔎 Search', '📦 Cache', '⚡ Perf'] as const;
type Tab = typeof TABS[number];

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>
      {text}
    </span>
  );
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12 }}>
      <span style={{ color: '#94a3b8', minWidth: 130, flexShrink: 0 }}>{k}</span>
      <span style={{ color: '#f1f5f9', wordBreak: 'break-all' }}>{v ?? '—'}</span>
    </div>
  );
}

// Sortable table
function SortableTable({ rows, highlight }: { rows: Record<string, any>[]; highlight?: (row: any) => 'green' | 'red' | 'orange' | null }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  if (!rows || rows.length === 0) return <p style={{ color: '#64748b', fontSize: 12, padding: '8px 0' }}>No data yet.</p>;

  const cols = Object.keys(rows[0]);

  const sorted = sortCol
    ? [...rows].sort((a, b) => {
        const av = a[sortCol] ?? '';
        const bv = b[sortCol] ?? '';
        const an = parseFloat(String(av));
        const bn = parseFloat(String(bv));
        const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : rows;

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const rowBg = (row: any) => {
    if (!highlight) return 'transparent';
    const h = highlight(row);
    if (h === 'green')  return 'rgba(34,197,94,0.15)';
    if (h === 'red')    return 'rgba(239,68,68,0.15)';
    if (h === 'orange') return 'rgba(249,115,22,0.15)';
    return 'transparent';
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%', minWidth: 600 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th
                key={c}
                onClick={() => toggleSort(c)}
                style={{
                  cursor: 'pointer',
                  padding: '4px 8px',
                  background: '#1e293b',
                  color: '#94a3b8',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  userSelect: 'none',
                  borderBottom: '1px solid #334155',
                }}
              >
                {c} {sortCol === c ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} style={{ background: rowBg(row) }}>
              {cols.map(c => (
                <td
                  key={c}
                  style={{
                    padding: '3px 8px',
                    color: '#e2e8f0',
                    borderBottom: '1px solid #1e293b',
                    whiteSpace: 'nowrap',
                    maxWidth: 220,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={String(row[c] ?? '')}
                >
                  {String(row[c] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

interface Props {
  dataRef: DebugDataRef;
  /** Increment this to trigger a re-render of the panel after new data lands */
  updateTick: number;
}

export default function DebugPanel({ dataRef, updateTick }: Props) {
  const [open, setOpen]     = useState(false);
  const [tab, setTab]       = useState<Tab>('🗣 Voice');
  const [data, setData]     = useState<DebugData>(makeEmptyDebugData());
  const [copied, setCopied] = useState(false);

  // Sync from ref whenever updateTick changes
  useEffect(() => {
    setData({ ...dataRef.current });
  }, [updateTick, dataRef]);

  const clear = useCallback(() => {
    Object.assign(dataRef.current, makeEmptyDebugData());
    setData(makeEmptyDebugData());
  }, [dataRef]);

  const copyReport = useCallback(() => {
    const report = JSON.stringify(dataRef.current, null, 2);
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [dataRef]);

  const highlightStage4 = (row: DecisionRow) => {
    if (row['bestMatch?'] === '✅ YES') return 'green';
    if (row['Removed?'] === 'Yes') return 'red';
    return null;
  };

  const highlightCache = (row: any) => {
    if (row['Hit?'] === 'Yes') return 'orange';
    return null;
  };

  // ── Panel styles ─────────────────────────────────────────────────────────
  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 72,
    right: 12,
    width: open ? 'min(96vw, 820px)' : 0,
    maxHeight: open ? 'min(90vh, 640px)' : 0,
    overflow: 'hidden',
    background: '#0f172a',
    border: open ? '1px solid #334155' : 'none',
    borderRadius: 12,
    boxShadow: open ? '0 8px 32px rgba(0,0,0,0.7)' : 'none',
    transition: 'width 250ms ease, max-height 250ms ease',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'monospace',
  };

  const fabStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 20,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: open ? '#7c3aed' : '#1e293b',
    border: '2px solid #7c3aed',
    color: '#fff',
    fontSize: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    transition: 'background 200ms',
  };

  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: 2,
    padding: '8px 10px 0',
    borderBottom: '1px solid #334155',
    flexShrink: 0,
  };

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    borderRadius: '6px 6px 0 0',
    border: 'none',
    background: active ? '#1e293b' : 'transparent',
    color: active ? '#e2e8f0' : '#64748b',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    fontFamily: 'monospace',
  });

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '10px 14px 14px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    borderBottom: '1px solid #334155',
    flexShrink: 0,
  };

  const sectionTitle = (t: string) => (
    <p style={{ color: '#7c3aed', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', marginTop: 14, marginBottom: 6, letterSpacing: 1 }}>{t}</p>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* FAB */}
      <button style={fabStyle} onClick={() => setOpen(o => !o)} title="Developer Debug Panel">
        🐞
      </button>

      {/* Panel */}
      <div style={panelStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <span style={{ color: '#7c3aed', fontWeight: 700, fontSize: 13 }}>🐞 Debug Panel</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={clear}   style={{ fontSize: 11, padding: '3px 8px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer' }}>Clear</button>
            <button onClick={copyReport} style={{ fontSize: 11, padding: '3px 8px', background: copied ? '#15803d' : '#1e293b', color: copied ? '#fff' : '#94a3b8', border: '1px solid #334155', borderRadius: 5, cursor: 'pointer' }}>
              {copied ? '✓ Copied' : 'Copy Report'}
            </button>
            <button onClick={() => setOpen(false)} style={{ fontSize: 14, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={tabBarStyle}>
          {TABS.map(t => (
            <button key={t} style={tabBtnStyle(tab === t)} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {/* Content */}
        <div style={contentStyle}>

          {/* ── VOICE tab ───────────────────────────────────────────────── */}
          {tab === '🗣 Voice' && (
            <>
              {sectionTitle('Speech Recognition')}
              <Kv k="Spoken Text"       v={data.spokenText      || '—'} />
              <Kv k="Normalized Text"   v={data.normalizedText  || '—'} />
              <Kv k="Language"          v={data.language        || 'hi-IN'} />
              <Kv k="Processing Time"   v={data.processingTimeMs !== '—' ? `${data.processingTimeMs} ms` : '—'} />
              <Kv k="Best Match"        v={
                data.bestMatchName !== '—'
                  ? <Badge text={data.bestMatchName} color={data.bestMatchPath === 'none' ? '#dc2626' : '#16a34a'} />
                  : '—'
              } />
              <Kv k="Match Path"        v={data.bestMatchPath} />
            </>
          )}

          {/* ── SEARCH tab ──────────────────────────────────────────────── */}
          {tab === '🔎 Search' && (
            <>
              {sectionTitle(`Stage 1 — fuse.search("${data.spokenText || '…'}")`)}
              <SortableTable rows={data.stage1} />

              {sectionTitle(`Stage 2 — fuse.search("${data.normalizedText || '…'}") [Hindi→Hinglish]`)}
              <SortableTable rows={data.stage2} />

              {sectionTitle('Stage 3 — Merged candidate list (before scoring)')}
              <SortableTable rows={data.stage3} />

              {sectionTitle('Stage 4 — Final ranked decision table (after all adjustments)')}
              <SortableTable
                rows={data.stage4}
                highlight={highlightStage4 as any}
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 11 }}>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10,height:10,borderRadius:2,background:'rgba(34,197,94,0.5)',display:'inline-block'}}/>bestMatch</span>
                <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10,height:10,borderRadius:2,background:'rgba(239,68,68,0.5)',display:'inline-block'}}/>Removed</span>
              </div>
            </>
          )}

          {/* ── CACHE tab ───────────────────────────────────────────────── */}
          {tab === '📦 Cache' && (
            <>
              {sectionTitle('Match Cache Entries')}
              {data.cacheEntries.length === 0
                ? <p style={{ color: '#64748b', fontSize: 12 }}>No cache activity recorded yet.</p>
                : <SortableTable
                    rows={data.cacheEntries.map(e => ({
                      'Cache Key':        e.key,
                      'Hit?':             e.hit ? 'Yes' : 'No',
                      'Matched Product':  e.result?.name ?? '—',
                      'Product ID':       e.result?.productId ?? '—',
                      'Candidate Removed?': e.result ? (Number(e.result?.['Final Score'] ?? 0) > 0.6 ? 'Yes' : 'No') : '—',
                      'Removal Reason':   e.result?.['Removal Reason'] ?? '—',
                    }))}
                    highlight={highlightCache}
                  />
              }
            </>
          )}

          {/* ── PERF tab ────────────────────────────────────────────────── */}
          {tab === '⚡ Perf' && (
            <>
              {sectionTitle('Performance Breakdown')}
              <Kv k="Items processed"      v={data.perfItems} />
              <Kv k="Speech → parse"       v={data.perfParse       !== '—' ? `${data.perfParse} ms`       : '—'} />
              <Kv k="Fuse search + score"  v={data.perfFuse        !== '—' ? `${data.perfFuse} ms`        : '—'} />
              <Kv k="Enrichment"           v={data.perfEnrichment  !== '—' ? `${data.perfEnrichment} ms`  : '—'} />
              <Kv k="Suggestions"          v={data.perfSuggestions !== '—' ? `${data.perfSuggestions} ms` : '—'} />
              <Kv k="setState"             v={data.perfSetState    !== '—' ? `${data.perfSetState} ms`    : '—'} />
              <Kv k="Total event"          v={data.perfTotal       !== '—' ? `${data.perfTotal} ms`       : '—'} />
            </>
          )}

        </div>
      </div>
    </>
  );
}
