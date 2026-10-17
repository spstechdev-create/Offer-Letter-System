import assert from "node:assert/strict";

const origin = new URL(
  process.env.SPS_SMOKE_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000",
).origin;
const email = process.env.SPS_USER_EMAIL || process.env.SPS_SMOKE_EMAIL;
const password =
  process.env.SPS_USER_PASSWORD || process.env.SPS_BOOTSTRAP_PASSWORD;
const jar = new Map();

async function call(path, { method = "GET", body, authenticated = true } = {}) {
  const headers = new Headers();
  if (method !== "GET") {
    headers.set("origin", origin);
    headers.set("content-type", "application/json");
  }
  if (authenticated && jar.size) {
    headers.set(
      "cookie",
      [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; "),
    );
  }
  const response = await fetch(`${origin}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (/;\s*max-age=0(?:;|$)/i.test(cookie) || value === "") jar.delete(name);
    else jar.set(name, value);
  }
  return {
    status: response.status,
    data: await response.json().catch(() => null),
  };
}

async function main() {
  if (!email || !password)
    throw new Error(
      "Set SPS_USER_EMAIL and SPS_USER_PASSWORD (or SPS_BOOTSTRAP_PASSWORD).",
    );
  const denied = await call("/api/bootstrap", { authenticated: false });
  assert.equal(
    denied.status,
    401,
    "Unauthenticated application data must be denied.",
  );
  console.log("PASS unauthenticated application access denied");

  const signup = await call("/api/auth/sign-up/email", {
    method: "POST",
    body: {},
    authenticated: false,
  });
  assert.equal(signup.status, 403, "Public signup must be disabled.");
  console.log("PASS public signup denied");

  const login = await call("/api/auth/sign-in/email", {
    method: "POST",
    body: { email, password },
  });
  assert.equal(login.status, 200, "Managed password sign-in must succeed.");
  assert.ok(jar.size > 0, "Sign-in must establish application-origin cookies.");
  const session = await call("/api/auth/get-session");
  assert.equal(session.status, 200, "Session endpoint must succeed.");
  assert.ok(session.data?.user?.id, "Session must contain a signed-in user.");
  console.log("PASS managed sign-in and first-party session cookies");

  for (let attempt = 0; attempt < 2; attempt++) {
    const bootstrap = await call("/api/bootstrap");
    assert.equal(
      bootstrap.status,
      200,
      "Application account must authorize data access.",
    );
    assert.equal(
      bootstrap.data?.user?.level_id,
      "admin",
      "Bootstrap account must have administrator access.",
    );
    assert.ok(
      bootstrap.data?.pages?.length > 0,
      "Navigation must come from database grants.",
    );
  }
  console.log("PASS administrator access and session restoration");

  const logout = await call("/api/auth/sign-out", { method: "POST", body: {} });
  assert.equal(logout.status, 200, "Managed sign-out must succeed.");
  const cleared = await call("/api/auth/get-session");
  assert.equal(cleared.status, 200);
  assert.equal(cleared.data, null, "Session must be cleared after logout.");
  const deniedAgain = await call("/api/bootstrap");
  assert.equal(
    deniedAgain.status,
    401,
    "Application data must be denied after logout.",
  );
  console.log("PASS logout clears session and protected access");
}

main().catch(async (error) => {
  // Attempt to close any test session without exposing cookies or credentials.
  if (jar.size)
    await call("/api/auth/sign-out", { method: "POST", body: {} }).catch(
      () => {},
    );
  if (error instanceof assert.AssertionError)
    console.error(`FAIL ${error.message.split("\n")[0]}`);
  else if (
    error instanceof Error &&
    error.message.startsWith("Set SPS_USER_EMAIL")
  )
    console.error(error.message);
  else
    console.error(
      "Auth smoke check failed. Check that the app is running and Auth is configured.",
    );
  process.exitCode = 1;
});
