import type { CSSProperties } from "react";

export function Icon({
  name,
  size = 20,
  className,
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const paths: Record<string, React.ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    register: (
      <>
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6M8 15h8M12 11v8" />
      </>
    ),
    records: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    catalogue: (
      <>
        <path d="m12 3 10 5-10 5L2 8zM5 10v7c4 3 10 3 14 0v-7M22 8v7" />
      </>
    ),
    pages: (
      <>
        <path d="M9 4h11M9 12h11M9 20h11" />
        <rect x="3" y="3" width="2" height="2" rx=".5" />
        <rect x="3" y="11" width="2" height="2" rx=".5" />
        <rect x="3" y="19" width="2" height="2" rx=".5" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        <circle cx="9" cy="7" r="4" />
      </>
    ),
    audit: (
      <>
        <path d="M12 8v4l3 2M3 12a9 9 0 1 0 2.6-6.4M3 3v6h6" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14m-5-5 5 5-5 5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4.5 4.5" />
      </>
    ),
    down: <path d="m6 9 6 6 6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    edit: (
      <>
        <path d="m15 5 4 4M3 21l5-1 12-12a2.8 2.8 0 0 0-4-4L4 16z" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </>
    ),
    shield: (
      <>
        <path d="m12 3 9 4v6c0 5-9 9-9 9s-9-4-9-9V7z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    refresh: (
      <>
        <path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7h.01" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    archive: (
      <>
        <rect x="3" y="3" width="18" height="5" rx="1" />
        <path d="M5 8v13h14V8M10 12h4" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 6 9 7 9-7" />
      </>
    ),
  };
  const aliases: Record<string, string> = {
    dashboard: "overview",
    registration: "register",
    students: "records",
    graduation: "catalogue",
    book: "catalogue",
    "graduation-cap": "catalogue",
    layout: "pages",
    settings: "pages",
    "layout-dashboard": "overview",
    "user-plus": "register",
    "file-text": "file",
    history: "audit",
    "list-ordered": "pages",
    "shield-check": "shield",
    activity: "audit",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {paths[
        aliases[name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()] ||
          name.toLowerCase()
      ] || paths.file}
    </svg>
  );
}
