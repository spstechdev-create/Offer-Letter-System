import {
  checkOrigin,
  failure,
  HttpError,
  requirePermission,
} from "@/lib/access";
import { database } from "@/lib/db";
import { facultyPatch } from "@/lib/faculty-validation";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const user = await requirePermission("faculties", "manage");
    const { id } = await params;
    const v = facultyPatch.parse(await request.json());
    const sql = database();
    const [faculty] =
      await sql`WITH previous AS (SELECT * FROM faculties WHERE id=${id}::uuid FOR UPDATE), changed AS (UPDATE faculties f SET code=COALESCE(${v.code ?? null},f.code),name_ms=COALESCE(${v.name_ms ?? null},f.name_ms),name_en=COALESCE(${v.name_en ?? null},f.name_en),kind=COALESCE(${v.kind ?? null},f.kind),website=COALESCE(${v.website ?? null},f.website),source_url=COALESCE(${v.source_url ?? null},f.source_url),notes=COALESCE(${v.notes ?? null},f.notes),is_active=COALESCE(${v.is_active ?? null},f.is_active),updated_at=now() FROM previous WHERE f.id=previous.id RETURNING f.*), audit AS (INSERT INTO audit_events(actor_id,action,entity_type,entity_id,details) SELECT ${user.id},'faculty.updated','faculty',changed.id::text,jsonb_build_object('before',to_jsonb(previous),'after',to_jsonb(changed)) FROM previous,changed) SELECT * FROM changed`;
    if (!faculty) throw new HttpError(404, "Faculty not found.");
    return Response.json(faculty);
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "23505")
      return Response.json(
        { error: "That faculty code already exists." },
        { status: 409 },
      );
    return failure(e);
  }
}
