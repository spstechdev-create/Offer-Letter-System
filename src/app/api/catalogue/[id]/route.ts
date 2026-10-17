import {
  checkOrigin,
  failure,
  HttpError,
  requirePermission,
} from "@/lib/access";
import { database } from "@/lib/db";
import { cataloguePatch } from "@/lib/validation";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const user = await requirePermission("catalogue", "edit");
    const { id } = await params;
    const v = cataloguePatch.parse(await request.json());
    const sql = database();
    const [existing] =
      await sql`SELECT needs_review,faculty_id FROM catalogue WHERE id=${id}`;
    if (existing?.needs_review && v.is_active && !v.review_confirmed)
      throw new HttpError(
        400,
        "Confirm source reconciliation before activating this offering.",
      );
    if (!existing) throw new HttpError(404, "Programme not found.");
    const facultyId = v.faculty_id || existing.faculty_id;
    const [faculty] =
      await sql`SELECT id,code FROM faculties WHERE id=${facultyId}::uuid`;
    if (!faculty) throw new HttpError(400, "Select a valid faculty.");
    const result =
      await sql`WITH old AS (SELECT * FROM catalogue WHERE id=${id} FOR UPDATE), changed AS (UPDATE catalogue SET faculty_id=${faculty.id}::uuid,faculty=${faculty.code},structure=COALESCE(${v.structure ?? null},structure),attendance=COALESCE(${v.attendance ?? null},attendance),delivery=COALESCE(${v.delivery ?? null},delivery),name=${v.name},total_fee=${v.total_fee},duration=${v.duration},is_active=${v.is_active},needs_review=CASE WHEN ${v.review_confirmed === true} THEN false ELSE needs_review END,updated_at=now() WHERE id=${id} RETURNING *), history AS (INSERT INTO fee_history(catalogue_id,old_fee,new_fee,actor_id) SELECT old.id,old.total_fee,changed.total_fee,${user.id} FROM old,changed WHERE old.total_fee<>changed.total_fee), audit AS (INSERT INTO audit_events(actor_id,action,entity_type,entity_id,details) SELECT ${user.id},'catalogue.updated','catalogue',changed.id,jsonb_build_object('name',changed.name,'total_fee',changed.total_fee) FROM changed) SELECT * FROM changed`;
    if (!result.length) throw new HttpError(404, "Programme not found.");
    return Response.json(result[0]);
  } catch (e) {
    return failure(e);
  }
}
