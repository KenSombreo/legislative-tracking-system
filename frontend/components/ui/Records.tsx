"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

// Small building blocks shared by the SB members, minutes, committee reports, calendar and approvals pages.

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] text-gray-500">Sangguniang Bayan ng Liloan · Province of Southern Leyte</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold text-navy-900">{title}</h1>
        {action}
      </div>
      {description && <p className="mt-1 text-xs text-gray-600">{description}</p>}
    </div>
  );
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-md bg-navy-900 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50 ${props.className || ""}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-navy-900 hover:bg-gray-50 disabled:opacity-50 ${props.className || ""}`}
    >
      {children}
    </button>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-4 py-14 text-center">
      <p className="text-sm font-medium text-navy-900">{title}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function Modal({
  title,
  open,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/40 p-4 sm:items-center">
      <div className={`card w-full ${wide ? "max-w-2xl" : "max-w-lg"} shadow-xl`} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-navy-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-navy-900" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="field-label">
        {label}
        {required && " *"}
      </label>
      {children}
    </div>
  );
}

// File picker for a record's single attached file (minutes, committee reports).
export function AttachmentInput({
  current,
  file,
  onFile,
  onRemoveCurrent,
}: {
  current: { originalFileName: string } | null | undefined;
  file: File | null;
  onFile: (f: File | null) => void;
  onRemoveCurrent?: () => void;
}) {
  return (
    <div className="rounded-md border border-dashed border-gray-300 bg-navy-50/40 px-3 py-3 text-xs">
      {current && !file && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="truncate text-navy-900">Attached: {current.originalFileName}</span>
          {onRemoveCurrent && (
            <button type="button" onClick={onRemoveCurrent} className="text-[11px] text-red-600 underline">
              Remove file
            </button>
          )}
        </div>
      )}
      {file && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="truncate text-navy-900">{file.name}</span>
          <button type="button" onClick={() => onFile(null)} className="text-[11px] text-gray-500 underline">
            Clear
          </button>
        </div>
      )}
      <label className="inline-block cursor-pointer rounded border border-gray-300 bg-white px-2 py-1 text-[11px] text-navy-900 hover:bg-gray-50">
        {current || file ? "Replace file" : "Choose file"}
        <input
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            onFile(e.target.files?.[0] || null);
            e.target.value = "";
          }}
        />
      </label>
      <span className="ml-2 text-[11px] text-gray-500">PDF, DOCX or JPG/PNG · up to 25 MB</span>
    </div>
  );
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  if (!iso) return "—";
  // Dates are stored at UTC midnight; format in UTC so they don't shift a day.
  return new Date(iso).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
}

export function formatTime(hhmm: string | null | undefined) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function toDateInput(iso: string | null | undefined) {
  return iso ? iso.substring(0, 10) : "";
}

// Turn empty strings into null so optional fields can be cleared on update.
export function clean<T extends Record<string, any>>(data: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) out[k] = typeof v === "string" && v.trim() === "" ? null : v;
  return out as T;
}
