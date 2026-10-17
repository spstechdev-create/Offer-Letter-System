import { failure, recordAllowed, requirePermission } from "@/lib/access";
import { database } from "@/lib/db";
export async function GET(request: Request) {
  try {
    const user = await requirePermission("register", "create");
    const url = new URL(request.url);
    const doc = (url.searchParams.get("documentNumber") || "")
      .toUpperCase()
      .replace(/[\s-]/g, "");
    if (doc.length < 3) return Response.json({ exists: false });
    const sql = database();
    const rows =
      await sql`SELECT s.id,s.name,a.created_by,a.faculty_id FROM students s LEFT JOIN applications a ON a.student_id=s.id WHERE s.document_number=${doc}`;
    const permitted = rows.find((r) =>
      recordAllowed(user, r.created_by, r.faculty_id),
    );
    return Response.json(
      {
        exists: rows.length > 0,
        student: permitted
          ? { id: permitted.id, name: permitted.name }
          : undefined,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
