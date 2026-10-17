import { randomUUID } from "node:crypto";
import sourceCatalogue from "../../../../data/programmes.json";
import {
  checkOrigin,
  failure,
  HttpError,
  recordAllowed,
  requirePermission,
} from "@/lib/access";
import { database } from "@/lib/db";
import { registrationSchema } from "@/lib/validation";
import { generateLetterPdf, type LetterSnapshot } from "@/lib/pdf";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requirePermission("register", "create");
    const data = registrationSchema.parse(await request.json());
    const sql = database();
    const [prior] =
      await sql`SELECT l.id AS letter_id,a.id AS application_id,a.reference FROM applications a JOIN issued_letters l ON l.application_id=a.id WHERE a.created_by=${user.id} AND a.idempotency_key=${data.idempotencyKey} ORDER BY l.version DESC LIMIT 1`;
    if (prior) return Response.json(prior);
    const matching =
      await sql`SELECT s.id,s.name,s.document_number,s.address,s.email,s.phone,s.category,a.created_by,a.faculty_snapshot FROM students s LEFT JOIN applications a ON a.student_id=s.id WHERE s.document_type=${data.documentType} AND s.document_number=${data.documentNumber}`;
    if (
      matching.length &&
      user.scope !== "all" &&
      !matching.every((row) =>
        recordAllowed(user, row.created_by, row.faculty_snapshot),
      )
    )
      throw new HttpError(
        409,
        "This student already exists. A staff member with wider record access must add the application.",
      );
    const [offer] =
      await sql`SELECT *,updated_at::text AS updated_at_exact FROM catalogue WHERE id=${data.offeringId} AND is_active AND NOT needs_review`;
    if (!offer || offer.category !== data.category)
      throw new HttpError(
        400,
        "Select an active offering matching the student category.",
      );
    const [setting] =
      await sql`SELECT value FROM app_settings WHERE key='letter_defaults'`;
    const config = setting?.value as Record<string, unknown>;
    if (
      config.templateVersion === "ftmk-conditional-v1" &&
      (offer.faculty !== "FTMK" ||
        /philosophy|falsafah|phd|doctor/i.test(offer.name))
    )
      throw new HttpError(
        400,
        "The FTMK conditional template is only available for FTMK Master programmes. Select the general template in Letter settings.",
      );
    const faculty = sourceCatalogue.find(
      (row) => row.code === offer.code && row.facultyCode === offer.faculty,
    );
    const facultyName =
      data.category === "local"
        ? faculty?.facultyNameMs
        : faculty?.facultyNameEn;
    const reference =
      "SPS-" +
      new Date().getUTCFullYear() +
      "-" +
      randomUUID().slice(0, 8).toUpperCase();
    const snapshot = {
      reference,
      issuedAt: new Date().toISOString(),
      student: matching.length
        ? {
            name: matching[0].name,
            identity: matching[0].document_number,
            address: matching[0].address,
            email: matching[0].email,
            phone: matching[0].phone,
            category: matching[0].category,
          }
        : {
            name: data.name,
            identity: data.documentNumber,
            address: data.address,
            email: data.email,
            phone: data.phone,
            category: data.category,
          },
      programme: {
        name: offer.name,
        faculty: facultyName || offer.faculty,
        fee: Number(offer.total_fee),
        duration: offer.duration,
        attendance: offer.attendance,
        structure: offer.structure,
        code: offer.code,
      },
      language: data.language || (data.category === "local" ? "ms" : "en"),
      templateVersion: config.templateVersion || "sps-conditional-v1",
      brandingVersion: "sps-v1",
      signatory: config.signatory,
      admissionUrl: config.admissionUrl,
      intake: config.intake,
    } as LetterSnapshot;
    await generateLetterPdf(snapshot);
    const [result] =
      await sql`WITH chosen AS (SELECT * FROM catalogue WHERE id=${data.offeringId} AND is_active AND NOT needs_review AND name=${offer.name} AND total_fee=${offer.total_fee} AND updated_at=${offer.updated_at_exact}::timestamptz), student AS (INSERT INTO students(name,document_type,document_number,category,email,phone,address) SELECT ${data.name},${data.documentType},${data.documentNumber},${data.category},${data.email},${data.phone},${data.address} FROM chosen ON CONFLICT(document_type,document_number) DO UPDATE SET document_number=EXCLUDED.document_number WHERE ${user.scope}='all' OR EXISTS(SELECT 1 FROM applications existing WHERE existing.student_id=students.id AND (existing.created_by=${user.id} OR (${user.scope}='faculty' AND existing.faculty_snapshot=${user.faculty_code}))) RETURNING id), app AS (INSERT INTO applications(student_id,catalogue_id,created_by,reference,idempotency_key,agent_name,agent_code,event_name,event_date,faculty_snapshot) SELECT student.id,chosen.id,${user.id},${reference},${data.idempotencyKey},${user.level_id === "agent" ? user.name : data.agentName || user.name},${data.agentCode || ""},${data.eventName || ""},${data.eventDate || ""},chosen.faculty FROM student,chosen ON CONFLICT(created_by,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING id,reference), letter AS (INSERT INTO issued_letters(application_id,snapshot,issued_by) SELECT app.id,${JSON.stringify(snapshot)}::jsonb,${user.id} FROM app ON CONFLICT(application_id,version) DO NOTHING RETURNING id,application_id), audit AS (INSERT INTO audit_events(actor_id,action,entity_type,entity_id) SELECT ${user.id},'registration.created','application',app.id::text FROM app) SELECT letter.id AS letter_id,app.id AS application_id,app.reference FROM app JOIN letter ON letter.application_id=app.id`;
    if (!result) {
      const [retry] =
        await sql`SELECT l.id AS letter_id,a.id AS application_id,a.reference FROM applications a JOIN issued_letters l ON l.application_id=a.id WHERE a.created_by=${user.id} AND a.idempotency_key=${data.idempotencyKey} ORDER BY l.version DESC LIMIT 1`;
      if (retry) return Response.json(retry);
      throw new HttpError(
        409,
        "The programme or student changed during submission. Refresh and submit again.",
      );
    }
    return Response.json(result, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
