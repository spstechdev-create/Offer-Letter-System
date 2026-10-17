# SPS Registration & Conditional Offers

One Next.js application combining the supplied registration systems and conditional offer generators, backed by the existing Neon Postgres and Managed Neon Auth services.

## Implemented

- Signed-in staff/agent registration with immediate conditional offer issuance.
- Local/international programme offerings, agent/event attribution, duplicate identity warning and scoped student records.
- On-demand Malay/English and FTMK Master conditional PDFs. **No PDF files are stored.** Immutable database snapshots preserve the original programme name, price, student details, signatory, issue date and template/branding version.
- Student corrections, archive/restore, original letter history and explicit corrected-letter issuance.
- Editable catalogue names, fees, durations, faculty, structure, attendance and delivery, with fee history and explicit source reconciliation for conflicting offerings.
- Database-driven pages and sidebar ordering (`urutan`), per-level page/action grants, own/faculty/all record visibility, user provisioning and custom user levels.
- Letter defaults administration and activity audit history.

## Local setup

Use Node.js 20.9+ and npm. The current checkout already has ignored local credentials configured; do not replace `.env.local` with the example.

```powershell
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:3000**. The existing Auth branch trusts `localhost`; it currently rejects the `127.0.0.1` origin. The server binds to the loopback interface.

For a fresh checkout, copy `.env.example` to `.env.local`, supply the Neon database/auth configuration and a cryptographically random cookie secret of at least 32 characters. Migrations explicitly verify the intended Neon project/branch before applying. Seeds preserve edited catalogue and permission rows on repeat runs. Never run `drizzle-kit push` against this database.

An initial Admin account has been provisioned for the requested email. Its generated initial password is in the ignored `.env.local` as `SPS_BOOTSTRAP_PASSWORD`; it is never committed or printed by scripts. Use the password reset screen to choose a personal password after the branch's email delivery is configured. Reset-link delivery was not exercised; Managed Auth may require custom SMTP for links. Production domains also require Auth trusted-domain configuration.

Admins can add accounts under **Users & levels**. For operator provisioning:

```powershell
$env:SPS_USER_EMAIL = 'staff@example.com'
$env:SPS_USER_NAME = 'Staff member'
$env:SPS_USER_LEVEL = 'staff'
# Set SPS_USER_PASSWORD privately to a unique password of at least 12 characters.
npm run user:provision
```

## Verification

```powershell
npm run typecheck
npm test
npm run build
$env:SPS_USER_EMAIL = 'your-admin-email'
node --env-file=.env.local scripts/smoke-auth.mjs
node --env-file=.env.local scripts/smoke-workflow.mjs
node --env-file=.env.local scripts/smoke-permissions.mjs
```

The workflow check creates two fictitious `QA TEST` registrations and archives their student records afterward; their immutable test letter data is retained by design. It restores programme/page settings that it temporarily changes. The permission check temporarily changes the test administrator's scope and fixture ownership, restoring them in `finally`; use a development environment without concurrent operational activity.

Verified: managed sign-in/session restoration/logout; public signup denial; local/international registration; server-derived fees; repeat submission reuse; on-demand PDFs; catalogue rename/fee edits preserving original PDF content; database rejection of letter mutation; page ordering/grant changes; agent record isolation; direct API permission denial. Desktop and 390px mobile layouts were inspected. PDF layout was checked with Malay/English, long text, and page breaks.

## Source data and remaining operational setup

The seed contains **208 offerings**, with **31 inactive due to conflicting historical source data**. Resolve these through the catalogue editor using [the source audit](docs/source-audit.md) and [the reconciliation details](data/catalogue-audit.json). Available legacy values are not a verification of current university policy. Review letter wording, signatory, branding, fees and intake before operational use. No legacy students or plaintext staff passwords were imported.

ODL/Open Access availability is intentionally not inferred from incomplete legacy UI options. Historical student migration is not run because it has not been requested. Payments, final admission decisions, public student registration and automated email delivery are outside this version.

For hosting, use a Node-capable Next.js host with these environment variables; no persistent filesystem or object-storage service is needed. Vercel deployment has not been performed. Versioned PDF assets are bundled through Next.js file tracing. Keep old template implementations and asset versions when introducing new versions. The legacy signature asset is server-only, outside `public/`.

## Main files

- `src/db/schema.ts` and `drizzle/`: versioned schema/migrations.
- `src/lib/access.ts`: server authorization and record scopes.
- `src/app/api/register/route.ts`: atomic registration and immutable issuance.
- `src/lib/pdf.ts`: versioned PDF renderer; in-memory bytes only.
- `src/components/workspace.tsx`: staff/agent workspace; navigation from database rows.
- `docs/implementation-plan.md`: agreed scope and architecture.
