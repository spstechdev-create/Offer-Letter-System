import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL &&
    process.env.NEON_AUTH_COOKIE_SECRET &&
    process.env.NEON_AUTH_COOKIE_SECRET.length >= 32,
  );
}

/** Managed identities establish who signed in. app_users establishes access. */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

/** Always check the active application account and permissions after this. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const { data, error } = await auth.getSession();
  if (error || !data?.user) return null;

  return {
    id: data.user.id,
    email: data.user.email,
    name: data.user.name || data.user.email,
  };
}
