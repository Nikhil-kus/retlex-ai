'use client';

/**
 * QRCodeDisplay
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a QR code using the `qrcode` npm package — fully client-side,
 * no external API calls, no network dependency.
 *
 * Props:
 *   url        — the URL to encode in the QR code
 *   label      — title shown above the QR
 *   sublabel   — smaller text below the QR (e.g. shop name)
 *   headerBg   — Tailwind bg-* class for the header band
 *   headerText — Tailwind text-* class for the header text
 *   size       — pixel size of the QR canvas (default 220)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, Copy, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface QRCodeDisplayProps {
  url: string;
  label: string;
  sublabel?: string;
  headerBg?: string;
  headerText?: string;
  size?: number;
}

type QRStatus = 'loading' | 'loaded' | 'error';

export default function QRCodeDisplay({
  url,
  label,
  sublabel,
  headerBg = 'bg-indigo-600',
  headerText = 'text-white',
  size = 220,
}: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [qrStatus, setQrStatus] = useState<QRStatus>('loading');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!url || !canvasRef.current) return;

    setQrStatus('loading');

    QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#1e1b4b',  // deep indigo — better contrast than pure black
        light: '#ffffff',
      },
    })
      .then(() => setQrStatus('loaded'))
      .catch(() => setQrStatus('error'));
  }, [url, size, retryKey]);

  const handleRetry = () => {
    setQrStatus('loading');
    setRetryKey(k => k + 1);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handlePrint = () => {
    if (qrStatus !== 'loaded' || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');

    const printWindow = window.open('', '_blank', 'width=400,height=500');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR — ${label}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
            .card { border: 2px solid #e2e8f0; border-radius: 16px; overflow: hidden; width: 280px; text-align: center; }
            .header { padding: 16px; background: #4f46e5; color: white; }
            .header h2 { font-size: 18px; font-weight: 700; }
            .body { padding: 20px; background: white; }
            .body img { width: ${size}px; height: ${size}px; display: block; margin: 0 auto 12px; }
            .sublabel { font-size: 13px; color: #475569; font-weight: 600; margin-bottom: 6px; }
            .url { font-size: 10px; color: #64748b; word-break: break-all; }
            .footer { font-size: 10px; color: #94a3b8; padding: 8px; border-top: 1px solid #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header"><h2>${label}</h2></div>
            <div class="body">
              <img src="${dataUrl}" alt="QR Code" />
              ${sublabel ? `<p class="sublabel">${sublabel}</p>` : ''}
              <p class="url">${url}</p>
            </div>
            <div class="footer">Scan with any QR reader</div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    if (qrStatus !== 'loaded' || !canvasRef.current) return;

    // Compose a final image: header band + QR + footer
    const padding = 24;
    const labelH = 48;
    const footerH = 36;
    const totalW = size + padding * 2;
    const totalH = size + padding * 2 + labelH + footerH;

    const out = document.createElement('canvas');
    out.width = totalW;
    out.height = totalH;
    const ctx = out.getContext('2d')!;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalW, totalH);

    // Header band
    ctx.fillStyle = '#4f46e5';
    ctx.fillRect(0, 0, totalW, labelH);

    // Label text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, totalW / 2, labelH / 2 + 6);

    // QR canvas
    ctx.drawImage(canvasRef.current, padding, labelH + padding / 2, size, size);

    // Sublabel
    if (sublabel) {
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(sublabel, totalW / 2, labelH + padding / 2 + size + 18);
    }

    // Footer text
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Scan with any QR reader', totalW / 2, totalH - 10);

    const link = document.createElement('a');
    link.download = `${label.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    link.href = out.toDataURL('image/png');
    link.click();
  };

  if (!url) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md w-full max-w-[280px]">
          <div className={`${headerBg} ${headerText} px-4 py-3 text-center`}>
            <p className="font-bold text-sm">{label}</p>
          </div>
          <div className="bg-white p-6 flex flex-col items-center gap-2 min-h-[180px] justify-center">
            <AlertCircle size={32} className="text-slate-300" />
            <p className="text-xs text-slate-400 text-center">No URL provided</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* QR Card */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md w-full max-w-[280px]">
        {/* Header */}
        <div className={`${headerBg} ${headerText} px-4 py-3 text-center`}>
          <p className="font-bold text-sm">{label}</p>
        </div>

        {/* QR area */}
        <div className="bg-white p-4 flex flex-col items-center gap-2 min-h-[180px] justify-center">

          {/* Loading skeleton */}
          {qrStatus === 'loading' && (
            <div
              className="rounded-lg bg-slate-100 animate-pulse absolute"
              style={{ width: size, height: size }}
            />
          )}

          {/* Error state */}
          {qrStatus === 'error' && (
            <div
              className="rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-center p-4"
              style={{ width: size, height: size }}
            >
              <AlertCircle size={28} className="text-rose-400" />
              <p className="text-xs text-slate-500 font-medium">QR failed to generate</p>
              <button
                onClick={handleRetry}
                className="mt-1 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          )}

          {/* Canvas — always mounted so the ref is available */}
          <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className="rounded-lg"
            style={{ display: qrStatus === 'loaded' ? 'block' : 'none' }}
          />

          {qrStatus === 'loaded' && (
            <>
              {sublabel && (
                <p className="text-xs font-semibold text-slate-600 text-center">{sublabel}</p>
              )}
              <p className="text-[10px] text-slate-400 text-center break-all px-1">{url}</p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 py-2 text-center border-t border-slate-100">
          <p className="text-[10px] text-slate-400">
            {qrStatus === 'loading'
              ? 'Generating QR code…'
              : qrStatus === 'error'
              ? 'Failed to generate QR'
              : 'Scan with any QR reader'}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 w-full max-w-[280px]">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition"
        >
          {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy URL'}
        </button>
        <button
          onClick={handlePrint}
          disabled={qrStatus !== 'loaded'}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Printer size={13} />
          Print
        </button>
        <button
          onClick={handleDownload}
          disabled={qrStatus !== 'loaded'}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={13} />
          Save
        </button>
      </div>
    </div>
  );
}
