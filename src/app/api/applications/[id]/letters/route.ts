import {
  failure,
  HttpError,
  recordAllowed,
  requirePermission,
} from "@/lib/access";
import { database } from "@/lib/db";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("records");
    const { id } = await params;
    const sql = database();
    const [app] =
      await sql`SELECT created_by,faculty_snapshot FROM applications WHERE id=${id}::uuid`;
    if (!app || !recordAllowed(user, app.created_by, app.faculty_snapshot))
      throw new HttpError(404, "Application not found.");
    return Response.json(
      await sql`SELECT id,version,issued_at,snapshot->>'reference' reference FROM issued_letters WHERE application_id=${id}::uuid ORDER BY version DESC`,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
