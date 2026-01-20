import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const ADMIN_USERNAME = "ADMIN";
const ADMIN_EMAIL = "ADMIN@local.dev";
const ADMIN_PASSWORD = "ADMIN";
const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function seedAdminUser() {
  console.log("[Seed] Checking for built-in ADMIN account...");
  
  try {
    const existing = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.id, ADMIN_USER_ID)
    });
    
    if (existing) {
      console.log("[Seed] ADMIN account already exists");
      return;
    }
    
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    
    await db.insert(users).values({
      id: ADMIN_USER_ID,
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      passwordHash: passwordHash,
      authProvider: 'local',
      firstName: "System",
      lastName: "Administrator",
      role: 'admin',
      onboardingState: 'DONE',
      onboardingStatus: 'completed',
      onboardingCompletedAt: new Date(),
      profileCompletedAt: new Date(),
      adminBypassMode: true,
      status: 'active',
      isArchived: false,
    });
    
    console.log("[Seed] Created built-in ADMIN account (username: ADMIN, password: ADMIN)");
  } catch (error) {
    console.error("[Seed] Failed to create ADMIN account:", error);
  }
}
