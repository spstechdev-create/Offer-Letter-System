import { z } from "zod";
import {
  checkOrigin,
  failure,
  HttpError,
  recordAllowed,
  requirePermission,
} from "@/lib/access";
import { database } from "@/lib/db";
const schema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(40).optional(),
    address: z.string().max(1000).optional(),
    archived: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0);
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const user = await requirePermission("records", "edit");
    const { id } = await params;
    const v = schema.parse(await request.json());
    const sql = database();
    const ownership =
      await sql`SELECT created_by,faculty_snapshot FROM applications WHERE student_id=${id}::uuid`;
    if (
      !ownership.length ||
      !ownership.every((a) =>
        recordAllowed(user, a.created_by, a.faculty_snapshot),
      )
    )
      throw new HttpError(
        403,
        "You cannot edit a shared student outside your record scope.",
      );
    await sql`WITH previous AS (SELECT * FROM students WHERE id=${id}::uuid FOR UPDATE), changed AS (UPDATE students SET name=COALESCE(${v.name ?? null},students.name),email=COALESCE(${v.email ?? null},students.email),phone=COALESCE(${v.phone ?? null},students.phone),address=COALESCE(${v.address ?? null},students.address),archived=COALESCE(${v.archived ?? null},students.archived) FROM previous WHERE students.id=previous.id RETURNING students.*), audit AS (INSERT INTO audit_events(actor_id,action,entity_type,entity_id,details) SELECT ${user.id},'student.updated','student',changed.id::text,jsonb_build_object('fields',${JSON.stringify(Object.keys(v))}::jsonb,'before',jsonb_build_object('name',previous.name,'email',previous.email,'phone',previous.phone,'address',previous.address,'archived',previous.archived),'after',jsonb_build_object('name',changed.name,'email',changed.email,'phone',changed.phone,'address',changed.address,'archived',changed.archived)) FROM changed,previous) SELECT id FROM changed`;
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
