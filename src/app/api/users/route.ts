import { z } from "zod";
import {
  checkOrigin,
  failure,
  HttpError,
  requirePermission,
} from "@/lib/access";
import { database } from "@/lib/db";

export const runtime = "nodejs";

const newUserSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    email: z
      .string()
      .trim()
      .email()
      .max(200)
      .transform((email) => email.toLowerCase()),
    password: z.string().min(12).max(128),
    level_id: z.string().trim().min(1).max(100),
  })
  .strict();

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const actor = await requirePermission("users", "manage");
    const data = newUserSchema.parse(await request.json());
    const sql = database();
    const [level] = await sql`
      SELECT id, scope FROM user_levels WHERE id = ${data.level_id}
    `;
    if (!level) throw new HttpError(400, "Select an existing user level.");
    const [existing] = await sql`
      SELECT id FROM app_users WHERE lower(email) = ${data.email}
    `;
    if (existing)
      throw new HttpError(
        409,
        "An application account already uses this email.",
      );

    const authUrl = process.env.NEON_AUTH_BASE_URL;
    if (!authUrl)
      throw new HttpError(503, "Account creation is not configured.");
    const origin = new URL(process.env.APP_URL || request.url).origin;
    const result = await fetch(`${authUrl.replace(/\/$/, "")}/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
      }),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    if (!result.ok) {
      if (result.status === 422 || result.status === 409) {
        throw new HttpError(
          409,
          "This identity already exists. An operator can link it using the provisioning command and its current password.",
        );
      }
      if (result.status === 429)
        throw new HttpError(429, "Too many account requests. Try again later.");
      throw new HttpError(
        502,
        "Managed Auth could not create the account. Check trusted domains and provider settings.",
      );
    }
    const identity = await result.json();
    if (
      !identity?.user?.id ||
      identity.user.email?.toLowerCase() !== data.email
    ) {
      throw new HttpError(
        502,
        "Managed Auth did not return a matching identity. No access was assigned.",
      );
    }

    const [account] = await sql`
      WITH new_account AS (
        INSERT INTO app_users (id, name, email, level_id, scope, active)
        VALUES (${identity.user.id}, ${data.name}, ${data.email}, ${level.id}, ${level.scope}, true)
        RETURNING id, name, email, level_id, scope, active
      ), audit AS (
        INSERT INTO audit_events (actor_id, action, entity_type, entity_id, details)
        SELECT ${actor.id}, 'user.created', 'user', id,
          ${JSON.stringify({ level_id: level.id })}::jsonb
        FROM new_account
      )
      SELECT * FROM new_account
    `;
    // The provider's signup cookies/session belong to the new user. Never
    // forward them: the administrator must keep their own signed-in session.
    return Response.json(account, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
