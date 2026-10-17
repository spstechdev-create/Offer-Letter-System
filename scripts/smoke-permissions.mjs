import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL),
  origin = "http://localhost:3000";
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
async function call(path, body) {
  return fetch(origin + path, {
    method: body ? "POST" : "GET",
    headers: { cookie, origin, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const before = await (await call("/api/bootstrap")).json();
const actor = before.user;
const [fixture] =
  await sql`SELECT a.*,l.id AS letter_id,s.document_type,s.document_number,s.email,s.phone,s.address,s.category FROM applications a JOIN students s ON s.id=a.student_id JOIN issued_letters l ON l.application_id=a.id WHERE s.name LIKE 'QA TEST %' LIMIT 1`;
assert.ok(fixture, "Run the workflow smoke check first.");
const other = "qa-other-" + randomUUID(),
  level = "qa-overview-" + randomUUID().slice(0, 6);
try {
  await sql`INSERT INTO app_users(id,name,email,level_id,scope) VALUES(${other},'QA temporary inaccessible owner',${other + "@example.invalid"},'agent','own')`;
  await sql`UPDATE applications SET created_by=${other} WHERE id=${fixture.id}`;
  await sql`UPDATE app_users SET level_id='agent',scope='own',faculty_code=NULL WHERE id=${actor.id}`;
  const agent = await (await call("/api/bootstrap")).json();
  assert.ok(!agent.applications.some((a) => a.id === fixture.id));
  assert.ok(
    !agent.pages.some((p) =>
      ["users", "pages", "settings"].includes(p.page_key),
    ),
  );
  assert.equal((await call("/api/letters/" + fixture.letter_id)).status, 404);
  const denied = await call("/api/register", {
    name: "QA TEST unauthorized duplicate",
    documentType: fixture.document_type,
    documentNumber: fixture.document_number,
    email: fixture.email,
    phone: fixture.phone,
    address: fixture.address,
    category: fixture.category,
    offeringId: fixture.catalogue_id,
    idempotencyKey: randomUUID(),
  });
  assert.equal(denied.status, 409);
  const edit = await fetch(origin + "/api/catalogue/" + fixture.catalogue_id, {
    method: "PATCH",
    headers: { cookie, origin, "content-type": "application/json" },
    body: JSON.stringify({
      name: "forbidden",
      total_fee: 0,
      duration: "1 year",
      is_active: true,
    }),
  });
  assert.equal(edit.status, 403);
  console.log(
    "PASS agent record isolation, duplicate identity privacy, hidden admin pages and direct edit denial",
  );
  await sql`INSERT INTO user_levels(id,name,scope) VALUES(${level},'QA overview only','all')`;
  await sql`INSERT INTO page_grants(page_id,level_id,actions) VALUES('overview',${level},${JSON.stringify(["view"])}::jsonb)`;
  await sql`UPDATE page_grants SET actions=${JSON.stringify(["view"])}::jsonb WHERE level_id=${level}`;
  await sql`UPDATE app_users SET level_id=${level},scope='all' WHERE id=${actor.id}`;
  const overview = await (await call("/api/bootstrap")).json();
  assert.equal(overview.applications.length, 0);
  assert.equal(overview.users.length, 0);
  assert.equal(overview.catalogue.length, 0);
  assert.equal((await call("/api/letters/" + fixture.letter_id)).status, 403);
  console.log(
    "PASS overview-only page grant does not expose student records or PDFs",
  );
} finally {
  await sql`UPDATE app_users SET level_id=${actor.level_id},scope=${actor.scope},faculty_code=${actor.faculty_code} WHERE id=${actor.id}`;
  await sql`UPDATE applications SET created_by=${fixture.created_by} WHERE id=${fixture.id}`;
  await sql`DELETE FROM page_grants WHERE level_id=${level}`;
  await sql`DELETE FROM user_levels WHERE id=${level}`;
  await sql`DELETE FROM app_users WHERE id=${other}`;
  await call("/api/auth/sign-out", {});
}
