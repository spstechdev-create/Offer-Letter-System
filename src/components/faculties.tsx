"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  ExternalLink,
  GraduationCap,
  Landmark,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import "./faculties.css";

export type Faculty = {
  id: string;
  code: string;
  name_ms: string;
  name_en: string;
  kind: "faculty" | "institute";
  website: string | null;
  source_url?: string | null;
  is_active: boolean;
  notes?: string | null;
  programme_count: number;
  active_programme_count: number;
};

type FacultiesProps = {
  faculties: Faculty[];
  canManage: boolean;
  onChanged: () => Promise<void>;
  onViewProgrammes: (id: string) => void;
  notify: (message: string, error?: boolean) => void;
};

type FacultyDraft = {
  code: string;
  name_ms: string;
  name_en: string;
  kind: "faculty" | "institute";
  website: string;
  source_url: string;
  notes: string;
  is_active: boolean;
};

const blankDraft = (): FacultyDraft => ({
  code: "",
  name_ms: "",
  name_en: "",
  kind: "faculty",
  website: "",
  source_url: "",
  notes: "",
  is_active: true,
});

function webLink(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

async function saveFaculty(
  path: string,
  method: "POST" | "PATCH",
  value: Partial<FacultyDraft>,
) {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : result.error?.message ||
            result.message ||
            "The faculty could not be saved. Please try again.",
    );
  }
}

function FacultyModal({
  title,
  subtitle,
  children,
  onClose,
  busy,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
  busy: boolean;
}) {
  const headingId = useId();
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current
      ?.querySelector<HTMLElement>("input,button,select,textarea")
      ?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key !== "Tab" || !dialog.current) return;
      const items = [
        ...dialog.current.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
        ),
      ];
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
        event.preventDefault();
        items[0]?.focus();
      }
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [onClose, busy]);
  return (
    <div
      className="fc-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className="fc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        ref={dialog}
      >
        <header className="fc-modal-heading">
          <div>
            <h2 id={headingId}>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button
            type="button"
            className="fc-icon-button"
            aria-label="Close dialog"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function FacultyEditor({
  faculty,
  onClose,
  onSaved,
  notify,
}: {
  faculty: Faculty | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  notify: FacultiesProps["notify"];
}) {
  const [draft, setDraft] = useState<FacultyDraft>(() =>
    faculty
      ? {
          code: faculty.code,
          name_ms: faculty.name_ms,
          name_en: faculty.name_en,
          kind: faculty.kind,
          website: faculty.website || "",
          source_url: faculty.source_url || "",
          notes: faculty.notes || "",
          is_active: faculty.is_active,
        }
      : blankDraft(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = <K extends keyof FacultyDraft>(
    key: K,
    value: FacultyDraft[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      for (const url of [draft.website, draft.source_url]) {
        if (url.trim() && !webLink(url.trim()))
          throw new Error(
            "Use a full website address beginning with https:// or http://.",
          );
      }
      const payload = {
        ...draft,
        code: draft.code.trim().toUpperCase(),
        name_ms: draft.name_ms.trim(),
        name_en: draft.name_en.trim(),
        website: draft.website.trim(),
        source_url: draft.source_url.trim(),
        notes: draft.notes.trim(),
      };
      await saveFaculty(
        faculty
          ? `/api/faculties/${encodeURIComponent(faculty.id)}`
          : "/api/faculties",
        faculty ? "PATCH" : "POST",
        payload,
      );
      await onSaved();
      notify(
        `${payload.code} ${faculty ? "updated" : "added to the directory"}.`,
      );
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The faculty could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <FacultyModal
      title={
        faculty ? "Edit faculty or institute" : "Add a faculty or institute"
      }
      subtitle="Keep the official names and programme ownership together."
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <fieldset className="fc-editor-fields" disabled={busy}>
          <div className="fc-form-pair">
            <label className="fc-field">
              <span>
                Code <i>*</i>
              </span>
              <input
                required
                maxLength={30}
                value={draft.code}
                onChange={(event) =>
                  update("code", event.target.value.toUpperCase())
                }
                placeholder="e.g. FTMK"
                autoComplete="off"
              />
            </label>
            <label className="fc-field">
              <span>
                Organisation type <i>*</i>
              </span>
              <select
                value={draft.kind}
                onChange={(event) =>
                  update("kind", event.target.value as FacultyDraft["kind"])
                }
              >
                <option value="faculty">Faculty</option>
                <option value="institute">Institute</option>
              </select>
            </label>
          </div>
          <label className="fc-field">
            <span>
              Official Malay name <i>*</i>
            </span>
            <input
              required
              minLength={2}
              maxLength={250}
              value={draft.name_ms}
              onChange={(event) => update("name_ms", event.target.value)}
              placeholder="Full official name in Bahasa Melayu"
            />
          </label>
          <label className="fc-field">
            <span>
              Official English name <i>*</i>
            </span>
            <input
              required
              minLength={2}
              maxLength={250}
              value={draft.name_en}
              onChange={(event) => update("name_en", event.target.value)}
              placeholder="Full official name in English"
            />
          </label>
          <div className="fc-form-pair">
            <label className="fc-field">
              <span>Website</span>
              <input
                type="url"
                maxLength={500}
                value={draft.website}
                onChange={(event) => update("website", event.target.value)}
                placeholder="https://faculty.utem.edu.my"
              />
            </label>
            <label className="fc-field">
              <span>Official source</span>
              <input
                type="url"
                maxLength={500}
                value={draft.source_url}
                onChange={(event) => update("source_url", event.target.value)}
                placeholder="https://www.utem.edu.my/…"
              />
            </label>
          </div>
          <label className="fc-field">
            <span>
              Internal notes <small>Optional</small>
            </span>
            <textarea
              rows={3}
              maxLength={2000}
              value={draft.notes}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="Useful context, such as a previous faculty name."
            />
          </label>
          <div className="fc-editor-note">
            <GraduationCap size={19} />
            <p>
              Changes apply to the directory and new registrations. Details in
              previously issued letters stay the same.
            </p>
          </div>
        </fieldset>
        {error && (
          <div className="fc-form-error" role="alert">
            {error}
          </div>
        )}
        <footer className="fc-modal-actions">
          <button
            type="button"
            className="fc-button fc-button-secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="fc-button fc-button-primary"
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle size={16} className="fc-spinner" />
            ) : (
              <Check size={16} />
            )}
            {faculty ? "Save changes" : "Add to directory"}
          </button>
        </footer>
      </form>
    </FacultyModal>
  );
}

function FacultyStatusDialog({
  faculty,
  onClose,
  onSaved,
  notify,
}: {
  faculty: Faculty;
  onClose: () => void;
  onSaved: () => Promise<void>;
  notify: FacultiesProps["notify"];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const retiring = faculty.is_active;
  async function changeStatus() {
    setBusy(true);
    setError("");
    try {
      await saveFaculty(
        `/api/faculties/${encodeURIComponent(faculty.id)}`,
        "PATCH",
        { is_active: !retiring },
      );
      await onSaved();
      notify(`${faculty.code} ${retiring ? "retired" : "restored"}.`);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The status could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <FacultyModal
      title={`${retiring ? "Retire" : "Restore"} ${faculty.code}?`}
      subtitle={faculty.name_en}
      onClose={onClose}
      busy={busy}
    >
      <div className="fc-status-content">
        <span
          className={`fc-status-illustration ${retiring ? "retiring" : ""}`}
        >
          {retiring ? <Archive size={26} /> : <ArchiveRestore size={26} />}
        </span>
        <h3>
          {retiring
            ? "Keep the history. Close new registrations."
            : "Make this organisation available again."}
        </h3>
        <p>
          {retiring
            ? "This faculty or institute will be unavailable for new registrations. Its existing programmes, student records and issued offer letters remain in the system."
            : "This faculty or institute can be selected again. Each programme keeps its own active status; restoring the faculty does not activate every programme."}
        </p>
        <p className="fc-status-reassurance">
          {retiring
            ? "You can restore it at any time."
            : "Previously issued letter details remain unchanged."}
        </p>
      </div>
      {error && (
        <div className="fc-form-error" role="alert">
          {error}
        </div>
      )}
      <footer className="fc-modal-actions">
        <button
          type="button"
          className="fc-button fc-button-secondary"
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`fc-button ${retiring ? "fc-button-retire" : "fc-button-primary"}`}
          disabled={busy}
          onClick={() => void changeStatus()}
        >
          {busy ? (
            <LoaderCircle size={16} className="fc-spinner" />
          ) : retiring ? (
            <Archive size={16} />
          ) : (
            <ArchiveRestore size={16} />
          )}
          {retiring ? "Retire organisation" : "Restore organisation"}
        </button>
      </footer>
    </FacultyModal>
  );
}

export default function Faculties({
  faculties,
  canManage,
  onChanged,
  onViewProgrammes,
  notify,
}: FacultiesProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "faculty" | "institute">("all");
  const [status, setStatus] = useState<"all" | "active" | "retired">("all");
  const [editor, setEditor] = useState<{ faculty: Faculty | null } | null>(
    null,
  );
  const [statusTarget, setStatusTarget] = useState<Faculty | null>(null);
  const counts = useMemo(
    () => ({
      faculties: faculties.filter(
        (entry) => entry.is_active && entry.kind === "faculty",
      ).length,
      institutes: faculties.filter(
        (entry) => entry.is_active && entry.kind === "institute",
      ).length,
      programmes: faculties.reduce(
        (total, entry) => total + Number(entry.programme_count || 0),
        0,
      ),
      retired: faculties.filter((entry) => !entry.is_active).length,
    }),
    [faculties],
  );
  const filtered = useMemo(() => {
    const text = query.trim().toLocaleLowerCase();
    return faculties
      .filter(
        (faculty) =>
          (kind === "all" || faculty.kind === kind) &&
          (status === "all" || faculty.is_active === (status === "active")) &&
          (!text ||
            [
              faculty.code,
              faculty.name_ms,
              faculty.name_en,
              faculty.notes,
            ].some((value) => value?.toLocaleLowerCase().includes(text))),
      )
      .sort(
        (left, right) =>
          Number(right.is_active) - Number(left.is_active) ||
          left.code.localeCompare(right.code),
      );
  }, [faculties, query, kind, status]);
  const filtering = Boolean(query || kind !== "all" || status !== "all");

  return (
    <div className="faculties-view">
      <div className="fc-heading">
        <div>
          <span className="fc-eyebrow">ACADEMIC DIRECTORY</span>
          <h1>Faculties &amp; institutes</h1>
          <p>Manage faculty names, programme links and availability.</p>
        </div>
        {canManage && (
          <button
            type="button"
            className="fc-button fc-button-primary"
            onClick={() => setEditor({ faculty: null })}
          >
            <Plus size={18} />
            Add organisation
          </button>
        )}
      </div>

      <div className="fc-summary">
        <div>
          <span className="fc-summary-icon">
            <Building2 size={21} />
          </span>
          <p>
            <strong>{counts.faculties}</strong>
            <span>Active faculties</span>
          </p>
        </div>
        <div>
          <span className="fc-summary-icon fc-institute-accent">
            <Landmark size={21} />
          </span>
          <p>
            <strong>{counts.institutes}</strong>
            <span>Active institutes</span>
          </p>
        </div>
        <div>
          <span className="fc-summary-icon fc-programme-accent">
            <GraduationCap size={22} />
          </span>
          <p>
            <strong>{counts.programmes.toLocaleString()}</strong>
            <span>Programme offerings</span>
          </p>
        </div>
      </div>

      <section
        className="fc-directory"
        aria-label="Faculty and institute directory"
      >
        <div className="fc-toolbar">
          <div className="fc-search">
            <Search size={18} />
            <input
              aria-label="Search faculties and institutes"
              type="search"
              placeholder="Search names or faculty code…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="fc-filter-group" aria-label="Organisation type">
            {(
              [
                ["all", "All organisations"],
                ["faculty", "Faculties"],
                ["institute", "Institutes"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                className={kind === value ? "selected" : ""}
                onClick={() => setKind(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            className="fc-status-filter"
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="retired">Retired only</option>
          </select>
        </div>
        <div className="fc-list-caption">
          <span>
            {filtered.length}{" "}
            {filtered.length === 1 ? "organisation" : "organisations"}
            {filtering ? " found" : " in the directory"}
          </span>
          <span>Official names · Programme ownership</span>
        </div>
        <div className="fc-directory-list">
          {filtered.map((faculty) => {
            const website = webLink(faculty.website);
            const source = webLink(faculty.source_url);
            return (
              <article
                key={faculty.id}
                className={`fc-row ${!faculty.is_active ? "fc-row-retired" : ""}`}
              >
                <div
                  className={`fc-row-symbol ${faculty.kind === "institute" ? "fc-institute-symbol" : ""}`}
                >
                  {faculty.kind === "institute" ? (
                    <Landmark size={24} />
                  ) : (
                    <Building2 size={24} />
                  )}
                </div>
                <div className="fc-row-main">
                  <div className="fc-row-labels">
                    <strong className="fc-code">{faculty.code}</strong>
                    <span className="fc-kind">
                      {faculty.kind === "institute" ? "Institute" : "Faculty"}
                    </span>
                    <span
                      className={`fc-status ${faculty.is_active ? "" : "fc-retired"}`}
                    >
                      <i />
                      {faculty.is_active ? "Active" : "Retired"}
                    </span>
                  </div>
                  <h2>{faculty.name_ms}</h2>
                  <p className="fc-english-name">{faculty.name_en}</p>
                  <div className="fc-row-links">
                    {website && (
                      <a
                        href={website}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Website <ArrowUpRight size={13} />
                      </a>
                    )}
                    {source && (
                      <a
                        href={source}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Official source <ExternalLink size={12} />
                      </a>
                    )}
                    {!faculty.is_active && (
                      <span>Unavailable for new registrations</span>
                    )}
                  </div>
                  {faculty.notes && (
                    <details className="fc-source-notes">
                      <summary>Source notes</summary>
                      <p className="fc-row-note">{faculty.notes}</p>
                    </details>
                  )}
                </div>
                <div className="fc-row-side">
                  <button
                    className="fc-programme-link"
                    type="button"
                    onClick={() => onViewProgrammes(faculty.id)}
                    aria-label={`View ${faculty.code} programme offerings`}
                  >
                    <span>
                      <strong>{Number(faculty.programme_count || 0)}</strong>
                      <span>programme offerings</span>
                      <small>
                        {Number(faculty.active_programme_count || 0)} active
                      </small>
                    </span>
                    <ArrowRight size={18} />
                  </button>
                  {canManage && (
                    <div className="fc-row-actions">
                      <button
                        type="button"
                        onClick={() => setEditor({ faculty })}
                      >
                        <Pencil size={14} />
                        Edit details
                      </button>
                      <button
                        type="button"
                        className={
                          !faculty.is_active ? "fc-restore-action" : ""
                        }
                        onClick={() => setStatusTarget(faculty)}
                      >
                        {faculty.is_active ? (
                          <Archive size={14} />
                        ) : (
                          <ArchiveRestore size={14} />
                        )}
                        {faculty.is_active ? "Retire" : "Restore"}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
          {!filtered.length && (
            <div className="fc-empty">
              <span>
                <Building2 size={30} />
              </span>
              <h3>
                {filtering
                  ? "No organisations match your filters"
                  : "Build your academic directory"}
              </h3>
              <p>
                {filtering
                  ? "Try another name or code, or clear the filters to see every faculty and institute."
                  : "Add the official faculties and institutes, then connect their programme offerings."}
              </p>
              {filtering ? (
                <button
                  type="button"
                  className="fc-button fc-button-secondary"
                  onClick={() => {
                    setQuery("");
                    setKind("all");
                    setStatus("all");
                  }}
                >
                  Clear filters
                </button>
              ) : (
                canManage && (
                  <button
                    type="button"
                    className="fc-button fc-button-primary"
                    onClick={() => setEditor({ faculty: null })}
                  >
                    <Plus size={16} />
                    Add organisation
                  </button>
                )
              )}
            </div>
          )}
        </div>
        <footer className="fc-directory-footer">
          <GraduationCap size={17} />
          <p>
            Retiring an organisation closes new registrations. Existing student
            records and issued letters keep their original details.
          </p>
          {counts.retired > 0 && (
            <button
              type="button"
              onClick={() =>
                setStatus(status === "retired" ? "all" : "retired")
              }
            >
              {counts.retired} retired <ArrowRight size={14} />
            </button>
          )}
        </footer>
      </section>
      {editor && (
        <FacultyEditor
          faculty={editor.faculty}
          onClose={() => setEditor(null)}
          onSaved={onChanged}
          notify={notify}
        />
      )}
      {statusTarget && (
        <FacultyStatusDialog
          faculty={statusTarget}
          onClose={() => setStatusTarget(null)}
          onSaved={onChanged}
          notify={notify}
        />
      )}
    </div>
  );
}
