import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  checkOrigin,
  failure,
  HttpError,
  recordAllowed,
  requirePermission,
} from "@/lib/access";
import { database } from "@/lib/db";
import { generateLetterPdf, type LetterSnapshot } from "@/lib/pdf";
const schema = z.object({ reason: z.string().trim().min(3).max(400) });
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(request);
    const user = await requirePermission("records", "generate");
    await requirePermission("records", "edit");
    const data = schema.parse(await request.json());
    const { id } = await params;
    const sql = database();
    const [row] =
      await sql`SELECT l.*,a.created_by,a.faculty_id,s.name,s.document_number,s.email,s.phone,s.address FROM issued_letters l JOIN applications a ON a.id=l.application_id JOIN students s ON s.id=a.student_id WHERE l.id=${id}::uuid`;
    if (!row || !recordAllowed(user, row.created_by, row.faculty_id))
      throw new HttpError(404, "Letter not found.");
    const old = row.snapshot as LetterSnapshot;
    const snapshot = {
      ...old,
      reference: old.reference + "-R" + randomUUID().slice(0, 4).toUpperCase(),
      issuedAt: new Date().toISOString(),
      student: {
        ...old.student,
        name: row.name,
        identity: row.document_number,
        email: row.email,
        phone: row.phone,
        address: row.address,
      },
    };
    await generateLetterPdf(snapshot);
    const issue = () =>
      sql`WITH locked AS (SELECT id FROM applications WHERE id=${row.application_id}::uuid FOR UPDATE), inserted AS (INSERT INTO issued_letters(application_id,version,snapshot,issued_by) SELECT locked.id,(SELECT COALESCE(MAX(version),0)+1 FROM issued_letters WHERE application_id=locked.id),${JSON.stringify(snapshot)}::jsonb,${user.id} FROM locked RETURNING id), audit AS (INSERT INTO audit_events(actor_id,action,entity_type,entity_id,details) SELECT ${user.id},'letter.reissued','letter',id::text,jsonb_build_object('reason',${data.reason}::text) FROM inserted) SELECT id AS letter_id FROM inserted`;
    let next;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        [next] = await issue();
        break;
      } catch (error) {
        if (
          !(
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "23505"
          ) ||
          attempt === 2
        )
          throw error;
      }
    }
    return Response.json(next, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
