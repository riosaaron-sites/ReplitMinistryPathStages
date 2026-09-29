#!/usr/bin/env tsx
/**
 * One-time migration: convert MinistryPath from single-tenant to multi-tenant.
 *
 * This must run BEFORE `npm run db:push` is used to apply the new
 * `shared/schema.ts` (which declares `organizationId` as NOT NULL on every
 * tenant table). Postgres can't add a NOT NULL column with no default to a
 * table that already has rows, so this script does the unsafe part by hand:
 *
 *   1. Create the `organizations` table and insert one row for the existing
 *      church ("Garden City Church" by default, or whatever org_settings /
 *      OWNER_EMAIL implies).
 *   2. Add `organization_id` as a NULLABLE column to every tenant table.
 *   3. Backfill every existing row to point at that one organization.
 *   4. Verify zero NULLs remain, then set the column NOT NULL.
 *   5. Drop the old single-column unique constraints that are being replaced
 *      by per-organization composite uniques (ministries.slug, etc.) so a
 *      later `drizzle-kit push` can create the new composite constraints
 *      without a name collision.
 *   6. Point organizations.owner_id at the existing owner user.
 *
 * After this script succeeds, run `npm run db:push` to let Drizzle add the
 * foreign keys, indexes, and composite unique constraints declared in
 * shared/schema.ts (safe now that every row has a valid organization_id).
 *
 * Usage: npm run db:migrate-tenant
 */
import { pool } from "../db";

// Every table that gets a new `organization_id` column. Must match the list
// added to shared/schema.ts. `sessions`, `help_articles`, and
// `password_reset_tokens` are intentionally excluded (they stay global).
const TENANT_TABLES = [
  "users", "role_assignments", "doctrine_documents", "doctrine_acknowledgments",
  "agreement_content", "onboarding_progress", "survey_progress", "survey_results",
  "integration_settings", "service_assignments", "calendar_categories", "notifications",
  "calendar_events", "role_permissions", "ministries", "ministry_leaders",
  "ministry_leadership_assignments", "ministry_memberships", "training_modules",
  "training_assessments", "user_training_progress", "badges", "user_badges", "xp_logs",
  "rooms", "resources", "room_reservations", "attendance_reports", "weekly_ministry_metrics",
  "metrics_reminders", "support_requests", "intern_profiles", "intern_logs", "meetings",
  "meeting_notes", "meeting_feedback", "meeting_action_items", "meeting_attendance",
  "background_checks", "team_join_requests", "messages", "manuals", "user_availability",
  "team_invites", "ministry_selections", "onboarding_steps", "quiz_questions", "quiz_attempts",
  "recurring_activities", "metrics_submissions", "audit_logs", "user_archives",
  "ministry_archives", "room_layouts", "manual_analysis", "onboarding_training_requirements",
  "admin_tags", "serve_roles", "staff_titles", "global_labels", "pastoral_questions",
  "ministry_join_requests", "workboards", "action_items", "action_item_comments",
  "serving_records", "leader_notes", "member_feedback", "org_settings",
];

// Tables whose old single-column unique constraint is being replaced by a
// per-organization composite unique (see shared/schema.ts). We drop the old
// constraint dynamically (by looking up its real name) so drizzle-kit push
// can add the new composite constraint afterward without a name collision.
const SINGLE_COLUMN_UNIQUES_TO_DROP: { table: string; column: string }[] = [
  { table: "ministries", column: "slug" },
  { table: "training_modules", column: "slug" },
  { table: "calendar_categories", column: "slug" },
  { table: "badges", column: "slug" },
  { table: "agreement_content", column: "step_number" },
  { table: "admin_tags", column: "name" },
  { table: "serve_roles", column: "name" },
  { table: "staff_titles", column: "name" },
  { table: "global_labels", column: "key" },
];

const DEFAULT_ORG_NAME = "Garden City Church";

async function tableExists(table: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return rows.length > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return rows.length > 0;
}

async function ensureOrganizationsTable(): Promise<void> {
  if (await tableExists("organizations")) {
    console.log("[migrate] organizations table already exists, skipping create");
    return;
  }
  console.log("[migrate] creating organizations table");
  await pool.query(`
    CREATE TABLE organizations (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar NOT NULL,
      slug varchar NOT NULL UNIQUE,
      status varchar DEFAULT 'active',
      owner_id varchar,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )
  `);
}

async function ensureDefaultOrganization(): Promise<string> {
  const { rows: existing } = await pool.query(
    `SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1`
  );
  if (existing.length > 0) {
    console.log(`[migrate] using existing organization ${existing[0].id} as tenant #1`);
    return existing[0].id;
  }

  let orgName = DEFAULT_ORG_NAME;
  if (await tableExists("org_settings")) {
    const { rows } = await pool.query(
      `SELECT organization_name FROM org_settings LIMIT 1`
    );
    if (rows[0]?.organization_name) {
      orgName = rows[0].organization_name;
    }
  }

  const baseSlug = orgName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "ministry";
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;

  const { rows } = await pool.query(
    `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
    [orgName, slug]
  );
  const orgId = rows[0].id;
  console.log(`[migrate] created organization "${orgName}" (${orgId}) as tenant #1`);
  return orgId;
}

async function addNullableOrgColumn(table: string): Promise<void> {
  if (!(await tableExists(table))) {
    console.warn(`[migrate] table "${table}" does not exist, skipping`);
    return;
  }
  if (await columnExists(table, "organization_id")) {
    console.log(`[migrate] ${table}.organization_id already exists, skipping add`);
    return;
  }
  await pool.query(`ALTER TABLE "${table}" ADD COLUMN organization_id varchar`);
  console.log(`[migrate] added nullable organization_id to ${table}`);
}

async function backfillOrgColumn(table: string, orgId: string): Promise<void> {
  if (!(await tableExists(table)) || !(await columnExists(table, "organization_id"))) return;
  const { rowCount } = await pool.query(
    `UPDATE "${table}" SET organization_id = $1 WHERE organization_id IS NULL`,
    [orgId]
  );
  if (rowCount && rowCount > 0) {
    console.log(`[migrate] backfilled ${rowCount} rows in ${table}`);
  }
}

async function verifyNoNulls(table: string): Promise<void> {
  if (!(await tableExists(table)) || !(await columnExists(table, "organization_id"))) return;
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n FROM "${table}" WHERE organization_id IS NULL`
  );
  if (rows[0].n > 0) {
    throw new Error(`[migrate] ${table} still has ${rows[0].n} rows with NULL organization_id after backfill`);
  }
}

async function setNotNull(table: string): Promise<void> {
  if (!(await tableExists(table)) || !(await columnExists(table, "organization_id"))) return;
  await pool.query(`ALTER TABLE "${table}" ALTER COLUMN organization_id SET NOT NULL`);
  console.log(`[migrate] set ${table}.organization_id NOT NULL`);
}

async function dropSingleColumnUnique(table: string, column: string): Promise<void> {
  if (!(await tableExists(table))) return;
  // Find a unique constraint on exactly this one column (by name, not assuming Drizzle's naming).
  const { rows } = await pool.query(
    `
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = $1
      AND con.contype = 'u'
      AND con.conkey = ARRAY[(
        SELECT attnum FROM pg_attribute
        WHERE attrelid = rel.oid AND attname = $2
      )]::smallint[]
    `,
    [table, column]
  );
  for (const row of rows) {
    await pool.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${row.conname}"`);
    console.log(`[migrate] dropped single-column unique constraint ${row.conname} on ${table}.${column}`);
  }
  if (rows.length === 0) {
    console.log(`[migrate] no single-column unique constraint found on ${table}.${column} (already dropped or never existed)`);
  }
}

async function setOrganizationOwner(orgId: string): Promise<void> {
  const { rows } = await pool.query(
    `SELECT id FROM users WHERE role = 'owner' OR role = 'system-admin' ORDER BY created_at ASC LIMIT 1`
  );
  if (rows.length === 0) {
    console.warn("[migrate] no owner/system-admin user found; organizations.owner_id left unset");
    return;
  }
  await pool.query(`UPDATE organizations SET owner_id = $1 WHERE id = $2`, [rows[0].id, orgId]);
  console.log(`[migrate] set organizations.owner_id = ${rows[0].id}`);
}

async function main() {
  console.log("[migrate] starting multi-tenant migration");

  await ensureOrganizationsTable();
  const orgId = await ensureDefaultOrganization();

  for (const table of TENANT_TABLES) {
    await addNullableOrgColumn(table);
  }
  for (const table of TENANT_TABLES) {
    await backfillOrgColumn(table, orgId);
  }
  for (const table of TENANT_TABLES) {
    await verifyNoNulls(table);
  }
  for (const table of TENANT_TABLES) {
    await setNotNull(table);
  }
  for (const { table, column } of SINGLE_COLUMN_UNIQUES_TO_DROP) {
    await dropSingleColumnUnique(table, column);
  }
  await setOrganizationOwner(orgId);

  console.log("[migrate] done. Next: run `npm run db:push` to add foreign keys,");
  console.log("[migrate] indexes, and the new per-organization composite unique constraints.");
  await pool.end();
}

main().catch((err) => {
  console.error("[migrate] FAILED:", err);
  process.exit(1);
});
