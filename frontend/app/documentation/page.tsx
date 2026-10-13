"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Play, Trash2, X } from "lucide-react";
import ProtectedShell from "../../components/layout/ProtectedShell";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { EmptyState, Field, Modal, PageHeader, PrimaryButton, SecondaryButton, clean, formatDate, toDateInput } from "../../components/ui/Records";
import { apiClient, ApiError } from "../../lib/api/client";
import { hasRole } from "../../lib/auth";
import { ActivityDoc, ActivityMedia } from "../../lib/types";
import { ACTIVITY_CATEGORIES, MAX_MEDIA_MB, MEDIA_ACCEPT, categoryLabel, isVideo } from "../../lib/activities";

const EMPTY = {
  title: "",
  date: "",
  category: "SESSION" as ActivityDoc["category"],
  venue: "SB Session Hall",
  description: "",
  isPublic: false,
};

type FormState = typeof EMPTY;

const mediaUrl = (a: ActivityDoc, m: ActivityMedia) => apiClient.fileUrl(`/activity-docs/${a._id}/media/${m._id}`);

export default function DocumentationPage() {
  const canEdit = hasRole("ADMIN", "STAFF");
  const isAdmin = hasRole("ADMIN");
  const [items, setItems] = useState<ActivityDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityDoc | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<ActivityDoc | null>(null);
  const [viewing, setViewing] = useState<{ activity: ActivityDoc; media: ActivityMedia } | null>(null);
  // Upload in progress per activity id: fraction done, or an error message.
  const [uploads, setUploads] = useState<Record<string, number | string>>({});

  const load = async () => {
    try {
      setItems(await apiClient.get<ActivityDoc[]>("/activity-docs"));
    } catch {
      // leave list empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const replace = (doc: ActivityDoc) => setItems((list) => list.map((a) => (a._id === doc._id ? doc : a)));

  const upload = async (activityId: string, picked: File[]) => {
    const tooBig = picked.find((f) => f.size > MAX_MEDIA_MB * 1024 * 1024);
    if (tooBig) {
      setUploads((u) => ({ ...u, [activityId]: `${tooBig.name} is larger than ${MAX_MEDIA_MB} MB.` }));
      return;
    }
    const fd = new FormData();
    picked.forEach((f) => fd.append("files", f));
    setUploads((u) => ({ ...u, [activityId]: 0 }));
    try {
      const doc = await apiClient.uploadWithProgress<ActivityDoc>(`/activity-docs/${activityId}/media`, fd, (p) =>
        setUploads((u) => ({ ...u, [activityId]: p })),
      );
      replace(doc);
      setUploads(({ [activityId]: _, ...rest }) => rest);
    } catch (err) {
      setUploads((u) => ({ ...u, [activityId]: err instanceof ApiError ? err.message : "Upload failed" }));
    }
  };

  const openForm = (a: ActivityDoc | null) => {
    setEditing(a);
    setFiles([]);
    setError(null);
    setForm(
      a
        ? {
            title: a.title,
            date: toDateInput(a.date),
            category: a.category,
            venue: a.venue || "",
            description: a.description || "",
            isPublic: !!a.isPublic,
          }
        : EMPTY,
    );
    setOpen(true);
  };

  const set = (field: keyof FormState, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = clean(form);
      const saved = editing
        ? await apiClient.patch<ActivityDoc>(`/activity-docs/${editing._id}`, payload)
        : await apiClient.post<ActivityDoc>("/activity-docs", payload);
      setOpen(false);
      await load();
      // Upload after the modal closes so the progress shows on the activity's card.
      if (files.length) upload(saved._id, files);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save activity");
    } finally {
      setSaving(false);
    }
  };

  const saveCaption = async (a: ActivityDoc, m: ActivityMedia, caption: string) => {
    if ((m.caption || "") === caption.trim()) return;
    replace(await apiClient.patch<ActivityDoc>(`/activity-docs/${a._id}/media/${m._id}`, { caption: caption.trim() || null }));
  };

  const removeMedia = async (a: ActivityDoc, m: ActivityMedia) => {
    if (!window.confirm(`Remove ${m.originalFileName}?`)) return;
    replace(await apiClient.delete<ActivityDoc>(`/activity-docs/${a._id}/media/${m._id}`));
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    await apiClient.delete(`/activity-docs/${toDelete._id}`).catch(() => {});
    setToDelete(null);
    load();
  };

  const years = [...new Set(items.map((a) => a.date.substring(0, 4)))].sort().reverse();
  const shown = year ? items.filter((a) => a.date.startsWith(year)) : items;

  return (
    <ProtectedShell>
      <div className="mx-auto max-w-[1200px]">
        <PageHeader
          title="Photo & video documentation"
          description="Pictures and videos of sessions, hearings and other SB activities. They appear in the accomplishment report for the quarter of the activity's date."
          action={canEdit && <PrimaryButton onClick={() => openForm(null)}>+ Add activity</PrimaryButton>}
        />

        {years.length > 1 && (
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
            Year
            <select value={year} onChange={(e) => setYear(e.target.value)} className="field-input w-auto">
              <option value="">All</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <p className="card mt-5 px-4 py-10 text-center text-xs text-gray-500">Loading…</p>
        ) : shown.length === 0 ? (
          <div className="card mt-5">
            <EmptyState
              title="No documentation yet"
              hint={canEdit ? "Click “+ Add activity”, then upload the photos or videos." : "Documentation will appear here once staff add it."}
            />
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {shown.map((a) => {
              const progress = uploads[a._id];
              return (
                <section key={a._id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-navy-900">{a.title}</h2>
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {formatDate(a.date)} · {categoryLabel(a.category)}
                        {a.venue && ` · ${a.venue}`} · {a.media.length} file{a.media.length === 1 ? "" : "s"}
                        {a.isPublic && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800">On public portal</span>}
                      </p>
                      {a.description && <p className="mt-1 max-w-3xl whitespace-pre-line text-xs text-gray-700">{a.description}</p>}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-3 text-[11px]">
                        <label className="flex cursor-pointer items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 font-medium text-navy-900 hover:bg-gray-50">
                          <ImagePlus className="h-3.5 w-3.5" /> Add photos / videos
                          <input
                            type="file"
                            multiple
                            accept={MEDIA_ACCEPT}
                            className="hidden"
                            disabled={typeof progress === "number"}
                            onChange={(e) => {
                              const picked = Array.from(e.target.files || []);
                              e.target.value = "";
                              if (picked.length) upload(a._id, picked);
                            }}
                          />
                        </label>
                        <button onClick={() => openForm(a)} className="text-navy-900 underline">
                          Edit
                        </button>
                        {isAdmin && (
                          <button onClick={() => setToDelete(a)} className="text-red-600 underline">
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {typeof progress === "number" && (
                    <div className="mt-3" role="status">
                      <p className="text-[11px] text-gray-600">Uploading… {Math.round(progress * 100)}%</p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded bg-gray-100">
                        <div className="h-full bg-navy-800 transition-all" style={{ width: `${progress * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {typeof progress === "string" && <p className="mt-3 text-xs text-red-600">{progress}</p>}

                  {a.media.length > 0 ? (
                    <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {a.media.map((m) => (
                        <li key={m._id} className="group">
                          <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                            <button type="button" onClick={() => setViewing({ activity: a, media: m })} className="block h-full w-full" aria-label={`View ${m.originalFileName}`}>
                              {isVideo(m) ? (
                                <>
                                  <video src={`${mediaUrl(a, m)}#t=0.5`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="rounded-full bg-black/60 p-2 text-white">
                                      <Play className="h-5 w-5" />
                                    </span>
                                  </span>
                                </>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={mediaUrl(a, m)} alt={m.caption || m.originalFileName} loading="lazy" className="h-full w-full object-cover" />
                              )}
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => removeMedia(a, m)}
                                className="absolute right-1 top-1 rounded bg-white/90 p-1 text-red-600 opacity-0 shadow group-hover:opacity-100 focus:opacity-100"
                                aria-label={`Remove ${m.originalFileName}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          {canEdit ? (
                            <input
                              defaultValue={m.caption || ""}
                              placeholder="Add a caption"
                              onBlur={(e) => saveCaption(a, m, e.target.value).catch(() => {})}
                              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                              className="mt-1 w-full rounded border border-transparent px-1 py-0.5 text-[11px] text-navy-900 placeholder:text-gray-400 hover:border-gray-200 focus:border-navy-700 focus:outline-none"
                            />
                          ) : (
                            m.caption && <p className="mt-1 text-[11px] text-navy-900">{m.caption}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    progress === undefined && <p className="mt-3 text-xs italic text-gray-500">No photos or videos yet.</p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <Modal title={editing ? "Edit activity" : "Add activity documentation"} open={open} onClose={() => setOpen(false)} wide>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Activity / title" required className="sm:col-span-3">
            <input required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 45th Regular Session, Public hearing on the tricycle franchise ordinance" className="field-input" />
          </Field>
          <Field label="Date" required>
            <input required type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="field-input" />
          </Field>
          <Field label="Kind of activity">
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className="field-input">
              {ACTIVITY_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Venue">
            <input value={form.venue} onChange={(e) => set("venue", e.target.value)} className="field-input" />
          </Field>
          <Field label="Description" className="sm:col-span-3">
            <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What took place, who attended" className="field-input resize-y" />
          </Field>
          {!editing && (
            <Field label="Photos / videos" className="sm:col-span-3">
              <div className="rounded-md border border-dashed border-gray-300 bg-navy-50/40 px-3 py-3 text-xs">
                {files.length > 0 && (
                  <ul className="mb-2 space-y-0.5">
                    {files.map((f, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-navy-900">
                        <span className="truncate">{f.name}</span>
                        <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-gray-500" aria-label={`Remove ${f.name}`}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <label className="inline-block cursor-pointer rounded border border-gray-300 bg-white px-2 py-1 text-[11px] text-navy-900 hover:bg-gray-50">
                  Choose files
                  <input
                    type="file"
                    multiple
                    accept={MEDIA_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      setFiles([...files, ...Array.from(e.target.files || [])].slice(0, 20));
                      e.target.value = "";
                    }}
                  />
                </label>
                <span className="ml-2 text-[11px] text-gray-500">
                  JPG, PNG, WEBP or GIF photos · MP4, WEBM or MOV videos · up to {MAX_MEDIA_MB} MB each, 20 at a time
                </span>
              </div>
            </Field>
          )}
          <label className="flex items-start gap-2 text-xs text-navy-900 sm:col-span-3">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => set("isPublic", e.target.checked)} className="mt-0.5" />
            <span>
              Show on the public portal (Photos &amp; videos page)
              <span className="block text-[11px] text-gray-500">Leave unchecked for internal documentation only.</span>
            </span>
          </label>
          {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
          <div className="flex justify-end gap-2 sm:col-span-3">
            <SecondaryButton type="button" onClick={() => setOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? "Saving..." : editing ? "Save changes" : "Add activity"}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" onClick={() => setViewing(null)}>
          <button className="absolute right-4 top-4 rounded p-2 text-white hover:bg-white/10" aria-label="Close" onClick={() => setViewing(null)}>
            <X className="h-6 w-6" />
          </button>
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {isVideo(viewing.media) ? (
              <video src={mediaUrl(viewing.activity, viewing.media)} controls autoPlay playsInline className="max-h-[80vh] w-full rounded" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl(viewing.activity, viewing.media)} alt={viewing.media.caption || viewing.media.originalFileName} className="max-h-[80vh] rounded object-contain" />
            )}
            <figcaption className="mt-2 text-center text-sm text-white">
              {viewing.media.caption || viewing.media.originalFileName}
              <span className="block text-xs text-gray-300">
                {viewing.activity.title} · {formatDate(viewing.activity.date)} ·{" "}
                <a href={apiClient.fileUrl(`/activity-docs/${viewing.activity._id}/media/${viewing.media._id}?download=1`)} className="underline">
                  Download
                </a>
              </span>
            </figcaption>
          </figure>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete activity"
        message={`Delete “${toDelete?.title}” and all ${toDelete?.media.length ?? 0} of its photos and videos? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </ProtectedShell>
  );
}
