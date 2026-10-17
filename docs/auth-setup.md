# Staff and agent authentication

This app uses the project's existing Managed Neon Auth service. Authentication establishes the identity; the matching `app_users` row determines whether the account is active, its level, and its record scope. An identity without an active application account has no application access.

Public signup through `/api/auth/sign-up/*` is disabled. Provision users using the operator command below. Passwords and session tokens are never stored in application tables, and the app never writes directly to `neon_auth` tables.

Administrators with the `users.manage` permission can also create an account in the app. The server calls Managed Auth, assigns the selected level's default scope, and records an audit event. A new account's provider cookies are never forwarded to the administrator's browser. Existing identities are not overwritten or reset; an operator must link them using their existing credentials. Provider email verification settings still apply.

## Environment

Keep these server variables in the ignored `.env.local` file and set the same variables on the deployed app:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Existing pooled Neon connection string. |
| `NEON_AUTH_BASE_URL` | Existing branch Managed Auth URL, including its `/auth` path. |
| `NEON_AUTH_COOKIE_SECRET` | Unique cryptographic secret, at least 32 characters. Keep it stable between runs. |
| `APP_URL` | The application's origin. Local development defaults to `http://localhost:3000`. |

Register production and preview origins in the correct branch's Auth trusted domains before deployment. Localhost origins are normally allowed. Use a trusted domain with a scheme and no trailing slash.

## Provision a user

Run migrations and seed the catalogue/access levels before provisioning. Use a terminal with the following environment variables set privately, then run `npm run user:provision`:

| Variable | Value |
| --- | --- |
| `SPS_USER_EMAIL` | Account email. |
| `SPS_USER_NAME` | Display name. |
| `SPS_USER_LEVEL` | Existing level ID: initially `admin`, `staff`, or `agent`. |
| `SPS_USER_PASSWORD` | Unique password of at least 12 characters. Do not put it in command arguments or Git. |

The command first tries the supplied credentials against Managed Auth. For a new identity it creates the account using the managed signup API. Existing identities must authenticate successfully before they can be linked. It then creates or updates the application account and copies the level's default scope. Running it for an existing account deliberately changes that account's level and reactivates it. The command never sends credential, reset, or OTP messages itself.

For the initial administrator only, the local bootstrap process can read `SPS_BOOTSTRAP_PASSWORD` from ignored `.env.local` instead of `SPS_USER_PASSWORD`. This password must not be committed or included in logs. An operator can retrieve it locally, sign in, and arrange a password change through Managed Auth. Remove the bootstrap variable after it is no longer needed.

The user can also choose **Forgot password?** on the login screen or open `/reset-password`, enter their email, and press **Send reset link**. A link with a token opens the new-password form. Merely opening these pages sends no email. Email delivery depends on the branch's SMTP and trusted-domain settings; production delivery needs verification before rollout.

If email verification is enabled on the Neon branch, the user must complete the provider's verification step before sign-in. Signup and reset email delivery are controlled by the branch settings; do not disable verification to bypass it. A provider failure leaves application access unassigned; fix the provider or use the correct existing password and rerun the command.

## Server and browser integration

- `src/lib/auth.ts` exports the managed `auth` instance and `getSessionUser(): Promise<{ id, email, name } | null>`.
- `src/app/api/auth/[...path]/route.ts` keeps session cookies on the application's origin through the managed Next.js proxy.
- Browser components use `createAuthClient()` from `@neondatabase/auth/next` with no arguments.
- Every protected read and mutation must look up the active `app_users` row and enforce page/action permissions. Hiding navigation is not authorization.
- Logout ends the browser session. It does not immediately revoke every JWT issued before logout.

## Verification

Read-only service checks completed against the existing branch on 17 October 2026: `/ok` returned HTTP 200, an unauthenticated `/get-session` returned HTTP 200 with `null`, and the OpenAPI schema endpoint returned HTTP 200. No identity or student data was read for these checks.

The initial administrator was provisioned and direct managed password sign-in returned HTTP 200. The local auth smoke check then passed at `http://localhost:3000`, covering first-party cookies, session restoration, authorized administrator bootstrap, public signup denial, direct unauthorized denial, and logout. The branch rejected `http://127.0.0.1:3000` as an untrusted origin, so use `localhost` for local development or explicitly register another origin.

After provisioning, verify password sign-in, session restoration after reload, logout, and direct unauthenticated API denial in the running app. Confirm that inactive or unprovisioned identities cannot read application data and that an agent cannot read another agent's records. Email verification, password reset, and production domain delivery need separate verification when those flows are configured.

With the application running and `SPS_USER_EMAIL` set to the administrator account, run `node --env-file=.env.local scripts/smoke-auth.mjs`. It reads the supplied password privately, checks unauthorized access, public signup denial, sign-in, session cookies, administrator bootstrap, reload-equivalent access, and logout. Override the test origin with `SPS_SMOKE_APP_URL` if necessary. It logs pass/fail labels without credentials, cookies, or student records.

Sources: [Neon Next.js API quickstart](https://neon.com/docs/auth/quick-start/nextjs-api-only), [trusted domains](https://neon.com/docs/auth/guides/configure-domains), and [production checklist](https://neon.com/docs/auth/production-checklist).
