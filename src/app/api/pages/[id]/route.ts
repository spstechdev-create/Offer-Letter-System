import { z } from "zod";
import {
  checkOrigin,
  failure,
  HttpError,
  requirePermission,
} from "@/lib/access";
import { database } from "@/lib/db";
const schema = z.object({
  title: z.string().trim().min(1).max(100),
  urutan: z.coerce.number().int().min(0).max(10000),
  is_active: z.boolean(),
  show_in_sidebar: z.boolean(),
  grants: z
    .array(
      z.object({
        level_id: z.string().min(1),
        actions: z.array(
          z.enum(["view", "create", "edit", "generate", "manage"]),
        ),
      }),
    )
    .optional(),
});
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const user = await requirePermission("pages", "manage");
    const { id } = await params;
    const v = schema.parse(await request.json());
    if (id === "pages" || id === "users")
      if (
        !v.is_active ||
        (v.grants &&
          !v.grants.some(
            (g) =>
              g.level_id === user.level_id &&
              g.actions.includes("view") &&
              g.actions.includes("manage"),
          ))
      )
        throw new HttpError(
          400,
          "Keep your current level able to manage pages and users.",
        );
    const sql = database();
    const [existing] = await sql`SELECT id FROM pages WHERE id=${id}`;
    if (!existing) throw new HttpError(404, "Page not found.");
    await sql.transaction([
      sql`UPDATE pages SET title=${v.title},urutan=${v.urutan},is_active=${v.is_active},show_in_sidebar=${v.show_in_sidebar} WHERE id=${id}`,
      sql`DELETE FROM page_grants WHERE page_id=${id} AND ${v.grants !== undefined}`,
      sql`INSERT INTO page_grants(page_id,level_id,actions) SELECT ${id},level_id,actions FROM jsonb_to_recordset(${JSON.stringify(v.grants || [])}::jsonb) x(level_id text,actions jsonb) ON CONFLICT(page_id,level_id) DO UPDATE SET actions=EXCLUDED.actions`,
      sql`INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(${user.id},'page.updated','page',${id})`,
    ]);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
