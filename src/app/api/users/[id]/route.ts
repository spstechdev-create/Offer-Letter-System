import { z } from "zod";
import {
  checkOrigin,
  failure,
  HttpError,
  requirePermission,
} from "@/lib/access";
import { database } from "@/lib/db";
const schema = z.object({
  level_id: z.string().min(1),
  active: z.boolean(),
  scope: z.enum(["own", "faculty", "all"]),
  faculty_code: z.string().max(20).nullable().optional(),
  faculty_id: z.string().uuid().nullable().optional(),
});
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const actor = await requirePermission("users", "manage");
    const { id } = await params;
    const v = schema.parse(await request.json());
    if (v.scope === "faculty" && !v.faculty_id)
      throw new HttpError(400, "Select a faculty for faculty-scoped access.");
    if (id === actor.id)
      throw new HttpError(
        400,
        "Ask another administrator to change your own access.",
      );
    const sql = database();
    const [row] =
      await sql`WITH updated AS (UPDATE app_users SET level_id=${v.level_id},active=${v.active},scope=${v.scope},faculty_code=(SELECT code FROM faculties WHERE id=${v.faculty_id || null}::uuid),faculty_id=${v.faculty_id || null}::uuid WHERE id=${id} RETURNING id), audit AS (INSERT INTO audit_events(actor_id,action,entity_type,entity_id) SELECT ${actor.id},'user.access_updated','user',id FROM updated) SELECT * FROM updated`;
    if (!row) throw new HttpError(404, "User not found.");
    return Response.json(row);
  } catch (e) {
    return failure(e);
  }
}
