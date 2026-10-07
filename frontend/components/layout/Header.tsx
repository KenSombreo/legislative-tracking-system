"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { getUser, clearSession } from "../../lib/auth";
import { apiClient } from "../../lib/api/client";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  STAFF: "Staff",
  VIEWER: "Viewer",
};

function initials(name: string | undefined) {
  if (!name) return "SB";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function Header() {
  const router = useRouter();
  const user = getUser();
  const [query, setQuery] = useState("");

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // ignore
    }
    clearSession();
    router.push("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/legislation?search=${encodeURIComponent(q)}` : "/legislation");
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-6">
      <form onSubmit={handleSearch} className="w-full max-w-md">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ordinances, resolutions, minutes by number, title or author"
          className="w-full rounded-md border border-gray-300 bg-paper px-3 py-2 text-xs text-navy-900 placeholder:text-gray-500 focus:border-navy-700 focus:outline-none"
        />
      </form>
      <div className="flex items-center gap-3">
        <button className="rounded-md border border-gray-200 p-2 text-gray-500 hover:bg-gray-50" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </button>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-[11px] font-semibold text-white">
          {initials(user?.fullName)}
        </span>
        <div className="leading-tight">
          <p className="text-xs font-semibold text-navy-900">{user?.fullName || "SB Secretary"}</p>
          <p className="text-[11px] text-gray-500">{ROLE_LABELS[user?.role || ""] || user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="ml-1 rounded-md p-2 text-gray-500 hover:bg-gray-50 hover:text-navy-900"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
