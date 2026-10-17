import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
const origin = "http://localhost:3000",
  sql = neon(process.env.DATABASE_URL);
const login = await fetch(origin + "/api/auth/sign-in/email", {
  method: "POST",
  headers: { origin, "content-type": "application/json" },
  body: JSON.stringify({
    email: process.env.SPS_USER_EMAIL,
    password: process.env.SPS_BOOTSTRAP_PASSWORD,
  }),
});
assert.equal(login.status, 200);
const cookie = login.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");
async function call(path, method = "GET", body) {
  return fetch(origin + path, {
    method,
    headers: { cookie, origin, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const bootstrap = await (await call("/api/bootstrap")).json();
const actor = bootstrap.user;
assert.ok(bootstrap.faculties.length >= 9);
assert.ok(bootstrap.faculties.some((f) => f.code === "ITK"));
assert.ok(bootstrap.faculties.some((f) => f.code === "IPTK"));
const [fixture] =
  await sql`SELECT l.id AS letter_id,l.snapshot,a.faculty_id,a.created_by FROM issued_letters l JOIN applications a ON a.id=l.application_id JOIN students s ON s.id=a.student_id WHERE s.name LIKE 'QA TEST %' LIMIT 1`;
assert.ok(fixture, "Run a workflow smoke check first.");
const faculty = bootstrap.faculties.find((f) => f.id === fixture.faculty_id);
const restore = {
  code: faculty.code,
  name_ms: faculty.name_ms,
  name_en: faculty.name_en,
  website: faculty.website,
  source_url: faculty.source_url,
  notes: faculty.notes,
  kind: faculty.kind,
  is_active: faculty.is_active,
};
let createdStudentId;
const owner = "qa-faculty-owner-" + randomUUID();
let ownerCreated = false;
async function pdfHash() {
  const reply = await call("/api/letters/" + fixture.letter_id);
  assert.equal(reply.status, 200);
  return createHash("sha256")
    .update(new Uint8Array(await reply.arrayBuffer()))
    .digest("hex");
}
const oldHash = await pdfHash();
try {
  const update = await call("/api/faculties/" + faculty.id, "PATCH", {
    code: faculty.code + "QA",
    name_ms: faculty.name_ms + " QA",
    name_en: faculty.name_en + " QA",
  });
  assert.equal(update.status, 200);
  const changed = await (await call("/api/bootstrap")).json();
  const offering = changed.catalogue.find(
    (o) =>
      o.faculty_id === faculty.id &&
      o.category === "local" &&
      o.is_active &&
      !o.needs_review,
  );
  assert.ok(offering);
  assert.equal(offering.faculty, faculty.code + "QA");
  assert.equal(offering.faculty_name_ms, faculty.name_ms + " QA");
  assert.equal(await pdfHash(), oldHash);
  const input = {
    name: "QA TEST FACULTY LIFECYCLE — ARCHIVE",
    documentType: "ic",
    documentNumber: "QAF" + randomUUID().slice(0, 10),
    email: "qa@example.invalid",
    phone: "00000000",
    address: "QA test address",
    category: "local",
    offeringId: offering.id,
    idempotencyKey: randomUUID(),
  };
  const issued = await call("/api/register", "POST", input);
  assert.equal(issued.status, 201);
  const info = await issued.json();
  const [newLetter] =
    await sql`SELECT l.snapshot,a.student_id FROM issued_letters l JOIN applications a ON a.id=l.application_id WHERE l.id=${info.letter_id}::uuid`;
  createdStudentId = newLetter.student_id;
  assert.equal(newLetter.snapshot.programme.faculty, faculty.name_ms + " QA");
  assert.equal(
    (await call("/api/faculties/" + faculty.id, "PATCH", { is_active: false }))
      .status,
    200,
  );
  const blocked = await call("/api/register", "POST", {
    ...input,
    documentNumber: "QAB" + randomUUID().slice(0, 10),
    idempotencyKey: randomUUID(),
  });
  assert.equal(blocked.status, 400);
  assert.equal(await pdfHash(), oldHash);
  await sql`INSERT INTO app_users(id,name,email,level_id,scope) VALUES(${owner},'QA faculty owner',${owner + "@example.invalid"},'agent','own')`;
  ownerCreated = true;
  const [application] =
    await sql`SELECT application_id FROM issued_letters WHERE id=${fixture.letter_id}::uuid`;
  await sql`UPDATE applications SET created_by=${owner} WHERE id=${application.application_id}::uuid`;
  await sql`UPDATE app_users SET scope='faculty',faculty_id=${faculty.id}::uuid WHERE id=${actor.id}`;
  const scoped = await (await call("/api/bootstrap")).json();
  assert.ok(
    scoped.applications.some(
      (a) => a.faculty_id === faculty.id && a.created_by === owner,
    ),
  );
  assert.equal(await pdfHash(), oldHash);
  assert.ok(
    scoped.applications.every(
      (a) => a.faculty_id === faculty.id || a.created_by === actor.id,
    ),
  );
  console.log(
    "PASS stable faculty links through rename/code change, new letters use updated names, retirement blocks registrations, historical PDFs and faculty access remain intact",
  );
  await sql`UPDATE app_users SET level_id='agent',scope='own' WHERE id=${actor.id}`;
  assert.equal(
    (await call("/api/faculties/" + faculty.id, "PATCH", { is_active: true }))
      .status,
    403,
  );
  console.log("PASS agent cannot manage faculties through direct API");
} finally {
  await sql`UPDATE app_users SET level_id=${actor.level_id},scope=${actor.scope},faculty_id=${actor.faculty_id}::uuid WHERE id=${actor.id}`;
  if (ownerCreated) {
    await sql`UPDATE applications SET created_by=${fixture.created_by} WHERE created_by=${owner}`;
    await sql`DELETE FROM app_users WHERE id=${owner}`;
  }
  const restored = await call("/api/faculties/" + faculty.id, "PATCH", restore);
  assert.equal(restored.status, 200);
  if (createdStudentId)
    assert.equal(
      (
        await call("/api/students/" + createdStudentId, "PATCH", {
          archived: true,
        })
      ).status,
      200,
    );
  await call("/api/auth/sign-out", "POST", {});
}
