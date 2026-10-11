"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Contrast } from "lucide-react";

const TEXT_SIZES = [
  { label: "A", scale: "100%", name: "Normal text" },
  { label: "A+", scale: "118.75%", name: "Larger text" },
  { label: "A++", scale: "137.5%", name: "Largest text" },
];

const NAV = [
  { href: "/public", label: "Search records" },
  { href: "/public/request", label: "Request a copy" },
  { href: "/public/request/status", label: "Check my request" },
];

function load(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode: the setting just won't be remembered
  }
}

/**
 * Frame of the public portal (kiosk in the session hall, and pages opened from QR codes).
 * No login. Large type and touch targets, text-size and high-contrast controls for senior
 * citizens and PWDs.
 */
export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [size, setSize] = useState(0);
  const [contrast, setContrast] = useState(false);

  useEffect(() => {
    setSize(Math.min(Math.max(parseInt(load("pub_text_size") || "0", 10) || 0, 0), TEXT_SIZES.length - 1));
    setContrast(load("pub_contrast") === "1");
  }, []);

  // Scale the root font size so every rem-based size grows; put it back when leaving the portal.
  useEffect(() => {
    document.documentElement.style.fontSize = TEXT_SIZES[size].scale;
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [size]);

  const chooseSize = (i: number) => {
    setSize(i);
    save("pub_text_size", String(i));
  };

  const toggleContrast = () => {
    setContrast((c) => {
      save("pub_contrast", c ? "0" : "1");
      return !c;
    });
  };

  return (
    <div className={`public-portal min-h-screen bg-paper text-navy-900 ${contrast ? "hc" : ""}`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-lg"
      >
        Skip to main content
      </a>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/public" className="flex items-center gap-3">
            <Image src="/logo.png" alt="" width={48} height={48} />
            <span>
              <span className="block font-serif text-xl font-semibold leading-tight">Sangguniang Bayan ng Liloan</span>
              <span className="pub-muted block text-sm">Public Legislative Records</span>
            </span>
          </Link>
          <div className="flex items-center gap-2" role="group" aria-label="Display settings">
            <span className="pub-muted hidden text-sm sm:inline">Text size</span>
            {TEXT_SIZES.map((t, i) => (
              <button
                key={t.label}
                onClick={() => chooseSize(i)}
                aria-pressed={size === i}
                aria-label={t.name}
                className={`min-h-[2.75rem] min-w-[2.75rem] rounded-lg border-2 px-2 font-bold ${
                  size === i ? "border-navy-900 bg-navy-900 text-white" : "border-gray-400 bg-white text-navy-900"
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={toggleContrast}
              aria-pressed={contrast}
              className="flex min-h-[2.75rem] items-center gap-1.5 rounded-lg border-2 border-gray-400 bg-white px-3 text-sm font-semibold text-navy-900"
            >
              <Contrast className="h-5 w-5" aria-hidden /> High contrast
            </button>
          </div>
        </div>
        <nav aria-label="Portal" className="mx-auto flex max-w-5xl flex-wrap gap-1 px-4 pb-2">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-4 py-2 text-base font-semibold ${
                  active ? "bg-navy-900 text-white" : "text-navy-800 hover:bg-navy-50"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
      <footer className="pub-muted mx-auto max-w-5xl px-4 pb-8 text-sm">
        Only records officially released by the Sangguniang Bayan are shown here. For other documents, use{" "}
        <Link href="/public/request" className="pub-link">
          Request a copy
        </Link>
        .
      </footer>
    </div>
  );
}
