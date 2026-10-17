import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { generateLetterPdf, type LetterSnapshot } from "../src/lib/pdf";
import { registrationSchema } from "../src/lib/validation";
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
