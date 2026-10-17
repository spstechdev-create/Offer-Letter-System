import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { generateLetterPdf, type LetterSnapshot } from "../src/lib/pdf";
import { registrationSchema } from "../src/lib/validation";
import { facultySchema, facultyPatch } from "../src/lib/faculty-validation";
import { allowsFtmkMasterTemplate } from "../src/lib/template-eligibility";
test("Master template applicability follows identity and excludes Malay doctorates", () => {
  assert.equal(
    allowsFtmkMasterTemplate(
      "stable-ftmk-id",
      "Sarjana Sains Komputer",
      "stable-ftmk-id",
    ),
    true,
  );
  assert.equal(
    allowsFtmkMasterTemplate(
      "stable-ftmk-id",
      "Master of Computer Science",
      "stable-ftmk-id",
    ),
    true,
  );
  assert.equal(
    allowsFtmkMasterTemplate(
      "other-faculty-id",
      "Master of Computer Science",
      "stable-ftmk-id",
    ),
    false,
  );
  assert.equal(
    allowsFtmkMasterTemplate(
      "stable-ftmk-id",
      "Doktor Teknologi Maklumat",
      "stable-ftmk-id",
    ),
    false,
  );
  assert.equal(
    allowsFtmkMasterTemplate(
      "stable-ftmk-id",
      "Doctor of Philosophy",
      "stable-ftmk-id",
    ),
    false,
  );
});
const snapshot: LetterSnapshot = {
  reference: "QA-IMMUTABLE",
  issuedAt: "2026-10-17T02:00:00Z",
  student: {
    name: "QA Student Example",
    identity: "QA000000",
    address: "Test address, Melaka",
    email: "qa@example.invalid",
    phone: "00000000",
    category: "local",
  },
  programme: {
    name: "Original Programme",
    faculty: "FTMK",
    fee: 18000,
    duration: "2 years",
    attendance: "Full time",
    structure: "Research",
  },
  language: "ms",
  templateVersion: "sps-conditional-v1",
  brandingVersion: "sps-v1",
  signatory: { name: "Example Signatory", title: "Example Dean" },
};
test("PDF renders saved content without querying a catalogue or persisting a file", async () => {
  const original = structuredClone(snapshot);
  const data = await generateLetterPdf(original);
  assert.equal(Buffer.from(data).subarray(0, 4).toString(), "%PDF");
  assert.ok((await PDFDocument.load(data)).getPageCount() >= 1);
  assert.deepEqual(original, snapshot);
});
test("unknown historical template fails instead of substituting current wording", async () => {
  await assert.rejects(
    generateLetterPdf({ ...snapshot, templateVersion: "unknown-v999" }),
    /Unsupported saved letter template/,
  );
});
test("registration normalizes document IDs and rejects forged category", () => {
  const data = {
    name: "QA Student",
    documentType: "ic",
    documentNumber: "qa-123 456",
    email: "qa@example.invalid",
    phone: "00000",
    address: "QA address",
    category: "local",
    offeringId: "FTMK-L-001",
    idempotencyKey: crypto.randomUUID(),
  };
  assert.equal(registrationSchema.parse(data).documentNumber, "QA123456");
  assert.equal(
    registrationSchema.safeParse({ ...data, category: "admin" }).success,
    false,
  );
});
test("faculty edits preserve explicit values and reject unsafe website schemes", () => {
  const faculty = {
    code: " ftmk ",
    name_ms: "Fakulti Teknologi Maklumat dan Komunikasi",
    name_en: "Faculty of Information and Communication Technology",
    kind: "faculty",
    website: "https://ftmk.utem.edu.my/",
    is_active: true,
  };
  assert.equal(facultySchema.parse(faculty).code, "FTMK");
  assert.equal(
    facultySchema.safeParse({ ...faculty, website: "javascript:alert(1)" })
      .success,
    false,
  );
  assert.deepEqual(facultyPatch.parse({ is_active: false }), {
    is_active: false,
  });
  assert.equal(facultyPatch.safeParse({}).success, false);
});
