import {
  pgTable,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
export const userLevels = pgTable("user_levels", {
  id: text().primaryKey(),
  name: text().notNull(),
  scope: text().notNull().default("own"),
});
export const appUsers = pgTable("app_users", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  level_id: text()
    .notNull()
    .references(() => userLevels.id),
  scope: text().notNull().default("own"),
  faculty_code: text(),
  active: boolean().notNull().default(true),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
export const pages = pgTable("pages", {
  id: text().primaryKey(),
  page_key: text().notNull().unique(),
  title: text().notNull(),
  route: text().notNull(),
  icon: text().notNull(),
  urutan: integer().notNull(),
  parent_id: text(),
  is_active: boolean().notNull().default(true),
  show_in_sidebar: boolean().notNull().default(true),
});
export const pageGrants = pgTable(
  "page_grants",
  {
    id: uuid().primaryKey().defaultRandom(),
    page_id: text()
      .notNull()
      .references(() => pages.id),
    level_id: text()
      .notNull()
      .references(() => userLevels.id),
    actions: jsonb().$type<string[]>().notNull(),
  },
  (t) => [uniqueIndex("page_level_unique").on(t.page_id, t.level_id)],
);
export const catalogue = pgTable("catalogue", {
  id: text().primaryKey(),
  code: text().notNull(),
  name: text().notNull(),
  faculty: text().notNull(),
  category: text().notNull(),
  attendance: text().notNull(),
  structure: text().notNull(),
  delivery: text().notNull().default("campus"),
  duration: text().notNull(),
  total_fee: numeric({ precision: 12, scale: 2 }).notNull(),
  is_active: boolean().notNull().default(false),
  needs_review: boolean().notNull().default(false),
  source: jsonb(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
export const feeHistory = pgTable("fee_history", {
  id: uuid().primaryKey().defaultRandom(),
  catalogue_id: text()
    .notNull()
    .references(() => catalogue.id),
  old_fee: numeric({ precision: 12, scale: 2 }),
  new_fee: numeric({ precision: 12, scale: 2 }).notNull(),
  actor_id: text()
    .notNull()
    .references(() => appUsers.id),
  effective_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
export const students = pgTable(
  "students",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    document_type: text().notNull(),
    document_number: text().notNull(),
    category: text().notNull(),
    email: text().notNull(),
    phone: text().notNull(),
    address: text().notNull(),
    archived: boolean().notNull().default(false),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("student_document_unique").on(
      t.document_type,
      t.document_number,
    ),
  ],
);
export const applications = pgTable(
  "applications",
  {
    id: uuid().primaryKey().defaultRandom(),
    student_id: uuid()
      .notNull()
      .references(() => students.id),
    catalogue_id: text()
      .notNull()
      .references(() => catalogue.id),
    created_by: text()
      .notNull()
      .references(() => appUsers.id),
    reference: text().notNull().unique(),
    idempotency_key: text().notNull(),
    status: text().notNull().default("issued"),
    agent_name: text(),
    agent_code: text(),
    event_name: text(),
    event_date: text(),
    faculty_snapshot: text().notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("application_idempotency_unique").on(
      t.created_by,
      t.idempotency_key,
    ),
  ],
);
export const issuedLetters = pgTable(
  "issued_letters",
  {
    id: uuid().primaryKey().defaultRandom(),
    application_id: uuid()
      .notNull()
      .references(() => applications.id),
    version: integer().notNull().default(1),
    snapshot: jsonb().notNull(),
    issued_by: text()
      .notNull()
      .references(() => appUsers.id),
    issued_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("application_letter_version_unique").on(
      t.application_id,
      t.version,
    ),
  ],
);
export const auditEvents = pgTable("audit_events", {
  id: uuid().primaryKey().defaultRandom(),
  actor_id: text().references(() => appUsers.id),
  action: text().notNull(),
  entity_type: text().notNull(),
  entity_id: text().notNull(),
  details: jsonb(),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
export const settings = pgTable("app_settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
});
