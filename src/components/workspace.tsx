"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Icon } from "./icons";
import { authClient } from "./auth-client";

type Grant = { level_id: string; actions: string[] };
type PageRow = {
  id?: string;
  page_key: string;
  title: string;
  route: string;
  icon: string;
  urutan: number;
  grants?: string[] | Grant[];
  level_grants?: Grant[];
  is_active?: boolean;
  show_in_sidebar?: boolean;
  parent_id?: string | null;
};
type User = {
  faculty_code?: string | null;
  id: string;
  name: string;
  email: string;
  level: string;
  scope?: string;
  level_id?: string;
  active?: boolean;
};
type Offering = {
  id: string;
  code: string;
  name: string;
  name_en?: string;
  faculty: string;
  structure: string;
  category: string;
  attendance: string;
  delivery: string;
  duration: string;
  total_fee: number | string;
  is_active: boolean;
  needs_review?: boolean;
};
type Application = {
  id: string;
  student_id?: string;
  student_name: string;
  document_type?: string;
  document_number: string;
  email: string;
  phone?: string;
  address?: string;
  category: string;
  programme_name: string;
  faculty?: string;
  fee_total: number | string;
  reference: string;
  created_at: string;
  letter_id?: string;
  status: string;
  created_by_name?: string;
  agent_name?: string;
  event_name?: string;
  archived?: boolean;
  letter_versions?: {
    id: string;
    version: number;
    reference: string;
    issued_at: string;
  }[];
};
type Level = { id: string; name: string; scope: string };
type Audit = {
  id: string;
  actor_name?: string;
  actor_email?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
  summary?: string;
};
type LetterSettings = {
  intake: string;
  templateVersion: string;
  admissionUrl: string;
  signatory: { name: string; title: string; signatureAsset?: string };
};
type Bootstrap = {
  user: User;
  pages: PageRow[];
  adminPages?: PageRow[];
  applications?: Application[];
  students?: Application[];
  catalogue: Offering[];
  levels: Level[];
  users?: User[];
  audit?: Audit[];
  stats?: {
    total: number;
    issued: number;
    local: number;
    international: number;
  };
  settings?: LetterSettings;
};
type Toast = { text: string; error?: boolean };

const money = (amount: number | string) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
const date = (value: string, time = false) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-MY", {
        dateStyle: "medium",
        ...(time ? { timeStyle: "short" as const } : {}),
        timeZone: "Asia/Kuala_Lumpur",
      }).format(parsed);
};
const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
const words = (text: string) =>
  text.replaceAll("_", " ").replaceAll(".", " · ");
const canonical = (key: string) =>
  ({
    dashboard: "overview",
    registration: "register",
    new_registration: "register",
    students: "records",
    student_records: "records",
    programme_catalogue: "catalogue",
    navigation: "pages",
    page_management: "pages",
    user_levels: "users",
    user_management: "users",
    audit_log: "audit",
  })[key] || key;

async function request<T = Record<string, unknown>>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) window.location.assign("/login");
    throw new Error(
      data.error?.message ||
        data.error ||
        data.message ||
        `Request failed (${response.status}).`,
    );
  }
  return data as T;
}

function Button({
  children,
  icon,
  variant = "primary",
  busy,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      className={`button ${variant} ${props.className || ""}`}
      disabled={props.disabled || busy}
    >
      {busy ? (
        <span className="spinner small" />
      ) : (
        icon && <Icon name={icon} size={17} />
      )}{" "}
      {children}
    </button>
  );
}
function Field({
  label,
  children,
  wide,
  hint,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
  hint?: string;
}) {
  return (
    <label className={`field ${wide ? "field-wide" : ""}`}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Empty({
  title,
  description,
  icon = "records",
  children,
}: {
  title: string;
  description: string;
  icon?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name={icon} size={28} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", escape);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", escape);
      document.body.style.overflow = previous;
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default function Workspace() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [query, setQuery] = useState("");
  const notify = useCallback(
    (text: string, error = false) => setToast({ text, error }),
    [],
  );
  const load = useCallback(async () => {
    try {
      const next = await request<Bootstrap>("/api/bootstrap");
      setData(next);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The workspace could not be loaded.",
      );
    }
  }, []);
  useEffect(() => {
    void load();
    const sync = () =>
      setPage(new URLSearchParams(window.location.search).get("page") || "");
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  const navigate = useCallback((key: string) => {
    window.history.pushState({}, "", `/?page=${encodeURIComponent(key)}`);
    setPage(key);
    setMenuOpen(false);
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const pages = useMemo(
    () =>
      [...(data?.pages || [])]
        .filter((p) => p.is_active !== false)
        .sort(
          (a, b) => a.urutan - b.urutan || a.page_key.localeCompare(b.page_key),
        ),
    [data],
  );
  const current =
    pages.find((p) => p.page_key === page) || (!page ? pages[0] : undefined);
  const currentKey = canonical(current?.page_key || "");
  const applications = data?.applications || data?.students || [];
  const findPage = (key: string) =>
    pages.find((p) => canonical(p.page_key) === key)?.page_key;
  const can = (action: string, target = current) => {
    if (!target?.grants) return false;
    return (
      (target.grants as string[]).includes(action) ||
      (target.grants as string[]).includes("manage")
    );
  };
  const go = (key: string) => {
    const target = findPage(key);
    if (target) navigate(target);
  };
  if (!data)
    return (
      <div className="loading-screen">
        <div className="brand-monogram">
          SPS
          <span />
        </div>
        {error ? (
          <>
            <h2>We couldn’t open the workspace.</h2>
            <p>{error}</p>
            <Button icon="refresh" onClick={() => void load()}>
              Try again
            </Button>
          </>
        ) : (
          <>
            <div className="spinner" />
            <p>Opening your SPS workspace…</p>
          </>
        )}
      </div>
    );
  const common = { data, applications, can, notify, reload: load, go };
  const dateLabel = new Intl.DateTimeFormat("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date());

  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${menuOpen ? "is-open" : ""}`}>
        <a className="brand" href="/" aria-label="SPS home">
          <div className="brand-monogram">
            SPS
            <span />
          </div>
          <div>
            <strong>Graduate Studies</strong>
            <span>Universiti Teknikal Malaysia Melaka</span>
          </div>
        </a>
        <div className="workspace-label">
          <span className="status-dot" /> ADMISSIONS WORKSPACE
        </div>
        <nav aria-label="Main navigation">
          <div className="nav-label">WORKSPACE</div>
          {pages
            .filter((p) => p.show_in_sidebar !== false)
            .map((p) => (
              <button
                key={p.page_key}
                className={`nav-item ${current?.page_key === p.page_key ? "active" : ""}`}
                onClick={() => navigate(p.page_key)}
                aria-current={
                  current?.page_key === p.page_key ? "page" : undefined
                }
              >
                <Icon name={p.icon || canonical(p.page_key)} size={19} />
                <span>{p.title}</span>
                {current?.page_key === p.page_key && (
                  <span className="nav-active-dot" />
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-help">
            <Icon name="shield" size={19} />
            <div>
              <strong>Your workspace, your access.</strong>
              <span>
                {data.user.scope === "own"
                  ? "Your registrations and letters"
                  : "Secure staff and agent access"}
              </span>
            </div>
          </div>
          <div className="sidebar-user">
            <span className="avatar">{initials(data.user.name)}</span>
            <div>
              <strong>{data.user.name}</strong>
              <span>{data.user.level}</span>
            </div>
            <button
              className="icon-button"
              title="Sign out"
              aria-label="Sign out"
              onClick={async () => {
                try {
                  await authClient.signOut();
                  window.location.assign("/login");
                } catch (err) {
                  notify(String(err), true);
                }
              }}
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Icon name="menu" />
            </button>
            <span className="breadcrumb">
              Workspace <Icon name="arrow" size={13} />{" "}
              <strong>{current?.title || "Page unavailable"}</strong>
            </span>
          </div>
          <div className="topbar-right">
            <span className="topbar-date">{dateLabel}</span>
            <span className="header-divider" />
            <span className="role-tag">
              <Icon name="shield" size={14} />
              {data.user.level}
            </span>
            <span className="avatar small-avatar">
              {initials(data.user.name)}
            </span>
          </div>
        </header>
        <main className="page-content" id="main-content">
          {error && (
            <div className="notice error">
              <Icon name="info" size={18} />
              {error}
              <button onClick={() => void load()}>Retry</button>
            </div>
          )}
          {!current ? (
            <Empty
              title="This page is not available"
              description="Your user level does not have access to this page, or the page is inactive."
              icon="lock"
            >
              <Button onClick={() => pages[0] && navigate(pages[0].page_key)}>
                Back to workspace
              </Button>
            </Empty>
          ) : currentKey === "overview" ? (
            <Overview {...common} />
          ) : currentKey === "register" ? (
            <Registration {...common} />
          ) : currentKey === "records" ? (
            <Records {...common} query={query} setQuery={setQuery} />
          ) : currentKey === "catalogue" ? (
            <Catalogue {...common} />
          ) : currentKey === "pages" ? (
            <PagesAdmin {...common} />
          ) : currentKey === "users" ? (
            <UsersAdmin {...common} />
          ) : currentKey === "audit" ? (
            <AuditLog {...common} />
          ) : currentKey === "settings" ? (
            <Settings {...common} />
          ) : (
            <Empty
              title={current.title}
              description="This registered page does not have an application view yet."
              icon={current.icon}
            />
          )}
          <footer className="page-footer">
            <span>School of Graduate Studies · UTeM</span>
            <span>Registration & conditional offers</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div role="status" className={`toast ${toast.error ? "error" : ""}`}>
          <Icon name={toast.error ? "info" : "check"} size={19} />
          {toast.text}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

type Shared = {
  data: Bootstrap;
  applications: Application[];
  can: (action: string, target?: PageRow) => boolean;
  notify: (text: string, error?: boolean) => void;
  reload: () => Promise<void>;
  go: (key: string) => void;
};
function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}

function Overview({ data, applications: allApplications, go }: Shared) {
  const applications = allApplications.filter((a) => !a.archived);
  const total = data.stats?.total ?? applications.length;
  const issued =
    data.stats?.issued ??
    applications.filter((a) => a.letter_id || a.status === "issued").length;
  const local =
    data.stats?.local ??
    applications.filter((a) => a.category?.toLowerCase() === "local").length;
  const international =
    data.stats?.international ??
    applications.filter((a) => a.category?.toLowerCase() === "international")
      .length;
  const registerPage = data.pages.some(
    (p) => canonical(p.page_key) === "register",
  );
  const recordPage = data.pages.some(
    (p) => canonical(p.page_key) === "records",
  );
  return (
    <>
      <Heading
        eyebrow="YOUR ADMISSIONS DESK"
        title={`Welcome back, ${data.user.name.split(" ")[0]}.`}
        description="A clear view of your students, programmes and conditional offers."
      >
        {registerPage && (
          <Button icon="plus" onClick={() => go("register")}>
            Register student
          </Button>
        )}
      </Heading>
      <div className="stats-grid">
        {[
          {
            label: "Total registrations",
            value: total,
            icon: "records",
            detail:
              data.user.scope === "own"
                ? "Submitted by you"
                : "Across your accessible records",
            color: "blue",
          },
          {
            label: "Conditional letters",
            value: issued,
            icon: "file",
            detail: "Issued and ready to view",
            color: "green",
          },
          {
            label: "Local students",
            value: local,
            icon: "catalogue",
            detail: "Malaysian applicants",
            color: "purple",
          },
          {
            label: "International students",
            value: international,
            icon: "globe",
            detail: "Overseas applicants",
            color: "amber",
          },
        ].map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-top">
              <span>{stat.label}</span>
              <span className={`stat-icon ${stat.color}`}>
                <Icon name={stat.icon} size={20} />
              </span>
            </div>
            <div className="stat-value">{stat.value.toLocaleString()}</div>
            <div className="stat-detail">{stat.detail}</div>
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent registrations</h2>
              <p>The latest additions to your student records.</p>
            </div>
            {recordPage && (
              <button className="text-button" onClick={() => go("records")}>
                View all <Icon name="arrow" size={16} />
              </button>
            )}
          </div>
          {applications.length ? (
            <StudentTable applications={applications.slice(0, 6)} compact />
          ) : (
            <Empty
              title="Your first student starts here"
              description="Register a student to create their record and issue their conditional offer."
              icon="register"
            >
              {registerPage && (
                <Button
                  icon="plus"
                  variant="secondary"
                  onClick={() => go("register")}
                >
                  Register a student
                </Button>
              )}
            </Empty>
          )}
        </section>
        <div className="overview-aside">
          <section className="workflow-card">
            <div className="workflow-decoration" />
            <span className="mini-label">ONE CONNECTED WORKFLOW</span>
            <h2>
              From registration
              <br />
              to a new beginning.
            </h2>
            <p>
              Student details, programme selection and a conditional offer. All
              together.
            </p>
            <div className="workflow-steps">
              <span>
                <i>1</i>Register a student
              </span>
              <span>
                <i>2</i>Save their information
              </span>
              <span>
                <i>
                  <Icon name="check" size={12} />
                </i>
                Offer ready to view
              </span>
            </div>
            {registerPage && (
              <button className="workflow-link" onClick={() => go("register")}>
                Start a registration <Icon name="arrow" size={18} />
              </button>
            )}
          </section>
          <section className="small-info-card">
            <span className="info-icon">
              <Icon name="file" size={21} />
            </span>
            <div>
              <h3>Original letters stay original.</h3>
              <p>
                Programme and fee changes apply to new letters. Previously
                issued details are preserved.
              </p>
            </div>
          </section>
        </div>
      </div>
      <div className="section-label">WORKSPACE AT A GLANCE</div>
      <div className="quick-links">
        {data.pages
          .filter((p) =>
            ["catalogue", "records", "pages"].includes(canonical(p.page_key)),
          )
          .map((p) => (
            <button
              className="quick-link"
              key={p.page_key}
              onClick={() => go(canonical(p.page_key))}
            >
              <span className="quick-link-icon">
                <Icon name={p.icon || canonical(p.page_key)} size={23} />
              </span>
              <span>
                <strong>{p.title}</strong>
                <small>
                  {canonical(p.page_key) === "catalogue"
                    ? `${data.catalogue.filter((p) => p.is_active).length} active programme offerings`
                    : canonical(p.page_key) === "records"
                      ? "Find a student or reopen an offer"
                      : "Control navigation and level access"}
                </small>
              </span>
              <Icon name="arrow" size={18} />
            </button>
          ))}
      </div>
    </>
  );
}

function StudentTable({
  applications,
  compact = false,
  onSelect,allowGenerate=true,
}: {
  applications: Application[];
  compact?: boolean;allowGenerate?:boolean;
  onSelect?: (application: Application) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Programme</th>
            {!compact && (
              <>
                <th>Category</th>
                <th>Total fee</th>
              </>
            )}
            <th>Registered</th>
            <th className="align-right">Letter</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((a) => (
            <tr key={a.id}>
              <td>
                <button
                  className="student-cell"
                  onClick={() => onSelect?.(a)}
                  disabled={!onSelect}
                >
                  <span
                    className={`student-avatar ${a.category?.toLowerCase() === "international" ? "lavender" : ""}`}
                  >
                    {initials(a.student_name || "Student")}
                  </span>
                  <span>
                    <strong>{a.student_name}</strong>
                    <small>{a.reference || a.document_number}</small>
                  </span>
                </button>
              </td>
              <td>
                <span className="programme-cell">{a.programme_name}</span>
                {a.faculty && (
                  <small className="cell-subtext">{a.faculty}</small>
                )}
              </td>
              {!compact && (
                <>
                  <td>
                    <Badge
                      tone={
                        a.category?.toLowerCase() === "international"
                          ? "purple"
                          : "blue"
                      }
                    >
                      {words(a.category || "—")}
                    </Badge>
                  </td>
                  <td className="money-cell">{money(a.fee_total)}</td>
                </>
              )}
              <td className="date-cell">{date(a.created_at)}</td>
              <td className="align-right">
                {a.letter_id&&allowGenerate ? (
                  <a
                    href={`/api/letters/${encodeURIComponent(a.letter_id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="view-letter"
                  >
                    <Icon name="file" size={15} /> View{" "}
                    <Icon name="arrow" size={13} />
                  </a>
                ) : (
                  <Badge tone="amber">{words(a.status || "Pending")}</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type RegistrationForm = {
  name: string;
  documentType: string;
  documentNumber: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  offeringId: string;
  agentName: string;
  agentCode: string;
  eventName: string;
  eventDate: string;
};
function Registration({ data, notify, reload, go }: Shared) {
  const freshForm = (): RegistrationForm => ({
    name: "",
    documentType: "ic",
    documentNumber: "",
    email: "",
    phone: "",
    address: "",
    category: "local",
    offeringId: "",
    agentName: data.user.name,
    agentCode: "",
    eventName: "",
    eventDate: "",
  });
  const [form, setForm] = useState<RegistrationForm>(freshForm);
  const [faculty, setFaculty] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );
  const [result, setResult] = useState<{
    reference: string;
    letterId?: string;
    applicationId?: string;
  } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const available = data.catalogue.filter(
    (o) =>
      o.is_active &&
      !o.needs_review &&
      o.category?.toLowerCase() === form.category,
  );
  const faculties = [...new Set(available.map((o) => o.faculty))].sort();
  const offerings = available.filter((o) => !faculty || o.faculty === faculty);
  const offering = available.find((o) => o.id === form.offeringId);
  const set = (name: keyof RegistrationForm, value: string) =>
    setForm((previous) => ({ ...previous, [name]: value }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await request<{
        reference?: string;
        letterId?: string;
        letter_id?: string;
        applicationId?: string;
        application?: { id: string; reference: string };
        letter?: { id: string; reference?: string };
      }>("/api/register", "POST", { ...form, idempotencyKey });
      setResult({
        reference:
          response.reference ||
          response.application?.reference ||
          response.letter?.reference ||
          "Registration saved",
        letterId:
          response.letterId || response.letter_id || response.letter?.id,
        applicationId: response.applicationId || response.application?.id,
      });
      await reload();
      notify("Student registered and conditional letter issued.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <div className="registration-success">
        <div className="success-check">
          <Icon name="check" size={34} />
        </div>
        <div className="eyebrow">REGISTRATION COMPLETE</div>
        <h1>A new beginning, on record.</h1>
        <p>
          <strong>{form.name}</strong> has been registered successfully.
          <br />
          Their conditional offer is ready to view.
        </p>
        <div className="success-reference">
          <small>REGISTRATION REFERENCE</small>
          <strong>{result.reference}</strong>
          <span>{offering?.name}</span>
        </div>
        <div className="success-actions">
          {result.letterId && (
            <>
              <a
                className="button primary"
                target="_blank"
                rel="noreferrer"
                href={`/api/letters/${encodeURIComponent(result.letterId)}`}
              >
                <Icon name="eye" size={18} /> View conditional letter
              </a>
              <a
                className="button secondary"
                href={`/api/letters/${encodeURIComponent(result.letterId)}?download=1`}
              >
                <Icon name="download" size={18} /> Download PDF
              </a>
            </>
          )}
        </div>
        <div className="success-bottom">
          <button
            className="text-button"
            onClick={() => {
              setResult(null);
              setForm(freshForm());
              setConfirmed(false);
              setFaculty("");
              setIdempotencyKey(crypto.randomUUID());
            }}
          >
            Register another student <Icon name="arrow" size={16} />
          </button>
          <button className="text-button muted" onClick={() => go("records")}>
            Go to student records
          </button>
        </div>
        <div className="subtle-note">
          <Icon name="lock" size={15} />
          Issued programme and fee details are preserved with this letter.
        </div>
      </div>
    );
  return (
    <>
      <Heading
        eyebrow="A NEW CHAPTER STARTS HERE"
        title="Register a student"
        description="Enter their details, select a programme and issue a conditional offer."
      />
      <form className="registration-layout" onSubmit={submit}>
        <div className="registration-fields">
          <section className="panel form-panel">
            <div className="form-section-heading">
              <span className="section-number">01</span>
              <div>
                <h2>Student information</h2>
                <p>Use the details shown on the student’s IC or passport.</p>
              </div>
            </div>
            <div className="form-body">
              <div
                className="category-selector"
                role="group"
                aria-label="Student category"
              >
                {["local", "international"].map((category) => (
                  <button
                    type="button"
                    key={category}
                    className={form.category === category ? "selected" : ""}
                    onClick={() => {
                      setForm({
                        ...form,
                        category,
                        documentType: category === "local" ? "ic" : "passport",
                        offeringId: "",
                      });
                      setFaculty("");
                    }}
                  >
                    <Icon
                      name={category === "local" ? "catalogue" : "globe"}
                      size={19}
                    />
                    <span>
                      {category === "local"
                        ? "Local student"
                        : "International student"}
                      <small>
                        {category === "local"
                          ? "Malaysian citizen"
                          : "Non-Malaysian citizen"}
                      </small>
                    </span>
                    <i>
                      {form.category === category && (
                        <Icon name="check" size={12} />
                      )}
                    </i>
                  </button>
                ))}
              </div>
              <div className="fields-grid">
                <Field label="Full name *" wide>
                  <input
                    name="name"
                    required
                    autoComplete="name"
                    placeholder="Full name as shown on identity document"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    maxLength={200}
                  />
                </Field>
                <Field label="Document type *">
                  <select
                    value={form.documentType}
                    onChange={(e) => set("documentType", e.target.value)}
                  >
                    <option value="ic">Malaysian IC</option>
                    <option value="passport">Passport</option>
                  </select>
                </Field>
                <Field
                  label={`${form.documentType === "ic" ? "IC" : "Passport"} number *`}
                >
                  <input
                    required
                    value={form.documentNumber}
                    onChange={(e) => {
                      set("documentNumber", e.target.value);
                      setDuplicate(false);
                    }}
                    onBlur={() => {
                      if (form.documentNumber.length > 2)
                        void request<{ exists: boolean }>(
                          `/api/students/lookup?documentNumber=${encodeURIComponent(form.documentNumber)}`,
                        )
                          .then((r) => setDuplicate(r.exists))
                          .catch(() => {});
                    }}
                    placeholder={
                      form.documentType === "ic"
                        ? "e.g. 990101012345"
                        : "Passport number"
                    }
                    maxLength={50}
                  />
                </Field>
                <Field
                  label="Email address *"
                  hint={
                    duplicate
                      ? "This identity already exists. Existing student details will be reused; staff can correct the student record separately."
                      : undefined
                  }
                >
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="student@example.com"
                    maxLength={254}
                  />
                </Field>
                <Field label="Phone number *">
                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="e.g. +60 12 345 6789"
                    maxLength={40}
                  />
                </Field>
                <Field label="Correspondence address *" wide>
                  <textarea
                    required
                    autoComplete="street-address"
                    rows={3}
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="Street address, postcode, city, state and country"
                    maxLength={1500}
                  />
                </Field>
              </div>
            </div>
          </section>
          <section className="panel form-panel">
            <div className="form-section-heading">
              <span className="section-number">02</span>
              <div>
                <h2>Programme selection</h2>
                <p>
                  Available programmes and fees come from the current catalogue.
                </p>
              </div>
            </div>
            <div className="form-body">
              <div className="fields-grid">
                <Field label="Faculty *">
                  <select
                    required
                    value={faculty}
                    onChange={(e) => {
                      setFaculty(e.target.value);
                      set("offeringId", "");
                    }}
                  >
                    <option value="">Select a faculty</option>
                    {faculties.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Programme offering *">
                  <select
                    required
                    value={form.offeringId}
                    onChange={(e) => set("offeringId", e.target.value)}
                    disabled={!faculty}
                  >
                    <option value="">Select a programme offering</option>
                    {offerings.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} · {o.structure} · {o.attendance}
                        {o.delivery ? ` · ${o.delivery}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {available.length === 0 && (
                <div className="notice amber">
                  <Icon name="info" size={18} />
                  No reviewed offerings are currently available for this student
                  category. An administrator can review the programme catalogue.
                </div>
              )}
              {offering && (
                <div className="offering-details">
                  <div>
                    <small>ACADEMIC STRUCTURE</small>
                    <strong>{offering.structure}</strong>
                  </div>
                  <div>
                    <small>ATTENDANCE</small>
                    <strong>{offering.attendance}</strong>
                  </div>
                  <div>
                    <small>DURATION</small>
                    <strong>
                      {offering.duration || "See programme requirements"}
                    </strong>
                  </div>
                  <div>
                    <small>LETTER LANGUAGE</small>
                    <strong>
                      {form.category === "local" ? "Bahasa Melayu" : "English"}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </section>
          <section className="panel form-panel">
            <div className="form-section-heading">
              <span className="section-number">03</span>
              <div>
                <h2>Agent & event</h2>
                <p>
                  Keep the source of this registration with the student’s
                  record.
                </p>
              </div>
              <Badge tone="neutral">Optional event details</Badge>
            </div>
            <div className="form-body fields-grid">
              <Field label="Agent / registering officer">
                <input
                  value={form.agentName}
                  onChange={(e) => set("agentName", e.target.value)}
                  readOnly={data.user.level.toLowerCase() === "agent"}
                  maxLength={200}
                />
              </Field>
              <Field label="Agent code">
                <input
                  value={form.agentCode}
                  onChange={(e) => set("agentCode", e.target.value)}
                  placeholder="Agent code, if applicable"
                  maxLength={80}
                />
              </Field>
              <Field label="Event name">
                <input
                  value={form.eventName}
                  onChange={(e) => set("eventName", e.target.value)}
                  placeholder="e.g. Postgraduate Education Fair"
                  maxLength={200}
                />
              </Field>
              <Field label="Event date">
                <input
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => set("eventDate", e.target.value)}
                />
              </Field>
            </div>
          </section>
        </div>
        <aside className="registration-summary">
          <div className="panel summary-card">
            <div className="summary-heading">
              <Icon name="file" size={22} />
              <h2>Registration summary</h2>
            </div>
            <div className="summary-body">
              <Badge tone={form.category === "local" ? "blue" : "purple"}>
                {form.category === "local"
                  ? "Local student"
                  : "International student"}
              </Badge>
              <h3>{offering?.name || "Select a programme"}</h3>
              <p>
                {offering
                  ? `${offering.faculty} · ${offering.structure}`
                  : "Programme details will appear here."}
              </p>
              <dl>
                <div>
                  <dt>Attendance</dt>
                  <dd>{offering?.attendance || "—"}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{offering?.duration || "—"}</dd>
                </div>
                <div>
                  <dt>Delivery</dt>
                  <dd>{offering?.delivery || "—"}</dd>
                </div>
                <div>
                  <dt>Letter type</dt>
                  <dd>Conditional offer</dd>
                </div>
              </dl>
              <div className="summary-total">
                <span>Total programme fee</span>
                <strong>{offering ? money(offering.total_fee) : "—"}</strong>
                <small>Amount recorded when this letter is issued</small>
              </div>
              <label className="checkbox-label">
                <input
                  required
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>
                  I have checked the student’s information and programme
                  selection.
                </span>
              </label>
              {error && (
                <div className="notice error" role="alert">
                  <Icon name="info" size={18} />
                  {error}
                </div>
              )}
              <Button
                type="submit"
                icon="arrow"
                busy={busy}
                disabled={!offering || !confirmed}
                className="full-button"
              >
                Register & issue letter
              </Button>
              <div className="summary-footnote">
                <Icon name="lock" size={13} />
                Saved securely. PDF available immediately.
              </div>
            </div>
          </div>
          <div className="summary-note">
            <Icon name="info" size={18} />
            <p>
              Submitting creates the student record and issues a conditional
              letter. Issued programme and fee details are retained for future
              viewing.
            </p>
          </div>
        </aside>
      </form>
    </>
  );
}

function Records({
  applications,
  data,
  can,
  notify,
  reload,
  go,
  query,
  setQuery,
}: Shared & { query: string; setQuery: (value: string) => void }) {
  const [category, setCategory] = useState("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selected, setSelected] = useState<Application | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const filtered = applications.filter(
    (a) =>
      (includeArchived || !a.archived) &&
      (category === "all" || a.category?.toLowerCase() === category) &&
      `${a.student_name} ${a.reference} ${a.document_number} ${a.programme_name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  async function select(a: Application) {
    const history = await request<Application["letter_versions"]>(
      `/api/applications/${a.id}/letters`,
    ).catch(() => []);
    setSelected({ ...a, letter_versions: history });
    setEditing(false);
    setForm({
      name: a.student_name,
      email: a.email || "",
      phone: a.phone || "",
      address: a.address || "",
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await request(
        `/api/students/${encodeURIComponent(selected.student_id || selected.id)}`,
        "PATCH",
        form,
      );
      await reload();
      setSelected({
        ...selected,
        student_name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
      });
      setEditing(false);
      notify("Student information updated. Issued letters are unchanged.");
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Could not update this student.",
        true,
      );
    } finally {
      setBusy(false);
    }
  }
  async function archive() {
    if (!selected) return;
    setBusy(true);
    try {
      await request(
        `/api/students/${encodeURIComponent(selected.student_id || selected.id)}`,
        "PATCH",
        { archived: !selected.archived },
      );
      await reload();
      setSelected(null);
      notify(
        selected.archived
          ? "Student record restored."
          : "Student record archived. Letter history retained.",
      );
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Could not archive this student.",
        true,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="EVERY STUDENT, ONE RECORD"
        title="Student records"
        description={
          data.user.scope === "own"
            ? "Find and manage the students you have registered."
            : "Find students, review registrations and view their issued letters."
        }
      >
        {data.pages.some((p) => canonical(p.page_key) === "register") && (
          <Button icon="plus" onClick={() => go("register")}>
            Register student
          </Button>
        )}
      </Heading>
      <section className="panel records-panel">
        <div className="table-toolbar">
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              aria-label="Search student records"
              placeholder="Search name, IC / passport or reference…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className="icon-button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <Icon name="close" size={15} />
              </button>
            )}
          </div>
          <div
            className="filter-tabs"
            role="group"
            aria-label="Filter by category"
          >
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
              />
              Include archived
            </label>
            {["all", "local", "international"].map((c) => (
              <button
                key={c}
                className={category === c ? "active" : ""}
                onClick={() => setCategory(c)}
              >
                {c === "all" ? "All students" : c[0].toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {filtered.length ? (
          <StudentTable applications={filtered} onSelect={select} allowGenerate={can("generate")}/>
        ) : (
          <Empty
            title={
              query || category !== "all"
                ? "No matching students"
                : "No students registered yet"
            }
            description={
              query || category !== "all"
                ? "Try a different name, reference or category."
                : "Your saved registrations and letters will appear here."
            }
          />
        )}
        <div className="table-footer">
          <span>
            {filtered.length} registration{filtered.length === 1 ? "" : "s"}
            {query ? " matching your search" : ""}
          </span>
          <span>
            <Icon name="lock" size={13} />
            Access follows your user level
          </span>
        </div>
      </section>
      <div className="inline-information">
        <Icon name="info" size={17} />
        <span>
          View generates the PDF from the original issued details. Changes to
          the catalogue do not change an existing letter.
        </span>
      </div>
      {selected && (
        <Modal
          title={editing ? "Edit student information" : selected.student_name}
          subtitle={selected.reference}
          onClose={() => setSelected(null)}
          wide
        >
          {editing ? (
            <form onSubmit={save}>
              <div className="modal-body fields-grid">
                <Field label="Full name *" wide>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="Email address *">
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </Field>
                <Field label="Phone number">
                  <input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </Field>
                <Field label="Address" wide>
                  <textarea
                    rows={3}
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                  />
                </Field>
                <div className="notice field-wide">
                  <Icon name="info" size={18} />
                  This corrects the student record. Previously issued letters
                  keep their original information.
                </div>
              </div>
              <div className="modal-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" busy={busy} icon="check">
                  Save changes
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="modal-body">
                <div className="detail-summary">
                  <Badge
                    tone={
                      selected.category === "international" ? "purple" : "blue"
                    }
                  >
                    {selected.category}
                  </Badge>
                  <Badge>Conditional offer</Badge>
                </div>
                <dl className="detail-grid">
                  <div>
                    <dt>IC / passport</dt>
                    <dd>{selected.document_number}</dd>
                  </div>
                  <div>
                    <dt>Registered on</dt>
                    <dd>{date(selected.created_at, true)}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{selected.email || "—"}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>{selected.phone || "—"}</dd>
                  </div>
                  <div className="field-wide">
                    <dt>Correspondence address</dt>
                    <dd>{selected.address || "—"}</dd>
                  </div>
                  <div className="field-wide">
                    <dt>Programme at issue</dt>
                    <dd>{selected.programme_name}</dd>
                  </div>
                  <div>
                    <dt>Total fee at issue</dt>
                    <dd>{money(selected.fee_total)}</dd>
                  </div>
                  <div>
                    <dt>Registered by</dt>
                    <dd>
                      {selected.created_by_name || selected.agent_name || "—"}
                    </dd>
                  </div>
                  {selected.event_name && (
                    <div>
                      <dt>Event</dt>
                      <dd>{selected.event_name}</dd>
                    </div>
                  )}
                </dl>
                <div className="letter-history">
                  <h3>Issued letter</h3>
                  <p>Generated on demand from the saved issuance details.</p>
                  {selected.letter_id ? (
                    <div className="letter-history-row">
                      <span className="letter-file-icon">
                        <Icon name="file" size={24} />
                      </span>
                      <div>
                        <strong>{selected.reference}</strong>
                        <small>
                          {selected.letter_versions?.length
                            ? `${selected.letter_versions.length} version(s) retained`
                            : "Original conditional offer"}
                        </small>
                      </div>
                      <a
                        className="button secondary"
                        target="_blank"
                        rel="noreferrer"
                        href={`/api/letters/${encodeURIComponent(selected.letter_id)}`}
                      >
                        <Icon name="eye" size={16} /> View PDF
                      </a>
                    </div>
                  ) : (
                    <p className="muted">No issued letter is available.</p>
                  )}
                  {selected.letter_versions?.map((version) => (
                    <div className="letter-history-row" key={version.id}>
                      <div>
                        <strong>Version {version.version}</strong>
                        <small>
                          {date(version.issued_at)} · {version.reference}
                        </small>
                      </div>
                      <a
                        className="text-button"
                        href={`/api/letters/${encodeURIComponent(version.id)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View <Icon name="arrow" size={15} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-actions split-actions">
                <div>
                  {can("edit") && (
                    <Button
                      variant="ghost"
                      icon="archive"
                      busy={busy}
                      onClick={() => void archive()}
                    >
                      {selected.archived ? "Restore record" : "Archive record"}
                    </Button>
                  )}
                </div>
                <div>
                  <Button variant="secondary" onClick={() => setSelected(null)}>
                    Close
                  </Button>
                  {can("edit")&&can("generate") && (
                    <Button
                      variant="secondary"
                      icon="refresh"
                      onClick={async () => {
                        const reason = window.prompt(
                          "Reason for corrected letter (original will be retained):",
                        );
                        if (!reason || reason.trim().length < 3) return;
                        setBusy(true);
                        try {
                          await request(
                            `/api/letters/${selected.letter_id}/reissue`,
                            "POST",
                            { reason },
                          );
                          await reload();
                          setSelected(null);
                          notify(
                            "Corrected letter issued. The original is retained.",
                          );
                        } catch (e) {
                          notify(
                            e instanceof Error
                              ? e.message
                              : "Unable to reissue.",
                            true,
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Issue corrected letter
                    </Button>
                  )}
                  {can("edit") && (
                    <Button icon="edit" onClick={() => setEditing(true)}>
                      Edit information
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}

function Catalogue({ data, can, notify, reload }: Shared) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Offering | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    faculty: "",
    structure: "",
    attendance: "",
    delivery: "",
    total_fee: "",
    duration: "",
    is_active: true,
    review_confirmed: false,
  });
  const filtered = data.catalogue.filter(
    (o) =>
      (filter === "all" ||
        (filter === "review"
          ? o.needs_review
          : filter === "active"
            ? o.is_active
            : !o.is_active)) &&
      `${o.name} ${o.code} ${o.faculty} ${o.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function edit(offering: Offering) {
    setSelected(offering);
    setForm({
      name: offering.name,
      faculty: offering.faculty,
      structure: offering.structure,
      attendance: offering.attendance,
      delivery: offering.delivery,
      total_fee: String(offering.total_fee),
      duration: offering.duration || "",
      is_active: offering.is_active,
      review_confirmed: false,
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await request(
        `/api/catalogue/${encodeURIComponent(selected.id)}`,
        "PATCH",
        { ...form, total_fee: Number(form.total_fee) },
      );
      await reload();
      setSelected(null);
      notify(
        "Catalogue updated. Existing letters retain their original programme and fee.",
      );
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Could not update this programme.",
        true,
      );
    } finally {
      setBusy(false);
    }
  }
  const reviewCount = data.catalogue.filter((o) => o.needs_review).length;
  return (
    <>
      <Heading
        eyebrow="ACADEMIC SETTINGS"
        title="Programme catalogue"
        description="Manage programme offerings, total fees and durations for new registrations."
      >
        <div className="catalogue-count">
          <strong>{data.catalogue.filter((o) => o.is_active).length}</strong>{" "}
          active offerings
        </div>
      </Heading>
      <div className="catalogue-preservation">
        <div className="preservation-icon">
          <Icon name="shield" size={23} />
        </div>
        <div>
          <strong>Update the catalogue with confidence.</strong>
          <p>
            Programme names and prices on issued letters stay exactly as they
            were. Your edits apply to future letters.
          </p>
        </div>
        <Badge>History preserved</Badge>
      </div>
      {reviewCount > 0 && (
        <div className="notice amber">
          <Icon name="info" size={18} />
          {reviewCount} offering{reviewCount === 1 ? " needs" : "s need"} source
          reconciliation before registration can use{" "}
          {reviewCount === 1 ? "it" : "them"}.
        </div>
      )}
      <section className="panel">
        <div className="table-toolbar">
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              aria-label="Search programmes"
              placeholder="Search programme, faculty or code…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            aria-label="Filter programmes"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All offerings</option>
            <option value="active">Active offerings</option>
            <option value="inactive">Inactive offerings</option>
            <option value="review">Needs review</option>
          </select>
        </div>
        {filtered.length ? (
          <div className="table-wrap">
            <table className="catalogue-table">
              <thead>
                <tr>
                  <th>Programme / offering</th>
                  <th>Category & attendance</th>
                  <th>Duration</th>
                  <th>Total fee</th>
                  <th>Status</th>
                  {can("edit") && <th className="align-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <span className="faculty-label">
                        {o.faculty} <span>· {o.code}</span>
                      </span>
                      <strong className="catalogue-programme">{o.name}</strong>
                      <small className="cell-subtext">
                        {o.structure}
                        {o.delivery ? ` · ${o.delivery}` : ""}
                      </small>
                    </td>
                    <td>
                      <span className="capitalize">{o.category}</span>
                      <small className="cell-subtext">{o.attendance}</small>
                    </td>
                    <td className="duration-cell">{o.duration || "—"}</td>
                    <td className="money-cell">{money(o.total_fee)}</td>
                    <td>
                      <Badge
                        tone={
                          o.needs_review
                            ? "amber"
                            : o.is_active
                              ? "green"
                              : "neutral"
                        }
                      >
                        {o.needs_review
                          ? "Needs review"
                          : o.is_active
                            ? "Active"
                            : "Inactive"}
                      </Badge>
                    </td>
                    {can("edit") && (
                      <td className="align-right">
                        <button
                          className="table-edit"
                          onClick={() => edit(o)}
                          aria-label={`Edit ${o.name}`}
                        >
                          <Icon name="edit" size={16} /> Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No programmes found"
            description="Try another search or offering filter."
            icon="catalogue"
          />
        )}
        <div className="table-footer">
          <span>
            {filtered.length} programme offering
            {filtered.length === 1 ? "" : "s"}
          </span>
          <span>Fees in Malaysian Ringgit (MYR)</span>
        </div>
      </section>
      {selected && (
        <Modal
          title="Edit programme offering"
          subtitle={`${selected.faculty} · ${selected.code} · ${selected.category}`}
          onClose={() => setSelected(null)}
        >
          <form onSubmit={save}>
            <div className="modal-body fields-grid">
              <Field label="Programme name *" wide>
                <input
                  autoFocus
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={300}
                />
              </Field>
              <Field label="Faculty">
                <input
                  required
                  value={form.faculty}
                  onChange={(e) =>
                    setForm({ ...form, faculty: e.target.value })
                  }
                />
              </Field>
              <Field label="Academic structure">
                <input
                  required
                  value={form.structure}
                  onChange={(e) =>
                    setForm({ ...form, structure: e.target.value })
                  }
                />
              </Field>
              <Field label="Attendance">
                <input
                  required
                  value={form.attendance}
                  onChange={(e) =>
                    setForm({ ...form, attendance: e.target.value })
                  }
                />
              </Field>
              <Field label="Delivery">
                <input
                  required
                  value={form.delivery}
                  onChange={(e) =>
                    setForm({ ...form, delivery: e.target.value })
                  }
                />
              </Field>
              {selected.needs_review && (
                <label className="checkbox-label field-wide">
                  <input
                    type="checkbox"
                    required={form.is_active}
                    checked={form.review_confirmed}
                    onChange={(e) =>
                      setForm({ ...form, review_confirmed: e.target.checked })
                    }
                  />
                  <span>
                    I have reconciled this offering with the source audit and
                    confirmed its name, fee, structure and duration.
                  </span>
                </label>
              )}
              <Field label="Total programme fee (RM) *">
                <div className="input-prefix">
                  <span>RM</span>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    max="10000000"
                    value={form.total_fee}
                    onChange={(e) =>
                      setForm({ ...form, total_fee: e.target.value })
                    }
                  />
                </div>
              </Field>
              <Field label="Duration">
                <input
                  value={form.duration}
                  onChange={(e) =>
                    setForm({ ...form, duration: e.target.value })
                  }
                  placeholder="e.g. 2–4 semesters"
                  maxLength={100}
                />
              </Field>
              <label className="checkbox-label field-wide">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                <span>Active and available for new registrations</span>
              </label>
              <div className="notice field-wide">
                <Icon name="shield" size={18} />
                <span>
                  Only new letters use these details. Every existing letter
                  keeps the name and total fee recorded when it was issued.
                </span>
              </div>
            </div>
            <div className="modal-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setSelected(null)}
              >
                Cancel
              </Button>
              <Button icon="check" type="submit" busy={busy}>
                Save programme
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function PagesAdmin({ data, notify, reload }: Shared) {
  const rows = [...(data.adminPages || data.pages)]
    .map((p) => ({ ...p, grants: p.level_grants || p.grants }))
    .sort(
      (a, b) => a.urutan - b.urutan || a.page_key.localeCompare(b.page_key),
    );
  const [selected, setSelected] = useState<PageRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    urutan: 1,
    is_active: true,
    show_in_sidebar: true,
    grants: [] as Grant[],
  });
  function edit(row: PageRow) {
    setSelected(row);
    setForm({
      title: row.title,
      urutan: row.urutan,
      is_active: row.is_active !== false,
      show_in_sidebar: row.show_in_sidebar !== false,
      grants:
        Array.isArray(row.grants) &&
        row.grants.length &&
        typeof row.grants[0] !== "string"
          ? (row.grants as Grant[]).map((g) => ({
              ...g,
              actions: [...g.actions],
            }))
          : [],
    });
  }
  function grant(levelId: string, action: string, checked: boolean) {
    setForm((previous) => {
      const grants = previous.grants.map((g) => ({
        ...g,
        actions: [...g.actions],
      }));
      let level = grants.find((g) => g.level_id === levelId);
      if (!level) {
        level = { level_id: levelId, actions: [] };
        grants.push(level);
      }
      if (checked) {
        if (!level.actions.includes(action)) level.actions.push(action);
        if (action !== "view" && !level.actions.includes("view"))
          level.actions.push("view");
      } else {
        level.actions =
          action === "view" ? [] : level.actions.filter((a) => a !== action);
      }
      return { ...previous, grants };
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await request(
        `/api/pages/${encodeURIComponent(selected.id || selected.page_key)}`,
        "PATCH",
        form,
      );
      await reload();
      setSelected(null);
      notify("Page order and user-level access updated.");
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Could not update this page.",
        true,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="WORKSPACE ADMINISTRATION"
        title="Pages & access"
        description="Control sidebar order, page visibility and the actions each user level can take."
      />
      <div className="notice">
        <Icon name="info" size={19} />
        <span>
          Pages are ordered by <strong>urutan</strong>. Access is checked on the
          server as well as in the sidebar.
        </span>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Page registry</h2>
            <p>Every application page is registered here.</p>
          </div>
          <Badge tone="neutral">{rows.length} pages</Badge>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Urutan</th>
                <th>Page</th>
                <th>Sidebar</th>
                <th>User levels with access</th>
                <th>Status</th>
                <th className="align-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.page_key}>
                  <td>
                    <span className="order-number">
                      {String(row.urutan).padStart(2, "0")}
                    </span>
                  </td>
                  <td>
                    <div className="page-registry-cell">
                      <span>
                        <Icon
                          name={row.icon || canonical(row.page_key)}
                          size={20}
                        />
                      </span>
                      <div>
                        <strong>{row.title}</strong>
                        <small>{row.route}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="cell-subtext">
                      {row.show_in_sidebar !== false ? "Visible" : "Hidden"}
                    </span>
                  </td>
                  <td>
                    <div className="level-badges">
                      {Array.isArray(row.grants) &&
                      row.grants.length &&
                      typeof row.grants[0] !== "string" ? (
                        (row.grants as Grant[])
                          .filter(
                            (g) =>
                              g.actions.includes("view") ||
                              g.actions.includes("manage"),
                          )
                          .map((g) => (
                            <Badge key={g.level_id} tone="neutral">
                              {data.levels.find((l) => l.id === g.level_id)
                                ?.name || g.level_id}
                            </Badge>
                          ))
                      ) : (
                        <span className="cell-subtext">Your level</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Badge tone={row.is_active !== false ? "green" : "neutral"}>
                      {row.is_active !== false ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="align-right">
                    <button
                      className="table-edit"
                      onClick={() => edit(row)}
                      aria-label={`Manage ${row.title}`}
                    >
                      <Icon name="edit" size={16} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {selected && (
        <Modal
          title="Page settings"
          subtitle={selected.page_key}
          onClose={() => setSelected(null)}
          wide
        >
          <form onSubmit={save}>
            <div className="modal-body">
              <div className="fields-grid">
                <Field label="Sidebar title *">
                  <input
                    required
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    maxLength={100}
                  />
                </Field>
                <Field label="Urutan (display order) *">
                  <input
                    required
                    type="number"
                    min="0"
                    max="9999"
                    value={form.urutan}
                    onChange={(e) =>
                      setForm({ ...form, urutan: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm({ ...form, is_active: e.target.checked })
                    }
                  />
                  <span>Page is active</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.show_in_sidebar}
                    onChange={(e) =>
                      setForm({ ...form, show_in_sidebar: e.target.checked })
                    }
                  />
                  <span>Show in sidebar</span>
                </label>
              </div>
              <div className="permissions-heading">
                <h3>User-level permissions</h3>
                <p>
                  Choose explicit access for each level. Higher levels do not
                  inherit permissions.
                </p>
              </div>
              <div className="table-wrap permissions-table">
                <table>
                  <thead>
                    <tr>
                      <th>User level</th>
                      {["view", "create", "edit", "generate", "manage"].map(
                        (action) => (
                          <th key={action}>{action}</th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.levels.map((level) => (
                      <tr key={level.id}>
                        <td>
                          <strong>{level.name}</strong>
                        </td>
                        {["view", "create", "edit", "generate", "manage"].map(
                          (action) => (
                            <td key={action}>
                              <input
                                type="checkbox"
                                aria-label={`${level.name} can ${action}`}
                                checked={
                                  form.grants
                                    .find((g) => g.level_id === level.id)
                                    ?.actions.includes(action) || false
                                }
                                onChange={(e) =>
                                  grant(level.id, action, e.target.checked)
                                }
                              />
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="notice">
                <Icon name="shield" size={17} />
                The last usable administrator access path is protected.
              </div>
            </div>
            <div className="modal-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setSelected(null)}
              >
                Cancel
              </Button>
              <Button type="submit" icon="check" busy={busy}>
                Save page & access
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function UsersAdmin({ data, notify, reload, ...rest }: Shared) {
  const [selected, setSelected] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    level_id: "",
    active: true,
    scope: "own",
    faculty_code: "",
  });
  function edit(user: User) {
    setSelected(user);
    setForm({
      level_id:
        user.level_id ||
        data.levels.find((l) => l.name === user.level)?.id ||
        "",
      active: user.active !== false,
      scope: user.scope || "own",
      faculty_code: user.faculty_code || "",
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      await request(
        `/api/users/${encodeURIComponent(selected.id)}`,
        "PATCH",
        form,
      );
      await reload();
      setSelected(null);
      notify("User access updated.");
    } catch (err) {
      notify(
        err instanceof Error ? err.message : "Could not update this user.",
        true,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="WORKSPACE ADMINISTRATION"
        title="Users & levels"
        description="Manage staff and agent access, assigned levels and student-record visibility."
      />
      <AccessProvision data={data} notify={notify} reload={reload} {...rest} />
      <div className="level-cards">
        {data.levels.map((level) => (
          <div className="panel level-card" key={level.id}>
            <span className="level-icon">
              <Icon
                name={
                  level.name.toLowerCase() === "admin"
                    ? "shield"
                    : level.name.toLowerCase() === "agent"
                      ? "records"
                      : "users"
                }
                size={23}
              />
            </span>
            <h3>{level.name}</h3>
            <p>
              {level.scope === "own"
                ? "Own registrations"
                : level.scope === "faculty"
                  ? "Faculty registrations"
                  : "All accessible registrations"}
            </p>
            <small>
              {
                (data.users || []).filter(
                  (u) => u.level_id === level.id || u.level === level.name,
                ).length
              }{" "}
              assigned users
            </small>
          </div>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Workspace users</h2>
            <p>Only provisioned accounts can use the admissions workspace.</p>
          </div>
          <Badge tone="neutral">{data.users?.length || 0} users</Badge>
        </div>
        {data.users?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Level</th>
                  <th>Record visibility</th>
                  <th>Status</th>
                  <th className="align-right">Manage</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="student-cell">
                        <span className="student-avatar">
                          {initials(user.name)}
                        </span>
                        <span>
                          <strong>
                            {user.name}
                            {user.id === data.user.id && (
                              <small className="you-label">You</small>
                            )}
                          </strong>
                          <small>{user.email}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge
                        tone={
                          user.level.toLowerCase() === "admin"
                            ? "purple"
                            : "blue"
                        }
                      >
                        {user.level}
                      </Badge>
                    </td>
                    <td>
                      {user.scope === "own"
                        ? "Own registrations"
                        : user.scope === "faculty"
                          ? "Faculty registrations"
                          : "All registrations"}
                    </td>
                    <td>
                      <Badge tone={user.active !== false ? "green" : "neutral"}>
                        {user.active !== false ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="align-right">
                      <button className="table-edit" onClick={() => edit(user)}>
                        <Icon name="edit" size={16} /> Edit access
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No users to display"
            description="Provisioned workspace accounts appear here."
            icon="users"
          />
        )}
      </section>
      <div className="inline-information">
        <Icon name="shield" size={18} />
        <span>
          Page and action permissions are configured under Pages & access.
          Record visibility is assigned separately.
        </span>
      </div>
      {selected && (
        <Modal
          title="Edit user access"
          subtitle={`${selected.name} · ${selected.email}`}
          onClose={() => setSelected(null)}
        >
          <form onSubmit={save}>
            <div className="modal-body fields-grid">
              <Field label="User level *">
                <select
                  required
                  value={form.level_id}
                  onChange={(e) =>
                    setForm({ ...form, level_id: e.target.value })
                  }
                >
                  <option value="" disabled>
                    Select a level
                  </option>
                  {data.levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </Field>
              {form.scope === "faculty" && (
                <Field label="Faculty code">
                  <input
                    required
                    value={form.faculty_code}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        faculty_code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g. FTMK"
                  />
                </Field>
              )}
              <Field label="Student record visibility">
                <select
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                >
                  <option value="own">Own registrations</option>
                  <option value="faculty">Faculty registrations</option>
                  <option value="all">All registrations</option>
                </select>
              </Field>
              <label className="checkbox-label field-wide">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                />
                <span>Account is active</span>
              </label>
              <div className="notice field-wide">
                <Icon name="shield" size={17} />
                The last active administrator cannot be removed or downgraded.
              </div>
            </div>
            <div className="modal-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelected(null)}
              >
                Cancel
              </Button>
              <Button type="submit" icon="check" busy={busy}>
                Save user access
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function AuditLog({ data }: Shared) {
  const [query, setQuery] = useState("");
  const filtered = (data.audit || []).filter((a) =>
    `${a.actor_name} ${a.actor_email} ${a.action} ${a.entity_type} ${a.summary}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow="WORKSPACE ACTIVITY"
        title="Audit history"
        description="A record of important changes, who made them and when they happened."
      />
      <section className="panel">
        <div className="table-toolbar">
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              aria-label="Search audit history"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search action, user or record type…"
            />
          </div>
          <Badge tone="neutral">{filtered.length} events</Badge>
        </div>
        {filtered.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Changed by</th>
                  <th>Record type</th>
                  <th>Date & time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <div className="audit-action">
                        <span>
                          <Icon
                            name={
                              event.action.includes("letter")
                                ? "file"
                                : event.action.includes("catalogue")
                                  ? "catalogue"
                                  : "audit"
                            }
                            size={18}
                          />
                        </span>
                        <div>
                          <strong>{words(event.action)}</strong>
                          {event.summary && <small>{event.summary}</small>}
                        </div>
                      </div>
                    </td>
                    <td>{event.actor_name || event.actor_email || "System"}</td>
                    <td>
                      <Badge tone="neutral">
                        {words(event.entity_type || "workspace")}
                      </Badge>
                    </td>
                    <td className="date-cell">
                      {date(event.created_at, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No activity to show"
            description={
              query
                ? "Try another user, record type or action."
                : "Registrations, catalogue changes and access updates will be recorded here."
            }
            icon="audit"
          />
        )}
      </section>
    </>
  );
}

function Settings({ data, notify, reload, can }: Shared) {
  const [form, setForm] = useState<LetterSettings>(
    data.settings || {
      intake: "",
      templateVersion: "sps-conditional-v1",
      admissionUrl: "https://portal.utem.edu.my/admission/default",
      signatory: { name: "", title: "" },
    },
  );
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await request("/api/settings", "PATCH", form);
      await reload();
      notify("Letter settings saved. Previously issued letters are unchanged.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Unable to save settings.", true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="LETTER ADMINISTRATION"
        title="Letter settings"
        description="Defaults for newly issued conditional offers. Historical letters keep their original values."
      />
      <form className="panel form-panel" onSubmit={save}>
        <div className="modal-body fields-grid">
          <Field label="Intake / session">
            <input
              value={form.intake}
              onChange={(e) => setForm({ ...form, intake: e.target.value })}
              placeholder="e.g. 2026/2027"
            />
          </Field>
          <Field label="Template">
            <select
              value={form.templateVersion}
              onChange={(e) =>
                setForm({ ...form, templateVersion: e.target.value })
              }
            >
              <option value="sps-conditional-v1">
                General conditional offer (Malay / English)
              </option>
              <option value="ftmk-conditional-v1">
                FTMK Master conditional offer
              </option>
            </select>
          </Field>
          <Field label="Signatory name" wide>
            <input
              required
              value={form.signatory.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  signatory: { ...form.signatory, name: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Signatory title" wide>
            <textarea
              required
              value={form.signatory.title}
              onChange={(e) =>
                setForm({
                  ...form,
                  signatory: { ...form.signatory, title: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Admissions portal URL" wide>
            <input
              type="url"
              required
              value={form.admissionUrl}
              onChange={(e) =>
                setForm({ ...form, admissionUrl: e.target.value })
              }
            />
          </Field>
          <label className="checkbox-label field-wide">
            <input
              type="checkbox"
              checked={form.signatory.signatureAsset === "sps-v1"}
              onChange={(e) =>
                setForm({
                  ...form,
                  signatory: {
                    ...form.signatory,
                    signatureAsset: e.target.checked ? "sps-v1" : undefined,
                  },
                })
              }
            />
            <span>Use the supplied signature image for this signatory</span>
          </label>
          <div className="notice field-wide">
            <Icon name="info" size={18} />
            Review the supplied wording, eligibility conditions and signatory
            before operational use. Changing these settings affects new letters
            only.
          </div>
        </div>
        <div className="modal-actions">
          <Button
            type="submit"
            busy={busy}
            disabled={!can("manage")}
            icon="check"
          >
            Save letter settings
          </Button>
        </div>
      </form>
    </>
  );
}

function AccessProvision({ data, notify, reload }: Shared) {
  const [mode, setMode] = useState<"user" | "level" | null>(null);
  const [busy, setBusy] = useState(false);
  const [person, setPerson] = useState({
    name: "",
    email: "",
    password: "",
    level_id: "agent",
  });
  const [level, setLevel] = useState({ id: "", name: "", scope: "own" });
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await request(
        mode === "user" ? "/api/users" : "/api/levels",
        "POST",
        mode === "user" ? person : level,
      );
      await reload();
      notify(
        mode === "user"
          ? "User created. Share their initial password privately."
          : "User level created. Assign page permissions under Pages & permissions.",
      );
      setMode(null);
      setPerson({ name: "", email: "", password: "", level_id: "agent" });
      setLevel({ id: "", name: "", scope: "own" });
    } catch (e) {
      notify(e instanceof Error ? e.message : "Unable to create record.", true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="heading-actions" style={{ marginBottom: 24 }}>
        <Button icon="plus" onClick={() => setMode("user")}>
          Add user
        </Button>
        <Button
          variant="secondary"
          icon="shield"
          onClick={() => setMode("level")}
        >
          Add user level
        </Button>
      </div>
      {mode && (
        <Modal
          title={
            mode === "user" ? "Create workspace user" : "Create user level"
          }
          onClose={() => setMode(null)}
        >
          <form onSubmit={save}>
            <div className="modal-body fields-grid">
              {mode === "user" ? (
                <>
                  <Field label="Full name">
                    <input
                      required
                      value={person.name}
                      onChange={(e) =>
                        setPerson({ ...person, name: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      required
                      type="email"
                      value={person.email}
                      onChange={(e) =>
                        setPerson({ ...person, email: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Initial password">
                    <input
                      required
                      type="password"
                      minLength={12}
                      autoComplete="new-password"
                      value={person.password}
                      onChange={(e) =>
                        setPerson({ ...person, password: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="User level">
                    <select
                      value={person.level_id}
                      onChange={(e) =>
                        setPerson({ ...person, level_id: e.target.value })
                      }
                    >
                      {data.levels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Level key">
                    <input
                      required
                      pattern="[a-z][a-z0-9_-]{1,30}"
                      placeholder="e.g. faculty_staff"
                      value={level.id}
                      onChange={(e) =>
                        setLevel({ ...level, id: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Display name">
                    <input
                      required
                      value={level.name}
                      onChange={(e) =>
                        setLevel({ ...level, name: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Default record visibility">
                    <select
                      value={level.scope}
                      onChange={(e) =>
                        setLevel({ ...level, scope: e.target.value })
                      }
                    >
                      <option value="own">Own registrations</option>
                      <option value="faculty">Faculty registrations</option>
                      <option value="all">All registrations</option>
                    </select>
                  </Field>
                </>
              )}
            </div>
            <div className="modal-actions">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setMode(null)}
              >
                Cancel
              </Button>
              <Button type="submit" busy={busy}>
                Create {mode}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
