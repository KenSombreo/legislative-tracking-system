"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Printer } from "lucide-react";

/**
 * QR code for a public-portal link, with buttons to print it (for posting on a bulletin board
 * or attaching to the physical copy) and copy the link.
 */
export default function QrCode({
  url,
  caption,
  size = 160,
  actions = true,
}: {
  url: string;
  caption?: string;
  size?: number;
  actions?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const print = () => {
    const svg = ref.current?.querySelector("svg")?.outerHTML;
    if (!svg) return;
    const win = window.open("", "_blank", "width=480,height=640");
    if (!win) return;
    const doc = win.document;
    doc.title = caption || "QR code";
    const style = doc.createElement("style");
    style.textContent =
      "body{font-family:sans-serif;text-align:center;padding:32px;color:#132340}svg{width:280px;height:280px}p{margin:12px 0 0}small{word-break:break-all;color:#555}";
    doc.head.appendChild(style);
    const wrap = doc.createElement("div");
    wrap.innerHTML = svg;
    const heading = doc.createElement("p");
    heading.innerHTML = "<strong></strong>";
    heading.querySelector("strong")!.textContent = caption || "";
    const link = doc.createElement("small");
    link.textContent = url;
    const hint = doc.createElement("p");
    hint.textContent = "Scan with your phone camera to view this record.";
    doc.body.append(wrap, heading, hint, link);
    win.focus();
    win.print();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div ref={ref} className="rounded-md bg-white p-2">
        <QRCodeSVG value={url} size={size} level="M" marginSize={1} title={caption ? `QR code: ${caption}` : "QR code"} />
      </div>
      {caption && <p className="text-sm font-medium text-navy-900">{caption}</p>}
      {actions && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={print}
            className="flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs text-navy-900 hover:bg-gray-50"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs text-navy-900 hover:bg-gray-50"
          >
            <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
