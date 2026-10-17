import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { PDFDocument } from "pdf-lib";

// This integration check intentionally issues two labelled QA letters. Issued
// snapshots are immutable; their student records are archived in finally.
const origin = new URL(
  process.env.SPS_SMOKE_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000",
).origin;
const email = process.env.SPS_USER_EMAIL || process.env.SPS_SMOKE_EMAIL;
const password =
  process.env.SPS_USER_PASSWORD || process.env.SPS_BOOTSTRAP_PASSWORD;
const sql = neon(process.env.DATABASE_URL);
const jar = new Map();
const fixtures = [];
const restorations = [];
const marker = `QA${randomUUID().slice(0, 8).toUpperCase()}`;

async function request(
  path,
  { method = "GET", body, authenticated = true } = {},
) {
  const headers = new Headers();
  if (method !== "GET") {
    headers.set("origin", origin);
    headers.set("content-type", "application/json");
  }
  if (authenticated && jar.size)
    headers.set(
      "cookie",
      [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; "),
    );
  const response = await fetch(`${origin}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0];
    const index = pair.indexOf("=");
    if (index < 0) continue;
    const name = pair.slice(0, index);
    const value = pair.slice(index + 1);
    if (/;\s*max-age=0(?:;|$)/i.test(cookie) || !value) jar.delete(name);
    else jar.set(name, value);
  }
  return response;
}

async function json(path, options = {}, expectedStatus = 200) {
  const response = await request(path, options);
  assert.equal(
    response.status,
    expectedStatus,
    `${options.method || "GET"} ${path} returned HTTP ${response.status}, expected ${expectedStatus}.`,
  );
  return response.json();
}

async function pdf(letterId) {
  const response = await request(`/api/letters/${letterId}`);
  assert.equal(response.status, 200, "Issued PDF must be available.");
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(Buffer.from(bytes.subarray(0, 5)).toString(), "%PDF-");
  const document = await PDFDocument.load(bytes);
  assert.ok(document.getPageCount() > 0, "Generated PDF must contain a page.");
  return createHash("sha256").update(bytes).digest("hex");
}

async function immutable(letterId, operation) {
  let blocked = false;
  try {
    const mutation =
      operation === "update"
        ? sql`UPDATE issued_letters SET snapshot = snapshot || '{"qa":"must-not-save"}'::jsonb WHERE id = ${letterId}::uuid`
        : sql`DELETE FROM issued_letters WHERE id = ${letterId}::uuid`;
    // The deliberate error guarantees rollback even if immutability is broken.
    await sql.transaction([mutation, sql`SELECT 1/0 AS rollback_guard`]);
  } catch (error) {
    blocked = error?.code === "P0001" && /immutable/i.test(error.message);
  }
  assert.ok(blocked, `Database must reject issued letter ${operation}.`);
}

async function main() {
  if (!email || !password)
    throw new Error(
      "Set SPS_USER_EMAIL and SPS_USER_PASSWORD (or SPS_BOOTSTRAP_PASSWORD).",
    );
  await json("/api/auth/sign-in/email", {
    method: "POST",
    body: { email, password },
  });
  const bootstrap = await json("/api/bootstrap");
  assert.equal(bootstrap.user.level_id, "admin");

  for (const category of ["local", "international"]) {
    const offering = bootstrap.catalogue.find(
      (row) => row.category === category && row.is_active && !row.needs_review,
    );
    assert.ok(offering, `An active ${category} offering is required.`);
    const input = {
      name: `QA TEST ${marker} ${category.toUpperCase()} — ARCHIVE`,
      documentType: category === "local" ? "ic" : "passport",
      documentNumber: `${marker}-${category}`,
      email: `${marker.toLowerCase()}-${category}@example.invalid`,
      phone: "0000000000",
      address: "QA test fixture, not a real student address",
      category,
      offeringId: offering.id,
      language: category === "local" ? "ms" : "en",
      idempotencyKey: randomUUID(),
      agentName: "QA integration test",
      eventName: "QA verification",
    };
    const registration = await json(
      "/api/register",
      { method: "POST", body: input },
      201,
    );
    const [stored] = await sql`
      SELECT a.student_id, l.snapshot FROM applications a
      JOIN issued_letters l ON l.application_id = a.id
      WHERE a.id = ${registration.application_id}::uuid AND l.id = ${registration.letter_id}::uuid
    `;
    assert.ok(
      stored?.snapshot,
      "Registration must save the issued letter's data.",
    );
    fixtures.push({
      ...registration,
      student_id: stored.student_id,
      input,
      offering,
      snapshot: stored.snapshot,
    });
    const retry = await json("/api/register", { method: "POST", body: input });
    assert.equal(
      retry.letter_id,
      registration.letter_id,
      "Retry must reuse the issued letter.",
    );
    assert.equal(
      retry.application_id,
      registration.application_id,
      "Retry must reuse the application.",
    );
    const [count] =
      await sql`SELECT count(*)::int AS total FROM applications WHERE idempotency_key = ${input.idempotencyKey}`;
    assert.equal(count.total, 1);
    fixtures.at(-1).pdfHash = await pdf(registration.letter_id);
  }
  console.log(
    "PASS local/international registration, on-demand PDFs, and idempotent retries",
  );

  const local = fixtures[0];
  const originalCatalogue = {
    name: local.offering.name,
    total_fee: Number(local.offering.total_fee),
    duration: local.offering.duration,
    is_active: local.offering.is_active,
  };
  restorations.push(() =>
    json(`/api/catalogue/${local.offering.id}`, {
      method: "PATCH",
      body: originalCatalogue,
    }),
  );
  await json(`/api/catalogue/${local.offering.id}`, {
    method: "PATCH",
    body: {
      ...originalCatalogue,
      name: `${originalCatalogue.name} QA`,
      total_fee: originalCatalogue.total_fee + 123,
    },
  });
  const [after] =
    await sql`SELECT snapshot FROM issued_letters WHERE id = ${local.letter_id}::uuid`;
  assert.deepEqual(
    after.snapshot,
    local.snapshot,
    "Catalogue edits must leave the issued snapshot unchanged.",
  );
  assert.equal(
    await pdf(local.letter_id),
    local.pdfHash,
    "Catalogue edits must leave the generated original letter unchanged.",
  );
  await immutable(local.letter_id, "update");
  await immutable(local.letter_id, "delete");
  console.log(
    "PASS programme rename/fee changes preserve original PDF and database rejects letter mutation",
  );

  const page = bootstrap.adminPages.find(
    (entry) => entry.page_key === "overview",
  );
  assert.ok(page, "Overview page must be database configured.");
  const originalPage = {
    title: page.title,
    urutan: page.urutan,
    is_active: page.is_active,
    show_in_sidebar: page.show_in_sidebar,
    grants: page.level_grants,
  };
  restorations.push(() =>
    json(`/api/pages/${page.id}`, { method: "PATCH", body: originalPage }),
  );
  const alteredGrants = originalPage.grants.map((grant) =>
    grant.level_id === "staff"
      ? {
          ...grant,
          actions: grant.actions.filter((action) => action !== "view"),
        }
      : grant,
  );
  await json(`/api/pages/${page.id}`, {
    method: "PATCH",
    body: {
      ...originalPage,
      title: `${page.title} QA`,
      urutan: 9999,
      grants: alteredGrants,
    },
  });
  const reordered = await json("/api/bootstrap");
  assert.equal(
    reordered.pages.at(-1).id,
    page.id,
    "Sidebar order must follow database urutan.",
  );
  assert.equal(reordered.pages.at(-1).title, `${page.title} QA`);
  const [staffGrant] =
    await sql`SELECT actions FROM page_grants WHERE page_id = ${page.id} AND level_id = 'staff'`;
  assert.ok(
    !staffGrant?.actions?.includes("view"),
    "Page access changes must be saved to the level grant.",
  );
  console.log("PASS database sidebar title/order and level access changes");

  for (const path of ["/api/bootstrap", `/api/letters/${local.letter_id}`]) {
    const response = await request(path, { authenticated: false });
    assert.equal(
      response.status,
      401,
      "Direct unauthenticated data access must be denied.",
    );
  }
  console.log("PASS direct unauthenticated record and PDF access denied");
}

let failed = false;
try {
  await main();
} catch (error) {
  failed = true;
  if (error instanceof assert.AssertionError)
    console.error(`FAIL ${error.message.split("\n")[0]}`);
  else if (
    error instanceof Error &&
    error.message.startsWith("Set SPS_USER_EMAIL")
  )
    console.error(error.message);
  else
    console.error(
      "Workflow smoke check failed. Check the app, database, and Auth configuration.",
    );
} finally {
  for (const restore of restorations.reverse()) {
    try {
      await restore();
    } catch {
      failed = true;
      console.error(
        "FAIL restoring a changed QA catalogue/page setting; operator review required.",
      );
    }
  }
  for (const fixture of fixtures) {
    try {
      await json(`/api/students/${fixture.student_id}`, {
        method: "PATCH",
        body: {
          name: fixture.input.name,
          email: fixture.input.email,
          phone: fixture.input.phone,
          address: fixture.input.address,
          archived: true,
        },
      });
    } catch {
      failed = true;
      console.error(
        "FAIL archiving a QA student fixture; archive labelled QA TEST records in the app.",
      );
    }
  }
  if (jar.size)
    await request("/api/auth/sign-out", { method: "POST", body: {} }).catch(
      () => {},
    );
  if (fixtures.length)
    console.log(
      `QA fixtures: ${fixtures.length} labelled student records archived; immutable test letters retained.`,
    );
}
process.exitCode = failed ? 1 : 0;
