import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = auth.handler();
type AuthHandler = typeof handlers.POST;

function staffAccountsOnly(handler: AuthHandler): AuthHandler {
  return async (request: Request, context) => {
    const { path } = await context.params;
    const endpoint = path.join("/").toLowerCase();
    const allowed = new Set([
      "sign-in/email",
      "sign-out",
      "get-session",
      "request-password-reset",
      "reset-password",
      "change-password",
      "token",
      "get-anonymous-token",
    ]);
    if (!allowed.has(endpoint)) {
      return Response.json(
        {
          error:
            "Public registration is disabled. Ask an administrator for an account.",
        },
        { status: 403 },
      );
    }
    return handler(request, context);
  };
}

export const GET = staffAccountsOnly(handlers.GET);
export const POST = staffAccountsOnly(handlers.POST);
export const PUT = staffAccountsOnly(handlers.PUT);
export const DELETE = staffAccountsOnly(handlers.DELETE);
export const PATCH = staffAccountsOnly(handlers.PATCH);
