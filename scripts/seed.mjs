import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
const sql = neon(process.env.DATABASE_URL);
const levels = [
  ["admin", "Admin", "all"],
  ["staff", "Staff", "all"],
  ["agent", "Agent", "own"],
];
for (const [id, name, scope] of levels)
  await sql`INSERT INTO user_levels(id,name,scope) VALUES(${id},${name},${scope}) ON CONFLICT DO NOTHING`;
const pages = [
  ["overview", "Overview", "LayoutDashboard", 10],
  ["register", "New registration", "UserPlus", 20],
  ["records", "Student records", "Users", 30],
  ["catalogue", "Programme catalogue", "GraduationCap", 40],
  ["pages", "Pages & permissions", "PanelLeft", 50],
  ["users", "Users & levels", "ShieldCheck", 60],
  ["audit", "Activity log", "History", 70],
  ["settings", "Letter settings", "Settings", 80],
];
for (const [key, title, icon, order] of pages) {
  await sql`INSERT INTO pages(id,page_key,title,route,icon,urutan) VALUES(${key},${key},${title},${"/?page=" + key},${icon},${order}) ON CONFLICT DO NOTHING`;
  for (const [level] of levels) {
    let actions = [];
    if (level === "admin")
      actions = ["view", "create", "edit", "generate", "manage"];
    else if (["overview", "register", "records"].includes(key))
      actions = ["view", "create", "edit", "generate"];
    else if (key === "catalogue" && level === "staff") actions = ["view"];
    if (actions.length)
      await sql`INSERT INTO page_grants(page_id,level_id,actions) VALUES(${key},${level},${JSON.stringify(actions)}::jsonb) ON CONFLICT DO NOTHING`;
  }
}
const rows = JSON.parse(
  await readFile(new URL("../data/programmes.json", import.meta.url), "utf8"),
);
await sql`INSERT INTO catalogue(id,code,name,faculty,category,attendance,structure,duration,total_fee,is_active,needs_review,source) SELECT code,code,name,"facultyCode",category,attendance,structure,duration,fee,active,jsonb_array_length(issues)>0,to_jsonb(source) FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(code text,name text,"facultyCode" text,category text,attendance text,structure text,duration text,fee numeric,active boolean,issues jsonb,source text) ON CONFLICT DO NOTHING`;
await sql`INSERT INTO app_settings(key,value) VALUES('letter_defaults',${JSON.stringify({ templateVersion: "sps-conditional-v1", signatory: { name: "PROFESOR DR. MOHD RIZAL BIN SALLEH", title: "Dekan / Dean, Sekolah Pengajian Siswazah" }, admissionUrl: "https://portal.utem.edu.my/admission/default", intake: "", policyReviewRequired: true })}::jsonb) ON CONFLICT DO NOTHING`;
console.log(
  `Seeded ${rows.length} source offerings, page registry and explicit level grants. Existing edits preserved.`,
);
