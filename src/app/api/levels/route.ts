import { z } from "zod";
import { checkOrigin, failure, requirePermission } from "@/lib/access";
import { database } from "@/lib/db";
const schema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{1,30}$/),
  name: z.string().trim().min(2).max(60),
  scope: z.enum(["own", "faculty", "all"]),
});
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requirePermission("users", "manage");
    const v = schema.parse(await request.json());
    const sql = database();
    const [level] =
      await sql`WITH changed AS (INSERT INTO user_levels(id,name,scope) VALUES(${v.id},${v.name},${v.scope}) RETURNING *), audit AS (INSERT INTO audit_events(actor_id,action,entity_type,entity_id) SELECT ${user.id},'level.created','level',id FROM changed) SELECT * FROM changed`;
    return Response.json(level, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
