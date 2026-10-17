import { z } from "zod";
import { checkOrigin, failure, requirePermission } from "@/lib/access";
import { database } from "@/lib/db";
const schema = z.object({
  intake: z.string().max(100),
  templateVersion: z.enum(["sps-conditional-v1", "ftmk-conditional-v1"]),
  admissionUrl: z
    .string()
    .url()
    .refine((s) => s.startsWith("https://")),
  signatory: z.object({
    name: z.string().min(2).max(200),
    title: z.string().min(2).max(250),
    signatureAsset: z.literal("sps-v1").optional(),
  }),
});
export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    const user = await requirePermission("settings", "manage");
    const v = schema.parse(await request.json());
    const sql = database();
    await sql`WITH changed AS (INSERT INTO app_settings(key,value) VALUES('letter_defaults',${JSON.stringify(v)}::jsonb) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value RETURNING key), audit AS (INSERT INTO audit_events(actor_id,action,entity_type,entity_id) SELECT ${user.id},'letter_defaults.updated','settings',key FROM changed) SELECT key FROM changed`;
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
