import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  PageSizes,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

/** Only saved, immutable values belong here. Never load a live catalogue row. */
export interface LetterSnapshot {
  reference: string;
  issuedAt: string;
  student: {
    name: string;
    identity: string;
    address: string | string[];
    email: string;
    phone: string;
    category: string;
  };
  programme: {
    name: string;
    faculty: string;
    fee: number | string;
    duration: string;
    attendance: string;
    structure: string;
    code?: string;
  };
  language: "ms" | "en";
  templateVersion: string;
  template?: "standard" | "ftmk";
  brandingVersion?: "sps-v1";
  intake?: string;
  admissionUrl?: string;
  signatory: { name: string; title: string; signatureAsset?: "sps-v1" };
  conditions?: string[];
  ftmkContacts?: string;
}

export const DEFAULT_SIGNATORY = {
  name: "PROFESOR DR. MOHD RIZAL BIN SALLEH",
  title: "Dekan\nSekolah Pengajian Siswazah",
  signatureAsset: "sps-v1" as const,
};
export const LETTER_TEMPLATE_VERSIONS = [
  "sps-conditional-v1",
  "ftmk-conditional-v1",
] as const;
export class LetterTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LetterTextError";
  }
}

/** These versioned texts must remain unchanged after letters are issued. Add v2. */
export function createLetterSnapshotContent(
  language: "ms" | "en",
  template: "standard" | "ftmk" = "standard",
) {
  if (template === "ftmk")
    return language === "ms"
      ? {
          heading:
            "TAWARAN BERSYARAT BAGI MENGIKUTI PROGRAM PASCASISWAZAH DI FAKULTI TEKNOLOGI MAKLUMAT DAN KOMUNIKASI (FTMK), UNIVERSITI TEKNIKAL MALAYSIA MELAKA",
          introduction:
            "Dengan segala hormatnya perkara di atas adalah dirujuk.\n\n2. Sukacitanya tuan/puan ditawarkan untuk mengikuti program pengajian pascasiswazah secara bersyarat di Fakulti Teknologi Maklumat dan Komunikasi (FTMK), UTeM, seperti berikut:",
          conditions: [
            "Lulus Ijazah Sarjana Muda Sains Komputer/Teknologi Maklumat (Kepujian) sekurang-kurangnya dengan PNGK 2.75 bagi program Sarjana Kerja Kursus dan PNGK 3.00 bagi program Sarjana Penyelidikan.",
            "Calon perlu membuat permohonan kemasukan secara dalam talian. Surat tawaran penuh akan dikeluarkan setelah mendapat kelulusan.",
          ],
          closing: "Sekian, terima kasih.\nSaya yang menjalankan amanah.",
        }
      : {
          heading:
            "CONDITIONAL OFFER TO PURSUE POSTGRADUATE STUDIES AT THE FACULTY OF INFORMATION AND COMMUNICATION TECHNOLOGY (FTMK), UNIVERSITI TEKNIKAL MALAYSIA MELAKA",
          introduction:
            "The above matter is referred.\n\n2. We are pleased to offer you conditional admission to the following postgraduate programme at the Faculty of Information and Communication Technology (FTMK), UTeM:",
          conditions: [
            "Hold a Bachelor of Computer Science/Information Technology (Honours) with a minimum CGPA of 2.75 for a Master by Coursework or 3.00 for a Master by Research.",
            "Apply for admission online. A full offer letter will be issued after the application is approved.",
          ],
          closing: "Thank you.\nYours faithfully,",
        };
  return language === "ms"
    ? {
        heading:
          "TAWARAN BERSYARAT BAGI MENGIKUTI PROGRAM PENGAJIAN PASCASISWAZAH DI UNIVERSITI TEKNIKAL MALAYSIA MELAKA",
        introduction:
          "Dengan hormatnya perkara di atas adalah dirujuk.\n\n2. Sukacita dimaklumkan bahawa tuan/puan ditawarkan mengikuti Program Pengajian Pascasiswazah di Universiti Teknikal Malaysia Melaka (UTeM) untuk program seperti berikut:",
        conditions: [
          "Sekiranya tuan/puan bersetuju dengan tawaran ini, tuan/puan diminta melengkapkan permohonan sebagai pelajar baharu secara dalam talian.",
          "Tempoh sah laku surat tawaran ini adalah 1 (satu) tahun daripada tarikh surat dikeluarkan. Pihak Universiti berhak membuat pindaan ke atas terma dan syarat yang ditetapkan dari masa ke semasa sekiranya perlu.",
        ],
        closing: "Sekian, terima kasih.",
      }
    : {
        heading:
          "CONDITIONAL OFFER TO PURSUE POSTGRADUATE STUDIES AT UNIVERSITI TEKNIKAL MALAYSIA MELAKA",
        introduction:
          "The above matter is referred.\n\n2. We are pleased to offer you admission to the following Postgraduate Studies Programme at Universiti Teknikal Malaysia Melaka (UTeM):",
        conditions: [
          "If you agree to this offer, please complete the application as a new student online.",
          "This offer letter is valid for 1 (one) year from its date of issue. The University reserves the right to amend the terms and conditions from time to time, if necessary.",
        ],
        closing: "Thank you.",
      };
}

const clean = (value: unknown) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[\u2010-\u2015]/g, "-");
const assetDirectory = () =>
  path.join(process.cwd(), "public", "branding", "v1");
const dateLabel = (value: string, language: "ms" | "en") => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf()))
    throw new Error("Letter issue date is invalid.");
  return new Intl.DateTimeFormat(language === "ms" ? "ms-MY" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(date);
};

/** Generates bytes in memory. It never writes or uploads a PDF. */
export async function generateLetterPdf(
  snapshot: LetterSnapshot,
): Promise<Uint8Array> {
  if (
    !LETTER_TEMPLATE_VERSIONS.includes(
      snapshot.templateVersion as (typeof LETTER_TEMPLATE_VERSIONS)[number],
    )
  )
    throw new Error(
      `Unsupported saved letter template: ${snapshot.templateVersion}`,
    );
  if (snapshot.brandingVersion && snapshot.brandingVersion !== "sps-v1")
    throw new Error("Unsupported saved letter branding.");
  const template =
    snapshot.templateVersion === "ftmk-conditional-v1" ? "ftmk" : "standard";
  if (snapshot.template && snapshot.template !== template)
    throw new Error("Letter template and version do not match.");
  if (!snapshot.reference || !snapshot.student.name || !snapshot.signatory.name)
    throw new Error("Saved letter details are incomplete.");
  const fee = Number(snapshot.programme.fee);
  if (!Number.isFinite(fee) || fee < 0)
    throw new Error("Saved programme fee is invalid.");
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const asset = assetDirectory();
  const [regularBytes, boldBytes, headerBytes, footerBytes, signatureBytes] =
    await Promise.all([
      readFile(path.join(asset, "fonts/NotoSans-Regular.ttf")),
      readFile(path.join(asset, "fonts/NotoSans-Bold.ttf")),
      readFile(path.join(asset, "utem-header.png")),
      readFile(path.join(asset, "footer-banner.png")),
      snapshot.signatory.signatureAsset === "sps-v1"
        ? readFile(
            path.join(process.cwd(), "server-assets/branding/v1/signature.jpg"),
          )
        : Promise.resolve(null),
    ]);
  const [regular, bold, header, footer] = await Promise.all([
    doc.embedFont(regularBytes, { subset: true }),
    doc.embedFont(boldBytes, { subset: true }),
    doc.embedPng(headerBytes),
    doc.embedPng(footerBytes),
  ]);
  const signature = signatureBytes ? await doc.embedJpg(signatureBytes) : null;
  const supported = new Set(regular.getCharacterSet());
  const safe = (value: unknown) => {
    const text = clean(value);
    for (const char of text) {
      if (
        char !== "\n" &&
        char !== "\r" &&
        char !== "\t" &&
        !supported.has(char.codePointAt(0)!)
      )
        throw new LetterTextError(
          `The PDF font does not support character ${char}. Use the student's passport spelling in Latin characters.`,
        );
    }
    return text;
  };
  doc.setTitle(`${snapshot.reference} - Conditional offer`);
  doc.setAuthor("School of Graduate Studies, UTeM");
  doc.setSubject(
    `${snapshot.templateVersion}; immutable registration snapshot`,
  );
  doc.setCreationDate(new Date(snapshot.issuedAt));
  doc.setModificationDate(new Date(snapshot.issuedAt));
  const [width, height] = PageSizes.A4;
  const margin = 46;
  const bodyWidth = width - margin * 2;
  const colour = rgb(0.08, 0.12, 0.2);
  const muted = rgb(0.36, 0.4, 0.46);
  const blue = rgb(0.09, 0.21, 0.43);
  let page: PDFPage;
  let y = 0;
  const pages: PDFPage[] = [];
  function drawImage(
    image: PDFImage,
    x: number,
    top: number,
    maxWidth: number,
    maxHeight: number,
  ) {
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    const w = image.width * scale,
      h = image.height * scale;
    page.drawImage(image, { x, y: top - h, width: w, height: h });
    return h;
  }
  function addPage() {
    page = doc.addPage(PageSizes.A4);
    pages.push(page);
    drawImage(header, 24, height - 12, width - 48, 115);
    page.drawLine({
      start: { x: margin, y: height - 126 },
      end: { x: width - margin, y: height - 126 },
      color: rgb(0.82, 0.86, 0.91),
      thickness: 0.6,
    });
    const footerScale = Math.min(bodyWidth / footer.width, 28 / footer.height);
    drawImage(
      footer,
      (width - footer.width * footerScale) / 2,
      47,
      bodyWidth,
      28,
    );
    y = height - 145;
  }
  function ensure(space: number) {
    if (y - space < 66) addPage();
  }
  function lines(
    text: string,
    font: PDFFont,
    size: number,
    maxWidth: number,
  ): string[] {
    const output: string[] = [];
    for (const paragraph of safe(text).split(/\r?\n/)) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          line = candidate;
          continue;
        }
        if (line) output.push(line);
        line = "";
        for (const char of word) {
          if (font.widthOfTextAtSize(line + char, size) > maxWidth && line) {
            output.push(line);
            line = "";
          }
          line += char;
        }
      }
      output.push(line);
    }
    return output;
  }
  function text(
    value: string,
    options: {
      font?: PDFFont;
      size?: number;
      leading?: number;
      x?: number;
      maxWidth?: number;
      gap?: number;
      color?: ReturnType<typeof rgb>;
    } = {},
  ) {
    const font = options.font ?? regular;
    const size = options.size ?? 9.35;
    const leading = options.leading ?? 13.1;
    for (const line of lines(
      value,
      font,
      size,
      options.maxWidth ?? bodyWidth,
    )) {
      ensure(leading);
      page.drawText(line, {
        x: options.x ?? margin,
        y,
        font,
        size,
        color: options.color ?? colour,
      });
      y -= leading;
    }
    y -= options.gap ?? 0;
  }
  function row(label: string, value: string, emphasis = false) {
    const font = emphasis ? bold : regular;
    const valueLines = lines(value, font, 9.35, bodyWidth - 126);
    const needed = Math.max(20, valueLines.length * 12.8 + 7);
    ensure(needed);
    page.drawText(label, {
      x: margin + 9,
      y,
      font: regular,
      size: 9,
      color: muted,
    });
    for (const [i, line] of valueLines.entries())
      page.drawText(line, {
        x: margin + 126,
        y: y - i * 12.8,
        font,
        size: 9.35,
        color: emphasis ? blue : colour,
      });
    y -= needed;
    page.drawLine({
      start: { x: margin, y: y + 7 },
      end: { x: width - margin, y: y + 7 },
      color: rgb(0.9, 0.92, 0.95),
      thickness: 0.5,
    });
  }
  addPage();
  const ms = snapshot.language === "ms";
  const content = createLetterSnapshotContent(snapshot.language, template);
  text(
    `${ms ? "Rujukan" : "Reference"}: ${snapshot.reference}   |   ${ms ? "Tarikh" : "Date"}: ${dateLabel(snapshot.issuedAt, snapshot.language)}`,
    { size: 8.4, color: muted, gap: 9 },
  );
  text(snapshot.student.name.toUpperCase(), { font: bold, size: 10 });
  text(
    `${ms ? "No. KP / Pasport" : "IC / Passport"}: ${snapshot.student.identity}`,
    { size: 9 },
  );
  const address = Array.isArray(snapshot.student.address)
    ? snapshot.student.address.join("\n")
    : snapshot.student.address;
  if (address) text(address, { size: 9, leading: 12 });
  text(
    [snapshot.student.email, snapshot.student.phone]
      .filter(Boolean)
      .join("  |  "),
    { size: 8.5, color: muted, gap: 7 },
  );
  text(ms ? "Tuan/Puan," : "Sir/Madam,", { gap: 5 });
  text(content.heading, {
    font: bold,
    size: 10,
    leading: 13.4,
    color: blue,
    gap: 7,
  });
  text(content.introduction, { gap: 7 });
  ensure(80);
  row(ms ? "Fakulti" : "Faculty", snapshot.programme.faculty);
  row(ms ? "Program" : "Programme", snapshot.programme.name, true);
  row(ms ? "Jenis pengajian" : "Type of study", snapshot.programme.structure);
  row(
    ms ? "Bentuk pendaftaran" : "Registration type",
    snapshot.programme.attendance,
  );
  row(
    ms ? "Tempoh pengajian" : "Duration of study",
    snapshot.programme.duration,
  );
  row(
    ms ? "Yuran pengajian" : "Programme fee",
    `RM ${new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(fee)}`,
    true,
  );
  if (snapshot.intake) row(ms ? "Sesi kemasukan" : "Intake", snapshot.intake);
  y -= 4;
  const conditions = snapshot.conditions ?? content.conditions;
  for (const [i, condition] of conditions.entries())
    text(`${template === "ftmk" ? `2.${i + 1}` : `${i + 3}.`} ${condition}`, {
      gap: 5,
    });
  const url =
    snapshot.admissionUrl ??
    (template === "ftmk"
      ? "https://portal.utem.edu.my/postgraduate/"
      : "https://portal.utem.edu.my/admission/default");
  text(url, { size: 8.5, color: blue, gap: 6 });
  if (snapshot.ftmkContacts) text(snapshot.ftmkContacts, { gap: 5 });
  // Keep the signatory together. Long names, addresses and programme titles may
  // flow to an additional A4 page instead of clipping or overlapping the footer.
  const closingHeight =
    67 +
    (signature ? 31 : 12) +
    lines(snapshot.signatory.title, regular, 8.7, bodyWidth).length * 12;
  ensure(closingHeight);
  text(content.closing, { gap: 5 });
  text(
    '"MALAYSIA MADANI"\n"BERKHIDMAT UNTUK NEGARA"\n"KOMPETENSI TERAS KEGEMILANGAN"',
    { font: bold, size: 8, leading: 10.7, gap: 3 },
  );
  if (signature) {
    const imageHeight = drawImage(signature, margin, y + 2, 112, 29);
    y -= imageHeight + 4;
  } else {
    y -= 12;
  }
  text(snapshot.signatory.name, { font: bold, size: 8.7, leading: 12 });
  text(snapshot.signatory.title, { size: 8.7, leading: 12 });
  for (const [i, sheet] of pages.entries())
    sheet.drawText(
      `${safe(snapshot.reference)}  |  ${i + 1} / ${pages.length}`,
      { x: margin, y: 55, size: 7, font: regular, color: muted },
    );
  return doc.save();
}
