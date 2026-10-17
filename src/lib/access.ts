import "server-only";
import { getSessionUser } from "./auth";
import { database } from "./db";
export type AppUser = {
  id: string;
  name: string;
  email: string;
  level_id: string;
  level: string;
  scope: "own" | "faculty" | "all";
  faculty_code: string | null;
  active: boolean;
};
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function currentUser(): Promise<AppUser> {
  const identity = await getSessionUser();
  if (!identity) throw new HttpError(401, "Please sign in.");
  const sql = database();
  const [user] =
    await sql`SELECT u.*, l.name AS level FROM app_users u JOIN user_levels l ON l.id=u.level_id WHERE u.id=${identity.id} AND u.active=true`;
  if (!user)
    throw new HttpError(
      403,
      "Your account has not been granted access. Contact your administrator.",
    );
  return user as AppUser;
}
export async function requirePermission(key: string, action = "view") {
  const user = await currentUser();
  const sql = database();
  const [grant] =
    await sql`SELECT g.actions FROM page_grants g JOIN pages p ON p.id=g.page_id WHERE g.level_id=${user.level_id} AND p.page_key=${key} AND p.is_active=true`;
  if (!grant || !(grant.actions as string[]).includes(action))
    throw new HttpError(403, "You do not have permission for this action.");
  return user;
}
export function recordAllowed(user: AppUser, owner: string, faculty: string) {
  return (
    user.scope === "all" ||
    owner === user.id ||
    (user.scope === "faculty" &&
      Boolean(user.faculty_code) &&
      user.faculty_code === faculty)
  );
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new HttpError(403, "Cross-origin request denied.");
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof Error && error.name === "LetterTextError")
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof Error && error.name === "ZodError")
    return Response.json(
      { error: "Please check the submitted values." },
      { status: 400 },
    );
  console.error(error instanceof Error ? error.message : "Request failed");
  return Response.json(
    { error: "The operation could not be completed. Please retry." },
    { status: 500 },
  );
}
