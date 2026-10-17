import { neon } from "@neondatabase/serverless";

function required(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value?.trim())
    throw new Error(`Set ${name} before running this command.`);
  return value.trim();
}

async function main() {
  const databaseUrl = required("DATABASE_URL");
  const baseUrl = new URL(required("NEON_AUTH_BASE_URL"));
  if (baseUrl.protocol !== "https:") {
    throw new Error("NEON_AUTH_BASE_URL must use HTTPS.");
  }

  const email = required("SPS_USER_EMAIL").toLowerCase();
  const name = required("SPS_USER_NAME");
  const levelId = required("SPS_USER_LEVEL");
  const password =
    process.env.SPS_USER_PASSWORD || process.env.SPS_BOOTSTRAP_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error(
      "Set SPS_USER_PASSWORD to a unique password with at least 12 characters.",
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("SPS_USER_EMAIL must be a valid email address.");
  }

  const origin = new URL(process.env.APP_URL || "http://localhost:3000").origin;
  const sql = neon(databaseUrl);
  // Verify migrations and the requested level before creating any identity.
  const levels =
    await sql`SELECT id, scope FROM user_levels WHERE id = ${levelId}`;
  if (levels.length !== 1) {
    throw new Error(
      "Requested user level does not exist. Run db:migrate and db:seed first.",
    );
  }
  const linkedAccounts = await sql`
    SELECT id FROM app_users WHERE lower(email) = ${email}
  `;

  async function callAuth(path, payload) {
    const response = await fetch(`${baseUrl.href.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, data };
  }

  // Prove ownership of existing identities rather than looking up managed users.
  let result = await callAuth("/sign-in/email", { email, password });
  let created = false;
  if (!result.ok) {
    if (linkedAccounts.length > 0) {
      throw new Error(
        "This application account already exists and sign-in failed. Use its current password; no access was changed.",
      );
    }
    if (result.status !== 401 && result.status !== 400) {
      throw new Error(
        `Managed Auth sign-in returned HTTP ${result.status}. Check Auth configuration and trusted domains.`,
      );
    }
    result = await callAuth("/sign-up/email", { email, password, name });
    if (!result.ok) {
      throw new Error(
        `Managed Auth signup returned HTTP ${result.status}. If this identity exists, use its current password. No application access was assigned.`,
      );
    }
    created = true;
  }

  const user = result.data?.user;
  if (!user?.id || user.email?.toLowerCase() !== email) {
    throw new Error(
      "Managed Auth did not return a matching identity. No access was assigned.",
    );
  }
  if (linkedAccounts.some((account) => account.id !== user.id)) {
    throw new Error(
      "This email is linked to a different identity. Resolve it before provisioning.",
    );
  }

  await sql`
    INSERT INTO app_users (id, name, email, level_id, scope, active)
    VALUES (${user.id}, ${name}, ${email}, ${levelId}, ${levels[0].scope}, true)
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name, email = EXCLUDED.email,
        level_id = EXCLUDED.level_id, scope = EXCLUDED.scope, active = true
  `;

  // Do not print passwords, sessions, provider responses, or database URLs.
  console.log(
    `Application account ${created ? "created" : "updated"} with level ${levelId}.`,
  );
  if (created) {
    console.log(
      "The password is held in the supplied environment variable. No credential email was sent.",
    );
  }
}

main().catch((error) => {
  // Only controlled errors are shown; provider/database errors may contain secrets.
  const safeMessage =
    error instanceof Error &&
    /^(Set |NEON_AUTH_BASE_URL must|SPS_USER_EMAIL must|Requested user level|This application account|Managed Auth |This email is linked)/.test(
      error.message,
    )
      ? error.message
      : "User provisioning failed. Check database connectivity, migrations, and Managed Auth configuration.";
  console.error(safeMessage);
  process.exitCode = 1;
});
