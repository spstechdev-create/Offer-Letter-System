import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL),
  origin = "http://localhost:3000";
const response = await fetch(origin + "/api/auth/sign-in/email", {
  method: "POST",
  headers: { origin, "content-type": "application/json" },
  body: JSON.stringify({
    email: process.env.SPS_USER_EMAIL,
    password: process.env.SPS_BOOTSTRAP_PASSWORD,
  }),
});
assert.equal(response.status, 200);
const cookie = response.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");
async function call(path, body, method = "POST") {
  return fetch(origin + path, {
    method,
    headers: { cookie, origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const [fixture] =
  await sql`SELECT l.id letter_id,l.snapshot,a.student_id,s.name,s.archived FROM issued_letters l JOIN applications a ON a.id=l.application_id JOIN students s ON s.id=a.student_id WHERE s.name LIKE 'QA TEST %' AND l.version=1 LIMIT 1`;
assert.ok(fixture, "Run workflow smoke check first.");
try {
  const patch = await call(
    "/api/students/" + fixture.student_id,
    { name: fixture.name + " corrected" },
    "PATCH",
  );
  assert.equal(patch.status, 200);
  const [student] =
    await sql`SELECT archived FROM students WHERE id=${fixture.student_id}`;
  assert.equal(student.archived, fixture.archived);
  const replies = await Promise.all([
    call("/api/letters/" + fixture.letter_id + "/reissue", {
      reason: "QA concurrent correction one",
    }),
    call("/api/letters/" + fixture.letter_id + "/reissue", {
      reason: "QA concurrent correction two",
    }),
  ]);
  for (const reply of replies) assert.equal(reply.status, 201);
  const ids = await Promise.all(replies.map((r) => r.json()));
  assert.notEqual(ids[0].letter_id, ids[1].letter_id);
  const rows =
    await sql`SELECT version,snapshot FROM issued_letters WHERE id=ANY(${ids.map((r) => r.letter_id)}::uuid[])`;
  assert.equal(new Set(rows.map((r) => r.version)).size, 2);
  for (const row of rows) {
    assert.equal(row.snapshot.student.name, fixture.name + " corrected");
    assert.deepEqual(row.snapshot.programme, fixture.snapshot.programme);
  }
  const [original] =
    await sql`SELECT snapshot FROM issued_letters WHERE id=${fixture.letter_id}`;
  assert.deepEqual(original.snapshot, fixture.snapshot);
  console.log(
    "PASS partial student correction preserves archive state, concurrent reissues get distinct versions, original letter stays unchanged",
  );
} finally {
  await call(
    "/api/students/" + fixture.student_id,
    { name: fixture.name },
    "PATCH",
  );
  await call("/api/auth/sign-out", {});
}
