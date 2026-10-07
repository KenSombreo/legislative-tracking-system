"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedShell from "../../components/layout/ProtectedShell";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import EventDateBlock, { EVENT_TYPE_LABELS } from "../../components/calendar/EventDateBlock";
import {
  EmptyState,
  Field,
  Modal,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  clean,
  formatDate,
  formatTime,
  toDateInput,
} from "../../components/ui/Records";
import { apiClient, ApiError } from "../../lib/api/client";
import { hasRole } from "../../lib/auth";
import { CalendarEvent, CalendarEventType } from "../../lib/types";

const EMPTY = {
  eventType: "REGULAR_SESSION" as CalendarEventType,
  title: "",
  date: "",
  startTime: "",
  venue: "SB Session Hall",
  committee: "",
  description: "",
};

type FormState = typeof EMPTY;
type View = "UPCOMING" | "PAST";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const isAdmin = hasRole("ADMIN");
  const [items, setItems] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<View>("UPCOMING");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<CalendarEvent | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await apiClient.get<CalendarEvent[]>("/calendar"));
    } catch {
      // leave list empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Group events by month, upcoming ascending / past descending.
  const groups = useMemo(() => {
    const today = todayKey();
    const list = items
      .filter((e) => (view === "UPCOMING" ? toDateInput(e.date) >= today : toDateInput(e.date) < today))
      .sort((a, b) => (view === "UPCOMING" ? 1 : -1) * (a.date.localeCompare(b.date) || (a.startTime || "").localeCompare(b.startTime || "")));
    const map = new Map<string, CalendarEvent[]>();
    for (const e of list) {
      const key = formatDate(e.date, { month: "long", year: "numeric" });
      map.set(key, [...(map.get(key) || []), e]);
    }
    return Array.from(map.entries());
  }, [items, view]);

  const openForm = (ev: CalendarEvent | null) => {
    setEditing(ev);
    setError(null);
    setForm(
      ev
        ? {
            eventType: ev.eventType,
            title: ev.title,
            date: toDateInput(ev.date),
            startTime: ev.startTime || "",
            venue: ev.venue || "",
            committee: ev.committee || "",
            description: ev.description || "",
          }
        : EMPTY
    );
    setOpen(true);
  };

  const set = (field: keyof FormState, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = clean({ ...form, committee: form.eventType === "COMMITTEE_HEARING" ? form.committee : "" });
      if (editing) await apiClient.patch(`/calendar/${editing._id}`, payload);
      else await apiClient.post("/calendar", payload);
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    await apiClient.delete(`/calendar/${toDelete._id}`).catch(() => {});
    setToDelete(null);
    load();
  };

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-[1200px]">
        <PageHeader
          title="Session calendar"
          description="Scheduled regular and special sessions, and committee hearings."
          action={isAdmin && <PrimaryButton onClick={() => openForm(null)}>+ Add event</PrimaryButton>}
        />

        <section className="card mt-5">
          <div className="flex gap-1.5 border-b border-gray-200 px-4 py-3">
            {(["UPCOMING", "PAST"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-full border px-3 py-1 text-[11px] ${
                  view === v ? "border-navy-900 bg-navy-900 text-white" : "border-gray-300 bg-white text-gray-600 hover:border-navy-700"
                }`}
              >
                {v === "UPCOMING" ? "Upcoming" : "Past"}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="px-4 py-10 text-center text-xs text-gray-500">Loading…</p>
          ) : groups.length === 0 ? (
            <EmptyState
              title={view === "UPCOMING" ? "No upcoming sessions or hearings" : "No past events"}
              hint={view === "UPCOMING" && isAdmin ? "Click “+ Add event” to schedule a session or hearing." : undefined}
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {groups.map(([month, events]) => (
                <div key={month} className="px-4 py-4">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{month}</h3>
                  <ul className="space-y-3">
                    {events.map((ev) => (
                      <li key={ev._id} className="flex items-start gap-3">
                        <EventDateBlock date={ev.date} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-navy-900">{ev.title}</p>
                          <p className="text-[11px] text-gray-500">
                            {[
                              EVENT_TYPE_LABELS[ev.eventType],
                              ev.committee,
                              formatTime(ev.startTime),
                              ev.venue,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          {ev.description && <p className="mt-1 whitespace-pre-line text-[11px] text-gray-600">{ev.description}</p>}
                        </div>
                        {isAdmin && (
                          <div className="shrink-0 whitespace-nowrap">
                            <button onClick={() => openForm(ev)} className="mr-3 text-[11px] text-navy-900 underline">
                              Edit
                            </button>
                            <button onClick={() => setToDelete(ev)} className="text-[11px] text-red-600 underline">
                              Delete
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal title={editing ? "Edit event" : "Add session or hearing"} open={open} onClose={() => setOpen(false)} wide>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Type">
            <select value={form.eventType} onChange={(e) => set("eventType", e.target.value)} className="field-input">
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date" required>
            <input required type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="field-input" />
          </Field>
          <Field label="Start time">
            <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} className="field-input" />
          </Field>
          <Field label="Title" required className="sm:col-span-3">
            <input
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. 33rd Regular Session or Committee on Tourism hearing"
              className="field-input"
            />
          </Field>
          {form.eventType === "COMMITTEE_HEARING" && (
            <Field label="Committee">
              <input value={form.committee} onChange={(e) => set("committee", e.target.value)} className="field-input" />
            </Field>
          )}
          <Field label="Venue" className={form.eventType === "COMMITTEE_HEARING" ? "sm:col-span-2" : "sm:col-span-3"}>
            <input value={form.venue} onChange={(e) => set("venue", e.target.value)} className="field-input" />
          </Field>
          <Field label="Agenda / notes" className="sm:col-span-3">
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="e.g. 3rd reading: Appropriation Ord. 2026-02"
              className="field-input resize-y"
            />
          </Field>
          {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-3">
            <SecondaryButton type="button" onClick={() => setOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Add event"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete event"
        message={`Delete "${toDelete?.title}" from the calendar?`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </ProtectedShell>
  );
}
