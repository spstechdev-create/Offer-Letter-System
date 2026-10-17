# Unified SPS registration and conditional offer application

Planning baseline: 17 October 2026. This is a proposal based on source inspection; no application code or database migrations have been applied.

## Outcome

Build one SPS application in this repository that handles local and international postgraduate registrations, programme selection, agent/event attribution, staff administration, and conditional offer PDFs. Use the existing Neon project and GitHub repository. Hosting remains independent of the core implementation.

## What the supplied systems actually do

| Source | Observed behaviour | Carry forward |
| --- | --- | --- |
| `../internWeb/Offer.php` and `generate_offer.php` | Collect name, student ID and programme; generate an FTMK conditional offer PDF without saving a registration. Letter contains hard-coded session, eligibility text, contacts and signatory. | Simple entry flow, FTMK-specific conditional template, branding assets and letter wording as reference. |
| `../studentregistration/` | PHP/MySQL local and international registration, immediate conditional offer download, staff login, student lookup, programme fees and dashboard reporting. Local letters use Malay and international letters use English. | Persistent records, staff workflows, bilingual catalogue, fees and durations, search and reporting, general conditional letter templates. |
| `../coding sistem surat tawaran.html` | Unified registration form with local/international selection, faculty, degree category, study mode, programme selection, fees/durations, agent and event fields. Catalogue is embedded in JavaScript. | Unified form structure and expanded attribution/catalogue requirements. |

Important distinctions:

- Neither supplied letter implementation is evidence of authority to issue a final admission offer. Both explicitly issue conditional offers and direct the recipient to the university admissions portal.
- The standalone HTML submits to `submitregistration.php`, which is absent from the supplied sources. Its staff link names `staff_login.php`, while the PHP system supplies `login_staff.php`.
- The HTML offers ODL and Open Access, but the data/selection logic does not establish complete support for those combinations. It contains an explicit FAIX/coursework/ODL exclusion and sentinel values such as `-`. An `Other` handler exists without a matching programme option.
- The PHP schema splits local/international students and programmes and duplicates programme/faculty names on registrations. This needs explicit migration mapping rather than a direct table copy.
- The legacy staff login compares passwords directly. Existing staff passwords must not be imported into the new authentication system.
- Existing assets are available in `internWeb` and `studentregistration/images`; the HTML's `picture/...` paths do not resolve at the supplied root.
- Legacy PDFs use different page geometry and layout. Preserve the content and intended branding, then verify new A4 output visually.

## Verified starting point

- Repository: `spstechdev-create/Offer-Letter-System`, currently a minimal initial commit; no application framework exists yet.
- Direct Neon query succeeds as `neondb_owner` against `neondb`.
- `.neon` identifies project `tiny-art-76325382` and branch name `dev-offer-letter`. Before any migration, verify that the actual database endpoint corresponds to the intended development branch; the local pointer alone does not prove this.
- Database catalogue inspection found `neon_auth` tables and no application tables. Authentication availability/configuration still needs an actual session-flow check.
- Neon management API access currently returns 401; direct database access is usable. Creating/resetting cloud branches would require restoring management authentication.
- GitHub push permission is verified. Vercel authentication is unresolved and is not a prerequisite for local development.

## Proposed product scope

### Registration

One responsive flow: student/contact details → local/international status → faculty and programme → attendance mode and delivery option → agent/event attribution → review → submit and receive a reference.

Use server-controlled catalogue IDs. Fees, duration, eligibility and valid combinations are resolved again on the server. Hidden fields and browser calculations are never authoritative. Keep entered data on validation errors; prevent duplicate submissions with an idempotency key.

Confirmed workflow: only signed-in staff or agents register students. There is no public registration entry point in the first version. A successful submission immediately generates a conditional offer; no staff review step is required.

### Staff workspace

- Sign-in, dashboard and searchable registration list.
- Student/application detail with programme, attribution and letter history.
- Review, amend and issue/download a conditional offer.
- Catalogue management for faculties, programmes, valid offerings and fee versions.
- Controlled letter settings for sessions, signatories, contacts and template versions.
- Roles: agents can register students and access their own submissions and letters; staff can manage registrations across agents; admins also manage catalogue, templates and account access. Agent access is provisioned deliberately. This visibility boundary is the proposed default, subject to later refinement.

### Letter workflow

Support three initial template variants: general Malay conditional offer, general English conditional offer, and FTMK conditional offer. Do not assume the general and FTMK templates can be collapsed without comparing their clauses.

Confirmed lifecycle: draft → submitted → issued, with conditional letter generation triggered immediately by a valid submission. No review queue gates issuance. Correction after issue creates a new version and marks the previous version superseded. Registration and letter issuance remain separate internal operations to support reliable retries. Record issuer, issue time, reference, template version and all rendered values.

Confirmed storage policy: never persist generated PDFs in database, object storage or the repository. View/download generates the PDF on demand from an immutable issuance snapshot stored as structured text data. Later changes to programme name, price, faculty, duration, student details, wording, contacts or signatory must not change a previously issued letter. Capture the full rendered values and immutable template version at issuance, and retain the referenced branding/font asset versions. Historical rendering must not substitute current catalogue values or today's date. This preserves issued content; exact PDF byte identity is not required.

A failed PDF generation leaves a retryable application rather than a duplicate registration or a falsely issued letter. Retrying View does not create a new letter version. An explicit authorized correction/reissue creates a separate snapshot and retains the original. Editing the current student record alone does not alter any issued snapshot.

### Database-driven navigation and access

Register every application page in a `pages` table with `page_key`, `title`, `route`, `icon`, `urutan`, optional `parent_id`, `is_active` and `show_in_sidebar`. Render sidebar entries from authorized active rows ordered by `urutan`, with a stable secondary key for ties. Detail pages can be registered without appearing in the sidebar. Actual route components remain application code; page registration does not execute arbitrary database-defined code.

Use configurable user levels (initially Admin, Staff and Agent), user-level assignments and explicit page/action grants. Permissions include view, create, edit, generate and manage. Do not assume numerical rank automatically grants all lower-level permissions. Enforce grants on server pages and every data/mutation/PDF endpoint, including direct URLs. The sidebar reflects permissions rather than acting as the security boundary. Default deny for unregistered or ungranted protected pages.

Admins can manage pages, grouping, labels, ordering and level grants through an administration screen. Record visibility is separately scoped to own, faculty or all registrations; initial defaults are agents seeing their own and staff seeing all. Protect access administration against accidental removal of the last usable admin account/access path.

### Confirmed administrative behaviour

- Authorized users can edit programme names, total fees, faculty, structure, supported modes, duration and active status. Keep fee change history with effective dates and actor; changes apply to future issuance, never historical snapshots.
- Audit student corrections with actor and time. Archive student/programme records rather than hard deleting referenced history.
- Pre-fill agent attribution from the signed-in account. Staff may register on behalf of an agent when explicitly permitted; record both the submitting account and attributed agent.
- Warn on matching IC/passport and reuse the student for another application when appropriate. Do not silently create a duplicate student or overwrite an issued letter.

## Data model proposal

| Entity | Purpose |
| --- | --- |
| Staff profile / role | Link authenticated identity to application permissions; no passwords in application tables. |
| User level / permission grant | Configurable levels, explicit page/action grants and own/faculty/all record scopes. |
| Page | Route registry, sidebar title/icon, parent grouping, `urutan`, active and sidebar visibility flags. |
| Faculty | Stable code, Malay/English names, active flag. |
| Programme | Stable code, faculty, bilingual title, degree level and academic structure. |
| Programme offering | Valid combination of programme, student category, attendance mode, delivery route, intake/session and duration. |
| Fee version | MYR decimal amount, explicit fee basis and effective dates attached to an offering. |
| Student | Name, category, identity document type/number, contact details and address. |
| Application | Student, selected offering, intake, state, source and submission reference; one student can have multiple applications. |
| Agent / event attribution | Agent name, faculty, code, event and event date. Preserve a submission snapshot even if optional master records change. |
| Letter template version | Language, template kind, approved wording/settings and branding references. |
| Issued letter | Application, unique reference, version, issuer, issue time and immutable rendering snapshot/template/asset versions. No stored PDF or PDF artifact reference. |
| Audit event | Actor, action, affected record and timestamp for important changes. Avoid copying sensitive fields into logs. |
| Import mapping / run | Source IDs, target IDs and reconciliation counts for repeatable migration. |

Separate degree level, academic structure (research/mixed/coursework), attendance (full/part time), and delivery (for example ODL). Open Access remains a source term needing definition. Do not merge Taught Course and Course Work automatically. Duration units and whether a fee represents a semester, annual amount or whole programme must be confirmed rather than inferred from a number.

Identity matching uses normalized document type/number, with country context for passports. Prevent accidental duplicate applications using an explicit programme/intake rule; do not prohibit a student from applying again in a different intake.

## Implementation architecture

Proposed starting stack: one TypeScript web application with Next.js for pages and server handlers, Neon Postgres for application data, Drizzle for versioned schema/migrations, and the existing managed Neon Auth if its sign-in flow is verified. Confirm supported package versions and integration details against official documentation at implementation time.

Use one repository and one deployable application. Keep database access, permissions, programme rules and letter generation behind server-only modules. Start with standard A4 PDF generation using a server-side PDF library and embedded fonts/assets; select the library after a small layout proof using all three template variants. Do not depend on a browser-only print action for issuance.

Preserve the configured Neon Auth rather than introducing a second identity provider. Verify callback/session configuration and provision staff deliberately; public signup must not confer staff privileges. If managed authentication is inaccessible, record the concrete blocker and resolve it before staff features are exposed.

## Catalogue and data reconciliation

1. Extract SQL catalogue and HTML catalogue into staging files with source provenance.
2. Produce a comparison report by faculty, programme, structure, student category and mode. Report unmatched names, conflicting fees/durations and unsupported combinations.
3. Preserve original labels; create canonical identifiers only after mapping is explicit. Do not choose HTML or SQL as the authoritative fee source automatically.
4. Seed only resolved offerings. Mark unresolved entries unavailable for issuance until reviewed.
5. Treat SQL student/staff records as potentially real data. Inspect structural counts and anomalies without publishing personal details; no bulk student import or credential import during scaffolding.
6. If historical student import is wanted, run a dry run, retain source IDs, report counts/rejections and use an idempotent import transaction. Existing records do not prove that a downloadable historical PDF was archived.

## Build sequence and completion gates

1. **Source audit and catalogue reconciliation.** Produce a source-to-feature matrix, clause inventory, asset inventory and catalogue conflict report. Resolve workflow choices that affect issuance. Gate: every legacy feature is carried forward, explicitly deferred or marked for clarification.
2. **Foundation.** Scaffold application, configure ignored local env, verify authentication, confirm development database target, add initial versioned migrations and resolved catalogue seed. Gate: app runs locally; protected routes enforce roles; migrations apply cleanly to the verified development target.
3. **First complete workflow.** Sign in as staff or agent; register one local student and one international student against valid offerings; save applications and immediately generate/download conditional PDFs; search and reopen permitted records. Gate: complete browser flows use live Neon data and server-derived fees; a refresh preserves records; agents cannot access other agents' records.
4. **Letter fidelity and reliability.** Implement all three template variants, snapshots, references, issue/reissue history and failed-generation retry. Gate: visually inspect generated A4 letters with long names, long addresses, multilingual characters and page breaks; later catalogue edits leave previous letters unchanged.
5. **Administration and attribution.** Add programme/fee editing, agent/event capture, intake/template settings and dashboard counts. Gate: totals match fixture data and permissions prevent unauthorized editing/issuance.
6. **Migration and release readiness.** Complete agreed import dry run, accessibility/mobile checks, build/type checks, critical integration tests and deployment instructions. Push reviewed work to SPS GitHub as implementation proceeds. Gate: repeatable setup, recoverable migrations, no secrets or personal data in commits, and hosting requirements documented.

First milestone is a working vertical flow, not a full dashboard shell. Each phase should leave a reviewable result.

## Essential verification

- Tampered fees, inactive offerings and invalid faculty/programme combinations are rejected or resolved from trusted data.
- Duplicate submit creates one application; failed PDF generation is retryable.
- Public/unauthorized identities cannot list students, edit fees, view signatures or issue letters.
- Local and international registrations retain correct identity fields and default letter languages.
- Fee changes affect new issuance only; reissue creates a distinct historical version.
- Changing a programme name or fee, student details, template or signatory leaves an existing letter's content unchanged when regenerated. View/download never persists a PDF.
- Sidebar ordering follows `urutan`; page visibility follows grants. Direct navigation and API calls enforce the same permissions and record scope.
- PDF output preserves wording, readable typography, branding, signature and footer without overlap.
- Import can be rerun without duplicating records; reconciliation explains every rejected row.

## Pending decisions

Confirmed by the user: only signed-in staff or agents submit registrations, and submission immediately generates a conditional letter. No public student registration or pre-issuance staff approval is required.

Also confirmed: editable catalogue/total fees; no stored PDFs; immutable original programme names/prices and other issued values; database-managed page ordering and user-level access; action permissions, audit history, archiving, automatic agent attribution, duplicate warnings and admin page management as described above.

Other decisions can be resolved during the source audit: authoritative current fees/programme names, meaning/availability of Open Access and ODL, duration units, intake/session configuration, whether historical student import is needed, and approval of letter wording/signatory. Legacy dates, contacts and eligibility thresholds are reference content rather than verified current policy.

Deferred unless requested: payments, email sending, final admission decisions, student accounts, agent commission calculations, a public offer verification service and integration with the university admissions portal. The existing portal links remain configurable outbound links.
