'use client';

/**
 * QRCodeDisplay
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders a QR code image using the Google Charts QR API (no npm package needed).
 * Provides Print and Download buttons.
 *
 * Props:
 *   url      — the URL to encode in the QR code
 *   label    — title shown above the QR
 *   sublabel — smaller text below the QR (e.g. the URL itself)
 *   color    — accent color class for the header band (Tailwind bg-* class)
 *   size     — pixel size of the QR image (default 220)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useRef, useState } from 'react';
import { Download, Printer, Copy, Check } from 'lucide-react';

interface QRCodeDisplayProps {
  url: string;
  label: string;
  sublabel?: string;
  headerBg?: string;   // Tailwind class e.g. "bg-indigo-600"
  headerText?: string; // Tailwind class e.g. "text-white"
  size?: number;
}

export default function QRCodeDisplay({
  url,
  label,
  sublabel,
  headerBg = 'bg-indigo-600',
  headerText = 'text-white',
  size = 220,
}: QRCodeDisplayProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Google Charts QR API — free, no key, no install
  const qrSrc = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(url)}&choe=UTF-8&chld=M|2`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handlePrint = () => {
    // Open a minimal print window with just the QR card
    const card = cardRef.current;
    if (!card) return;

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
            .url { font-size: 10px; color: #64748b; word-break: break-all; margin-top: 8px; }
            .footer { font-size: 10px; color: #94a3b8; padding: 8px; border-top: 1px solid #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header"><h2>${label}</h2></div>
            <div class="body">
              <img src="${qrSrc}" alt="QR Code" />
              ${sublabel ? `<p style="font-size:13px;color:#475569;font-weight:600;">${sublabel}</p>` : ''}
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
    // Draw QR + label onto a canvas and download as PNG
    const canvas = document.createElement('canvas');
    const padding = 24;
    const labelH = 48;
    const footerH = 36;
    const totalW = size + padding * 2;
    const totalH = size + padding * 2 + labelH + footerH;

    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d')!;

    // Background
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

    // Load QR image and draw
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, padding, labelH + padding / 2, size, size);

      // Sublabel
      if (sublabel) {
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sublabel, totalW / 2, labelH + padding / 2 + size + 18);
      }

      // Footer
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan with any QR reader', totalW / 2, totalH - 10);

      // Download
      const link = document.createElement('a');
      link.download = `${label.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.onerror = () => {
      // Fallback: just download the raw QR image URL
      const link = document.createElement('a');
      link.download = `${label.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
      link.href = qrSrc;
      link.target = '_blank';
      link.click();
    };
    img.src = qrSrc;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* QR Card */}
      <div
        ref={cardRef}
        className="rounded-2xl overflow-hidden border border-slate-200 shadow-md w-full max-w-[280px]"
      >
        {/* Header */}
        <div className={`${headerBg} ${headerText} px-4 py-3 text-center`}>
          <p className="font-bold text-sm">{label}</p>
        </div>

        {/* QR image */}
        <div className="bg-white p-4 flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt={`QR code for ${label}`}
            width={size}
            height={size}
            className="rounded-lg"
            style={{ imageRendering: 'pixelated' }}
          />
          {sublabel && (
            <p className="text-xs font-semibold text-slate-600 text-center">{sublabel}</p>
          )}
          <p className="text-[10px] text-slate-400 text-center break-all px-1">{url}</p>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 py-2 text-center border-t border-slate-100">
          <p className="text-[10px] text-slate-400">Scan with any QR reader</p>
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
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium transition"
        >
          <Printer size={13} />
          Print
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-medium transition"
        >
          <Download size={13} />
          Save
        </button>
      </div>
    </div>
  );
}
