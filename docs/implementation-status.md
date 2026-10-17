# Implementation status — 17 October 2026

Implemented in the SPS repository and connected to the verified existing Neon development endpoint. Application migrations add tables without changing `neon_auth`. The initial Admin identity has been provisioned through Managed Auth.

The unified workflow, immutable letter snapshots, on-demand PDF rendering, catalogue editing, staff/agent access, dynamic sidebar/pages, level/action grants, user administration, settings, student corrections/archive and reissue history are implemented. No generated PDF is stored.

Successful validation includes production build, TypeScript checks, core PDF/validation tests, live authentication and workflow tests, catalogue-edit invariance, database immutability, and agent/direct-URL access controls. Labelled QA students were archived; their immutable test snapshots remain available under Include archived.

Source reconciliation produced 208 offerings. The 31 conflicting offerings remain inactive pending administrator review. Existing branding and letter text are historical sources; operational policy and signatory review is still needed. Email reset delivery and external deployment remain unverified. No historical student import has been requested or performed.

The implementation plan is retained as the original agreed baseline; this file records execution rather than rewriting planning history.

## Faculty administration and UI revision

Replaced the original styling with readable light/dark/system themes and persistent appearance selection. Added an official-source faculty/institute directory and a faculty browser for the programme catalogue, with filtering, pagination and an editor backed by faculty IDs.

Migration 0002 creates the faculty registry and backfills programme, application and user foreign keys without touching issued snapshots. Migration 0003 binds the FTMK template to its stable faculty identity. Live lifecycle checks confirm rename/code edits, retirement/restore, historical PDF preservation and faculty access after renames. Mobile views fit a 390px viewport; theme persistence was verified after reload.
