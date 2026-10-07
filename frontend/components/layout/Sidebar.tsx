"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { getUser } from "../../lib/auth";
import { apiClient } from "../../lib/api/client";
import { Legislation, PaginatedResponse } from "../../lib/types";

const MAIN_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ordinances", label: "Ordinances" },
  { href: "/resolutions", label: "Resolutions" },
  { href: "/appropriation-ordinances", label: "Appropriation ordinances" },
  { href: "/minutes", label: "Minutes of sessions" },
  { href: "/committee-reports", label: "Committee reports" },
  { href: "/calendar", label: "Session calendar" },
  { href: "/members", label: "SB members" },
];

const ADMIN_NAV = [
  { href: "/approvals", label: "Pending approvals", badge: true },
  { href: "/users", label: "User accounts" },
  { href: "/audit-logs", label: "Activity log" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const user = getUser();
  const isAdmin = user?.role === "ADMIN";
  const canUpload = user?.role === "ADMIN" || user?.role === "STAFF";
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const refresh = () =>
      apiClient
        .get<PaginatedResponse<Legislation>>("/legislation?limit=1&approvalStatus=PENDING")
        .then((res) => setPendingCount(res.meta.total))
        .catch(() => {});
    refresh();
    window.addEventListener("approvals:changed", refresh);
    return () => window.removeEventListener("approvals:changed", refresh);
  }, [isAdmin]);

  const linkClass = (href: string) => {
    const active = pathname === href || pathname?.startsWith(href + "/");
    return `block rounded-md px-3 py-2 text-[13px] transition-colors ${
      active ? "bg-navy-700 font-semibold text-white" : "text-gray-200 hover:bg-navy-800 hover:text-white"
    }`;
  };

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col bg-navy-900 text-white">
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-gray-200" />
          <span className="font-serif text-base font-semibold">SB Liloan</span>
        </div>
        <p className="mt-0.5 pl-6 text-[11px] leading-snug text-gray-400">Southern Leyte · Legislative Records</p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {MAIN_NAV.map((item) => (
          <Link key={item.href} href={item.href} className={linkClass(item.href)}>
            {item.label}
          </Link>
        ))}
        {canUpload && (
          <Link
            href="/legislation/new"
            className="block rounded-md px-3 py-2 text-[13px] font-medium text-gold-400 hover:bg-navy-800"
          >
            + Upload document
          </Link>
        )}

        {isAdmin && (
          <>
            <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Admin</p>
            {ADMIN_NAV.map((item) => (
              <Link key={item.href} href={item.href} className={`${linkClass(item.href)} flex items-center justify-between`}>
                <span>{item.label}</span>
                {item.badge && pendingCount > 0 && (
                  <span className="rounded-full bg-gold-500 px-1.5 text-[10px] font-semibold text-navy-950">
                    {pendingCount}
                  </span>
                )}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
