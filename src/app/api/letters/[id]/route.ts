import {
  failure,
  HttpError,
  recordAllowed,
  requirePermission,
} from "@/lib/access";
import { database } from "@/lib/db";
import { generateLetterPdf, type LetterSnapshot } from "@/lib/pdf";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("records", "generate");
    const { id } = await params;
    const sql = database();
    const [letter] =
      await sql`SELECT l.snapshot,a.created_by,a.faculty_id FROM issued_letters l JOIN applications a ON a.id=l.application_id WHERE l.id=${id}::uuid`;
    if (!letter || !recordAllowed(user, letter.created_by, letter.faculty_id))
      throw new HttpError(404, "Letter not found.");
    const snapshot = letter.snapshot as LetterSnapshot;
    const bytes = await generateLetterPdf(snapshot);
    const download = new URL(request.url).searchParams.has("download");
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${snapshot.reference.replace(/[^A-Za-z0-9-]/g, "")}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
