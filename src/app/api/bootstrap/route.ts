import { currentUser, failure } from "@/lib/access";
import { database } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await currentUser();
    const sql = database();
    const pages =
      await sql`SELECT p.*,g.actions AS grants FROM pages p JOIN page_grants g ON g.page_id=p.id WHERE p.is_active AND g.level_id=${user.level_id} AND g.actions ? 'view' ORDER BY p.urutan,p.page_key`;
    const can = (key: string, action = "view") =>
      pages.some(
        (p) => p.page_key === key && (p.grants as string[]).includes(action),
      );
    const catalogue =
      can("register") || can("catalogue")
        ? await sql`SELECT * FROM catalogue ORDER BY faculty,name,category,attendance`
        : [];
    const applications = can("records")
      ? await sql`SELECT a.*,s.id AS student_id,s.name AS student_name,s.document_number,s.email,s.phone,s.address,s.category,s.archived,c.name AS current_programme_name,l.id AS letter_id,l.version,l.snapshot->'programme'->>'name' AS programme_name,l.snapshot->'programme'->>'fee' AS fee_total,u.name AS created_by_name FROM applications a JOIN students s ON s.id=a.student_id JOIN catalogue c ON c.id=a.catalogue_id JOIN app_users u ON u.id=a.created_by JOIN LATERAL (SELECT * FROM issued_letters WHERE application_id=a.id ORDER BY version DESC LIMIT 1) l ON true WHERE (${user.scope}='all' OR a.created_by=${user.id} OR (${user.scope}='faculty' AND a.faculty_snapshot=${user.faculty_code})) ORDER BY a.created_at DESC`
      : [];
    const [stats] = can("overview")
      ? await sql`SELECT count(*)::int total,count(*) FILTER(WHERE a.status='issued')::int issued,count(*) FILTER(WHERE s.category='local')::int local,count(*) FILTER(WHERE s.category='international')::int international FROM applications a JOIN students s ON s.id=a.student_id WHERE NOT s.archived AND (${user.scope}='all' OR a.created_by=${user.id} OR (${user.scope}='faculty' AND a.faculty_snapshot=${user.faculty_code}))`
      : [];
    const levels =
      can("users") || can("pages")
        ? await sql`SELECT * FROM user_levels ORDER BY name`
        : [];
    const users = can("users")
      ? await sql`SELECT u.id,u.name,u.email,u.level_id,u.scope,u.faculty_code,u.active,l.name AS level FROM app_users u JOIN user_levels l ON l.id=u.level_id ORDER BY u.name`
      : [];
    const adminPages = can("pages")
      ? await sql`SELECT p.*,COALESCE((SELECT jsonb_agg(jsonb_build_object('level_id',g.level_id,'actions',g.actions)) FROM page_grants g WHERE g.page_id=p.id),'[]'::jsonb) AS level_grants FROM pages p ORDER BY urutan,page_key`
      : [];
    const audit = can("audit")
      ? await sql`SELECT e.*,u.name AS actor_name FROM audit_events e LEFT JOIN app_users u ON u.id=e.actor_id ORDER BY created_at DESC LIMIT 200`
      : [];
    const [letterSettings] = can("settings")
      ? await sql`SELECT value FROM app_settings WHERE key='letter_defaults'`
      : [];
    return Response.json(
      {
        user,
        stats,
        pages,
        applications,
        students: applications,
        catalogue,
        levels,
        users,
        adminPages,
        audit,
        settings: letterSettings?.value,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
