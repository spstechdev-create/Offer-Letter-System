import { checkOrigin, failure, requirePermission } from "@/lib/access";
import { database } from "@/lib/db";
import { facultySchema } from "@/lib/faculty-validation";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requirePermission("faculties", "manage");
    const v = facultySchema.parse(await request.json());
    const sql = database();
    const [faculty] =
      await sql`WITH added AS (INSERT INTO faculties(code,name_ms,name_en,kind,website,source_url,notes,is_active) VALUES(${v.code},${v.name_ms},${v.name_en},${v.kind},${v.website},${v.source_url || ""},${v.notes || ""},${v.is_active}) RETURNING *), audit AS (INSERT INTO audit_events(actor_id,action,entity_type,entity_id) SELECT ${user.id},'faculty.created','faculty',id::text FROM added) SELECT * FROM added`;
    return Response.json(faculty, { status: 201 });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "23505")
      return Response.json(
        { error: "That faculty code already exists." },
        { status: 409 },
      );
    return failure(e);
  }
}
