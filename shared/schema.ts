import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =============================================================================
// MINISTRYPATH - USER ROLES HIERARCHY (Phase 6)
// =============================================================================
// Clean role hierarchy with clear authority levels:
// 1. owner     - Organization creator, can manage everything including other owners
// 2. admin     - System control, full backend access, no pastoral authority
// 3. pastor    - Spiritual authority, oversight, care access, can view "I Have Questions"
// 4. leader    - Ministry leadership, training oversight for assigned people
// 5. member    - Dream Team Member / Active Volunteer
// 6. intern    - Limited authority, in training
// 7. attendee  - Regular church attendee, no serving roles

export const USER_ROLES = [
  // Primary roles (clean hierarchy)
  'owner',                     // Organization owner - highest authority
  'admin',                     // System administrator - full backend access
  'pastor',                    // Pastoral staff - spiritual oversight & care
  'leader',                    // Ministry/team leaders
  'member',                    // Dream Team member / volunteer
  'intern',                    // Interns - limited authority
  'attendee',                  // Regular church attendee
  // Legacy roles (kept for backwards compatibility - map to primary roles)
  'system-admin',              // -> maps to owner
  'lead-pastor',               // -> maps to pastor
  'board-of-elders',           // -> maps to pastor
  'leadership-team',           // -> maps to leader
  'ministry-leader',           // -> maps to leader
  'active-church-participant', // -> maps to member
  'regular-attendee',          // -> maps to attendee
  'dream-team',                // -> maps to member
] as const;

export type UserRole = typeof USER_ROLES[number];

// Maps legacy roles to new primary roles
export const ROLE_MAPPING: Record<string, UserRole> = {
  'system-admin': 'owner',
  'lead-pastor': 'pastor',
  'board-of-elders': 'pastor',
  'leadership-team': 'leader',
  'ministry-leader': 'leader',
  'active-church-participant': 'member',
  'regular-attendee': 'attendee',
  'dream-team': 'member',
};

// Get normalized role (maps legacy roles to new ones)
export function getNormalizedRole(role: string | null | undefined): UserRole {
  if (!role) return 'attendee';
  if (ROLE_MAPPING[role]) return ROLE_MAPPING[role];
  if (USER_ROLES.includes(role as UserRole)) return role as UserRole;
  return 'attendee';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  // Primary roles
  'owner': 'Owner',
  'admin': 'Administrator',
  'pastor': 'Pastor',
  'leader': 'Leader',
  'member': 'Dream Team Member',
  'intern': 'Intern',
  'attendee': 'Attendee',
  // Legacy labels
  'system-admin': 'System Administrator',
  'lead-pastor': 'Lead Pastor',
  'board-of-elders': 'Board of Elders',
  'leadership-team': 'Leadership Team',
  'ministry-leader': 'Ministry Leader',
  'active-church-participant': 'Dream Team Member',
  'regular-attendee': 'Regular Attendee',
  'dream-team': 'Dream Team',
};

// Role hierarchy levels (higher = more authority)
export const ROLE_HIERARCHY: Record<string, number> = {
  'owner': 100,
  'system-admin': 100,
  'admin': 90,
  'pastor': 80,
  'lead-pastor': 80,
  'board-of-elders': 75,
  'leader': 60,
  'leadership-team': 60,
  'ministry-leader': 60,
  'member': 40,
  'active-church-participant': 40,
  'dream-team': 40,
  'intern': 30,
  'attendee': 10,
  'regular-attendee': 10,
};

// =============================================================================
// ROLE PERMISSION GROUPS
// =============================================================================

// Owner roles - can manage organization, other owners, everything
export const OWNER_ROLES: UserRole[] = ['owner', 'system-admin'];

// Admin roles - full backend access, system control
export const ADMIN_ROLES: UserRole[] = ['owner', 'admin', 'system-admin'];

// Pastoral roles - spiritual oversight, can view "I Have Questions", care access
// Note: 'admin' is excluded - admins have system control but no pastoral authority
export const PASTORAL_ROLES: UserRole[] = [
  'owner', 'pastor', 'system-admin', 'lead-pastor', 'board-of-elders'
];

// Leadership roles - can access leadership portal, manage their people/ministries
export const LEADERSHIP_ROLES: UserRole[] = [
  'owner',
  'admin',
  'pastor',
  'leader',
  'system-admin',
  'lead-pastor',
  'board-of-elders',
  'leadership-team',
  'ministry-leader',
];

// Member roles - can serve, access member features
export const MEMBER_ROLES: UserRole[] = [
  ...LEADERSHIP_ROLES,
  'member',
  'intern',
  'active-church-participant',
  'dream-team',
];

// Roles that require doctrine acknowledgment before serving
export const ROLES_REQUIRING_DOCTRINE_ACK: UserRole[] = [
  'pastor',
  'leader',
  'member',
  'lead-pastor',
  'board-of-elders',
  'leadership-team',
  'ministry-leader',
];

// Helper functions for role checks
export function isOwner(role: string | null | undefined): boolean {
  return OWNER_ROLES.includes(getNormalizedRole(role) as UserRole);
}

export function isAdmin(role: string | null | undefined): boolean {
  return ADMIN_ROLES.includes(getNormalizedRole(role) as UserRole);
}

export function isPastor(role: string | null | undefined): boolean {
  return PASTORAL_ROLES.includes(getNormalizedRole(role) as UserRole);
}

export function isLeader(role: string | null | undefined): boolean {
  return LEADERSHIP_ROLES.includes(getNormalizedRole(role) as UserRole);
}

export function isMember(role: string | null | undefined): boolean {
  return MEMBER_ROLES.includes(getNormalizedRole(role) as UserRole);
}

export function getRoleHierarchyLevel(role: string | null | undefined): number {
  if (!role) return 0;
  return ROLE_HIERARCHY[role] || 0;
}

export function canManageRole(managerRole: string | null | undefined, targetRole: string | null | undefined): boolean {
  const managerLevel = getRoleHierarchyLevel(managerRole);
  const targetLevel = getRoleHierarchyLevel(targetRole);
  return managerLevel > targetLevel;
}

// =============================================================================
// ONBOARDING STATE - Step-based progression
// =============================================================================

export const ONBOARDING_STATE = [
  'AUTH',              // Just authenticated, needs profile setup
  'WELCOME',           // Welcome screen - introduction to MinistryPath
  'PROFILE',           // Setting up profile (name, username, bio, links, role)
  'LEADERSHIP',        // Leadership self-identification - "Do you lead a ministry?"
  'MINISTRIES',        // Selecting ministries (led/served) - Leaders/Pastors only can self-add
  'FAITH_COMMITMENT',  // Completing faith modules (doctrine, about us, core values)
  'PHOTO',             // Upload profile photo (conditional - only if missing)
  'CLASS_STATUS',      // Capturing Next Night / Following Jesus status
  'DONE',              // Onboarding complete, dashboard unlocked
] as const;

export type OnboardingState = typeof ONBOARDING_STATE[number];

// Legacy onboarding status (for backward compatibility)
export const ONBOARDING_STATUS = [
  'not-started',
  'in-progress',
  'completed',
  'blocked',
] as const;

export type OnboardingStatus = typeof ONBOARDING_STATUS[number];

// =============================================================================
// AUTH PROVIDER
// =============================================================================

export const AUTH_PROVIDER = [
  'local',    // Email/password auth
  'google',   // Google OAuth
  'apple',    // Apple OAuth
  'replit',   // Replit OAuth
  'mixed',    // Multiple providers linked
] as const;

export type AuthProvider = typeof AUTH_PROVIDER[number];

// =============================================================================
// CLASS STATUS - Next Night / Following Jesus completion
// =============================================================================

export const CLASS_STATUS = [
  'COMPLETE',
  'INCOMPLETE',
  'SCHEDULED',
  'UNKNOWN',
] as const;

export type ClassStatus = typeof CLASS_STATUS[number];

// =============================================================================
// ACP ELIGIBILITY STATUS
// =============================================================================

export const ACP_STATUS = [
  'not-eligible',
  'eligible',
  'pending-review',
  'approved',
] as const;

export type ACPStatus = typeof ACP_STATUS[number];

// =============================================================================
// MINISTRY PATH STATUS - Discipleship Journey
// =============================================================================

export const MINISTRY_PATH_STATUS = [
  'not-started',
  'in-progress',
  'complete',
] as const;

export type MinistryPathStatus = typeof MINISTRY_PATH_STATUS[number];

export const DISCIPLESHIP_STEPS = [
  { id: 'worship', title: 'Worship', description: 'Join us for a Sunday Service', icon: 'music' },
  { id: 'next-night', title: 'Next Night', description: 'Learn who we are; commit to community', icon: 'users' },
  { id: 'learn', title: 'Learn', description: 'Learn about God through our discipleship classes', icon: 'book-open' },
  { id: 'love', title: 'Love', description: 'Demonstrate love through service and CORE Groups', icon: 'heart' },
  { id: 'lead', title: 'Lead', description: 'Guide others in their discipleship journey', icon: 'compass' },
] as const;

export type DiscipleshipStepId = typeof DISCIPLESHIP_STEPS[number]['id'];

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Auth fields
  username: varchar("username"),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"), // null if OAuth-only
  authProvider: varchar("auth_provider").default('replit'), // local, google, apple, replit, mixed
  // Profile fields
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  sex: varchar("sex"),
  bio: text("bio"),
  socialLinks: jsonb("social_links").default({}),
  profileCompletedAt: timestamp("profile_completed_at"),
  planningCenterPersonId: varchar("planning_center_person_id"),
  // Role and onboarding
  role: varchar("role").default('dream-team'), // dream-team, leader, pastor (admin is elevated flag)
  onboardingState: varchar("onboarding_state").default('AUTH'), // AUTH, PROFILE, MINISTRIES, FAITH_COMMITMENT, CLASS_STATUS, DONE
  onboardingStatus: varchar("onboarding_status").default('not-started'), // Legacy field
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  // Ministry assignments (stored as arrays for quick access)
  ledMinistryIds: jsonb("led_ministry_ids").$type<string[]>().default([]),
  servedMinistryIds: jsonb("served_ministry_ids").$type<string[]>().default([]),
  // Required classes tracking
  nextNightStatus: varchar("next_night_status").default('UNKNOWN'), // COMPLETE, INCOMPLETE, SCHEDULED, UNKNOWN
  followingJesusStatus: varchar("following_jesus_status").default('UNKNOWN'), // COMPLETE, INCOMPLETE, SCHEDULED, UNKNOWN
  nextNightCompletedAt: timestamp("next_night_completed_at"),
  followingJesusCompletedAt: timestamp("following_jesus_completed_at"),
  nextNightSetBy: varchar("next_night_set_by"), // admin user id who marked complete
  followingJesusSetBy: varchar("following_jesus_set_by"), // admin user id who marked complete
  // ACP status
  acpStatus: varchar("acp_status").default('not-eligible'),
  acpApprovedAt: timestamp("acp_approved_at"),
  isOver18: boolean("is_over_18"),
  attendingSince: timestamp("attending_since"),
  isGivingRegularly: boolean("is_giving_regularly"),
  isServingActive: boolean("is_serving_active"),
  isWaterBaptized: boolean("is_water_baptized"),
  isSpiritBaptized: boolean("is_spirit_baptized"),
  isSeekingSpiritBaptism: boolean("is_seeking_spirit_baptism"),
  // Discipleship pathway fields
  hasAttendedSunday: boolean("has_attended_sunday").default(false),
  hasAttendedNextNight: boolean("has_attended_next_night").default(false),
  learnStatus: varchar("learn_status").default('not-started'),
  loveStatus: varchar("love_status").default('not-started'),
  leadStatus: varchar("lead_status").default('not-started'),
  ministryPathLastUpdated: timestamp("ministry_path_last_updated"),
  // Leadership lock fields (H1)
  isLeaderLocked: boolean("is_leader_locked").default(false), // True if user self-identified as leader during onboarding
  // Invitation tracking
  invitedBy: varchar("invited_by"), // User ID who invited this person (for referral tracking)
  // Status and archive fields
  status: varchar("status").default('active'),
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by"),
  // Admin bypass mode (developer preview)
  adminBypassMode: boolean("admin_bypass_mode").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Social links structure
export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
}

// Profile completion requirements
export const PROFILE_REQUIREMENTS_STATUS = [
  'not-started',
  'photo-needed',
  'bio-needed',
  'complete',
] as const;

export type ProfileRequirementsStatus = typeof PROFILE_REQUIREMENTS_STATUS[number];

// =============================================================================
// ROLE ASSIGNMENTS - Track ministry/role assignments
// =============================================================================

// Role types for ministry assignments
export const ROLE_TYPES = ['leader', 'member'] as const;
export type RoleType = typeof ROLE_TYPES[number];

export const roleAssignments = pgTable("role_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  ministryId: varchar("ministry_id").notNull(),
  roleType: varchar("role_type").default('member'), // 'leader' or 'member'
  roleName: varchar("role_name"), // e.g. "Volunteer", "Team Lead", "Director"
  roleTitle: varchar("role_title"), // e.g. "Worship Vocalist", "Sound Tech"
  responsibilities: text("responsibilities"), // What they do / duties
  keySkills: jsonb("key_skills").$type<string[]>(), // Skills required for this role
  requirements: text("requirements"), // Requirements for the role
  reportsToUserId: varchar("reports_to_user_id").references(() => users.id), // Who they report to
  assignedBy: varchar("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  concludedAt: timestamp("concluded_at"), // When they stopped serving
  isActive: boolean("is_active").default(true),
});

export const insertRoleAssignmentSchema = createInsertSchema(roleAssignments).omit({
  id: true,
  assignedAt: true,
});

export type InsertRoleAssignment = z.infer<typeof insertRoleAssignmentSchema>;
export type RoleAssignment = typeof roleAssignments.$inferSelect;

// =============================================================================
// DOCTRINE DOCUMENTS - Versioned policy documents
// =============================================================================

export const doctrineDocuments = pgTable("doctrine_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  version: varchar("version").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  isActive: boolean("is_active").default(true),
  requiresAcknowledgment: boolean("requires_acknowledgment").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDoctrineDocumentSchema = createInsertSchema(doctrineDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDoctrineDocument = z.infer<typeof insertDoctrineDocumentSchema>;
export type DoctrineDocument = typeof doctrineDocuments.$inferSelect;

// =============================================================================
// DOCTRINE ACKNOWLEDGMENTS - Track who has acknowledged which documents
// =============================================================================

export const doctrineAcknowledgments = pgTable("doctrine_acknowledgments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentId: varchar("document_id").notNull().references(() => doctrineDocuments.id),
  documentVersion: varchar("document_version").notNull(),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow(),
  ipAddress: varchar("ip_address"),
});

export const insertDoctrineAcknowledgmentSchema = createInsertSchema(doctrineAcknowledgments).omit({
  id: true,
  acknowledgedAt: true,
});

export type InsertDoctrineAcknowledgment = z.infer<typeof insertDoctrineAcknowledgmentSchema>;
export type DoctrineAcknowledgment = typeof doctrineAcknowledgments.$inferSelect;

// =============================================================================
// FAITH COMMITMENT ONBOARDING - Track onboarding wizard progress
// =============================================================================

export const ONBOARDING_STEPS = [
  { id: 1, title: 'Scripture & Authority', description: 'The Bible as God\'s inspired Word' },
  { id: 2, title: 'Nature of God', description: 'The Trinity - Father, Son, Holy Spirit' },
  { id: 3, title: 'Jesus Christ', description: 'Deity, Cross, Resurrection, Return' },
  { id: 4, title: 'Salvation', description: 'By grace through faith' },
  { id: 5, title: 'Baptism in the Holy Spirit', description: 'Doctrinal alignment and experience' },
  { id: 6, title: 'Sanctity of Life', description: 'Respecting life from conception' },
  { id: 7, title: 'Sexuality & Marriage', description: 'Biblical marriage covenant' },
  { id: 8, title: 'Sobriety', description: 'Living free from intoxication' },
  { id: 9, title: 'Majors & Minors', description: 'Unity on essentials, grace on non-essentials' },
  { id: 10, title: 'Social Media & Representation', description: 'Public witness and alignment' },
  { id: 11, title: 'Final Commitment', description: 'Overall alignment with church doctrine' },
] as const;

export const onboardingProgress = pgTable("onboarding_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  currentStep: integer("current_step").notNull().default(1),
  stepResponses: jsonb("step_responses").notNull().default({}),
  spiritBaptismExperience: jsonb("spirit_baptism_experience").default({}),
  isComplete: boolean("is_complete").notNull().default(false),
  isBlocked: boolean("is_blocked").notNull().default(false),
  blockedAtStep: integer("blocked_at_step"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOnboardingProgressSchema = createInsertSchema(onboardingProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOnboardingProgress = z.infer<typeof insertOnboardingProgressSchema>;
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;

// Survey progress - allows users to save and resume
export const surveyProgress = pgTable("survey_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  currentSection: integer("current_section").notNull().default(1),
  currentQuestion: integer("current_question").notNull().default(0),
  answers: jsonb("answers").notNull().default({}),
  isComplete: boolean("is_complete").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSurveyProgressSchema = createInsertSchema(surveyProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSurveyProgress = z.infer<typeof insertSurveyProgressSchema>;
export type SurveyProgress = typeof surveyProgress.$inferSelect;

// Survey results - stores completed survey outcomes
export const surveyResults = pgTable("survey_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  spiritualGifts: jsonb("spiritual_gifts").notNull(),
  personalityProfile: jsonb("personality_profile").notNull(),
  biblicalLiteracy: jsonb("biblical_literacy").notNull(),
  technicalSkills: jsonb("technical_skills").notNull(),
  ministryMatches: jsonb("ministry_matches").notNull(),
  rawAnswers: jsonb("raw_answers").notNull(),
  emailSent: boolean("email_sent").notNull().default(false),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const insertSurveyResultsSchema = createInsertSchema(surveyResults).omit({
  id: true,
  completedAt: true,
});

export type InsertSurveyResults = z.infer<typeof insertSurveyResultsSchema>;
export type SurveyResults = typeof surveyResults.$inferSelect;

// =============================================================================
// SPIRITUAL GIFTS - All Biblical Lists
// =============================================================================

// 1 Corinthians 12:8-10 - Manifestation Gifts
export const MANIFESTATION_GIFTS = [
  'word-of-wisdom',
  'word-of-knowledge', 
  'faith',
  'healing',
  'miracles',
  'prophecy',
  'discernment',
  'tongues',
  'interpretation-of-tongues',
] as const;

// Romans 12:3-8 - Motivational Gifts
export const MOTIVATIONAL_GIFTS = [
  'service',
  'teaching',
  'exhortation',
  'giving',
  'leadership',
  'mercy',
] as const;

// Ephesians 4:11 - Ministry Offices
export const MINISTRY_OFFICES = [
  'apostleship',
  'prophet',
  'evangelist',
  'pastor-shepherd',
  'teacher',
] as const;

// Additional NT Gifts
export const ADDITIONAL_GIFTS = [
  'administration',
  'helps',
  'hospitality',
  'intercession',
  'reconciliation',
  'compassion',
] as const;

// Combined all spiritual gifts
export const SPIRITUAL_GIFTS = [
  ...MANIFESTATION_GIFTS,
  ...MOTIVATIONAL_GIFTS,
  ...MINISTRY_OFFICES,
  ...ADDITIONAL_GIFTS,
] as const;

export type SpiritualGift = typeof SPIRITUAL_GIFTS[number];

export interface GiftScore {
  gift: SpiritualGift;
  score: number;
  name: string;
  description: string;
  biblicalReference: string;
  biblicalExample: string;
  howYouOperate: string;
  ministryFit: string[];
  teamCulture: string;
}

// =============================================================================
// DISC PERSONALITY TYPES
// =============================================================================

export const DISC_TYPES = ['D', 'I', 'S', 'C'] as const;
export type DISCType = typeof DISC_TYPES[number];

export interface DISCProfile {
  primaryType: DISCType;
  secondaryType: DISCType | null;
  scores: {
    D: number;
    I: number;
    S: number;
    C: number;
  };
  strengths: string[];
  weaknesses: string[];
  bestTeamEnvironments: string[];
  worstTeamEnvironments: string[];
  communicationStyle: string;
  decisionMaking: string;
  description: string;
}

// =============================================================================
// BIBLICAL LITERACY LEVELS
// =============================================================================

// New 3-level system: Low, Developing, Strong
export const LITERACY_LEVELS = [
  'low',
  'developing',
  'strong',
] as const;

export type LiteracyLevel = typeof LITERACY_LEVELS[number];

// Per-bucket score interface
export interface LiteracyBucketScore {
  bucket: LiteracyBucket;
  bucketName: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface BiblicalLiteracyResult {
  level: LiteracyLevel;
  levelName: string;
  score: number;
  maxScore: number;
  percentage: number;
  totalQuestions: number;
  correctAnswers: number;
  bucketScores: LiteracyBucketScore[];
  description: string;
  encouragement: string;
  recommendations: string[];
  nextSteps: string[];
  discipleshipFocus: string;
}

// =============================================================================
// TECHNICAL SKILL ASSESSMENTS
// =============================================================================

export const SKILL_LEVELS = [
  'beginner',
  'growing-learner',
  'competent',
  'skilled',
] as const;

export type SkillLevel = typeof SKILL_LEVELS[number];

export interface TechnicalSkillResult {
  category: string;
  level: SkillLevel;
  score: number;
  description: string;
  canServe: boolean;
  needsTraining: boolean;
  encouragement: string;
}

export interface TechnicalSkillsProfile {
  soundTech: TechnicalSkillResult;
  mediaTech: TechnicalSkillResult;
  proPresenter: TechnicalSkillResult;
  photography: TechnicalSkillResult;
  overallReadiness: string;
}

// =============================================================================
// SEX IDENTIFICATION (for ministry filtering)
// =============================================================================

export const SEX_OPTIONS = ['male', 'female'] as const;
export type Sex = typeof SEX_OPTIONS[number];

// Ministries that are restricted by sex
export const FEMALE_ONLY_MINISTRIES = ['nursery'] as const;

// =============================================================================
// MINISTRY TYPES
// =============================================================================

export const MINISTRIES = [
  { id: 'greeters', name: 'Greeters', category: 'First Impressions' },
  { id: 'welcome-table', name: 'Welcome / Guest Table', category: 'First Impressions' },
  { id: 'landing-team', name: 'The Landing Team', category: 'First Impressions' },
  { id: 'ushers', name: 'Ushers', category: 'Service Support' },
  { id: 'security', name: 'Security', category: 'Service Support' },
  { id: 'transportation', name: 'Transportation', category: 'Outreach' },
  { id: 'cafe', name: 'Café / Hospitality', category: 'Hospitality' },
  { id: 'facilities', name: 'Facilities / Setup / Cleaning', category: 'Operations' },
  { id: 'worship', name: 'Worship Team', category: 'Worship Arts' },
  { id: 'sound', name: 'Sound', category: 'Media / Production' },
  { id: 'lyrics', name: 'Lyrics / ProPresenter', category: 'Media / Production' },
  { id: 'livestream', name: 'Live Stream / Video', category: 'Media / Production' },
  { id: 'visual-art', name: 'Visual Art', category: 'Creative Arts' },
  { id: 'graphic-design', name: 'Graphic Design', category: 'Creative Arts' },
  { id: 'dance', name: 'Dance', category: 'Creative Arts' },
  { id: 'drama', name: 'Drama / Spoken Word', category: 'Creative Arts' },
  { id: 'photography', name: 'Photography / Videography', category: 'Creative Arts' },
  { id: 'teaching', name: 'Teaching / Discipleship', category: 'Discipleship' },
  { id: 'youth', name: 'Youth Ministry', category: 'Next Gen' },
  { id: 'children', name: "Children's Ministry", category: 'Next Gen' },
  { id: 'nursery', name: 'Nursery', category: 'Next Gen' },
  { id: 'young-adults', name: 'Young Adults', category: 'Life Stage' },
  { id: 'outreach', name: 'Outreach / Evangelism', category: 'Outreach' },
  { id: 'prayer-team', name: 'Prayer Team / Intercession', category: 'Prayer' },
  { id: 'altar-ministry', name: 'Altar Ministry', category: 'Prayer' },
  { id: 'griefshare', name: 'GriefShare', category: 'Support Groups' },
  { id: 'celebrate-recovery', name: 'Celebrate Recovery', category: 'Support Groups' },
] as const;

export type MinistryId = typeof MINISTRIES[number]['id'];

export interface MinistryMatch {
  ministryId: MinistryId;
  name: string;
  category: string;
  score: number;
  description: string;
  whyMatched: string;
  strengthsYouBring: string[];
  teamCultureFit: string;
  nextSteps: string;
  isPrimary: boolean;
  requiresSkillVerification?: boolean;
  growthPathway?: string;
  leadershipPathway?: string;
}

// =============================================================================
// MINISTRY ELIGIBILITY (for qualification/disqualification logic)
// =============================================================================

export interface MinistryEligibility {
  childrenMinistry: {
    eligible: boolean;
    score: number;
    concerns: string[];
    recommendation: string;
  };
  youthMinistry: {
    eligible: boolean;
    score: number;
    concerns: string[];
    recommendation: string;
  };
  griefShare: {
    eligible: boolean;
    score: number;
    leadershipPotential: boolean;
    recommendation: string;
  };
  celebrateRecovery: {
    eligible: boolean;
    score: number;
    leadershipPotential: boolean;
    recommendation: string;
  };
  landingTeam: {
    eligible: boolean;
    score: number;
    recommendation: string;
  };
}

// =============================================================================
// SURVEY SECTIONS
// =============================================================================

export const SURVEY_SECTIONS = [
  { id: 0, title: 'About You', questionCount: 1 },
  { id: 1, title: 'Spiritual Gifts', questionCount: 30 },
  { id: 2, title: 'Biblical Literacy', questionCount: 12 },
  { id: 3, title: 'DISC Personality', questionCount: 16 },
  { id: 4, title: 'Ministry Skills', questionCount: 12 },
  { id: 5, title: 'Sound & Media Tech', questionCount: 12 },
  { id: 6, title: 'Team Fit & Preferences', questionCount: 8 },
  { id: 7, title: 'Children & Youth Ministry', questionCount: 15 },
  { id: 8, title: 'Support Group Ministry', questionCount: 12 },
  { id: 9, title: 'Availability', questionCount: 5 },
] as const;

export type SectionId = typeof SURVEY_SECTIONS[number]['id'];

// =============================================================================
// QUESTION TYPES
// =============================================================================

export type QuestionType = 
  | 'likert' 
  | 'multiple-choice' 
  | 'yes-no' 
  | 'scenario'
  | 'knowledge-check'
  | 'rating';

// Biblical Literacy Buckets
export const LITERACY_BUCKETS = [
  'bible-basics',
  'story-timeline',
  'jesus-salvation',
  'how-to-read',
] as const;

export type LiteracyBucket = typeof LITERACY_BUCKETS[number];

// Biblical Literacy Difficulty
export const LITERACY_DIFFICULTIES = ['easy', 'medium', 'challenge'] as const;
export type LiteracyDifficulty = typeof LITERACY_DIFFICULTIES[number];

export interface Question {
  id: string;
  section: SectionId;
  text: string;
  type: QuestionType;
  options?: { value: string | number; label: string }[];
  giftWeights?: Partial<Record<SpiritualGift, number>>;
  discWeights?: Partial<Record<DISCType, number>>;
  literacyCorrectAnswer?: string | number;
  literacyPoints?: number;
  literacyBucket?: LiteracyBucket;
  literacyDifficulty?: LiteracyDifficulty;
  skillCategory?: 'sound' | 'media' | 'propresenter' | 'photography';
  skillPoints?: number;
  ministryWeights?: Partial<Record<MinistryId, number>>;
  conditionalTrigger?: string;
  conditionalSex?: Sex;
  helpText?: string;
  qualificationCategory?: 'children' | 'youth' | 'griefshare' | 'celebrate-recovery' | 'landing-team';
  qualificationWeight?: number;
  disqualifyingAnswer?: string | number | boolean;
}

// Answer type
export interface SurveyAnswers {
  [questionId: string]: string | number | boolean;
}

// =============================================================================
// PLANNING CENTER INTEGRATION
// =============================================================================

export const integrationSettings = pgTable("integration_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationName: varchar("integration_name").notNull(),
  isEnabled: boolean("is_enabled").default(false),
  credentials: jsonb("credentials").default({}),
  lastSyncAt: timestamp("last_sync_at"),
  syncStatus: varchar("sync_status").default('never'),
  syncError: text("sync_error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIntegrationSettingsSchema = createInsertSchema(integrationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertIntegrationSettings = z.infer<typeof insertIntegrationSettingsSchema>;
export type IntegrationSettings = typeof integrationSettings.$inferSelect;

// Planning Center credentials structure
export interface PlanningCenterCredentials {
  applicationId: string;
  secret: string;
}

// Service assignments cached from Planning Center
export const serviceAssignments = pgTable("service_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  planningCenterScheduleId: varchar("pc_schedule_id"),
  planningCenterServiceId: varchar("pc_service_id"),
  serviceTypeName: varchar("service_type_name"),
  serviceName: varchar("service_name"),
  teamName: varchar("team_name"),
  positionName: varchar("position_name"),
  scheduledDate: timestamp("scheduled_date"),
  scheduledTime: varchar("scheduled_time"),
  status: varchar("status").default('pending'),
  respondedAt: timestamp("responded_at"),
  needsResponse: boolean("needs_response").default(false),
  notes: text("notes"),
  syncedAt: timestamp("synced_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertServiceAssignmentSchema = createInsertSchema(serviceAssignments).omit({
  id: true,
  createdAt: true,
  syncedAt: true,
});

export type InsertServiceAssignment = z.infer<typeof insertServiceAssignmentSchema>;
export type ServiceAssignment = typeof serviceAssignments.$inferSelect;

export const SERVICE_ASSIGNMENT_STATUS = [
  'pending',
  'confirmed',
  'declined',
  'unconfirmed',
] as const;

export type ServiceAssignmentStatus = typeof SERVICE_ASSIGNMENT_STATUS[number];

// =============================================================================
// CALENDAR CATEGORIES (Dynamic, Admin-Editable)
// =============================================================================

export const CATEGORY_TYPES = [
  'MINISTRY',   // Men's, Women's, Youth, Kids, etc.
  'SERVICE',    // Sunday Service, Prayer Night, etc.
  'GROUP',      // Regular Sunday, Special Sunday, Super Sunday
  'TAG',        // Misc tags
] as const;

export type CategoryType = typeof CATEGORY_TYPES[number];

export const calendarCategories = pgTable("calendar_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  type: varchar("type").notNull().default('TAG'),
  color: varchar("color").default('#3B82F6'),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  outlookCategoryName: varchar("outlook_category_name"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCalendarCategorySchema = createInsertSchema(calendarCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCalendarCategory = z.infer<typeof insertCalendarCategorySchema>;
export type CalendarCategory = typeof calendarCategories.$inferSelect;

// =============================================================================
// NOTIFICATIONS (Leader Alerts, Team Updates)
// =============================================================================

export const NOTIFICATION_TYPES = [
  'TEAM_JOINED',
  'ONBOARDING_STARTED',
  'ONBOARDING_COMPLETED',
  'TRAINING_SUBMITTED',
  'TRAINING_APPROVED',
  'TRAINING_REJECTED',
  'new-training-required',
  'training-completed',
  'join-request-approved',
  'join-request-declined',
  'new-team-member',
  'manual-uploaded',
  'badge-earned',
  'xp-milestone',
  'message-received',
  'general',
  'GENERAL',
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(),
  title: varchar("title").notNull(),
  message: text("message"),
  data: jsonb("data").default({}),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  link: varchar("link"),
  ministryId: varchar("ministry_id"),
  actorUserId: varchar("actor_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// =============================================================================
// MINISTRY CALENDAR EVENTS
// =============================================================================

export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  eventType: varchar("event_type").default('general'),
  priority: varchar("priority").default('meaningful'),
  serviceCategory: varchar("service_category"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  allDay: boolean("all_day").default(false),
  location: varchar("location"),
  ministryId: varchar("ministry_id"),
  roomId: varchar("room_id"),
  resourcesNeeded: jsonb("resources_needed").default([]),
  createdBy: varchar("created_by").references(() => users.id),
  approvalStatus: varchar("approval_status").default('pending'),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: varchar("recurrence_rule"),
  planningCenterId: varchar("planning_center_id"),
  isFromPlanningCenter: boolean("is_from_planning_center").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

export const EVENT_TYPES = [
  'general',
  'service',
  'rehearsal',
  'meeting',
  'training',
  'outreach',
  'fellowship',
] as const;

export type EventType = typeof EVENT_TYPES[number];

// =============================================================================
// ENHANCED CALENDAR - EVENT PRIORITIES & SERVICE CATEGORIES
// =============================================================================

export const EVENT_PRIORITIES = [
  'mission-critical',      // Sunday Experience, Discipleship, Next Gen, Leadership Training
  'important-strategic',   // 21 Days of Fasting, Training events, Missions, Outreach
  'meaningful',            // Men & Women's events, Parenting, Marriage
  'low-priority',          // Operation Christmas Child, Easter Egg Hunt, "just for fun"
] as const;

export type EventPriority = typeof EVENT_PRIORITIES[number];

export const EVENT_PRIORITY_LABELS: Record<EventPriority, string> = {
  'mission-critical': 'Mission Critical - "If we do not do this, we fail"',
  'important-strategic': 'Important & Strategic - "Major contributors to the mission"',
  'meaningful': 'Meaningful, but Not Essential - "We like it, but not essential"',
  'low-priority': 'Low Priority - "Externally initiated or distractions"',
};

export const SERVICE_CATEGORIES = [
  'standard',   // Normal Sunday services, Communion, basic schedule
  'special',    // Guest speakers, Vision Sunday, Baptism services, Mother's/Father's Day
  'super',      // Easter, Christmas, Potluck Sundays, Mission Fairs
] as const;

export type ServiceCategory = typeof SERVICE_CATEGORIES[number];

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  'standard': 'Category 1: Standard Service - Normal services, low budget',
  'special': 'Category 2: Special Service - Guest speakers, dedications, moderate planning',
  'super': 'Category 3: Super Service - Easter, Christmas, high budget/volunteers',
};

// =============================================================================
// PERMISSIONS SYSTEM (RBAC)
// =============================================================================

export const PERMISSIONS = [
  // User management
  'users.view', 'users.edit', 'users.delete', 'users.manage-roles',
  // Ministry management
  'ministries.view', 'ministries.edit', 'ministries.manage-volunteers',
  // Training management
  'training.view', 'training.create', 'training.edit', 'training.approve',
  // Calendar management
  'calendar.view', 'calendar.create', 'calendar.edit', 'calendar.approve',
  // Rooms & Resources
  'rooms.view', 'rooms.manage', 'resources.view', 'resources.manage',
  // Metrics & Attendance
  'metrics.view', 'metrics.submit', 'metrics.manage',
  // Request Center
  'requests.view', 'requests.create', 'requests.approve', 'requests.manage',
  // Intern Portal
  'interns.view', 'interns.manage',
  // Meeting Dashboard
  'meetings.view', 'meetings.create', 'meetings.manage',
  // Survey management
  'survey.view-results', 'survey.manage',
  // Admin
  'admin.full-access',
] as const;

export type Permission = typeof PERMISSIONS[number];

export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: varchar("role").notNull(),
  permission: varchar("permission").notNull(),
  grantedBy: varchar("granted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
});

export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

// =============================================================================
// MINISTRIES TABLE (Enhanced)
// =============================================================================

export const ministries = pgTable("ministries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  category: varchar("category").notNull(),
  description: text("description"),
  parentMinistryId: varchar("parent_ministry_id"), // For hierarchy: Landing Team -> Greeters, First Impressions, etc.
  leaderId: varchar("leader_id").references(() => users.id), // Legacy single leader (kept for backwards compatibility)
  expectations: jsonb("expectations").$type<string[]>(), // 3-5 bullet point expectations for members
  requiresBackgroundCheck: boolean("requires_background_check").default(false),
  requiresSpiritBaptism: boolean("requires_spirit_baptism").default(false),
  requiresHolySpiritClass: boolean("requires_holy_spirit_class").default(false),
  minimumAge: integer("minimum_age"),
  isActive: boolean("is_active").default(true),
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by"),
  canBeDeleted: boolean("can_be_deleted").default(true),
  editLockDate: timestamp("edit_lock_date"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMinistrySchema = createInsertSchema(ministries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMinistry = z.infer<typeof insertMinistrySchema>;
export type Ministry = typeof ministries.$inferSelect;

// =============================================================================
// MINISTRY LEADERS (Multiple leaders per ministry)
// =============================================================================

export const ministryLeaders = pgTable("ministry_leaders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ministryId: varchar("ministry_id").notNull().references(() => ministries.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role").default("leader"), // 'leader', 'co-leader', 'assistant'
  isPrimary: boolean("is_primary").default(false), // Primary contact for the ministry
  addedBy: varchar("added_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMinistryLeaderSchema = createInsertSchema(ministryLeaders).omit({
  id: true,
  createdAt: true,
});

export type InsertMinistryLeader = z.infer<typeof insertMinistryLeaderSchema>;
export type MinistryLeader = typeof ministryLeaders.$inferSelect;

// =============================================================================
// MINISTRY LEADERSHIP ASSIGNMENTS (H1 - Primary/Secondary Leaders)
// =============================================================================
// New table for Leadership Lock feature - supports Primary/Secondary leader types
// with lock protection and audit trail

export const LEADERSHIP_TYPES = ['primary', 'secondary'] as const;
export type LeadershipType = typeof LEADERSHIP_TYPES[number];

export const ministryLeadershipAssignments = pgTable("ministry_leadership_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ministryId: varchar("ministry_id").notNull().references(() => ministries.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  leadershipType: varchar("leadership_type").notNull().default('primary'), // 'primary' or 'secondary'
  isPrimary: boolean("is_primary").notNull().default(true), // Computed from leadershipType for quick access
  isLocked: boolean("is_locked").notNull().default(false), // True if set via onboarding self-identification
  isActive: boolean("is_active").notNull().default(true),
  assignedBy: varchar("assigned_by").references(() => users.id), // Who created this assignment
  assignedAt: timestamp("assigned_at").defaultNow(),
  removedBy: varchar("removed_by").references(() => users.id),
  removedAt: timestamp("removed_at"),
  removalReason: varchar("removal_reason"), // 'swapped', 'stepped_down', 'admin_removed'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMinistryLeadershipAssignmentSchema = createInsertSchema(ministryLeadershipAssignments).omit({
  id: true,
  assignedAt: true,
  createdAt: true,
});

export type InsertMinistryLeadershipAssignment = z.infer<typeof insertMinistryLeadershipAssignmentSchema>;
export type MinistryLeadershipAssignment = typeof ministryLeadershipAssignments.$inferSelect;

// =============================================================================
// MINISTRY MEMBERSHIPS (H1 - Serving/Participant Tracking)
// =============================================================================
// Distinct from leadership - tracks members who serve in ministries
// Self-exclusion rule: Users cannot be members of ministries they lead

export const MEMBERSHIP_STATUS = ['active', 'inactive', 'pending', 'removed'] as const;
export type MembershipStatus = typeof MEMBERSHIP_STATUS[number];

export const ministryMemberships = pgTable("ministry_memberships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ministryId: varchar("ministry_id").notNull().references(() => ministries.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status").notNull().default('active'), // active, inactive, pending, removed
  roleTitle: varchar("role_title"), // Optional role within ministry (e.g., "Vocalist", "Sound Tech")
  joinedAt: timestamp("joined_at").defaultNow(),
  joinedVia: varchar("joined_via").default('onboarding'), // onboarding, invite, request, admin
  invitedBy: varchar("invited_by").references(() => users.id), // Who invited them to join
  removedAt: timestamp("removed_at"),
  removedBy: varchar("removed_by").references(() => users.id),
  removalReason: varchar("removal_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMinistryMembershipSchema = createInsertSchema(ministryMemberships).omit({
  id: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMinistryMembership = z.infer<typeof insertMinistryMembershipSchema>;
export type MinistryMembership = typeof ministryMemberships.$inferSelect;

// =============================================================================
// TRAINING MODULES
// =============================================================================

// Training audience types
export const TRAINING_AUDIENCE = [
  'all',           // Required for all Dream Team (members, leaders, pastors)
  'member',        // Required for Dream Team members only
  'leader',        // Required for leaders and pastors
  'pastor',        // Required for pastors only
  'ministry',      // Required for specific ministry members
] as const;

export type TrainingAudience = typeof TRAINING_AUDIENCE[number];

// Training progress status values with clear state machine
// Note: The actual TRAINING_STATUS array is defined after userTrainingProgress table

export const trainingModules = pgTable("training_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  slug: varchar("slug").notNull().unique(),
  ministryId: varchar("ministry_id").references(() => ministries.id),
  manualId: varchar("manual_id"),  // Links to source manual for auto-generated trainings
  sourceCategory: varchar("source_category"),  // ministry_manual, leadership_training, resource
  description: text("description"),
  lessonSummary: text("lesson_summary"),  // AI-generated lesson summary (legacy)
  content: jsonb("content").default([]),  // Array of sections (legacy)
  lessons: jsonb("lessons").default([]),  // Deep lessons array (8-12 lessons)
  studyQuestions: jsonb("study_questions").default([]),  // AI-generated study questions (legacy)
  knowledgeCheckQuestions: jsonb("knowledge_check_questions").default([]),  // Light knowledge check (8-15 questions)
  intensiveAssessmentQuestions: jsonb("intensive_assessment_questions").default([]),  // Scenario-based assessment (10-20 questions)
  reflectionPrompt: text("reflection_prompt"),  // Final reflection prompt
  estimatedMinutes: integer("estimated_minutes").default(30),
  passingScore: integer("passing_score").default(70),  // Default 70% for intensive assessment
  xpReward: integer("xp_reward").default(100),
  badgeId: varchar("badge_id"),
  pathStep: varchar("path_step"),  // Links to discipleship path: 'learn', 'love', or 'lead'
  audience: varchar("audience").default('all'),  // who is required to take this training
  videoUrl: varchar("video_url"),  // Optional video URL for video-ready trainings
  isRequired: boolean("is_required").default(false),
  isPublished: boolean("is_published").default(false),  // Only published trainings are visible
  isActive: boolean("is_active").default(true),
  isAutoGenerated: boolean("is_auto_generated").default(false),  // True if generated from manual
  isDeepTraining: boolean("is_deep_training").default(false),  // True if has full 8-12 lesson structure
  requiresApproval: boolean("requires_approval").default(true),  // If true, leader must approve completion
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTrainingModuleSchema = createInsertSchema(trainingModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;
export type TrainingModule = typeof trainingModules.$inferSelect;

// Training module content structure (legacy)
export interface TrainingSection {
  id: string;
  title: string;
  content: string;
  videoUrl?: string;
  scriptureReferences?: string[];
}

// Deep Training Lesson Structure (Phase 2)
export interface DeepLesson {
  id: string;
  lessonNumber: number;
  title: string;
  teachingContent: string;  // Clear paragraphs, not bullet-only
  whyThisMatters: string;   // Why this matters in serving/church culture
  reflectionPrompt: string; // Short reflection prompt for this lesson
  scriptureReferences?: string[]; // Only if present in manual or clearly required
}

// Knowledge Check Question (light assessment)
export interface KnowledgeCheckQuestion {
  id: string;
  questionType: 'multiple-choice' | 'short-answer';
  question: string;
  options?: string[];  // For multiple choice
  correctAnswer: string;
  explanation: string;
}

// Intensive Assessment Question (scenario-based)
export interface IntensiveAssessmentQuestion {
  id: string;
  questionType: 'scenario' | 'application' | 'multiple-choice';
  scenario?: string;  // For scenario-based questions
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  weight: number;  // Points for this question
}

// Training assessments (questions for each module)
export const trainingAssessments = pgTable("training_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleId: varchar("module_id").notNull().references(() => trainingModules.id),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type").default('multiple-choice'),
  options: jsonb("options").default([]),
  correctAnswer: varchar("correct_answer").notNull(),
  explanation: text("explanation"),
  weight: integer("weight").default(1),
  sortOrder: integer("sort_order").default(0),
});

export const insertTrainingAssessmentSchema = createInsertSchema(trainingAssessments).omit({
  id: true,
});

export type InsertTrainingAssessment = z.infer<typeof insertTrainingAssessmentSchema>;
export type TrainingAssessment = typeof trainingAssessments.$inferSelect;

// User training progress
export const userTrainingProgress = pgTable("user_training_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  moduleId: varchar("module_id").notNull().references(() => trainingModules.id),
  status: varchar("status").default('not-started'),
  progressPercent: integer("progress_percent").default(0),
  currentSection: integer("current_section").default(0),
  currentLesson: integer("current_lesson").default(0),  // For deep training lesson tracking
  lessonsCompleted: jsonb("lessons_completed").$type<string[]>().default([]),  // Array of completed lesson IDs
  lessonReflections: jsonb("lesson_reflections").default({}),  // Map of lessonId -> reflection text
  knowledgeCheckScore: integer("knowledge_check_score"),  // Score on knowledge check
  knowledgeCheckAnswers: jsonb("knowledge_check_answers").default([]),  // User's answers
  intensiveAssessmentScore: integer("intensive_assessment_score"),  // Score on intensive assessment
  intensiveAssessmentAnswers: jsonb("intensive_assessment_answers").default([]),  // User's answers
  assessmentScore: integer("assessment_score"),  // Legacy field
  finalReflection: text("final_reflection"),  // Final reflection text (visible to leaders/admins)
  attempts: integer("attempts").default(0),
  completedAt: timestamp("completed_at"),
  submittedAt: timestamp("submitted_at"),       // Phase 3: When user submitted for approval
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedBy: varchar("rejected_by").references(() => users.id),  // Phase 3: Who rejected
  rejectedAt: timestamp("rejected_at"),         // Phase 3: When rejected
  rejectionFeedback: text("rejection_feedback"), // Phase 3: Leader feedback on why rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserTrainingProgressSchema = createInsertSchema(userTrainingProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserTrainingProgress = z.infer<typeof insertUserTrainingProgressSchema>;
export type UserTrainingProgress = typeof userTrainingProgress.$inferSelect;

export const TRAINING_STATUS = [
  'not-started',        // Initial state
  'in-progress',        // User has started but not finished
  'assessment-pending', // Legacy: taking quiz
  'submitted',          // User completed, awaiting leader approval (when requiresApproval=true)
  'approved',           // Leader approved (final state for approval-required trainings)
  'rejected',           // Leader rejected, user must resubmit
  'completed',          // Auto-completed (only for trainings with requiresApproval=false)
  'failed',             // Legacy: quiz failed
] as const;

export type TrainingStatus = typeof TRAINING_STATUS[number];

// Status transitions that are allowed - enforced server-side
export const TRAINING_STATUS_TRANSITIONS: Record<TrainingStatus, TrainingStatus[]> = {
  'not-started': ['in-progress'],
  'in-progress': ['submitted', 'completed', 'assessment-pending'],  // completed only if requiresApproval=false
  'assessment-pending': ['submitted', 'completed', 'failed', 'in-progress'],
  'submitted': ['approved', 'rejected'],       // only leader can transition
  'approved': [],                              // final state
  'rejected': ['in-progress', 'submitted'],    // user can retry
  'completed': [],                             // final state
  'failed': ['in-progress', 'assessment-pending'],  // user can retry
};

// Statuses that count as "training completed" for metrics/progress
export const TRAINING_COMPLETED_STATUSES: TrainingStatus[] = ['completed', 'approved'];

// =============================================================================
// GAMIFICATION SYSTEM
// =============================================================================

// Badges
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  description: text("description"),
  iconUrl: varchar("icon_url"),
  iconName: varchar("icon_name"),
  category: varchar("category").default('achievement'),
  rarity: varchar("rarity").default('common'),
  xpValue: integer("xp_value").default(0),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
});

export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badges.$inferSelect;

// User Badges
export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  badgeId: varchar("badge_id").notNull().references(() => badges.id),
  earnedAt: timestamp("earned_at").defaultNow(),
  awardedBy: varchar("awarded_by").references(() => users.id),
});

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  earnedAt: true,
});

export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;

// XP Logs
export const xpLogs = pgTable("xp_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  reason: varchar("reason").notNull(),
  sourceType: varchar("source_type"),  // training, event, service, badge
  sourceId: varchar("source_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertXpLogSchema = createInsertSchema(xpLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertXpLog = z.infer<typeof insertXpLogSchema>;
export type XpLog = typeof xpLogs.$inferSelect;

// Discipleship Levels
export const DISCIPLESHIP_LEVELS = [
  { level: 1, name: 'Explorer', xpRequired: 0 },
  { level: 2, name: 'Participant', xpRequired: 500 },
  { level: 3, name: 'Volunteer', xpRequired: 1500 },
  { level: 4, name: 'Core Servant', xpRequired: 4000 },
  { level: 5, name: 'Ministry Leader', xpRequired: 10000 },
  { level: 6, name: 'Leadership Track', xpRequired: 25000 },
] as const;

export type DiscipleshipLevel = typeof DISCIPLESHIP_LEVELS[number];

// =============================================================================
// ROOMS & RESOURCES
// =============================================================================

export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  capacity: integer("capacity"),
  description: text("description"),
  location: varchar("location"),
  amenities: jsonb("amenities").default([]),
  layoutPresets: jsonb("layout_presets").default([]),
  isActive: boolean("is_active").default(true),
  isArchived: boolean("is_archived").default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by"),
  hasHistoricalData: boolean("has_historical_data").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;

// Resources (equipment, supplies)
export const resources = pgTable("resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  category: varchar("category").default('equipment'),
  description: text("description"),
  quantity: integer("quantity").default(1),
  location: varchar("location"),
  defaultRoomId: varchar("default_room_id").references(() => rooms.id),
  isConsumable: boolean("is_consumable").default(false),
  reorderThreshold: integer("reorder_threshold"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResourceSchema = createInsertSchema(resources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResource = z.infer<typeof insertResourceSchema>;
export type Resource = typeof resources.$inferSelect;

// Room Reservations
export const roomReservations = pgTable("room_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => rooms.id),
  eventId: varchar("event_id").references(() => calendarEvents.id),
  title: varchar("title").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  setupTime: integer("setup_time").default(0),  // minutes before
  teardownTime: integer("teardown_time").default(0),  // minutes after
  layoutPreset: varchar("layout_preset"),
  attendeeCount: integer("attendee_count"),
  resourcesNeeded: jsonb("resources_needed").default([]),
  notes: text("notes"),
  status: varchar("status").default('pending'),
  requestedBy: varchar("requested_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRoomReservationSchema = createInsertSchema(roomReservations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRoomReservation = z.infer<typeof insertRoomReservationSchema>;
export type RoomReservation = typeof roomReservations.$inferSelect;

export const RESERVATION_STATUS = [
  'pending',
  'approved',
  'declined',
  'cancelled',
] as const;

export type ReservationStatus = typeof RESERVATION_STATUS[number];

// =============================================================================
// METRICS & ATTENDANCE
// =============================================================================

export const attendanceReports = pgTable("attendance_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventDate: timestamp("event_date").notNull(),
  eventType: varchar("event_type").notNull(),
  ministryId: varchar("ministry_id").references(() => ministries.id),
  adultCount: integer("adult_count").default(0),
  childCount: integer("child_count").default(0),
  youthCount: integer("youth_count").default(0),
  visitorCount: integer("visitor_count").default(0),
  totalCount: integer("total_count").default(0),
  salvations: integer("salvations").default(0),
  waterBaptisms: integer("water_baptisms").default(0),
  spiritBaptisms: integer("spirit_baptisms").default(0),
  notes: text("notes"),
  submittedBy: varchar("submitted_by").references(() => users.id),
  submittedAt: timestamp("submitted_at").defaultNow(),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
});

export const insertAttendanceReportSchema = createInsertSchema(attendanceReports).omit({
  id: true,
  submittedAt: true,
});

export type InsertAttendanceReport = z.infer<typeof insertAttendanceReportSchema>;
export type AttendanceReport = typeof attendanceReports.$inferSelect;

// Weekly ministry metrics (submitted per ministry per week)
export const weeklyMinistryMetrics = pgTable("weekly_ministry_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ministryId: varchar("ministry_id").notNull().references(() => ministries.id),
  weekStartDate: timestamp("week_start_date").notNull(), // Normalized to Monday
  attendanceCount: integer("attendance_count").notNull(),
  volunteersCount: integer("volunteers_count"),
  firstTimersCount: integer("first_timers_count"),
  altarResponsesCount: integer("altar_responses_count"),
  followUpsNeededCount: integer("follow_ups_needed_count"),
  winsNotes: text("wins_notes"),
  concernsNotes: text("concerns_notes"),
  nextStepsNotes: text("next_steps_notes"),
  submittedByUserId: varchar("submitted_by_user_id").notNull().references(() => users.id),
  submittedAt: timestamp("submitted_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueMinistryWeek: index("unique_ministry_week").on(table.ministryId, table.weekStartDate),
}));

export const insertWeeklyMinistryMetricsSchema = createInsertSchema(weeklyMinistryMetrics).omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
});

export type InsertWeeklyMinistryMetrics = z.infer<typeof insertWeeklyMinistryMetricsSchema>;
export type WeeklyMinistryMetrics = typeof weeklyMinistryMetrics.$inferSelect;

// Metrics reminders
export const metricsReminders = pgTable("metrics_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ministryId: varchar("ministry_id").references(() => ministries.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  eventDate: timestamp("event_date").notNull(),
  reminderSentAt: timestamp("reminder_sent_at"),
  followUpSentAt: timestamp("follow_up_sent_at"),
  reportId: varchar("report_id").references(() => attendanceReports.id),
  status: varchar("status").default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMetricsReminderSchema = createInsertSchema(metricsReminders).omit({
  id: true,
  createdAt: true,
});

export type InsertMetricsReminder = z.infer<typeof insertMetricsReminderSchema>;
export type MetricsReminder = typeof metricsReminders.$inferSelect;

// =============================================================================
// REQUEST CENTER
// =============================================================================

export const REQUEST_TYPES = [
  'media-announcement',   // Request Media / Announcement
  'support-volunteers',   // Request Support (volunteers, setup, tech)
  'resources-supplies',   // Request Resources (supplies, equipment)
] as const;

export type RequestType = typeof REQUEST_TYPES[number];

export const REQUEST_STATUS = [
  'new',
  'in-review',
  'approved',
  'in-progress',
  'completed',
  'declined',
] as const;

export type RequestStatus = typeof REQUEST_STATUS[number];

export const supportRequests = pgTable("support_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestType: varchar("request_type").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  eventId: varchar("event_id").references(() => calendarEvents.id),
  eventDate: timestamp("event_date"),
  ministryId: varchar("ministry_id").references(() => ministries.id),
  priority: varchar("priority").default('normal'),
  status: varchar("status").default('new'),
  resourcesRequested: jsonb("resources_requested").default([]),
  volunteersNeeded: integer("volunteers_needed"),
  notes: text("notes"),
  requestedBy: varchar("requested_by").references(() => users.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSupportRequestSchema = createInsertSchema(supportRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSupportRequest = z.infer<typeof insertSupportRequestSchema>;
export type SupportRequest = typeof supportRequests.$inferSelect;

// =============================================================================
// INTERN PORTAL
// =============================================================================

export const internProfiles = pgTable("intern_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  supervisorId: varchar("supervisor_id").references(() => users.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  hoursPerWeek: integer("hours_per_week"),
  responsibilities: jsonb("responsibilities").default([]),
  requiredTrainingIds: jsonb("required_training_ids").default([]),
  schedule: jsonb("schedule").default({}),
  goals: text("goals"),
  notes: text("notes"),
  status: varchar("status").default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInternProfileSchema = createInsertSchema(internProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInternProfile = z.infer<typeof insertInternProfileSchema>;
export type InternProfile = typeof internProfiles.$inferSelect;

// Intern logs (activities, learnings)
export const internLogs = pgTable("intern_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  internProfileId: varchar("intern_profile_id").notNull().references(() => internProfiles.id),
  date: timestamp("date").notNull(),
  hoursWorked: integer("hours_worked"),
  activitiesCompleted: text("activities_completed"),
  lessonsLearned: text("lessons_learned"),
  highlights: text("highlights"),
  supervisorNotes: text("supervisor_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInternLogSchema = createInsertSchema(internLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertInternLog = z.infer<typeof insertInternLogSchema>;
export type InternLog = typeof internLogs.$inferSelect;

// =============================================================================
// MEETING DASHBOARD
// =============================================================================

export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  ministryId: varchar("ministry_id").references(() => ministries.id),
  scheduledDate: timestamp("scheduled_date").notNull(),
  duration: integer("duration").default(60),  // minutes
  location: varchar("location"),
  roomId: varchar("room_id").references(() => rooms.id),
  isVirtual: boolean("is_virtual").default(false),
  virtualLink: varchar("virtual_link"),
  agenda: jsonb("agenda").default([]),
  participants: jsonb("participants").default([]),
  organizerId: varchar("organizer_id").references(() => users.id),
  status: varchar("status").default('scheduled'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

// Meeting notes and minutes
export const meetingNotes = pgTable("meeting_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").notNull().references(() => meetings.id),
  content: text("content"),
  actionItems: jsonb("action_items").default([]),
  decisions: jsonb("decisions").default([]),
  followUps: jsonb("follow_ups").default([]),
  attendees: jsonb("attendees").default([]),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMeetingNotesSchema = createInsertSchema(meetingNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMeetingNotes = z.infer<typeof insertMeetingNotesSchema>;
export type MeetingNotes = typeof meetingNotes.$inferSelect;

// Meeting feedback (anonymous option)
export const meetingFeedback = pgTable("meeting_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").references(() => meetings.id),
  ministryId: varchar("ministry_id").references(() => ministries.id),
  topic: varchar("topic"),
  content: text("content").notNull(),
  isAnonymous: boolean("is_anonymous").default(false),
  submittedBy: varchar("submitted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMeetingFeedbackSchema = createInsertSchema(meetingFeedback).omit({
  id: true,
  createdAt: true,
});

export type InsertMeetingFeedback = z.infer<typeof insertMeetingFeedbackSchema>;
export type MeetingFeedback = typeof meetingFeedback.$inferSelect;

// =============================================================================
// PHASE 5: MEETING ACTION ITEMS
// =============================================================================

export const meetingActionItems = pgTable("meeting_action_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").notNull().references(() => meetings.id),
  title: varchar("title").notNull(),
  description: text("description"),
  assigneeId: varchar("assignee_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  priority: varchar("priority").default('medium'),  // low, medium, high, urgent
  status: varchar("status").default('pending'),     // pending, in-progress, completed, cancelled
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMeetingActionItemSchema = createInsertSchema(meetingActionItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMeetingActionItem = z.infer<typeof insertMeetingActionItemSchema>;
export type MeetingActionItem = typeof meetingActionItems.$inferSelect;

// =============================================================================
// PHASE 5: MEETING ATTENDANCE
// =============================================================================

export const meetingAttendance = pgTable("meeting_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").notNull().references(() => meetings.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status").default('invited'),  // invited, confirmed, attended, absent, excused
  checkedInAt: timestamp("checked_in_at"),
  checkedOutAt: timestamp("checked_out_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMeetingAttendanceSchema = createInsertSchema(meetingAttendance).omit({
  id: true,
  createdAt: true,
});

export type InsertMeetingAttendance = z.infer<typeof insertMeetingAttendanceSchema>;
export type MeetingAttendance = typeof meetingAttendance.$inferSelect;

// =============================================================================
// BACKGROUND CHECK TRACKING
// =============================================================================

export const BACKGROUND_CHECK_STATUS = [
  'not-started',
  'pending',
  'approved',
  'expired',
  'denied',
] as const;

export type BackgroundCheckStatus = typeof BACKGROUND_CHECK_STATUS[number];

export const backgroundChecks = pgTable("background_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  status: varchar("status").default('not-started'),
  initiatedAt: timestamp("initiated_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
  notes: text("notes"),
  verifiedBy: varchar("verified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBackgroundCheckSchema = createInsertSchema(backgroundChecks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBackgroundCheck = z.infer<typeof insertBackgroundCheckSchema>;
export type BackgroundCheck = typeof backgroundChecks.$inferSelect;

// =============================================================================
// HOLY SPIRIT TIER LOGIC
// =============================================================================

export const HOLY_SPIRIT_TIERS = [
  'full-assent',     // Baptized in Holy Spirit with evidence
  'actively-seeking', // Actively seeking the baptism
  'still-learning',  // Open to learning and growing
] as const;

export type HolySpiritTier = typeof HOLY_SPIRIT_TIERS[number];

// Ministries requiring full Holy Spirit assent for leadership
export const LEADERSHIP_MINISTRIES = [
  'worship',
  'teaching',
  'youth',
  'children',
  'prayer-team',
  'altar-ministry',
  'griefshare',
  'celebrate-recovery',
] as const;

// Ministries open to all tiers
export const OPEN_MINISTRIES = [
  'greeters',
  'welcome-table',
  'landing-team',
  'ushers',
  'cafe',
  'facilities',
  'sound',
  'lyrics',
  'livestream',
  'photography',
  'outreach',
  'transportation',
] as const;

// =============================================================================
// TEAM JOIN REQUESTS
// =============================================================================

export const TEAM_REQUEST_STATUS = [
  'pending',
  'approved',
  'declined',
  'withdrawn',
] as const;

export type TeamRequestStatus = typeof TEAM_REQUEST_STATUS[number];

export const teamJoinRequests = pgTable("team_join_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  ministryId: varchar("ministry_id").notNull().references(() => ministries.id),
  message: text("message"),
  preferredRole: varchar("preferred_role"),
  status: varchar("status").default('pending'),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTeamJoinRequestSchema = createInsertSchema(teamJoinRequests).omit({
  id: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNotes: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTeamJoinRequest = z.infer<typeof insertTeamJoinRequestSchema>;
export type TeamJoinRequest = typeof teamJoinRequests.$inferSelect;

// =============================================================================
// MESSAGING SYSTEM
// =============================================================================

export const MESSAGE_TYPE = [
  'direct',
  'channel',
  'announcement',
] as const;

export type MessageType = typeof MESSAGE_TYPE[number];

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  recipientId: varchar("recipient_id").references(() => users.id),
  ministryId: varchar("ministry_id").references(() => ministries.id),
  messageType: varchar("message_type").default('direct'),
  subject: varchar("subject"),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  isAnnouncement: boolean("is_announcement").default(false),
  parentId: varchar("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// =============================================================================
// MINISTRY MANUALS LIBRARY
// =============================================================================

export const MANUAL_CATEGORIES = [
  'ministry_manual',      // Ministry-specific manuals, visible only to ministry members
  'leadership_training',  // Leadership training materials (Language of a Leader, Recruitment 101, etc.)
  'resource',             // General resources (About Us, Policies, Bylaws, SERVE booklet)
] as const;

export type ManualCategory = typeof MANUAL_CATEGORIES[number];

export const MANUAL_CATEGORY_LABELS: Record<ManualCategory, string> = {
  'ministry_manual': 'Ministry Manual',
  'leadership_training': 'Leadership Training',
  'resource': 'Resource',
};

export const manuals = pgTable("manuals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  ministryId: varchar("ministry_id").references(() => ministries.id),
  category: varchar("category").default('resource'),
  fileUrl: varchar("file_url"),
  fileType: varchar("file_type").default('pdf'),
  fileSize: integer("file_size"),
  analysisSourceUrl: varchar("analysis_source_url"),
  analysisSourceType: varchar("analysis_source_type"),
  generateTraining: boolean("generate_training").default(false),
  needsManualLink: boolean("needs_manual_link").default(false),
  isRequired: boolean("is_required").default(false),
  sortOrder: integer("sort_order").default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertManualSchema = createInsertSchema(manuals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertManual = z.infer<typeof insertManualSchema>;
export type Manual = typeof manuals.$inferSelect;

// =============================================================================
// USER AVAILABILITY
// =============================================================================

export const userAvailability = pgTable("user_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  dayOfWeek: integer("day_of_week").notNull(),
  timeSlot: varchar("time_slot"),
  isAvailable: boolean("is_available").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserAvailabilitySchema = createInsertSchema(userAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserAvailability = z.infer<typeof insertUserAvailabilitySchema>;
export type UserAvailability = typeof userAvailability.$inferSelect;

// =============================================================================
// LEADER INVITES
// =============================================================================

export const INVITE_STATUS = [
  'pending',
  'accepted',
  'declined',
  'expired',
] as const;

export type InviteStatus = typeof INVITE_STATUS[number];

// Ministry assignment in an invite
export interface InviteMinistryAssignment {
  ministryId: string;
  roleType: 'leader' | 'member';
  roleTitle?: string;
}

export const teamInvites = pgTable("team_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  ministryId: varchar("ministry_id").references(() => ministries.id), // Legacy single ministry
  ministries: jsonb("ministries").$type<InviteMinistryAssignment[]>(), // New: multiple ministries
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  roleName: varchar("role_name"),
  roleType: varchar("role_type").default('member'), // 'leader' or 'member'
  message: text("message"),
  status: varchar("status").default('pending'),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: varchar("accepted_by").references(() => users.id),
  emailSentAt: timestamp("email_sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTeamInviteSchema = createInsertSchema(teamInvites).omit({
  id: true,
  acceptedAt: true,
  acceptedBy: true,
  createdAt: true,
});

export type InsertTeamInvite = z.infer<typeof insertTeamInviteSchema>;
export type TeamInvite = typeof teamInvites.$inferSelect;

// =============================================================================
// MINISTRY SELECTIONS - Multi-ministry onboarding selections
// =============================================================================

export const ONBOARDING_MINISTRIES = [
  { id: 'worship', name: 'Worship Team', requiresLeaderTraining: false },
  { id: 'media', name: 'Media (ProPresenter / Sound / Lighting / Media Production)', requiresLeaderTraining: false },
  { id: 'landing-team', name: 'Landing Team (Greeters / First Impressions / Community Care)', requiresLeaderTraining: false },
  { id: 'ushers', name: 'Ushers', requiresLeaderTraining: false },
  { id: 'security', name: 'Security', requiresLeaderTraining: false },
  { id: 'next-gen', name: 'Next Gen (Kingdom Children / City Youth)', requiresLeaderTraining: false, requiresBackgroundCheck: true },
  { id: 'cafe', name: 'Café', requiresLeaderTraining: false },
  { id: 'crew', name: 'Crew', requiresLeaderTraining: false },
  { id: 'discipleship-hour', name: 'Discipleship Hour', requiresLeaderTraining: false },
  { id: 'core-ministers', name: 'CORE Ministers', requiresLeaderTraining: false },
  { id: 'intercessory', name: 'Intercessory', requiresLeaderTraining: false },
  { id: 'pastoral-team', name: 'Pastoral Team / Leadership', requiresLeaderTraining: true },
] as const;

export type OnboardingMinistryId = typeof ONBOARDING_MINISTRIES[number]['id'];

export const ministrySelections = pgTable("ministry_selections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  ministryId: varchar("ministry_id").notNull(),
  selectedAt: timestamp("selected_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const insertMinistrySelectionSchema = createInsertSchema(ministrySelections).omit({
  id: true,
  selectedAt: true,
});

export type InsertMinistrySelection = z.infer<typeof insertMinistrySelectionSchema>;
export type MinistrySelection = typeof ministrySelections.$inferSelect;

// =============================================================================
// ONBOARDING STEPS TRACKING - Track individual step completion
// =============================================================================

export const ONBOARDING_STEP_TYPES = [
  'profile-complete',
  'faith-commitment',
  'ministry-survey',
  'about-us-manual',
  'about-us-quiz',
  'ministry-manual',
  'ministry-quiz',
  'leadership-language-manual',
  'leadership-language-quiz',
  'leadership-recruitment-manual',
  'leadership-recruitment-quiz',
  'child-safety-manual',
  'child-safety-quiz',
  'background-check',
] as const;

export type OnboardingStepType = typeof ONBOARDING_STEP_TYPES[number];

export const onboardingSteps = pgTable("onboarding_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  stepType: varchar("step_type").notNull(),
  ministryId: varchar("ministry_id"),
  isComplete: boolean("is_complete").default(false),
  completedAt: timestamp("completed_at"),
  quizScore: integer("quiz_score"),
  quizPassed: boolean("quiz_passed"),
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOnboardingStepSchema = createInsertSchema(onboardingSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOnboardingStep = z.infer<typeof insertOnboardingStepSchema>;
export type OnboardingStep = typeof onboardingSteps.$inferSelect;

// =============================================================================
// QUIZ QUESTIONS - For training and manual quizzes
// =============================================================================

export const QUIZ_QUESTION_TYPES = [
  'true-false',
  'multiple-choice',
  'scenario',
] as const;

export type QuizQuestionType = typeof QUIZ_QUESTION_TYPES[number];

export const quizQuestions = pgTable("quiz_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  manualId: varchar("manual_id").references(() => manuals.id),
  trainingId: varchar("training_id").references(() => trainingModules.id),
  quizCategory: varchar("quiz_category"),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type").default('multiple-choice'),
  options: jsonb("options").default([]),
  correctAnswer: varchar("correct_answer").notNull(),
  explanation: text("explanation"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuizQuestionSchema = createInsertSchema(quizQuestions).omit({
  id: true,
  createdAt: true,
});

export type InsertQuizQuestion = z.infer<typeof insertQuizQuestionSchema>;
export type QuizQuestion = typeof quizQuestions.$inferSelect;

// =============================================================================
// QUIZ ATTEMPTS - Track user quiz submissions
// =============================================================================

export const quizAttempts = pgTable("quiz_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  manualId: varchar("manual_id").references(() => manuals.id),
  trainingId: varchar("training_id").references(() => trainingModules.id),
  quizCategory: varchar("quiz_category"),
  answers: jsonb("answers").default({}),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  percentage: integer("percentage").notNull(),
  passed: boolean("passed").notNull(),
  attemptNumber: integer("attempt_number").default(1),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  completedAt: true,
});

export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type QuizAttempt = typeof quizAttempts.$inferSelect;

// =============================================================================
// RECURRING ACTIVITIES - For metrics and attendance reporting
// =============================================================================

export const ACTIVITY_FREQUENCY = [
  'weekly',
  'biweekly',
  'monthly',
  'custom',
] as const;

export type ActivityFrequency = typeof ACTIVITY_FREQUENCY[number];

export const recurringActivities = pgTable("recurring_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  ministryId: varchar("ministry_id").references(() => ministries.id),
  location: varchar("location"),
  dayOfWeek: integer("day_of_week"),
  timeOfDay: varchar("time_of_day"),
  frequency: varchar("frequency").default('weekly'),
  customPattern: jsonb("custom_pattern"),
  responsibleUserId: varchar("responsible_user_id").references(() => users.id),
  requiresAttendance: boolean("requires_attendance").default(true),
  customMetrics: jsonb("custom_metrics").default([]),
  snoozeStart: timestamp("snooze_start"),
  snoozeEnd: timestamp("snooze_end"),
  snoozeReason: text("snooze_reason"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRecurringActivitySchema = createInsertSchema(recurringActivities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRecurringActivity = z.infer<typeof insertRecurringActivitySchema>;
export type RecurringActivity = typeof recurringActivities.$inferSelect;

// =============================================================================
// METRICS SUBMISSIONS - For reporting attendance/metrics
// =============================================================================

export const METRICS_SUBMISSION_STATUS = [
  'pending',
  'submitted',
  'overdue',
  'event-cancelled',
  'snoozed',
] as const;

export type MetricsSubmissionStatus = typeof METRICS_SUBMISSION_STATUS[number];

export const EVENT_CANCELLATION_REASONS = [
  'weather',
  'cancelled-by-leadership',
  'volunteer-shortage',
  'holiday',
  'other',
] as const;

export type EventCancellationReason = typeof EVENT_CANCELLATION_REASONS[number];

export const metricsSubmissions = pgTable("metrics_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  activityId: varchar("activity_id").notNull().references(() => recurringActivities.id),
  eventDate: timestamp("event_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status").default('pending'),
  attendanceCount: integer("attendance_count"),
  volunteerCount: integer("volunteer_count"),
  firstTimeGuests: integer("first_time_guests"),
  salvations: integer("salvations"),
  decisions: integer("decisions"),
  baptisms: integer("baptisms"),
  offering: integer("offering"),
  notes: text("notes"),
  customMetrics: jsonb("custom_metrics").default({}),
  eventCancelled: boolean("event_cancelled").default(false),
  cancellationReason: varchar("cancellation_reason"),
  cancellationNotes: text("cancellation_notes"),
  submittedBy: varchar("submitted_by").references(() => users.id),
  submittedAt: timestamp("submitted_at"),
  reminderCount: integer("reminder_count").default(0),
  lastReminderAt: timestamp("last_reminder_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMetricsSubmissionSchema = createInsertSchema(metricsSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMetricsSubmission = z.infer<typeof insertMetricsSubmissionSchema>;
export type MetricsSubmission = typeof metricsSubmissions.$inferSelect;

// =============================================================================
// AUDIT LOGS - Track all changes for compliance
// =============================================================================

export const AUDIT_ACTION_TYPES = [
  'create',
  'update',
  'delete',
  'archive',
  'restore',
  'approve',
  'decline',
  'submit',
] as const;

export type AuditActionType = typeof AUDIT_ACTION_TYPES[number];

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  action: varchar("action").notNull(),
  previousValue: jsonb("previous_value"),
  newValue: jsonb("new_value"),
  reason: text("reason"),
  performedBy: varchar("performed_by").references(() => users.id),
  performedAt: timestamp("performed_at").defaultNow(),
  ipAddress: varchar("ip_address"),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  performedAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// =============================================================================
// USER ARCHIVE - Track archived users for 180-day recovery
// =============================================================================

export const USER_STATUS = [
  'active',
  'archived',
  'deleted',
] as const;

export type UserStatus = typeof USER_STATUS[number];

export const userArchives = pgTable("user_archives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  archivedAt: timestamp("archived_at").defaultNow(),
  archivedBy: varchar("archived_by").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  restoreDeadline: timestamp("restore_deadline").notNull(),
  reason: text("reason"),
  userData: jsonb("user_data"),
  isRestored: boolean("is_restored").default(false),
  restoredAt: timestamp("restored_at"),
  restoredBy: varchar("restored_by").references(() => users.id),
});

export const insertUserArchiveSchema = createInsertSchema(userArchives).omit({
  id: true,
  archivedAt: true,
});

export type InsertUserArchive = z.infer<typeof insertUserArchiveSchema>;
export type UserArchive = typeof userArchives.$inferSelect;

// =============================================================================
// MINISTRY ARCHIVE - Track archived ministries
// =============================================================================

export const ministryArchives = pgTable("ministry_archives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ministryId: varchar("ministry_id").notNull().references(() => ministries.id),
  archivedAt: timestamp("archived_at").defaultNow(),
  archivedBy: varchar("archived_by").references(() => users.id),
  reason: text("reason"),
  ministryData: jsonb("ministry_data"),
  isRestored: boolean("is_restored").default(false),
  restoredAt: timestamp("restored_at"),
  restoredBy: varchar("restored_by").references(() => users.id),
});

export const insertMinistryArchiveSchema = createInsertSchema(ministryArchives).omit({
  id: true,
  archivedAt: true,
});

export type InsertMinistryArchive = z.infer<typeof insertMinistryArchiveSchema>;
export type MinistryArchive = typeof ministryArchives.$inferSelect;

// =============================================================================
// USER STATUS INDICATORS - For quick visual status
// =============================================================================

export const USER_STATUS_INDICATORS = {
  yellow: 'onboarding-incomplete',
  red: 'tasks-overdue',
  green: 'fully-trained',
  blue: 'archived',
} as const;

export type UserStatusIndicator = keyof typeof USER_STATUS_INDICATORS;

// Helper function to determine user status indicator
export function getUserStatusIndicator(user: User, onboardingComplete: boolean, hasOverdueTasks: boolean, isArchived: boolean): UserStatusIndicator {
  if (isArchived) return 'blue';
  if (hasOverdueTasks) return 'red';
  if (!onboardingComplete) return 'yellow';
  return 'green';
}

// =============================================================================
// ROOM LAYOUTS - For room setup diagrams
// =============================================================================

export const roomLayouts = pgTable("room_layouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => rooms.id),
  name: varchar("name").notNull(),
  description: text("description"),
  layoutData: jsonb("layout_data").default({}),
  tableCount: integer("table_count"),
  chairCount: integer("chair_count"),
  imageUrl: varchar("image_url"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRoomLayoutSchema = createInsertSchema(roomLayouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRoomLayout = z.infer<typeof insertRoomLayoutSchema>;
export type RoomLayout = typeof roomLayouts.$inferSelect;

// =============================================================================
// MANUAL ANALYSIS - AI-generated training content from manuals
// =============================================================================

export const AI_ANALYSIS_STATUS = [
  'pending',
  'processing',
  'completed',
  'failed',
] as const;

export type AIAnalysisStatus = typeof AI_ANALYSIS_STATUS[number];

export const manualAnalysis = pgTable("manual_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  manualId: varchar("manual_id").notNull().references(() => manuals.id),
  status: varchar("status").default('pending'),
  extractedText: text("extracted_text"),
  summary: text("summary"),
  keyTopics: jsonb("key_topics").default([]),
  studyQuestions: jsonb("study_questions").default([]),
  assessmentQuestions: jsonb("assessment_questions").default([]),
  aiModel: varchar("ai_model"),
  tokensUsed: integer("tokens_used"),
  errorMessage: text("error_message"),
  triggeredBy: varchar("triggered_by"),
  generatedAt: timestamp("generated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertManualAnalysisSchema = createInsertSchema(manualAnalysis).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertManualAnalysis = z.infer<typeof insertManualAnalysisSchema>;
export type ManualAnalysis = typeof manualAnalysis.$inferSelect;

// Study question structure
export interface StudyQuestion {
  id: string;
  question: string;
  answer: string;
  scriptureReference?: string;
}

// Assessment question structure (with quiz format)
export interface AssessmentQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

// Note: NOTIFICATIONS table defined earlier in this file (around line 980) with enhanced types

// =============================================================================
// ONBOARDING TRAINING REQUIREMENTS - Auto-enrollment config
// =============================================================================

export const onboardingTrainingRequirements = pgTable("onboarding_training_requirements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ministryId: varchar("ministry_id").references(() => ministries.id),
  trainingModuleId: varchar("training_module_id").notNull().references(() => trainingModules.id),
  isRequired: boolean("is_required").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOnboardingTrainingRequirementSchema = createInsertSchema(onboardingTrainingRequirements).omit({
  id: true,
  createdAt: true,
});

export type InsertOnboardingTrainingRequirement = z.infer<typeof insertOnboardingTrainingRequirementSchema>;
export type OnboardingTrainingRequirement = typeof onboardingTrainingRequirements.$inferSelect;

// =============================================================================
// FIELD BANK / CONFIG BANK - Admin-managed lists
// =============================================================================

export const adminTags = pgTable("admin_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  color: varchar("color"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminTagSchema = createInsertSchema(adminTags).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminTag = z.infer<typeof insertAdminTagSchema>;
export type AdminTag = typeof adminTags.$inferSelect;

export const serveRoles = pgTable("serve_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  ministryId: varchar("ministry_id").references(() => ministries.id),
  requiresBackgroundCheck: boolean("requires_background_check").default(false),
  requiresTraining: boolean("requires_training").default(false),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertServeRoleSchema = createInsertSchema(serveRoles).omit({
  id: true,
  createdAt: true,
});

export type InsertServeRole = z.infer<typeof insertServeRoleSchema>;
export type ServeRole = typeof serveRoles.$inferSelect;

export const staffTitles = pgTable("staff_titles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  isLeadershipRole: boolean("is_leadership_role").default(false),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStaffTitleSchema = createInsertSchema(staffTitles).omit({
  id: true,
  createdAt: true,
});

export type InsertStaffTitle = z.infer<typeof insertStaffTitleSchema>;
export type StaffTitle = typeof staffTitles.$inferSelect;

// Global Labels - Customizable system-wide labels/names
export const globalLabels = pgTable("global_labels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: varchar("value").notNull(),
  description: text("description"),
  category: varchar("category"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGlobalLabelSchema = createInsertSchema(globalLabels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGlobalLabel = z.infer<typeof insertGlobalLabelSchema>;
export type GlobalLabel = typeof globalLabels.$inferSelect;

// =============================================================================
// PASTORAL QUESTIONS - "I Have Questions" from onboarding faith commitment
// =============================================================================

export const QUESTION_STATUS = [
  'pending',       // Awaiting pastoral review
  'in-progress',   // Pastor is following up
  'resolved',      // Question addressed
  'scheduled',     // Meeting scheduled
] as const;

export type QuestionStatus = typeof QUESTION_STATUS[number];

export const pastoralQuestions = pgTable("pastoral_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  source: varchar("source").default('onboarding'), // 'onboarding', 'profile', 'direct'
  stepNumber: integer("step_number"), // For onboarding faith commitment step
  stepTitle: varchar("step_title"),
  question: text("question").notNull(),
  status: varchar("status").default('pending'),
  assignedTo: varchar("assigned_to").references(() => users.id), // Assigned pastor
  notes: text("notes"), // Pastor's private notes
  followUpDate: timestamp("follow_up_date"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPastoralQuestionSchema = createInsertSchema(pastoralQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPastoralQuestion = z.infer<typeof insertPastoralQuestionSchema>;
export type PastoralQuestion = typeof pastoralQuestions.$inferSelect;

// =============================================================================
// MINISTRY JOIN REQUESTS - Users requesting to join ministries
// =============================================================================

export const JOIN_REQUEST_STATUS = [
  'pending',
  'approved',
  'declined',
  'withdrawn',
] as const;

export type JoinRequestStatus = typeof JOIN_REQUEST_STATUS[number];

export const ministryJoinRequests = pgTable("ministry_join_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  ministryId: varchar("ministry_id").notNull().references(() => ministries.id),
  message: text("message"), // User's message with their request
  source: varchar("source").default('manual'), // 'survey', 'manual', 'invite'
  surveyMatchScore: integer("survey_match_score"), // If from survey recommendations
  status: varchar("status").default('pending'),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMinistryJoinRequestSchema = createInsertSchema(ministryJoinRequests).omit({
  id: true,
  createdAt: true,
});

export type InsertMinistryJoinRequest = z.infer<typeof insertMinistryJoinRequestSchema>;
export type MinistryJoinRequest = typeof ministryJoinRequests.$inferSelect;

// =============================================================================
// WORKBOARDS - Collaboration tool for meetings and projects
// =============================================================================

export const WORKBOARD_STATUS = [
  'active',
  'archived',
  'completed',
] as const;

export type WorkboardStatus = typeof WORKBOARD_STATUS[number];

export const WORKBOARD_MODES = ['meeting', 'ministry'] as const;
export type WorkboardMode = typeof WORKBOARD_MODES[number];

export const workboards = pgTable("workboards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  ministryId: varchar("ministry_id").references(() => ministries.id),
  meetingId: varchar("meeting_id").references(() => meetings.id),
  isCrossMinistry: boolean("is_cross_ministry").default(false),
  participants: jsonb("participants").default([]), // Array of user IDs
  mode: varchar("mode").default('ministry'), // 'meeting' or 'ministry'
  agenda: text("agenda"), // Meeting mode: time-ordered agenda
  discussionNotes: text("discussion_notes"), // Meeting mode: freeform notes
  decisions: jsonb("decisions").$type<string[]>(), // Meeting mode: what was decided
  meetingDate: timestamp("meeting_date"), // Meeting mode: when meeting occurs
  notes: text("notes"),
  status: varchar("status").default('active'),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWorkboardSchema = createInsertSchema(workboards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkboard = z.infer<typeof insertWorkboardSchema>;
export type Workboard = typeof workboards.$inferSelect;

// Action Items for Workboards
export const ACTION_ITEM_STATUS = [
  'open',
  'in_progress',
  'done',
  'blocked',
] as const;

export type ActionItemStatus = typeof ACTION_ITEM_STATUS[number];

export const actionItems = pgTable("action_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workboardId: varchar("workboard_id").notNull().references(() => workboards.id),
  title: varchar("title").notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  priority: varchar("priority").default('normal'), // 'low', 'normal', 'high', 'urgent'
  status: varchar("status").default('open'),
  sortOrder: integer("sort_order").default(0),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertActionItemSchema = createInsertSchema(actionItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
export type ActionItem = typeof actionItems.$inferSelect;

// Comments on Action Items
export const actionItemComments = pgTable("action_item_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actionItemId: varchar("action_item_id").notNull().references(() => actionItems.id),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActionItemCommentSchema = createInsertSchema(actionItemComments).omit({
  id: true,
  createdAt: true,
});

export type InsertActionItemComment = z.infer<typeof insertActionItemCommentSchema>;
export type ActionItemComment = typeof actionItemComments.$inferSelect;

// =============================================================================
// SERVING RECORDS - Local tracking for serving metrics (Planning Center-lite)
// =============================================================================

export const SERVING_STATUS = [
  'scheduled',
  'accepted',
  'declined',
  'no_response',
  'served',
  'no_show',
] as const;

export type ServingStatus = typeof SERVING_STATUS[number];

export const servingRecords = pgTable("serving_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  ministryId: varchar("ministry_id").notNull().references(() => ministries.id),
  serveRoleId: varchar("serve_role_id").references(() => serveRoles.id),
  positionTitle: varchar("position_title"), // Fallback if no serve role
  serviceDate: timestamp("service_date").notNull(),
  serviceType: varchar("service_type").default('regular'), // 'regular', 'special_event', 'training'
  status: varchar("status").default('scheduled'),
  scheduledBy: varchar("scheduled_by").references(() => users.id),
  confirmedAt: timestamp("confirmed_at"),
  declinedAt: timestamp("declined_at"),
  declineReason: text("decline_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServingRecordSchema = createInsertSchema(servingRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertServingRecord = z.infer<typeof insertServingRecordSchema>;
export type ServingRecord = typeof servingRecords.$inferSelect;

// =============================================================================
// LEADER FOLLOW-UP NOTES - Private notes about team members
// =============================================================================

export const leaderNotes = pgTable("leader_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leaderId: varchar("leader_id").notNull().references(() => users.id),
  memberId: varchar("member_id").notNull().references(() => users.id),
  note: text("note").notNull(),
  isFollowUp: boolean("is_follow_up").default(false),
  followUpDate: timestamp("follow_up_date"),
  isComplete: boolean("is_complete").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLeaderNoteSchema = createInsertSchema(leaderNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLeaderNote = z.infer<typeof insertLeaderNoteSchema>;
export type LeaderNote = typeof leaderNotes.$inferSelect;

// =============================================================================
// MEMBER FEEDBACK - Encouragement and acknowledgment from leaders
// =============================================================================

export const FEEDBACK_TYPES = ['encouragement', 'acknowledgment', 'training_complete', 'survey_reviewed', 'question_followup'] as const;
export type FeedbackType = typeof FEEDBACK_TYPES[number];

export const memberFeedback = pgTable("member_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberId: varchar("member_id").notNull().references(() => users.id),
  leaderId: varchar("leader_id").notNull().references(() => users.id),
  feedbackType: varchar("feedback_type").notNull(), // 'encouragement', 'acknowledgment', 'training_complete', etc.
  message: text("message").notNull(),
  relatedItemType: varchar("related_item_type"), // 'training', 'survey', 'question', etc.
  relatedItemId: varchar("related_item_id"),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMemberFeedbackSchema = createInsertSchema(memberFeedback).omit({
  id: true,
  createdAt: true,
});

export type InsertMemberFeedback = z.infer<typeof insertMemberFeedbackSchema>;
export type MemberFeedback = typeof memberFeedback.$inferSelect;

// =============================================================================
// PHASE 7: ORGANIZATION SETTINGS - Branding and app configuration
// =============================================================================

export const orgSettings = pgTable("org_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Basic Info
  organizationName: varchar("organization_name").default('Garden City Church'),
  tagline: varchar("tagline"),
  
  // Branding
  primaryColor: varchar("primary_color").default('#3B82F6'),
  secondaryColor: varchar("secondary_color").default('#10B981'),
  accentColor: varchar("accent_color").default('#F59E0B'),
  logoUrl: varchar("logo_url"),
  faviconUrl: varchar("favicon_url"),
  
  // Contact Info
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  website: varchar("website"),
  
  // Social Media
  facebookUrl: varchar("facebook_url"),
  instagramUrl: varchar("instagram_url"),
  youtubeUrl: varchar("youtube_url"),
  twitterUrl: varchar("twitter_url"),
  
  // Feature Flags
  enableOnboarding: boolean("enable_onboarding").default(true),
  enableTraining: boolean("enable_training").default(true),
  enableRewards: boolean("enable_rewards").default(true),
  enableTeamCenter: boolean("enable_team_center").default(true),
  enableBackgroundChecks: boolean("enable_background_checks").default(true),
  
  // Integrations Config
  outlookIntegrationEnabled: boolean("outlook_integration_enabled").default(false),
  emailIntegrationEnabled: boolean("email_integration_enabled").default(false),
  
  // Outlook 365 Integration Config
  outlookTenantId: varchar("outlook_tenant_id"),
  outlookClientId: varchar("outlook_client_id"),
  // Note: Client secret stored in environment variables for security
  outlookSelectedCalendars: text("outlook_selected_calendars").array().default([]),
  outlookRoomCalendars: text("outlook_room_calendars").array().default([]),
  outlookSyncIntervalMinutes: integer("outlook_sync_interval_minutes").default(15),
  outlookLastSyncAt: timestamp("outlook_last_sync_at"),
  
  // Metadata
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrgSettingsSchema = createInsertSchema(orgSettings).omit({
  id: true,
  createdAt: true,
});

export type InsertOrgSettings = z.infer<typeof insertOrgSettingsSchema>;
export type OrgSettings = typeof orgSettings.$inferSelect;

// =============================================================================
// PHASE 9: HELP CENTER - Searchable help articles and FAQs
// =============================================================================

export const HELP_CATEGORIES = [
  'getting-started',
  'onboarding',
  'training',
  'team-center',
  'calendar',
  'profile',
  'admin',
  'troubleshooting',
  'faq',
] as const;

export type HelpCategory = typeof HELP_CATEGORIES[number];

export const helpArticles = pgTable("help_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  slug: varchar("slug").notNull().unique(),
  summary: text("summary"),
  content: text("content").notNull(),
  category: varchar("category").default('faq'),
  tags: text("tags").array().default([]),
  targetRoles: text("target_roles").array().default([]), // Empty = all roles
  sortOrder: integer("sort_order").default(0),
  isPublished: boolean("is_published").default(true),
  viewCount: integer("view_count").default(0),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHelpArticleSchema = createInsertSchema(helpArticles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  viewCount: true,
});

export type InsertHelpArticle = z.infer<typeof insertHelpArticleSchema>;
export type HelpArticle = typeof helpArticles.$inferSelect;

// =============================================================================
// PASSWORD RESET TOKENS - For forgot password flow
// =============================================================================

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

