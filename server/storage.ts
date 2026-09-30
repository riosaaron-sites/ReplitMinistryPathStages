import {
  organizations,
  type Organization,
  type InsertOrganization,
  slugifyOrganizationName,
  users,
  surveyProgress,
  surveyResults,
  onboardingProgress,
  integrationSettings,
  serviceAssignments,
  calendarEvents,
  calendarCategories,
  ministries,
  ministryLeaders,
  trainingModules,
  trainingAssessments,
  userTrainingProgress,
  badges,
  userBadges,
  xpLogs,
  rooms,
  resources,
  roomReservations,
  attendanceReports,
  metricsReminders,
  supportRequests,
  internProfiles,
  internLogs,
  meetings,
  meetingNotes,
  meetingFeedback,
  backgroundChecks,
  rolePermissions,
  roleAssignments,
  teamJoinRequests,
  messages,
  manuals,
  teamInvites,
  ministrySelections,
  onboardingSteps,
  quizQuestions,
  quizAttempts,
  recurringActivities,
  metricsSubmissions,
  auditLogs,
  userArchives,
  ministryArchives,
  roomLayouts,
  notifications,
  manualAnalysis,
  adminTags,
  serveRoles,
  staffTitles,
  globalLabels,
  pastoralQuestions,
  ministryJoinRequests,
  workboards,
  actionItems,
  actionItemComments,
  servingRecords,
  leaderNotes,
  memberFeedback,
  type User,
  type UpsertUser,
  type SurveyProgress,
  type InsertSurveyProgress,
  type SurveyResults as SurveyResultsType,
  type InsertSurveyResults,
  type OnboardingProgress,
  type InsertOnboardingProgress,
  type OnboardingStatus,
  type UserRole,
  type SocialLinks,
  type IntegrationSettings,
  type InsertIntegrationSettings,
  type ServiceAssignment,
  type InsertServiceAssignment,
  type CalendarEvent,
  type InsertCalendarEvent,
  type Ministry,
  type InsertMinistry,
  type MinistryLeader,
  type InsertMinistryLeader,
  type TrainingModule,
  type InsertTrainingModule,
  type TrainingAssessment,
  type InsertTrainingAssessment,
  type UserTrainingProgress,
  type InsertUserTrainingProgress,
  type Badge,
  type InsertBadge,
  type UserBadge,
  type InsertUserBadge,
  type XpLog,
  type InsertXpLog,
  type Room,
  type InsertRoom,
  type Resource,
  type InsertResource,
  type RoomReservation,
  type InsertRoomReservation,
  type AttendanceReport,
  type InsertAttendanceReport,
  type MetricsReminder,
  type InsertMetricsReminder,
  type SupportRequest,
  type InsertSupportRequest,
  type InternProfile,
  type InsertInternProfile,
  type InternLog,
  type InsertInternLog,
  type Meeting,
  type InsertMeeting,
  type MeetingNotes,
  type InsertMeetingNotes,
  type MeetingFeedback,
  type InsertMeetingFeedback,
  type MeetingActionItem,
  type InsertMeetingActionItem,
  type MeetingAttendance,
  type InsertMeetingAttendance,
  meetingActionItems,
  meetingAttendance,
  type BackgroundCheck,
  type InsertBackgroundCheck,
  type RolePermission,
  type InsertRolePermission,
  type RoleAssignment,
  type InsertRoleAssignment,
  type TeamJoinRequest,
  type InsertTeamJoinRequest,
  type Message,
  type InsertMessage,
  type Manual,
  type InsertManual,
  type TeamInvite,
  type InsertTeamInvite,
  type MinistrySelection,
  type InsertMinistrySelection,
  type OnboardingStep,
  type InsertOnboardingStep,
  type QuizQuestion,
  type InsertQuizQuestion,
  type QuizAttempt,
  type InsertQuizAttempt,
  type RecurringActivity,
  type InsertRecurringActivity,
  type MetricsSubmission,
  type InsertMetricsSubmission,
  type AuditLog,
  type InsertAuditLog,
  type UserArchive,
  type InsertUserArchive,
  type MinistryArchive,
  type InsertMinistryArchive,
  type RoomLayout,
  type InsertRoomLayout,
  type Notification,
  type InsertNotification,
  type ManualAnalysis,
  type InsertManualAnalysis,
  type AdminTag,
  type InsertAdminTag,
  type ServeRole,
  type InsertServeRole,
  type StaffTitle,
  type InsertStaffTitle,
  type GlobalLabel,
  type InsertGlobalLabel,
  type PastoralQuestion,
  type InsertPastoralQuestion,
  type MinistryJoinRequest,
  type InsertMinistryJoinRequest,
  type Workboard,
  type InsertWorkboard,
  type ActionItem,
  type InsertActionItem,
  type ActionItemComment,
  type InsertActionItemComment,
  type ServingRecord,
  type InsertServingRecord,
  type LeaderNote,
  type MemberFeedback,
  type InsertMemberFeedback,
  type InsertLeaderNote,
  type MinistryLeadershipAssignment,
  type InsertMinistryLeadershipAssignment,
  ministryLeadershipAssignments,
  type OrgSettings,
  type InsertOrgSettings,
  orgSettings,
  type HelpArticle,
  type InsertHelpArticle,
  helpArticles,
  type CalendarCategory,
  type InsertCalendarCategory,
  passwordResetTokens,
  weeklyMinistryMetrics,
  type WeeklyMinistryMetrics,
  type InsertWeeklyMinistryMetrics,
} from "@shared/schema";
import { db } from "./db";
import { eq, gte, lte, lt, gt, and, desc, sql, ilike, or } from "drizzle-orm";

export interface IStorage {
  // Organization (tenant) operations
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getFirstOrganization(): Promise<Organization | undefined>;
  createOrganization(name: string, ownerId?: string): Promise<Organization>;
  updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization>;

  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User>;
  getAllUsers(organizationId: string): Promise<User[]>;
  updateUserRole(userId: string, role: UserRole): Promise<void>;
  updateUserOnboardingStatus(userId: string, status: OnboardingStatus): Promise<void>;
  
  // Profile operations
  updateUserProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    socialLinks?: SocialLinks;
    profileImageUrl?: string;
    phone?: string;
  }): Promise<User>;
  markProfileComplete(userId: string): Promise<void>;
  
  // Survey progress operations
  getSurveyProgress(userId: string): Promise<SurveyProgress | undefined>;
  upsertSurveyProgress(progress: InsertSurveyProgress): Promise<SurveyProgress>;
  markSurveyComplete(userId: string): Promise<void>;
  deleteSurveyProgress(userId: string): Promise<void>;
  
  // Survey results operations
  getSurveyResults(userId: string): Promise<SurveyResultsType | undefined>;
  createSurveyResults(results: InsertSurveyResults): Promise<SurveyResultsType>;
  markEmailSent(resultId: string): Promise<void>;
  getAllResultsWithUnsentEmails(): Promise<Array<{ user: User; results: SurveyResultsType }>>;
  
  // Onboarding progress operations
  getOnboardingProgress(userId: string): Promise<OnboardingProgress | undefined>;
  upsertOnboardingProgress(progress: InsertOnboardingProgress): Promise<OnboardingProgress>;
  
  // Integration settings operations
  getIntegrationSettings(integrationName: string): Promise<IntegrationSettings | undefined>;
  upsertIntegrationSettings(settings: InsertIntegrationSettings): Promise<IntegrationSettings>;
  
  // Service assignments operations
  getServiceAssignments(userId: string): Promise<ServiceAssignment[]>;
  upsertServiceAssignment(assignment: InsertServiceAssignment): Promise<ServiceAssignment>;
  deleteServiceAssignmentsByUser(userId: string): Promise<void>;
  
  // Calendar events operations
  getCalendarEvents(organizationId: string, startDate: Date, endDate?: Date): Promise<CalendarEvent[]>;
  getUserCalendarEvents(organizationId: string, userId: string, startDate: Date): Promise<CalendarEvent[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, organizationId: string, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: string, organizationId: string): Promise<void>;
  
  // Ministries operations
  getMinistries(organizationId: string): Promise<Ministry[]>;
  getMinistry(id: string, organizationId: string): Promise<Ministry | undefined>;
  createMinistry(ministry: InsertMinistry): Promise<Ministry>;
  updateMinistry(id: string, organizationId: string, ministry: Partial<InsertMinistry>): Promise<Ministry>;
  getChildMinistries(parentMinistryId: string, organizationId: string): Promise<Ministry[]>;
  
  // Ministry leaders operations
  getMinistryLeaders(ministryId: string, organizationId: string): Promise<MinistryLeader[]>;
  addMinistryLeader(data: InsertMinistryLeader): Promise<MinistryLeader>;
  removeMinistryLeader(ministryId: string, userId: string): Promise<void>;
  updateMinistryLeader(id: string, organizationId: string, data: Partial<InsertMinistryLeader>): Promise<MinistryLeader>;

  // Ministry leadership assignments (H1)
  createMinistryLeadershipAssignment(data: InsertMinistryLeadershipAssignment): Promise<MinistryLeadershipAssignment>;
  getMinistryLeadershipAssignments(ministryId: string, organizationId: string): Promise<MinistryLeadershipAssignment[]>;
  getUserLeadershipAssignments(userId: string): Promise<MinistryLeadershipAssignment[]>;
  getLeadershipAssignment(id: string, organizationId: string): Promise<MinistryLeadershipAssignment | undefined>;
  updateLeadershipAssignment(id: string, organizationId: string, data: Partial<InsertMinistryLeadershipAssignment>): Promise<MinistryLeadershipAssignment>;
  getAllActiveLeadershipAssignments(organizationId: string): Promise<MinistryLeadershipAssignment[]>;

  // Role assignments operations
  getRoleAssignments(organizationId: string): Promise<RoleAssignment[]>;
  getUserRoleAssignments(userId: string): Promise<RoleAssignment[]>;
  createRoleAssignment(assignment: InsertRoleAssignment): Promise<RoleAssignment>;
  updateRoleAssignment(id: string, organizationId: string, data: Partial<InsertRoleAssignment>): Promise<RoleAssignment>;
  deleteRoleAssignment(id: string, organizationId: string): Promise<void>;
  
  // Training modules operations
  getTrainingModules(organizationId: string, ministryId?: string): Promise<TrainingModule[]>;
  getTrainingModule(id: string, organizationId: string): Promise<TrainingModule | undefined>;
  createTrainingModule(module: InsertTrainingModule): Promise<TrainingModule>;
  updateTrainingModule(id: string, organizationId: string, module: Partial<InsertTrainingModule>): Promise<TrainingModule>;
  deleteTrainingModule(id: string): Promise<void>;
  getTrainingAssessments(moduleId: string): Promise<TrainingAssessment[]>;
  createTrainingAssessment(assessment: InsertTrainingAssessment): Promise<TrainingAssessment>;
  updateTrainingAssessment(id: string, assessment: Partial<InsertTrainingAssessment>): Promise<TrainingAssessment>;
  deleteTrainingAssessment(id: string): Promise<void>;
  
  // User training progress operations
  getUserTrainingProgress(userId: string): Promise<UserTrainingProgress[]>;
  getUserModuleProgress(userId: string, moduleId: string): Promise<UserTrainingProgress | undefined>;
  upsertUserTrainingProgress(progress: InsertUserTrainingProgress): Promise<UserTrainingProgress>;
  getAllTrainingProgress(): Promise<UserTrainingProgress[]>;  // Phase 3
  updateTrainingProgress(id: string, data: Partial<UserTrainingProgress>): Promise<UserTrainingProgress>;  // Phase 3
  
  // Gamification operations
  getBadges(organizationId: string): Promise<Badge[]>;
  createBadge(badge: InsertBadge): Promise<Badge>;
  getUserBadges(userId: string, organizationId: string): Promise<UserBadge[]>;
  awardBadge(data: InsertUserBadge): Promise<UserBadge>;
  getUserXp(userId: string, organizationId: string): Promise<number>;
  addXpLog(log: InsertXpLog): Promise<XpLog>;
  getXpLogs(userId: string, organizationId: string): Promise<XpLog[]>;
  awardXp(organizationId: string, userId: string, amount: number, sourceType: string, reason: string): Promise<XpLog>;  // Phase 3 convenience method
  
  // Rooms operations
  getRooms(organizationId: string): Promise<Room[]>;
  getRoom(id: string, organizationId: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, organizationId: string, room: Partial<InsertRoom>): Promise<Room>;
  deleteRoom(id: string, organizationId: string): Promise<void>;

  // Resources operations
  getResources(organizationId: string): Promise<Resource[]>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: string, organizationId: string, resource: Partial<InsertResource>): Promise<Resource>;
  deleteResource(id: string, organizationId: string): Promise<void>;

  // Room reservations operations
  getRoomReservations(organizationId: string, startDate: Date, endDate?: Date): Promise<RoomReservation[]>;
  getRoomReservationsForConflictCheck(organizationId: string, roomId: string, startTime: Date, endTime: Date): Promise<RoomReservation[]>;
  getRoomReservationsByUser(organizationId: string, userId: string): Promise<RoomReservation[]>;
  getRoomReservation(id: string, organizationId: string): Promise<RoomReservation | undefined>;
  createRoomReservation(reservation: InsertRoomReservation): Promise<RoomReservation>;
  updateRoomReservation(id: string, organizationId: string, reservation: Partial<InsertRoomReservation>): Promise<RoomReservation>;

  // Attendance reports operations
  getAttendanceReports(organizationId: string, startDate: Date, endDate?: Date): Promise<AttendanceReport[]>;
  createAttendanceReport(report: InsertAttendanceReport): Promise<AttendanceReport>;

  // Weekly ministry metrics operations
  getWeeklyMetrics(organizationId: string, weekStartDate: Date, ministryIds?: string[]): Promise<WeeklyMinistryMetrics[]>;
  getWeeklyMetricsByRange(organizationId: string, startDate: Date, endDate: Date, ministryIds?: string[]): Promise<WeeklyMinistryMetrics[]>;
  upsertWeeklyMetrics(metrics: InsertWeeklyMinistryMetrics): Promise<WeeklyMinistryMetrics>;
  getWeeklyMetric(organizationId: string, ministryId: string, weekStartDate: Date): Promise<WeeklyMinistryMetrics | undefined>;
  
  // Support requests operations
  getSupportRequests(organizationId: string, status?: string): Promise<SupportRequest[]>;
  getSupportRequest(id: string, organizationId: string): Promise<SupportRequest | undefined>;
  createSupportRequest(request: InsertSupportRequest): Promise<SupportRequest>;
  updateSupportRequest(id: string, organizationId: string, request: Partial<InsertSupportRequest>): Promise<SupportRequest>;

  // Intern portal operations
  getInternProfiles(organizationId: string): Promise<InternProfile[]>;
  getInternProfile(userId: string, organizationId: string): Promise<InternProfile | undefined>;
  createInternProfile(profile: InsertInternProfile): Promise<InternProfile>;
  updateInternProfile(id: string, organizationId: string, profile: Partial<InsertInternProfile>): Promise<InternProfile>;
  getInternLogs(internProfileId: string, organizationId: string): Promise<InternLog[]>;
  createInternLog(log: InsertInternLog): Promise<InternLog>;
  
  // Meetings operations
  getMeetings(organizationId: string, startDate?: Date): Promise<Meeting[]>;
  getMeeting(id: string, organizationId: string): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: string, organizationId: string, meeting: Partial<InsertMeeting>): Promise<Meeting>;
  getMeetingNotes(organizationId: string, meetingId: string): Promise<MeetingNotes | undefined>;
  upsertMeetingNotes(notes: InsertMeetingNotes): Promise<MeetingNotes>;
  createMeetingFeedback(feedback: InsertMeetingFeedback): Promise<MeetingFeedback>;

  // Phase 5: Meeting action items operations
  getMeetingActionItems(organizationId: string, meetingId: string): Promise<MeetingActionItem[]>;
  getActionItemsByAssignee(organizationId: string, userId: string): Promise<MeetingActionItem[]>;
  createMeetingActionItem(item: InsertMeetingActionItem): Promise<MeetingActionItem>;
  updateMeetingActionItem(id: string, organizationId: string, data: Partial<MeetingActionItem>): Promise<MeetingActionItem>;
  deleteMeetingActionItem(id: string, organizationId: string): Promise<void>;

  // Phase 5: Meeting attendance operations
  getMeetingAttendance(organizationId: string, meetingId: string): Promise<MeetingAttendance[]>;
  upsertMeetingAttendance(data: InsertMeetingAttendance): Promise<MeetingAttendance>;
  updateMeetingAttendance(id: string, organizationId: string, data: Partial<MeetingAttendance>): Promise<MeetingAttendance>;
  
  // Background check operations
  getBackgroundCheck(userId: string, organizationId: string): Promise<BackgroundCheck | undefined>;
  upsertBackgroundCheck(check: InsertBackgroundCheck): Promise<BackgroundCheck>;
  
  // Permissions operations
  getRolePermissions(role: string): Promise<RolePermission[]>;
  addRolePermission(permission: InsertRolePermission): Promise<RolePermission>;
  removeRolePermission(role: string, permission: string): Promise<void>;
  
  // Team join requests operations
  getTeamJoinRequests(organizationId: string, ministryId?: string): Promise<TeamJoinRequest[]>;
  getTeamJoinRequestsByUser(userId: string): Promise<TeamJoinRequest[]>;
  getTeamJoinRequest(id: string, organizationId: string): Promise<TeamJoinRequest | undefined>;
  createTeamJoinRequest(request: InsertTeamJoinRequest): Promise<TeamJoinRequest>;
  updateTeamJoinRequest(id: string, organizationId: string, data: Partial<TeamJoinRequest>): Promise<TeamJoinRequest>;
  
  // Team roster operations
  getMinistryMembers(ministryId: string, organizationId: string): Promise<RoleAssignment[]>;
  getMinistryMemberCounts(organizationId: string): Promise<{ ministryId: string; count: number }[]>;
  
  // Messages operations
  getMessages(organizationId: string, userId: string): Promise<Message[]>;
  getMessage(id: string, organizationId: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageRead(id: string, organizationId: string): Promise<void>;
  
  // Manuals operations
  getManuals(organizationId: string, ministryId?: string): Promise<Manual[]>;
  getManual(id: string, organizationId: string): Promise<Manual | undefined>;
  createManual(manual: InsertManual): Promise<Manual>;
  updateManual(id: string, organizationId: string, data: Partial<InsertManual>): Promise<Manual>;
  deleteManual(id: string, organizationId: string): Promise<void>;
  
  // Team invites operations
  getTeamInvites(organizationId: string, ministryId?: string): Promise<TeamInvite[]>;
  getTeamInvite(id: string, organizationId: string): Promise<TeamInvite | undefined>;
  getTeamInviteByToken(token: string): Promise<TeamInvite | undefined>;
  getPendingInvitesByEmail(email: string): Promise<TeamInvite[]>;
  createTeamInvite(invite: InsertTeamInvite): Promise<TeamInvite>;
  updateTeamInvite(id: string, organizationId: string, data: Partial<TeamInvite>): Promise<TeamInvite>;
  deleteTeamInvite(id: string, organizationId: string): Promise<void>;
  
  // Ministry selections operations (for multi-ministry onboarding)
  getUserMinistrySelections(userId: string): Promise<MinistrySelection[]>;
  createMinistrySelection(selection: InsertMinistrySelection): Promise<MinistrySelection>;
  deleteUserMinistrySelections(userId: string): Promise<void>;
  
  // Onboarding steps operations
  getUserOnboardingSteps(userId: string): Promise<OnboardingStep[]>;
  getOnboardingStep(userId: string, stepType: string, ministryId?: string): Promise<OnboardingStep | undefined>;
  upsertOnboardingStep(step: InsertOnboardingStep): Promise<OnboardingStep>;
  
  // Quiz operations
  getQuizQuestions(organizationId: string, manualId?: string, trainingId?: string, category?: string): Promise<QuizQuestion[]>;
  createQuizQuestion(question: InsertQuizQuestion): Promise<QuizQuestion>;
  getUserQuizAttempts(userId: string, manualId?: string, trainingId?: string): Promise<QuizAttempt[]>;
  createQuizAttempt(attempt: InsertQuizAttempt): Promise<QuizAttempt>;
  
  // Recurring activities operations
  getRecurringActivities(organizationId: string, ministryId?: string): Promise<RecurringActivity[]>;
  getRecurringActivity(id: string, organizationId: string): Promise<RecurringActivity | undefined>;
  createRecurringActivity(activity: InsertRecurringActivity): Promise<RecurringActivity>;
  updateRecurringActivity(id: string, organizationId: string, activity: Partial<InsertRecurringActivity>): Promise<RecurringActivity>;

  // Metrics submissions operations
  getMetricsSubmissions(organizationId: string, activityId?: string, status?: string): Promise<MetricsSubmission[]>;
  getMetricsSubmission(id: string, organizationId: string): Promise<MetricsSubmission | undefined>;
  createMetricsSubmission(submission: InsertMetricsSubmission): Promise<MetricsSubmission>;
  updateMetricsSubmission(id: string, organizationId: string, submission: Partial<InsertMetricsSubmission>): Promise<MetricsSubmission>;
  
  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(organizationId: string, entityType: string, entityId: string): Promise<AuditLog[]>;
  
  // User archive operations
  archiveUser(userId: string, archivedBy: string, reason?: string): Promise<UserArchive>;
  restoreUser(archiveId: string, restoredBy: string): Promise<void>;
  getArchivedUsers(organizationId: string): Promise<UserArchive[]>;
  
  // Ministry archive operations
  archiveMinistry(ministryId: string, organizationId: string, archivedBy: string, reason?: string): Promise<MinistryArchive>;
  restoreMinistry(archiveId: string, restoredBy: string): Promise<void>;
  
  // Room layout operations
  getRoomLayouts(organizationId: string, roomId: string): Promise<RoomLayout[]>;
  createRoomLayout(layout: InsertRoomLayout): Promise<RoomLayout>;
  updateRoomLayout(id: string, organizationId: string, layout: Partial<InsertRoomLayout>): Promise<RoomLayout>;
  deleteRoomLayout(id: string, organizationId: string): Promise<void>;
  
  // Archive room operation
  archiveRoom(roomId: string, archivedBy: string): Promise<Room>;
  
  // Notification operations
  getNotifications(organizationId: string, userId: string, unreadOnly?: boolean): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string, organizationId: string): Promise<void>;
  markAllNotificationsRead(organizationId: string, userId: string): Promise<void>;
  
  // Manual analysis operations
  getManualAnalysis(manualId: string, organizationId: string): Promise<ManualAnalysis | undefined>;
  createManualAnalysis(analysis: InsertManualAnalysis): Promise<ManualAnalysis>;
  updateManualAnalysis(manualId: string, organizationId: string, data: Partial<InsertManualAnalysis>): Promise<ManualAnalysis>;
  getTrainingByManualId(manualId: string, organizationId: string): Promise<TrainingModule | undefined>;
  
  // Config Bank / Field Bank operations
  getAdminTags(organizationId: string): Promise<AdminTag[]>;
  createAdminTag(tag: InsertAdminTag): Promise<AdminTag>;
  updateAdminTag(id: string, organizationId: string, data: Partial<InsertAdminTag>): Promise<AdminTag>;
  deleteAdminTag(id: string, organizationId: string): Promise<void>;

  getServeRoles(organizationId: string): Promise<ServeRole[]>;
  createServeRole(role: InsertServeRole): Promise<ServeRole>;
  updateServeRole(id: string, organizationId: string, data: Partial<InsertServeRole>): Promise<ServeRole>;
  deleteServeRole(id: string, organizationId: string): Promise<void>;

  getStaffTitles(organizationId: string): Promise<StaffTitle[]>;
  createStaffTitle(title: InsertStaffTitle): Promise<StaffTitle>;
  updateStaffTitle(id: string, organizationId: string, data: Partial<InsertStaffTitle>): Promise<StaffTitle>;
  deleteStaffTitle(id: string, organizationId: string): Promise<void>;

  getGlobalLabels(organizationId: string): Promise<GlobalLabel[]>;
  createGlobalLabel(label: InsertGlobalLabel): Promise<GlobalLabel>;
  updateGlobalLabel(id: string, organizationId: string, data: Partial<InsertGlobalLabel>): Promise<GlobalLabel>;
  deleteGlobalLabel(id: string, organizationId: string): Promise<void>;
  
  // Phase 7: Organization settings operations
  getOrgSettings(organizationId: string): Promise<OrgSettings | undefined>;
  upsertOrgSettings(organizationId: string, data: Partial<InsertOrgSettings>): Promise<OrgSettings>;
  
  // Phase 9: Help center operations
  getHelpArticles(category?: string): Promise<HelpArticle[]>;
  getHelpArticle(id: string): Promise<HelpArticle | undefined>;
  getHelpArticleBySlug(slug: string): Promise<HelpArticle | undefined>;
  searchHelpArticles(query: string): Promise<HelpArticle[]>;
  createHelpArticle(article: InsertHelpArticle): Promise<HelpArticle>;
  updateHelpArticle(id: string, data: Partial<InsertHelpArticle>): Promise<HelpArticle>;
  incrementHelpArticleViews(id: string): Promise<void>;
  deleteHelpArticle(id: string): Promise<void>;
  
  // Calendar categories operations
  getCalendarCategories(activeOnly?: boolean): Promise<CalendarCategory[]>;
  getCalendarCategory(id: string): Promise<CalendarCategory | undefined>;
  createCalendarCategory(category: InsertCalendarCategory): Promise<CalendarCategory>;
  updateCalendarCategory(id: string, data: Partial<InsertCalendarCategory>): Promise<CalendarCategory>;
  deleteCalendarCategory(id: string): Promise<void>;
  
  // Password reset operations
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ userId: string; expiresAt: Date; usedAt: Date | null } | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Organization (tenant) operations
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org;
  }

  // Used by server-startup seed scripts that have no per-request tenant context;
  // returns the oldest organization, or undefined if none exists yet (fresh install).
  async getFirstOrganization(): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).orderBy(organizations.createdAt).limit(1);
    return org;
  }

  async createOrganization(name: string, ownerId?: string): Promise<Organization> {
    const slug = slugifyOrganizationName(name);
    const [org] = await db
      .insert(organizations)
      .values({ name, slug, ownerId })
      .returning();
    return org;
  }

  async updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization> {
    const [org] = await db
      .update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return org;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Case-insensitive email lookup
    const [user] = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${email})`);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Case-insensitive username lookup
    const [user] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${username})`);
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if user exists by id
    if (userData.id) {
      const existing = await this.getUser(userData.id);
      if (existing) {
        // Update existing user
        const [user] = await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userData.id))
          .returning();
        return user;
      }
    }
    
    // Check if user exists by email (prevent duplicate email errors) - case-insensitive
    if (userData.email) {
      const [existingByEmail] = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${userData.email})`);
      if (existingByEmail) {
        // Update existing user by email
        const updateData = { ...userData };
        delete (updateData as any).id; // Don't overwrite ID
        const [user] = await db
          .update(users)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return user;
      }
    }
    
    // Create new user
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Survey progress operations
  async getSurveyProgress(userId: string): Promise<SurveyProgress | undefined> {
    const [progress] = await db
      .select()
      .from(surveyProgress)
      .where(eq(surveyProgress.userId, userId));
    return progress;
  }

  async upsertSurveyProgress(progressData: InsertSurveyProgress): Promise<SurveyProgress> {
    // Check if progress exists
    const existing = await this.getSurveyProgress(progressData.userId);
    
    if (existing) {
      const [progress] = await db
        .update(surveyProgress)
        .set({
          ...progressData,
          updatedAt: new Date(),
        })
        .where(eq(surveyProgress.userId, progressData.userId))
        .returning();
      return progress;
    } else {
      const [progress] = await db
        .insert(surveyProgress)
        .values(progressData)
        .returning();
      return progress;
    }
  }

  async markSurveyComplete(userId: string): Promise<void> {
    await db
      .update(surveyProgress)
      .set({ isComplete: true, updatedAt: new Date() })
      .where(eq(surveyProgress.userId, userId));
  }

  async deleteSurveyProgress(userId: string): Promise<void> {
    await db
      .delete(surveyProgress)
      .where(eq(surveyProgress.userId, userId));
  }

  // Survey results operations
  async getSurveyResults(userId: string): Promise<SurveyResultsType | undefined> {
    const [results] = await db
      .select()
      .from(surveyResults)
      .where(eq(surveyResults.userId, userId))
      .orderBy(surveyResults.completedAt);
    return results;
  }

  async createSurveyResults(resultsData: InsertSurveyResults): Promise<SurveyResultsType> {
    // Delete any existing results for this user first (for retakes)
    await db.delete(surveyResults).where(eq(surveyResults.userId, resultsData.userId));
    
    const [results] = await db
      .insert(surveyResults)
      .values(resultsData)
      .returning();
    return results;
  }

  async markEmailSent(resultId: string): Promise<void> {
    await db
      .update(surveyResults)
      .set({ emailSent: true })
      .where(eq(surveyResults.id, resultId));
  }

  async getAllResultsWithUnsentEmails(): Promise<Array<{ user: User; results: SurveyResultsType }>> {
    const resultsWithUsers = await db
      .select({
        user: users,
        results: surveyResults,
      })
      .from(surveyResults)
      .innerJoin(users, eq(surveyResults.userId, users.id))
      .where(eq(surveyResults.emailSent, false));
    
    return resultsWithUsers;
  }

  // Additional user operations
  async getAllUsers(organizationId: string): Promise<User[]> {
    return await db.select().from(users)
      .where(and(eq(users.organizationId, organizationId), eq(users.isArchived, false)));
  }

  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserOnboardingStatus(userId: string, status: OnboardingStatus): Promise<void> {
    const updates: Partial<User> = {
      onboardingStatus: status,
      updatedAt: new Date(),
    };
    
    if (status === 'completed') {
      updates.onboardingCompletedAt = new Date();
    }
    
    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId));
  }

  // Onboarding progress operations
  async getOnboardingProgress(userId: string): Promise<OnboardingProgress | undefined> {
    const [progress] = await db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.userId, userId));
    return progress;
  }

  async upsertOnboardingProgress(progressData: InsertOnboardingProgress): Promise<OnboardingProgress> {
    const existing = await this.getOnboardingProgress(progressData.userId);
    
    if (existing) {
      const [progress] = await db
        .update(onboardingProgress)
        .set({
          ...progressData,
          updatedAt: new Date(),
          completedAt: progressData.isComplete ? new Date() : undefined,
        })
        .where(eq(onboardingProgress.userId, progressData.userId))
        .returning();
      return progress;
    } else {
      const [progress] = await db
        .insert(onboardingProgress)
        .values(progressData)
        .returning();
      return progress;
    }
  }

  // Profile operations
  async updateUserProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    socialLinks?: SocialLinks;
    profileImageUrl?: string;
    phone?: string;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async markProfileComplete(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        profileCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Integration settings operations
  async getIntegrationSettings(integrationName: string): Promise<IntegrationSettings | undefined> {
    const [settings] = await db
      .select()
      .from(integrationSettings)
      .where(eq(integrationSettings.integrationName, integrationName));
    return settings;
  }

  async upsertIntegrationSettings(settingsData: InsertIntegrationSettings): Promise<IntegrationSettings> {
    const existing = await this.getIntegrationSettings(settingsData.integrationName);
    
    if (existing) {
      const [settings] = await db
        .update(integrationSettings)
        .set({
          ...settingsData,
          updatedAt: new Date(),
        })
        .where(eq(integrationSettings.integrationName, settingsData.integrationName))
        .returning();
      return settings;
    } else {
      const [settings] = await db
        .insert(integrationSettings)
        .values(settingsData)
        .returning();
      return settings;
    }
  }

  // Service assignments operations
  async getServiceAssignments(userId: string): Promise<ServiceAssignment[]> {
    return await db
      .select()
      .from(serviceAssignments)
      .where(eq(serviceAssignments.userId, userId))
      .orderBy(desc(serviceAssignments.scheduledDate));
  }

  async upsertServiceAssignment(assignmentData: InsertServiceAssignment): Promise<ServiceAssignment> {
    if (assignmentData.planningCenterScheduleId) {
      const [existing] = await db
        .select()
        .from(serviceAssignments)
        .where(eq(serviceAssignments.planningCenterScheduleId, assignmentData.planningCenterScheduleId));
      
      if (existing) {
        const [assignment] = await db
          .update(serviceAssignments)
          .set({
            ...assignmentData,
            syncedAt: new Date(),
          })
          .where(eq(serviceAssignments.planningCenterScheduleId, assignmentData.planningCenterScheduleId))
          .returning();
        return assignment;
      }
    }
    
    const [assignment] = await db
      .insert(serviceAssignments)
      .values(assignmentData)
      .returning();
    return assignment;
  }

  async deleteServiceAssignmentsByUser(userId: string): Promise<void> {
    await db
      .delete(serviceAssignments)
      .where(eq(serviceAssignments.userId, userId));
  }

  // Calendar events operations
  async getCalendarEvents(organizationId: string, startDate: Date, endDate?: Date): Promise<CalendarEvent[]> {
    if (endDate) {
      return await db
        .select()
        .from(calendarEvents)
        .where(and(
          eq(calendarEvents.organizationId, organizationId),
          gte(calendarEvents.startDate, startDate),
          lte(calendarEvents.startDate, endDate)
        ))
        .orderBy(calendarEvents.startDate);
    }
    return await db
      .select()
      .from(calendarEvents)
      .where(and(
        eq(calendarEvents.organizationId, organizationId),
        gte(calendarEvents.startDate, startDate)
      ))
      .orderBy(calendarEvents.startDate);
  }

  async getUserCalendarEvents(organizationId: string, userId: string, startDate: Date): Promise<CalendarEvent[]> {
    return await db
      .select()
      .from(calendarEvents)
      .where(and(
        eq(calendarEvents.organizationId, organizationId),
        eq(calendarEvents.createdBy, userId),
        gte(calendarEvents.startDate, startDate)
      ))
      .orderBy(calendarEvents.startDate);
  }

  async createCalendarEvent(eventData: InsertCalendarEvent): Promise<CalendarEvent> {
    const [event] = await db
      .insert(calendarEvents)
      .values(eventData)
      .returning();
    return event;
  }

  async updateCalendarEvent(id: string, organizationId: string, eventData: Partial<InsertCalendarEvent>): Promise<CalendarEvent> {
    const [event] = await db
      .update(calendarEvents)
      .set({
        ...eventData,
        updatedAt: new Date(),
      })
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.organizationId, organizationId)))
      .returning();
    return event;
  }

  async deleteCalendarEvent(id: string, organizationId: string): Promise<void> {
    await db
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.organizationId, organizationId)));
  }

  // Ministries operations
  async getMinistries(organizationId: string): Promise<Ministry[]> {
    return await db.select().from(ministries)
      .where(and(eq(ministries.organizationId, organizationId), eq(ministries.isActive, true)));
  }

  async getMinistry(id: string, organizationId: string): Promise<Ministry | undefined> {
    const [ministry] = await db.select().from(ministries)
      .where(and(eq(ministries.id, id), eq(ministries.organizationId, organizationId)));
    return ministry;
  }

  async createMinistry(data: InsertMinistry): Promise<Ministry> {
    const [ministry] = await db.insert(ministries).values(data).returning();
    return ministry;
  }

  async updateMinistry(id: string, organizationId: string, data: Partial<InsertMinistry>): Promise<Ministry> {
    const [ministry] = await db.update(ministries).set({ ...data, updatedAt: new Date() })
      .where(and(eq(ministries.id, id), eq(ministries.organizationId, organizationId))).returning();
    return ministry;
  }

  async getChildMinistries(parentMinistryId: string, organizationId: string): Promise<Ministry[]> {
    return await db.select().from(ministries)
      .where(and(
        eq(ministries.parentMinistryId, parentMinistryId),
        eq(ministries.organizationId, organizationId),
        eq(ministries.isActive, true)
      ));
  }

  // Ministry leaders operations
  async getMinistryLeaders(ministryId: string, organizationId: string): Promise<MinistryLeader[]> {
    return await db.select().from(ministryLeaders)
      .where(and(eq(ministryLeaders.ministryId, ministryId), eq(ministryLeaders.organizationId, organizationId)));
  }

  async addMinistryLeader(data: InsertMinistryLeader): Promise<MinistryLeader> {
    const [leader] = await db.insert(ministryLeaders).values(data).returning();
    return leader;
  }

  async removeMinistryLeader(ministryId: string, userId: string): Promise<void> {
    await db.delete(ministryLeaders)
      .where(and(
        eq(ministryLeaders.ministryId, ministryId),
        eq(ministryLeaders.userId, userId)
      ));
  }

  async updateMinistryLeader(id: string, organizationId: string, data: Partial<InsertMinistryLeader>): Promise<MinistryLeader> {
    const [leader] = await db.update(ministryLeaders).set(data)
      .where(and(eq(ministryLeaders.id, id), eq(ministryLeaders.organizationId, organizationId))).returning();
    return leader;
  }

  // Ministry leadership assignments (H1)
  async createMinistryLeadershipAssignment(data: InsertMinistryLeadershipAssignment): Promise<MinistryLeadershipAssignment> {
    const [assignment] = await db.insert(ministryLeadershipAssignments).values(data).returning();
    return assignment;
  }

  async getMinistryLeadershipAssignments(ministryId: string, organizationId: string): Promise<MinistryLeadershipAssignment[]> {
    return await db.select().from(ministryLeadershipAssignments)
      .where(and(
        eq(ministryLeadershipAssignments.ministryId, ministryId),
        eq(ministryLeadershipAssignments.organizationId, organizationId),
        eq(ministryLeadershipAssignments.isActive, true)
      ));
  }

  async getUserLeadershipAssignments(userId: string): Promise<MinistryLeadershipAssignment[]> {
    return await db.select().from(ministryLeadershipAssignments)
      .where(and(
        eq(ministryLeadershipAssignments.userId, userId),
        eq(ministryLeadershipAssignments.isActive, true)
      ));
  }

  async getLeadershipAssignment(id: string, organizationId: string): Promise<MinistryLeadershipAssignment | undefined> {
    const [assignment] = await db.select().from(ministryLeadershipAssignments)
      .where(and(eq(ministryLeadershipAssignments.id, id), eq(ministryLeadershipAssignments.organizationId, organizationId)));
    return assignment;
  }

  async updateLeadershipAssignment(id: string, organizationId: string, data: Partial<InsertMinistryLeadershipAssignment>): Promise<MinistryLeadershipAssignment> {
    const [assignment] = await db.update(ministryLeadershipAssignments)
      .set(data)
      .where(and(eq(ministryLeadershipAssignments.id, id), eq(ministryLeadershipAssignments.organizationId, organizationId)))
      .returning();
    return assignment;
  }

  async getAllActiveLeadershipAssignments(organizationId: string): Promise<MinistryLeadershipAssignment[]> {
    return await db.select().from(ministryLeadershipAssignments)
      .where(and(eq(ministryLeadershipAssignments.organizationId, organizationId), eq(ministryLeadershipAssignments.isActive, true)));
  }

  // Role assignments operations
  async getRoleAssignments(organizationId: string): Promise<RoleAssignment[]> {
    return await db.select().from(roleAssignments).where(and(eq(roleAssignments.organizationId, organizationId), eq(roleAssignments.isActive, true)));
  }

  async getUserRoleAssignments(userId: string): Promise<RoleAssignment[]> {
    return await db.select().from(roleAssignments)
      .where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.isActive, true)));
  }

  async createRoleAssignment(data: InsertRoleAssignment): Promise<RoleAssignment> {
    const [assignment] = await db.insert(roleAssignments).values(data).returning();
    return assignment;
  }

  async updateRoleAssignment(id: string, organizationId: string, data: Partial<InsertRoleAssignment>): Promise<RoleAssignment> {
    const [assignment] = await db.update(roleAssignments).set(data)
      .where(and(eq(roleAssignments.id, id), eq(roleAssignments.organizationId, organizationId))).returning();
    return assignment;
  }

  async deleteRoleAssignment(id: string, organizationId: string): Promise<void> {
    await db.update(roleAssignments).set({ isActive: false })
      .where(and(eq(roleAssignments.id, id), eq(roleAssignments.organizationId, organizationId)));
  }

  // Training modules operations
  async getTrainingModules(organizationId: string, ministryId?: string, includeInactive?: boolean): Promise<TrainingModule[]> {
    if (ministryId) {
      if (includeInactive) {
        return await db.select().from(trainingModules)
          .where(and(eq(trainingModules.organizationId, organizationId), eq(trainingModules.ministryId, ministryId)));
      }
      return await db.select().from(trainingModules)
        .where(and(eq(trainingModules.organizationId, organizationId), eq(trainingModules.ministryId, ministryId), eq(trainingModules.isActive, true)));
    }
    if (includeInactive) {
      return await db.select().from(trainingModules).where(eq(trainingModules.organizationId, organizationId));
    }
    return await db.select().from(trainingModules)
      .where(and(eq(trainingModules.organizationId, organizationId), eq(trainingModules.isActive, true)));
  }

  async getTrainingModule(id: string, organizationId: string): Promise<TrainingModule | undefined> {
    const [module] = await db.select().from(trainingModules)
      .where(and(eq(trainingModules.id, id), eq(trainingModules.organizationId, organizationId)));
    return module;
  }

  async createTrainingModule(data: InsertTrainingModule): Promise<TrainingModule> {
    const [module] = await db.insert(trainingModules).values(data).returning();
    return module;
  }

  async updateTrainingModule(id: string, organizationId: string, data: Partial<InsertTrainingModule>): Promise<TrainingModule> {
    const [module] = await db.update(trainingModules).set({ ...data, updatedAt: new Date() })
      .where(and(eq(trainingModules.id, id), eq(trainingModules.organizationId, organizationId))).returning();
    return module;
  }

  async deleteTrainingModule(id: string): Promise<void> {
    await db.delete(userTrainingProgress).where(eq(userTrainingProgress.moduleId, id));
    await db.delete(trainingAssessments).where(eq(trainingAssessments.moduleId, id));
    await db.delete(trainingModules).where(eq(trainingModules.id, id));
  }

  async getTrainingAssessments(moduleId: string): Promise<TrainingAssessment[]> {
    return await db.select().from(trainingAssessments)
      .where(eq(trainingAssessments.moduleId, moduleId));
  }

  async createTrainingAssessment(data: InsertTrainingAssessment): Promise<TrainingAssessment> {
    const [assessment] = await db.insert(trainingAssessments).values(data).returning();
    return assessment;
  }

  async updateTrainingAssessment(id: string, data: Partial<InsertTrainingAssessment>): Promise<TrainingAssessment> {
    const [assessment] = await db.update(trainingAssessments).set(data)
      .where(eq(trainingAssessments.id, id)).returning();
    return assessment;
  }

  async deleteTrainingAssessment(id: string): Promise<void> {
    await db.delete(trainingAssessments).where(eq(trainingAssessments.id, id));
  }

  // User training progress operations
  async getUserTrainingProgress(userId: string): Promise<UserTrainingProgress[]> {
    return await db.select().from(userTrainingProgress)
      .where(eq(userTrainingProgress.userId, userId));
  }

  async getUserModuleProgress(userId: string, moduleId: string): Promise<UserTrainingProgress | undefined> {
    const [progress] = await db.select().from(userTrainingProgress)
      .where(and(eq(userTrainingProgress.userId, userId), eq(userTrainingProgress.moduleId, moduleId)));
    return progress;
  }

  async upsertUserTrainingProgress(data: InsertUserTrainingProgress): Promise<UserTrainingProgress> {
    const existing = await this.getUserModuleProgress(data.userId, data.moduleId);
    if (existing) {
      const [progress] = await db.update(userTrainingProgress)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userTrainingProgress.id, existing.id)).returning();
      return progress;
    }
    const [progress] = await db.insert(userTrainingProgress).values(data).returning();
    return progress;
  }

  // Phase 3: Get all training progress records
  async getAllTrainingProgress(): Promise<UserTrainingProgress[]> {
    return await db.select().from(userTrainingProgress);
  }

  // Phase 3: Update training progress by ID
  async updateTrainingProgress(id: string, data: Partial<UserTrainingProgress>): Promise<UserTrainingProgress> {
    const [progress] = await db.update(userTrainingProgress)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userTrainingProgress.id, id)).returning();
    return progress;
  }

  // Gamification operations
  async getBadges(organizationId: string): Promise<Badge[]> {
    return await db.select().from(badges).where(and(eq(badges.organizationId, organizationId), eq(badges.isActive, true)));
  }

  async createBadge(data: InsertBadge): Promise<Badge> {
    const [badge] = await db.insert(badges).values(data).returning();
    return badge;
  }

  async getUserBadges(userId: string, organizationId: string): Promise<UserBadge[]> {
    return await db.select().from(userBadges).where(and(eq(userBadges.userId, userId), eq(userBadges.organizationId, organizationId)));
  }

  async awardBadge(data: InsertUserBadge): Promise<UserBadge> {
    const [userBadge] = await db.insert(userBadges).values(data).returning();
    return userBadge;
  }

  async getUserXp(userId: string, organizationId: string): Promise<number> {
    const result = await db.select({ total: sql<number>`COALESCE(SUM(${xpLogs.amount}), 0)` })
      .from(xpLogs).where(and(eq(xpLogs.userId, userId), eq(xpLogs.organizationId, organizationId)));
    return result[0]?.total ?? 0;
  }

  async addXpLog(data: InsertXpLog): Promise<XpLog> {
    const [log] = await db.insert(xpLogs).values(data).returning();
    return log;
  }

  async getXpLogs(userId: string, organizationId: string): Promise<XpLog[]> {
    return await db.select().from(xpLogs).where(and(eq(xpLogs.userId, userId), eq(xpLogs.organizationId, organizationId)))
      .orderBy(desc(xpLogs.createdAt));
  }

  // Phase 3: Convenience method to award XP
  async awardXp(organizationId: string, userId: string, amount: number, sourceType: string, reason: string): Promise<XpLog> {
    return this.addXpLog({
      organizationId,
      userId,
      amount,
      sourceType,
      reason,
    });
  }

  // Rooms operations
  async getRooms(organizationId: string): Promise<Room[]> {
    return await db.select().from(rooms).where(and(eq(rooms.organizationId, organizationId), eq(rooms.isActive, true)));
  }

  async getRoom(id: string, organizationId: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(and(eq(rooms.id, id), eq(rooms.organizationId, organizationId)));
    return room;
  }

  async createRoom(data: InsertRoom): Promise<Room> {
    const [room] = await db.insert(rooms).values(data).returning();
    return room;
  }

  async updateRoom(id: string, organizationId: string, data: Partial<InsertRoom>): Promise<Room> {
    const [room] = await db.update(rooms).set({ ...data, updatedAt: new Date() })
      .where(and(eq(rooms.id, id), eq(rooms.organizationId, organizationId))).returning();
    return room;
  }

  async deleteRoom(id: string, organizationId: string): Promise<void> {
    await db.update(rooms).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(rooms.id, id), eq(rooms.organizationId, organizationId)));
  }

  // Resources operations
  async getResources(organizationId: string): Promise<Resource[]> {
    return await db.select().from(resources).where(and(eq(resources.organizationId, organizationId), eq(resources.isActive, true)));
  }

  async createResource(data: InsertResource): Promise<Resource> {
    const [resource] = await db.insert(resources).values(data).returning();
    return resource;
  }

  async updateResource(id: string, organizationId: string, data: Partial<InsertResource>): Promise<Resource> {
    const [resource] = await db.update(resources).set({ ...data, updatedAt: new Date() })
      .where(and(eq(resources.id, id), eq(resources.organizationId, organizationId))).returning();
    return resource;
  }

  async deleteResource(id: string, organizationId: string): Promise<void> {
    await db.update(resources).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(resources.id, id), eq(resources.organizationId, organizationId)));
  }

  // Room reservations operations
  async getRoomReservations(organizationId: string, startDate: Date, endDate?: Date): Promise<RoomReservation[]> {
    if (endDate) {
      return await db.select().from(roomReservations)
        .where(and(
          eq(roomReservations.organizationId, organizationId),
          gte(roomReservations.startTime, startDate),
          lte(roomReservations.startTime, endDate)
        ))
        .orderBy(roomReservations.startTime);
    }
    return await db.select().from(roomReservations)
      .where(and(eq(roomReservations.organizationId, organizationId), gte(roomReservations.startTime, startDate)))
      .orderBy(roomReservations.startTime);
  }

  // Get room reservations that overlap with a given time range (for conflict detection)
  // Overlap occurs when: existingStart < newEnd AND existingEnd > newStart
  async getRoomReservationsForConflictCheck(organizationId: string, roomId: string, startTime: Date, endTime: Date): Promise<RoomReservation[]> {
    return await db.select().from(roomReservations)
      .where(and(
        eq(roomReservations.organizationId, organizationId),
        eq(roomReservations.roomId, roomId),
        // Filter for overlap: existingStart < newEnd AND existingEnd > newStart
        lt(roomReservations.startTime, endTime),
        gt(roomReservations.endTime, startTime)
      ))
      .orderBy(roomReservations.startTime);
  }

  async getRoomReservationsByUser(organizationId: string, userId: string): Promise<RoomReservation[]> {
    return await db.select().from(roomReservations)
      .where(and(eq(roomReservations.organizationId, organizationId), eq(roomReservations.requestedBy, userId)))
      .orderBy(desc(roomReservations.createdAt));
  }

  async getRoomReservation(id: string, organizationId: string): Promise<RoomReservation | undefined> {
    const [reservation] = await db.select().from(roomReservations)
      .where(and(eq(roomReservations.id, id), eq(roomReservations.organizationId, organizationId)));
    return reservation;
  }

  async createRoomReservation(data: InsertRoomReservation): Promise<RoomReservation> {
    const [reservation] = await db.insert(roomReservations).values(data).returning();
    return reservation;
  }

  async updateRoomReservation(id: string, organizationId: string, data: Partial<InsertRoomReservation>): Promise<RoomReservation> {
    const [reservation] = await db.update(roomReservations)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(roomReservations.id, id), eq(roomReservations.organizationId, organizationId))).returning();
    return reservation;
  }

  // Attendance reports operations
  async getAttendanceReports(organizationId: string, startDate: Date, endDate?: Date): Promise<AttendanceReport[]> {
    if (endDate) {
      return await db.select().from(attendanceReports)
        .where(and(
          eq(attendanceReports.organizationId, organizationId),
          gte(attendanceReports.eventDate, startDate),
          lte(attendanceReports.eventDate, endDate)
        ))
        .orderBy(desc(attendanceReports.eventDate));
    }
    return await db.select().from(attendanceReports)
      .where(and(eq(attendanceReports.organizationId, organizationId), gte(attendanceReports.eventDate, startDate)))
      .orderBy(desc(attendanceReports.eventDate));
  }

  async createAttendanceReport(data: InsertAttendanceReport): Promise<AttendanceReport> {
    const [report] = await db.insert(attendanceReports).values(data).returning();
    return report;
  }

  // Weekly ministry metrics operations
  async getWeeklyMetrics(organizationId: string, weekStartDate: Date, ministryIds?: string[]): Promise<WeeklyMinistryMetrics[]> {
    if (ministryIds && ministryIds.length > 0) {
      return await db.select().from(weeklyMinistryMetrics)
        .where(and(
          eq(weeklyMinistryMetrics.organizationId, organizationId),
          eq(weeklyMinistryMetrics.weekStartDate, weekStartDate),
          sql`${weeklyMinistryMetrics.ministryId} = ANY(${ministryIds})`
        ))
        .orderBy(desc(weeklyMinistryMetrics.submittedAt));
    }
    return await db.select().from(weeklyMinistryMetrics)
      .where(and(eq(weeklyMinistryMetrics.organizationId, organizationId), eq(weeklyMinistryMetrics.weekStartDate, weekStartDate)))
      .orderBy(desc(weeklyMinistryMetrics.submittedAt));
  }

  async getWeeklyMetricsByRange(organizationId: string, startDate: Date, endDate: Date, ministryIds?: string[]): Promise<WeeklyMinistryMetrics[]> {
    const conditions = [
      eq(weeklyMinistryMetrics.organizationId, organizationId),
      gte(weeklyMinistryMetrics.weekStartDate, startDate),
      lte(weeklyMinistryMetrics.weekStartDate, endDate)
    ];
    if (ministryIds && ministryIds.length > 0) {
      conditions.push(sql`${weeklyMinistryMetrics.ministryId} = ANY(${ministryIds})`);
    }
    return await db.select().from(weeklyMinistryMetrics)
      .where(and(...conditions))
      .orderBy(desc(weeklyMinistryMetrics.weekStartDate));
  }

  async upsertWeeklyMetrics(data: InsertWeeklyMinistryMetrics): Promise<WeeklyMinistryMetrics> {
    const existing = await this.getWeeklyMetric(data.organizationId, data.ministryId, data.weekStartDate);
    if (existing) {
      const [updated] = await db.update(weeklyMinistryMetrics)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(weeklyMinistryMetrics.id, existing.id))
        .returning();
      return updated;
    }
    const [inserted] = await db.insert(weeklyMinistryMetrics).values(data).returning();
    return inserted;
  }

  async getWeeklyMetric(organizationId: string, ministryId: string, weekStartDate: Date): Promise<WeeklyMinistryMetrics | undefined> {
    const [metric] = await db.select().from(weeklyMinistryMetrics)
      .where(and(
        eq(weeklyMinistryMetrics.organizationId, organizationId),
        eq(weeklyMinistryMetrics.ministryId, ministryId),
        eq(weeklyMinistryMetrics.weekStartDate, weekStartDate)
      ));
    return metric;
  }

  // Support requests operations
  async getSupportRequests(organizationId: string, status?: string): Promise<SupportRequest[]> {
    if (status) {
      return await db.select().from(supportRequests)
        .where(and(eq(supportRequests.organizationId, organizationId), eq(supportRequests.status, status))).orderBy(desc(supportRequests.createdAt));
    }
    return await db.select().from(supportRequests).where(eq(supportRequests.organizationId, organizationId)).orderBy(desc(supportRequests.createdAt));
  }

  async getSupportRequest(id: string, organizationId: string): Promise<SupportRequest | undefined> {
    const [request] = await db.select().from(supportRequests).where(and(eq(supportRequests.id, id), eq(supportRequests.organizationId, organizationId)));
    return request;
  }

  async createSupportRequest(data: InsertSupportRequest): Promise<SupportRequest> {
    const [request] = await db.insert(supportRequests).values(data).returning();
    return request;
  }

  async updateSupportRequest(id: string, organizationId: string, data: Partial<InsertSupportRequest>): Promise<SupportRequest> {
    const [request] = await db.update(supportRequests).set({ ...data, updatedAt: new Date() })
      .where(and(eq(supportRequests.id, id), eq(supportRequests.organizationId, organizationId))).returning();
    return request;
  }

  // Intern portal operations
  async getInternProfiles(organizationId: string): Promise<InternProfile[]> {
    return await db.select().from(internProfiles).where(and(eq(internProfiles.organizationId, organizationId), eq(internProfiles.status, 'active')));
  }

  async getInternProfile(userId: string, organizationId: string): Promise<InternProfile | undefined> {
    const [profile] = await db.select().from(internProfiles)
      .where(and(eq(internProfiles.userId, userId), eq(internProfiles.organizationId, organizationId)));
    return profile;
  }

  async createInternProfile(data: InsertInternProfile): Promise<InternProfile> {
    const [profile] = await db.insert(internProfiles).values(data).returning();
    return profile;
  }

  async updateInternProfile(id: string, organizationId: string, data: Partial<InsertInternProfile>): Promise<InternProfile> {
    const [profile] = await db.update(internProfiles).set({ ...data, updatedAt: new Date() })
      .where(and(eq(internProfiles.id, id), eq(internProfiles.organizationId, organizationId))).returning();
    return profile;
  }

  async getInternLogs(internProfileId: string, organizationId: string): Promise<InternLog[]> {
    return await db.select().from(internLogs)
      .where(and(eq(internLogs.internProfileId, internProfileId), eq(internLogs.organizationId, organizationId))).orderBy(desc(internLogs.date));
  }

  async createInternLog(data: InsertInternLog): Promise<InternLog> {
    const [log] = await db.insert(internLogs).values(data).returning();
    return log;
  }

  // Meetings operations
  async getMeetings(organizationId: string, startDate?: Date): Promise<Meeting[]> {
    if (startDate) {
      return await db.select().from(meetings)
        .where(and(eq(meetings.organizationId, organizationId), gte(meetings.scheduledDate, startDate)))
        .orderBy(meetings.scheduledDate);
    }
    return await db.select().from(meetings)
      .where(eq(meetings.organizationId, organizationId))
      .orderBy(desc(meetings.scheduledDate));
  }

  async getMeeting(id: string, organizationId: string): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings)
      .where(and(eq(meetings.id, id), eq(meetings.organizationId, organizationId)));
    return meeting;
  }

  async createMeeting(data: InsertMeeting): Promise<Meeting> {
    const [meeting] = await db.insert(meetings).values(data).returning();
    return meeting;
  }

  async updateMeeting(id: string, organizationId: string, data: Partial<InsertMeeting>): Promise<Meeting> {
    const [meeting] = await db.update(meetings).set({ ...data, updatedAt: new Date() })
      .where(and(eq(meetings.id, id), eq(meetings.organizationId, organizationId))).returning();
    return meeting;
  }

  async getMeetingNotes(organizationId: string, meetingId: string): Promise<MeetingNotes | undefined> {
    const [notes] = await db.select().from(meetingNotes)
      .where(and(eq(meetingNotes.organizationId, organizationId), eq(meetingNotes.meetingId, meetingId)));
    return notes;
  }

  async upsertMeetingNotes(data: InsertMeetingNotes): Promise<MeetingNotes> {
    const existing = await this.getMeetingNotes(data.organizationId, data.meetingId);
    if (existing) {
      const [notes] = await db.update(meetingNotes).set({ ...data, updatedAt: new Date() })
        .where(eq(meetingNotes.meetingId, data.meetingId)).returning();
      return notes;
    }
    const [notes] = await db.insert(meetingNotes).values(data).returning();
    return notes;
  }

  async createMeetingFeedback(data: InsertMeetingFeedback): Promise<MeetingFeedback> {
    const [feedback] = await db.insert(meetingFeedback).values(data).returning();
    return feedback;
  }

  // Phase 5: Meeting action items operations
  async getMeetingActionItems(organizationId: string, meetingId: string): Promise<MeetingActionItem[]> {
    return await db.select().from(meetingActionItems)
      .where(and(eq(meetingActionItems.organizationId, organizationId), eq(meetingActionItems.meetingId, meetingId)))
      .orderBy(meetingActionItems.createdAt);
  }

  async getActionItemsByAssignee(organizationId: string, userId: string): Promise<MeetingActionItem[]> {
    return await db.select().from(meetingActionItems)
      .where(and(eq(meetingActionItems.organizationId, organizationId), eq(meetingActionItems.assigneeId, userId)))
      .orderBy(desc(meetingActionItems.createdAt));
  }

  async createMeetingActionItem(data: InsertMeetingActionItem): Promise<MeetingActionItem> {
    const [item] = await db.insert(meetingActionItems).values(data).returning();
    return item;
  }

  async updateMeetingActionItem(id: string, organizationId: string, data: Partial<MeetingActionItem>): Promise<MeetingActionItem> {
    const [item] = await db.update(meetingActionItems)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(meetingActionItems.id, id), eq(meetingActionItems.organizationId, organizationId))).returning();
    return item;
  }

  async deleteMeetingActionItem(id: string, organizationId: string): Promise<void> {
    await db.delete(meetingActionItems)
      .where(and(eq(meetingActionItems.id, id), eq(meetingActionItems.organizationId, organizationId)));
  }

  // Phase 5: Meeting attendance operations
  async getMeetingAttendance(organizationId: string, meetingId: string): Promise<MeetingAttendance[]> {
    return await db.select().from(meetingAttendance)
      .where(and(eq(meetingAttendance.organizationId, organizationId), eq(meetingAttendance.meetingId, meetingId)));
  }

  async upsertMeetingAttendance(data: InsertMeetingAttendance): Promise<MeetingAttendance> {
    const [existing] = await db.select().from(meetingAttendance)
      .where(and(
        eq(meetingAttendance.organizationId, data.organizationId),
        eq(meetingAttendance.meetingId, data.meetingId),
        eq(meetingAttendance.userId, data.userId)
      ));
    if (existing) {
      const [attendance] = await db.update(meetingAttendance)
        .set(data)
        .where(eq(meetingAttendance.id, existing.id)).returning();
      return attendance;
    }
    const [attendance] = await db.insert(meetingAttendance).values(data).returning();
    return attendance;
  }

  async updateMeetingAttendance(id: string, organizationId: string, data: Partial<MeetingAttendance>): Promise<MeetingAttendance> {
    const [attendance] = await db.update(meetingAttendance)
      .set(data)
      .where(and(eq(meetingAttendance.id, id), eq(meetingAttendance.organizationId, organizationId))).returning();
    return attendance;
  }

  // Background check operations
  async getBackgroundCheck(userId: string, organizationId: string): Promise<BackgroundCheck | undefined> {
    const [check] = await db.select().from(backgroundChecks)
      .where(and(eq(backgroundChecks.userId, userId), eq(backgroundChecks.organizationId, organizationId)));
    return check;
  }

  async upsertBackgroundCheck(data: InsertBackgroundCheck): Promise<BackgroundCheck> {
    const existing = await this.getBackgroundCheck(data.userId, data.organizationId);
    if (existing) {
      const [check] = await db.update(backgroundChecks).set({ ...data, updatedAt: new Date() })
        .where(eq(backgroundChecks.userId, data.userId)).returning();
      return check;
    }
    const [check] = await db.insert(backgroundChecks).values(data).returning();
    return check;
  }

  // Permissions operations
  async getRolePermissions(role: string): Promise<RolePermission[]> {
    return await db.select().from(rolePermissions).where(eq(rolePermissions.role, role));
  }

  async addRolePermission(data: InsertRolePermission): Promise<RolePermission> {
    const [permission] = await db.insert(rolePermissions).values(data).returning();
    return permission;
  }

  async removeRolePermission(role: string, permission: string): Promise<void> {
    await db.delete(rolePermissions)
      .where(and(eq(rolePermissions.role, role), eq(rolePermissions.permission, permission)));
  }

  // Team join requests operations
  async getTeamJoinRequests(organizationId: string, ministryId?: string): Promise<TeamJoinRequest[]> {
    if (ministryId) {
      return await db.select().from(teamJoinRequests)
        .where(and(eq(teamJoinRequests.organizationId, organizationId), eq(teamJoinRequests.ministryId, ministryId)))
        .orderBy(desc(teamJoinRequests.createdAt));
    }
    return await db.select().from(teamJoinRequests)
      .where(eq(teamJoinRequests.organizationId, organizationId))
      .orderBy(desc(teamJoinRequests.createdAt));
  }

  async getTeamJoinRequestsByUser(userId: string): Promise<TeamJoinRequest[]> {
    return await db.select().from(teamJoinRequests)
      .where(eq(teamJoinRequests.userId, userId))
      .orderBy(desc(teamJoinRequests.createdAt));
  }

  async getTeamJoinRequest(id: string, organizationId: string): Promise<TeamJoinRequest | undefined> {
    const [request] = await db.select().from(teamJoinRequests)
      .where(and(eq(teamJoinRequests.id, id), eq(teamJoinRequests.organizationId, organizationId)));
    return request;
  }

  async createTeamJoinRequest(data: InsertTeamJoinRequest): Promise<TeamJoinRequest> {
    const [request] = await db.insert(teamJoinRequests).values(data).returning();
    return request;
  }

  async updateTeamJoinRequest(id: string, organizationId: string, data: Partial<TeamJoinRequest>): Promise<TeamJoinRequest> {
    const [request] = await db.update(teamJoinRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(teamJoinRequests.id, id), eq(teamJoinRequests.organizationId, organizationId)))
      .returning();
    return request;
  }

  // Team roster operations
  async getMinistryMembers(ministryId: string, organizationId: string): Promise<RoleAssignment[]> {
    return await db.select().from(roleAssignments)
      .where(and(
        eq(roleAssignments.ministryId, ministryId),
        eq(roleAssignments.organizationId, organizationId),
        eq(roleAssignments.isActive, true)
      ));
  }

  async getMinistryMemberCounts(organizationId: string): Promise<{ ministryId: string; count: number }[]> {
    const results = await db.select({
      ministryId: roleAssignments.ministryId,
      count: sql<number>`count(*)::int`,
    })
      .from(roleAssignments)
      .where(and(eq(roleAssignments.organizationId, organizationId), eq(roleAssignments.isActive, true)))
      .groupBy(roleAssignments.ministryId);
    
    return results.filter(r => r.ministryId !== null) as { ministryId: string; count: number }[];
  }

  // Messages operations
  async getMessages(organizationId: string, userId: string): Promise<Message[]> {
    return await db.select().from(messages)
      .where(and(
        eq(messages.organizationId, organizationId),
        sql`(${messages.recipientId} = ${userId} OR ${messages.senderId} = ${userId})`
      ))
      .orderBy(desc(messages.createdAt));
  }

  async getMessage(id: string, organizationId: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages)
      .where(and(eq(messages.id, id), eq(messages.organizationId, organizationId)));
    return message;
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(data).returning();
    return message;
  }

  async markMessageRead(id: string, organizationId: string): Promise<void> {
    await db.update(messages).set({ isRead: true })
      .where(and(eq(messages.id, id), eq(messages.organizationId, organizationId)));
  }

  // Manuals operations
  async getManuals(organizationId: string, ministryId?: string): Promise<Manual[]> {
    if (ministryId) {
      return await db.select().from(manuals)
        .where(and(eq(manuals.organizationId, organizationId), eq(manuals.ministryId, ministryId)))
        .orderBy(manuals.sortOrder);
    }
    return await db.select().from(manuals).where(eq(manuals.organizationId, organizationId)).orderBy(manuals.sortOrder);
  }

  async getManual(id: string, organizationId: string): Promise<Manual | undefined> {
    const [manual] = await db.select().from(manuals).where(and(eq(manuals.id, id), eq(manuals.organizationId, organizationId)));
    return manual;
  }

  async createManual(data: InsertManual): Promise<Manual> {
    const [manual] = await db.insert(manuals).values(data).returning();
    return manual;
  }

  async updateManual(id: string, organizationId: string, data: Partial<InsertManual>): Promise<Manual> {
    const [manual] = await db.update(manuals)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(manuals.id, id), eq(manuals.organizationId, organizationId)))
      .returning();
    return manual;
  }

  async deleteManual(id: string, organizationId: string): Promise<void> {
    await db.delete(manuals).where(and(eq(manuals.id, id), eq(manuals.organizationId, organizationId)));
  }

  // Team invites operations
  async getTeamInvites(organizationId: string, ministryId?: string): Promise<TeamInvite[]> {
    if (ministryId) {
      return await db.select().from(teamInvites)
        .where(and(eq(teamInvites.organizationId, organizationId), eq(teamInvites.ministryId, ministryId)))
        .orderBy(desc(teamInvites.createdAt));
    }
    return await db.select().from(teamInvites)
      .where(eq(teamInvites.organizationId, organizationId))
      .orderBy(desc(teamInvites.createdAt));
  }

  async getTeamInvite(id: string, organizationId: string): Promise<TeamInvite | undefined> {
    const [invite] = await db.select().from(teamInvites)
      .where(and(eq(teamInvites.id, id), eq(teamInvites.organizationId, organizationId)));
    return invite;
  }

  async getTeamInviteByToken(token: string): Promise<TeamInvite | undefined> {
    const [invite] = await db.select().from(teamInvites)
      .where(eq(teamInvites.token, token));
    return invite;
  }

  async getPendingInvitesByEmail(email: string): Promise<TeamInvite[]> {
    return await db.select().from(teamInvites)
      .where(and(
        sql`LOWER(${teamInvites.email}) = LOWER(${email})`,
        eq(teamInvites.status, 'pending')
      ))
      .orderBy(desc(teamInvites.createdAt));
  }

  async createTeamInvite(data: InsertTeamInvite): Promise<TeamInvite> {
    const [invite] = await db.insert(teamInvites).values(data).returning();
    return invite;
  }

  async updateTeamInvite(id: string, organizationId: string, data: Partial<TeamInvite>): Promise<TeamInvite> {
    const [invite] = await db.update(teamInvites)
      .set(data)
      .where(and(eq(teamInvites.id, id), eq(teamInvites.organizationId, organizationId)))
      .returning();
    return invite;
  }

  async deleteTeamInvite(id: string, organizationId: string): Promise<void> {
    await db.delete(teamInvites).where(and(eq(teamInvites.id, id), eq(teamInvites.organizationId, organizationId)));
  }

  // Ministry selections operations
  async getUserMinistrySelections(userId: string): Promise<MinistrySelection[]> {
    return await db.select().from(ministrySelections)
      .where(eq(ministrySelections.userId, userId));
  }

  async createMinistrySelection(data: InsertMinistrySelection): Promise<MinistrySelection> {
    const [selection] = await db.insert(ministrySelections).values(data).returning();
    return selection;
  }

  async deleteUserMinistrySelections(userId: string): Promise<void> {
    await db.delete(ministrySelections).where(eq(ministrySelections.userId, userId));
  }

  // Onboarding steps operations
  async getUserOnboardingSteps(userId: string): Promise<OnboardingStep[]> {
    return await db.select().from(onboardingSteps)
      .where(eq(onboardingSteps.userId, userId));
  }

  async getOnboardingStep(userId: string, stepType: string, ministryId?: string): Promise<OnboardingStep | undefined> {
    if (ministryId) {
      const [step] = await db.select().from(onboardingSteps)
        .where(and(
          eq(onboardingSteps.userId, userId),
          eq(onboardingSteps.stepType, stepType),
          eq(onboardingSteps.ministryId, ministryId)
        ));
      return step;
    }
    const [step] = await db.select().from(onboardingSteps)
      .where(and(
        eq(onboardingSteps.userId, userId),
        eq(onboardingSteps.stepType, stepType)
      ));
    return step;
  }

  async upsertOnboardingStep(data: InsertOnboardingStep): Promise<OnboardingStep> {
    const existing = await this.getOnboardingStep(data.userId, data.stepType, data.ministryId ?? undefined);
    if (existing) {
      const [step] = await db.update(onboardingSteps)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(onboardingSteps.id, existing.id))
        .returning();
      return step;
    }
    const [step] = await db.insert(onboardingSteps).values(data).returning();
    return step;
  }

  // Quiz operations
  async getQuizQuestions(organizationId: string, manualId?: string, trainingId?: string, category?: string): Promise<QuizQuestion[]> {
    if (manualId) {
      return await db.select().from(quizQuestions)
        .where(and(eq(quizQuestions.organizationId, organizationId), eq(quizQuestions.isActive, true), eq(quizQuestions.manualId, manualId)))
        .orderBy(quizQuestions.sortOrder);
    }
    if (trainingId) {
      return await db.select().from(quizQuestions)
        .where(and(eq(quizQuestions.organizationId, organizationId), eq(quizQuestions.isActive, true), eq(quizQuestions.trainingId, trainingId)))
        .orderBy(quizQuestions.sortOrder);
    }
    if (category) {
      return await db.select().from(quizQuestions)
        .where(and(eq(quizQuestions.organizationId, organizationId), eq(quizQuestions.isActive, true), eq(quizQuestions.quizCategory, category)))
        .orderBy(quizQuestions.sortOrder);
    }
    return await db.select().from(quizQuestions)
      .where(and(eq(quizQuestions.organizationId, organizationId), eq(quizQuestions.isActive, true)))
      .orderBy(quizQuestions.sortOrder);
  }

  async createQuizQuestion(data: InsertQuizQuestion): Promise<QuizQuestion> {
    const [question] = await db.insert(quizQuestions).values(data).returning();
    return question;
  }

  async getUserQuizAttempts(userId: string, manualId?: string, trainingId?: string): Promise<QuizAttempt[]> {
    if (manualId) {
      return await db.select().from(quizAttempts)
        .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.manualId, manualId)))
        .orderBy(desc(quizAttempts.completedAt));
    }
    if (trainingId) {
      return await db.select().from(quizAttempts)
        .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.trainingId, trainingId)))
        .orderBy(desc(quizAttempts.completedAt));
    }
    return await db.select().from(quizAttempts)
      .where(eq(quizAttempts.userId, userId))
      .orderBy(desc(quizAttempts.completedAt));
  }

  async createQuizAttempt(data: InsertQuizAttempt): Promise<QuizAttempt> {
    const [attempt] = await db.insert(quizAttempts).values(data).returning();
    return attempt;
  }

  // Recurring activities operations
  async getRecurringActivities(organizationId: string, ministryId?: string): Promise<RecurringActivity[]> {
    if (ministryId) {
      return await db.select().from(recurringActivities)
        .where(and(
          eq(recurringActivities.organizationId, organizationId),
          eq(recurringActivities.isActive, true),
          eq(recurringActivities.ministryId, ministryId)
        ));
    }
    return await db.select().from(recurringActivities)
      .where(and(eq(recurringActivities.organizationId, organizationId), eq(recurringActivities.isActive, true)));
  }

  async getRecurringActivity(id: string, organizationId: string): Promise<RecurringActivity | undefined> {
    const [activity] = await db.select().from(recurringActivities)
      .where(and(eq(recurringActivities.id, id), eq(recurringActivities.organizationId, organizationId)));
    return activity;
  }

  async createRecurringActivity(data: InsertRecurringActivity): Promise<RecurringActivity> {
    const [activity] = await db.insert(recurringActivities).values(data).returning();
    return activity;
  }

  async updateRecurringActivity(id: string, organizationId: string, data: Partial<InsertRecurringActivity>): Promise<RecurringActivity> {
    const [activity] = await db.update(recurringActivities)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(recurringActivities.id, id), eq(recurringActivities.organizationId, organizationId)))
      .returning();
    return activity;
  }

  // Metrics submissions operations
  async getMetricsSubmissions(organizationId: string, activityId?: string, status?: string): Promise<MetricsSubmission[]> {
    const conditions = [eq(metricsSubmissions.organizationId, organizationId)];
    if (activityId) {
      conditions.push(eq(metricsSubmissions.activityId, activityId));
    }
    if (status) {
      conditions.push(eq(metricsSubmissions.status, status));
    }
    return await db.select().from(metricsSubmissions)
      .where(and(...conditions))
      .orderBy(desc(metricsSubmissions.eventDate));
  }

  async getMetricsSubmission(id: string, organizationId: string): Promise<MetricsSubmission | undefined> {
    const [submission] = await db.select().from(metricsSubmissions)
      .where(and(eq(metricsSubmissions.id, id), eq(metricsSubmissions.organizationId, organizationId)));
    return submission;
  }

  async createMetricsSubmission(data: InsertMetricsSubmission): Promise<MetricsSubmission> {
    const [submission] = await db.insert(metricsSubmissions).values(data).returning();
    return submission;
  }

  async updateMetricsSubmission(id: string, organizationId: string, data: Partial<InsertMetricsSubmission>): Promise<MetricsSubmission> {
    const [submission] = await db.update(metricsSubmissions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(metricsSubmissions.id, id), eq(metricsSubmissions.organizationId, organizationId)))
      .returning();
    return submission;
  }

  // Audit log operations
  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }

  async getAuditLogs(organizationId: string, entityType: string, entityId: string): Promise<AuditLog[]> {
    return await db.select().from(auditLogs)
      .where(and(
        eq(auditLogs.organizationId, organizationId),
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId)
      ))
      .orderBy(desc(auditLogs.performedAt));
  }

  // User archive operations
  async archiveUser(userId: string, archivedBy: string, reason?: string): Promise<UserArchive> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('User not found');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 180); // 180 days
    
    // Mark user as archived
    await db.update(users)
      .set({ isArchived: true, archivedAt: new Date(), archivedBy, status: 'archived' })
      .where(eq(users.id, userId));
    
    // Create archive record
    const [archive] = await db.insert(userArchives).values({
      organizationId: user.organizationId,
      userId,
      archivedBy,
      expiresAt,
      restoreDeadline: expiresAt,
      reason,
      userData: user as any,
    }).returning();

    // Create audit log
    await this.createAuditLog({
      organizationId: user.organizationId,
      entityType: 'user',
      entityId: userId,
      action: 'archive',
      previousValue: { isArchived: false },
      newValue: { isArchived: true },
      reason,
      performedBy: archivedBy,
    });
    
    return archive;
  }

  async restoreUser(archiveId: string, restoredBy: string): Promise<void> {
    const [archive] = await db.select().from(userArchives)
      .where(eq(userArchives.id, archiveId));
    if (!archive) throw new Error('Archive not found');
    
    // Restore user
    await db.update(users)
      .set({ isArchived: false, archivedAt: null, archivedBy: null, status: 'active' })
      .where(eq(users.id, archive.userId));
    
    // Update archive record
    await db.update(userArchives)
      .set({ isRestored: true, restoredAt: new Date(), restoredBy })
      .where(eq(userArchives.id, archiveId));
    
    // Create audit log
    await this.createAuditLog({
      organizationId: archive.organizationId,
      entityType: 'user',
      entityId: archive.userId,
      action: 'restore',
      previousValue: { isArchived: true },
      newValue: { isArchived: false },
      performedBy: restoredBy,
    });
  }

  async getArchivedUsers(organizationId: string): Promise<UserArchive[]> {
    return await db.select().from(userArchives)
      .where(and(eq(userArchives.organizationId, organizationId), eq(userArchives.isRestored, false)))
      .orderBy(desc(userArchives.archivedAt));
  }

  // Ministry archive operations
  async archiveMinistry(ministryId: string, organizationId: string, archivedBy: string, reason?: string): Promise<MinistryArchive> {
    const ministry = await this.getMinistry(ministryId, organizationId);
    if (!ministry) throw new Error('Ministry not found');

    // Mark ministry as archived
    await db.update(ministries)
      .set({ isArchived: true, archivedAt: new Date(), archivedBy, isActive: false })
      .where(and(eq(ministries.id, ministryId), eq(ministries.organizationId, organizationId)));

    // Create archive record
    const [archive] = await db.insert(ministryArchives).values({
      organizationId,
      ministryId,
      archivedBy,
      reason,
      ministryData: ministry as any,
    }).returning();

    // Create audit log
    await this.createAuditLog({
      organizationId,
      entityType: 'ministry',
      entityId: ministryId,
      action: 'archive',
      previousValue: { isArchived: false },
      newValue: { isArchived: true },
      reason,
      performedBy: archivedBy,
    });

    return archive;
  }

  async restoreMinistry(archiveId: string, restoredBy: string): Promise<void> {
    const [archive] = await db.select().from(ministryArchives)
      .where(eq(ministryArchives.id, archiveId));
    if (!archive) throw new Error('Archive not found');
    
    // Restore ministry
    await db.update(ministries)
      .set({ isArchived: false, archivedAt: null, archivedBy: null, isActive: true })
      .where(eq(ministries.id, archive.ministryId));
    
    // Update archive record
    await db.update(ministryArchives)
      .set({ isRestored: true, restoredAt: new Date(), restoredBy })
      .where(eq(ministryArchives.id, archiveId));
    
    // Create audit log
    await this.createAuditLog({
      organizationId: archive.organizationId,
      entityType: 'ministry',
      entityId: archive.ministryId,
      action: 'restore',
      previousValue: { isArchived: true },
      newValue: { isArchived: false },
      performedBy: restoredBy,
    });
  }

  // Room layout operations
  async getRoomLayouts(organizationId: string, roomId: string): Promise<RoomLayout[]> {
    return await db.select().from(roomLayouts)
      .where(and(eq(roomLayouts.organizationId, organizationId), eq(roomLayouts.roomId, roomId)));
  }

  async createRoomLayout(data: InsertRoomLayout): Promise<RoomLayout> {
    const [layout] = await db.insert(roomLayouts).values(data).returning();
    return layout;
  }

  async updateRoomLayout(id: string, organizationId: string, data: Partial<InsertRoomLayout>): Promise<RoomLayout> {
    const [layout] = await db.update(roomLayouts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(roomLayouts.id, id), eq(roomLayouts.organizationId, organizationId)))
      .returning();
    return layout;
  }

  async deleteRoomLayout(id: string, organizationId: string): Promise<void> {
    await db.delete(roomLayouts).where(and(eq(roomLayouts.id, id), eq(roomLayouts.organizationId, organizationId)));
  }

  // Archive room operation
  async archiveRoom(roomId: string, archivedBy: string): Promise<Room> {
    const [room] = await db.update(rooms)
      .set({ isArchived: true, archivedAt: new Date(), archivedBy, isActive: false })
      .where(eq(rooms.id, roomId))
      .returning();
    
    // Create audit log
    await this.createAuditLog({
      organizationId: room.organizationId,
      entityType: 'room',
      entityId: roomId,
      action: 'archive',
      previousValue: { isArchived: false },
      newValue: { isArchived: true },
      performedBy: archivedBy,
    });

    return room;
  }

  // Notification operations
  async getNotifications(organizationId: string, userId: string, unreadOnly?: boolean): Promise<Notification[]> {
    if (unreadOnly) {
      return await db.select().from(notifications)
        .where(and(
          eq(notifications.organizationId, organizationId),
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ))
        .orderBy(desc(notifications.createdAt));
    }
    return await db.select().from(notifications)
      .where(and(eq(notifications.organizationId, organizationId), eq(notifications.userId, userId)))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  }

  async markNotificationRead(id: string, organizationId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.organizationId, organizationId)));
  }

  async markAllNotificationsRead(organizationId: string, userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.organizationId, organizationId),
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  }

  // Manual analysis operations
  async getManualAnalysis(manualId: string, organizationId: string): Promise<ManualAnalysis | undefined> {
    const [analysis] = await db.select().from(manualAnalysis)
      .where(and(eq(manualAnalysis.manualId, manualId), eq(manualAnalysis.organizationId, organizationId)));
    return analysis;
  }

  async createManualAnalysis(data: InsertManualAnalysis): Promise<ManualAnalysis> {
    const [analysis] = await db.insert(manualAnalysis).values(data).returning();
    return analysis;
  }

  async updateManualAnalysis(manualId: string, organizationId: string, data: Partial<InsertManualAnalysis>): Promise<ManualAnalysis> {
    const [analysis] = await db.update(manualAnalysis)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(manualAnalysis.manualId, manualId), eq(manualAnalysis.organizationId, organizationId)))
      .returning();
    return analysis;
  }

  async getTrainingByManualId(manualId: string, organizationId: string): Promise<TrainingModule | undefined> {
    const [training] = await db.select().from(trainingModules)
      .where(and(eq(trainingModules.manualId, manualId), eq(trainingModules.organizationId, organizationId)));
    return training;
  }

  // Config Bank / Field Bank operations
  async getAdminTags(organizationId: string): Promise<AdminTag[]> {
    return await db.select().from(adminTags)
      .where(eq(adminTags.organizationId, organizationId))
      .orderBy(adminTags.sortOrder);
  }

  async createAdminTag(data: InsertAdminTag): Promise<AdminTag> {
    const [tag] = await db.insert(adminTags).values(data).returning();
    return tag;
  }

  async updateAdminTag(id: string, organizationId: string, data: Partial<InsertAdminTag>): Promise<AdminTag> {
    const [tag] = await db.update(adminTags)
      .set(data)
      .where(and(eq(adminTags.id, id), eq(adminTags.organizationId, organizationId)))
      .returning();
    return tag;
  }

  async deleteAdminTag(id: string, organizationId: string): Promise<void> {
    await db.delete(adminTags).where(and(eq(adminTags.id, id), eq(adminTags.organizationId, organizationId)));
  }

  async getServeRoles(organizationId: string): Promise<ServeRole[]> {
    return await db.select().from(serveRoles)
      .where(eq(serveRoles.organizationId, organizationId))
      .orderBy(serveRoles.sortOrder);
  }

  async createServeRole(data: InsertServeRole): Promise<ServeRole> {
    const [role] = await db.insert(serveRoles).values(data).returning();
    return role;
  }

  async updateServeRole(id: string, organizationId: string, data: Partial<InsertServeRole>): Promise<ServeRole> {
    const [role] = await db.update(serveRoles)
      .set(data)
      .where(and(eq(serveRoles.id, id), eq(serveRoles.organizationId, organizationId)))
      .returning();
    return role;
  }

  async deleteServeRole(id: string, organizationId: string): Promise<void> {
    await db.delete(serveRoles).where(and(eq(serveRoles.id, id), eq(serveRoles.organizationId, organizationId)));
  }

  async getStaffTitles(organizationId: string): Promise<StaffTitle[]> {
    return await db.select().from(staffTitles)
      .where(eq(staffTitles.organizationId, organizationId))
      .orderBy(staffTitles.sortOrder);
  }

  async createStaffTitle(data: InsertStaffTitle): Promise<StaffTitle> {
    const [title] = await db.insert(staffTitles).values(data).returning();
    return title;
  }

  async updateStaffTitle(id: string, organizationId: string, data: Partial<InsertStaffTitle>): Promise<StaffTitle> {
    const [title] = await db.update(staffTitles)
      .set(data)
      .where(and(eq(staffTitles.id, id), eq(staffTitles.organizationId, organizationId)))
      .returning();
    return title;
  }

  async deleteStaffTitle(id: string, organizationId: string): Promise<void> {
    await db.delete(staffTitles).where(and(eq(staffTitles.id, id), eq(staffTitles.organizationId, organizationId)));
  }

  async getGlobalLabels(organizationId: string): Promise<GlobalLabel[]> {
    return await db.select().from(globalLabels).where(eq(globalLabels.organizationId, organizationId));
  }

  async createGlobalLabel(data: InsertGlobalLabel): Promise<GlobalLabel> {
    const [label] = await db.insert(globalLabels).values(data).returning();
    return label;
  }

  async updateGlobalLabel(id: string, organizationId: string, data: Partial<InsertGlobalLabel>): Promise<GlobalLabel> {
    const [label] = await db.update(globalLabels)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(globalLabels.id, id), eq(globalLabels.organizationId, organizationId)))
      .returning();
    return label;
  }

  async deleteGlobalLabel(id: string, organizationId: string): Promise<void> {
    await db.delete(globalLabels).where(and(eq(globalLabels.id, id), eq(globalLabels.organizationId, organizationId)));
  }

  // Pastoral Questions operations
  async getPastoralQuestions(organizationId: string, status?: string): Promise<PastoralQuestion[]> {
    if (status) {
      return await db.select().from(pastoralQuestions)
        .where(and(eq(pastoralQuestions.organizationId, organizationId), eq(pastoralQuestions.status, status)))
        .orderBy(desc(pastoralQuestions.createdAt));
    }
    return await db.select().from(pastoralQuestions)
      .where(eq(pastoralQuestions.organizationId, organizationId))
      .orderBy(desc(pastoralQuestions.createdAt));
  }

  async getPastoralQuestion(id: string, organizationId: string): Promise<PastoralQuestion | undefined> {
    const [question] = await db.select().from(pastoralQuestions)
      .where(and(eq(pastoralQuestions.id, id), eq(pastoralQuestions.organizationId, organizationId)));
    return question;
  }

  async getUserPastoralQuestions(userId: string): Promise<PastoralQuestion[]> {
    return await db.select().from(pastoralQuestions)
      .where(eq(pastoralQuestions.userId, userId))
      .orderBy(desc(pastoralQuestions.createdAt));
  }

  async createPastoralQuestion(data: InsertPastoralQuestion): Promise<PastoralQuestion> {
    const [question] = await db.insert(pastoralQuestions).values(data).returning();
    return question;
  }

  async updatePastoralQuestion(id: string, organizationId: string, data: Partial<InsertPastoralQuestion>): Promise<PastoralQuestion> {
    const [question] = await db.update(pastoralQuestions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(pastoralQuestions.id, id), eq(pastoralQuestions.organizationId, organizationId)))
      .returning();
    return question;
  }

  // Ministry Join Requests operations
  async getMinistryJoinRequests(organizationId: string, status?: string): Promise<MinistryJoinRequest[]> {
    if (status) {
      return await db.select().from(ministryJoinRequests)
        .where(and(eq(ministryJoinRequests.organizationId, organizationId), eq(ministryJoinRequests.status, status)))
        .orderBy(desc(ministryJoinRequests.createdAt));
    }
    return await db.select().from(ministryJoinRequests)
      .where(eq(ministryJoinRequests.organizationId, organizationId))
      .orderBy(desc(ministryJoinRequests.createdAt));
  }

  async getMinistryJoinRequest(id: string, organizationId: string): Promise<MinistryJoinRequest | undefined> {
    const [request] = await db.select().from(ministryJoinRequests)
      .where(and(eq(ministryJoinRequests.id, id), eq(ministryJoinRequests.organizationId, organizationId)));
    return request;
  }

  async getUserJoinRequests(userId: string): Promise<MinistryJoinRequest[]> {
    return await db.select().from(ministryJoinRequests)
      .where(eq(ministryJoinRequests.userId, userId))
      .orderBy(desc(ministryJoinRequests.createdAt));
  }

  async getMinistryPendingRequests(ministryId: string, organizationId: string): Promise<MinistryJoinRequest[]> {
    return await db.select().from(ministryJoinRequests)
      .where(and(
        eq(ministryJoinRequests.ministryId, ministryId),
        eq(ministryJoinRequests.organizationId, organizationId),
        eq(ministryJoinRequests.status, 'pending')
      ))
      .orderBy(desc(ministryJoinRequests.createdAt));
  }

  async createMinistryJoinRequest(data: InsertMinistryJoinRequest): Promise<MinistryJoinRequest> {
    const [request] = await db.insert(ministryJoinRequests).values(data).returning();
    return request;
  }

  async updateMinistryJoinRequest(id: string, organizationId: string, data: Partial<InsertMinistryJoinRequest>): Promise<MinistryJoinRequest> {
    const [request] = await db.update(ministryJoinRequests)
      .set(data)
      .where(and(eq(ministryJoinRequests.id, id), eq(ministryJoinRequests.organizationId, organizationId)))
      .returning();
    return request;
  }

  // Get users assigned to a leader (through ministries they lead)
  async getUsersAssignedToLeader(leaderId: string): Promise<User[]> {
    // Get ministries where this user is a leader
    const leaderAssignments = await db.select().from(ministryLeaders)
      .where(eq(ministryLeaders.userId, leaderId));
    
    if (leaderAssignments.length === 0) return [];
    
    const ministryIds = leaderAssignments.map(a => a.ministryId);
    
    // Get all role assignments for these ministries
    const assignments = await db.select().from(roleAssignments)
      .where(and(
        sql`${roleAssignments.ministryId} = ANY(${ministryIds})`,
        eq(roleAssignments.isActive, true)
      ));
    
    const userIds = Array.from(new Set(assignments.map(a => a.userId)));
    
    // Exclude the leader themselves
    const filteredUserIds = userIds.filter(id => id !== leaderId);
    
    if (filteredUserIds.length === 0) return [];
    
    // Get user details (excluding archived users)
    const assignedUsers = await db.select().from(users)
      .where(and(
        sql`${users.id} = ANY(${filteredUserIds})`,
        eq(users.isArchived, false)
      ));
    
    return assignedUsers;
  }

  // Get all users with their ministry assignments (for admin view)
  async getUsersWithMinistryDetails(): Promise<(User & { ministries: string[], leaders: string[] })[]> {
    const allUsers = await db.select().from(users)
      .where(eq(users.isArchived, false));
    const allAssignments = await db.select().from(roleAssignments).where(eq(roleAssignments.isActive, true));
    const allMinistries = await db.select().from(ministries);
    const allLeaders = await db.select().from(ministryLeaders);
    
    return allUsers.map(user => {
      const userAssignments = allAssignments.filter(a => a.userId === user.id);
      const ministryIds = userAssignments.map(a => a.ministryId);
      const ministryNames = allMinistries
        .filter(m => ministryIds.includes(m.id))
        .map(m => m.name);
      
      // Find leaders of the ministries this user is in
      const leaderUserIds = allLeaders
        .filter(l => ministryIds.includes(l.ministryId))
        .map(l => l.userId);
      const leaderNames = allUsers
        .filter(u => leaderUserIds.includes(u.id))
        .map(u => `${u.firstName} ${u.lastName}`);
      
      return {
        ...user,
        ministries: ministryNames,
        leaders: leaderNames,
      };
    });
  }

  // ==========================================================================
  // WORKBOARD OPERATIONS
  // ==========================================================================

  async getWorkboards(organizationId: string, filters?: { ministryId?: string; createdBy?: string; status?: string }): Promise<Workboard[]> {
    const conditions = [eq(workboards.organizationId, organizationId)];

    if (filters?.ministryId) {
      conditions.push(eq(workboards.ministryId, filters.ministryId));
    }
    if (filters?.createdBy) {
      conditions.push(eq(workboards.createdBy, filters.createdBy));
    }
    if (filters?.status) {
      conditions.push(eq(workboards.status, filters.status));
    }

    return await db.select().from(workboards)
      .where(and(...conditions))
      .orderBy(desc(workboards.updatedAt));
  }

  async getWorkboard(id: string, organizationId: string): Promise<Workboard | undefined> {
    const [workboard] = await db.select().from(workboards)
      .where(and(eq(workboards.id, id), eq(workboards.organizationId, organizationId)));
    return workboard;
  }

  async createWorkboard(data: InsertWorkboard): Promise<Workboard> {
    const [workboard] = await db.insert(workboards).values(data).returning();
    return workboard;
  }

  async updateWorkboard(id: string, organizationId: string, data: Partial<InsertWorkboard>): Promise<Workboard> {
    const [workboard] = await db.update(workboards)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(workboards.id, id), eq(workboards.organizationId, organizationId)))
      .returning();
    return workboard;
  }

  async deleteWorkboard(id: string, organizationId: string): Promise<void> {
    await db.delete(workboards).where(and(eq(workboards.id, id), eq(workboards.organizationId, organizationId)));
  }

  // ==========================================================================
  // ACTION ITEM OPERATIONS
  // ==========================================================================

  async getActionItems(organizationId: string, workboardId: string): Promise<ActionItem[]> {
    return await db.select().from(actionItems)
      .where(and(eq(actionItems.organizationId, organizationId), eq(actionItems.workboardId, workboardId)))
      .orderBy(actionItems.sortOrder);
  }

  async getActionItem(id: string, organizationId: string): Promise<ActionItem | undefined> {
    const [item] = await db.select().from(actionItems)
      .where(and(eq(actionItems.id, id), eq(actionItems.organizationId, organizationId)));
    return item;
  }

  async createActionItem(data: InsertActionItem): Promise<ActionItem> {
    const [item] = await db.insert(actionItems).values(data).returning();
    return item;
  }

  async updateActionItem(id: string, organizationId: string, data: Partial<InsertActionItem>): Promise<ActionItem> {
    const [item] = await db.update(actionItems)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(actionItems.id, id), eq(actionItems.organizationId, organizationId)))
      .returning();
    return item;
  }

  async deleteActionItem(id: string, organizationId: string): Promise<void> {
    await db.delete(actionItemComments).where(and(eq(actionItemComments.actionItemId, id), eq(actionItemComments.organizationId, organizationId)));
    await db.delete(actionItems).where(and(eq(actionItems.id, id), eq(actionItems.organizationId, organizationId)));
  }

  // ==========================================================================
  // ACTION ITEM COMMENTS
  // ==========================================================================

  async getActionItemComments(organizationId: string, actionItemId: string): Promise<ActionItemComment[]> {
    return await db.select().from(actionItemComments)
      .where(and(eq(actionItemComments.organizationId, organizationId), eq(actionItemComments.actionItemId, actionItemId)))
      .orderBy(actionItemComments.createdAt);
  }

  async createActionItemComment(data: InsertActionItemComment): Promise<ActionItemComment> {
    const [comment] = await db.insert(actionItemComments).values(data).returning();
    return comment;
  }

  async deleteActionItemComment(id: string, organizationId: string): Promise<void> {
    await db.delete(actionItemComments).where(and(eq(actionItemComments.id, id), eq(actionItemComments.organizationId, organizationId)));
  }

  // ==========================================================================
  // SERVING RECORDS OPERATIONS
  // ==========================================================================

  async getServingRecords(userId: string, daysBack: number = 90): Promise<ServingRecord[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    return await db.select().from(servingRecords)
      .where(and(
        eq(servingRecords.userId, userId),
        gte(servingRecords.serviceDate, cutoffDate)
      ))
      .orderBy(desc(servingRecords.serviceDate));
  }

  async getServingRecordsByMinistry(ministryId: string, organizationId: string, daysBack: number = 90): Promise<ServingRecord[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    return await db.select().from(servingRecords)
      .where(and(
        eq(servingRecords.ministryId, ministryId),
        eq(servingRecords.organizationId, organizationId),
        gte(servingRecords.serviceDate, cutoffDate)
      ))
      .orderBy(desc(servingRecords.serviceDate));
  }

  async createServingRecord(data: InsertServingRecord): Promise<ServingRecord> {
    const [record] = await db.insert(servingRecords).values(data).returning();
    return record;
  }

  async updateServingRecord(id: string, organizationId: string, data: Partial<InsertServingRecord>): Promise<ServingRecord> {
    const [record] = await db.update(servingRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(servingRecords.id, id), eq(servingRecords.organizationId, organizationId)))
      .returning();
    return record;
  }

  async deleteServingRecord(id: string, organizationId: string): Promise<void> {
    await db.delete(servingRecords).where(and(eq(servingRecords.id, id), eq(servingRecords.organizationId, organizationId)));
  }

  async getServingMetrics(userId: string, daysBack: number = 90): Promise<{
    scheduled: number;
    accepted: number;
    declined: number;
    noResponse: number;
    served: number;
    topPositions: { position: string; count: number }[];
  }> {
    const records = await this.getServingRecords(userId, daysBack);
    
    const metrics = {
      scheduled: 0,
      accepted: 0,
      declined: 0,
      noResponse: 0,
      served: 0,
      topPositions: [] as { position: string; count: number }[],
    };
    
    const positionCounts: Record<string, number> = {};
    
    for (const record of records) {
      switch (record.status) {
        case 'scheduled': metrics.scheduled++; break;
        case 'accepted': metrics.accepted++; break;
        case 'declined': metrics.declined++; break;
        case 'no_response': metrics.noResponse++; break;
        case 'served': metrics.served++; break;
      }
      
      const position = record.positionTitle || 'Volunteer';
      positionCounts[position] = (positionCounts[position] || 0) + 1;
    }
    
    metrics.topPositions = Object.entries(positionCounts)
      .map(([position, count]) => ({ position, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return metrics;
  }

  // ==========================================================================
  // LEADER NOTES OPERATIONS
  // ==========================================================================

  async getLeaderNotes(leaderId: string, memberId?: string): Promise<LeaderNote[]> {
    if (memberId) {
      return await db.select().from(leaderNotes)
        .where(and(
          eq(leaderNotes.leaderId, leaderId),
          eq(leaderNotes.memberId, memberId)
        ))
        .orderBy(desc(leaderNotes.createdAt));
    }
    return await db.select().from(leaderNotes)
      .where(eq(leaderNotes.leaderId, leaderId))
      .orderBy(desc(leaderNotes.createdAt));
  }

  async createLeaderNote(data: InsertLeaderNote): Promise<LeaderNote> {
    const [note] = await db.insert(leaderNotes).values(data).returning();
    return note;
  }

  async updateLeaderNote(id: string, organizationId: string, data: Partial<InsertLeaderNote>): Promise<LeaderNote> {
    const [note] = await db.update(leaderNotes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(leaderNotes.id, id), eq(leaderNotes.organizationId, organizationId)))
      .returning();
    return note;
  }

  async deleteLeaderNote(id: string, organizationId: string): Promise<void> {
    await db.delete(leaderNotes).where(and(eq(leaderNotes.id, id), eq(leaderNotes.organizationId, organizationId)));
  }

  // ==========================================================================
  // MINISTRY LEADER ENRICHED DATA
  // ==========================================================================

  async getMinistryWithLeaders(ministryId: string, organizationId: string): Promise<{
    ministry: Ministry;
    leaders: { user: User; role: string; isPrimary: boolean }[];
  } | undefined> {
    const ministry = await this.getMinistry(ministryId, organizationId);
    if (!ministry) return undefined;
    
    const leaderRecords = await this.getMinistryLeaders(ministryId, organizationId);
    const leaders = await Promise.all(
      leaderRecords.map(async (leader) => {
        const user = await this.getUser(leader.userId);
        return {
          user: user!,
          role: leader.role || 'leader',
          isPrimary: leader.isPrimary || false,
        };
      })
    );
    
    return { ministry, leaders: leaders.filter(l => l.user) };
  }

  async getUserMinistriesWithLeaders(userId: string): Promise<{
    ministryId: string;
    ministryName: string;
    primaryLeader: { id: string; name: string } | null;
    coLeaders: { id: string; name: string }[];
    expectations: string[] | null;
  }[]> {
    const actingUser = await this.getUser(userId);
    const organizationId = actingUser?.organizationId;
    const assignments = await db.select().from(roleAssignments)
      .where(and(eq(roleAssignments.userId, userId), eq(roleAssignments.isActive, true)));

    const results = [];

    for (const assignment of assignments) {
      if (!organizationId) continue;
      const ministry = await this.getMinistry(assignment.ministryId, organizationId);
      if (!ministry) continue;
      
      const leaderRecords = await this.getMinistryLeaders(assignment.ministryId, organizationId);
      
      let primaryLeader: { id: string; name: string } | null = null;
      const coLeaders: { id: string; name: string }[] = [];
      
      for (const leader of leaderRecords) {
        const user = await this.getUser(leader.userId);
        if (!user) continue;
        
        const leaderInfo = { id: user.id, name: `${user.firstName} ${user.lastName}` };
        
        if (leader.isPrimary) {
          primaryLeader = leaderInfo;
        } else {
          coLeaders.push(leaderInfo);
        }
      }
      
      // If no primary leader set, use first leader
      if (!primaryLeader && leaderRecords.length > 0) {
        const user = await this.getUser(leaderRecords[0].userId);
        if (user) {
          primaryLeader = { id: user.id, name: `${user.firstName} ${user.lastName}` };
        }
      }
      
      results.push({
        ministryId: ministry.id,
        ministryName: ministry.name,
        primaryLeader,
        coLeaders,
        expectations: ministry.expectations || null,
      });
    }
    
    return results;
  }

  // Member feedback methods
  async createMemberFeedback(data: InsertMemberFeedback): Promise<MemberFeedback> {
    const [feedback] = await db.insert(memberFeedback).values(data).returning();
    return feedback;
  }

  async getMemberFeedback(memberId: string): Promise<MemberFeedback[]> {
    return await db.select().from(memberFeedback)
      .where(eq(memberFeedback.memberId, memberId))
      .orderBy(desc(memberFeedback.createdAt));
  }

  async getUnreadFeedbackCount(memberId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(memberFeedback)
      .where(and(
        eq(memberFeedback.memberId, memberId),
        eq(memberFeedback.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  async markFeedbackAsRead(feedbackId: string): Promise<void> {
    await db.update(memberFeedback)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(memberFeedback.id, feedbackId));
  }

  async getLeaderFeedbackGiven(leaderId: string): Promise<MemberFeedback[]> {
    return await db.select().from(memberFeedback)
      .where(eq(memberFeedback.leaderId, leaderId))
      .orderBy(desc(memberFeedback.createdAt));
  }

  // Health indicators for team members
  async getMemberHealthIndicators(userId: string): Promise<{
    trainingComplete: number;
    trainingTotal: number;
    serveRate: number;
    hasUnansweredQuestions: boolean;
    onboardingComplete: boolean;
    healthStatus: 'healthy' | 'needs_attention' | 'inactive';
  }> {
    // Get training progress
    const trainings = await db.select().from(userTrainingProgress)
      .where(eq(userTrainingProgress.userId, userId));
    const completedTrainings = trainings.filter(t => t.status === 'completed').length;
    const totalTrainings = trainings.length;
    
    // Get serving metrics
    const records = await db.select().from(servingRecords)
      .where(eq(servingRecords.userId, userId));
    const served = records.filter(r => r.status === 'served').length;
    const scheduled = records.filter(r => ['scheduled', 'served', 'declined', 'no_response'].includes(r.status || '')).length;
    const serveRate = scheduled > 0 ? (served / scheduled) * 100 : 100;
    
    // Check for unanswered pastoral questions
    const questions = await db.select().from(pastoralQuestions)
      .where(and(
        eq(pastoralQuestions.userId, userId),
        eq(pastoralQuestions.status, 'pending')
      ));
    const hasUnansweredQuestions = questions.length > 0;
    
    // Check onboarding status
    const user = await this.getUser(userId);
    const onboardingComplete = user?.onboardingState === 'DONE';
    
    // Calculate health status
    let healthStatus: 'healthy' | 'needs_attention' | 'inactive' = 'healthy';
    
    if (hasUnansweredQuestions) {
      healthStatus = 'needs_attention';
    } else if (!onboardingComplete) {
      healthStatus = 'needs_attention';
    } else if (serveRate < 50 && scheduled > 2) {
      healthStatus = 'inactive';
    } else if (serveRate < 70 && scheduled > 2) {
      healthStatus = 'needs_attention';
    } else if (totalTrainings > 0 && completedTrainings / totalTrainings < 0.5) {
      healthStatus = 'needs_attention';
    }
    
    return {
      trainingComplete: completedTrainings,
      trainingTotal: totalTrainings,
      serveRate,
      hasUnansweredQuestions,
      onboardingComplete,
      healthStatus,
    };
  }

  // Team health indicators for ministry leaders
  async getMinistryTeamHealth(ministryId: string): Promise<Record<string, {
    overall: 'green' | 'yellow' | 'red';
    onboardingComplete: boolean;
    trainingProgress: number;
    serveRate: number;
    hasUnansweredQuestions: boolean;
    biblicalLiteracy?: {
      level: 'low' | 'developing' | 'strong';
      percentage: number;
      levelName: string;
    };
  }>> {
    // Get all active members of the ministry
    const assignments = await db.select().from(roleAssignments)
      .where(and(
        eq(roleAssignments.ministryId, ministryId),
        eq(roleAssignments.isActive, true)
      ));
    
    const result: Record<string, {
      overall: 'green' | 'yellow' | 'red';
      onboardingComplete: boolean;
      trainingProgress: number;
      serveRate: number;
      hasUnansweredQuestions: boolean;
      biblicalLiteracy?: {
        level: 'low' | 'developing' | 'strong';
        percentage: number;
        levelName: string;
      };
    }> = {};
    
    for (const assignment of assignments) {
      const health = await this.getMemberHealthIndicators(assignment.userId);
      
      // Map healthStatus to overall color
      let overall: 'green' | 'yellow' | 'red' = 'green';
      if (health.healthStatus === 'needs_attention') overall = 'yellow';
      if (health.healthStatus === 'inactive') overall = 'red';
      
      // Calculate training progress percentage
      const trainingProgress = health.trainingTotal > 0 
        ? Math.round((health.trainingComplete / health.trainingTotal) * 100) 
        : 100;
      
      // Get Biblical Literacy from survey results
      let biblicalLiteracy: { level: 'low' | 'developing' | 'strong'; percentage: number; levelName: string; } | undefined;
      const surveyResult = await db.select().from(surveyResults)
        .where(eq(surveyResults.userId, assignment.userId))
        .limit(1);
      
      if (surveyResult.length > 0 && surveyResult[0].biblicalLiteracy) {
        const literacy = surveyResult[0].biblicalLiteracy as any;
        biblicalLiteracy = {
          level: literacy.level || 'low',
          percentage: literacy.percentage || literacy.score || 0,
          levelName: literacy.levelName || (literacy.level === 'strong' ? 'Strong Foundation' : literacy.level === 'developing' ? 'Developing' : 'Building Foundation'),
        };
      }
      
      result[assignment.userId] = {
        overall,
        onboardingComplete: health.onboardingComplete,
        trainingProgress,
        serveRate: Math.round(health.serveRate),
        hasUnansweredQuestions: health.hasUnansweredQuestions,
        biblicalLiteracy,
      };
    }
    
    return result;
  }

  // Enhanced serving metrics with interpretation
  async getServingMetricsWithInterpretation(userId: string): Promise<{
    totalScheduled: number;
    totalServed: number;
    totalDeclined: number;
    totalNoResponse: number;
    serveRate: number;
    trend: 'up' | 'down' | 'steady';
    encouragement: string;
    recentRecords: { id: string; date: string; ministryName: string | null; status: string }[];
  }> {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    const records = await db.select().from(servingRecords)
      .where(and(
        eq(servingRecords.userId, userId),
        gte(servingRecords.serviceDate, ninetyDaysAgo)
      ))
      .orderBy(desc(servingRecords.serviceDate));
    
    const totalScheduled = records.filter(r => ['scheduled', 'accepted'].includes(r.status || '')).length;
    const totalServed = records.filter(r => r.status === 'served').length;
    const totalDeclined = records.filter(r => r.status === 'declined').length;
    const totalNoResponse = records.filter(r => r.status === 'no_response').length;
    const serveRate = (totalScheduled + totalServed) > 0 
      ? (totalServed / (totalScheduled + totalServed + totalDeclined + totalNoResponse)) * 100 
      : 100;
    
    // Calculate trend by comparing last 45 days to previous 45 days
    const fortyFiveDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
    const recentServed = records.filter(r => r.status === 'served' && new Date(r.serviceDate!) >= fortyFiveDaysAgo).length;
    const olderServed = records.filter(r => r.status === 'served' && new Date(r.serviceDate!) < fortyFiveDaysAgo).length;
    
    let trend: 'up' | 'down' | 'steady' = 'steady';
    if (recentServed > olderServed + 1) trend = 'up';
    else if (recentServed < olderServed - 1) trend = 'down';
    
    // Generate encouragement message
    let encouragement = "Thank you for being part of the team!";
    if (serveRate >= 90) {
      encouragement = "Your faithfulness in serving is an inspiration to others. Thank you!";
    } else if (serveRate >= 70) {
      encouragement = "You're making a difference every time you serve. Keep it up!";
    } else if (serveRate >= 50) {
      encouragement = "We appreciate every time you're able to serve. Consider reaching out if you need any support.";
    } else if (records.length > 0) {
      encouragement = "We miss seeing you! Let your leader know if there's anything we can help with.";
    }
    
    // Get recent records with ministry names
    const actingUser = await this.getUser(userId);
    const recentRecords = await Promise.all(
      records.slice(0, 5).map(async (r) => {
        let ministryName: string | null = null;
        if (r.ministryId && actingUser?.organizationId) {
          const ministry = await this.getMinistry(r.ministryId, actingUser.organizationId);
          ministryName = ministry?.name || null;
        }
        return {
          id: r.id,
          date: r.serviceDate?.toISOString() || '',
          ministryName,
          status: r.status || 'scheduled',
        };
      })
    );
    
    return {
      totalScheduled,
      totalServed,
      totalDeclined,
      totalNoResponse,
      serveRate,
      trend,
      encouragement,
      recentRecords,
    };
  }

  // Team serving health for leaders
  async getTeamServingHealth(leaderId: string, ministryId?: string): Promise<{
    totalMembers: number;
    activeServers: number;
    atRiskBurnout: number;
    underEngaged: number;
    members: {
      id: string;
      name: string;
      serveRate: number;
      recentServes: number;
      healthStatus: 'healthy' | 'needs_attention' | 'inactive';
    }[];
  }> {
    // Get team members
    let teamMembers: User[] = [];
    
    if (ministryId) {
      const assignments = await db.select().from(roleAssignments)
        .where(and(
          eq(roleAssignments.ministryId, ministryId),
          eq(roleAssignments.isActive, true)
        ));
      
      for (const a of assignments) {
        const user = await this.getUser(a.userId);
        if (user) teamMembers.push(user);
      }
    } else {
      // Get all ministries led by this leader
      const leaderMinistries = await db.select().from(ministryLeaders)
        .where(eq(ministryLeaders.userId, leaderId));
      
      for (const lm of leaderMinistries) {
        const assignments = await db.select().from(roleAssignments)
          .where(and(
            eq(roleAssignments.ministryId, lm.ministryId),
            eq(roleAssignments.isActive, true)
          ));
        
        for (const a of assignments) {
          const user = await this.getUser(a.userId);
          if (user && !teamMembers.find(m => m.id === user.id)) {
            teamMembers.push(user);
          }
        }
      }
    }
    
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    
    let atRiskBurnout = 0;
    let underEngaged = 0;
    let activeServers = 0;
    
    const members = await Promise.all(
      teamMembers.map(async (member) => {
        const records = await db.select().from(servingRecords)
          .where(and(
            eq(servingRecords.userId, member.id),
            gte(servingRecords.serviceDate, ninetyDaysAgo)
          ));
        
        const served = records.filter(r => r.status === 'served').length;
        const total = records.length;
        const serveRate = total > 0 ? (served / total) * 100 : 0;
        
        let healthStatus: 'healthy' | 'needs_attention' | 'inactive' = 'healthy';
        
        if (served >= 12) { // More than 3 times per month - burnout risk
          atRiskBurnout++;
          healthStatus = 'needs_attention';
        } else if (served <= 1 && total > 0) { // Very low engagement
          underEngaged++;
          healthStatus = 'inactive';
        } else if (served >= 3) {
          activeServers++;
        } else if (serveRate < 50 && total > 2) {
          healthStatus = 'needs_attention';
          underEngaged++;
        }
        
        return {
          id: member.id,
          name: `${member.firstName} ${member.lastName}`,
          serveRate,
          recentServes: served,
          healthStatus,
        };
      })
    );
    
    return {
      totalMembers: teamMembers.length,
      activeServers,
      atRiskBurnout,
      underEngaged,
      members,
    };
  }

  // Phase 7: Organization settings (branding/config, one row per organization)
  async getOrgSettings(organizationId: string): Promise<OrgSettings | undefined> {
    const [settings] = await db.select().from(orgSettings)
      .where(eq(orgSettings.organizationId, organizationId)).limit(1);
    return settings;
  }

  async upsertOrgSettings(organizationId: string, data: Partial<InsertOrgSettings>): Promise<OrgSettings> {
    const existing = await this.getOrgSettings(organizationId);
    if (existing) {
      const [updated] = await db
        .update(orgSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(orgSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(orgSettings)
      .values({ ...data, organizationId } as InsertOrgSettings)
      .returning();
    return created;
  }

  // Phase 9: Help center
  async getHelpArticles(category?: string): Promise<HelpArticle[]> {
    if (category) {
      return await db.select().from(helpArticles)
        .where(and(
          eq(helpArticles.category, category),
          eq(helpArticles.isPublished, true)
        ))
        .orderBy(helpArticles.sortOrder);
    }
    return await db.select().from(helpArticles)
      .where(eq(helpArticles.isPublished, true))
      .orderBy(helpArticles.sortOrder);
  }

  async getHelpArticle(id: string): Promise<HelpArticle | undefined> {
    const [article] = await db.select().from(helpArticles)
      .where(eq(helpArticles.id, id));
    return article;
  }

  async getHelpArticleBySlug(slug: string): Promise<HelpArticle | undefined> {
    const [article] = await db.select().from(helpArticles)
      .where(eq(helpArticles.slug, slug));
    return article;
  }

  async searchHelpArticles(query: string): Promise<HelpArticle[]> {
    const searchPattern = `%${query}%`;
    return await db.select().from(helpArticles)
      .where(and(
        eq(helpArticles.isPublished, true),
        or(
          ilike(helpArticles.title, searchPattern),
          ilike(helpArticles.content, searchPattern),
          ilike(helpArticles.summary, searchPattern)
        )
      ))
      .orderBy(helpArticles.sortOrder);
  }

  async createHelpArticle(data: InsertHelpArticle): Promise<HelpArticle> {
    const [article] = await db.insert(helpArticles).values(data).returning();
    return article;
  }

  async updateHelpArticle(id: string, data: Partial<InsertHelpArticle>): Promise<HelpArticle> {
    const [article] = await db
      .update(helpArticles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(helpArticles.id, id))
      .returning();
    return article;
  }

  async incrementHelpArticleViews(id: string): Promise<void> {
    await db
      .update(helpArticles)
      .set({ viewCount: sql`${helpArticles.viewCount} + 1` })
      .where(eq(helpArticles.id, id));
  }

  async deleteHelpArticle(id: string): Promise<void> {
    await db.delete(helpArticles).where(eq(helpArticles.id, id));
  }

  // Calendar categories
  async getCalendarCategories(activeOnly: boolean = true): Promise<CalendarCategory[]> {
    if (activeOnly) {
      return await db.select().from(calendarCategories)
        .where(eq(calendarCategories.isActive, true))
        .orderBy(calendarCategories.sortOrder, calendarCategories.name);
    }
    return await db.select().from(calendarCategories)
      .orderBy(calendarCategories.sortOrder, calendarCategories.name);
  }

  async getCalendarCategory(id: string): Promise<CalendarCategory | undefined> {
    const [category] = await db.select().from(calendarCategories)
      .where(eq(calendarCategories.id, id));
    return category;
  }

  async createCalendarCategory(data: InsertCalendarCategory): Promise<CalendarCategory> {
    const [category] = await db.insert(calendarCategories).values(data).returning();
    return category;
  }

  async updateCalendarCategory(id: string, data: Partial<InsertCalendarCategory>): Promise<CalendarCategory> {
    const [category] = await db
      .update(calendarCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(calendarCategories.id, id))
      .returning();
    return category;
  }

  async deleteCalendarCategory(id: string): Promise<void> {
    await db.update(calendarCategories)
      .set({ isActive: false })
      .where(eq(calendarCategories.id, id));
  }

  // Password reset operations
  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    });
  }

  async getPasswordResetToken(token: string): Promise<{ userId: string; expiresAt: Date; usedAt: Date | null } | undefined> {
    const [result] = await db.select({
      userId: passwordResetTokens.userId,
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
    }).from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return result;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await db.delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, new Date()));
  }
}

export const storage = new DatabaseStorage();
