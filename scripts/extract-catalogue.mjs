/** Rebuild non-personal programme seed data from the supplied legacy sources. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(root, "..");
const sql = await readFile(
  path.join(source, "studentregistration/studentregistration1.sql"),
  "utf8",
);
const html = await readFile(
  path.join(source, "coding sistem surat tawaran.html"),
  "utf8",
);

function rows(table) {
  const escaped = table.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const insert = sql.match(
    new RegExp("INSERT INTO `" + escaped + "`[^;]+;", "s"),
  )?.[0];
  if (!insert) throw new Error(`Missing source table ${table}`);
  return [
    ...insert.matchAll(/\((\d+),\s*((?:'(?:[^'\\]|\\.|'')*'|[^)])*)\)/g),
  ].map((match) => {
    const values = [Number(match[1])];
    for (const token of match[2].matchAll(
      /'((?:[^'\\]|\\.|'')*)'|(-?\d+(?:\.\d+)?)|\bNULL\b/g,
    )) {
      values.push(
        token[1] !== undefined
          ? token[1].replace(/''/g, "'").replace(/\\'/g, "'")
          : token[2] !== undefined
            ? Number(token[2])
            : null,
      );
    }
    return values;
  });
}

const faculties = rows("faculties").map(([id, nameEn, nameMs]) => ({
  id,
  code: nameEn.match(/\(([^)]+)\)$/)[1],
  nameEn,
  nameMs,
}));
const htmlLiteral = html.match(
  /const programDetails\s*=\s*([\s\S]*?);\s*function updateTable/,
)[1];
// Only the isolated object literal is evaluated. No browser code or SQL is run.
const htmlCatalogue = vm.runInNewContext(
  `(${htmlLiteral})`,
  Object.create(null),
  { timeout: 500 },
);
const htmlRows = Object.entries(htmlCatalogue).flatMap(([faculty, groups]) =>
  Object.entries(groups).flatMap(([group, programmes]) =>
    programmes.map((p) => ({ faculty, group, ...p })),
  ),
);
const normalize = (name) =>
  String(name)
    .toLowerCase()
    .replace(/mqa\//g, "")
    .replace(/electronics/g, "electronic")
    .replace(/systems/g, "system")
    .replace(/[^a-z0-9]/g, "");
const structures = { R: "Research", M: "Mixed Mode", T: "Course Work" };
const locals = rows("local_programs");
const internationals = rows("international_programs");
const programmes = [];
const conflicts = [];

for (const [category, records] of [
  ["local", locals],
  ["international", internationals],
]) {
  for (const [
    id,
    facultyId,
    sourceName,
    structure,
    fee,
    duration,
    attendance,
  ] of records) {
    const faculty = faculties.find((f) => f.id === facultyId);
    const oppositeId =
      category === "local"
        ? id <= 14
          ? id
          : id >= 19
            ? id - 4
            : null
        : id <= 14
          ? id
          : id + 4;
    const opposite = (category === "local" ? internationals : locals).find(
      (r) => r[0] === oppositeId && r[1] === facultyId,
    );
    const nameEn =
      category === "international"
        ? sourceName
        : (opposite?.[2] ??
          (id >= 15 && id <= 18 ? "Doctor of Engineering" : undefined));
    const nameMs = category === "local" ? sourceName : opposite?.[2];
    const name = category === "local" ? nameMs : nameEn;
    const code = `${faculty.code}-${category === "local" ? "L" : "I"}-${String(id).padStart(3, "0")}`;
    const issues = [];
    const found = htmlRows.find(
      (r) =>
        r.faculty === faculty.code &&
        normalize(r.Postgraduate_Program) === normalize(nameEn),
    );
    const modeKey = /part|separuh/i.test(attendance)
      ? "part_time"
      : "full_time";
    if (found) {
      const htmlFee =
        typeof found.fees[category] === "object"
          ? found.fees[category][modeKey]
          : found.fees[category];
      if (typeof htmlFee === "number" && htmlFee !== fee)
        issues.push(`Fee conflict: SQL RM${fee}; HTML RM${htmlFee}.`);
      const htmlDuration = found.duration[modeKey];
      if (
        htmlDuration &&
        htmlDuration !== "-" &&
        htmlDuration !== duration.replace(/ (years|tahun)$/i, "")
      )
        issues.push(
          `Duration conflict: SQL ${duration}; HTML ${htmlDuration} years.`,
        );
      const canonicalStructure =
        category === "local"
          ? ({
              Penyelidikan: "Research",
              "Mod Campuran": "Mixed Mode",
              "Kerja Kursus": "Course Work",
            }[structure] ?? structure)
          : structure;
      if (
        structures[found.mode] &&
        structures[found.mode] !== canonicalStructure
      )
        issues.push(
          `Structure conflict: SQL ${canonicalStructure}; HTML ${structures[found.mode]}.`,
        );
    }
    // Both sources disagree about the translated Electrical/Electronic title.
    if (
      faculty.code === "FTKEK" &&
      /Science in Electronic/.test(nameEn) &&
      /Kejuruteraan Elektrik$/.test(nameMs ?? "")
    )
      issues.push(
        "Bilingual title conflict: Malay SQL says Electrical Engineering; English SQL/HTML says Electronic Engineering.",
      );
    if (issues.length) conflicts.push({ code, name, issues });
    programmes.push({
      code,
      facultyCode: faculty.code,
      facultyNameMs: faculty.nameMs,
      facultyNameEn: faculty.nameEn,
      name,
      nameMs,
      nameEn,
      category,
      attendance,
      structure,
      duration,
      fee,
      active: issues.length === 0,
      source: `studentregistration/studentregistration1.sql:${category}_programs:${id}${found ? "; compared with coding sistem surat tawaran.html" : ""}`,
      issues,
    });
  }
}

// FAIX is only in the HTML. Its mode label conflicts with the ODL rejection in
// updateTable(), and its translated title/faculty names have not been supplied.
for (const row of htmlRows.filter((r) => r.faculty === "FAIX")) {
  for (const category of ["local", "international"])
    for (const modeKey of ["full_time", "part_time"]) {
      const code = `FAIX-${category === "local" ? "L" : "I"}-${modeKey === "full_time" ? "FT" : "PT"}`;
      const issues = [
        "HTML-only offering: faculty official names and Malay programme title need confirmation.",
        "Mode conflict: HTML labels C & ODL but explicitly rejects ODL selection.",
      ];
      programmes.push({
        code,
        facultyCode: "FAIX",
        facultyNameMs: "FAIX",
        facultyNameEn: "FAIX",
        name: row.Postgraduate_Program,
        nameEn: row.Postgraduate_Program,
        category,
        attendance: modeKey === "full_time" ? "Full-Time" : "Part-Time",
        structure: "Course Work",
        duration: `${row.duration[modeKey]} years`,
        fee: row.fees[category][modeKey],
        active: false,
        source: "coding sistem surat tawaran.html:programDetails.FAIX",
        issues,
      });
      conflicts.push({ code, name: row.Postgraduate_Program, issues });
    }
}
await mkdir(path.join(root, "data"), { recursive: true });
await writeFile(
  path.join(root, "data/programmes.json"),
  JSON.stringify(programmes, null, 2) + "\n",
);
await writeFile(
  path.join(root, "data/catalogue-audit.json"),
  JSON.stringify(
    {
      sourceDumpDate: "2025-01-02",
      faculties,
      sqlRows: locals.length + internationals.length,
      htmlProgrammeDefinitions: htmlRows.length,
      totalOfferings: programmes.length,
      active: programmes.filter((p) => p.active).length,
      inactive: programmes.filter((p) => !p.active).length,
      conflicts,
      excluded: [
        "All legacy students, staff identities, passwords, generated letters and personal data.",
        "ODL/Open Access placeholders without concrete approved duration and offering rules.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    total: programmes.length,
    active: programmes.filter((p) => p.active).length,
    inactive: programmes.filter((p) => !p.active).length,
    conflicts: conflicts.length,
  }),
);
