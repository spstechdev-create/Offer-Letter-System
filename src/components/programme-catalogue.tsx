"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Building2,
  X,
  Check,
  ArrowUpRight,
  BookOpen,
  SlidersHorizontal,
} from "lucide-react";
import type { Faculty } from "./faculties";
import "./programme-catalogue.css";

export type ProgrammeOffering = {
  id: string;
  code: string;
  name: string;
  faculty_id: string;
  faculty: string;
  faculty_name_ms: string;
  faculty_name_en: string;
  faculty_active: boolean;
  category: string;
  structure: string;
  attendance: string;
  delivery: string;
  duration: string;
  total_fee: number | string;
  is_active: boolean;
  needs_review?: boolean;
};
type Props = {
  catalogue: ProgrammeOffering[];
  faculties: Faculty[];
  initialFacultyId: string;
  canEdit: boolean;
  onChanged: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
};
const money = (v: number | string) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(
    Number(v),
  );
export default function ProgrammeCatalogue({
  catalogue,
  faculties,
  initialFacultyId,
  canEdit,
  onChanged,
  notify,
}: Props) {
  const [facultyId, setFacultyId] = useState(initialFacultyId),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ProgrammeOffering | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    faculty_id: "",
    structure: "",
    attendance: "",
    delivery: "",
    duration: "",
    total_fee: "",
    is_active: true,
    review_confirmed: false,
  });
  useEffect(() => {
    setFacultyId(initialFacultyId);
  }, [initialFacultyId]);
  useEffect(() => {
    setPage(0);
  }, [facultyId, search, category, status]);
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);
  const faculty = faculties.find((f) => f.id === facultyId);
  const filtered = useMemo(
    () =>
      catalogue.filter(
        (o) =>
          (!facultyId || o.faculty_id === facultyId) &&
          (category === "all" || o.category === category) &&
          (status === "all" ||
            (status === "review"
              ? o.needs_review
              : status === "active"
                ? o.is_active && o.faculty_active && !o.needs_review
                : !o.is_active || !o.faculty_active)) &&
          `${o.name} ${o.code} ${o.structure} ${o.faculty}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [catalogue, facultyId, category, status, search],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 15)),
    currentPage = Math.min(page, pageCount - 1),
    rows = filtered.slice(currentPage * 15, currentPage * 15 + 15);
  function chooseFaculty(id: string) {
    setFacultyId(id);
    const url = new URL(window.location.href);
    id
      ? url.searchParams.set("faculty", id)
      : url.searchParams.delete("faculty");
    window.history.replaceState({}, "", url);
  }
  function edit(o: ProgrammeOffering) {
    setSelected(o);
    setError("");
    setForm({
      name: o.name,
      faculty_id: o.faculty_id,
      structure: o.structure,
      attendance: o.attendance,
      delivery: o.delivery,
      duration: o.duration,
      total_fee: String(o.total_fee),
      is_active: o.is_active,
      review_confirmed: false,
    });
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/catalogue/" + encodeURIComponent(selected.id),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, total_fee: Number(form.total_fee) }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Unable to update programme.");
      await onChanged();
      setSelected(null);
      notify("Programme updated. Previously issued letters are unchanged.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="catalogue-workspace">
      <header className="catalogue-page-heading">
        <div>
          <p className="page-kicker">ACADEMIC DIRECTORY</p>
          <h1>Programme catalogue</h1>
          <p>Find a faculty, then manage its programme offerings and fees.</p>
        </div>
        <span className="directory-total">
          <BookOpen size={17} />
          {catalogue.length} offerings
        </span>
      </header>
      <div className="catalogue-browser">
        <aside className="catalogue-faculty-rail">
          <div className="catalogue-rail-label">FACULTIES & INSTITUTES</div>
          <button
            className={!facultyId ? "selected" : ""}
            onClick={() => chooseFaculty("")}
          >
            <Building2 size={18} />
            <span>All programmes</span>
            <small>{catalogue.length}</small>
          </button>
          {faculties.map((f) => (
            <button
              key={f.id}
              className={facultyId === f.id ? "selected" : ""}
              onClick={() => chooseFaculty(f.id)}
            >
              <span className="catalogue-faculty-code">{f.code}</span>
              <span className="catalogue-faculty-label">
                {f.name_en}
                <small>
                  {f.is_active ? "" : "Retired · "}
                  {f.programme_count} offerings
                </small>
              </span>
            </button>
          ))}
        </aside>
        <section className="catalogue-results">
          <header className="catalogue-results-heading">
            <div>
              <span className="page-kicker">
                {faculty ? faculty.code : "ALL FACULTIES"}
              </span>
              <h2>{faculty ? faculty.name_en : "All programme offerings"}</h2>
              {faculty && <p>{faculty.name_ms}</p>}
            </div>
            {faculty && (
              <span
                className={`directory-status ${faculty.is_active ? "" : "retired"}`}
              >
                {faculty.is_active ? "Active faculty" : "Retired faculty"}
              </span>
            )}
          </header>
          {faculty && !faculty.is_active && (
            <div className="catalogue-note">
              This faculty is retired. Its programmes and historical letters
              remain available, but new registrations are blocked.
            </div>
          )}
          <div className="catalogue-filter-row">
            <label className="catalogue-search">
              <Search size={18} />
              <input
                aria-label="Search programmes"
                placeholder="Search programme or code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              aria-label="Student category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All students</option>
              <option value="local">Local</option>
              <option value="international">International</option>
            </select>
            <select
              aria-label="Programme status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Available</option>
              <option value="inactive">Unavailable</option>
              <option value="review">Needs review</option>
            </select>
          </div>
          <div className="catalogue-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Programme</th>
                  <th>Student / attendance</th>
                  <th>Duration</th>
                  <th className="catalogue-price">Total fee</th>
                  <th>Status</th>
                  {canEdit && (
                    <th>
                      <span className="sr-only">Action</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <span className="catalogue-row-code">
                        {o.faculty} · {o.code}
                      </span>
                      <strong>{o.name}</strong>
                      <small>
                        {o.structure} · {o.delivery}
                      </small>
                    </td>
                    <td>
                      <span className="catalogue-category">
                        {o.category === "local" ? "Local" : "International"}
                      </span>
                      <small>{o.attendance}</small>
                    </td>
                    <td>{o.duration}</td>
                    <td className="catalogue-price">{money(o.total_fee)}</td>
                    <td>
                      <span
                        className={`directory-status ${o.needs_review ? "review" : !o.is_active || !o.faculty_active ? "retired" : ""}`}
                      >
                        {o.needs_review
                          ? "Needs review"
                          : !o.faculty_active
                            ? "Faculty retired"
                            : o.is_active
                              ? "Available"
                              : "Inactive"}
                      </span>
                    </td>
                    {canEdit && (
                      <td>
                        <button
                          className="catalogue-edit"
                          aria-label={"Edit " + o.code}
                          onClick={() => edit(o)}
                        >
                          <Pencil size={16} />
                          <span>Edit</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="catalogue-empty">
                <SlidersHorizontal size={28} />
                <h3>No programmes found</h3>
                <p>Try another faculty or adjust your search filters.</p>
              </div>
            )}
          </div>
          <footer className="catalogue-pagination">
            <span>
              {filtered.length === 0 ? "0" : currentPage * 15 + 1}–
              {Math.min((currentPage + 1) * 15, filtered.length)} of{" "}
              {filtered.length} offerings
            </span>
            <div>
              <button
                aria-label="Previous page"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft size={17} />
              </button>
              <span>
                {currentPage + 1} / {pageCount}
              </span>
              <button
                aria-label="Next page"
                disabled={currentPage + 1 >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </footer>
        </section>
      </div>
      <p className="catalogue-history-note">
        <Check size={15} />
        Catalogue changes apply to new letters. Original programme names and
        fees remain preserved on issued letters.
      </p>
      {selected && (
        <div
          className="catalogue-modal-backdrop"
          onClick={() => !busy && setSelected(null)}
        >
          <section
            className="catalogue-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="programme-edit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <span className="page-kicker">{selected.code}</span>
                <h2 id="programme-edit-title">Edit programme offering</h2>
              </div>
              <button
                aria-label="Close programme editor"
                onClick={() => setSelected(null)}
              >
                <X size={20} />
              </button>
            </header>
            <form onSubmit={save}>
              <div className="catalogue-edit-fields">
                <label className="full">
                  Programme name
                  <input
                    autoFocus
                    required
                    maxLength={250}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </label>
                <label className="full">
                  Faculty / institute
                  <select
                    required
                    value={form.faculty_id}
                    onChange={(e) =>
                      setForm({ ...form, faculty_id: e.target.value })
                    }
                  >
                    {faculties.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.code} — {f.name_en}
                        {!f.is_active ? " (Retired)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Total fee (MYR)
                  <input
                    type="number"
                    min="0"
                    max="99999999"
                    step="0.01"
                    required
                    value={form.total_fee}
                    onChange={(e) =>
                      setForm({ ...form, total_fee: e.target.value })
                    }
                  />
                </label>
                <label>
                  Duration
                  <input
                    required
                    maxLength={100}
                    value={form.duration}
                    onChange={(e) =>
                      setForm({ ...form, duration: e.target.value })
                    }
                  />
                </label>
                <label>
                  Academic structure
                  <input
                    required
                    maxLength={100}
                    value={form.structure}
                    onChange={(e) =>
                      setForm({ ...form, structure: e.target.value })
                    }
                  />
                </label>
                <label>
                  Attendance
                  <input
                    required
                    maxLength={100}
                    value={form.attendance}
                    onChange={(e) =>
                      setForm({ ...form, attendance: e.target.value })
                    }
                  />
                </label>
                <label>
                  Delivery
                  <input
                    required
                    maxLength={100}
                    value={form.delivery}
                    onChange={(e) =>
                      setForm({ ...form, delivery: e.target.value })
                    }
                  />
                </label>
                <label className="catalogue-toggle">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm({ ...form, is_active: e.target.checked })
                    }
                  />
                  Programme is active
                </label>
                {selected.needs_review && (
                  <label className="catalogue-review-check full">
                    <input
                      type="checkbox"
                      required={form.is_active}
                      checked={form.review_confirmed}
                      onChange={(e) =>
                        setForm({ ...form, review_confirmed: e.target.checked })
                      }
                    />
                    I have reconciled this offering’s name, fee, structure and
                    duration against the source audit.
                  </label>
                )}
                {error && (
                  <div className="catalogue-editor-error full" role="alert">
                    {error}
                  </div>
                )}
              </div>
              <footer>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setSelected(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Save programme"}
                  <ArrowUpRight size={16} />
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
