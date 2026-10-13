"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Contrast } from "lucide-react";
import { getWatchlist, onWatchlistChange } from "../../lib/public";

const TEXT_SIZES = [
  { label: "A", scale: "100%", name: "Normal text" },
  { label: "A+", scale: "118.75%", name: "Larger text" },
  { label: "A++", scale: "137.5%", name: "Largest text" },
];

const NAV = [
  { href: "/public", label: "Legislation", match: (p: string) => p === "/public" || p.startsWith("/public/legislation") },
  { href: "/public/sessions", label: "Sessions" },
  { href: "/public/members", label: "Council members" },
  { href: "/public/gallery", label: "Photos & videos" },
  { href: "/public/watchlist", label: "My watchlist" },
  { href: "/public/how-a-law-is-made", label: "How a law is made" },
  { href: "/public/request", label: "Request a copy", match: (p: string) => p === "/public/request" },
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
  const [watching, setWatching] = useState(0);

  useEffect(() => {
    setSize(Math.min(Math.max(parseInt(load("pub_text_size") || "0", 10) || 0, 0), TEXT_SIZES.length - 1));
    setContrast(load("pub_contrast") === "1");
    const sync = () => setWatching(getWatchlist().length);
    sync();
    return onWatchlistChange(sync);
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
    <div className={`public-portal flex min-h-screen flex-col bg-paper text-navy-900 ${contrast ? "hc" : ""}`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-lg"
      >
        Skip to main content
      </a>

      <div className="pub-strip bg-sb-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-1.5">
          <p className="text-sm">Official public records portal of the Sangguniang Bayan ng Liloan, Southern Leyte</p>
          <div className="flex items-center gap-1.5" role="group" aria-label="Display settings">
            <span className="hidden text-sm sm:inline">Text size</span>
            {TEXT_SIZES.map((t, i) => (
              <button
                key={t.label}
                onClick={() => chooseSize(i)}
                aria-pressed={size === i}
                aria-label={t.name}
                className={`pub-chip min-h-[2.25rem] min-w-[2.5rem] px-2 py-0.5 text-center text-sm ${
                  size === i ? "border-white bg-white text-sb-900" : "border-sb-600 bg-transparent text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={toggleContrast}
              aria-pressed={contrast}
              className="pub-chip flex min-h-[2.25rem] items-center gap-1.5 border-sb-600 bg-transparent px-2.5 py-0.5 text-sm text-white"
            >
              <Contrast className="h-4 w-4" aria-hidden /> High contrast
            </button>
          </div>
        </div>
      </div>

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/public" className="flex min-w-0 items-center gap-3">
            <Image src="/logo.png" alt="Seal of the Sangguniang Bayan, Liloan, Southern Leyte" width={64} height={64} className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" priority />
            <span className="min-w-0">
              <span className="block font-serif text-xl font-semibold leading-tight text-sb-900 sm:text-2xl">Sangguniang Bayan ng Liloan</span>
              <span className="pub-muted block text-sm sm:text-base">Province of Southern Leyte · Legislative Tracker</span>
            </span>
          </Link>
          <Image src="/bagong-pilipinas.png" alt="Bagong Pilipinas" width={72} height={67} className="hidden h-14 w-auto shrink-0 sm:block sm:h-16" />
        </div>
        <nav aria-label="Portal" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {NAV.map((n) => {
            const active = n.match ? n.match(pathname) : pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-lg px-3.5 py-2 text-base font-semibold ${
                  active ? "bg-sb-800 text-white" : "text-sb-900 hover:bg-sb-50"
                }`}
              >
                {n.label}
                {n.href === "/public/watchlist" && watching > 0 && (
                  <span className={`ml-1.5 rounded-full px-2 text-sm ${active ? "bg-white text-sb-900" : "bg-sb-100 text-sb-900"}`}>{watching}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>

      <footer className="pub-strip bg-sb-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <Image src="/logo.png" alt="" width={56} height={56} className="h-14 w-14 rounded-full bg-white" />
          <div className="text-sm leading-relaxed">
            <p className="text-base font-semibold">Office of the Secretary to the Sangguniang Bayan</p>
            <p>Session Hall, Municipal Hall, Liloan, Southern Leyte</p>
            <p className="mt-2 text-sb-100">
              Records are updated after each regular session. Only records officially released by the Sangguniang Bayan are
              shown. Certified true copies are available at the Office of the SB Secretary, or{" "}
              <Link href="/public/request" className="font-semibold text-white underline underline-offset-2">
                request a copy online
              </Link>
              .
            </p>
          </div>
          <Image src="/bagong-pilipinas.png" alt="Bagong Pilipinas" width={64} height={60} className="h-14 w-auto rounded bg-white p-1" />
        </div>
      </footer>
    </div>
  );
}
