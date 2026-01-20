import type { Express } from "express";
import { type Server } from "http";
import express from "express";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import multer from "multer";
import { storage } from "./storage";
import { db, checkDatabaseHealth } from "./db";
import { handleApiError } from "./db-error";
import { setupAuth, isAuthenticated, requireLeader, requireAdmin, requirePastor, requireMinistryLeader } from "./replitAuth";
import { 
  type SurveyAnswers, 
  manuals, 
  manualAnalysis, 
  trainingModules, 
  isPastor, 
  isLeader, 
  isAdmin,
  users,
  surveyResults,
  userTrainingProgress,
  roleAssignments,
  messages,
  onboardingProgress,
  ministrySelections,
  TRAINING_STATUS,
  type TrainingStatus,
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { 
  calculateGiftScores, 
  calculateDISCProfile, 
  calculateBiblicalLiteracy,
  calculateTechnicalSkills,
  calculateMinistryMatches 
} from "./scoringEngine";
import { 
  sendAssessmentEmails, 
  sendRetroactiveEmails,
  sendMeetingAgendaEmail,
  sendMeetingRecapEmail,
  generateMeetingAgendaContent,
  generateMeetingRecapContent,
  sendLeaderNotificationEmail,
  sendPasswordResetEmail,
  MeetingEmailData 
} from "./emailService";
import { z } from "zod";
import { seedHelpArticles } from "./seedHelpArticles";
import { seedCoreData } from "./seedCoreData";
import { seedAdminUser } from "./seedAdminUser";
import { slugify } from "./utils/slugify";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

// Configure multer for profile photo uploads
const profilePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(process.cwd(), "uploads/profile-photos");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: any, file, cb) => {
    const userId = req.user?.claims?.sub || "unknown";
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${userId}-${Date.now()}${ext}`);
  }
});

const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

// Configure multer for PDF manual uploads
const manualStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(process.cwd(), "uploads/manuals");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: any, file, cb) => {
    const timestamp = Date.now();
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${safeFilename}`);
  }
});

const uploadManual = multer({
  storage: manualStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for PDFs
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // ==========================================================================
  // API CACHE-CONTROL MIDDLEWARE
  // Prevents CDN caching of API responses (fixes custom domain stale data)
  // ==========================================================================
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
  });

  // ==========================================================================
  // HEALTH CHECK ENDPOINTS (Phase 0 - before any auth middleware)
  // ==========================================================================
  
  // Basic health check
  app.get('/healthz', (req, res) => {
    res.json({ ok: true });
  });
  
  // Database connectivity health check
  app.get('/healthz/db', async (req, res) => {
    try {
      // Simple query to verify DB connection
      await db.execute(sql`SELECT 1`);
      res.json({ ok: true, database: "connected" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Database connection failed";
      const isNeonDisabled = message.toLowerCase().includes("endpoint has been disabled");
      console.error("[DB_UNAVAILABLE] Health check failed:", message);
      res.status(503).json({ 
        ok: false, 
        code: "DB_UNAVAILABLE",
        database: isNeonDisabled ? "endpoint_disabled" : "connection_failed",
        error: message
      });
    }
  });

  // Combined health endpoint (admin-friendly)
  app.get('/health', async (req, res) => {
    const result: {
      ok: boolean;
      server: string;
      database: string;
      timestamp: string;
      error?: string;
      adminNote?: string;
    } = {
      ok: true,
      server: "running",
      database: "checking",
      timestamp: new Date().toISOString(),
    };

    try {
      await db.execute(sql`SELECT 1`);
      result.database = "connected";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";
      const isNeonDisabled = message.toLowerCase().includes("endpoint has been disabled");
      console.error("[DB_UNAVAILABLE] /health check failed:", message);
      result.ok = false;
      result.database = isNeonDisabled ? "endpoint_disabled" : "connection_failed";
      result.error = message;
      if (isNeonDisabled) {
        result.adminNote = "Neon database endpoint is disabled. Enable it via Neon API/dashboard.";
      }
    }

    res.status(result.ok ? 200 : 503).json(result);
  });

  // DB Diagnostic endpoint with STATUS_KEY protection (accessible even when login is blocked)
  app.get('/api/status/db', async (req, res) => {
    const statusKey = process.env.STATUS_KEY;
    const providedKey = req.headers['x-status-key'] as string;
    
    // If STATUS_KEY is set, require it
    if (statusKey) {
      if (!providedKey || providedKey !== statusKey) {
        return res.status(403).json({ 
          error: 'Forbidden', 
          message: 'Valid x-status-key header required' 
        });
      }
    } else {
      // If STATUS_KEY is not set, return 403 with setup instructions
      return res.status(403).json({ 
        error: 'Not configured', 
        message: 'STATUS_KEY environment variable must be set to use this endpoint' 
      });
    }
    
    try {
      const health = await checkDatabaseHealth();
      res.json({
        ...health,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({
        hasDatabaseUrl: false,
        canConnect: false,
        error: 'Failed to check database health',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ==========================================================================
  // BOOTSTRAP ENDPOINT - First-time setup (no auth required, only works when DB is empty)
  // ==========================================================================
  app.post('/api/bootstrap/seed-ministries', async (req, res) => {
    try {
      // Check if ministries already exist
      const existingMinistries = await storage.getMinistries();
      if (existingMinistries.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Database already has ${existingMinistries.length} ministries. Bootstrap not needed.` 
        });
      }

      // Seed the ministries
      const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      const ministryHierarchy = [
        { 
          name: 'Landing Team', 
          description: 'First impressions and hospitality ministry',
          category: 'hospitality',
          children: [
            { name: 'Greeters', description: 'Welcome guests at the door', category: 'hospitality' },
            { name: 'First Impressions', description: 'Create excellent first-time experience', category: 'hospitality' },
            { name: 'Community Care Team', description: 'Follow up with guests', category: 'hospitality' },
          ]
        },
        { 
          name: 'Worship Arts', 
          description: 'Leading the congregation in worship',
          category: 'worship',
          children: [
            { name: 'Worship Vocals', description: 'Lead and support vocals', category: 'worship' },
            { name: 'Worship Band', description: 'Play instruments during worship', category: 'worship' },
            { name: 'Worship Tech', description: 'Sound, lights, and media', category: 'worship' },
          ]
        },
        { 
          name: 'Kids Ministry', 
          description: 'Nurturing the next generation in faith',
          category: 'children',
          children: [
            { name: 'Nursery', description: 'Care for infants and toddlers (0-2)', category: 'children' },
            { name: 'Preschool', description: 'Teach preschoolers (3-5)', category: 'children' },
            { name: 'Elementary', description: 'Lead kids church for elementary age', category: 'children' },
          ]
        },
        { 
          name: 'Student Ministry', 
          description: 'Youth and young adult discipleship',
          category: 'youth',
          children: [
            { name: 'Middle School', description: 'Disciple middle school students', category: 'youth' },
            { name: 'High School', description: 'Disciple high school students', category: 'youth' },
          ]
        },
        { 
          name: 'Tech Team', 
          description: 'Technical production and IT support',
          category: 'production',
          children: [
            { name: 'Live Production', description: 'Sunday service production', category: 'production' },
            { name: 'Media Team', description: 'Graphics, video, and content', category: 'production' },
          ]
        },
        { 
          name: 'Prayer Team', 
          description: 'Intercessory prayer ministry',
          category: 'spiritual',
        },
        { 
          name: 'Facilities Ministry', 
          description: 'Building and grounds maintenance',
          category: 'operations',
        },
      ];

      const created: string[] = [];
      
      for (const parent of ministryHierarchy) {
        const parentMinistry = await storage.createMinistry({
          name: parent.name,
          slug: generateSlug(parent.name),
          description: parent.description,
          category: parent.category,
          isActive: true,
        });
        created.push(parent.name);
        
        if (parentMinistry && parent.children) {
          for (const child of parent.children) {
            await storage.createMinistry({
              name: child.name,
              slug: generateSlug(child.name),
              description: child.description,
              category: child.category,
              parentMinistryId: parentMinistry.id,
              isActive: true,
            });
            created.push(child.name);
          }
        }
      }

      console.log(`[Bootstrap] Seeded ${created.length} ministries`);
      res.json({ 
        success: true, 
        created,
        message: `Successfully seeded ${created.length} ministries.`
      });
    } catch (error) {
      console.error("[Bootstrap] Error seeding ministries:", error);
      return res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to seed ministries" 
      });
    }
  });

  // Serve attached_assets for ministry manuals (before auth to allow PDF access)
  const assetsPath = path.resolve(process.cwd(), "attached_assets");
  if (fs.existsSync(assetsPath)) {
    app.use("/assets", express.static(assetsPath));
  }

  // Serve profile photo uploads
  const uploadsPath = path.resolve(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsPath));

  // Auth middleware
  await setupAuth(app);

  // ==========================================================================
  // ADMIN BYPASS LOGIN (for Coming Soon mode)
  // ==========================================================================
  
  app.post('/api/admin/login', (req: any, res) => {
    const { username, password } = req.body;
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminUsername || !adminPassword) {
      return res.status(500).json({ message: "Admin credentials not configured" });
    }
    
    if (username === adminUsername && password === adminPassword) {
      // Set a session flag for admin access
      if (req.session) {
        req.session.adminBypass = true;
      }
      return res.json({ success: true, message: "Admin access granted" });
    }
    
    return res.status(401).json({ message: "Invalid credentials" });
  });
  
  app.get('/api/admin/check-bypass', async (req: any, res) => {
    // Check session bypass (legacy) OR user's adminBypassMode field
    const sessionBypass = req.session?.adminBypass === true;
    let userBypass = false;
    
    if (req.user?.claims?.sub) {
      const user = await storage.getUser(req.user.claims.sub);
      userBypass = user?.adminBypassMode === true;
    }
    
    return res.json({ 
      hasAdminBypass: sessionBypass || userBypass,
      bypassMode: userBypass
    });
  });

  app.post('/api/admin/toggle-bypass', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return res.status(403).json({ message: "Only admins can toggle bypass mode" });
      }
      
      const newBypassMode = !user.adminBypassMode;
      await storage.updateUser(userId, { adminBypassMode: newBypassMode });
      
      console.log(`[Admin] Bypass mode ${newBypassMode ? 'enabled' : 'disabled'} for user ${userId}`);
      
      res.json({ 
        success: true, 
        bypassMode: newBypassMode,
        message: `Bypass mode ${newBypassMode ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error("Error toggling bypass mode:", error);
      return handleApiError(error, res);
    }
  });

  // Development-only: Force complete onboarding for testing
  app.post('/api/admin/force-complete-onboarding', isAuthenticated, async (req: any, res) => {
    try {
      // Only allow in development mode or with admin bypass
      const isDev = process.env.NODE_ENV === 'development';
      const hasAdminBypass = req.session?.adminBypass === true;
      
      if (!isDev && !hasAdminBypass) {
        return res.status(403).json({ message: "Only available in development mode or with admin access" });
      }
      
      const userId = req.user.claims.sub;
      
      // Force update to DONE state with minimal required fields
      await storage.updateUser(userId, {
        onboardingState: 'DONE',
        firstName: req.user.claims.first_name || 'Test',
        lastName: req.user.claims.last_name || 'User',
      });
      
      console.log(`[DEV] Force-completed onboarding for user ${userId}`);
      
      res.json({ 
        success: true, 
        message: "Onboarding force-completed for testing",
        onboardingState: 'DONE'
      });
    } catch (error) {
      console.error("Error force-completing onboarding:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // LOCAL AUTH ROUTES (Email/Password)
  // ==========================================================================

  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  });

  app.post('/api/auth/register', async (req: any, res) => {
    try {
      const parseResult = registerSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid registration data", 
          errors: parseResult.error.errors 
        });
      }

      const { email, password, firstName, lastName } = parseResult.data;

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Generate unique ID
      const userId = randomUUID();

      // Create user
      await storage.upsertUser({
        id: userId,
        email,
        firstName,
        lastName,
        passwordHash,
        authProvider: 'local',
        onboardingState: 'PROFILE',
        role: 'member',
      });

      // Create session for the user
      const user = {
        claims: { sub: userId, email, first_name: firstName, last_name: lastName },
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 1 week
      };
      
      req.login(user, (err: any) => {
        if (err) {
          console.error("Session login error:", err);
          return handleApiError(err, res);
        }
        // Explicitly save session to ensure it persists
        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return handleApiError(saveErr, res);
          }
          console.log("Registration successful, session saved for user:", userId);
          res.json({ message: "Registration successful", userId });
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      return handleApiError(error, res);
    }
  });

  const loginSchema = z.object({
    email: z.string().min(1),
    password: z.string().min(1),
  });

  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid login data" });
      }

      const { email, password } = parseResult.data;

      // Find user by email OR by username (for ADMIN account)
      let user = await storage.getUserByEmail(email);
      
      // If not found by email and input is "ADMIN", try finding by username
      if (!user && email.toUpperCase() === 'ADMIN') {
        user = await storage.getUserByUsername('ADMIN');
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if user has a password (local auth)
      if (!user.passwordHash) {
        return res.status(401).json({ 
          message: "This account uses social login. Please sign in with Google." 
        });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Create session
      const sessionUser = {
        claims: { 
          sub: user.id, 
          email: user.email, 
          first_name: user.firstName, 
          last_name: user.lastName 
        },
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      };
      
      req.login(sessionUser, (err: any) => {
        if (err) {
          console.error("Session login error:", err);
          return handleApiError(err, res);
        }
        // Explicitly save session to ensure it persists
        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return handleApiError(saveErr, res);
          }
          console.log("Login successful, session saved for user:", user.id);
          res.json({ message: "Login successful", userId: user.id });
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      return handleApiError(error, res);
    }
  });

  // Rate limiter for account status checks (prevent email enumeration)
  const accountStatusRateLimits = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
  const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute per IP

  // Check account status by email (for smart login flow)
  // Rate limited to prevent email enumeration attacks
  app.post('/api/auth/account-status', async (req: any, res) => {
    try {
      // Rate limiting by IP
      const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
      const now = Date.now();
      const limitInfo = accountStatusRateLimits.get(clientIp);
      
      if (limitInfo) {
        if (now > limitInfo.resetAt) {
          // Reset window
          accountStatusRateLimits.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        } else if (limitInfo.count >= RATE_LIMIT_MAX_REQUESTS) {
          // Rate limited - add artificial delay and return generic response
          await new Promise(resolve => setTimeout(resolve, 1000));
          return res.status(429).json({ message: "Too many requests. Please wait a moment." });
        } else {
          limitInfo.count++;
        }
      } else {
        accountStatusRateLimits.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      }

      const schema = z.object({ email: z.string().email() });
      const parseResult = schema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid email" });
      }

      const { email } = parseResult.data;
      
      // Add small artificial delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      
      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.json({ 
          exists: false, 
          hasPassword: false, 
          authMethod: null 
        });
      }

      return res.json({
        exists: true,
        hasPassword: !!user.passwordHash,
        authMethod: user.passwordHash ? 'password' : 'google',
        firstName: user.firstName // To personalize the UI
      });
    } catch (error) {
      console.error("Account status check error:", error);
      return handleApiError(error, res);
    }
  });

  // Temporary admin endpoint to add password to existing OAuth account
  // Uses STATUS_KEY for authorization - remove after initial setup
  app.post('/api/admin/reset-user-password', async (req: any, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        adminKey: z.string()
      });
      const parseResult = schema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request" });
      }

      const { email, password, adminKey } = parseResult.data;

      // Verify admin key
      if (adminKey !== process.env.STATUS_KEY) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash and save the password
      const passwordHash = await bcrypt.hash(password, 10);
      await storage.updateUser(user.id, { 
        passwordHash,
        firstName: user.firstName || 'Pastor',
        lastName: user.lastName || 'Admin'
      });

      res.json({ message: "Password reset successfully", userId: user.id });
    } catch (error) {
      console.error("Admin password reset error:", error);
      return handleApiError(error, res);
    }
  });

  // Allow OAuth users to set a password for simpler future logins
  app.post('/api/auth/set-password', isAuthenticated, async (req: any, res) => {
    try {
      const schema = z.object({ 
        password: z.string().min(6, "Password must be at least 6 characters") 
      });
      const parseResult = schema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash and save the password
      const passwordHash = await bcrypt.hash(parseResult.data.password, 10);
      await storage.updateUser(userId, { passwordHash });

      res.json({ message: "Password set successfully. You can now log in with email and password." });
    } catch (error) {
      console.error("Set password error:", error);
      return handleApiError(error, res);
    }
  });

  // Request password reset - sends email with reset link
  app.post('/api/auth/forgot-password', async (req: any, res) => {
    try {
      const schema = z.object({ email: z.string().email() });
      const parseResult = schema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }

      const { email } = parseResult.data;
      const user = await storage.getUserByEmail(email);

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If an account exists with that email, you will receive a password reset link." });
      }

      // Generate secure token
      const token = randomUUID() + '-' + randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save token
      await storage.createPasswordResetToken(user.id, token, expiresAt);

      // Clean up old expired tokens
      await storage.deleteExpiredPasswordResetTokens();

      // Send email - use the request origin to ensure correct domain
      const host = req.get('host') || req.get('Host');
      const protocol = req.protocol || 'https';
      const baseUrl = host 
        ? `${protocol}://${host}`
        : 'https://gardencitychurchsurvey.com';
      
      await sendPasswordResetEmail(email, user.firstName, token, baseUrl);

      res.json({ message: "If an account exists with that email, you will receive a password reset link." });
    } catch (error) {
      console.error("Forgot password error:", error);
      return handleApiError(error, res);
    }
  });

  // Verify reset token is valid
  app.get('/api/auth/verify-reset-token', async (req: any, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ valid: false, message: "Token is required" });
      }

      const tokenData = await storage.getPasswordResetToken(token);
      if (!tokenData) {
        return res.json({ valid: false, message: "Invalid or expired reset link" });
      }

      if (tokenData.usedAt) {
        return res.json({ valid: false, message: "This reset link has already been used" });
      }

      if (new Date() > tokenData.expiresAt) {
        return res.json({ valid: false, message: "This reset link has expired" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error("Verify reset token error:", error);
      return handleApiError(error, res);
    }
  });

  // Complete password reset
  app.post('/api/auth/reset-password', async (req: any, res) => {
    try {
      const schema = z.object({
        token: z.string(),
        password: z.string().min(6, "Password must be at least 6 characters")
      });
      const parseResult = schema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request" });
      }

      const { token, password } = parseResult.data;

      const tokenData = await storage.getPasswordResetToken(token);
      if (!tokenData) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }

      if (tokenData.usedAt) {
        return res.status(400).json({ message: "This reset link has already been used" });
      }

      if (new Date() > tokenData.expiresAt) {
        return res.status(400).json({ message: "This reset link has expired" });
      }

      // Hash and save the new password
      const passwordHash = await bcrypt.hash(password, 10);
      await storage.updateUser(tokenData.userId, { passwordHash });

      // Mark token as used
      await storage.markPasswordResetTokenUsed(token);

      res.json({ message: "Password reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error("Reset password error:", error);
      return handleApiError(error, res);
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Auto-accept pending invites for this user's email (only once per session)
      const sessionKey = `invitesProcessed_${userId}`;
      const alreadyProcessed = req.session?.[sessionKey];
      
      let invitesProcessed = false;
      
      if (user?.email && !alreadyProcessed) {
        const allPendingInvites = await storage.getPendingInvitesByEmail(user.email);
        // Filter out expired invites
        const pendingInvites = allPendingInvites.filter(invite => 
          !invite.expiresAt || new Date(invite.expiresAt) > new Date()
        );
        
        // Pre-fetch existing role assignments to avoid repeated DB calls
        let existingAssignments = await storage.getUserRoleAssignments(userId);
        const assignedMinistryIds = new Set(existingAssignments.map(a => a.ministryId));
        
        // Track user data that may be updated during invite processing
        let currentFirstName = user.firstName;
        let currentLastName = user.lastName;
        
        for (const invite of pendingInvites) {
          try {
            // Mark invite as accepted
            await storage.updateTeamInvite(invite.id, {
              status: 'accepted',
              acceptedAt: new Date(),
              acceptedBy: userId,
            });
            
            // Update user profile with invite data if not already set
            const updates: any = {};
            if (!currentFirstName && invite.firstName) {
              updates.firstName = invite.firstName;
              currentFirstName = invite.firstName; // Track locally for subsequent invites
            }
            if (!currentLastName && invite.lastName) {
              updates.lastName = invite.lastName;
              currentLastName = invite.lastName; // Track locally for subsequent invites
            }
            if (Object.keys(updates).length > 0) {
              await storage.updateUser(userId, updates);
            }
            
            // Create role assignments for all pre-selected ministries
            const rawMinistries = invite.ministries || [];
            for (const item of rawMinistries) {
              let ministryId: string;
              let roleType: string;
              let roleTitle: string | undefined;
              
              if (typeof item === 'string') {
                ministryId = item;
                roleType = invite.roleType || 'member';
                roleTitle = invite.roleName || undefined;
              } else {
                const assignment = item as { ministryId: string; roleType?: string; roleTitle?: string };
                ministryId = assignment.ministryId;
                roleType = assignment.roleType || invite.roleType || 'member';
                roleTitle = assignment.roleTitle || invite.roleName || undefined;
              }
              
              // Check if assignment already exists using pre-fetched set
              if (!assignedMinistryIds.has(ministryId)) {
                await storage.createRoleAssignment({
                  userId,
                  ministryId,
                  roleType,
                  roleName: roleTitle || 'Member',
                  isActive: true,
                  assignedBy: invite.invitedBy,
                });
                
                await storage.createMinistrySelection({
                  userId,
                  ministryId,
                  isActive: true,
                });
                
                // Add to set to prevent duplicates within this batch
                assignedMinistryIds.add(ministryId);
              }
            }
            
            console.log(`Auto-accepted invite ${invite.id} for user ${userId} (${user.email})`);
            invitesProcessed = true;
          } catch (err) {
            console.error(`Failed to auto-accept invite ${invite.id}:`, err);
          }
        }
        
        // Only mark as processed in session if we successfully processed invites or had none to process
        // This allows retry on next request if all invites failed
        if (req.session && (invitesProcessed || pendingInvites.length === 0)) {
          req.session[sessionKey] = true;
        }
      }
      
      // Single consistent response path - re-fetch user if invites were processed
      const finalUser = invitesProcessed 
        ? await storage.getUser(userId) || user 
        : user;
      
      res.json(finalUser);
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // Get survey progress
  app.get('/api/survey/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getSurveyProgress(userId);
      
      if (!progress) {
        return res.status(404).json({ message: "No progress found" });
      }
      
      res.json(progress);
    } catch (error) {
      console.error("Error fetching survey progress:", error);
      return handleApiError(error, res);
    }
  });

  // Save survey progress
  app.post('/api/survey/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const progressSchema = z.object({
        currentSection: z.number().min(1).max(7),
        currentQuestion: z.number().min(0),
        answers: z.record(z.union([z.string(), z.number(), z.boolean()])),
      });
      
      const validatedData = progressSchema.parse(req.body);
      
      const progress = await storage.upsertSurveyProgress({
        userId,
        currentSection: validatedData.currentSection,
        currentQuestion: validatedData.currentQuestion,
        answers: validatedData.answers,
        isComplete: false,
      });
      
      res.json(progress);
    } catch (error) {
      console.error("Error saving survey progress:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Submit survey and calculate results
  app.post('/api/survey/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const submitSchema = z.object({
        answers: z.record(z.union([z.string(), z.number(), z.boolean()])),
      });
      
      const { answers } = submitSchema.parse(req.body);
      
      // Calculate all results
      const spiritualGifts = calculateGiftScores(answers as SurveyAnswers);
      const personalityProfile = calculateDISCProfile(answers as SurveyAnswers);
      const biblicalLiteracy = calculateBiblicalLiteracy(answers as SurveyAnswers);
      const technicalSkills = calculateTechnicalSkills(answers as SurveyAnswers);
      const ministryMatches = calculateMinistryMatches(
        answers as SurveyAnswers, 
        spiritualGifts, 
        personalityProfile
      );
      
      // Save results
      const results = await storage.createSurveyResults({
        userId,
        spiritualGifts,
        personalityProfile,
        biblicalLiteracy,
        technicalSkills,
        ministryMatches,
        rawAnswers: answers,
        emailSent: false,
      });
      
      // Mark progress as complete
      await storage.markSurveyComplete(userId);
      
      // Get user data and send emails asynchronously (don't block response)
      const user = await storage.getUser(userId);
      if (user) {
        sendAssessmentEmails({ user, results })
          .then(async (emailResult) => {
            // Only mark as sent if ALL emails succeeded (participant + both church emails)
            if (emailResult.allEmailsSent) {
              await storage.markEmailSent(results.id);
              console.log(`All assessment emails sent successfully for user: ${user.email}`);
            } else {
              console.error(`Some emails failed for user ${user.email}:`, emailResult.errors);
              console.log(`Participant email sent: ${emailResult.participantEmailSent}, Church emails sent: ${emailResult.churchEmailsSent}`);
            }
          })
          .catch((error) => {
            console.error(`Email sending error for user ${user.email}:`, error);
          });
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error submitting survey:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Get survey results
  app.get('/api/survey/results', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const results = await storage.getSurveyResults(userId);
      
      if (!results) {
        return res.status(404).json({ message: "No results found" });
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error fetching survey results:", error);
      return handleApiError(error, res);
    }
  });

  // Reset survey (for retaking)
  app.post('/api/survey/reset', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Delete existing progress
      await storage.deleteSurveyProgress(userId);
      
      res.json({ message: "Survey reset successfully" });
    } catch (error) {
      console.error("Error resetting survey:", error);
      return handleApiError(error, res);
    }
  });

  // Send retroactive emails for all completed surveys that haven't been emailed
  app.post('/api/admin/send-retroactive-emails', async (req: any, res) => {
    try {
      // Get all results that haven't been emailed
      const unsentResults = await storage.getAllResultsWithUnsentEmails();
      
      if (unsentResults.length === 0) {
        return res.json({ 
          message: "No unsent emails found", 
          sent: 0, 
          failed: 0 
        });
      }

      console.log(`Found ${unsentResults.length} results with unsent emails`);
      
      // Send emails for each result
      const emailResult = await sendRetroactiveEmails(unsentResults);
      
      // Mark emails as sent ONLY for results where ALL emails succeeded
      for (const result of emailResult.results) {
        if (result.allEmailsSent) {
          await storage.markEmailSent(result.resultId);
          console.log(`Marked email sent for result: ${result.resultId}`);
        } else {
          console.log(`NOT marking email sent for result ${result.resultId} - some emails failed: ${result.errors.join(', ')}`);
        }
      }
      
      res.json({
        message: `Retroactive emails processed`,
        total: unsentResults.length,
        sent: emailResult.sent,
        failed: emailResult.failed,
        errors: emailResult.errors,
      });
    } catch (error) {
      console.error("Error sending retroactive emails:", error);
      return handleApiError(error, res);
    }
  });

  // Get count of unsent emails (for admin info)
  app.get('/api/admin/unsent-emails-count', async (req: any, res) => {
    try {
      const unsentResults = await storage.getAllResultsWithUnsentEmails();
      res.json({ count: unsentResults.length });
    } catch (error) {
      console.error("Error getting unsent emails count:", error);
      return handleApiError(error, res);
    }
  });

  // Admin Reset Manuals Tool - DRY RUN mode (shows what would be deleted)
  app.get('/api/admin/reset-manuals/preview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const adminRoles = ['system-admin', 'admin'];
      if (!user || !adminRoles.includes(user.role || '')) {
        return res.status(403).json({ message: "Unauthorized - admin access required" });
      }
      
      // Get counts of what would be affected
      const existingManuals = await storage.getManuals();
      const allAnalyses = await db.select().from(manualAnalysis);
      const allModules = await storage.getTrainingModules();
      const modulesWithManualLink = allModules.filter(m => m.manualId);
      
      res.json({
        mode: 'DRY_RUN',
        warning: 'This is a preview. No data will be deleted.',
        wouldDelete: {
          manuals: existingManuals.length,
          analyses: allAnalyses.length,
          trainingLinksAffected: modulesWithManualLink.length,
        },
        manualsList: existingManuals.map(m => ({
          id: m.id,
          title: m.title,
          category: m.category,
          ministryId: m.ministryId,
        })),
        note: 'Use POST /api/admin/reset-manuals/execute to actually delete'
      });
    } catch (error) {
      console.error("Error previewing manual reset:", error);
      return handleApiError(error, res);
    }
  });

  // Admin Reset Manuals Tool - EXECUTE mode (actually deletes)
  app.post('/api/admin/reset-manuals/execute', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const adminRoles = ['system-admin', 'admin'];
      if (!user || !adminRoles.includes(user.role || '')) {
        return res.status(403).json({ message: "Unauthorized - admin access required" });
      }
      
      const { confirmDelete } = req.body;
      if (confirmDelete !== 'CONFIRM_DELETE_ALL_MANUALS') {
        return res.status(400).json({ 
          message: "Confirmation required. Send { confirmDelete: 'CONFIRM_DELETE_ALL_MANUALS' }" 
        });
      }
      
      // Get counts before deletion
      const existingManuals = await storage.getManuals();
      const allAnalyses = await db.select().from(manualAnalysis);
      const allModules = await storage.getTrainingModules();
      const modulesWithManualLink = allModules.filter(m => m.manualId);
      
      // Step 1: Clear manualId from all training modules
      for (const module of modulesWithManualLink) {
        await db.update(trainingModules)
          .set({ manualId: null })
          .where(eq(trainingModules.id, module.id));
      }
      
      // Step 2: Delete all manual analyses
      await db.delete(manualAnalysis);
      
      // Step 3: Delete all manuals
      await db.delete(manuals);
      
      res.json({
        mode: 'EXECUTED',
        deleted: {
          manuals: existingManuals.length,
          analyses: allAnalyses.length,
          trainingLinksCleared: modulesWithManualLink.length,
        },
        message: 'All manuals, analyses, and training links have been cleared. Ready for fresh registration.'
      });
    } catch (error) {
      console.error("Error executing manual reset:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // USER RESET TOOL (Safe database reset except owner)
  // ==========================================================================

  const PROTECTED_EMAIL = 'pastor@gardencitychurch.net';

  // Preview user reset - DRY RUN mode
  app.get('/api/admin/reset-users/preview', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isAdmin(user.role)) {
        return res.status(403).json({ message: "Unauthorized - admin access required" });
      }
      
      // Get all users except protected email
      const allUsers = await storage.getAllUsers();
      const usersToRemove = allUsers.filter((u: { email: string | null }) => u.email !== PROTECTED_EMAIL);
      const protectedUser = allUsers.find((u: { email: string | null }) => u.email === PROTECTED_EMAIL);
      
      // Get user IDs to count dependent records
      const userIdsToRemove = usersToRemove.map((u: any) => u.id);
      
      // Count actual dependent records for preview
      let surveyResultsCount = 0;
      let trainingProgressCount = 0;
      let roleAssignmentsCount = 0;
      let messagesCount = 0;
      let onboardingProgressCount = 0;
      let ministrySelectionsCount = 0;
      
      for (const uid of userIdsToRemove) {
        const sr = await db.select().from(surveyResults).where(eq(surveyResults.userId, uid));
        surveyResultsCount += sr.length;
        const tp = await db.select().from(userTrainingProgress).where(eq(userTrainingProgress.userId, uid));
        trainingProgressCount += tp.length;
        const ra = await db.select().from(roleAssignments).where(eq(roleAssignments.userId, uid));
        roleAssignmentsCount += ra.length;
        const ms1 = await db.select().from(messages).where(eq(messages.senderId, uid));
        const ms2 = await db.select().from(messages).where(eq(messages.recipientId, uid));
        messagesCount += ms1.length + ms2.length;
        const op = await db.select().from(onboardingProgress).where(eq(onboardingProgress.userId, uid));
        onboardingProgressCount += op.length;
        const msel = await db.select().from(ministrySelections).where(eq(ministrySelections.userId, uid));
        ministrySelectionsCount += msel.length;
      }
      
      const dependentCounts = {
        users: usersToRemove.length,
        surveyResults: surveyResultsCount,
        trainingProgress: trainingProgressCount,
        roleAssignments: roleAssignmentsCount,
        messages: messagesCount,
        onboardingProgress: onboardingProgressCount,
        ministrySelections: ministrySelectionsCount,
      };
      
      res.json({
        mode: 'DRY_RUN',
        protectedUser: protectedUser ? {
          email: PROTECTED_EMAIL,
          name: `${protectedUser.firstName} ${protectedUser.lastName}`,
          role: protectedUser.role,
        } : null,
        willRemove: dependentCounts,
        usersToRemove: usersToRemove.map((u: any) => ({
          id: u.id,
          email: u.email,
          name: `${u.firstName} ${u.lastName}`,
          role: u.role,
        })),
        warning: 'This will permanently remove all users except the protected owner account.',
        note: 'Use POST /api/admin/reset-users/execute with confirmPhrase to actually delete'
      });
    } catch (error) {
      console.error("Error previewing user reset:", error);
      return handleApiError(error, res);
    }
  });

  // Execute user reset
  app.post('/api/admin/reset-users/execute', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isAdmin(user.role)) {
        return res.status(403).json({ message: "Unauthorized - admin access required" });
      }
      
      const { confirmPhrase } = req.body;
      
      if (confirmPhrase !== 'RESET ALL USERS') {
        return res.status(400).json({ 
          message: "Invalid confirmation phrase. Type 'RESET ALL USERS' exactly to proceed.",
          required: 'RESET ALL USERS'
        });
      }
      
      // Get all users except protected email
      const allUsers = await storage.getAllUsers();
      const usersToRemove = allUsers.filter((u: { email: string | null }) => u.email !== PROTECTED_EMAIL);
      
      let removed = {
        users: 0,
        surveyResults: 0,
        trainingProgress: 0,
        roleAssignments: 0,
        messages: 0,
        onboardingProgress: 0,
        ministrySelections: 0,
      };
      
      // Delete dependent records and users
      for (const userToRemove of usersToRemove) {
        try {
          // Delete survey results
          await db.delete(surveyResults).where(eq(surveyResults.userId, userToRemove.id));
          removed.surveyResults++;
          
          // Delete training progress
          await db.delete(userTrainingProgress).where(eq(userTrainingProgress.userId, userToRemove.id));
          removed.trainingProgress++;
          
          // Delete role assignments
          await db.delete(roleAssignments).where(eq(roleAssignments.userId, userToRemove.id));
          removed.roleAssignments++;
          
          // Delete messages
          await db.delete(messages).where(eq(messages.senderId, userToRemove.id));
          await db.delete(messages).where(eq(messages.recipientId, userToRemove.id));
          removed.messages++;
          
          // Delete onboarding progress
          await db.delete(onboardingProgress).where(eq(onboardingProgress.userId, userToRemove.id));
          removed.onboardingProgress++;
          
          // Delete ministry selections
          await db.delete(ministrySelections).where(eq(ministrySelections.userId, userToRemove.id));
          removed.ministrySelections++;
          
          // Finally delete the user
          await db.delete(users).where(eq(users.id, userToRemove.id));
          removed.users++;
        } catch (err) {
          console.error(`Error removing user ${userToRemove.id}:`, err);
        }
      }
      
      console.log(`[ADMIN] User reset executed by ${user.email}. Removed ${removed.users} users.`);
      
      res.json({
        mode: 'EXECUTED',
        removed,
        protectedEmail: PROTECTED_EMAIL,
        message: `Successfully removed ${removed.users} users. Protected account preserved.`
      });
    } catch (error) {
      console.error("Error executing user reset:", error);
      return handleApiError(error, res);
    }
  });

  // Admin Register Manuals - Scan attached_assets and register new manuals
  app.post('/api/admin/register-manuals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const adminRoles = ['system-admin', 'admin'];
      if (!user || !adminRoles.includes(user.role || '')) {
        return res.status(403).json({ message: "Unauthorized - admin access required" });
      }
      
      const fs = await import('fs');
      const pathModule = await import('path');
      const assetsDir = pathModule.default.resolve(process.cwd(), 'attached_assets');
      
      if (!fs.existsSync(assetsDir)) {
        return res.status(404).json({ message: "attached_assets directory not found" });
      }
      
      const files = fs.readdirSync(assetsDir);
      const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
      const docxFiles = files.filter(f => f.toLowerCase().endsWith('.docx'));
      const pagesFiles = files.filter(f => f.toLowerCase().endsWith('.pages'));
      
      // Get existing ministries for linking
      const ministries = await storage.getMinistries();
      
      // Categorization rules based on filename patterns
      const categorizeManual = (filename: string): { 
        category: 'ministry_manual' | 'leadership_training' | 'resource';
        title: string;
        ministrySlug?: string;
        generateTraining: boolean;
      } => {
        const cleanName = filename
          .replace(/_\d{13}\.pdf$/i, '')
          .replace(/_\d{13}\.docx$/i, '')
          .replace(/_\d{13}\.pages$/i, '')
          .replace(/\d+_/g, '')
          .replace(/_/g, ' ')
          .replace(/\([^)]*\)/g, '')
          .trim();
        
        const lowerName = cleanName.toLowerCase();
        
        // Leadership Training patterns
        const leadershipPatterns = [
          'language of a leader', 'recruitment 101', 'ministry leaders manual',
          'ministry development', 'job description', 'board member'
        ];
        if (leadershipPatterns.some(p => lowerName.includes(p))) {
          return { category: 'leadership_training', title: cleanName, generateTraining: true };
        }
        
        // Resource patterns
        const resourcePatterns = [
          'about us', 'serve booklet', 'following jesus', 'holy spirit class',
          'baptism', 'discipleship model', 'employee manual', 'confidentiality',
          'incident report', 'bylaws', 'policy'
        ];
        if (resourcePatterns.some(p => lowerName.includes(p))) {
          return { category: 'resource', title: cleanName, generateTraining: false };
        }
        
        // Ministry manual patterns - try to match to a ministry
        const ministryMatches: Record<string, string> = {
          'usher': 'ushers',
          'security': 'security',
          'social media': 'media',
          'youth worship': 'worship',
          'city youth': 'student-ministry',
          'city uth': 'student-ministry',
          'kingdom children': 'kids-ministry',
          'intercessory': 'intercessory',
          'crew': 'crew',
          'core minister': 'core-ministers',
          'celebrate recovery': 'celebrate-recovery',
          'facilities': 'facilities',
          'counting': 'counting',
          'auxiliary': 'hospitality',
          'landing team': 'landing-team',
          'discipleship hour': 'discipleship-hour',
          'media ministry': 'media',
        };
        
        for (const [pattern, slug] of Object.entries(ministryMatches)) {
          if (lowerName.includes(pattern)) {
            return { category: 'ministry_manual', title: cleanName, ministrySlug: slug, generateTraining: true };
          }
        }
        
        // Default to resource if unsure
        return { category: 'resource', title: cleanName, generateTraining: false };
      };
      
      const registered: { title: string; category: string; file: string; ministryId?: string }[] = [];
      const missingAnalysisSource: string[] = [];
      const errors: string[] = [];
      
      // Process PDF files
      for (const pdfFile of pdfFiles) {
        try {
          const { category, title, ministrySlug, generateTraining } = categorizeManual(pdfFile);
          
          // Find matching ministry
          let ministryId: string | undefined;
          if (ministrySlug) {
            const ministry = ministries.find(m => 
              m.slug === ministrySlug || 
              m.name.toLowerCase().includes(ministrySlug.replace('-', ' '))
            );
            ministryId = ministry?.id;
          }
          
          // Check if analysis source exists (DOCX or MD)
          const baseName = pdfFile.replace(/\.pdf$/i, '');
          const hasDocx = docxFiles.some(f => f.toLowerCase().includes(baseName.toLowerCase().slice(0, 20)));
          
          // Create manual record
          const newManual = await storage.createManual({
            title,
            category,
            ministryId: ministryId || null,
            fileUrl: `/attached_assets/${pdfFile}`,
            fileType: 'pdf',
            analysisSourceUrl: hasDocx ? `/attached_assets/${docxFiles.find(f => f.toLowerCase().includes(baseName.toLowerCase().slice(0, 20)))}` : null,
            analysisSourceType: hasDocx ? 'docx' : null,
            generateTraining,
            isRequired: category === 'ministry_manual',
          });
          
          registered.push({ 
            title, 
            category, 
            file: pdfFile,
            ministryId: ministryId || undefined
          });
          
          if (!hasDocx) {
            missingAnalysisSource.push(pdfFile);
          }
        } catch (err) {
          errors.push(`Failed to register ${pdfFile}: ${err}`);
        }
      }
      
      res.json({
        message: 'Manual registration complete',
        registered: registered.length,
        byCategory: {
          ministry_manual: registered.filter(r => r.category === 'ministry_manual').length,
          leadership_training: registered.filter(r => r.category === 'leadership_training').length,
          resource: registered.filter(r => r.category === 'resource').length,
        },
        missingAnalysisSource: missingAnalysisSource.length,
        missingAnalysisSourceFiles: missingAnalysisSource,
        unlinkedToMinistry: registered.filter(r => r.category === 'ministry_manual' && !r.ministryId).length,
        errors: errors.length > 0 ? errors : undefined,
        details: registered,
      });
    } catch (error) {
      console.error("Error registering manuals:", error);
      return handleApiError(error, res);
    }
  });

  // Admin Fix Training Links - Link training modules to newly registered manuals
  app.post('/api/admin/fix-training-links', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const adminRoles = ['system-admin', 'admin'];
      if (!user || !adminRoles.includes(user.role || '')) {
        return res.status(403).json({ message: "Unauthorized - admin access required" });
      }
      
      const allModules = await storage.getTrainingModules();
      const allManuals = await storage.getManuals();
      
      const fixed: { moduleId: string; moduleTitle: string; manualId: string; manualTitle: string }[] = [];
      const stillUnlinked: { moduleId: string; moduleTitle: string; reason: string }[] = [];
      
      for (const module of allModules) {
        // Skip if already has a valid manual link
        if (module.manualId) {
          const existingManual = allManuals.find(m => m.id === module.manualId);
          if (existingManual) continue;
        }
        
        // Try to match by ministry
        if (module.ministryId) {
          const matchingManual = allManuals.find(m => 
            m.ministryId === module.ministryId && m.category === 'ministry_manual'
          );
          if (matchingManual) {
            await db.update(trainingModules)
              .set({ manualId: matchingManual.id })
              .where(eq(trainingModules.id, module.id));
            fixed.push({ 
              moduleId: module.id, 
              moduleTitle: module.title, 
              manualId: matchingManual.id, 
              manualTitle: matchingManual.title 
            });
            continue;
          }
        }
        
        // Try to match by title similarity
        const titleLower = module.title.toLowerCase();
        const matchingManual = allManuals.find(m => {
          const manualTitleLower = m.title.toLowerCase();
          return titleLower.includes(manualTitleLower) || manualTitleLower.includes(titleLower);
        });
        
        if (matchingManual) {
          await db.update(trainingModules)
            .set({ manualId: matchingManual.id })
            .where(eq(trainingModules.id, module.id));
          fixed.push({ 
            moduleId: module.id, 
            moduleTitle: module.title, 
            manualId: matchingManual.id, 
            manualTitle: matchingManual.title 
          });
        } else {
          stillUnlinked.push({ 
            moduleId: module.id, 
            moduleTitle: module.title, 
            reason: 'No matching manual found by ministry or title' 
          });
        }
      }
      
      res.json({
        message: 'Training link fix complete',
        fixed: fixed.length,
        stillUnlinked: stillUnlinked.length,
        fixedDetails: fixed,
        unlinkedDetails: stillUnlinked,
      });
    } catch (error) {
      console.error("Error fixing training links:", error);
      return handleApiError(error, res);
    }
  });

  // Batch analyze all manuals linked to training modules (leadership only)
  app.post('/api/admin/analyze-training-manuals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['system-admin', 'admin', 'pastor', 'leader'].includes(user.role || '')) {
        return res.status(403).json({ message: "Unauthorized - leadership access required" });
      }
      
      // Get all training modules with linked manuals that lack lesson content
      const allModules = await storage.getTrainingModules();
      const modulesNeedingAnalysis = allModules.filter(m => 
        m.manualId && (!m.lessonSummary || m.lessonSummary.trim() === '')
      );
      
      const results: { manualId: string; title: string; status: string }[] = [];
      const { analyzeManual } = await import('./manualAnalysisService');
      
      for (const module of modulesNeedingAnalysis) {
        if (!module.manualId) continue;
        
        // Check if already analyzed
        const existingAnalysis = await storage.getManualAnalysis(module.manualId);
        if (existingAnalysis && (existingAnalysis.status === 'completed' || existingAnalysis.status === 'processing')) {
          results.push({ manualId: module.manualId, title: module.title, status: existingAnalysis.status });
          continue;
        }
        
        // Create analysis record
        if (!existingAnalysis) {
          await storage.createManualAnalysis({
            manualId: module.manualId,
            status: 'processing',
            triggeredBy: userId,
          });
        } else {
          await storage.updateManualAnalysis(module.manualId, {
            status: 'processing',
            triggeredBy: userId,
            errorMessage: null,
          });
        }
        
        // Trigger async analysis
        analyzeManual(module.manualId).catch((error: Error) => {
          console.error(`Background analysis error for ${module.title}:`, error);
        });
        
        results.push({ manualId: module.manualId, title: module.title, status: 'started' });
      }
      
      res.json({ 
        message: `Analysis triggered for ${results.filter(r => r.status === 'started').length} manuals`,
        total: modulesNeedingAnalysis.length,
        results 
      });
    } catch (error) {
      console.error("Error triggering batch manual analysis:", error);
      return handleApiError(error, res);
    }
  });

  // Generate deep training for core manuals (Phase 2)
  app.post('/api/admin/generate-core-trainings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['system-admin', 'admin', 'pastor'].includes(user.role || '')) {
        return res.status(403).json({ message: "Unauthorized - admin access required" });
      }
      
      const { generateAllCoreTrainings, identifyCoreManuals } = await import('./deepTrainingService');
      
      // First identify core manuals
      const coreManuals = await identifyCoreManuals();
      
      // Generate trainings (this can take a while)
      const result = await generateAllCoreTrainings();
      
      res.json({
        message: `Deep training generation complete`,
        coreManuals: coreManuals.map(c => ({ title: c.title, audience: c.audience, category: c.category })),
        summary: result.summary,
        results: result.results.map(r => ({
          manual: r.manual,
          success: r.result.success,
          lessonsCount: r.result.lessonsCount,
          knowledgeCheckCount: r.result.knowledgeCheckCount,
          intensiveAssessmentCount: r.result.intensiveAssessmentCount,
          error: r.result.error,
        })),
      });
    } catch (error) {
      console.error("Error generating core trainings:", error);
      res.status(500).json({ message: "Failed to generate core trainings", error: String(error) });
    }
  });

  // Generate deep training for remaining manuals (Phase 2)
  app.post('/api/admin/generate-remaining-trainings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['system-admin', 'admin', 'pastor'].includes(user.role || '')) {
        return res.status(403).json({ message: "Unauthorized - admin access required" });
      }
      
      const { generateRemainingTrainings } = await import('./deepTrainingService');
      const result = await generateRemainingTrainings();
      
      res.json({
        message: `Remaining training generation complete`,
        summary: result.summary,
        resourcesEnabled: result.summary.resourcesEnabled,
        results: result.results.map(r => ({
          manual: r.manual,
          success: r.result.success,
          lessonsCount: r.result.lessonsCount,
          enabledReason: r.enabledReason,
          error: r.result.error,
        })),
      });
    } catch (error) {
      console.error("Error generating remaining trainings:", error);
      res.status(500).json({ message: "Failed to generate remaining trainings", error: String(error) });
    }
  });

  // Regenerate trainings with < 8 lessons (Phase 2.1 correction)
  app.post('/api/admin/regenerate-insufficient-trainings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !['system-admin', 'admin', 'pastor'].includes(user.role || '')) {
        return res.status(403).json({ message: "Unauthorized - admin access required" });
      }
      
      const { regenerateInsufficientTrainings } = await import('./deepTrainingService');
      const result = await regenerateInsufficientTrainings();
      
      res.json({
        message: `Insufficient training regeneration complete`,
        before: result.before,
        after: result.after,
        summary: result.summary,
      });
    } catch (error) {
      console.error("Error regenerating insufficient trainings:", error);
      res.status(500).json({ message: "Failed to regenerate insufficient trainings", error: String(error) });
    }
  });

  // Get identified core manuals for Phase 2
  app.get('/api/admin/core-manuals', isAuthenticated, async (req: any, res) => {
    try {
      const { identifyCoreManuals } = await import('./deepTrainingService');
      const coreManuals = await identifyCoreManuals();
      
      res.json({
        count: coreManuals.length,
        manuals: coreManuals,
      });
    } catch (error) {
      console.error("Error identifying core manuals:", error);
      return handleApiError(error, res);
    }
  });

  // Seed ministry hierarchy (admin only)
  app.post('/api/admin/seed-ministries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const adminRoles = ['system-admin', 'admin'];
      if (!user || !adminRoles.includes(user.role || '')) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const existingMinistries = await storage.getMinistries();
      const existingNames = existingMinistries.map(m => m.name.toLowerCase());
      
      // Define ministry hierarchy
      const ministryHierarchy = [
        // Parent: Landing Team
        { 
          name: 'Landing Team', 
          description: 'First impressions and hospitality ministry - ensuring every guest feels welcomed',
          category: 'hospitality',
          children: [
            { name: 'Greeters', description: 'Welcome guests at the door with a warm smile', category: 'hospitality' },
            { name: 'First Impressions', description: 'Create an excellent first-time experience for visitors', category: 'hospitality' },
            { name: 'Community Care Team', description: 'Follow up with guests and provide ongoing pastoral care', category: 'hospitality' },
          ]
        },
        // Parent: Worship Arts
        { 
          name: 'Worship Arts', 
          description: 'Leading the congregation in musical worship and creative arts',
          category: 'worship',
          children: [
            { name: 'Worship Vocals', description: 'Lead and support vocals during worship', category: 'worship' },
            { name: 'Worship Band', description: 'Play instruments during worship services', category: 'worship' },
            { name: 'Worship Tech', description: 'Sound, lights, and media production for worship', category: 'worship' },
          ]
        },
        // Parent: Kids Ministry
        { 
          name: 'Kids Ministry', 
          description: 'Nurturing the next generation in faith',
          category: 'children',
          children: [
            { name: 'Nursery', description: 'Care for infants and toddlers (0-2 years)', category: 'children' },
            { name: 'Preschool', description: 'Teach and care for preschoolers (3-5 years)', category: 'children' },
            { name: 'Elementary', description: 'Lead kids church for elementary age children', category: 'children' },
          ]
        },
        // Parent: Student Ministry
        { 
          name: 'Student Ministry', 
          description: 'Youth and young adult discipleship',
          category: 'youth',
          children: [
            { name: 'Middle School', description: 'Ministry to middle school students', category: 'youth' },
            { name: 'High School', description: 'Ministry to high school students', category: 'youth' },
            { name: 'Young Adults', description: 'Ministry to young adults 18-25', category: 'youth' },
          ]
        },
        // Parent: Production
        { 
          name: 'Production', 
          description: 'Technical production for services and events',
          category: 'production',
          children: [
            { name: 'Sound', description: 'Audio engineering for services', category: 'production' },
            { name: 'Lighting', description: 'Lighting design and operation', category: 'production' },
            { name: 'Video', description: 'Camera operation and video production', category: 'production' },
            { name: 'ProPresenter', description: 'Lyrics and presentation slides', category: 'production' },
          ]
        },
      ];
      
      const created: string[] = [];
      const skipped: string[] = [];
      
      // Helper to generate slug from name
      const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      for (const parent of ministryHierarchy) {
        let parentMinistry;
        
        // Check if parent exists
        if (existingNames.includes(parent.name.toLowerCase())) {
          parentMinistry = existingMinistries.find(m => m.name.toLowerCase() === parent.name.toLowerCase());
          skipped.push(parent.name);
        } else {
          parentMinistry = await storage.createMinistry({
            name: parent.name,
            slug: generateSlug(parent.name),
            description: parent.description,
            category: parent.category,
            isActive: true,
          });
          created.push(parent.name);
        }
        
        // Create children
        if (parentMinistry && parent.children) {
          for (const child of parent.children) {
            if (existingNames.includes(child.name.toLowerCase())) {
              skipped.push(child.name);
            } else {
              await storage.createMinistry({
                name: child.name,
                slug: generateSlug(child.name),
                description: child.description,
                category: child.category,
                parentMinistryId: parentMinistry.id,
                isActive: true,
              });
              created.push(child.name);
            }
          }
        }
      }
      
      res.json({ 
        success: true, 
        created, 
        skipped,
        message: `Created ${created.length} ministries, skipped ${skipped.length} existing ones.`
      });
    } catch (error) {
      console.error("Error seeding ministries:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // ONBOARDING ROUTES
  // ==========================================================================

  // Get onboarding progress
  app.get('/api/onboarding/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getOnboardingProgress(userId);
      
      if (!progress) {
        return res.json({ 
          currentStep: 1, 
          stepResponses: {}, 
          isComplete: false, 
          isBlocked: false 
        });
      }
      
      res.json(progress);
    } catch (error) {
      console.error("Error fetching onboarding progress:", error);
      return handleApiError(error, res);
    }
  });

  // Save onboarding progress
  app.post('/api/onboarding/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const progressSchema = z.object({
        currentStep: z.number().min(1).max(11),
        stepResponses: z.record(z.any()),
        spiritBaptismExperience: z.record(z.any()).optional(),
        isComplete: z.boolean().optional(),
        isBlocked: z.boolean().optional(),
        blockedAtStep: z.number().optional(),
      });
      
      const validatedData = progressSchema.parse(req.body);
      
      const progress = await storage.upsertOnboardingProgress({
        userId,
        ...validatedData,
      });
      
      // If onboarding is complete, update user status
      if (validatedData.isComplete) {
        await storage.updateUserOnboardingStatus(userId, 'completed');
      } else if (validatedData.isBlocked) {
        await storage.updateUserOnboardingStatus(userId, 'blocked');
      } else {
        await storage.updateUserOnboardingStatus(userId, 'in-progress');
      }
      
      res.json(progress);
    } catch (error) {
      console.error("Error saving onboarding progress:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Save class status (Next Night / Following Jesus) - final onboarding step
  // This endpoint is IDEMPOTENT - safe to call multiple times
  app.post('/api/onboarding/class-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existingUser = await storage.getUser(userId);
      
      // Idempotent check: if already DONE, just return success
      if (existingUser?.onboardingState === 'DONE') {
        return res.json(existingUser);
      }
      
      const classStatusSchema = z.object({
        nextNightStatus: z.enum(['COMPLETE', 'INCOMPLETE', 'SCHEDULED', 'UNKNOWN']),
        followingJesusStatus: z.enum(['COMPLETE', 'INCOMPLETE', 'SCHEDULED', 'UNKNOWN']),
        nextNightDate: z.string().optional(),
        followingJesusDate: z.string().optional(),
        attendsSunday: z.boolean().optional(),
        attendsDiscipleshipHour: z.boolean().optional(),
      });
      
      const validatedData = classStatusSchema.parse(req.body);
      
      // Parse dates from strings if provided
      const nextNightCompletedAt = validatedData.nextNightStatus === 'COMPLETE' 
        ? (validatedData.nextNightDate ? new Date(validatedData.nextNightDate) : new Date())
        : null;
      const followingJesusCompletedAt = validatedData.followingJesusStatus === 'COMPLETE'
        ? (validatedData.followingJesusDate ? new Date(validatedData.followingJesusDate) : new Date())
        : null;
      
      // Update user with class status and complete onboarding
      await storage.updateUser(userId, {
        nextNightStatus: validatedData.nextNightStatus,
        followingJesusStatus: validatedData.followingJesusStatus,
        nextNightCompletedAt,
        followingJesusCompletedAt,
        hasAttendedSunday: validatedData.attendsSunday ?? existingUser?.hasAttendedSunday,
        hasAttendedNextNight: validatedData.nextNightStatus === 'COMPLETE' ? true : existingUser?.hasAttendedNextNight,
        onboardingState: 'DONE',
        onboardingStatus: 'completed',
        onboardingCompletedAt: new Date(),
      });
      
      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error saving class status:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Update user role (admin only for admin changes, leadership for other changes)
  app.patch('/api/users/:userId/role', isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      const { userId } = req.params;
      const { role: newRole } = req.body;
      const targetUser = await storage.getUser(userId);
      
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const adminRoles = ['system-admin', 'admin'];
      const isRequestingUserAdmin = adminRoles.includes(requestingUser?.role || '');
      const isTargetUserAdmin = adminRoles.includes(targetUser.role || '');
      const isGrantingAdmin = adminRoles.includes(newRole);
      
      // Only admins can grant admin role
      if (isGrantingAdmin && !isRequestingUserAdmin) {
        return res.status(403).json({ message: "Only administrators can grant admin access" });
      }
      
      // Only admins can modify other admins
      if (isTargetUserAdmin && !isRequestingUserAdmin) {
        return res.status(403).json({ message: "Only administrators can modify other administrators" });
      }
      
      // Leadership roles can update non-admin users
      const leadershipRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      if (!requestingUser || !leadershipRoles.includes(requestingUser.role || '')) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await storage.updateUserRole(userId, newRole);
      res.json({ message: "Role updated successfully" });
    } catch (error) {
      console.error("Error updating user role:", error);
      return handleApiError(error, res);
    }
  });

  // Update user class status (admin only)
  const classStatusSchema = z.object({
    nextNightStatus: z.enum(['COMPLETE', 'INCOMPLETE', 'SCHEDULED', 'UNKNOWN']).optional(),
    followingJesusStatus: z.enum(['COMPLETE', 'INCOMPLETE', 'SCHEDULED', 'UNKNOWN']).optional(),
  });
  
  app.patch('/api/users/:userId/class-status', isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      // Only admins and pastors can update class status
      const classAdminRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor'];
      if (!requestingUser || !classAdminRoles.includes(requestingUser.role || '')) {
        return res.status(403).json({ message: "Only administrators can update class status" });
      }
      
      // Validate request body
      const parseResult = classStatusSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid class status value", 
          errors: parseResult.error.errors 
        });
      }
      
      const { userId } = req.params;
      const { nextNightStatus, followingJesusStatus } = parseResult.data;
      
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updates: Partial<typeof targetUser> = {};
      
      if (nextNightStatus !== undefined) {
        updates.nextNightStatus = nextNightStatus;
        // Track completion date and who set it
        if (nextNightStatus === 'COMPLETE') {
          updates.nextNightCompletedAt = new Date();
          updates.nextNightSetBy = requestingUserId;
        } else {
          // Clear completion data if status is not complete
          updates.nextNightCompletedAt = null;
          updates.nextNightSetBy = null;
        }
      }
      
      if (followingJesusStatus !== undefined) {
        updates.followingJesusStatus = followingJesusStatus;
        // Track completion date and who set it
        if (followingJesusStatus === 'COMPLETE') {
          updates.followingJesusCompletedAt = new Date();
          updates.followingJesusSetBy = requestingUserId;
        } else {
          // Clear completion data if status is not complete
          updates.followingJesusCompletedAt = null;
          updates.followingJesusSetBy = null;
        }
      }
      
      await storage.updateUser(userId, updates);
      res.json({ message: "Class status updated successfully" });
    } catch (error) {
      console.error("Error updating class status:", error);
      return handleApiError(error, res);
    }
  });

  // Get all users (leadership only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      // Check if user has permission to view users
      const leaderRoles = ['owner', 'system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      if (!requestingUser || !leaderRoles.includes(requestingUser.role || '')) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PHASE 2: SCOPED DIRECTORY ENDPOINT
  // ==========================================================================
  
  // Get scoped directory - returns only users who share a ministry with the caller
  // Members can only see people they serve with; Leaders can see everyone
  app.get('/api/directory', isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      if (!requestingUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Leaders can see all users
      if (isLeader(requestingUser.role)) {
        const allUsers = await storage.getAllUsers();
        const safeUsers = allUsers.map(user => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profileImageUrl: user.profileImageUrl,
          role: user.role,
          ledMinistryIds: user.ledMinistryIds,
          servedMinistryIds: user.servedMinistryIds,
        }));
        return res.json(safeUsers);
      }
      
      // Members only see people they share ministries with
      const myMinistries = [
        ...(requestingUser.ledMinistryIds || []),
        ...(requestingUser.servedMinistryIds || [])
      ];
      
      if (myMinistries.length === 0) {
        // No ministries = can only see themselves
        return res.json([{
          id: requestingUser.id,
          firstName: requestingUser.firstName,
          lastName: requestingUser.lastName,
          email: requestingUser.email,
          profileImageUrl: requestingUser.profileImageUrl,
          role: requestingUser.role,
        }]);
      }
      
      // Get all users and filter to those who share at least one ministry
      const allUsers = await storage.getAllUsers();
      const visibleUsers = allUsers.filter(user => {
        // Always include yourself
        if (user.id === requestingUserId) return true;
        
        // Check if they share any ministry
        const theirMinistries = [
          ...(user.ledMinistryIds || []),
          ...(user.servedMinistryIds || [])
        ];
        return theirMinistries.some(mid => myMinistries.includes(mid));
      });
      
      // Return safe subset of user data
      const safeUsers = visibleUsers.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        ledMinistryIds: user.ledMinistryIds,
        servedMinistryIds: user.servedMinistryIds,
      }));
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching directory:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // ROLE ASSIGNMENTS ROUTES
  // ==========================================================================

  // Get all role assignments (leadership only)
  app.get('/api/role-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      const leaderRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      if (!requestingUser || !leaderRoles.includes(requestingUser.role || '')) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const assignments = await storage.getRoleAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching role assignments:", error);
      return handleApiError(error, res);
    }
  });

  // Get user's role assignments (own assignments or leadership only)
  app.get('/api/role-assignments/user/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const targetUserId = req.params.userId;
      
      // Users can view their own assignments, or leaders can view anyone's
      if (requestingUserId !== targetUserId) {
        const requestingUser = await storage.getUser(requestingUserId);
        const leaderRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
        if (!requestingUser || !leaderRoles.includes(requestingUser.role || '')) {
          return res.status(403).json({ message: "Unauthorized" });
        }
      }
      
      const assignments = await storage.getUserRoleAssignments(targetUserId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user role assignments:", error);
      return handleApiError(error, res);
    }
  });

  // Create role assignment (leadership only)
  app.post('/api/role-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      const leaderRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      if (!requestingUser || !leaderRoles.includes(requestingUser.role || '')) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const assignmentSchema = z.object({
        userId: z.string(),
        ministryId: z.string(),
        roleName: z.string().optional(),
      });
      
      const validated = assignmentSchema.parse(req.body);
      const assignment = await storage.createRoleAssignment({
        ...validated,
        assignedBy: requestingUserId,
      });
      res.json(assignment);
    } catch (error) {
      console.error("Error creating role assignment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Delete role assignment (leadership only)
  app.delete('/api/role-assignments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      const leaderRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      if (!requestingUser || !leaderRoles.includes(requestingUser.role || '')) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      await storage.deleteRoleAssignment(req.params.id);
      res.json({ message: "Role assignment removed" });
    } catch (error) {
      console.error("Error deleting role assignment:", error);
      return handleApiError(error, res);
    }
  });

  // Get current user's detailed role assignments with ministry and leader info
  // Alias: /api/role-assignments/me -> /api/role-assignments/my (Phase 1 fix)
  app.get('/api/role-assignments/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assignments = await storage.getUserRoleAssignments(userId);
      
      // Enrich each assignment with ministry details and leader info
      const enrichedAssignments = await Promise.all(
        assignments.map(async (assignment: any) => {
          const ministry = await storage.getMinistry(assignment.ministryId);
          let leader = null;
          
          const reportsToId = assignment.reportsToUserId || ministry?.leaderId;
          if (reportsToId) {
            leader = await storage.getUser(reportsToId);
          }
          
          return {
            ...assignment,
            ministry: ministry ? {
              id: ministry.id,
              name: ministry.name,
              category: ministry.category,
              description: ministry.description,
            } : null,
            reportsTo: leader ? {
              id: leader.id,
              firstName: leader.firstName,
              lastName: leader.lastName,
              profileImageUrl: leader.profileImageUrl,
            } : null,
          };
        })
      );
      
      res.json(enrichedAssignments);
    } catch (error) {
      console.error("Error fetching my role assignments:", error);
      return handleApiError(error, res);
    }
  });

  // Original endpoint
  app.get('/api/role-assignments/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assignments = await storage.getUserRoleAssignments(userId);
      
      // Enrich each assignment with ministry details and leader info
      const enrichedAssignments = await Promise.all(
        assignments.map(async (assignment: any) => {
          const ministry = await storage.getMinistry(assignment.ministryId);
          let leader = null;
          
          // Get the person they report to (either from assignment or ministry leader)
          const reportsToId = assignment.reportsToUserId || ministry?.leaderId;
          if (reportsToId) {
            leader = await storage.getUser(reportsToId);
          }
          
          return {
            ...assignment,
            ministry: ministry ? {
              id: ministry.id,
              name: ministry.name,
              category: ministry.category,
              description: ministry.description,
            } : null,
            reportsTo: leader ? {
              id: leader.id,
              firstName: leader.firstName,
              lastName: leader.lastName,
              profileImageUrl: leader.profileImageUrl,
            } : null,
          };
        })
      );
      
      res.json(enrichedAssignments);
    } catch (error) {
      console.error("Error fetching my role assignments:", error);
      return handleApiError(error, res);
    }
  });

  // Get current user's leadership assignments (H1)
  app.get('/api/leadership-assignments/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assignments = await storage.getUserLeadershipAssignments(userId);
      
      // Enrich with ministry details
      const enrichedAssignments = await Promise.all(
        assignments.map(async (assignment) => {
          const ministry = await storage.getMinistry(assignment.ministryId);
          return {
            ...assignment,
            ministry: ministry ? {
              id: ministry.id,
              name: ministry.name,
              category: ministry.category,
              description: ministry.description,
            } : null,
          };
        })
      );
      
      res.json(enrichedAssignments);
    } catch (error) {
      console.error("Error fetching leadership assignments:", error);
      return handleApiError(error, res);
    }
  });

  // Update leadership assignment (H1 with Primary leader guardrail)
  app.patch('/api/leadership-assignments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const assignment = await storage.getLeadershipAssignment(req.params.id);
      
      if (!assignment) {
        return res.status(404).json({ message: "Leadership assignment not found" });
      }
      
      // H1 GUARDRAIL: Primary leaders cannot remove themselves
      const updateSchema = z.object({
        isActive: z.boolean().optional(),
        isPrimary: z.boolean().optional(),
      });
      const validated = updateSchema.parse(req.body);
      
      // Check if this is a self-deactivation attempt by Primary leader
      if (assignment.userId === requestingUserId && 
          assignment.isPrimary && 
          assignment.isLocked && 
          validated.isActive === false) {
        return res.status(403).json({ 
          message: "Primary leaders cannot remove themselves from leadership. Please contact an administrator.",
          code: "PRIMARY_LEADER_SELF_REMOVAL_BLOCKED"
        });
      }
      
      // Admin/Owner check for modifying other's assignments
      const requestingUser = await storage.getUser(requestingUserId);
      if (assignment.userId !== requestingUserId) {
        const adminRoles = ['owner', 'admin', 'system-admin', 'lead-pastor'];
        if (!requestingUser || !adminRoles.includes(requestingUser.role || '')) {
          return res.status(403).json({ message: "Only administrators can modify others' leadership assignments" });
        }
      }
      
      const updatedAssignment = await storage.updateLeadershipAssignment(req.params.id, validated);
      res.json(updatedAssignment);
    } catch (error) {
      console.error("Error updating leadership assignment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Update role assignment details (leadership only)
  app.patch('/api/role-assignments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      const leaderRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      if (!requestingUser || !leaderRoles.includes(requestingUser.role || '')) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const updateSchema = z.object({
        roleType: z.enum(['leader', 'member']).optional(),
        roleName: z.string().optional(),
        roleTitle: z.string().optional(),
        responsibilities: z.string().optional(),
        keySkills: z.array(z.string()).optional(),
        requirements: z.string().optional(),
        reportsToUserId: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      });
      
      const validated = updateSchema.parse(req.body);
      const assignment = await storage.updateRoleAssignment(req.params.id, validated);
      res.json(assignment);
    } catch (error) {
      console.error("Error updating role assignment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PROFILE ROUTES
  // ==========================================================================

  // Get current user profile
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        socialLinks: user.socialLinks || {},
        profileImageUrl: user.profileImageUrl,
        profileCompletedAt: user.profileCompletedAt,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      return handleApiError(error, res);
    }
  });

  // Update user profile
  app.put('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const profileSchema = z.object({
        firstName: z.string().min(1, "First name is required").optional(),
        lastName: z.string().min(1, "Last name is required").optional(),
        email: z.string().email().optional(),
        bio: z.string().max(500).optional().or(z.literal('')),
        phone: z.string().optional(),
        socialLinks: z.object({
          facebook: z.string().url().optional().or(z.literal('')),
          instagram: z.string().url().optional().or(z.literal('')),
          twitter: z.string().url().optional().or(z.literal('')),
          linkedin: z.string().url().optional().or(z.literal('')),
          website: z.string().url().optional().or(z.literal('')),
        }).optional(),
        profileImageUrl: z.string().optional(),
      });
      
      const validatedData = profileSchema.parse(req.body);
      
      // Clean up empty social links
      if (validatedData.socialLinks) {
        const cleanedLinks: Record<string, string> = {};
        Object.entries(validatedData.socialLinks).forEach(([key, value]) => {
          if (value && value.trim() !== '') {
            cleanedLinks[key] = value;
          }
        });
        validatedData.socialLinks = cleanedLinks as typeof validatedData.socialLinks;
      }
      
      // Build update object with all provided fields
      const updateData: any = {};
      if (validatedData.firstName) updateData.firstName = validatedData.firstName;
      if (validatedData.lastName) updateData.lastName = validatedData.lastName;
      if (validatedData.bio !== undefined) updateData.bio = validatedData.bio;
      if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
      if (validatedData.socialLinks) updateData.socialLinks = validatedData.socialLinks;
      if (validatedData.profileImageUrl !== undefined) updateData.profileImageUrl = validatedData.profileImageUrl;
      
      const user = await storage.updateUserProfile(userId, updateData);
      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // General profile update (supports onboarding state transitions)
  app.post('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const updateSchema = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        bio: z.string().optional(),
        role: z.enum(['admin', 'pastor', 'leader', 'dream-team', 'member']).optional(),
        onboardingState: z.enum(['AUTH', 'WELCOME', 'PROFILE', 'LEADERSHIP', 'MINISTRIES', 'FAITH_COMMITMENT', 'PHOTO', 'CLASS_STATUS', 'DONE']).optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      
      const updatedUser = await storage.updateUser(userId, validatedData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Upload profile photo
  app.post('/api/profile/photo', isAuthenticated, uploadProfilePhoto.single('photo'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No photo file uploaded" });
      }
      
      // Generate the URL for the uploaded photo
      const photoUrl = `/uploads/profile-photos/${file.filename}`;
      
      // Update user's profile image URL
      await storage.updateUser(userId, { profileImageUrl: photoUrl });
      
      res.json({ 
        message: "Photo uploaded successfully",
        profileImageUrl: photoUrl
      });
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      return handleApiError(error, res);
    }
  });

  // Update class status (for post-onboarding updates from MyDiscipleship page)
  app.patch('/api/class-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const classStatusSchema = z.object({
        nextNightStatus: z.enum(['COMPLETE', 'INCOMPLETE', 'SCHEDULED', 'UNKNOWN']).optional(),
        followingJesusStatus: z.enum(['COMPLETE', 'INCOMPLETE', 'SCHEDULED', 'UNKNOWN']).optional(),
        nextNightDate: z.string().optional(),
        followingJesusDate: z.string().optional(),
      });
      
      const validatedData = classStatusSchema.parse(req.body);
      
      const updates: Record<string, any> = {};
      
      if (validatedData.nextNightStatus) {
        updates.nextNightStatus = validatedData.nextNightStatus;
        if (validatedData.nextNightStatus === 'COMPLETE') {
          updates.nextNightCompletedAt = validatedData.nextNightDate 
            ? new Date(validatedData.nextNightDate) 
            : new Date();
          updates.hasAttendedNextNight = true;
        }
      }
      
      if (validatedData.followingJesusStatus) {
        updates.followingJesusStatus = validatedData.followingJesusStatus;
        if (validatedData.followingJesusStatus === 'COMPLETE') {
          updates.followingJesusCompletedAt = validatedData.followingJesusDate
            ? new Date(validatedData.followingJesusDate)
            : new Date();
        }
      }
      
      const updatedUser = await storage.updateUser(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating class status:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // LEADERSHIP ONBOARDING STEP (H1)
  // ==========================================================================
  
  app.post('/api/onboarding/leadership', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isLeader, ministryIds } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user's leadership lock status
      const updates: Record<string, any> = {
        isLeaderLocked: isLeader === true,
      };
      
      // If user is a leader, create leadership assignments and skip ministry step
      if (isLeader && ministryIds && ministryIds.length > 0) {
        // Store led ministries
        updates.ledMinistryIds = ministryIds;
        // Update role to leader if not already a leader/pastor
        const previousRole = user.role;
        if (user.role !== 'leader' && user.role !== 'pastor' && user.role !== 'admin' && user.role !== 'owner') {
          updates.role = 'leader';
        }
        // Skip to faith commitment since leaders selected their ministries
        updates.onboardingState = 'FAITH_COMMITMENT';
        
        // Get ministry names for audit log and notifications
        const ministryList = await storage.getMinistries();
        const selectedMinistryNames = ministryList
          .filter(m => ministryIds.includes(m.id))
          .map(m => m.name);
        
        // Create ministry leadership assignments for each selected ministry
        for (const ministryId of ministryIds) {
          await storage.createMinistryLeadershipAssignment({
            ministryId,
            userId,
            leadershipType: 'primary',
            isPrimary: true,
            isLocked: true, // Locked via onboarding self-identification
            isActive: true,
            assignedBy: userId, // Self-assigned during onboarding
          });
        }
        
        // Create audit log entry for leader_locked_in
        await storage.createAuditLog({
          entityType: 'user',
          entityId: userId,
          action: 'leader_locked_in',
          previousValue: { role: previousRole, ledMinistryIds: user.ledMinistryIds || [] },
          newValue: { role: updates.role || user.role, ledMinistryIds: ministryIds, isLeaderLocked: true },
          reason: `User self-identified as leader of: ${selectedMinistryNames.join(', ')}`,
          performedBy: userId,
        });
        
        // Notify Admin/Owner users about the new leader lock-in
        const allUsers = await storage.getUsersWithMinistryDetails();
        const adminOwnerUsers = allUsers.filter(u => 
          u.role === 'owner' || u.role === 'admin' || u.role === 'system-admin'
        );
        
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'A user';
        
        for (const adminUser of adminOwnerUsers) {
          if (adminUser.id !== userId) { // Don't notify the user themselves
            await storage.createNotification({
              userId: adminUser.id,
              type: 'leader_locked_in',
              title: 'Leader Locked In',
              message: `${userName} has confirmed leadership of: ${selectedMinistryNames.join(', ')}`,
              data: { 
                newLeaderId: userId, 
                ministryIds, 
                ministryNames: selectedMinistryNames,
                pastoralIntent: 'AWARENESS' 
              },
              link: `/leadership/people`,
            });
          }
        }
      } else {
        // Non-leader: proceed to ministry selection step
        updates.onboardingState = 'MINISTRIES';
      }
      
      const updatedUser = await storage.updateUser(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error saving leadership selection:", error);
      return handleApiError(error, res);
    }
  });

  // Complete profile (mark as done after all requirements met)
  app.post('/api/profile/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Validate profile requirements
      const errors: string[] = [];
      
      if (!user.profileImageUrl || user.profileImageUrl.trim() === '') {
        errors.push("Profile photo is required");
      }
      
      if (!user.bio || user.bio.trim().length < 10) {
        errors.push("Bio is required (at least 10 characters)");
      }
      
      if (errors.length > 0) {
        return res.status(400).json({ 
          message: "Profile requirements not met", 
          errors 
        });
      }
      
      await storage.markProfileComplete(userId);
      const updatedUser = await storage.getUser(userId);
      
      res.json({ 
        message: "Profile completed successfully",
        user: updatedUser 
      });
    } catch (error) {
      console.error("Error completing profile:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // REQUIREMENTS STATUS ROUTE (for gating other features)
  // ==========================================================================

  app.get('/api/requirements/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const onboardingProgress = await storage.getOnboardingProgress(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check onboarding status
      const onboardingComplete = user.onboardingStatus === 'completed';
      const onboardingBlocked = user.onboardingStatus === 'blocked';
      
      // Check profile requirements
      const hasProfilePhoto = !!user.profileImageUrl && user.profileImageUrl.trim() !== '';
      const hasBio = !!user.bio && user.bio.trim().length >= 10;
      const profileComplete = !!user.profileCompletedAt;
      
      // Calculate completion percentage
      let completionSteps = 0;
      let totalSteps = 3; // onboarding, photo, bio
      
      if (onboardingComplete) completionSteps++;
      if (hasProfilePhoto) completionSteps++;
      if (hasBio) completionSteps++;
      
      const completionPercentage = Math.round((completionSteps / totalSteps) * 100);
      
      // Determine access level
      const canAccessFeatures = onboardingComplete && profileComplete;
      
      // Determine next required step
      let nextStep: 'onboarding' | 'photo' | 'bio' | 'complete' | 'blocked' = 'complete';
      
      if (onboardingBlocked) {
        nextStep = 'blocked';
      } else if (!onboardingComplete) {
        nextStep = 'onboarding';
      } else if (!hasProfilePhoto) {
        nextStep = 'photo';
      } else if (!hasBio) {
        nextStep = 'bio';
      }
      
      res.json({
        canAccessFeatures,
        nextStep,
        completionPercentage,
        requirements: {
          onboarding: {
            complete: onboardingComplete,
            blocked: onboardingBlocked,
            currentStep: onboardingProgress?.currentStep || 1,
            totalSteps: 11,
          },
          profile: {
            complete: profileComplete,
            hasPhoto: hasProfilePhoto,
            hasBio,
            photoUrl: user.profileImageUrl,
            bio: user.bio,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching requirements status:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // CALENDAR EVENTS ROUTES
  // ==========================================================================

  // Get calendar events
  app.get('/api/calendar/events', isAuthenticated, async (req: any, res) => {
    try {
      const { start, end } = req.query;
      
      const startDate = start ? new Date(start as string) : new Date();
      const endDate = end ? new Date(end as string) : undefined;
      
      const events = await storage.getCalendarEvents(startDate, endDate);
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      return handleApiError(error, res);
    }
  });

  // Create calendar event
  app.post('/api/calendar/events', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const eventSchema = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        eventType: z.string().optional(),
        startDate: z.string().transform((s) => new Date(s)),
        endDate: z.string().optional().transform((s) => s ? new Date(s) : undefined),
        allDay: z.boolean().optional(),
        location: z.string().optional(),
        ministryId: z.string().optional(),
      });
      
      const validatedData = eventSchema.parse(req.body);
      
      const event = await storage.createCalendarEvent({
        ...validatedData,
        createdBy: userId,
      });
      
      res.json(event);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Update calendar event
  app.put('/api/calendar/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const eventSchema = z.object({
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        eventType: z.string().optional(),
        startDate: z.string().optional().transform((s) => s ? new Date(s) : undefined),
        endDate: z.string().optional().transform((s) => s ? new Date(s) : undefined),
        allDay: z.boolean().optional(),
        location: z.string().optional(),
        ministryId: z.string().optional(),
      });
      
      const validatedData = eventSchema.parse(req.body);
      
      const event = await storage.updateCalendarEvent(id, validatedData);
      res.json(event);
    } catch (error) {
      console.error("Error updating calendar event:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Delete calendar event
  app.delete('/api/calendar/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCalendarEvent(id);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // SERVICE ASSIGNMENTS ROUTES (Planning Center data)
  // ==========================================================================

  // Get user's service assignments
  app.get('/api/services/assignments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assignments = await storage.getServiceAssignments(userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching service assignments:", error);
      return handleApiError(error, res);
    }
  });

  // Sync user's Planning Center assignments
  app.post('/api/services/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      
      if (!userEmail) {
        return res.status(400).json({ message: "User email is required for sync" });
      }
      
      // Import the planning center service dynamically
      const { planningCenterService } = await import('./planningCenterService');
      const syncCount = await planningCenterService.syncUserAssignments(userId, userEmail);
      
      res.json({ 
        message: syncCount > 0 
          ? `Synced ${syncCount} service assignments` 
          : "No service assignments found in Planning Center",
        count: syncCount 
      });
    } catch (error: any) {
      console.error("Error syncing Planning Center:", error);
      
      // Return more helpful error messages
      if (error.message?.includes('connection failed')) {
        return res.status(503).json({ 
          message: "Planning Center connection failed. Please check integration settings." 
        });
      }
      
      return handleApiError(error, res);
    }
  });

  // Get Planning Center integration status (admin only)
  app.get('/api/integrations/planning-center', isAuthenticated, async (req: any, res) => {
    try {
      const settings = await storage.getIntegrationSettings('planning-center');
      
      // Don't expose the actual credentials, just the status
      res.json({
        isEnabled: settings?.isEnabled ?? false,
        hasCredentials: !!(settings?.credentials as any)?.applicationId,
        lastSyncAt: settings?.lastSyncAt,
        syncStatus: settings?.syncStatus,
        syncError: settings?.syncError,
      });
    } catch (error) {
      console.error("Error fetching Planning Center status:", error);
      return handleApiError(error, res);
    }
  });

  // Configure Planning Center integration (admin only)
  app.post('/api/integrations/planning-center', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['admin'].includes(user.role || '')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const configSchema = z.object({
        applicationId: z.string().min(1),
        secret: z.string().min(1),
        isEnabled: z.boolean().default(true),
      });

      const validated = configSchema.parse(req.body);

      await storage.upsertIntegrationSettings({
        integrationName: 'planning-center',
        isEnabled: validated.isEnabled,
        credentials: {
          applicationId: validated.applicationId,
          secret: validated.secret,
        },
      });

      // Test the connection
      const { planningCenterService } = await import('./planningCenterService');
      const testResult = await planningCenterService.testConnection();

      res.json({
        message: "Planning Center integration configured",
        connectionTest: testResult,
      });
    } catch (error) {
      console.error("Error configuring Planning Center:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // MINISTRIES ROUTES
  // ==========================================================================

  app.get('/api/ministries', isAuthenticated, async (req: any, res) => {
    try {
      const ministries = await storage.getMinistries();
      
      // Optimized: Get all leadership assignments in one query, then group by ministry
      const allLeadershipAssignments = await storage.getAllActiveLeadershipAssignments();
      const leadershipByMinistry = new Map<string, { primaryCount: number; secondaryCount: number }>();
      
      for (const assignment of allLeadershipAssignments) {
        if (!leadershipByMinistry.has(assignment.ministryId)) {
          leadershipByMinistry.set(assignment.ministryId, { primaryCount: 0, secondaryCount: 0 });
        }
        const counts = leadershipByMinistry.get(assignment.ministryId)!;
        if (assignment.isPrimary) {
          counts.primaryCount++;
        } else {
          counts.secondaryCount++;
        }
      }
      
      // Enrich with needsLeader flag (H1: ministries without a Primary Leader)
      const enrichedMinistries = ministries.map(ministry => {
        const counts = leadershipByMinistry.get(ministry.id) || { primaryCount: 0, secondaryCount: 0 };
        return {
          ...ministry,
          needsLeader: counts.primaryCount === 0,
          primaryLeaderCount: counts.primaryCount,
        };
      });
      
      res.json(enrichedMinistries);
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  app.get('/api/ministries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const ministry = await storage.getMinistry(req.params.id);
      if (!ministry) {
        return res.status(404).json({ message: "Ministry not found" });
      }
      res.json(ministry);
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  app.post('/api/ministries', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['system-admin', 'admin', 'pastor', 'leader'].includes(user.role || '')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const ministrySchema = z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        category: z.string().min(1),
        description: z.string().optional().nullable(),
        leaderId: z.string().optional().nullable(),
        parentMinistryId: z.string().optional().nullable(),
        requiresBackgroundCheck: z.boolean().optional(),
        requiresSpiritBaptism: z.boolean().optional(),
        requiresHolySpiritClass: z.boolean().optional(),
        minimumAge: z.number().optional().nullable(),
        isActive: z.boolean().optional(),
      });

      const validated = ministrySchema.parse(req.body);
      const ministry = await storage.createMinistry(validated);
      res.json(ministry);
    } catch (error) {
      console.error("Error creating ministry:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Update a ministry
  app.patch('/api/ministries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['system-admin', 'admin', 'pastor', 'leader'].includes(user.role || '')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const ministrySchema = z.object({
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        category: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        leaderId: z.string().optional().nullable(),
        parentMinistryId: z.string().optional().nullable(),
        requiresBackgroundCheck: z.boolean().optional(),
        requiresSpiritBaptism: z.boolean().optional(),
        requiresHolySpiritClass: z.boolean().optional(),
        minimumAge: z.number().optional().nullable(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      });

      const validated = ministrySchema.parse(req.body);
      const ministry = await storage.updateMinistry(req.params.id, validated);
      if (!ministry) {
        return res.status(404).json({ message: "Ministry not found" });
      }
      res.json(ministry);
    } catch (error) {
      console.error("Error updating ministry:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // TEAM JOIN REQUESTS ROUTES
  // ==========================================================================

  // Get member counts for all ministries
  app.get('/api/ministries/member-counts', isAuthenticated, async (req: any, res) => {
    try {
      const counts = await storage.getMinistryMemberCounts();
      res.json(counts);
    } catch (error) {
      console.error("Error fetching ministry member counts:", error);
      return handleApiError(error, res);
    }
  });

  // Get team roster for a ministry (with user details)
  app.get('/api/ministries/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const assignments = await storage.getMinistryMembers(req.params.id);
      const users = await storage.getAllUsers();
      const membersWithUsers = assignments.map(a => ({
        ...a,
        user: users.find(u => u.id === a.userId),
      }));
      res.json(membersWithUsers);
    } catch (error) {
      console.error("Error fetching ministry members:", error);
      return handleApiError(error, res);
    }
  });

  // Get team health indicators for a ministry (leadership view)
  app.get('/api/ministries/:id/team-health', isAuthenticated, isLeader, async (req: any, res) => {
    try {
      const teamHealth = await storage.getMinistryTeamHealth(req.params.id);
      res.json(teamHealth);
    } catch (error) {
      console.error("Error fetching team health:", error);
      return handleApiError(error, res);
    }
  });

  // Get child ministries for a parent ministry
  app.get('/api/ministries/:id/children', isAuthenticated, async (req: any, res) => {
    try {
      const children = await storage.getChildMinistries(req.params.id);
      res.json(children);
    } catch (error) {
      console.error("Error fetching child ministries:", error);
      return handleApiError(error, res);
    }
  });

  // Get leaders for a ministry
  app.get('/api/ministries/:id/leaders', isAuthenticated, async (req: any, res) => {
    try {
      const leaders = await storage.getMinistryLeaders(req.params.id);
      const users = await storage.getAllUsers();
      const leadersWithUsers = leaders.map(l => ({
        ...l,
        user: users.find(u => u.id === l.userId),
      }));
      res.json(leadersWithUsers);
    } catch (error) {
      console.error("Error fetching ministry leaders:", error);
      return handleApiError(error, res);
    }
  });

  // Add a leader to a ministry
  app.post('/api/ministries/:id/leaders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only admins can add leaders
      const isAdmin = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'].includes(user?.role || '');
      if (!isAdmin) {
        return res.status(403).json({ message: "Not authorized to add leaders" });
      }

      const schema = z.object({
        userId: z.string(),
        role: z.enum(['leader', 'co-leader', 'assistant']).optional(),
        isPrimary: z.boolean().optional(),
      });

      const validated = schema.parse(req.body);
      
      const leader = await storage.addMinistryLeader({
        ministryId: req.params.id,
        userId: validated.userId,
        role: validated.role || 'leader',
        isPrimary: validated.isPrimary || false,
        addedBy: userId,
      });
      res.json(leader);
    } catch (error) {
      console.error("Error adding ministry leader:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Remove a leader from a ministry
  app.delete('/api/ministries/:id/leaders/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const user = await storage.getUser(currentUserId);
      
      // Only admins can remove leaders
      const isAdmin = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'].includes(user?.role || '');
      if (!isAdmin) {
        return res.status(403).json({ message: "Not authorized to remove leaders" });
      }

      await storage.removeMinistryLeader(req.params.id, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing ministry leader:", error);
      return handleApiError(error, res);
    }
  });

  // Update ministry parent
  app.patch('/api/ministries/:id/parent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only admins can update ministry hierarchy
      const isAdmin = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'].includes(user?.role || '');
      if (!isAdmin) {
        return res.status(403).json({ message: "Not authorized to update ministry hierarchy" });
      }

      const schema = z.object({
        parentMinistryId: z.string().nullable(),
      });

      const validated = schema.parse(req.body);
      
      const ministry = await storage.updateMinistry(req.params.id, {
        parentMinistryId: validated.parentMinistryId,
      });
      res.json(ministry);
    } catch (error) {
      console.error("Error updating ministry parent:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Get join requests for a ministry (leader only)
  app.get('/api/ministries/:id/join-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const ministry = await storage.getMinistry(req.params.id);
      
      if (!ministry) {
        return res.status(404).json({ message: "Ministry not found" });
      }

      // Only ministry leader or admin can view requests
      const isAdmin = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'].includes(user?.role || '');
      const isLeader = ministry.leaderId === userId;
      
      if (!isAdmin && !isLeader) {
        return res.status(403).json({ message: "Not authorized to view join requests" });
      }

      const requests = await storage.getTeamJoinRequests(req.params.id);
      const users = await storage.getAllUsers();
      const requestsWithUsers = requests.map(r => ({
        ...r,
        user: users.find(u => u.id === r.userId),
      }));
      res.json(requestsWithUsers);
    } catch (error) {
      console.error("Error fetching join requests:", error);
      return handleApiError(error, res);
    }
  });

  // Get current user's join requests
  app.get('/api/team-join-requests/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requests = await storage.getTeamJoinRequestsByUser(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching my join requests:", error);
      return handleApiError(error, res);
    }
  });

  // Submit a join request
  app.post('/api/team-join-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requestSchema = z.object({
        ministryId: z.string(),
        message: z.string().optional(),
      });

      const validated = requestSchema.parse(req.body);

      // Check if already a member
      const assignments = await storage.getUserRoleAssignments(userId);
      const alreadyMember = assignments.some(a => a.ministryId === validated.ministryId && a.isActive);
      if (alreadyMember) {
        return res.status(400).json({ message: "You are already a member of this team" });
      }

      // Check for pending request
      const existingRequests = await storage.getTeamJoinRequestsByUser(userId);
      const hasPending = existingRequests.some(
        r => r.ministryId === validated.ministryId && r.status === 'pending'
      );
      if (hasPending) {
        return res.status(400).json({ message: "You already have a pending request for this team" });
      }

      const request = await storage.createTeamJoinRequest({
        userId,
        ministryId: validated.ministryId,
        message: validated.message || null,
        status: 'pending',
      });

      // Notify ministry leaders about new join request
      try {
        const requester = await storage.getUser(userId);
        const ministry = await storage.getMinistry(validated.ministryId);
        const requesterName = requester?.firstName && requester?.lastName
          ? `${requester.firstName} ${requester.lastName}`
          : requester?.email || 'Someone';
        const ministryName = ministry?.name || 'your ministry';
        
        const leaderAssignments = await storage.getMinistryLeaders(validated.ministryId);
        let notifiedCount = 0;
        
        for (const assignment of leaderAssignments) {
          await storage.createNotification({
            userId: assignment.userId,
            type: 'team_join_request',
            title: 'New Team Join Request',
            message: `${requesterName} wants to join ${ministryName}.`,
            link: `/leadership/my-team`,
            isRead: false,
          });
          notifiedCount++;
        }
        console.log(`[Notification] Notified ${notifiedCount} leader(s) about join request from ${requesterName}`);
      } catch (notifError) {
        console.error('[Notification] Error sending join request notifications:', notifError);
      }

      res.json(request);
    } catch (error) {
      console.error("Error creating join request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Update join request (approve/decline) - leader only
  app.patch('/api/team-join-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const request = await storage.getTeamJoinRequest(req.params.id);

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      const ministry = await storage.getMinistry(request.ministryId);
      if (!ministry) {
        return res.status(404).json({ message: "Ministry not found" });
      }

      // Only ministry leader or admin can update
      const isAdmin = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'].includes(user?.role || '');
      const isLeader = ministry.leaderId === userId;

      if (!isAdmin && !isLeader) {
        return res.status(403).json({ message: "Not authorized to manage join requests" });
      }

      const updateSchema = z.object({
        status: z.enum(['approved', 'declined']),
        reviewNotes: z.string().optional(),
      });

      const validated = updateSchema.parse(req.body);

      const updated = await storage.updateTeamJoinRequest(req.params.id, {
        status: validated.status,
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: validated.reviewNotes,
      });

      // If approved, create role assignment and auto-enroll in training
      if (validated.status === 'approved') {
        await storage.createRoleAssignment({
          userId: request.userId,
          ministryId: request.ministryId,
          assignedBy: userId,
          isActive: true,
        });

        // Auto-enroll user in ministry-specific training modules
        const ministryTrainings = await storage.getTrainingModules(request.ministryId);
        for (const training of ministryTrainings) {
          // Check if user is already enrolled
          const existingProgress = await storage.getUserModuleProgress(request.userId, training.id);
          if (!existingProgress) {
            await storage.upsertUserTrainingProgress({
              userId: request.userId,
              moduleId: training.id,
              status: 'not-started',
              progressPercent: 0,
              currentSection: 0,
            });
          }
        }

        // Notify the new member they've been approved
        try {
          const newMember = await storage.getUser(request.userId);
          const ministryName = ministry.name;
          const newMemberName = newMember?.firstName && newMember?.lastName
            ? `${newMember.firstName} ${newMember.lastName}`
            : newMember?.email || 'New member';
          
          await storage.createNotification({
            userId: request.userId,
            type: 'team_join_approved',
            title: 'Welcome to the Team!',
            message: `You've been approved to join ${ministryName}. Check out your training modules!`,
            link: `/trainings`,
            isRead: false,
          });

          // Notify all ministry leaders about the new team member
          const leaderAssignments = await storage.getMinistryLeaders(request.ministryId);
          let notifiedCount = 0;
          for (const assignment of leaderAssignments) {
            const leaderUser = await storage.getUser(assignment.userId);
            if (!leaderUser || assignment.userId === userId) continue; // Skip approver
            
            await storage.createNotification({
              userId: assignment.userId,
              type: 'team_member_joined',
              title: 'New Team Member',
              message: `${newMemberName} has joined ${ministryName}.`,
              link: `/leadership/my-team`,
              isRead: false,
            });
            notifiedCount++;
            
            // Send email to leaders
            if (leaderUser.email) {
              sendLeaderNotificationEmail({
                type: 'TEAM_JOINED',
                leaderName: leaderUser.firstName || 'Leader',
                leaderEmail: leaderUser.email,
                memberName: newMemberName,
                ministryName,
                link: `${process.env.REPLIT_DEV_DOMAIN || 'https://ministrypath.replit.app'}/leadership/my-team`,
              }).catch(err => console.error('[Notification] Failed to send team join email:', err));
            }
          }
          console.log(`[Notification] ${newMemberName} approved to join ${ministryName}, notified ${notifiedCount} leaders`);
        } catch (notifError) {
          console.error('[Notification] Error sending team join approval notifications:', notifError);
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating join request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Withdraw join request
  app.delete('/api/team-join-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const request = await storage.getTeamJoinRequest(req.params.id);

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      if (request.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to withdraw this request" });
      }

      await storage.updateTeamJoinRequest(req.params.id, {
        status: 'withdrawn',
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error withdrawing join request:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // TRAINING MODULES ROUTES
  // ==========================================================================

  app.get('/api/training/modules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ministryId, includeAll } = req.query;
      
      // Get user info to determine role-based requirements
      const user = await storage.getUser(userId);
      const userRole = user?.role || 'member';
      
      // Get user's ministry selections
      const ministrySelections = await storage.getUserMinistrySelections(userId);
      const userMinistryIds = ministrySelections
        .filter(s => s.isActive === true)
        .map(s => s.ministryId);
      
      // Also check role assignments for ministry memberships
      const roleAssignments = await storage.getUserRoleAssignments(userId);
      const assignedMinistryIds = roleAssignments
        .filter(ra => ra.ministryId)
        .map(ra => ra.ministryId as string);
      
      const allUserMinistryIds = Array.from(new Set([...userMinistryIds, ...assignedMinistryIds]));
      
      // When includeAll is true (admin view), also include inactive modules
      const includeInactive = includeAll === 'true';
      let modules = await storage.getTrainingModules(ministryId as string | undefined, includeInactive);
      
      // If not includeAll, filter to user's relevant trainings
      if (includeAll !== 'true') {
        // Define core trainings for all team members using slugs for stability
        // Note: These are flexible - trainings can be added/removed via isRequired flag in DB
        const CORE_DREAM_TEAM_SLUGS = [
          'about-us-mission',
          'discipleship-pathway', 
          'facilities-care'
        ];
        
        // Additional trainings for Leaders/Pastors using slugs
        const LEADER_SLUGS = [
          'recruitment-101',
          'language-of-leader',
          'ministry-leaders-training'
        ];
        
        // Roles that require leadership trainings
        const LEADER_ROLES = [
          'admin', 
          'pastor', 
          'leader'
        ];
        
        const isLeader = LEADER_ROLES.includes(userRole);
        
        // Filter and mark modules - return new objects to avoid mutation
        modules = modules.filter(module => {
          // Core trainings are always shown
          if (CORE_DREAM_TEAM_SLUGS.includes(module.slug)) {
            return true;
          }
          
          // Leadership trainings only for leaders
          if (LEADER_SLUGS.includes(module.slug)) {
            return isLeader;
          }
          
          // Ministry-specific trainings only if user is in that ministry
          if (module.ministryId) {
            return allUserMinistryIds.includes(module.ministryId);
          }
          
          // Include other general trainings (without ministryId) as optional
          return true;
        }).map(module => {
          // Mark required status based on role - create new object
          let isRequired = false;
          
          if (CORE_DREAM_TEAM_SLUGS.includes(module.slug)) {
            isRequired = true;
          } else if (LEADER_SLUGS.includes(module.slug) && isLeader) {
            isRequired = true;
          } else if (module.ministryId && allUserMinistryIds.includes(module.ministryId)) {
            isRequired = true;
          }
          
          return { ...module, isRequired };
        });
      }
      
      res.json(modules);
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  app.get('/api/training/modules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const module = await storage.getTrainingModule(req.params.id);
      if (!module) {
        return res.status(404).json({ message: "Training module not found" });
      }
      
      // RAW DRIZZLE OUTPUT - LOG IMMEDIATELY AFTER FETCH
      console.log('=== RAW MODULE FROM DRIZZLE ===');
      console.log('module.id:', module.id);
      console.log('module.lessons:', module.lessons);
      console.log('typeof module.lessons:', typeof module.lessons);
      console.log('Array.isArray(module.lessons):', Array.isArray(module.lessons));
      console.log('JSON.stringify(module.lessons):', JSON.stringify(module.lessons)?.substring(0, 500));
      console.log('=== END RAW MODULE ===');
      
      const rawAssessments = await storage.getTrainingAssessments(req.params.id);
      
      // Transform assessments to frontend format with numeric correctAnswer
      const assessments = rawAssessments.map(a => {
        // Convert letter answer (A, B, C, D) to numeric index (0, 1, 2, 3)
        let correctAnswerIndex = 0;
        if (typeof a.correctAnswer === 'string') {
          const letterMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
          correctAnswerIndex = letterMap[a.correctAnswer.toUpperCase()] ?? 0;
        } else if (typeof a.correctAnswer === 'number') {
          correctAnswerIndex = a.correctAnswer;
        }
        
        return {
          id: a.id,
          moduleId: a.moduleId,
          question: a.questionText,
          options: Array.isArray(a.options) ? a.options : [],
          correctAnswer: correctAnswerIndex,
          explanation: a.explanation,
        };
      });
      
      // If module lacks lesson content but has a linked manual, try to get from manual analysis
      let lessonSummary: string | null = module.lessonSummary || null;
      let studyQuestions = module.studyQuestions as any[] || [];
      
      if ((!lessonSummary || lessonSummary.trim() === '') && module.manualId) {
        const manualAnalysis = await storage.getManualAnalysis(module.manualId);
        if (manualAnalysis && manualAnalysis.summary) {
          lessonSummary = manualAnalysis.summary;
          if (manualAnalysis.studyQuestions && Array.isArray(manualAnalysis.studyQuestions)) {
            studyQuestions = manualAnalysis.studyQuestions;
          }
        }
      }
      
      // Fallback: use description as lesson if no lesson content found
      if (!lessonSummary || lessonSummary.trim() === '') {
        lessonSummary = module.description || 'This training module will help you learn important concepts for your ministry role.';
      }
      
      // Normalize lessons to always be an array (backend normalization)
      let normalizedLessons: any[] = [];
      if (module.lessons) {
        if (typeof module.lessons === 'string') {
          try {
            const parsed = JSON.parse(module.lessons);
            normalizedLessons = Array.isArray(parsed) ? parsed : [];
          } catch {
            normalizedLessons = [];
          }
        } else if (Array.isArray(module.lessons)) {
          normalizedLessons = module.lessons;
        }
      }
      
      // DIAGNOSTIC LOGGING - TEMPORARY
      console.log('=== TRAINING MODULE API RESPONSE ===');
      console.log('module.id:', module.id);
      console.log('typeof module.lessons:', typeof module.lessons);
      console.log('Array.isArray(module.lessons):', Array.isArray(module.lessons));
      if (typeof module.lessons === 'string') {
        console.log('module.lessons (first 300 chars):', module.lessons.substring(0, 300));
      } else {
        console.log('module.lessons:', JSON.stringify(module.lessons).substring(0, 500));
      }
      console.log('normalizedLessons.length:', normalizedLessons.length);
      console.log('=== END DIAGNOSTIC ===');
      
      // TEMPORARY: Return simplified response for diagnosis
      res.json({ 
        id: module.id,
        title: module.title,
        lessons: normalizedLessons
      });
    } catch (error) {
      console.error("Error fetching training module:", error);
      return handleApiError(error, res);
    }
  });

  // Create new training module (leadership only)
  app.post('/api/training/modules', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const leaderRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      if (!user || !leaderRoles.includes(user.role || '')) {
        return res.status(403).json({ message: "Not authorized to create training modules" });
      }

      const schema = z.object({
        title: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        ministryId: z.string().nullable().optional(),
        manualId: z.string().nullable().optional(),
        videoUrl: z.string().nullable().optional(),
        estimatedMinutes: z.number().optional().default(30),
        xpReward: z.number().optional().default(100),
        isRequired: z.boolean().optional().default(false),
        isActive: z.boolean().optional().default(true),
        audience: z.enum(['all', 'leader', 'ministry']).optional().default('all'),
      });

      const validated = schema.parse(req.body);
      const training = await storage.createTrainingModule(validated);
      res.json(training);
    } catch (error) {
      console.error("Error creating training module:", error);
      return handleApiError(error, res);
    }
  });

  // Update training module (leadership only)
  app.patch('/api/training/modules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const leaderRoles = ['owner', 'system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      if (!user || !leaderRoles.includes(user.role || '')) {
        return res.status(403).json({ message: "Not authorized to update training modules" });
      }

      const { id } = req.params;
      const existing = await storage.getTrainingModule(id);
      if (!existing) {
        return res.status(404).json({ message: "Training module not found" });
      }

      const schema = z.object({
        title: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        ministryId: z.string().nullable().optional(),
        manualId: z.string().nullable().optional(),
        videoUrl: z.string().nullable().optional(),
        estimatedMinutes: z.number().optional(),
        xpReward: z.number().optional(),
        passingScore: z.number().optional(),
        sortOrder: z.number().optional(),
        pathStep: z.string().nullable().optional(),
        isRequired: z.boolean().optional(),
        isActive: z.boolean().optional(),
        isPublished: z.boolean().optional(),
        audience: z.enum(['all', 'leader', 'ministry']).optional(),
      });

      const validated = schema.parse(req.body);
      console.log("Updating training module:", id, "with data:", JSON.stringify(validated));
      const training = await storage.updateTrainingModule(id, validated);
      console.log("Training module updated successfully:", training.id);
      res.json(training);
    } catch (error: any) {
      console.error("Error updating training module:", error?.message || error);
      console.error("Error stack:", error?.stack);
      console.error("Request body was:", JSON.stringify(req.body));
      return handleApiError(error, res);
    }
  });

  // Delete training module completely (admin only)
  app.delete('/api/training/modules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const adminRoles = ['system-admin', 'admin', 'lead-pastor'];
      if (!user || !adminRoles.includes(user.role || '')) {
        return res.status(403).json({ message: "Not authorized to delete training modules - admin access required" });
      }

      const { id } = req.params;
      const existing = await storage.getTrainingModule(id);
      if (!existing) {
        return res.status(404).json({ message: "Training module not found" });
      }

      await storage.deleteTrainingModule(id);
      res.json({ success: true, message: "Training module deleted successfully" });
    } catch (error) {
      console.error("Error deleting training module:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/training/assessments/:moduleId', isAuthenticated, async (req: any, res) => {
    try {
      const assessments = await storage.getTrainingAssessments(req.params.moduleId);
      // Transform to frontend format with proper letter-to-index conversion
      const formatted = assessments.map(a => {
        // Convert letter answer (A, B, C, D) to numeric index (0, 1, 2, 3)
        let correctAnswerIndex = 0;
        if (typeof a.correctAnswer === 'string') {
          const letterMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
          correctAnswerIndex = letterMap[a.correctAnswer.toUpperCase()] ?? 0;
        } else if (typeof a.correctAnswer === 'number') {
          correctAnswerIndex = a.correctAnswer;
        }
        
        return {
          id: a.id,
          moduleId: a.moduleId,
          question: a.questionText,
          options: Array.isArray(a.options) ? a.options : [],
          correctAnswer: correctAnswerIndex,
          explanation: a.explanation,
        };
      });
      res.json(formatted);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      return handleApiError(error, res);
    }
  });

  // Create new assessment question (leadership only)
  app.post('/api/training/assessments', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const leaderRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      if (!user || !leaderRoles.includes(user.role || '')) {
        return res.status(403).json({ message: "Not authorized to create assessments" });
      }

      const schema = z.object({
        moduleId: z.string(),
        questionText: z.string().min(1),
        options: z.array(z.string()).min(2).max(6),
        correctAnswer: z.string(), // 'A', 'B', 'C', 'D'
        explanation: z.string().optional(),
        sortOrder: z.number().optional(),
      });

      const validated = schema.parse(req.body);
      const assessment = await storage.createTrainingAssessment(validated);
      res.json(assessment);
    } catch (error) {
      console.error("Error creating assessment:", error);
      return handleApiError(error, res);
    }
  });

  // Update assessment question (leadership only)
  app.patch('/api/training/assessments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const leaderRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      if (!user || !leaderRoles.includes(user.role || '')) {
        return res.status(403).json({ message: "Not authorized to update assessments" });
      }

      const schema = z.object({
        questionText: z.string().min(1).optional(),
        options: z.array(z.string()).min(2).max(6).optional(),
        correctAnswer: z.string().optional(), // 'A', 'B', 'C', 'D'
        explanation: z.string().optional(),
        sortOrder: z.number().optional(),
      });

      const validated = schema.parse(req.body);
      const assessment = await storage.updateTrainingAssessment(req.params.id, validated);
      res.json(assessment);
    } catch (error) {
      console.error("Error updating assessment:", error);
      return handleApiError(error, res);
    }
  });

  // Delete assessment question (leadership only)
  app.delete('/api/training/assessments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const leaderRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      if (!user || !leaderRoles.includes(user.role || '')) {
        return res.status(403).json({ message: "Not authorized to delete assessments" });
      }

      await storage.deleteTrainingAssessment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting assessment:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/training/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getUserTrainingProgress(userId);
      const modules = await storage.getTrainingModules();
      
      const progressWithModules = progress.map(p => ({
        ...p,
        module: modules.find(m => m.id === p.moduleId),
      }));
      
      res.json(progressWithModules);
    } catch (error) {
      console.error("Error fetching training progress:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/training/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Use canonical TRAINING_STATUS from schema for validation
      // Leader-only statuses that members can NEVER set directly
      const LEADER_ONLY_STATUSES: TrainingStatus[] = ['approved', 'rejected'];
      
      // Terminal statuses that require leader approval (when requiresApproval=true)
      const TERMINAL_STATUSES: TrainingStatus[] = ['completed'];
      
      const progressSchema = z.object({
        moduleId: z.string(),
        status: z.string().optional().transform(s => s?.toLowerCase().trim() as TrainingStatus | undefined),
        progressPercent: z.number().optional(),
        currentSection: z.number().optional(),
        assessmentScore: z.number().optional(),
      });

      const validated = progressSchema.parse(req.body);
      const normalizedStatus = validated.status;
      
      // *** TRAINING HARDENING: Server-side enforcement of approval workflow ***
      
      // Validate status against canonical TRAINING_STATUS enum
      if (normalizedStatus) {
        if (!(TRAINING_STATUS as readonly string[]).includes(normalizedStatus)) {
          console.log(`[Training Hardening] Blocked invalid status '${normalizedStatus}' - not in canonical enum`);
          return res.status(400).json({ message: `Invalid status: ${normalizedStatus}. Valid statuses: ${TRAINING_STATUS.join(', ')}` });
        }
      }
      
      // Reject leader-only statuses from regular users
      if (normalizedStatus && LEADER_ONLY_STATUSES.includes(normalizedStatus as TrainingStatus)) {
        console.log(`[Training Hardening] Blocked attempt to set status to '${normalizedStatus}' - leader-only status`);
        return res.status(403).json({ 
          message: "Only leaders can set this status. Please complete the training and await approval." 
        });
      }
      
      const trainingModule = await storage.getTrainingModule(validated.moduleId);
      let finalStatus = normalizedStatus;
      let submittedAt: Date | undefined;
      
      // *** DEEP TRAINING GUARD: Reject submissions if lessons/checks not completed ***
      if (trainingModule?.isDeepTraining && normalizedStatus && 
          ['completed', 'submitted'].includes(normalizedStatus)) {
        // Parse lessons to get count
        let lessonCount = 0;
        if (trainingModule.lessons) {
          try {
            const parsedLessons = typeof trainingModule.lessons === 'string' 
              ? JSON.parse(trainingModule.lessons) 
              : trainingModule.lessons;
            lessonCount = Array.isArray(parsedLessons) ? parsedLessons.length : 0;
          } catch {
            lessonCount = 0;
          }
        }
        
        // For deep trainings, require 100% progress (all lessons completed)
        // The client tracks this, but we enforce it server-side
        if (lessonCount > 0 && validated.progressPercent !== undefined && validated.progressPercent < 100) {
          console.log(`[Training Hardening] Blocked deep training submission - progress ${validated.progressPercent}% < 100%`);
          return res.status(400).json({ 
            message: "Please complete all lessons before submitting for review." 
          });
        }
        
        // If this deep training has a knowledge check, require assessment score
        const hasKnowledgeCheck = trainingModule.knowledgeCheckQuestions && 
          Array.isArray(trainingModule.knowledgeCheckQuestions) && 
          trainingModule.knowledgeCheckQuestions.length > 0;
        
        if (hasKnowledgeCheck && validated.assessmentScore === undefined) {
          console.log(`[Training Hardening] Blocked deep training submission - knowledge check not completed`);
          return res.status(400).json({ 
            message: "Please complete the knowledge check before submitting for review." 
          });
        }
      }
      
      // If training requires approval and client is trying to set any terminal status, 
      // change to 'submitted' instead - only leaders can approve
      if (normalizedStatus && TERMINAL_STATUSES.includes(normalizedStatus as TrainingStatus) && trainingModule?.requiresApproval) {
        console.log(`[Training Hardening] Training ${validated.moduleId} requires approval. Changing status from '${normalizedStatus}' to 'submitted'.`);
        finalStatus = 'submitted';
        submittedAt = new Date();
      }
      
      const progressData: any = {
        userId,
        moduleId: validated.moduleId,
        status: finalStatus,
        progressPercent: validated.progressPercent,
        currentSection: validated.currentSection,
        assessmentScore: validated.assessmentScore,
      };
      
      if (submittedAt) {
        progressData.submittedAt = submittedAt;
      }
      
      const progress = await storage.upsertUserTrainingProgress(progressData);

      // *** NOTIFICATION: Notify ministry leaders when training is submitted for approval ***
      if (finalStatus === 'submitted' && trainingModule) {
        try {
          const submitter = await storage.getUser(userId);
          const submitterName = submitter?.firstName && submitter?.lastName 
            ? `${submitter.firstName} ${submitter.lastName}`
            : submitter?.email || 'A team member';
          
          // Get ministry leaders for this training's ministry
          let ministryName = 'your ministry';
          let notifiedCount = 0;
          
          if (trainingModule.ministryId) {
            const ministry = await storage.getMinistry(trainingModule.ministryId);
            ministryName = ministry?.name || 'your ministry';
            const leaderAssignments = await storage.getMinistryLeaders(trainingModule.ministryId);
            
            for (const assignment of leaderAssignments) {
              const leaderUser = await storage.getUser(assignment.userId);
              if (!leaderUser) continue;
              
              // Create in-app notification
              await storage.createNotification({
                userId: assignment.userId,
                type: 'training_submitted',
                title: 'Training Submitted for Review',
                message: `${submitterName} has completed "${trainingModule.title}" and is awaiting your approval.`,
                link: `/leadership/training-management`,
                isRead: false,
              });
              notifiedCount++;
              
              // Send email notification
              if (leaderUser.email) {
                sendLeaderNotificationEmail({
                  type: 'TRAINING_SUBMITTED',
                  leaderName: leaderUser.firstName || 'Leader',
                  leaderEmail: leaderUser.email,
                  memberName: submitterName,
                  ministryName,
                  trainingTitle: trainingModule.title,
                  link: `${process.env.REPLIT_DEV_DOMAIN || 'https://ministrypath.replit.app'}/leadership/training-management`,
                }).catch(err => console.error('[Notification] Failed to send training email:', err));
              }
            }
          } else {
            // General training - notify ministry leaders who have approved training capability
            // Skip general notification for now - will handle via pending approvals page
            console.log(`[Notification] General training "${trainingModule.title}" submitted - leaders can see in pending approvals`);
          }

          // Self-notification for admins/pastors: they should see their own submission in the approval queue
          // This allows admins to approve their own training (with audit trail)
          if (submitter && (submitter.role === 'admin' || submitter.role === 'pastor' || submitter.role === 'owner')) {
            await storage.createNotification({
              userId: userId,
              type: 'training_self_submitted',
              title: 'Your Training Submitted for Review',
              message: `Your "${trainingModule.title}" submission is awaiting approval. As a leader, you can view pending approvals.`,
              link: `/leadership/trainings`,
              isRead: false,
            });
            console.log(`[Notification] Self-notification sent to admin/pastor ${submitterName} for their own training submission`);
          }
          
          console.log(`[Notification] Notified ${notifiedCount} leader(s) about training submission from ${submitterName}`);
        } catch (notifError) {
          console.error('[Notification] Error sending training submission notifications:', notifError);
          // Don't fail the request if notifications fail
        }
      }

      // Only advance ministry path and award XP when TRULY completed (not requiring approval)
      // OR when status is 'completed' (non-approval training)
      if (finalStatus === 'completed') {
        
        // Award XP for training completion
        if (trainingModule && trainingModule.xpReward && trainingModule.xpReward > 0) {
          // Check if XP was already awarded for this training
          const existingLogs = await storage.getXpLogs(userId);
          const alreadyAwarded = existingLogs.some(log => 
            log.sourceType === 'training' && log.sourceId === trainingModule.id
          );
          
          if (!alreadyAwarded) {
            await storage.addXpLog({
              userId,
              amount: trainingModule.xpReward,
              sourceType: 'training',
              sourceId: trainingModule.id,
              reason: `Completed training: ${trainingModule.title}`,
            });
            
            // Check for first training badge
            const allProgress = await storage.getUserTrainingProgress(userId);
            const completedTrainings = allProgress.filter(p => p.status === 'completed').length;
            
            if (completedTrainings === 1) {
              // Award "Learner" badge for first training completion
              const allBadges = await storage.getBadges();
              const learnerBadge = allBadges.find(b => b.slug === 'learner');
              if (learnerBadge) {
                const userBadges = await storage.getUserBadges(userId);
                const hasBadge = userBadges.some(ub => ub.badgeId === learnerBadge.id);
                if (!hasBadge) {
                  await storage.awardBadge({
                    userId,
                    badgeId: learnerBadge.id,
                  });
                }
              }
            }
          }
        }
        
        const validPathSteps = ['learn', 'love', 'lead'] as const;
        
        if (trainingModule?.pathStep && validPathSteps.includes(trainingModule.pathStep as typeof validPathSteps[number])) {
          const pathStep = trainingModule.pathStep as 'learn' | 'love' | 'lead';
          const user = await storage.getUser(userId);
          
          if (user) {
            // Check prerequisites for each path step
            const canAdvance = (() => {
              switch (pathStep) {
                case 'learn':
                  // Must have attended Sunday and Next Night first
                  return user.hasAttendedSunday && user.hasAttendedNextNight && user.learnStatus !== 'complete';
                case 'love':
                  // Must have completed LEARN first
                  return user.learnStatus === 'complete' && user.loveStatus !== 'complete';
                case 'lead':
                  // Must have completed LOVE first
                  return user.loveStatus === 'complete' && user.leadStatus !== 'complete';
                default:
                  return false;
              }
            })();
            
            if (canAdvance) {
              const pathUpdates: Record<string, string> = {};
              
              if (pathStep === 'learn') {
                pathUpdates.learnStatus = 'complete';
              } else if (pathStep === 'love') {
                pathUpdates.loveStatus = 'complete';
              } else if (pathStep === 'lead') {
                pathUpdates.leadStatus = 'complete';
              }
              
              if (Object.keys(pathUpdates).length > 0) {
                await storage.updateUser(userId, {
                  ...pathUpdates,
                  ministryPathLastUpdated: new Date(),
                });
              }
            }
          }
        }
      }

      res.json(progress);
    } catch (error) {
      console.error("Error updating training progress:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PHASE 1: Missing Training Endpoints
  // ==========================================================================

  // Get all training progress (leader-only) - for Training Management dashboard
  app.get('/api/training/progress/all', isAuthenticated, async (req: any, res) => {
    try {
      const requestingUserId = req.user.claims.sub;
      const requestingUser = await storage.getUser(requestingUserId);
      
      // Leaders only
      if (!requestingUser || !isLeader(requestingUser.role)) {
        return res.status(403).json({ message: "Not authorized to view all training progress" });
      }
      
      // Get all users and their training progress
      const allUsers = await storage.getAllUsers();
      const modules = await storage.getTrainingModules();
      
      const progressData = await Promise.all(
        allUsers.map(async (user) => {
          const progress = await storage.getUserTrainingProgress(user.id);
          return {
            userId: user.id,
            userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown',
            userEmail: user.email,
            profileImageUrl: user.profileImageUrl,
            progress: progress.map(p => ({
              ...p,
              module: modules.find(m => m.id === p.moduleId),
            })),
          };
        })
      );
      
      res.json(progressData);
    } catch (error) {
      console.error("Error fetching all training progress:", error);
      return handleApiError(error, res);
    }
  });

  // Get current user's required trainings
  app.get('/api/training/required', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get all training modules
      const allModules = await storage.getTrainingModules();
      const userProgress = await storage.getUserTrainingProgress(userId);
      const userMinistries = [...(user.ledMinistryIds || []), ...(user.servedMinistryIds || [])];
      
      // Filter to required trainings (based on user's ministries)
      const requiredModules = allModules.filter(module => {
        // General required trainings (no specific ministry)
        if (module.isRequired && !module.ministryId) return true;
        // Ministry-specific required trainings
        if (module.isRequired && module.ministryId && userMinistries.includes(module.ministryId)) return true;
        return false;
      });
      
      // Enrich with progress info
      const requiredWithProgress = requiredModules.map(module => ({
        ...module,
        progress: userProgress.find(p => p.moduleId === module.id) || null,
      }));
      
      res.json(requiredWithProgress);
    } catch (error) {
      console.error("Error fetching required trainings:", error);
      return handleApiError(error, res);
    }
  });

  // Get user's invited ministries (from team invites)
  app.get('/api/user-ministries/invited', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.json([]);
      }
      
      // Get all pending invites for this user's email
      const allInvites = await storage.getTeamInvites();
      const myInvites = allInvites.filter(invite => 
        invite.email === user.email && 
        invite.status === 'pending' &&
        (!invite.expiresAt || new Date(invite.expiresAt) > new Date())
      );
      
      // Enrich with ministry details
      const invitedMinistries = await Promise.all(
        myInvites.map(async (invite) => {
          const ministry = invite.ministryId ? await storage.getMinistry(invite.ministryId) : null;
          return {
            inviteId: invite.id,
            ministryId: invite.ministryId,
            ministry: ministry ? {
              id: ministry.id,
              name: ministry.name,
              category: ministry.category,
              description: ministry.description,
            } : null,
            roleType: invite.roleType,
            message: invite.message,
            expiresAt: invite.expiresAt,
          };
        })
      );
      
      res.json(invitedMinistries.filter(m => m.ministry !== null));
    } catch (error) {
      console.error("Error fetching invited ministries:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PHASE 3: TRAINING APPROVAL WORKFLOW
  // ==========================================================================

  // Get training submissions pending approval (scoped to ministries leader oversees)
  // TRAINING HARDENING: Only show submissions for trainings the leader can actually approve
  app.get('/api/training/submissions', isAuthenticated, requireLeader, async (req: any, res) => {
    try {
      const leader = req.authenticatedUser;
      const allModules = await storage.getTrainingModules();
      const allUsers = await storage.getAllUsers();
      const allMinistries = await storage.getMinistries();
      
      // Get all training progress with 'submitted' status
      let submissions: any[] = [];
      
      for (const user of allUsers) {
        const progress = await storage.getUserTrainingProgress(user.id);
        const submittedProgress = progress.filter(p => p.status === 'submitted');
        
        for (const p of submittedProgress) {
          const module = allModules.find(m => m.id === p.moduleId);
          const ministry = module?.ministryId ? allMinistries.find(m => m.id === module.ministryId) : null;
          
          // TRAINING HARDENING: Ministry-scoped approval queue
          // Leaders can ONLY see/approve trainings for ministries they lead
          let canApprove = false;
          
          if (module?.ministryId) {
            // Ministry-specific training: only leaders of THAT ministry see it
            if (leader.ledMinistryIds?.includes(module.ministryId)) {
              canApprove = true;
            }
          } else {
            // General training (no ministry): any leader can see/approve
            if (isLeader(leader.role)) {
              canApprove = true;
            }
          }
          
          // NOTE: Admins/owners don't see all submissions by default
          // They must use admin override on specific trainings if needed
          
          if (canApprove) {
            submissions.push({
              ...p,
              user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profileImageUrl: user.profileImageUrl,
              },
              module: module ? {
                id: module.id,
                title: module.title,
                description: module.description,
                ministryId: module.ministryId,
              } : null,
              ministry: ministry ? {
                id: ministry.id,
                name: ministry.name,
              } : null,
            });
          }
        }
      }
      
      // Sort by submitted date (oldest first)
      submissions.sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateA - dateB;
      });
      
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching training submissions:", error);
      return handleApiError(error, res);
    }
  });

  // Approve a training submission
  // TRAINING HARDENING: Only leaders of the SAME ministry can approve (admin override is separate endpoint)
  app.post('/api/training/progress/:progressId/approve', isAuthenticated, requireLeader, async (req: any, res) => {
    try {
      const leader = req.authenticatedUser;
      const { progressId } = req.params;
      const { adminOverride } = req.body; // Optional admin override flag
      
      // Get the training progress record
      const allProgress = await storage.getAllTrainingProgress();
      const progress = allProgress.find(p => p.id === progressId);
      
      if (!progress) {
        return res.status(404).json({ message: "Training progress not found" });
      }
      
      if (progress.status !== 'submitted') {
        return res.status(400).json({ message: "This training is not pending approval" });
      }
      
      // Get the training module to check ministry association
      const module = await storage.getTrainingModule(progress.moduleId);
      
      // TRAINING HARDENING: Ministry-scoped leader approval
      // Leaders can ONLY approve trainings for ministries they lead
      let canApprove = false;
      let approvalType = 'ministry_leader';
      
      if (module?.ministryId) {
        // Ministry-specific training: only leaders of THAT ministry can approve
        if (leader.ledMinistryIds?.includes(module.ministryId)) {
          canApprove = true;
          approvalType = 'ministry_leader';
        }
      } else {
        // General training (no ministry): any leader can approve
        if (isLeader(leader.role)) {
          canApprove = true;
          approvalType = 'general_leader';
        }
      }
      
      // Admin/Owner override - requires explicit adminOverride flag
      if (!canApprove && adminOverride === true) {
        if (isAdmin(leader.role) || leader.role === 'owner') {
          canApprove = true;
          approvalType = 'admin_override';
          console.log(`[Training Hardening] Admin override used by ${leader.id} for training ${progressId}`);
        }
      }
      
      if (!canApprove) {
        const ministryName = module?.ministryId ? 
          (await storage.getMinistry(module.ministryId))?.name || 'this ministry' : 
          'general trainings';
        console.log(`[Training Hardening] Blocked approval attempt by ${leader.id} for training ${progressId} (ministry: ${module?.ministryId})`);
        return res.status(403).json({ 
          message: `Only ${ministryName} leaders can approve this training. Use admin override if needed.`,
          ministryId: module?.ministryId,
        });
      }
      
      // Update the progress to approved
      await storage.updateTrainingProgress(progressId, {
        status: 'approved',
        approvedBy: leader.id,
        approvedAt: new Date(),
        completedAt: new Date(),
      });
      
      // Award XP to the user
      const xpAmount = module?.xpReward || 100;
      await storage.awardXp(progress.userId, xpAmount, 'training_completed', `Completed training: ${module?.title || 'Unknown'}`);
      
      // Check for first training badge (Learner)
      const allUserProgress = await storage.getUserTrainingProgress(progress.userId);
      const completedCount = allUserProgress.filter(p => 
        p.status === 'completed' || p.status === 'approved'
      ).length;
      
      if (completedCount === 1) {
        const allBadges = await storage.getBadges();
        const learnerBadge = allBadges.find(b => b.slug === 'learner');
        if (learnerBadge) {
          const userBadges = await storage.getUserBadges(progress.userId);
          const hasBadge = userBadges.some(ub => ub.badgeId === learnerBadge.id);
          if (!hasBadge) {
            await storage.awardBadge({ userId: progress.userId, badgeId: learnerBadge.id });
          }
        }
      }
      
      // Advance ministry path if this training is path-related
      const validPathSteps = ['learn', 'love', 'lead'] as const;
      if (module?.pathStep && validPathSteps.includes(module.pathStep as typeof validPathSteps[number])) {
        const pathStep = module.pathStep as 'learn' | 'love' | 'lead';
        const user = await storage.getUser(progress.userId);
        
        if (user) {
          const canAdvance = (() => {
            switch (pathStep) {
              case 'learn':
                return user.hasAttendedSunday && user.hasAttendedNextNight && user.learnStatus !== 'complete';
              case 'love':
                return user.learnStatus === 'complete' && user.loveStatus !== 'complete';
              case 'lead':
                return user.loveStatus === 'complete' && user.leadStatus !== 'complete';
              default:
                return false;
            }
          })();
          
          if (canAdvance) {
            const pathUpdates: Record<string, string> = {};
            if (pathStep === 'learn') pathUpdates.learnStatus = 'complete';
            else if (pathStep === 'love') pathUpdates.loveStatus = 'complete';
            else if (pathStep === 'lead') pathUpdates.leadStatus = 'complete';
            
            if (Object.keys(pathUpdates).length > 0) {
              await storage.updateUser(progress.userId, {
                ...pathUpdates,
                ministryPathLastUpdated: new Date(),
              });
            }
          }
        }
      }
      
      // Create audit log entry for training approval
      await storage.createAuditLog({
        entityType: 'training_progress',
        entityId: progressId,
        action: approvalType === 'admin_override' ? 'admin_override_approve' : 'approve',
        previousValue: { status: 'submitted' },
        newValue: { status: 'approved', approvedBy: leader.id },
        reason: approvalType === 'admin_override' ? 'Milestone affirmed via admin override' : null,
        performedBy: leader.id,
      });

      // Notify the user their training was approved
      const submitter = await storage.getUser(progress.userId);
      if (submitter) {
        await storage.createNotification({
          userId: progress.userId,
          type: 'training_approved',
          title: 'Milestone Reached!',
          message: `Your "${module?.title || 'training'}" has been affirmed! You've taken a meaningful step forward on your path.`,
          link: '/trainings',
          isRead: false,
        });
      }
      
      // Log the approval
      console.log(`[Training Approval] Leader ${leader.id} (${approvalType}) approved training ${progressId} for user ${progress.userId}`);
      
      res.json({ 
        message: "Training affirmed successfully",
        milestoneReached: true,
        approvalType,
      });
    } catch (error) {
      console.error("Error approving training:", error);
      return handleApiError(error, res);
    }
  });

  // Reject a training submission
  // TRAINING HARDENING: Only leaders of the SAME ministry can reject (admin override is separate)
  app.post('/api/training/progress/:progressId/reject', isAuthenticated, requireLeader, async (req: any, res) => {
    try {
      const leader = req.authenticatedUser;
      const { progressId } = req.params;
      const { feedback, adminOverride } = req.body;
      
      if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
        return res.status(400).json({ message: "Feedback is required when rejecting a training" });
      }
      
      // Get the training progress record
      const allProgress = await storage.getAllTrainingProgress();
      const progress = allProgress.find(p => p.id === progressId);
      
      if (!progress) {
        return res.status(404).json({ message: "Training progress not found" });
      }
      
      if (progress.status !== 'submitted') {
        return res.status(400).json({ message: "This training is not pending approval" });
      }
      
      // Get the training module to check ministry association
      const module = await storage.getTrainingModule(progress.moduleId);
      
      // TRAINING HARDENING: Ministry-scoped leader rejection
      // Leaders can ONLY reject trainings for ministries they lead
      let canReject = false;
      
      if (module?.ministryId) {
        // Ministry-specific training: only leaders of THAT ministry can reject
        if (leader.ledMinistryIds?.includes(module.ministryId)) {
          canReject = true;
        }
      } else {
        // General training (no ministry): any leader can reject
        if (isLeader(leader.role)) {
          canReject = true;
        }
      }
      
      // Admin/Owner override - requires explicit adminOverride flag
      if (!canReject && adminOverride === true) {
        if (isAdmin(leader.role) || leader.role === 'owner') {
          canReject = true;
          console.log(`[Training Hardening] Admin override used for rejection by ${leader.id} for training ${progressId}`);
        }
      }
      
      if (!canReject) {
        const ministryName = module?.ministryId ? 
          (await storage.getMinistry(module.ministryId))?.name || 'this ministry' : 
          'general trainings';
        console.log(`[Training Hardening] Blocked rejection attempt by ${leader.id} for training ${progressId} (ministry: ${module?.ministryId})`);
        return res.status(403).json({ 
          message: `Only ${ministryName} leaders can reject this training. Use admin override if needed.`,
          ministryId: module?.ministryId,
        });
      }
      
      // Update the progress to rejected
      await storage.updateTrainingProgress(progressId, {
        status: 'rejected',
        rejectedBy: leader.id,
        rejectedAt: new Date(),
        rejectionFeedback: feedback.trim(),
      });
      
      // Create audit log entry for training rejection
      const rejectApprovalType = adminOverride === true && (isAdmin(leader.role) || leader.role === 'owner') 
        ? 'admin_override' : 'ministry_leader';
      await storage.createAuditLog({
        entityType: 'training_progress',
        entityId: progressId,
        action: rejectApprovalType === 'admin_override' ? 'admin_override_reject' : 'decline',
        previousValue: { status: 'submitted' },
        newValue: { status: 'rejected', rejectedBy: leader.id, feedback: feedback.trim() },
        reason: feedback.trim(),
        performedBy: leader.id,
      });

      // Notify the user their training was rejected with feedback
      await storage.createNotification({
        userId: progress.userId,
        type: 'training_rejected',
        title: 'Training Needs Follow-up',
        message: `Your "${module?.title || 'training'}" submission needs some follow-up. Check the feedback and resubmit.`,
        link: `/trainings/${progress.moduleId}`,
        isRead: false,
      });
      
      // Log the rejection
      console.log(`[Training Rejection] Leader ${leader.id} (${rejectApprovalType}) rejected training ${progressId} for user ${progress.userId}`);
      
      res.json({ message: "Training rejected. User has been notified and can resubmit." });
    } catch (error) {
      console.error("Error rejecting training:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PATH PROGRESS ROUTES (Milestones - replaces gamification)
  // ==========================================================================

  app.get('/api/gamification/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Fetch data for milestone derivation
      const [badges, trainingProgress, roleAssignments] = await Promise.all([
        storage.getUserBadges(userId),
        storage.getUserTrainingProgress(userId),
        storage.getUserRoleAssignments(userId),
      ]);

      // Derive milestones from existing system states (no new table needed)
      const milestones = [];
      
      // Milestone 1: Onboarding Started
      if (user?.onboardingState && user.onboardingState !== 'not_started') {
        milestones.push({
          id: 'onboarding_started',
          name: 'Onboarding Started',
          description: 'Began your journey with us',
          reached: true,
          reachedAt: user.createdAt,
        });
      }
      
      // Milestone 2: Profile Completed
      if (user?.profileCompletedAt) {
        milestones.push({
          id: 'profile_completed',
          name: 'Profile Completed',
          description: 'Shared who you are with the community',
          reached: true,
          reachedAt: user.onboardingCompletedAt || user.updatedAt,
        });
      }
      
      // Milestone 3: Team Joined
      const activeRoles = roleAssignments.filter(r => r.isActive);
      if (activeRoles.length > 0) {
        milestones.push({
          id: 'team_joined',
          name: 'Team Joined',
          description: 'Connected with a ministry team',
          reached: true,
          teamsCount: activeRoles.length,
        });
      }
      
      // Milestone 4: Training Submitted
      const submittedTrainings = trainingProgress.filter(t => 
        t.status === 'submitted' || t.status === 'approved' || t.status === 'completed'
      );
      if (submittedTrainings.length > 0) {
        milestones.push({
          id: 'training_submitted',
          name: 'Training Submitted',
          description: 'Completed and submitted training for review',
          reached: true,
          count: submittedTrainings.length,
        });
      }
      
      // Milestone 5: Training Affirmed by Leader
      const affirmedTrainings = trainingProgress.filter(t => t.status === 'approved');
      if (affirmedTrainings.length > 0) {
        milestones.push({
          id: 'training_affirmed',
          name: 'Training Affirmed',
          description: 'Your training was affirmed by a leader',
          reached: true,
          count: affirmedTrainings.length,
        });
      }
      
      // Milestone 6: Ready to Serve (derived when required trainings are affirmed)
      const completedTrainings = trainingProgress.filter(t => 
        t.status === 'approved' || t.status === 'completed'
      );
      if (completedTrainings.length >= 1 && activeRoles.length > 0) {
        milestones.push({
          id: 'ready_to_serve',
          name: 'Ready to Serve',
          description: 'Prepared to make a difference in your ministry',
          reached: true,
        });
      }

      // Calculate overall path progress
      const totalPossibleMilestones = 6;
      const reachedMilestones = milestones.filter(m => m.reached).length;
      const pathProgress = Math.round((reachedMilestones / totalPossibleMilestones) * 100);

      // Determine next milestone
      const allPossibleMilestones = [
        { id: 'onboarding_started', name: 'Begin Onboarding', order: 1 },
        { id: 'profile_completed', name: 'Complete Profile', order: 2 },
        { id: 'team_joined', name: 'Join a Team', order: 3 },
        { id: 'training_submitted', name: 'Submit Training', order: 4 },
        { id: 'training_affirmed', name: 'Training Affirmed', order: 5 },
        { id: 'ready_to_serve', name: 'Ready to Serve', order: 6 },
      ];
      
      const reachedIds = new Set(milestones.map(m => m.id));
      const nextMilestone = allPossibleMilestones.find(m => !reachedIds.has(m.id));

      res.json({
        milestones,
        milestonesReached: reachedMilestones,
        totalMilestones: totalPossibleMilestones,
        pathProgress,
        nextMilestone: nextMilestone || null,
        badges, // Keep badges as "achievements" with pastoral names
        isProgressing: reachedMilestones > 0,
        encouragement: reachedMilestones === 0 
          ? "Your journey begins with a single step. Start your onboarding to take your first step!"
          : reachedMilestones < 3
            ? "You're making progress! Keep taking steps forward on your path."
            : reachedMilestones < 6
              ? "You're moving forward beautifully. Each step brings you closer to being ready to serve."
              : "Amazing! You've reached all the key milestones. You're ready to serve and make a difference.",
      });
    } catch (error) {
      console.error("Error fetching path progress:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/gamification/badges', isAuthenticated, async (req: any, res) => {
    try {
      const badges = await storage.getBadges();
      res.json(badges);
    } catch (error) {
      console.error("Error fetching badges:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // ROOMS & RESOURCES ROUTES
  // ==========================================================================

  app.get('/api/rooms', isAuthenticated, async (req: any, res) => {
    try {
      const rooms = await storage.getRooms();
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/rooms', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['system-admin', 'admin', 'pastor', 'leader'].includes(user.role || '')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const roomSchema = z.object({
        name: z.string().min(1),
        capacity: z.number().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        amenities: z.array(z.string()).optional(),
      });

      const validated = roomSchema.parse(req.body);
      const room = await storage.createRoom(validated);
      res.json(room);
    } catch (error) {
      console.error("Error creating room:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  app.get('/api/resources', isAuthenticated, async (req: any, res) => {
    try {
      const resources = await storage.getResources();
      res.json(resources);
    } catch (error) {
      console.error("Error fetching resources:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/resources', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['system-admin', 'admin', 'pastor', 'leader'].includes(user.role || '')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const resourceSchema = z.object({
        name: z.string().min(1),
        category: z.string().optional(),
        description: z.string().optional(),
        quantity: z.number().optional(),
        location: z.string().optional(),
        isConsumable: z.boolean().optional(),
      });

      const validated = resourceSchema.parse(req.body);
      const resource = await storage.createResource(validated);
      res.json(resource);
    } catch (error) {
      console.error("Error creating resource:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  app.get('/api/room-reservations', isAuthenticated, async (req: any, res) => {
    try {
      const { start, end } = req.query;
      const startDate = start ? new Date(start as string) : new Date();
      const endDate = end ? new Date(end as string) : undefined;
      const reservations = await storage.getRoomReservations(startDate, endDate);
      res.json(reservations);
    } catch (error) {
      console.error("Error fetching room reservations:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/room-reservations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reservationSchema = z.object({
        roomId: z.string(),
        title: z.string().min(1),
        startTime: z.string().transform(s => new Date(s)),
        endTime: z.string().transform(s => new Date(s)),
        eventId: z.string().optional(),
        setupTime: z.number().optional(),
        teardownTime: z.number().optional(),
        attendeeCount: z.number().optional(),
        notes: z.string().optional(),
      });

      const validated = reservationSchema.parse(req.body);
      
      // *** CONFLICT DETECTION ***
      // Use dedicated overlap query: (existingStart < newEnd AND existingEnd > newStart)
      const overlappingReservations = await storage.getRoomReservationsForConflictCheck(
        validated.roomId,
        validated.startTime,
        validated.endTime
      );
      
      // Filter out cancelled/declined reservations
      const conflicts = overlappingReservations.filter(r => 
        r.status !== 'cancelled' && r.status !== 'declined'
      );
      
      if (conflicts.length > 0) {
        const conflictDetails = conflicts.map(c => ({
          id: c.id,
          title: c.title,
          startTime: new Date(c.startTime).toISOString(),
          endTime: new Date(c.endTime).toISOString(),
          status: c.status,
        }));
        
        return res.status(409).json({ 
          message: "This room is already reserved during the requested time",
          conflicts: conflictDetails,
        });
      }
      
      const reservation = await storage.createRoomReservation({
        ...validated,
        requestedBy: userId,
      });
      res.json(reservation);
    } catch (error) {
      console.error("Error creating room reservation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PHASE 6: UNIFIED CALENDAR & ROOM APPROVAL
  // ==========================================================================

  // Unified calendar view - combines meetings, events, and room reservations
  app.get('/api/calendar/unified', isAuthenticated, async (req: any, res) => {
    try {
      const { start, end, ministryId } = req.query;
      const startDate = start ? new Date(start as string) : new Date();
      const endDate = end ? new Date(end as string) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      // Fetch all calendar data in parallel
      const [meetings, events, reservations, rooms, calendarCategoriesList] = await Promise.all([
        storage.getMeetings(startDate),
        storage.getCalendarEvents(startDate, endDate),
        storage.getRoomReservations(startDate, endDate),
        storage.getRooms(),
        storage.getCalendarCategories(true),
      ]);
      
      // Helper to resolve category to canonical slug
      const resolveCategorySlug = (categoryName: string | null | undefined): string | null => {
        if (!categoryName) return null;
        const lowerName = categoryName.toLowerCase();
        const slugifiedName = slugify(categoryName);
        const match = calendarCategoriesList.find(c => 
          c.name.toLowerCase() === lowerName || 
          c.slug?.toLowerCase() === lowerName ||
          c.slug === slugifiedName ||
          c.outlookCategoryName?.toLowerCase() === lowerName
        );
        return match?.slug || slugifiedName;
      };
      
      // Filter and transform meetings (use "team-meeting" category for meetings)
      const meetingItems = meetings
        .filter(m => new Date(m.scheduledDate) <= endDate)
        .filter(m => !ministryId || m.ministryId === ministryId)
        .map(m => ({
          id: m.id,
          type: 'meeting' as const,
          title: m.title,
          description: m.description,
          startTime: m.scheduledDate,
          endTime: new Date(new Date(m.scheduledDate).getTime() + (m.duration || 60) * 60 * 1000),
          location: m.location,
          roomId: m.roomId,
          room: rooms.find(r => r.id === m.roomId),
          ministryId: m.ministryId,
          isVirtual: m.isVirtual,
          virtualLink: m.virtualLink,
          status: m.status,
          category: 'Team Meeting',
          categorySlug: 'team-meeting',
        }));
      
      // Transform events
      const eventItems = events
        .filter(e => !ministryId || e.ministryId === ministryId)
        .map(e => ({
          id: e.id,
          type: 'event' as const,
          title: e.title,
          description: e.description,
          startTime: e.startTime,
          endTime: e.endTime,
          location: e.location,
          category: e.category,
          categorySlug: resolveCategorySlug(e.category),
          ministryId: e.ministryId,
          isRecurring: e.isRecurring,
        }));
      
      // Transform room reservations
      const reservationItems = reservations.map(r => ({
        id: r.id,
        type: 'reservation' as const,
        title: r.title,
        startTime: r.startTime,
        endTime: r.endTime,
        roomId: r.roomId,
        room: rooms.find(room => room.id === r.roomId),
        status: r.status,
        notes: r.notes,
        category: null,
        categorySlug: null,
      }));
      
      // Combine and sort by start time
      const allItems = [...meetingItems, ...eventItems, ...reservationItems]
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      
      res.json({
        items: allItems,
        range: { start: startDate, end: endDate },
      });
    } catch (error) {
      console.error("Error fetching unified calendar:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // CALENDAR CATEGORIES CRUD (Admin/Leader Management)
  // ==========================================================================

  // Get all calendar categories (public for filters)
  app.get('/api/categories', isAuthenticated, async (req: any, res) => {
    try {
      const activeOnly = req.query.activeOnly !== 'false';
      const categories = await storage.getCalendarCategories(activeOnly);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      return handleApiError(error, res);
    }
  });

  // Get single category
  app.get('/api/categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const category = await storage.getCalendarCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      return handleApiError(error, res);
    }
  });

  // Create category (admin only)
  app.post('/api/categories', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const categorySchema = z.object({
        name: z.string().min(1),
        slug: z.string().min(1).optional(),
        type: z.enum(['MINISTRY', 'SERVICE', 'GROUP', 'TAG']).default('TAG'),
        color: z.string().optional(),
        isActive: z.boolean().default(true),
        sortOrder: z.number().default(0),
        outlookCategoryName: z.string().nullable().optional(),
      });
      
      const validated = categorySchema.parse(req.body);
      
      // Auto-generate slug if not provided
      const slug = validated.slug || slugify(validated.name);
      
      // Check for duplicate slug
      const existing = await storage.getCalendarCategories(false);
      if (existing.some(c => c.slug === slug)) {
        return res.status(400).json({ message: "A category with this slug already exists" });
      }
      
      const category = await storage.createCalendarCategory({
        ...validated,
        slug,
      });
      
      console.log(`[Category] Created: ${category.name} (${category.slug})`);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Update category (admin only)
  app.patch('/api/categories/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getCalendarCategory(id);
      if (!existing) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        type: z.enum(['MINISTRY', 'SERVICE', 'GROUP', 'TAG']).optional(),
        color: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
        outlookCategoryName: z.string().nullable().optional(),
      });
      
      const validated = updateSchema.parse(req.body);
      
      // If changing slug, check for duplicates
      if (validated.slug && validated.slug !== existing.slug) {
        const allCategories = await storage.getCalendarCategories(false);
        if (allCategories.some(c => c.slug === validated.slug && c.id !== id)) {
          return res.status(400).json({ message: "A category with this slug already exists" });
        }
      }
      
      const updated = await storage.updateCalendarCategory(id, validated);
      console.log(`[Category] Updated: ${updated.name} (${updated.slug})`);
      res.json(updated);
    } catch (error) {
      console.error("Error updating category:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Soft-delete category (set isActive=false) - admin only
  app.delete('/api/categories/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getCalendarCategory(id);
      if (!existing) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Soft delete by setting isActive to false
      const updated = await storage.updateCalendarCategory(id, { isActive: false });
      console.log(`[Category] Deactivated: ${updated.name} (${updated.slug})`);
      res.json({ message: "Category deactivated", category: updated });
    } catch (error) {
      console.error("Error deactivating category:", error);
      return handleApiError(error, res);
    }
  });

  // Approve room reservation (admin/leader only)
  app.post('/api/room-reservations/:id/approve', isAuthenticated, requireLeader, async (req: any, res) => {
    try {
      const leader = req.authenticatedUser;
      const { id } = req.params;
      
      const reservation = await storage.getRoomReservation(id);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }
      
      if (reservation.status !== 'pending') {
        return res.status(400).json({ message: "This reservation is not pending approval" });
      }
      
      // *** CONFLICT DETECTION AT APPROVAL TIME ***
      // Re-check for conflicts to catch race conditions
      const overlappingReservations = await storage.getRoomReservationsForConflictCheck(
        reservation.roomId,
        new Date(reservation.startTime),
        new Date(reservation.endTime)
      );
      
      // Only check approved reservations (excluding current one)
      const conflicts = overlappingReservations.filter(r => 
        r.id !== id && r.status === 'approved'
      );
      
      if (conflicts.length > 0) {
        const conflictDetails = conflicts.map(c => ({
          id: c.id,
          title: c.title,
          startTime: new Date(c.startTime).toISOString(),
          endTime: new Date(c.endTime).toISOString(),
        }));
        
        return res.status(409).json({ 
          message: "Cannot approve - another reservation has already been approved for this time",
          conflicts: conflictDetails,
        });
      }
      
      const updated = await storage.updateRoomReservation(id, {
        status: 'approved',
        approvedBy: leader.id,
        approvedAt: new Date(),
      });
      
      console.log(`[Room Approval] Leader ${leader.id} approved reservation ${id}`);
      res.json(updated);
    } catch (error) {
      console.error("Error approving room reservation:", error);
      return handleApiError(error, res);
    }
  });

  // Decline room reservation (admin/leader only)
  app.post('/api/room-reservations/:id/decline', isAuthenticated, requireLeader, async (req: any, res) => {
    try {
      const leader = req.authenticatedUser;
      const { id } = req.params;
      const { reason } = req.body;
      
      const reservation = await storage.getRoomReservation(id);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }
      
      if (reservation.status !== 'pending') {
        return res.status(400).json({ message: "This reservation is not pending" });
      }
      
      const updated = await storage.updateRoomReservation(id, {
        status: 'declined',
        notes: reason ? `Declined: ${reason}` : reservation.notes,
      });
      
      console.log(`[Room Decline] Leader ${leader.id} declined reservation ${id}`);
      res.json(updated);
    } catch (error) {
      console.error("Error declining room reservation:", error);
      return handleApiError(error, res);
    }
  });

  // Get pending room reservations (for approval queue)
  app.get('/api/room-reservations/pending', isAuthenticated, requireLeader, async (req: any, res) => {
    try {
      const allReservations = await storage.getRoomReservations(new Date(0));
      const pending = allReservations.filter(r => r.status === 'pending');
      
      // Enrich with room info
      const rooms = await storage.getRooms();
      const enriched = pending.map(r => ({
        ...r,
        room: rooms.find(room => room.id === r.roomId),
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching pending reservations:", error);
      return handleApiError(error, res);
    }
  });

  // Outlook integration stub - get OAuth URL
  app.get('/api/integrations/outlook/auth-url', isAuthenticated, async (req: any, res) => {
    // Stub for Outlook integration
    res.json({
      available: false,
      message: "Outlook integration requires Microsoft Azure AD configuration",
      configRequired: ['AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID'],
    });
  });

  // Outlook integration stub - sync events
  app.post('/api/integrations/outlook/sync', isAuthenticated, async (req: any, res) => {
    // Stub for Outlook integration
    res.json({
      available: false,
      message: "Outlook integration not configured. Contact administrator to enable.",
    });
  });

  // ==========================================================================
  // ATTENDANCE & METRICS ROUTES
  // ==========================================================================

  app.get('/api/attendance', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const leaderRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      if (!user || !leaderRoles.includes(user.role || '')) {
        return res.status(403).json({ message: "Leader access required" });
      }

      const { start, end } = req.query;
      const startDate = start ? new Date(start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end ? new Date(end as string) : undefined;
      
      const reports = await storage.getAttendanceReports(startDate, endDate);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching attendance reports:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/attendance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reportSchema = z.object({
        eventDate: z.string().transform(s => new Date(s)),
        eventType: z.string().min(1),
        ministryId: z.string().optional(),
        adultCount: z.number().optional(),
        childCount: z.number().optional(),
        youthCount: z.number().optional(),
        visitorCount: z.number().optional(),
        salvations: z.number().optional(),
        waterBaptisms: z.number().optional(),
        spiritBaptisms: z.number().optional(),
        notes: z.string().optional(),
      });

      const validated = reportSchema.parse(req.body);
      const totalCount = (validated.adultCount || 0) + (validated.childCount || 0) + (validated.youthCount || 0);
      
      const report = await storage.createAttendanceReport({
        ...validated,
        totalCount,
        submittedBy: userId,
      });
      res.json(report);
    } catch (error) {
      console.error("Error creating attendance report:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // WEEKLY MINISTRY METRICS ROUTES
  // ==========================================================================

  // Helper: Get Monday of the current week
  function getWeekStartDate(date: Date = new Date()): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Get current week metrics with ministry list
  app.get('/api/weekly-metrics/current-week', isAuthenticated, requireLeader, async (req: any, res) => {
    try {
      const user = req.authenticatedUser;
      const weekStartDate = getWeekStartDate();
      
      // Get ministries based on user role
      const allMinistries = await storage.getMinistries();
      const activeMinistries = allMinistries.filter(m => m.isActive && !m.isArchived);
      
      // Leaders see only their overseen ministries, admin/pastor see all
      let scopedMinistries = activeMinistries;
      if (!isAdmin(user.role) && !isPastor(user.role)) {
        const ledMinistryIds = user.ledMinistryIds || [];
        scopedMinistries = activeMinistries.filter(m => ledMinistryIds.includes(m.id));
      }
      
      const ministryIds = scopedMinistries.map(m => m.id);
      const metrics = ministryIds.length > 0 
        ? await storage.getWeeklyMetrics(weekStartDate, ministryIds)
        : [];
      
      // Build response with ministry status
      const ministriesWithStatus = scopedMinistries.map(ministry => {
        const metric = metrics.find(m => m.ministryId === ministry.id);
        return {
          ministryId: ministry.id,
          ministryName: ministry.name,
          hasSubmitted: !!metric,
          metric: metric || null,
        };
      });
      
      res.json({
        weekStartDate: weekStartDate.toISOString(),
        ministries: ministriesWithStatus,
      });
    } catch (error) {
      console.error("Error fetching current week metrics:", error);
      return handleApiError(error, res);
    }
  });

  // Get metrics for a date range
  app.get('/api/weekly-metrics/weeks', isAuthenticated, requireLeader, async (req: any, res) => {
    try {
      const user = req.authenticatedUser;
      const { start, end } = req.query;
      
      if (!start || !end) {
        return res.status(400).json({ message: "start and end dates are required" });
      }
      
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);
      
      // Get ministries based on user role
      let ministryIds: string[] | undefined;
      if (!isAdmin(user.role) && !isPastor(user.role)) {
        ministryIds = user.ledMinistryIds || [];
        if (ministryIds.length === 0) {
          return res.json([]);
        }
      }
      
      const metrics = await storage.getWeeklyMetricsByRange(startDate, endDate, ministryIds);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching weekly metrics range:", error);
      return handleApiError(error, res);
    }
  });

  // Submit/update weekly metrics
  app.post('/api/weekly-metrics', isAuthenticated, requireLeader, async (req: any, res) => {
    try {
      const user = req.authenticatedUser;
      
      const metricsSchema = z.object({
        ministryId: z.string().uuid(),
        weekStartDate: z.string().transform(s => new Date(s)),
        attendanceCount: z.number().int().min(0),
        volunteersCount: z.number().int().min(0).optional(),
        firstTimersCount: z.number().int().min(0).optional(),
        altarResponsesCount: z.number().int().min(0).optional(),
        followUpsNeededCount: z.number().int().min(0).optional(),
        winsNotes: z.string().optional(),
        concernsNotes: z.string().optional(),
        nextStepsNotes: z.string().optional(),
      });
      
      const validated = metricsSchema.parse(req.body);
      
      // Verify user can submit for this ministry
      if (!isAdmin(user.role) && !isPastor(user.role)) {
        const ledMinistryIds = user.ledMinistryIds || [];
        if (!ledMinistryIds.includes(validated.ministryId)) {
          return res.status(403).json({ message: "You can only submit metrics for ministries you lead" });
        }
      }
      
      const metric = await storage.upsertWeeklyMetrics({
        ...validated,
        submittedByUserId: user.id,
      });
      
      res.json(metric);
    } catch (error) {
      console.error("Error saving weekly metrics:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Get missing submissions for a week (admin/pastor only)
  app.get('/api/weekly-metrics/missing', isAuthenticated, requireLeader, async (req: any, res) => {
    try {
      const user = req.authenticatedUser;
      
      if (!isAdmin(user.role) && !isPastor(user.role)) {
        return res.status(403).json({ message: "Admin or pastor access required" });
      }
      
      const { weekStartDate } = req.query;
      const week = weekStartDate ? new Date(weekStartDate as string) : getWeekStartDate();
      
      // Get all active ministries
      const allMinistries = await storage.getMinistries();
      const activeMinistries = allMinistries.filter(m => m.isActive && !m.isArchived);
      
      // Get submitted metrics for this week
      const metrics = await storage.getWeeklyMetrics(week);
      const submittedMinistryIds = new Set(metrics.map(m => m.ministryId));
      
      // Find missing
      const missingMinistries = activeMinistries.filter(m => !submittedMinistryIds.has(m.id));
      
      // Get leader info for each missing ministry
      const missingWithLeaders = await Promise.all(missingMinistries.map(async (ministry) => {
        const leaders = await storage.getMinistryLeaders(ministry.id);
        const leaderUsers = await Promise.all(leaders.map(async (l) => {
          const user = await storage.getUser(l.userId);
          return user ? { id: user.id, name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email } : null;
        }));
        return {
          ministryId: ministry.id,
          ministryName: ministry.name,
          leaders: leaderUsers.filter(Boolean),
        };
      }));
      
      res.json({
        weekStartDate: week.toISOString(),
        missingCount: missingWithLeaders.length,
        missing: missingWithLeaders,
      });
    } catch (error) {
      console.error("Error fetching missing metrics:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // SUPPORT REQUESTS ROUTES (Request Center)
  // ==========================================================================

  app.get('/api/requests', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.query;
      const requests = await storage.getSupportRequests(status as string | undefined);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching support requests:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const request = await storage.getSupportRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error fetching support request:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requestSchema = z.object({
        requestType: z.enum(['media-announcement', 'support-volunteers', 'resources-supplies']),
        title: z.string().min(1),
        description: z.string().optional(),
        eventId: z.string().optional(),
        eventDate: z.string().optional().transform(s => s ? new Date(s) : undefined),
        ministryId: z.string().optional(),
        priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
        volunteersNeeded: z.number().optional(),
        resourcesRequested: z.array(z.any()).optional(),
      });

      const validated = requestSchema.parse(req.body);
      const request = await storage.createSupportRequest({
        ...validated,
        requestedBy: userId,
      });
      res.json(request);
    } catch (error) {
      console.error("Error creating support request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  app.patch('/api/requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const leaderRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      if (!user || !leaderRoles.includes(user.role || '')) {
        return res.status(403).json({ message: "Leader access required" });
      }

      const updateSchema = z.object({
        status: z.enum(['new', 'in-review', 'approved', 'in-progress', 'completed', 'declined']).optional(),
        assignedTo: z.string().optional(),
        notes: z.string().optional(),
      });

      const validated = updateSchema.parse(req.body);
      
      // Add approval tracking if status is approved
      const updateData: any = { ...validated };
      if (validated.status === 'approved') {
        updateData.approvedBy = req.user.claims.sub;
        updateData.approvedAt = new Date();
      }
      if (validated.status === 'completed') {
        updateData.completedAt = new Date();
      }

      const request = await storage.updateSupportRequest(req.params.id, updateData);
      res.json(request);
    } catch (error) {
      console.error("Error updating support request:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // INTERN PORTAL ROUTES
  // ==========================================================================

  app.get('/api/interns', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const leaderRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      if (!user || !leaderRoles.includes(user.role || '')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const interns = await storage.getInternProfiles();
      res.json(interns);
    } catch (error) {
      console.error("Error fetching intern profiles:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/interns/my-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getInternProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Intern profile not found" });
      }
      const logs = await storage.getInternLogs(profile.id);
      res.json({ ...profile, logs });
    } catch (error) {
      console.error("Error fetching intern profile:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/interns', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['system-admin', 'admin', 'pastor', 'leader'].includes(user.role || '')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const internSchema = z.object({
        userId: z.string(),
        supervisorId: z.string().optional(),
        startDate: z.string().optional().transform(s => s ? new Date(s) : undefined),
        endDate: z.string().optional().transform(s => s ? new Date(s) : undefined),
        hoursPerWeek: z.number().optional(),
        responsibilities: z.array(z.string()).optional(),
        goals: z.string().optional(),
      });

      const validated = internSchema.parse(req.body);
      const profile = await storage.createInternProfile(validated);
      res.json(profile);
    } catch (error) {
      console.error("Error creating intern profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  app.post('/api/interns/:profileId/logs', isAuthenticated, async (req: any, res) => {
    try {
      const logSchema = z.object({
        date: z.string().transform(s => new Date(s)),
        hoursWorked: z.number().optional(),
        activitiesCompleted: z.string().optional(),
        lessonsLearned: z.string().optional(),
        highlights: z.string().optional(),
      });

      const validated = logSchema.parse(req.body);
      const log = await storage.createInternLog({
        internProfileId: req.params.profileId,
        ...validated,
      });
      res.json(log);
    } catch (error) {
      console.error("Error creating intern log:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // MEETINGS ROUTES
  // ==========================================================================

  app.get('/api/meetings', isAuthenticated, async (req: any, res) => {
    try {
      const { start } = req.query;
      const startDate = start ? new Date(start as string) : undefined;
      const meetings = await storage.getMeetings(startDate);
      res.json(meetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/meetings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const meeting = await storage.getMeeting(req.params.id);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      const notes = await storage.getMeetingNotes(req.params.id);
      res.json({ ...meeting, notes });
    } catch (error) {
      console.error("Error fetching meeting:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/meetings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const meetingSchema = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        ministryId: z.string().optional(),
        scheduledDate: z.string().transform(s => new Date(s)),
        duration: z.number().optional(),
        location: z.string().optional(),
        roomId: z.string().optional(),
        isVirtual: z.boolean().optional(),
        virtualLink: z.string().optional(),
        agenda: z.array(z.any()).optional(),
        participants: z.array(z.string()).optional(),
      });

      const validated = meetingSchema.parse(req.body);
      const meeting = await storage.createMeeting({
        ...validated,
        organizerId: userId,
      });
      res.json(meeting);
    } catch (error) {
      console.error("Error creating meeting:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  app.put('/api/meetings/:id/notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notesSchema = z.object({
        content: z.string().optional(),
        actionItems: z.array(z.any()).optional(),
        decisions: z.array(z.any()).optional(),
        followUps: z.array(z.any()).optional(),
        attendees: z.array(z.string()).optional(),
      });

      const validated = notesSchema.parse(req.body);
      const notes = await storage.upsertMeetingNotes({
        meetingId: req.params.id,
        createdBy: userId,
        ...validated,
      });
      res.json(notes);
    } catch (error) {
      console.error("Error updating meeting notes:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  app.post('/api/meetings/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const feedbackSchema = z.object({
        meetingId: z.string().optional(),
        ministryId: z.string().optional(),
        topic: z.string().optional(),
        content: z.string().min(1),
        isAnonymous: z.boolean().optional(),
      });

      const validated = feedbackSchema.parse(req.body);
      const feedback = await storage.createMeetingFeedback({
        ...validated,
        submittedBy: validated.isAnonymous ? null : userId,
      });
      res.json(feedback);
    } catch (error) {
      console.error("Error creating meeting feedback:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PHASE 5: MEETING ACTION ITEMS & ATTENDANCE
  // ==========================================================================

  // Get action items for a meeting
  app.get('/api/meetings/:id/action-items', isAuthenticated, async (req: any, res) => {
    try {
      const items = await storage.getMeetingActionItems(req.params.id);
      
      // Enrich with assignee info
      const enrichedItems = await Promise.all(items.map(async (item) => {
        let assignee = null;
        if (item.assigneeId) {
          const user = await storage.getUser(item.assigneeId);
          if (user) {
            assignee = {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: user.profileImageUrl,
            };
          }
        }
        return { ...item, assignee };
      }));
      
      res.json(enrichedItems);
    } catch (error) {
      console.error("Error fetching meeting action items:", error);
      return handleApiError(error, res);
    }
  });

  // Create action item for a meeting
  app.post('/api/meetings/:id/action-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const itemSchema = z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        assigneeId: z.string().optional(),
        dueDate: z.string().optional().transform(s => s ? new Date(s) : undefined),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      });

      const validated = itemSchema.parse(req.body);
      const item = await storage.createMeetingActionItem({
        meetingId: req.params.id,
        createdBy: userId,
        ...validated,
      });
      res.json(item);
    } catch (error) {
      console.error("Error creating meeting action item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Update action item
  app.patch('/api/meetings/action-items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { itemId } = req.params;
      const updateSchema = z.object({
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        assigneeId: z.string().optional(),
        dueDate: z.string().optional().transform(s => s ? new Date(s) : undefined),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        status: z.enum(['pending', 'in-progress', 'completed', 'cancelled']).optional(),
      });

      const validated = updateSchema.parse(req.body);
      
      // If marking as completed, set completedAt and completedBy
      if (validated.status === 'completed') {
        (validated as any).completedAt = new Date();
        (validated as any).completedBy = userId;
      }
      
      const item = await storage.updateMeetingActionItem(itemId, validated);
      res.json(item);
    } catch (error) {
      console.error("Error updating meeting action item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Delete action item
  app.delete('/api/meetings/action-items/:itemId', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteMeetingActionItem(req.params.itemId);
      res.json({ message: "Action item deleted" });
    } catch (error) {
      console.error("Error deleting meeting action item:", error);
      return handleApiError(error, res);
    }
  });

  // Get my action items (across all meetings)
  app.get('/api/action-items/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const items = await storage.getActionItemsByAssignee(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching user action items:", error);
      return handleApiError(error, res);
    }
  });

  // Get meeting attendance
  app.get('/api/meetings/:id/attendance', isAuthenticated, async (req: any, res) => {
    try {
      const attendance = await storage.getMeetingAttendance(req.params.id);
      
      // Enrich with user info
      const enrichedAttendance = await Promise.all(attendance.map(async (a) => {
        const user = await storage.getUser(a.userId);
        return {
          ...a,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            profileImageUrl: user.profileImageUrl,
          } : null,
        };
      }));
      
      res.json(enrichedAttendance);
    } catch (error) {
      console.error("Error fetching meeting attendance:", error);
      return handleApiError(error, res);
    }
  });

  // Record attendance for a meeting
  app.post('/api/meetings/:id/attendance', isAuthenticated, async (req: any, res) => {
    try {
      const attendanceSchema = z.object({
        userId: z.string(),
        status: z.enum(['invited', 'confirmed', 'attended', 'absent', 'excused']),
        notes: z.string().optional(),
      });

      const validated = attendanceSchema.parse(req.body);
      const attendance = await storage.upsertMeetingAttendance({
        meetingId: req.params.id,
        ...validated,
      });
      res.json(attendance);
    } catch (error) {
      console.error("Error recording meeting attendance:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Check-in to a meeting (self-attendance)
  app.post('/api/meetings/:id/check-in', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const attendance = await storage.upsertMeetingAttendance({
        meetingId: req.params.id,
        userId,
        status: 'attended',
        checkedInAt: new Date(),
      });
      res.json(attendance);
    } catch (error) {
      console.error("Error checking in to meeting:", error);
      return handleApiError(error, res);
    }
  });

  // Check-out from a meeting
  app.post('/api/meetings/:id/check-out', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [existing] = await Promise.all([
        storage.getMeetingAttendance(req.params.id)
      ]).then(([attendance]) => attendance.filter(a => a.userId === userId));
      
      if (existing) {
        const attendance = await storage.updateMeetingAttendance(existing.id, {
          checkedOutAt: new Date(),
        });
        res.json(attendance);
      } else {
        res.status(404).json({ message: "Attendance record not found" });
      }
    } catch (error) {
      console.error("Error checking out of meeting:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // BACKGROUND CHECKS ROUTES
  // ==========================================================================

  app.get('/api/background-checks/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const check = await storage.getBackgroundCheck(userId);
      res.json(check || { status: 'not-started' });
    } catch (error) {
      console.error("Error fetching background check status:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/background-checks', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['system-admin', 'admin', 'pastor', 'leader'].includes(user.role || '')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const checkSchema = z.object({
        userId: z.string(),
        status: z.enum(['not-started', 'pending', 'approved', 'expired', 'denied']),
        expiresAt: z.string().optional().transform(s => s ? new Date(s) : undefined),
        notes: z.string().optional(),
      });

      const validated = checkSchema.parse(req.body);
      const check = await storage.upsertBackgroundCheck({
        ...validated,
        verifiedBy: req.user.claims.sub,
        completedAt: validated.status === 'approved' || validated.status === 'denied' ? new Date() : undefined,
      });
      res.json(check);
    } catch (error) {
      console.error("Error updating background check:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // MINISTRY PATH / DISCIPLESHIP JOURNEY
  // =============================================================================

  // Get user's ministry path progress
  app.get('/api/ministry-path', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        hasAttendedSunday: user.hasAttendedSunday ?? false,
        hasAttendedNextNight: user.hasAttendedNextNight ?? false,
        learnStatus: user.learnStatus ?? 'not-started',
        loveStatus: user.loveStatus ?? 'not-started',
        leadStatus: user.leadStatus ?? 'not-started',
        ministryPathLastUpdated: user.ministryPathLastUpdated,
      });
    } catch (error) {
      console.error("Error fetching ministry path:", error);
      return handleApiError(error, res);
    }
  });

  // Update ministry path progress
  app.post('/api/ministry-path', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const pathSchema = z.object({
        hasAttendedSunday: z.boolean().optional(),
        hasAttendedNextNight: z.boolean().optional(),
        learnStatus: z.enum(['not-started', 'in-progress', 'complete']).optional(),
        loveStatus: z.enum(['not-started', 'in-progress', 'complete']).optional(),
        leadStatus: z.enum(['not-started', 'in-progress', 'complete']).optional(),
      });
      
      const validatedData = pathSchema.parse(req.body);
      
      const user = await storage.updateUser(userId, {
        ...validatedData,
        ministryPathLastUpdated: new Date(),
      });
      
      res.json({
        hasAttendedSunday: user.hasAttendedSunday ?? false,
        hasAttendedNextNight: user.hasAttendedNextNight ?? false,
        learnStatus: user.learnStatus ?? 'not-started',
        loveStatus: user.loveStatus ?? 'not-started',
        leadStatus: user.leadStatus ?? 'not-started',
        ministryPathLastUpdated: user.ministryPathLastUpdated,
      });
    } catch (error) {
      console.error("Error updating ministry path:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // UNIFIED DISCIPLESHIP PROGRESS (Single Source of Truth)
  // =============================================================================

  // Get unified user progress - combines ministry path + training modules
  app.get('/api/user-progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get all training modules and user's progress
      const modules = await storage.getTrainingModules();
      const userProgress = await storage.getUserTrainingProgress(userId);
      
      // Get user's ministry selections (from onboarding)
      const ministrySelections = await storage.getUserMinistrySelections(userId);
      const userMinistryIds = ministrySelections
        .filter(s => s.isActive === true)
        .map(s => s.ministryId);
      
      // Also get role assignments for ministry memberships
      const roleAssignments = await storage.getUserRoleAssignments(userId);
      const assignedMinistryIds = roleAssignments
        .filter(ra => ra.ministryId)
        .map(ra => ra.ministryId as string);
      
      // Combine both sources of ministry IDs
      const myMinistryIds = Array.from(new Set([...userMinistryIds, ...assignedMinistryIds]));
      
      console.log(`[user-progress] User: ${userId}, Role: ${user.role}, Total modules: ${modules.length}, Ministries: ${myMinistryIds.length}`);
      
      // Check if user is a leader (for leader-audience trainings)
      const userIsLeader = ['owner', 'admin', 'pastor', 'leader', 'system-admin', 'lead-pastor', 'board-of-elders'].includes(user.role || '');
      
      // Filter modules based on audience and ministry assignments (same logic as TrainingHub)
      const relevantModules = modules.filter(m => {
        const audience = m.audience || 'all';
        
        // If audience is 'leader', only show to leaders/admins
        if (audience === 'leader') {
          if (m.ministryId) {
            // For leader audience with ministry_id: must be leader AND in that ministry
            return userIsLeader && myMinistryIds.includes(m.ministryId);
          }
          // For leader audience without ministry_id: just need to be a leader
          return userIsLeader;
        }
        
        // If audience is 'ministry', only show to members of that ministry
        if (audience === 'ministry') {
          return m.ministryId ? myMinistryIds.includes(m.ministryId) : true;
        }
        
        // If audience is 'all', show to everyone (but still filter by ministry if specified)
        if (m.ministryId) {
          return myMinistryIds.includes(m.ministryId);
        }
        
        return true;
      });
      
      console.log(`[user-progress] Filtered to ${relevantModules.length} relevant modules, Active: ${relevantModules.filter(m => m.isActive).length}`);

      // Calculate module statuses
      const moduleStatuses = relevantModules
        .filter(m => m.isActive)
        .map(module => {
          const progress = userProgress.find(p => p.moduleId === module.id);
          const content = Array.isArray(module.content) ? module.content : [];
          const wordCount = content.reduce((acc: number, section: any) => {
            return acc + (typeof section.body === 'string' ? section.body.split(/\s+/).length : 0);
          }, 0);
          const readingMinutes = Math.ceil(wordCount / 200); // 200 wpm
          const surveyMinutes = Math.ceil((Array.isArray(module.studyQuestions) ? module.studyQuestions.length : 0) / 2);
          const estimatedMinutes = module.estimatedMinutes || (readingMinutes + surveyMinutes) || 30;

          return {
            id: module.id,
            title: module.title,
            description: module.description,
            category: module.pathStep || 'general',
            isRequired: module.isRequired,
            estimatedMinutes,
            xpReward: module.xpReward || 100,
            status: progress?.status === 'completed' ? 'COMPLETE' : 
                   progress?.status === 'in-progress' ? 'IN_PROGRESS' : 'INCOMPLETE',
            progressPercent: progress?.progressPercent || 0,
            completedAt: progress?.completedAt,
          };
        });

      // Count completions
      const requiredModules = moduleStatuses.filter(m => m.isRequired);
      const completedRequired = requiredModules.filter(m => m.status === 'COMPLETE').length;
      const totalRequired = requiredModules.length;
      const allModulesCompleted = moduleStatuses.filter(m => m.status === 'COMPLETE').length;
      const totalModules = moduleStatuses.length;

      // Ministry path progress (WORSHIP → NEXT NIGHT → LEARN → LOVE → LEAD)
      const pathSteps = [
        { id: 'worship', name: 'Worship', status: user.hasAttendedSunday ? 'COMPLETE' : 'INCOMPLETE' },
        { id: 'next-night', name: 'Next Night', status: user.hasAttendedNextNight ? 'COMPLETE' : 'INCOMPLETE' },
        { id: 'learn', name: 'Learn', status: user.learnStatus === 'complete' ? 'COMPLETE' : user.learnStatus === 'in-progress' ? 'IN_PROGRESS' : 'INCOMPLETE' },
        { id: 'love', name: 'Love', status: user.loveStatus === 'complete' ? 'COMPLETE' : user.loveStatus === 'in-progress' ? 'IN_PROGRESS' : 'INCOMPLETE' },
        { id: 'lead', name: 'Lead', status: user.leadStatus === 'complete' ? 'COMPLETE' : user.leadStatus === 'in-progress' ? 'IN_PROGRESS' : 'INCOMPLETE' },
      ];
      const pathCompleted = pathSteps.filter(s => s.status === 'COMPLETE').length;
      const pathTotal = pathSteps.length;

      // Combined percent (weight: 50% path, 50% required trainings if any exist)
      let percentComplete = 0;
      if (totalRequired > 0) {
        percentComplete = Math.round(((pathCompleted / pathTotal) * 50) + ((completedRequired / totalRequired) * 50));
      } else {
        percentComplete = Math.round((pathCompleted / pathTotal) * 100);
      }

      // Next actions (up to 3 most important incomplete items)
      const nextActions: { id: string; title: string; type: string; estimatedMinutes?: number }[] = [];
      
      // First, check path steps that need completion
      for (const step of pathSteps) {
        if (step.status !== 'COMPLETE' && nextActions.length < 3) {
          nextActions.push({ id: step.id, title: step.name, type: 'path_step' });
        }
      }
      
      // Then add incomplete required trainings
      for (const module of requiredModules) {
        if (module.status !== 'COMPLETE' && nextActions.length < 3) {
          nextActions.push({ id: module.id, title: module.title, type: 'training', estimatedMinutes: module.estimatedMinutes });
        }
      }

      res.json({
        totals: {
          totalModules,
          completedModules: allModulesCompleted,
          totalRequired,
          completedRequired,
          pathTotal,
          pathCompleted,
          percentComplete,
        },
        pathSteps,
        modules: moduleStatuses,
        nextActions,
        lastUpdated: user.ministryPathLastUpdated || user.updatedAt,
      });
    } catch (error) {
      console.error("Error fetching user progress:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // MESSAGING SYSTEM
  // =============================================================================

  // Get user's messages
  app.get('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messages = await storage.getMessages(userId);
      
      const users = await storage.getAllUsers();
      const activeUsers = users.filter(u => !u.isArchived);
      const ministries = await storage.getMinistries();
      
      const messagesWithDetails = messages.map(message => ({
        ...message,
        sender: activeUsers.find(u => u.id === message.senderId),
        ministry: message.ministryId ? ministries.find(m => m.id === message.ministryId) : undefined,
      }));
      
      res.json(messagesWithDetails);
    } catch (error) {
      console.error("Error fetching messages:", error);
      return handleApiError(error, res);
    }
  });

  // Send a message
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const messageSchema = z.object({
        recipientId: z.string().optional(),
        ministryId: z.string().optional(),
        messageType: z.enum(['direct', 'channel', 'announcement']),
        subject: z.string().min(1),
        content: z.string().min(1),
        isAnnouncement: z.boolean().optional(),
      });
      
      const validatedData = messageSchema.parse(req.body);
      
      const message = await storage.createMessage({
        senderId: userId,
        ...validatedData,
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Mark message as read
  app.patch('/api/messages/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.markMessageRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // MANUALS LIBRARY
  // =============================================================================

  // Get all manuals
  app.get('/api/manuals', isAuthenticated, async (req: any, res) => {
    try {
      const { ministryId } = req.query;
      const manuals = await storage.getManuals(ministryId as string | undefined);
      
      const ministries = await storage.getMinistries();
      
      // Get analysis status for each manual
      const manualsWithDetails = await Promise.all(manuals.map(async manual => {
        const analysis = await storage.getManualAnalysis(manual.id);
        return {
          ...manual,
          ministry: manual.ministryId ? ministries.find(m => m.id === manual.ministryId) : undefined,
          analysisStatus: analysis?.status || null,
        };
      }));
      
      res.json(manualsWithDetails);
    } catch (error) {
      console.error("Error fetching manuals:", error);
      return handleApiError(error, res);
    }
  });

  // Upload PDF file for manual (leadership only)
  app.post('/api/manuals/upload', isAuthenticated, uploadManual.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const leaderRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      
      if (!user || !leaderRoles.includes(user.role || '')) {
        // Delete uploaded file if unauthorized
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(403).json({ message: "Not authorized to upload manuals" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Return the file URL that can be used when creating/updating a manual
      const fileUrl = `/uploads/manuals/${req.file.filename}`;
      
      res.json({
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
      });
    } catch (error) {
      console.error("Error uploading manual PDF:", error);
      // Clean up file on error
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return handleApiError(error, res);
    }
  });

  // Create a manual (leadership only)
  app.post('/api/manuals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const leaderRoles = ['system-admin', 'admin', 'lead-pastor', 'pastor', 'ministry-leader', 'leader'];
      
      if (!user || !leaderRoles.includes(user.role || '')) {
        return res.status(403).json({ message: "Not authorized to create manuals" });
      }
      
      const manualSchema = z.object({
        title: z.string().min(1),
        description: z.string().optional().nullable(),
        ministryId: z.string().optional().nullable(),
        category: z.string().optional().nullable(),
        fileUrl: z.string().optional().nullable(),
        fileType: z.string().optional().nullable(),
        fileSize: z.number().optional().nullable(),
        isRequired: z.boolean().optional(),
        sortOrder: z.number().optional(),
      });
      
      const validatedData = manualSchema.parse(req.body);
      
      const manual = await storage.createManual({
        title: validatedData.title,
        description: validatedData.description || null,
        ministryId: validatedData.ministryId || null,
        category: validatedData.category || null,
        fileUrl: validatedData.fileUrl || null,
        fileType: validatedData.fileType || null,
        fileSize: validatedData.fileSize || null,
        isRequired: validatedData.isRequired ?? false,
        sortOrder: validatedData.sortOrder ?? 0,
        createdBy: userId,
      });
      
      res.json(manual);
    } catch (error) {
      console.error("Error creating manual:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Update a manual
  app.patch('/api/manuals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const manualSchema = z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        ministryId: z.string().optional().nullable(),
        category: z.string().optional(),
        fileUrl: z.string().optional(),
        fileType: z.string().optional(),
        fileSize: z.number().optional(),
        isRequired: z.boolean().optional(),
        sortOrder: z.number().optional(),
      });
      
      const validatedData = manualSchema.parse(req.body);
      
      const manual = await storage.updateManual(id, validatedData);
      res.json(manual);
    } catch (error) {
      console.error("Error updating manual:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Delete a manual
  app.delete('/api/manuals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteManual(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting manual:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // MANUAL ANALYSIS & AI TRAINING GENERATION
  // =============================================================================

  // Get manual analysis status
  app.get('/api/manuals/:id/analysis', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const analysis = await storage.getManualAnalysis(id);
      res.json(analysis || null);
    } catch (error) {
      console.error("Error fetching manual analysis:", error);
      return handleApiError(error, res);
    }
  });

  // Trigger manual analysis (generates training content from PDF)
  app.post('/api/manuals/:id/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Get manual
      const manual = await storage.getManual(id);
      if (!manual) {
        return res.status(404).json({ message: "Manual not found" });
      }
      
      // Check if already analyzing
      const existingAnalysis = await storage.getManualAnalysis(id);
      if (existingAnalysis && existingAnalysis.status === 'processing') {
        return res.status(400).json({ message: "Analysis already in progress" });
      }
      
      // Create or update analysis record
      if (!existingAnalysis) {
        await storage.createManualAnalysis({
          manualId: id,
          status: 'processing',
          triggeredBy: userId,
        });
      } else {
        await storage.updateManualAnalysis(id, {
          status: 'processing',
          triggeredBy: userId,
          errorMessage: null,
        });
      }
      
      // Trigger async analysis (fire and forget)
      const { analyzeManual } = await import('./manualAnalysisService');
      analyzeManual(id).catch((error: Error) => {
        console.error("Background analysis error:", error);
      });
      
      res.json({ message: "Analysis started", status: 'processing' });
    } catch (error) {
      console.error("Error triggering manual analysis:", error);
      return handleApiError(error, res);
    }
  });

  // Get generated training content for a manual
  app.get('/api/manuals/:id/training', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get the training module linked to this manual
      const training = await storage.getTrainingByManualId(id);
      if (!training) {
        return res.status(404).json({ message: "No training content generated yet" });
      }
      
      // Get analysis for additional content
      const analysis = await storage.getManualAnalysis(id);
      
      res.json({
        training,
        analysis: analysis ? {
          summary: analysis.summary,
          keyTopics: analysis.keyTopics,
          studyQuestions: analysis.studyQuestions,
          assessmentQuestions: analysis.assessmentQuestions,
          status: analysis.status,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching training content:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // NOTIFICATIONS
  // =============================================================================

  // Get notifications for current user
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const unreadOnly = req.query.unread === 'true';
      const notifications = await storage.getNotifications(userId, unreadOnly);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return handleApiError(error, res);
    }
  });

  // Mark notification as read
  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      return handleApiError(error, res);
    }
  });

  // Mark all notifications as read
  app.post('/api/notifications/mark-all-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // TEAM INVITES
  // =============================================================================

  // Get team invites for a ministry
  app.get('/api/team-invites', isAuthenticated, async (req: any, res) => {
    try {
      const { ministryId } = req.query;
      const invites = await storage.getTeamInvites(ministryId as string | undefined);
      res.json(invites);
    } catch (error) {
      console.error("Error fetching team invites:", error);
      return handleApiError(error, res);
    }
  });

  // Create a team invite (leader sends email invite)
  app.post('/api/team-invites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const inviteSchema = z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        ministryIds: z.array(z.string()).optional(),
        roleType: z.enum(['member', 'leader']).optional(),
        roleName: z.string().optional(),
        message: z.string().optional(),
      });
      
      const validatedData = inviteSchema.parse(req.body);
      
      // Normalize email to lowercase for consistent matching
      const normalizedEmail = validatedData.email.toLowerCase().trim();
      
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14); // 2 weeks to accept
      
      // Convert string[] to InviteMinistryAssignment[]
      const ministryAssignments = (validatedData.ministryIds || []).map(ministryId => ({
        ministryId,
        roleType: validatedData.roleType || 'member',
        roleTitle: validatedData.roleName,
      }));
      
      const invite = await storage.createTeamInvite({
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: normalizedEmail,
        ministries: ministryAssignments,
        roleType: validatedData.roleType || 'member',
        roleName: validatedData.roleName,
        message: validatedData.message,
        invitedBy: userId,
        token,
        expiresAt,
        status: 'pending',
      });
      
      // Send invite email
      const inviter = await storage.getUser(userId);
      const firstMinistry = validatedData.ministryIds?.length 
        ? await storage.getMinistry(validatedData.ministryIds[0])
        : null;
      
      try {
        const { sendInviteEmail } = await import('./emailService');
        await sendInviteEmail({
          invite,
          inviter: inviter || null,
          ministry: firstMinistry || null,
        });
        await storage.updateTeamInvite(invite.id, { emailSentAt: new Date() });
      } catch (emailError) {
        console.error("Failed to send invite email:", emailError);
        // Don't fail the request if email fails - invite is still created
      }
      
      res.json(invite);
    } catch (error) {
      console.error("Error creating team invite:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Bulk create team invites
  app.post('/api/team-invites/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const isAdmin = currentUser.role === 'admin' || currentUser.role === 'owner';
      const isPastoralRole = ['pastor', 'lead-pastor', 'board-of-elders'].includes(currentUser.role || '');
      const canInviteAnywhere = isAdmin || isPastoralRole;
      
      // Get leader's ministries if not admin/pastoral
      let leaderMinistryIds: string[] = [];
      if (!canInviteAnywhere) {
        const leadership = await storage.getUserLeadershipAssignments(userId);
        leaderMinistryIds = leadership.map((l: any) => l.ministryId);
        
        if (leaderMinistryIds.length === 0) {
          return res.status(403).json({ message: "You don't have permission to invite people" });
        }
      }
      
      const bulkSchema = z.object({
        invites: z.array(z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().email(),
          ministryIds: z.array(z.string()).optional(),
          roleType: z.enum(['member', 'leader']).optional(),
          roleName: z.string().optional(),
          message: z.string().optional(),
        })),
      });
      
      const { invites: inviteData } = bulkSchema.parse(req.body);
      
      const created: Array<{ email: string; firstName?: string; lastName?: string }> = [];
      const failed: Array<{ email: string; reason: string; line: number }> = [];
      
      // Fetch existing invites and users once for efficiency
      const existingInvites = await storage.getTeamInvites();
      const pendingInviteEmails = new Set(
        existingInvites
          .filter(inv => inv.status === 'pending')
          .map(inv => inv.email.toLowerCase())
      );
      // Track emails created in this batch to prevent duplicates within same request
      const batchCreatedEmails = new Set<string>();
      
      const inviter = await storage.getUser(userId);
      const { sendInviteEmail } = await import('./emailService');
      
      for (let i = 0; i < inviteData.length; i++) {
        const data = inviteData[i];
        const lineNum = i + 1;
        
        try {
          // Validate email
          if (!data.email || !data.email.includes('@')) {
            failed.push({ email: data.email || '', reason: 'Invalid email address', line: lineNum });
            continue;
          }
          
          // Check for existing invite with same email in pending status
          const emailLower = data.email.toLowerCase();
          if (pendingInviteEmails.has(emailLower) || batchCreatedEmails.has(emailLower)) {
            failed.push({ email: data.email, reason: 'Pending invite already exists', line: lineNum });
            continue;
          }
          
          // Check for existing user
          const existingUser = await storage.getUserByEmail(data.email);
          if (existingUser) {
            failed.push({ email: data.email, reason: 'User already exists', line: lineNum });
            continue;
          }
          
          // Check ministry access for non-admin
          if (!canInviteAnywhere && data.ministryIds && data.ministryIds.length > 0) {
            const unauthorizedMinistries = data.ministryIds.filter(
              mid => !leaderMinistryIds.includes(mid)
            );
            if (unauthorizedMinistries.length > 0) {
              failed.push({ email: data.email, reason: 'Not authorized for selected ministry', line: lineNum });
              continue;
            }
          }
          
          // Non-admin can't invite as leader
          if (!canInviteAnywhere && data.roleType === 'leader') {
            failed.push({ email: data.email, reason: 'Not authorized to invite leaders', line: lineNum });
            continue;
          }
          
          // For non-admin leaders, auto-assign their ministries if none specified
          let effectiveMinistryIds = data.ministryIds || [];
          if (!canInviteAnywhere && effectiveMinistryIds.length === 0) {
            effectiveMinistryIds = leaderMinistryIds;
          }
          
          const token = crypto.randomUUID();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 14);
          
          const ministryAssignments = effectiveMinistryIds.map(ministryId => ({
            ministryId,
            roleType: data.roleType || 'member',
            roleTitle: data.roleName,
          }));
          
          const invite = await storage.createTeamInvite({
            firstName: data.firstName || data.email.split('@')[0],
            lastName: data.lastName || '',
            email: emailLower, // Normalized to lowercase
            ministries: ministryAssignments,
            roleType: data.roleType || 'member',
            roleName: data.roleName,
            message: data.message,
            invitedBy: userId,
            token,
            expiresAt,
            status: 'pending',
          });
          
          // Send email (don't fail on email error)
          try {
            const firstMinistry = effectiveMinistryIds.length > 0
              ? await storage.getMinistry(effectiveMinistryIds[0])
              : null;
            await sendInviteEmail({
              invite,
              inviter: inviter || null,
              ministry: firstMinistry || null,
            });
            await storage.updateTeamInvite(invite.id, { emailSentAt: new Date() });
          } catch (emailError) {
            console.error("Failed to send invite email for:", data.email, emailError);
          }
          
          // Track this email to prevent duplicates within same batch
          batchCreatedEmails.add(emailLower);
          created.push({ email: data.email, firstName: data.firstName, lastName: data.lastName });
        } catch (inviteError: any) {
          console.error("Error creating invite for:", data.email, inviteError);
          failed.push({ email: data.email, reason: inviteError.message || 'Unknown error', line: lineNum });
        }
      }
      
      res.json({ created, failed });
    } catch (error) {
      console.error("Error in bulk invite:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Get invite details by token (public - for acceptance page)
  app.get('/api/team-invites/token/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      const invite = await storage.getTeamInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      // Check if expired
      if (new Date() > invite.expiresAt && invite.status === 'pending') {
        await storage.updateTeamInvite(invite.id, { status: 'expired' });
        return res.status(400).json({ message: "This invite has expired", status: 'expired' });
      }
      
      // Get ministry details if applicable
      const ministry = invite.ministryId ? await storage.getMinistry(invite.ministryId) : null;
      const inviter = await storage.getUser(invite.invitedBy);
      
      res.json({
        id: invite.id,
        firstName: invite.firstName,
        lastName: invite.lastName,
        email: invite.email,
        status: invite.status,
        ministryName: ministry?.name,
        roleName: invite.roleName,
        message: invite.message,
        inviterName: inviter ? `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() : 'A leader',
        expiresAt: invite.expiresAt,
      });
    } catch (error) {
      console.error("Error fetching invite by token:", error);
      return handleApiError(error, res);
    }
  });

  // Accept a team invite
  app.post('/api/team-invites/:token/accept', isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;
      const userId = req.user.claims.sub;
      
      const invite = await storage.getTeamInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      if (invite.status !== 'pending') {
        return res.status(400).json({ message: "This invite has already been used" });
      }
      
      if (new Date() > invite.expiresAt) {
        await storage.updateTeamInvite(invite.id, { status: 'expired' });
        return res.status(400).json({ message: "This invite has expired" });
      }
      
      await storage.updateTeamInvite(invite.id, {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedBy: userId,
      });
      
      // Create role assignments for all pre-selected ministries
      // Handle both old format (string[]) and new format (InviteMinistryAssignment[])
      const rawMinistries = invite.ministries || [];
      const ministryIds: string[] = [];
      
      for (const item of rawMinistries) {
        let ministryId: string;
        let roleType: string;
        let roleTitle: string | undefined;
        
        if (typeof item === 'string') {
          // Old format: just ministry ID
          ministryId = item;
          roleType = invite.roleType || 'member';
          roleTitle = invite.roleName || undefined;
        } else {
          // New format: InviteMinistryAssignment object
          const assignment = item as { ministryId: string; roleType?: string; roleTitle?: string };
          ministryId = assignment.ministryId;
          roleType = assignment.roleType || invite.roleType || 'member';
          roleTitle = assignment.roleTitle || invite.roleName || undefined;
        }
        
        ministryIds.push(ministryId);
        await storage.createRoleAssignment({
          userId,
          ministryId,
          roleType,
          roleName: roleTitle || 'Member',
          isActive: true,
          assignedBy: invite.invitedBy,
        });
        
        // Also create ministry selection for the user
        await storage.createMinistrySelection({
          userId,
          ministryId,
          isActive: true,
        });
      }
      
      res.json({ success: true, ministryIds });
    } catch (error) {
      console.error("Error accepting team invite:", error);
      return handleApiError(error, res);
    }
  });

  // Resend a team invite email
  app.post('/api/team-invites/:id/resend', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Get the invite
      const invite = await storage.getTeamInvite(id);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      // Check permissions - must be admin or the original inviter
      const user = await storage.getUser(userId);
      const isAdmin = user && (user.role === 'admin' || user.role === 'owner' || user.role === 'pastor');
      const isInviter = invite.invitedBy === userId;
      
      if (!isAdmin && !isInviter) {
        return res.status(403).json({ message: "Not authorized to resend this invite" });
      }
      
      // Only pending invites can be resent
      if (invite.status !== 'pending') {
        return res.status(400).json({ message: "Only pending invites can be resent" });
      }
      
      // Get related data for the email
      const inviter = await storage.getUser(invite.invitedBy);
      const ministry = invite.ministryId ? await storage.getMinistry(invite.ministryId) : null;
      
      // Resend the email
      const { sendInviteEmail } = await import('./emailService');
      const emailResult = await sendInviteEmail({
        invite: {
          firstName: invite.firstName,
          lastName: invite.lastName,
          email: invite.email,
          token: invite.token,
          message: invite.message,
        },
        inviter,
        ministry: ministry ? { name: ministry.name } : null,
      });
      
      if (!emailResult.success) {
        return res.status(500).json({ message: "Failed to send email", error: emailResult.error });
      }
      
      res.json({ success: true, message: "Invite email resent successfully" });
    } catch (error) {
      console.error("Error resending team invite:", error);
      return handleApiError(error, res);
    }
  });

  // Cancel/delete a team invite
  app.delete('/api/team-invites/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Get the invite
      const invite = await storage.getTeamInvite(id);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      // Check permissions - must be admin or the original inviter
      const user = await storage.getUser(userId);
      const isAdmin = user && (user.role === 'admin' || user.role === 'owner' || user.role === 'pastor');
      const isInviter = invite.invitedBy === userId;
      
      if (!isAdmin && !isInviter) {
        return res.status(403).json({ message: "Not authorized to cancel this invite" });
      }
      
      // Delete the invite record
      await storage.deleteTeamInvite(id);
      
      res.json({ success: true, message: "Invite cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling team invite:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // MINISTRY SELECTIONS (Multi-ministry onboarding)
  // =============================================================================
  
  app.get('/api/ministry-selections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const selections = await storage.getUserMinistrySelections(userId);
      res.json(selections);
    } catch (error) {
      console.error("Error fetching ministry selections:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/ministry-selections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ministryIds } = req.body;
      
      if (!Array.isArray(ministryIds)) {
        return res.status(400).json({ message: "ministryIds must be an array" });
      }
      
      // Delete existing selections and create new ones
      await storage.deleteUserMinistrySelections(userId);
      
      const selections = [];
      for (const ministryId of ministryIds) {
        const selection = await storage.createMinistrySelection({
          userId,
          ministryId,
          isActive: true,
        });
        selections.push(selection);
      }
      
      res.json(selections);
    } catch (error) {
      console.error("Error saving ministry selections:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // ONBOARDING STEPS TRACKING
  // =============================================================================
  
  app.get('/api/onboarding-steps', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const steps = await storage.getUserOnboardingSteps(userId);
      res.json(steps);
    } catch (error) {
      console.error("Error fetching onboarding steps:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/onboarding-steps', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { stepType, ministryId, isComplete, quizScore, quizPassed } = req.body;
      
      const step = await storage.upsertOnboardingStep({
        userId,
        stepType,
        ministryId: ministryId || null,
        isComplete: isComplete || false,
        completedAt: isComplete ? new Date() : null,
        quizScore,
        quizPassed,
        attempts: 1,
      });
      
      res.json(step);
    } catch (error) {
      console.error("Error saving onboarding step:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // QUIZ MANAGEMENT
  // =============================================================================
  
  app.get('/api/quiz/questions', isAuthenticated, async (req: any, res) => {
    try {
      const { manualId, trainingId, category } = req.query;
      const questions = await storage.getQuizQuestions(
        manualId as string,
        trainingId as string,
        category as string
      );
      res.json(questions);
    } catch (error) {
      console.error("Error fetching quiz questions:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/quiz/questions', isAuthenticated, async (req: any, res) => {
    try {
      const question = await storage.createQuizQuestion(req.body);
      res.json(question);
    } catch (error) {
      console.error("Error creating quiz question:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/quiz/attempts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { manualId, trainingId } = req.query;
      const attempts = await storage.getUserQuizAttempts(
        userId,
        manualId as string,
        trainingId as string
      );
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching quiz attempts:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/quiz/submit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { manualId, trainingId, quizCategory, answers } = req.body;
      
      // Get questions for this quiz
      const questions = await storage.getQuizQuestions(manualId, trainingId, quizCategory);
      
      // Calculate score
      let correctCount = 0;
      for (const question of questions) {
        if (answers[question.id] === question.correctAnswer) {
          correctCount++;
        }
      }
      
      const totalQuestions = questions.length;
      const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
      const passed = percentage >= 80; // 80% pass threshold
      
      // Get previous attempts count
      const previousAttempts = await storage.getUserQuizAttempts(userId, manualId, trainingId);
      const attemptNumber = previousAttempts.length + 1;
      
      const attempt = await storage.createQuizAttempt({
        userId,
        manualId: manualId || null,
        trainingId: trainingId || null,
        quizCategory: quizCategory || null,
        answers,
        score: correctCount,
        totalQuestions,
        percentage,
        passed,
        attemptNumber,
      });
      
      // If passed, update onboarding step
      if (passed) {
        const stepType = manualId ? 'manual-quiz' : trainingId ? 'training-quiz' : quizCategory;
        await storage.upsertOnboardingStep({
          userId,
          stepType: stepType || 'quiz',
          ministryId: null,
          isComplete: true,
          completedAt: new Date(),
          quizScore: percentage,
          quizPassed: true,
          attempts: attemptNumber,
        });
      }
      
      res.json(attempt);
    } catch (error) {
      console.error("Error submitting quiz:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // RECURRING ACTIVITIES (Metrics Reporting)
  // =============================================================================
  
  app.get('/api/recurring-activities', isAuthenticated, async (req: any, res) => {
    try {
      const { ministryId } = req.query;
      const activities = await storage.getRecurringActivities(ministryId as string);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching recurring activities:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/recurring-activities/:id', isAuthenticated, async (req: any, res) => {
    try {
      const activity = await storage.getRecurringActivity(req.params.id);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      console.error("Error fetching recurring activity:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/recurring-activities', isAuthenticated, async (req: any, res) => {
    try {
      const activity = await storage.createRecurringActivity(req.body);
      res.json(activity);
    } catch (error) {
      console.error("Error creating recurring activity:", error);
      return handleApiError(error, res);
    }
  });

  app.patch('/api/recurring-activities/:id', isAuthenticated, async (req: any, res) => {
    try {
      const activity = await storage.updateRecurringActivity(req.params.id, req.body);
      res.json(activity);
    } catch (error) {
      console.error("Error updating recurring activity:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // METRICS SUBMISSIONS
  // =============================================================================
  
  app.get('/api/metrics-submissions', isAuthenticated, async (req: any, res) => {
    try {
      const { activityId, status } = req.query;
      const submissions = await storage.getMetricsSubmissions(
        activityId as string,
        status as string
      );
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching metrics submissions:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/metrics-submissions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const submission = await storage.getMetricsSubmission(req.params.id);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      res.json(submission);
    } catch (error) {
      console.error("Error fetching metrics submission:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/metrics-submissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { activityId, eventDate, ...data } = req.body;
      
      // Calculate due date (48 hours after event)
      const eventDateTime = new Date(eventDate);
      const dueDate = new Date(eventDateTime);
      dueDate.setHours(dueDate.getHours() + 48);
      
      const submission = await storage.createMetricsSubmission({
        activityId,
        eventDate: eventDateTime,
        dueDate,
        status: data.status || 'pending',
        submittedBy: userId,
        ...data,
      });
      
      res.json(submission);
    } catch (error) {
      console.error("Error creating metrics submission:", error);
      return handleApiError(error, res);
    }
  });

  app.patch('/api/metrics-submissions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getMetricsSubmission(req.params.id);
      
      if (!existing) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      // Create audit log for edits
      if (existing.submittedAt) {
        await storage.createAuditLog({
          entityType: 'metrics_submission',
          entityId: req.params.id,
          action: 'update',
          previousValue: existing as any,
          newValue: req.body,
          performedBy: userId,
        });
      }
      
      const submission = await storage.updateMetricsSubmission(req.params.id, {
        ...req.body,
        submittedBy: userId,
        submittedAt: req.body.status === 'submitted' ? new Date() : existing.submittedAt,
      });
      
      res.json(submission);
    } catch (error) {
      console.error("Error updating metrics submission:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // USER ARCHIVING
  // =============================================================================
  
  app.get('/api/archived-users', isAuthenticated, async (req: any, res) => {
    try {
      const archives = await storage.getArchivedUsers();
      res.json(archives);
    } catch (error) {
      console.error("Error fetching archived users:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/users/:userId/archive', isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { userId } = req.params;
      const { reason } = req.body;
      
      const archive = await storage.archiveUser(userId, adminId, reason);
      res.json(archive);
    } catch (error) {
      console.error("Error archiving user:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/user-archives/:archiveId/restore', isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { archiveId } = req.params;
      
      await storage.restoreUser(archiveId, adminId);
      res.json({ message: "User restored successfully" });
    } catch (error) {
      console.error("Error restoring user:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // MINISTRY ARCHIVING
  // =============================================================================
  
  app.post('/api/ministries/:ministryId/archive', isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { ministryId } = req.params;
      const { reason } = req.body;
      
      // Check if ministry can be deleted (within 7 days of creation)
      const ministry = await storage.getMinistry(ministryId);
      if (!ministry) {
        return res.status(404).json({ message: "Ministry not found" });
      }
      
      const archive = await storage.archiveMinistry(ministryId, adminId, reason);
      res.json(archive);
    } catch (error) {
      console.error("Error archiving ministry:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // MINISTRY LEADER DELEGATION (LD1/LD2)
  // =============================================================================
  
  // Add a secondary leader to a ministry
  app.post('/api/ministries/:ministryId/leaders', isAuthenticated, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const { ministryId } = req.params;
      const { userId, leadershipType } = req.body;
      
      // Validate request body
      if (!userId || leadershipType !== 'secondary') {
        return res.status(400).json({ 
          message: "Invalid request: userId required and leadershipType must be 'secondary'" 
        });
      }
      
      // Get actor's user record for permission check
      const actor = await storage.getUser(actorId);
      if (!actor) {
        return res.status(403).json({ message: "User not found" });
      }
      
      // Get ministry to verify it exists
      const ministry = await storage.getMinistry(ministryId);
      if (!ministry) {
        return res.status(404).json({ message: "Ministry not found" });
      }
      
      // Permission check: Admin/Owner, Pastor, or Primary Leader of this ministry
      const isAdminOrOwner = ['owner', 'admin', 'system-admin'].includes(actor.role || '');
      const isPastor = ['pastor', 'lead-pastor', 'board-of-elders'].includes(actor.role || '');
      
      // Check if actor is primary leader of this specific ministry
      let isPrimaryLeaderOfMinistry = false;
      if (!isAdminOrOwner && !isPastor) {
        const actorAssignments = await storage.getUserLeadershipAssignments(actorId);
        isPrimaryLeaderOfMinistry = actorAssignments.some(
          a => a.ministryId === ministryId && a.leadershipType === 'primary' && a.isActive
        );
      }
      
      if (!isAdminOrOwner && !isPastor && !isPrimaryLeaderOfMinistry) {
        return res.status(403).json({ 
          code: 'INSUFFICIENT_PERMISSIONS',
          message: "Only admins, pastors, or the primary leader of this ministry can add secondary leaders" 
        });
      }
      
      // Verify target user exists
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "Target user not found" });
      }
      
      // Check if user already has an active leadership assignment for this ministry
      const existingAssignments = await storage.getMinistryLeadershipAssignments(ministryId);
      const existingAssignment = existingAssignments.find(a => a.userId === userId && a.isActive);
      if (existingAssignment) {
        return res.status(409).json({ 
          code: 'ALREADY_LEADER',
          message: "User is already a leader of this ministry" 
        });
      }
      
      // Create the secondary leader assignment
      const assignment = await storage.createMinistryLeadershipAssignment({
        userId,
        ministryId,
        leadershipType: 'secondary',
        isLocked: false,
        assignedBy: actorId,
        isActive: true,
      });
      
      // Write audit log entry
      await storage.createAuditLog({
        entityType: 'ministry_leadership',
        entityId: assignment.id,
        action: 'leader_added',
        performedBy: actorId,
        changes: {
          ministryId,
          userId,
          leadershipType: 'secondary',
          assignedBy: actorId,
        },
      });
      
      // Send notification to new secondary leader with CELEBRATION intent
      const actorName = `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || 'A leader';
      await storage.createNotification({
        userId,
        type: 'leader_added',
        title: 'You\'ve Been Added as a Leader!',
        message: `${actorName} has added you as a secondary leader of ${ministry.name}. Welcome to the team!`,
        data: {
          ministryId,
          ministryName: ministry.name,
          assignedBy: actorId,
          assignedByName: actorName,
          pastoralIntent: 'CELEBRATION',
        },
      });
      
      res.status(201).json({
        id: assignment.id,
        userId: assignment.userId,
        ministryId: assignment.ministryId,
        leadershipType: assignment.leadershipType,
        isLocked: assignment.isLocked,
        assignedBy: assignment.assignedBy,
        createdAt: assignment.createdAt,
      });
    } catch (error) {
      console.error("Error adding secondary leader:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // ROOM LAYOUTS
  // =============================================================================
  
  app.get('/api/rooms/:roomId/layouts', isAuthenticated, async (req: any, res) => {
    try {
      const layouts = await storage.getRoomLayouts(req.params.roomId);
      res.json(layouts);
    } catch (error) {
      console.error("Error fetching room layouts:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/rooms/:roomId/layouts', isAuthenticated, async (req: any, res) => {
    try {
      const layout = await storage.createRoomLayout({
        roomId: req.params.roomId,
        ...req.body,
      });
      res.json(layout);
    } catch (error) {
      console.error("Error creating room layout:", error);
      return handleApiError(error, res);
    }
  });

  app.patch('/api/room-layouts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const layout = await storage.updateRoomLayout(req.params.id, req.body);
      res.json(layout);
    } catch (error) {
      console.error("Error updating room layout:", error);
      return handleApiError(error, res);
    }
  });

  app.delete('/api/room-layouts/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteRoomLayout(req.params.id);
      res.json({ message: "Layout deleted successfully" });
    } catch (error) {
      console.error("Error deleting room layout:", error);
      return handleApiError(error, res);
    }
  });

  // Archive room (instead of delete if has historical data)
  app.post('/api/rooms/:roomId/archive', isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const room = await storage.archiveRoom(req.params.roomId, adminId);
      res.json(room);
    } catch (error) {
      console.error("Error archiving room:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // AUDIT LOGS
  // =============================================================================
  
  app.get('/api/audit-logs/:entityType/:entityId', isAuthenticated, async (req: any, res) => {
    try {
      const { entityType, entityId } = req.params;
      const logs = await storage.getAuditLogs(entityType, entityId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      return handleApiError(error, res);
    }
  });

  // =============================================================================
  // CONFIG BANK / FIELD BANK - Admin Tags, Serve Roles, Staff Titles, Global Labels
  // =============================================================================
  
  // Admin Tags
  app.get('/api/config/tags', isAuthenticated, async (req: any, res) => {
    try {
      const tags = await storage.getAdminTags();
      res.json(tags);
    } catch (error) {
      console.error("Error fetching admin tags:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/config/tags', isAuthenticated, async (req: any, res) => {
    try {
      const tag = await storage.createAdminTag(req.body);
      res.status(201).json(tag);
    } catch (error) {
      console.error("Error creating admin tag:", error);
      return handleApiError(error, res);
    }
  });

  app.patch('/api/config/tags/:id', isAuthenticated, async (req: any, res) => {
    try {
      const tag = await storage.updateAdminTag(req.params.id, req.body);
      res.json(tag);
    } catch (error) {
      console.error("Error updating admin tag:", error);
      return handleApiError(error, res);
    }
  });

  app.delete('/api/config/tags/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteAdminTag(req.params.id);
      res.json({ message: "Tag deleted successfully" });
    } catch (error) {
      console.error("Error deleting admin tag:", error);
      return handleApiError(error, res);
    }
  });

  // Serve Roles
  app.get('/api/config/serve-roles', isAuthenticated, async (req: any, res) => {
    try {
      const roles = await storage.getServeRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching serve roles:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/config/serve-roles', isAuthenticated, async (req: any, res) => {
    try {
      const role = await storage.createServeRole(req.body);
      res.status(201).json(role);
    } catch (error) {
      console.error("Error creating serve role:", error);
      return handleApiError(error, res);
    }
  });

  app.patch('/api/config/serve-roles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const role = await storage.updateServeRole(req.params.id, req.body);
      res.json(role);
    } catch (error) {
      console.error("Error updating serve role:", error);
      return handleApiError(error, res);
    }
  });

  app.delete('/api/config/serve-roles/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteServeRole(req.params.id);
      res.json({ message: "Serve role deleted successfully" });
    } catch (error) {
      console.error("Error deleting serve role:", error);
      return handleApiError(error, res);
    }
  });

  // Staff Titles
  app.get('/api/config/staff-titles', isAuthenticated, async (req: any, res) => {
    try {
      const titles = await storage.getStaffTitles();
      res.json(titles);
    } catch (error) {
      console.error("Error fetching staff titles:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/config/staff-titles', isAuthenticated, async (req: any, res) => {
    try {
      const title = await storage.createStaffTitle(req.body);
      res.status(201).json(title);
    } catch (error) {
      console.error("Error creating staff title:", error);
      return handleApiError(error, res);
    }
  });

  app.patch('/api/config/staff-titles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const title = await storage.updateStaffTitle(req.params.id, req.body);
      res.json(title);
    } catch (error) {
      console.error("Error updating staff title:", error);
      return handleApiError(error, res);
    }
  });

  app.delete('/api/config/staff-titles/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteStaffTitle(req.params.id);
      res.json({ message: "Staff title deleted successfully" });
    } catch (error) {
      console.error("Error deleting staff title:", error);
      return handleApiError(error, res);
    }
  });

  // Global Labels
  app.get('/api/config/labels', isAuthenticated, async (req: any, res) => {
    try {
      const labels = await storage.getGlobalLabels();
      res.json(labels);
    } catch (error) {
      console.error("Error fetching global labels:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/config/labels', isAuthenticated, async (req: any, res) => {
    try {
      const label = await storage.createGlobalLabel(req.body);
      res.status(201).json(label);
    } catch (error) {
      console.error("Error creating global label:", error);
      return handleApiError(error, res);
    }
  });

  app.patch('/api/config/labels/:id', isAuthenticated, async (req: any, res) => {
    try {
      const label = await storage.updateGlobalLabel(req.params.id, req.body);
      res.json(label);
    } catch (error) {
      console.error("Error updating global label:", error);
      return handleApiError(error, res);
    }
  });

  app.delete('/api/config/labels/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteGlobalLabel(req.params.id);
      res.json({ message: "Global label deleted successfully" });
    } catch (error) {
      console.error("Error deleting global label:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PASTORAL QUESTIONS - "I Have Questions" from onboarding (Pastoral/Admin only)
  // ==========================================================================

  app.get('/api/pastoral-questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only pastoral roles can view all questions (owner, pastor, lead-pastor, board-of-elders)
      // Note: 'admin' is excluded - they have system control but no pastoral authority
      if (!user || !isPastor(user.role)) {
        return res.status(403).json({ message: "Unauthorized - pastoral access required" });
      }
      
      const { status } = req.query;
      const questions = await storage.getPastoralQuestions(status as string | undefined);
      
      // Enrich with user details
      const enrichedQuestions = await Promise.all(questions.map(async (q) => {
        const questionUser = await storage.getUser(q.userId);
        return {
          ...q,
          userName: questionUser ? `${questionUser.firstName} ${questionUser.lastName}` : 'Unknown',
          userEmail: questionUser?.email,
          userProfileImage: questionUser?.profileImageUrl,
        };
      }));
      
      res.json(enrichedQuestions);
    } catch (error) {
      console.error("Error fetching pastoral questions:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/pastoral-questions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isPastor(user.role)) {
        return res.status(403).json({ message: "Unauthorized - pastoral access required" });
      }
      
      const question = await storage.getPastoralQuestion(req.params.id);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const questionUser = await storage.getUser(question.userId);
      res.json({
        ...question,
        userName: questionUser ? `${questionUser.firstName} ${questionUser.lastName}` : 'Unknown',
        userEmail: questionUser?.email,
      });
    } catch (error) {
      console.error("Error fetching pastoral question:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/pastoral-questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const question = await storage.createPastoralQuestion({
        ...req.body,
        userId,
      });
      res.status(201).json(question);
    } catch (error) {
      console.error("Error creating pastoral question:", error);
      return handleApiError(error, res);
    }
  });

  app.patch('/api/pastoral-questions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isPastor(user.role)) {
        return res.status(403).json({ message: "Unauthorized - pastoral access required" });
      }
      
      const question = await storage.updatePastoralQuestion(req.params.id, {
        ...req.body,
        resolvedBy: req.body.status === 'resolved' ? userId : undefined,
        resolvedAt: req.body.status === 'resolved' ? new Date() : undefined,
      });
      res.json(question);
    } catch (error) {
      console.error("Error updating pastoral question:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PASTORAL CARE DASHBOARD
  // ==========================================================================

  app.get('/api/pastoral-care/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isPastor(user.role)) {
        return res.status(403).json({ message: "Unauthorized - pastoral access required" });
      }
      
      const pendingQuestions = await storage.getPastoralQuestions('pending');
      const resolvedQuestions = await storage.getPastoralQuestions('resolved');
      const allUsers = await storage.getAllUsers();
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const newMembersThisMonth = allUsers.filter(u => 
        u.createdAt && new Date(u.createdAt) >= thirtyDaysAgo
      ).length;
      
      const onboardingInProgress = allUsers.filter(u => 
        u.onboardingState && u.onboardingState !== 'DONE'
      ).length;
      
      res.json({
        pendingQuestions: pendingQuestions.length,
        resolvedQuestions: resolvedQuestions.length,
        newMembersThisMonth,
        onboardingInProgress,
        totalMembers: allUsers.length,
      });
    } catch (error) {
      console.error("Error fetching pastoral care dashboard:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // ENHANCED SERVING METRICS WITH INTERPRETATION
  // ==========================================================================

  app.get('/api/serving-records/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const metrics = await storage.getServingMetricsWithInterpretation(userId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching serving metrics:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/team-serving-health', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isLeader(user.role)) {
        return res.status(403).json({ message: "Unauthorized - leadership access required" });
      }
      
      const { ministryId } = req.query;
      const health = await storage.getTeamServingHealth(userId, ministryId as string | undefined);
      res.json(health);
    } catch (error) {
      console.error("Error fetching team serving health:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // MEMBER FEEDBACK (Encouragement Loop)
  // ==========================================================================

  app.get('/api/member-feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const feedback = await storage.getMemberFeedback(userId);
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching member feedback:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/member-feedback/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadFeedbackCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread feedback count:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/member-feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isLeader(user.role)) {
        return res.status(403).json({ message: "Unauthorized - leadership access required" });
      }
      
      const feedback = await storage.createMemberFeedback({
        ...req.body,
        leaderId: userId,
      });
      res.status(201).json(feedback);
    } catch (error) {
      console.error("Error creating member feedback:", error);
      return handleApiError(error, res);
    }
  });

  app.patch('/api/member-feedback/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      await storage.markFeedbackAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking feedback as read:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // MEMBER HEALTH INDICATORS
  // ==========================================================================

  app.get('/api/member-health/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isLeader(user.role)) {
        return res.status(403).json({ message: "Unauthorized - leadership access required" });
      }
      
      const health = await storage.getMemberHealthIndicators(req.params.memberId);
      res.json(health);
    } catch (error) {
      console.error("Error fetching member health:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // MINISTRY JOIN REQUESTS
  // ==========================================================================

  app.get('/api/ministry-join-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      const { status, ministryId } = req.query;
      
      // Leaders can see requests for their ministries
      if (!user || !isLeader(user.role)) {
        // Regular users can only see their own requests
        const userRequests = await storage.getUserJoinRequests(userId);
        return res.json(userRequests);
      }
      
      let requests = await storage.getMinistryJoinRequests(status as string | undefined);
      
      // Filter by ministry if specified
      if (ministryId) {
        requests = requests.filter(r => r.ministryId === ministryId);
      }
      
      // Enrich with user and ministry details
      const enrichedRequests = await Promise.all(requests.map(async (r) => {
        const requestUser = await storage.getUser(r.userId);
        const ministry = await storage.getMinistry(r.ministryId);
        return {
          ...r,
          userName: requestUser ? `${requestUser.firstName} ${requestUser.lastName}` : 'Unknown',
          userEmail: requestUser?.email,
          userProfileImage: requestUser?.profileImageUrl,
          ministryName: ministry?.name || 'Unknown',
        };
      }));
      
      res.json(enrichedRequests);
    } catch (error) {
      console.error("Error fetching ministry join requests:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/ministry-join-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const request = await storage.createMinistryJoinRequest({
        ...req.body,
        userId,
      });
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating ministry join request:", error);
      return handleApiError(error, res);
    }
  });

  app.patch('/api/ministry-join-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isLeader(user.role)) {
        return res.status(403).json({ message: "Unauthorized - leadership access required" });
      }
      
      const request = await storage.updateMinistryJoinRequest(req.params.id, {
        ...req.body,
        reviewedBy: userId,
        reviewedAt: new Date(),
      });
      res.json(request);
    } catch (error) {
      console.error("Error updating ministry join request:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PEOPLE MANAGEMENT - Leaders see their assigned people
  // ==========================================================================

  app.get('/api/my-team-members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assignedUsers = await storage.getUsersAssignedToLeader(userId);
      res.json(assignedUsers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/users-with-details', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isAdmin(user.role)) {
        return res.status(403).json({ message: "Unauthorized - admin access required" });
      }
      
      const usersWithDetails = await storage.getUsersWithMinistryDetails();
      res.json(usersWithDetails);
    } catch (error) {
      console.error("Error fetching users with details:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PHASE 7: WORKBOARDS - Collaboration Tool
  // ==========================================================================

  app.get('/api/workboards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ministryId, status } = req.query;
      
      const workboards = await storage.getWorkboards({
        ministryId: ministryId as string,
        status: status as string,
      });
      
      // Filter to show boards where user is participant, creator, or leader
      res.json(workboards);
    } catch (error) {
      console.error("Error fetching workboards:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/workboards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const workboard = await storage.getWorkboard(req.params.id);
      if (!workboard) {
        return res.status(404).json({ message: "Workboard not found" });
      }
      res.json(workboard);
    } catch (error) {
      console.error("Error fetching workboard:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/workboards', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isLeader(user.role)) {
        return res.status(403).json({ message: "Unauthorized - leader access required" });
      }
      
      const workboard = await storage.createWorkboard({
        ...req.body,
        createdBy: userId,
      });
      res.status(201).json(workboard);
    } catch (error) {
      console.error("Error creating workboard:", error);
      return handleApiError(error, res);
    }
  });

  app.patch('/api/workboards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const workboard = await storage.updateWorkboard(req.params.id, req.body);
      res.json(workboard);
    } catch (error) {
      console.error("Error updating workboard:", error);
      return handleApiError(error, res);
    }
  });

  app.delete('/api/workboards/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteWorkboard(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting workboard:", error);
      return handleApiError(error, res);
    }
  });

  // Action Items
  app.get('/api/workboards/:workboardId/items', isAuthenticated, async (req: any, res) => {
    try {
      const items = await storage.getActionItems(req.params.workboardId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching action items:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/workboards/:workboardId/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const item = await storage.createActionItem({
        ...req.body,
        workboardId: req.params.workboardId,
        createdBy: userId,
      });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating action item:", error);
      return handleApiError(error, res);
    }
  });

  app.patch('/api/action-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const item = await storage.updateActionItem(req.params.id, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating action item:", error);
      return handleApiError(error, res);
    }
  });

  app.delete('/api/action-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteActionItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting action item:", error);
      return handleApiError(error, res);
    }
  });

  // Action Item Comments
  app.get('/api/action-items/:itemId/comments', isAuthenticated, async (req: any, res) => {
    try {
      const comments = await storage.getActionItemComments(req.params.itemId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/action-items/:itemId/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const comment = await storage.createActionItemComment({
        ...req.body,
        actionItemId: req.params.itemId,
        authorId: userId,
      });
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PHASE 5: MEETING EMAIL FUNCTIONS
  // ==========================================================================

  // Send meeting agenda email (or get fallback content)
  app.post('/api/workboards/:id/send-agenda', isAuthenticated, requireLeader, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workboard = await storage.getWorkboard(req.params.id);
      
      if (!workboard) {
        return res.status(404).json({ message: "Workboard not found" });
      }

      // Get action items for agenda
      const actionItems = await storage.getActionItems(req.params.id);
      const agendaItems = actionItems
        .filter((item: any) => item.status === 'pending')
        .map((item: any) => item.content);

      // Get ministry name if applicable
      let ministryName: string | undefined;
      if (workboard.ministryId) {
        const ministry = await storage.getMinistry(workboard.ministryId);
        ministryName = ministry?.name;
      }

      // Get organizer info
      const organizer = await storage.getUser(userId);

      // Build email data
      const emailData: MeetingEmailData = {
        meetingTitle: workboard.title,
        meetingDate: workboard.meetingDate 
          ? new Date(workboard.meetingDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          : 'TBD',
        location: workboard.location || undefined,
        ministryName,
        organizer: organizer ? { firstName: organizer.firstName, lastName: organizer.lastName } : undefined,
        agenda: agendaItems,
      };

      // Get recipients from request body or default to empty
      const { recipients } = req.body;
      
      if (recipients && recipients.length > 0) {
        // Try to send email
        const result = await sendMeetingAgendaEmail(emailData, recipients);
        res.json(result);
      } else {
        // Just generate content for copy/paste fallback
        const content = generateMeetingAgendaContent(emailData);
        res.json({
          success: false,
          error: "No recipients provided",
          fallbackContent: { text: content.text, subject: content.subject }
        });
      }
    } catch (error) {
      console.error("Error sending meeting agenda:", error);
      return handleApiError(error, res);
    }
  });

  // Send meeting recap email (or get fallback content)
  app.post('/api/workboards/:id/send-recap', isAuthenticated, requireLeader, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const workboard = await storage.getWorkboard(req.params.id);
      
      if (!workboard) {
        return res.status(404).json({ message: "Workboard not found" });
      }

      // Get action items
      const actionItems = await storage.getActionItems(req.params.id);
      
      // Parse decisions from workboard notes or separate field
      const decisions = workboard.decisions 
        ? (Array.isArray(workboard.decisions) ? workboard.decisions as string[] : [])
        : [];

      // Format action items with assignee names
      const formattedActionItems = await Promise.all(
        actionItems.map(async (item: any) => {
          let assigneeName: string | undefined;
          if (item.assigneeId) {
            const assignee = await storage.getUser(item.assigneeId);
            assigneeName = assignee 
              ? `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim()
              : undefined;
          }
          return {
            description: item.content,
            assignee: assigneeName,
            dueDate: item.dueDate ? new Date(item.dueDate).toLocaleDateString() : undefined,
          };
        })
      );

      // Get ministry name if applicable
      let ministryName: string | undefined;
      if (workboard.ministryId) {
        const ministry = await storage.getMinistry(workboard.ministryId);
        ministryName = ministry?.name;
      }

      // Get organizer info
      const organizer = await storage.getUser(userId);

      // Build email data
      const emailData: MeetingEmailData = {
        meetingTitle: workboard.title,
        meetingDate: workboard.meetingDate 
          ? new Date(workboard.meetingDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          : 'TBD',
        location: workboard.location || undefined,
        ministryName,
        organizer: organizer ? { firstName: organizer.firstName, lastName: organizer.lastName } : undefined,
        notes: workboard.notes || undefined,
        decisions,
        actionItems: formattedActionItems,
      };

      // Get recipients from request body or default to empty
      const { recipients } = req.body;
      
      if (recipients && recipients.length > 0) {
        // Try to send email
        const result = await sendMeetingRecapEmail(emailData, recipients);
        res.json(result);
      } else {
        // Just generate content for copy/paste fallback
        const content = generateMeetingRecapContent(emailData);
        res.json({
          success: false,
          error: "No recipients provided",
          fallbackContent: { text: content.text, subject: content.subject }
        });
      }
    } catch (error) {
      console.error("Error sending meeting recap:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PHASE 7: SERVING METRICS
  // ==========================================================================

  app.get('/api/serving/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { daysBack } = req.query;
      const metrics = await storage.getServingMetrics(userId, daysBack ? parseInt(daysBack as string) : 90);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching serving metrics:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/serving/records', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { daysBack } = req.query;
      const records = await storage.getServingRecords(userId, daysBack ? parseInt(daysBack as string) : 90);
      res.json(records);
    } catch (error) {
      console.error("Error fetching serving records:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/serving/records', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isLeader(user.role)) {
        return res.status(403).json({ message: "Unauthorized - leader access required" });
      }
      
      const record = await storage.createServingRecord({
        ...req.body,
        scheduledBy: userId,
      });
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating serving record:", error);
      return handleApiError(error, res);
    }
  });

  app.patch('/api/serving/records/:id', isAuthenticated, async (req: any, res) => {
    try {
      const record = await storage.updateServingRecord(req.params.id, req.body);
      res.json(record);
    } catch (error) {
      console.error("Error updating serving record:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PHASE 7: LEADER NOTES
  // ==========================================================================

  app.get('/api/leader-notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { memberId } = req.query;
      const notes = await storage.getLeaderNotes(userId, memberId as string);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching leader notes:", error);
      return handleApiError(error, res);
    }
  });

  app.post('/api/leader-notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isLeader(user.role)) {
        return res.status(403).json({ message: "Unauthorized - leader access required" });
      }
      
      const note = await storage.createLeaderNote({
        ...req.body,
        leaderId: userId,
      });
      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating leader note:", error);
      return handleApiError(error, res);
    }
  });

  app.patch('/api/leader-notes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const note = await storage.updateLeaderNote(req.params.id, req.body);
      res.json(note);
    } catch (error) {
      console.error("Error updating leader note:", error);
      return handleApiError(error, res);
    }
  });

  app.delete('/api/leader-notes/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteLeaderNote(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting leader note:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PHASE 7: USER MINISTRIES WITH LEADERS (for "Who I Report To" display)
  // ==========================================================================

  app.get('/api/my-ministries-with-leaders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const ministriesWithLeaders = await storage.getUserMinistriesWithLeaders(userId);
      res.json(ministriesWithLeaders);
    } catch (error) {
      console.error("Error fetching ministries with leaders:", error);
      return handleApiError(error, res);
    }
  });

  // Get fellow team members in user's ministries (for member dashboard)
  app.get('/api/my-fellow-team-members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user's ministry assignments (getUserRoleAssignments returns active assignments for this user)
      const myAssignments = await storage.getUserRoleAssignments(userId);
      const activeAssignments = myAssignments.filter(a => a.isActive);
      
      if (activeAssignments.length === 0) {
        return res.json([]);
      }
      
      // Get all ministries and their members
      const ministries = await storage.getMinistries();
      const result: Array<{
        ministryId: string;
        ministryName: string;
        members: Array<{ id: string; firstName: string; lastName: string; profilePhotoUrl?: string | null; role?: string | null }>;
      }> = [];
      
      for (const assignment of activeAssignments) {
        const ministry = ministries.find(m => m.id === assignment.ministryId);
        if (!ministry) continue;
        
        // Get all members of this ministry
        const ministryMembers = await storage.getMinistryMembers(assignment.ministryId);
        
        // Get user details for each member (excluding current user)
        const memberDetails = await Promise.all(
          ministryMembers
            .filter(m => m.userId !== userId)
            .map(async (m) => {
              const member = await storage.getUser(m.userId);
              return member ? {
                id: member.id,
                firstName: member.firstName || '',
                lastName: member.lastName || '',
                profilePhotoUrl: member.profileImageUrl,
                role: m.roleName || m.roleType,
              } : null;
            })
        );
        
        result.push({
          ministryId: ministry.id,
          ministryName: ministry.name,
          members: memberDetails.filter(Boolean) as any,
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching fellow team members:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PHASE 7: OVERSIGHT DATA FOR LEADERS/PASTORS
  // ==========================================================================

  app.get('/api/oversight/my-people', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isLeader(user.role)) {
        return res.status(403).json({ message: "Unauthorized - leader access required" });
      }
      
      const assignedUsers = await storage.getUsersAssignedToLeader(userId);
      
      // Enrich with additional data
      const enrichedUsers = await Promise.all(assignedUsers.map(async (u) => {
        const trainingProgress = await storage.getUserTrainingProgress(u.id);
        const backgroundCheck = await storage.getBackgroundCheck(u.id);
        const assignments = await storage.getUserRoleAssignments(u.id);
        
        const requiredRemaining = trainingProgress.filter(
          tp => tp.status !== 'COMPLETE'
        ).length;
        
        return {
          ...u,
          requiredTrainingsRemaining: requiredRemaining,
          backgroundCheckStatus: backgroundCheck?.status || 'not-started',
          lastActivity: u.updatedAt,
          ministries: assignments.filter(a => a.isActive).map(a => a.ministryId),
        };
      }));
      
      res.json(enrichedUsers);
    } catch (error) {
      console.error("Error fetching oversight data:", error);
      return handleApiError(error, res);
    }
  });

  app.get('/api/oversight/pastoral', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !isPastor(user.role)) {
        return res.status(403).json({ message: "Unauthorized - pastoral access required" });
      }
      
      // Get all leaders with their people counts
      const allUsers = await storage.getAllUsers();
      const leaders = allUsers.filter(u => isLeader(u.role));
      
      const leaderStats = await Promise.all(leaders.map(async (leader) => {
        const assignedUsers = await storage.getUsersAssignedToLeader(leader.id);
        return {
          id: leader.id,
          name: `${leader.firstName} ${leader.lastName}`,
          role: leader.role,
          assignedPeopleCount: assignedUsers.length,
        };
      }));
      
      // Get pending pastoral questions
      const pendingQuestions = await storage.getPastoralQuestions('pending');
      
      // Get pending join requests
      const pendingRequests = await storage.getMinistryJoinRequests('pending');
      
      // Get users stuck in onboarding
      const stuckUsers = allUsers.filter(u => 
        u.onboardingState && 
        u.onboardingState !== 'DONE' &&
        u.onboardingState !== 'NOT_STARTED'
      );
      
      res.json({
        leaders: leaderStats,
        unresolvedQuestions: pendingQuestions.length,
        pendingJoinRequests: pendingRequests.length,
        usersStuckInOnboarding: stuckUsers.length,
        stuckUsers: stuckUsers.map(u => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          onboardingState: u.onboardingState,
        })),
      });
    } catch (error) {
      console.error("Error fetching pastoral oversight data:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PHASE 7: ORGANIZATION SETTINGS (BRANDING & CONFIG)
  // ==========================================================================

  // Get organization settings (public - for branding display)
  app.get('/api/org/settings', async (req, res) => {
    try {
      let settings = await storage.getOrgSettings();
      
      // If no settings exist, return defaults
      if (!settings) {
        settings = {
          id: 'default',
          organizationName: 'Garden City Church',
          tagline: null,
          primaryColor: '#3B82F6',
          secondaryColor: '#10B981',
          accentColor: '#F59E0B',
          logoUrl: null,
          faviconUrl: null,
          email: null,
          phone: null,
          address: null,
          website: null,
          facebookUrl: null,
          instagramUrl: null,
          youtubeUrl: null,
          twitterUrl: null,
          enableOnboarding: true,
          enableTraining: true,
          enableRewards: true,
          enableTeamCenter: true,
          enableBackgroundChecks: true,
          outlookIntegrationEnabled: false,
          emailIntegrationEnabled: false,
          outlookTenantId: null,
          outlookClientId: null,
          outlookSelectedCalendars: [],
          outlookRoomCalendars: [],
          outlookSyncIntervalMinutes: 15,
          outlookLastSyncAt: null,
          updatedBy: null,
          updatedAt: null,
          createdAt: null,
        };
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching org settings:", error);
      return handleApiError(error, res);
    }
  });

  // Update organization settings (admin only)
  app.put('/api/org/settings', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const admin = req.authenticatedUser;
      const settingsSchema = z.object({
        organizationName: z.string().optional(),
        tagline: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        accentColor: z.string().optional(),
        logoUrl: z.string().optional(),
        faviconUrl: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        website: z.string().url().optional(),
        facebookUrl: z.string().url().optional(),
        instagramUrl: z.string().url().optional(),
        youtubeUrl: z.string().url().optional(),
        twitterUrl: z.string().url().optional(),
        enableOnboarding: z.boolean().optional(),
        enableTraining: z.boolean().optional(),
        enableRewards: z.boolean().optional(),
        enableTeamCenter: z.boolean().optional(),
        enableBackgroundChecks: z.boolean().optional(),
        outlookIntegrationEnabled: z.boolean().optional(),
        emailIntegrationEnabled: z.boolean().optional(),
      });

      const validated = settingsSchema.parse(req.body);
      const settings = await storage.upsertOrgSettings({
        ...validated,
        updatedBy: admin.id,
      });
      
      console.log(`[Org Settings] Admin ${admin.id} updated organization settings`);
      res.json(settings);
    } catch (error) {
      console.error("Error updating org settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Get feature flags (for frontend feature visibility)
  app.get('/api/org/features', async (req, res) => {
    try {
      const settings = await storage.getOrgSettings();
      
      res.json({
        onboarding: settings?.enableOnboarding ?? true,
        training: settings?.enableTraining ?? true,
        rewards: settings?.enableRewards ?? true,
        teamCenter: settings?.enableTeamCenter ?? true,
        backgroundChecks: settings?.enableBackgroundChecks ?? true,
        outlookIntegration: settings?.outlookIntegrationEnabled ?? false,
        emailIntegration: settings?.emailIntegrationEnabled ?? false,
      });
    } catch (error) {
      console.error("Error fetching feature flags:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PHASE 6: OUTLOOK 365 INTEGRATION SETTINGS
  // ==========================================================================

  // Get Outlook integration settings (admin only)
  app.get('/api/org/outlook-settings', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getOrgSettings();
      
      // Return Outlook-specific settings (never expose client secret)
      res.json({
        enabled: settings?.outlookIntegrationEnabled ?? false,
        tenantId: settings?.outlookTenantId || '',
        clientId: settings?.outlookClientId || '',
        // Secret is stored in env vars, show if configured
        clientSecretConfigured: !!process.env.OUTLOOK_CLIENT_SECRET,
        selectedCalendars: settings?.outlookSelectedCalendars || [],
        roomCalendars: settings?.outlookRoomCalendars || [],
        syncIntervalMinutes: settings?.outlookSyncIntervalMinutes || 15,
        lastSyncAt: settings?.outlookLastSyncAt || null,
      });
    } catch (error) {
      console.error("Error fetching Outlook settings:", error);
      return handleApiError(error, res);
    }
  });

  // Update Outlook integration settings (admin only)
  app.put('/api/org/outlook-settings', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const admin = req.authenticatedUser;
      
      const outlookSchema = z.object({
        outlookIntegrationEnabled: z.boolean().optional(),
        outlookTenantId: z.string().optional(),
        outlookClientId: z.string().optional(),
        outlookSelectedCalendars: z.array(z.string()).optional(),
        outlookRoomCalendars: z.array(z.string()).optional(),
        outlookSyncIntervalMinutes: z.number().min(5).max(60).optional(),
      });

      const validated = outlookSchema.parse(req.body);
      const settings = await storage.upsertOrgSettings({
        ...validated,
        updatedBy: admin.id,
      });
      
      console.log(`[Outlook Settings] Admin ${admin.id} updated Outlook integration settings`);
      
      res.json({
        enabled: settings?.outlookIntegrationEnabled ?? false,
        tenantId: settings?.outlookTenantId || '',
        clientId: settings?.outlookClientId || '',
        clientSecretConfigured: !!process.env.OUTLOOK_CLIENT_SECRET,
        selectedCalendars: settings?.outlookSelectedCalendars || [],
        roomCalendars: settings?.outlookRoomCalendars || [],
        syncIntervalMinutes: settings?.outlookSyncIntervalMinutes || 15,
        lastSyncAt: settings?.outlookLastSyncAt || null,
      });
    } catch (error) {
      console.error("Error updating Outlook settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Test Outlook connection (admin only)
  app.post('/api/org/outlook-test', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getOrgSettings();
      
      if (!settings?.outlookTenantId || !settings?.outlookClientId) {
        return res.status(400).json({ 
          success: false, 
          message: "Outlook is not configured. Please enter your Tenant ID and Client ID first.",
          setupRequired: true
        });
      }

      if (!process.env.OUTLOOK_CLIENT_SECRET) {
        return res.status(400).json({ 
          success: false, 
          message: "Outlook Client Secret is not configured. Please add OUTLOOK_CLIENT_SECRET to your environment variables.",
          setupRequired: true
        });
      }

      // Test actual Microsoft Graph connection
      const outlook = await import('./outlook');
      const result = await outlook.testOutlookConnection();
      res.json(result);
    } catch (error) {
      console.error("Error testing Outlook connection:", error);
      res.status(500).json({ success: false, message: "Failed to test Outlook connection" });
    }
  });

  // Get Outlook setup instructions
  app.get('/api/org/outlook-setup-guide', isAuthenticated, requireAdmin, async (req: any, res) => {
    res.json({
      title: "Outlook 365 Integration Setup",
      steps: [
        {
          step: 1,
          title: "Create Azure AD App Registration",
          description: "Go to Azure Portal > Azure Active Directory > App registrations > New registration",
          details: [
            "Name: MinistryPath Calendar Integration",
            "Supported account types: Single tenant (your organization)",
            "Redirect URI: Leave blank for now (not needed for app-only auth)"
          ]
        },
        {
          step: 2,
          title: "Configure API Permissions",
          description: "In your app registration, go to API Permissions",
          details: [
            "Add: Microsoft Graph > Application permissions",
            "Calendars.Read - Read calendars in all mailboxes",
            "Calendars.Read.Shared - Read shared calendars",
            "Place.Read.All - Read room/resource lists",
            "Grant admin consent for your organization"
          ]
        },
        {
          step: 3,
          title: "Create Client Secret",
          description: "In your app registration, go to Certificates & secrets",
          details: [
            "Click 'New client secret'",
            "Set description: MinistryPath Integration",
            "Set expiration (24 months recommended)",
            "Copy the secret value immediately (it won't be shown again)"
          ]
        },
        {
          step: 4,
          title: "Copy Your Credentials",
          description: "From the app registration Overview page, copy:",
          details: [
            "Application (client) ID → Enter as Client ID below",
            "Directory (tenant) ID → Enter as Tenant ID below"
          ]
        },
        {
          step: 5,
          title: "Add Client Secret to Environment",
          description: "Add the secret to your Replit environment variables",
          details: [
            "Variable name: OUTLOOK_CLIENT_SECRET",
            "Variable value: (paste your client secret)"
          ]
        }
      ],
      requiredPermissions: [
        "Calendars.Read",
        "Calendars.Read.Shared", 
        "Place.Read.All"
      ],
      note: "After setup, MinistryPath will be able to read your church calendars and room availability. Events created in MinistryPath (like room bookings) will sync to Outlook."
    });
  });

  // Get Outlook calendar events (authenticated users)
  app.get('/api/outlook/events', isAuthenticated, async (req: any, res) => {
    try {
      const { start, end, category, ministryId } = req.query;
      
      if (!start || !end) {
        return res.status(400).json({ message: "start and end query parameters are required" });
      }
      
      const outlook = await import('./outlook');
      const events = await outlook.getOutlookEvents(
        start as string, 
        end as string, 
        { category: category as string, ministryId: ministryId as string }
      );
      
      if (events === null) {
        return res.status(503).json({ message: "Outlook integration not configured or unavailable" });
      }
      
      res.json(events);
    } catch (error) {
      console.error("Error fetching Outlook events:", error);
      return handleApiError(error, res);
    }
  });

  // Get available rooms from Outlook
  app.get('/api/outlook/rooms', isAuthenticated, async (req: any, res) => {
    try {
      const outlook = await import('./outlook');
      const rooms = await outlook.getRoomCalendars();
      
      if (rooms === null) {
        return res.status(503).json({ message: "Outlook integration not configured" });
      }
      
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching Outlook rooms:", error);
      return handleApiError(error, res);
    }
  });

  // Check room availability
  app.get('/api/outlook/rooms/:roomId/availability', isAuthenticated, async (req: any, res) => {
    try {
      const { roomId } = req.params;
      const { start, end } = req.query;
      
      if (!start || !end) {
        return res.status(400).json({ message: "start and end query parameters are required" });
      }
      
      const outlook = await import('./outlook');
      const events = await outlook.getRoomAvailability(
        decodeURIComponent(roomId), 
        start as string, 
        end as string
      );
      
      if (events === null) {
        return res.status(503).json({ message: "Outlook integration not available" });
      }
      
      res.json({ 
        roomId, 
        events,
        available: events.length === 0 
      });
    } catch (error) {
      console.error("Error checking room availability:", error);
      return handleApiError(error, res);
    }
  });

  // Book a room via Outlook (leader+ only)
  app.post('/api/outlook/rooms/:roomId/book', isAuthenticated, requireLeader, async (req: any, res) => {
    try {
      const { roomId } = req.params;
      const user = req.authenticatedUser;
      
      const bookingSchema = z.object({
        title: z.string().min(1),
        start: z.string(),
        end: z.string(),
        description: z.string().optional(),
      });
      
      const validated = bookingSchema.parse(req.body);
      
      const outlook = await import('./outlook');
      const result = await outlook.bookRoom(
        decodeURIComponent(roomId),
        {
          ...validated,
          organizerEmail: user.email,
        }
      );
      
      if (!result.success) {
        return res.status(400).json({ message: result.message || "Failed to book room" });
      }
      
      console.log(`[Outlook] User ${user.id} booked room ${roomId} for "${validated.title}"`);
      res.json({ success: true, event: result.event });
    } catch (error) {
      console.error("Error booking room:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // PHASE 9: HELP CENTER
  // ==========================================================================

  // Get all help articles (with optional category filter)
  app.get('/api/help/articles', async (req, res) => {
    try {
      const { category } = req.query;
      const articles = await storage.getHelpArticles(category as string | undefined);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching help articles:", error);
      return handleApiError(error, res);
    }
  });

  // Get help categories with article counts
  app.get('/api/help/categories', async (req, res) => {
    try {
      const articles = await storage.getHelpArticles();
      const categoryCounts: Record<string, number> = {};
      
      articles.forEach(a => {
        const cat = a.category || 'faq';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
      
      const categories = [
        { id: 'getting-started', name: 'Getting Started', count: categoryCounts['getting-started'] || 0 },
        { id: 'onboarding', name: 'Onboarding', count: categoryCounts['onboarding'] || 0 },
        { id: 'training', name: 'Training', count: categoryCounts['training'] || 0 },
        { id: 'team-center', name: 'Team Center', count: categoryCounts['team-center'] || 0 },
        { id: 'calendar', name: 'Calendar & Events', count: categoryCounts['calendar'] || 0 },
        { id: 'profile', name: 'Profile', count: categoryCounts['profile'] || 0 },
        { id: 'admin', name: 'Administration', count: categoryCounts['admin'] || 0 },
        { id: 'troubleshooting', name: 'Troubleshooting', count: categoryCounts['troubleshooting'] || 0 },
        { id: 'faq', name: 'FAQ', count: categoryCounts['faq'] || 0 },
      ];
      
      res.json(categories);
    } catch (error) {
      console.error("Error fetching help categories:", error);
      return handleApiError(error, res);
    }
  });

  // Search help articles
  app.get('/api/help/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.json([]);
      }
      const articles = await storage.searchHelpArticles(q);
      res.json(articles);
    } catch (error) {
      console.error("Error searching help articles:", error);
      return handleApiError(error, res);
    }
  });

  // Get single help article by slug
  app.get('/api/help/articles/:slug', async (req, res) => {
    try {
      const { slug } = req.params;
      const article = await storage.getHelpArticleBySlug(slug);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      
      // Increment view count
      await storage.incrementHelpArticleViews(article.id);
      
      res.json(article);
    } catch (error) {
      console.error("Error fetching help article:", error);
      return handleApiError(error, res);
    }
  });

  // Create help article (admin only)
  app.post('/api/help/articles', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const admin = req.authenticatedUser;
      const articleSchema = z.object({
        title: z.string().min(1),
        slug: z.string().min(1),
        summary: z.string().optional(),
        content: z.string().min(1),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        targetRoles: z.array(z.string()).optional(),
        sortOrder: z.number().optional(),
        isPublished: z.boolean().optional(),
      });

      const validated = articleSchema.parse(req.body);
      const article = await storage.createHelpArticle({
        ...validated,
        createdBy: admin.id,
      });
      res.json(article);
    } catch (error) {
      console.error("Error creating help article:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Update help article (admin only)
  app.put('/api/help/articles/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const admin = req.authenticatedUser;
      const { id } = req.params;
      const articleSchema = z.object({
        title: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        summary: z.string().optional(),
        content: z.string().min(1).optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        targetRoles: z.array(z.string()).optional(),
        sortOrder: z.number().optional(),
        isPublished: z.boolean().optional(),
      });

      const validated = articleSchema.parse(req.body);
      const article = await storage.updateHelpArticle(id, {
        ...validated,
        updatedBy: admin.id,
      });
      res.json(article);
    } catch (error) {
      console.error("Error updating help article:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      return handleApiError(error, res);
    }
  });

  // Delete help article (admin only)
  app.delete('/api/help/articles/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteHelpArticle(req.params.id);
      res.json({ message: "Article deleted" });
    } catch (error) {
      console.error("Error deleting help article:", error);
      return handleApiError(error, res);
    }
  });

  // ==========================================================================
  // DEV TOOLS: ROUTE AUDIT UTILITY
  // ==========================================================================
  
  // Route audit endpoint - verifies help center relatedLinks against valid routes
  app.get('/api/dev/route-audit', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      // Valid client routes (from App.tsx)
      const validRoutes = new Set([
        '/',
        '/dashboard',
        '/profile',
        '/survey',
        '/results',
        '/trainings',
        '/my-path',
        '/my-discipleship', // legacy redirect
        '/journey',
        '/progress',
        '/discipleship',
        '/my-progress',
        '/my-roles',
        '/teams',
        '/messages',
        '/manuals',
        '/resources',
        '/help',
        '/requests',
        '/meetings',
        '/about',
        '/onboarding',
        '/leadership',
        '/leadership/people',
        '/leadership/ministries',
        '/leadership/trainings',
        '/leadership/requests',
        '/leadership/rooms',
        '/leadership/metrics',
        '/leadership/interns',
        '/leadership/meetings',
        '/leadership/my-team',
        '/leadership/workboards',
        '/leadership/pastoral-care',
        '/leadership/invites',
        '/leadership/admin',
      ]);

      // Help center article links (hardcoded since they're client-side)
      const helpArticleLinks = [
        { articleId: 'welcome-to-gcc', path: '/profile' },
        { articleId: 'welcome-to-gcc', path: '/survey' },
        { articleId: 'welcome-to-gcc', path: '/about' },
        { articleId: 'completing-onboarding', path: '/onboarding' },
        { articleId: 'completing-onboarding', path: '/profile' },
        { articleId: 'setting-up-profile', path: '/profile' },
        { articleId: 'exploring-ministries', path: '/about' },
        { articleId: 'exploring-ministries', path: '/survey' },
        { articleId: 'exploring-ministries', path: '/results' },
        { articleId: 'required-trainings', path: '/trainings' },
        { articleId: 'required-trainings', path: '/dashboard' },
        { articleId: 'completing-training', path: '/trainings' },
        { articleId: 'completing-training', path: '/my-path' },
        { articleId: 'review-mode', path: '/trainings' },
        { articleId: 'discipleship-pathway', path: '/my-path' },
        { articleId: 'discipleship-pathway', path: '/dashboard' },
        { articleId: 'next-night-class', path: '/my-path' },
        { articleId: 'next-night-class', path: '/meetings' },
        { articleId: 'using-workboards', path: '/leadership/workboards' },
        { articleId: 'meeting-management', path: '/leadership/meetings' },
        { articleId: 'meeting-management', path: '/leadership/workboards' },
        { articleId: 'understanding-health-indicators', path: '/dashboard' },
        { articleId: 'serve-rate-explained', path: '/dashboard' },
        { articleId: 'serve-rate-explained', path: '/meetings' },
        { articleId: 'spiritual-gifts-survey', path: '/survey' },
        { articleId: 'spiritual-gifts-survey', path: '/results' },
        { articleId: 'biblical-formation', path: '/results' },
        { articleId: 'biblical-formation', path: '/my-path' },
        { articleId: 'managing-manuals', path: '/resources' },
        { articleId: 'managing-manuals', path: '/leadership/admin' },
        { articleId: 'generating-trainings', path: '/leadership/trainings' },
        { articleId: 'generating-trainings', path: '/leadership/admin' },
        { articleId: 'understanding-roles', path: '/leadership/people' },
        { articleId: 'getting-help', path: '/requests' },
        { articleId: 'getting-help', path: '/dashboard' },
      ];

      const missingRoutes: Array<{ articleId: string; path: string }> = [];
      const validLinks: Array<{ articleId: string; path: string }> = [];

      for (const link of helpArticleLinks) {
        if (validRoutes.has(link.path)) {
          validLinks.push(link);
        } else {
          missingRoutes.push(link);
        }
      }

      res.json({
        totalLinks: helpArticleLinks.length,
        validLinks: validLinks.length,
        missingRoutes: missingRoutes.length,
        issues: missingRoutes,
        validRoutes: Array.from(validRoutes).sort(),
      });
    } catch (error) {
      console.error("Error running route audit:", error);
      return handleApiError(error, res);
    }
  });

  // Register additional route handlers
  registerCalendarCategoryRoutes(app);

  // Seed sample data if none exist
  seedAdminUser();
  seedSampleManuals();
  seedSampleBadges();
  seedSampleRooms();
  seedDefaultCalendarCategories();
  seedHelpArticles();
  seedCoreData();

  return httpServer;
}

// Ministry manuals from attached_assets folder - the cornerstone of training
async function seedSampleManuals() {
  try {
    const existingManuals = await storage.getManuals();
    if (existingManuals.length > 0) return;

    // Get ministries to link manuals
    const ministries = await storage.getMinistries();
    const getMinistryId = (name: string) => ministries.find(m => 
      m.name.toLowerCase().includes(name.toLowerCase())
    )?.id;

    // Map of actual ministry manuals from attached_assets
    const ministryManuals = [
      {
        title: "City Youth Worship Manual",
        description: "Complete guide for youth worship team members covering rehearsal schedules, song preparation, and worship excellence.",
        category: "ministry-specific",
        fileUrl: "/assets/1_City_Youth_Worship_Manual_1765408866338.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 1,
      },
      {
        title: "CREW Manual",
        description: "Training manual for CREW team members with guidelines on serving, guest relations, and teamwork.",
        category: "ministry-specific",
        fileUrl: "/assets/2_CREW_Manual_1765408866338.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 2,
      },
      {
        title: "Live the Life, Tell the Story",
        description: "Foundational training on living out your faith and sharing your testimony effectively.",
        category: "onboarding",
        fileUrl: "/assets/3_Live_the_life._Tell_the_Story._1765408866339.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 3,
      },
      {
        title: "Intercessory Ministry Manual",
        description: "Comprehensive guide for prayer warriors covering intercessory prayer techniques and prayer room protocols.",
        category: "ministry-specific",
        fileUrl: "/assets/4_Intercessory_Ministry_Manual_(17_x_11_in)_1765408866339.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 4,
      },
      {
        title: "SERVE Booklet",
        description: "Overview of serving opportunities and volunteer expectations at Garden City Church.",
        category: "onboarding",
        fileUrl: "/assets/5_SERVE_Booklet_(Real_Estate_Flyer)_1765408866340.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 5,
      },
      {
        title: "CORE Minister Manual",
        description: "Essential training for CORE ministry team members on counseling, follow-up, and pastoral care.",
        category: "ministry-specific",
        fileUrl: "/assets/6_CORE_Minister_Manual_1765408910555.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 6,
      },
      {
        title: "Social Media Manual",
        description: "Guidelines for managing church social media presence, content creation, and brand standards.",
        category: "ministry-specific",
        fileUrl: "/assets/7_Social_Media_Manual_1765408910556.pdf",
        fileType: "pdf",
        isRequired: false,
        sortOrder: 7,
      },
      {
        title: "Usher Ministry Manual",
        description: "Training for ushers covering greeting, seating, offering collection, and emergency procedures.",
        category: "ministry-specific",
        fileUrl: "/assets/8_Usher_Ministry_Manual_(11x17)_1765408910556.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 8,
      },
      {
        title: "Celebrate Recovery Manual",
        description: "Complete guide for Celebrate Recovery leaders covering the 12-step program and support group facilitation.",
        category: "ministry-specific",
        fileUrl: "/assets/9_Celebrate_Recovery_Manual_(17_x_11_in)_1765408910557.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 9,
      },
      {
        title: "Facilities Ministry Manual",
        description: "Guidelines for facilities team members on building maintenance, setup, and safety protocols.",
        category: "ministry-specific",
        fileUrl: "/assets/10_Facilities_Ministry_Manual_(17_x_11_in)_1765408910557.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 10,
      },
      {
        title: "Board Member Guide",
        description: "Governance guide for church board members covering responsibilities, meetings, and decision-making.",
        category: "policies",
        fileUrl: "/assets/11_Board_Member_Guide_1765408937466.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 11,
      },
      {
        title: "Holy Spirit Class",
        description: "Teaching materials on the Holy Spirit, spiritual gifts, and Spirit-led living.",
        category: "training",
        fileUrl: "/assets/12_Holy_Spirit_Class_1765408937466.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 12,
      },
      {
        title: "Counting Ministry Manual",
        description: "Procedures for offering counting team including security, documentation, and financial handling.",
        category: "ministry-specific",
        fileUrl: "/assets/13_Counting_Ministry_Manual_1765408937467.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 13,
      },
      {
        title: "Celebrate Recovery Training Manual",
        description: "Advanced training for Celebrate Recovery facilitators and step study leaders.",
        category: "ministry-specific",
        fileUrl: "/assets/14_Celebrate_Recovery_Manual_1765408937468.pdf",
        fileType: "pdf",
        isRequired: false,
        sortOrder: 14,
      },
      {
        title: "Ministry Leaders Manual",
        description: "Leadership development guide for all ministry leaders covering team building, communication, and vision casting.",
        category: "training",
        fileUrl: "/assets/15_Ministry_Leaders_Manual_1765408937468.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 15,
      },
      {
        title: "Ministry Development Questionnaire",
        description: "Self-assessment tool for ministry leaders to evaluate team health and growth opportunities.",
        category: "training",
        fileUrl: "/assets/16_Ministry_Development_Questionnaire_1765409057481.pdf",
        fileType: "pdf",
        isRequired: false,
        sortOrder: 16,
      },
      {
        title: "Youth Worship Manual",
        description: "Guidelines for youth worship team including song selection, rehearsal protocols, and stage presence.",
        category: "ministry-specific",
        fileUrl: "/assets/17_Youth_Worship_Manual_1765409057483.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 17,
      },
      {
        title: "Social Media Manual (Extended)",
        description: "Comprehensive social media strategy guide with posting schedules and engagement tactics.",
        category: "ministry-specific",
        fileUrl: "/assets/18_SOCIAL_MEDIA_MANUAL_1765409057482.pdf",
        fileType: "pdf",
        isRequired: false,
        sortOrder: 18,
      },
      {
        title: "City Youth Manual",
        description: "Complete youth ministry handbook covering programming, safety, and discipleship strategies.",
        category: "ministry-specific",
        fileUrl: "/assets/19_City_UTH_Manual_1765409085310.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 19,
      },
      {
        title: "Employee Manual",
        description: "Staff handbook covering employment policies, benefits, and workplace guidelines.",
        category: "policies",
        fileUrl: "/assets/20_Employee_Manual_1765409085311.pdf",
        fileType: "pdf",
        isRequired: false,
        sortOrder: 20,
      },
      {
        title: "Intercessory Ministry Manual (Extended)",
        description: "Advanced prayer ministry training covering spiritual warfare and prophetic intercession.",
        category: "ministry-specific",
        fileUrl: "/assets/21_Intercessory_Ministry_Manual_1765409085311.pdf",
        fileType: "pdf",
        isRequired: false,
        sortOrder: 21,
      },
      {
        title: "Kingdom Children Manual",
        description: "Children's ministry handbook covering curriculum, safety protocols, and volunteer training.",
        category: "ministry-specific",
        fileUrl: "/assets/23_Kingdom_Children_Manual_(17_x_11_in)_1765409153108.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 22,
      },
      {
        title: "Usher Ministry Manual (Extended)",
        description: "Advanced usher training covering VIP handling, large event management, and security protocols.",
        category: "ministry-specific",
        fileUrl: "/assets/24_Usher_Ministry_Manual_1765409153108.pdf",
        fileType: "pdf",
        isRequired: false,
        sortOrder: 23,
      },
      {
        title: "CORE Minister Manual (Extended)",
        description: "Advanced counseling and altar ministry training for experienced CORE ministers.",
        category: "ministry-specific",
        fileUrl: "/assets/26_CORE_Minister_Manual_(8_x_10_in)_1765409153108.pdf",
        fileType: "pdf",
        isRequired: false,
        sortOrder: 24,
      },
      {
        title: "Recruitment 101",
        description: "Guide for ministry leaders on recruiting, onboarding, and developing new team members.",
        category: "training",
        fileUrl: "/assets/27_Recruitment_101_1765409203872.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 25,
      },
      {
        title: "About Us Manual",
        description: "Church history, vision, values, and doctrinal statement for new members and volunteers.",
        category: "onboarding",
        fileUrl: "/assets/30_About_Us_Manual_1765409203871.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 26,
      },
      {
        title: "Language of a Leader",
        description: "Leadership communication training covering effective messaging and team motivation.",
        category: "training",
        fileUrl: "/assets/32_Language_of_a_Leader_1765409203872.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 27,
      },
      {
        title: "Board Member Instruction Guide",
        description: "Detailed governance training for new board members and officers.",
        category: "policies",
        fileUrl: "/assets/Board_Member_Instruction_Guide_1765409339696.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 28,
      },
      {
        title: "Discipleship Model",
        description: "Overview of the church's discipleship pathway from worship to leadership.",
        category: "onboarding",
        fileUrl: "/assets/Discipleship_Model_1765242091338.pdf",
        fileType: "pdf",
        isRequired: true,
        sortOrder: 29,
      },
    ];

    for (const manual of ministryManuals) {
      await storage.createManual(manual);
    }
    
    console.log("Ministry manuals seeded successfully - 29 manuals loaded");
  } catch (error) {
    console.error("Error seeding ministry manuals:", error);
  }
}

// Sample badges for the gamification system
async function seedSampleBadges() {
  try {
    const existingBadges = await storage.getBadges();
    if (existingBadges.length > 0) return;

    const sampleBadges = [
      {
        name: "First Steps",
        slug: "first-steps",
        description: "Complete your profile and take the first step on your faith journey",
        category: "onboarding",
        rarity: "common",
        xpValue: 50,
        sortOrder: 1,
      },
      {
        name: "Worship Attendee",
        slug: "worship-attendee",
        description: "Attend your first Sunday worship service",
        category: "worship",
        rarity: "common",
        xpValue: 100,
        sortOrder: 2,
      },
      {
        name: "Next Night Explorer",
        slug: "next-night",
        description: "Attend a Next Night gathering and connect with others",
        category: "connection",
        rarity: "uncommon",
        xpValue: 100,
        sortOrder: 3,
      },
      {
        name: "Learner",
        slug: "learner",
        description: "Complete your first training module",
        category: "training",
        rarity: "uncommon",
        xpValue: 150,
        sortOrder: 4,
      },
      {
        name: "Team Player",
        slug: "team-player",
        description: "Join a ministry team and start serving",
        category: "serving",
        rarity: "uncommon",
        xpValue: 200,
        sortOrder: 5,
      },
      {
        name: "Assessment Complete",
        slug: "assessment-complete",
        description: "Complete the spiritual gifts assessment",
        category: "discovery",
        rarity: "rare",
        xpValue: 250,
        sortOrder: 6,
      },
      {
        name: "Faithful Servant",
        slug: "faithful-servant",
        description: "Serve consistently for 3 months",
        category: "serving",
        rarity: "rare",
        xpValue: 500,
        sortOrder: 7,
      },
      {
        name: "Small Group Leader",
        slug: "small-group-leader",
        description: "Lead or co-lead a small group",
        category: "leadership",
        rarity: "epic",
        xpValue: 500,
        sortOrder: 8,
      },
      {
        name: "Ministry Champion",
        slug: "ministry-champion",
        description: "Complete all trainings for your ministry",
        category: "training",
        rarity: "epic",
        xpValue: 750,
        sortOrder: 9,
      },
      {
        name: "Rising Leader",
        slug: "rising-leader",
        description: "Complete the leadership development pathway",
        category: "leadership",
        rarity: "legendary",
        xpValue: 1000,
        sortOrder: 10,
      },
    ];

    for (const badge of sampleBadges) {
      await storage.createBadge(badge);
    }
    
    console.log("Sample badges seeded successfully");
  } catch (error) {
    console.error("Error seeding sample badges:", error);
  }
}

// Sample rooms for the facility management system
async function seedSampleRooms() {
  try {
    const existingRooms = await storage.getRooms();
    if (existingRooms.length > 0) return;

    const sampleRooms = [
      {
        name: "Main Sanctuary",
        capacity: 300,
        description: "The main worship space for Sunday services and large gatherings. Includes a full stage, lighting, and sound system.",
        location: "Building A, Ground Floor",
        amenities: ["sound", "projector", "lighting", "stage"],
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "Fellowship Hall",
        capacity: 150,
        description: "Multi-purpose room for events, meals, and community gatherings. Kitchen access available.",
        location: "Building A, Ground Floor",
        amenities: ["kitchen", "projector", "tables", "chairs"],
        isActive: true,
        sortOrder: 2,
      },
      {
        name: "Youth Room",
        capacity: 50,
        description: "Dedicated space for youth ministry activities and small group sessions.",
        location: "Building B, Second Floor",
        amenities: ["wifi", "sound", "gaming"],
        isActive: true,
        sortOrder: 3,
      },
      {
        name: "Children's Wing - Room A",
        capacity: 25,
        description: "Nursery and toddler classroom with age-appropriate furniture and activities.",
        location: "Building B, Ground Floor",
        amenities: ["cribs", "toys", "changing-station"],
        isActive: true,
        sortOrder: 4,
      },
      {
        name: "Children's Wing - Room B",
        capacity: 30,
        description: "Elementary classroom for Sunday School and children's programs.",
        location: "Building B, Ground Floor",
        amenities: ["projector", "tables", "craft-supplies"],
        isActive: true,
        sortOrder: 5,
      },
      {
        name: "Prayer Room",
        capacity: 15,
        description: "Quiet space for prayer and meditation.",
        location: "Building A, Second Floor",
        amenities: ["quiet"],
        isActive: true,
        sortOrder: 6,
      },
      {
        name: "Conference Room",
        capacity: 12,
        description: "Meeting room for leadership meetings and planning sessions.",
        location: "Building A, Second Floor",
        amenities: ["wifi", "projector", "whiteboard", "video-conference"],
        isActive: true,
        sortOrder: 7,
      },
      {
        name: "Music Room",
        capacity: 20,
        description: "Rehearsal space for worship team and choir with instruments and sound equipment.",
        location: "Building A, Basement",
        amenities: ["piano", "drums", "sound", "music-stands"],
        isActive: true,
        sortOrder: 8,
      },
    ];

    for (const room of sampleRooms) {
      await storage.createRoom(room);
    }
    
    console.log("Sample rooms seeded successfully");
  } catch (error) {
    console.error("Error seeding sample rooms:", error);
  }
}

// CALENDAR CATEGORIES API ROUTES

export function registerCalendarCategoryRoutes(app: Express) {
  // Get all calendar categories (active only by default)
  app.get('/api/calendar-categories', isAuthenticated, async (req: any, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const categories = await storage.getCalendarCategories(!includeInactive);
      res.json(categories);
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // Get a single category
  app.get('/api/calendar-categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const category = await storage.getCalendarCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // Create a new category (admin only)
  app.post('/api/calendar-categories', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const categorySchema = z.object({
        name: z.string().min(1),
        type: z.enum(['MINISTRY', 'SERVICE', 'GROUP', 'TAG']),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        description: z.string().optional(),
        outlookCategoryName: z.string().optional(),
        sortOrder: z.number().int().optional(),
      });
      
      const validated = categorySchema.parse(req.body);
      // Generate slug from name
      const slug = validated.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const category = await storage.createCalendarCategory({ ...validated, slug });
      res.status(201).json(category);
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // Update a category (admin only)
  app.put('/api/calendar-categories/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const categorySchema = z.object({
        name: z.string().min(1).optional(),
        type: z.enum(['MINISTRY', 'SERVICE', 'GROUP', 'TAG']).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        description: z.string().optional(),
        outlookCategoryName: z.string().optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
      });
      
      const validated = categorySchema.parse(req.body);
      const category = await storage.updateCalendarCategory(req.params.id, validated);
      res.json(category);
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // Delete (deactivate) a category (admin only)
  app.delete('/api/calendar-categories/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      await storage.deleteCalendarCategory(req.params.id);
      res.status(204).end();
    } catch (error) {
      return handleApiError(error, res);
    }
  });

  // ============ SYSTEM STATUS ENDPOINT ============
  // System status check for admin panel - shows health of connected services
  app.get('/api/system/status', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const status: {
        database: { 
          status: 'connected' | 'disconnected' | 'error'; 
          message?: string; 
          latency?: number;
          hasDatabaseUrl?: boolean;
          envSource?: string | null;
          hostRedacted?: string | null;
          schemaValid?: boolean | null;
        };
        email: { status: 'configured' | 'not_configured' | 'error'; message?: string };
        outlook: { status: 'connected' | 'not_configured' | 'error'; message?: string };
        timestamp: string;
      } = {
        database: { status: 'disconnected' },
        email: { status: 'not_configured' },
        outlook: { status: 'not_configured' },
        timestamp: new Date().toISOString(),
      };

      // Check database connectivity with detailed diagnostics
      try {
        const dbHealth = await checkDatabaseHealth();
        
        if (!dbHealth.hasDatabaseUrl) {
          status.database = {
            status: 'error',
            message: dbHealth.error || 'No database URL configured',
            hasDatabaseUrl: false,
            envSource: null,
            hostRedacted: null,
            schemaValid: null,
          };
        } else if (!dbHealth.canConnect) {
          status.database = {
            status: 'error',
            message: dbHealth.error || 'Cannot connect to database',
            hasDatabaseUrl: true,
            envSource: dbHealth.envSource,
            hostRedacted: dbHealth.hostRedacted,
            schemaValid: null,
          };
        } else {
          status.database = {
            status: 'connected',
            message: dbHealth.schemaValid 
              ? 'PostgreSQL connected' 
              : 'Connected but schema may be missing',
            latency: dbHealth.latencyMs || undefined,
            hasDatabaseUrl: true,
            envSource: dbHealth.envSource,
            hostRedacted: dbHealth.hostRedacted,
            schemaValid: dbHealth.schemaValid,
          };
        }
      } catch (dbError) {
        status.database = {
          status: 'error',
          message: dbError instanceof Error ? dbError.message : 'Database connection failed',
        };
      }

      // Check email configuration (Mailgun)
      const mailgunApiKey = process.env.MAILGUN_API_KEY;
      const mailgunDomain = process.env.MAILGUN_DOMAIN;
      if (mailgunApiKey && mailgunDomain) {
        status.email = {
          status: 'configured',
          message: `Mailgun configured (domain: ${mailgunDomain})`,
        };
      } else {
        status.email = {
          status: 'not_configured',
          message: 'Mailgun API key or domain not set',
        };
      }

      // Check Outlook configuration
      let hasOutlook = false;
      try {
        const outlook = await import('./outlook');
        const testResult = await outlook.testOutlookConnection();
        hasOutlook = testResult.success;
      } catch {
        hasOutlook = false;
      }
      if (hasOutlook) {
        status.outlook = {
          status: 'connected',
          message: 'Outlook 365 integration configured',
        };
      } else {
        status.outlook = {
          status: 'not_configured',
          message: 'Outlook 365 integration not set up',
        };
      }

      res.json(status);
    } catch (error) {
      console.error('System status check failed:', error);
      return handleApiError(error, res);
    }
  });

  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);
}

// Seed default calendar categories
export async function seedDefaultCalendarCategories() {
  try {
    const existing = await storage.getCalendarCategories(false);
    if (existing.length > 0) {
      console.log("Calendar categories already seeded");
      return;
    }

    const defaultCategories = [
      { name: "Worship Service", slug: "worship-service", type: "SERVICE" as const, color: "#8B5CF6", description: "Sunday services and special worship events", sortOrder: 1 },
      { name: "Team Meeting", slug: "team-meeting", type: "GROUP" as const, color: "#3B82F6", description: "Ministry team and leadership meetings", sortOrder: 2 },
      { name: "Training", slug: "training", type: "TAG" as const, color: "#10B981", description: "Training sessions and workshops", sortOrder: 3 },
      { name: "Youth Ministry", slug: "youth-ministry", type: "MINISTRY" as const, color: "#F59E0B", description: "Youth group events and activities", sortOrder: 4 },
      { name: "Children's Ministry", slug: "childrens-ministry", type: "MINISTRY" as const, color: "#EC4899", description: "Children's programs and events", sortOrder: 5 },
      { name: "Small Group", slug: "small-group", type: "GROUP" as const, color: "#06B6D4", description: "Small group gatherings and bible studies", sortOrder: 6 },
      { name: "Outreach", slug: "outreach", type: "TAG" as const, color: "#EF4444", description: "Community outreach and missions", sortOrder: 7 },
      { name: "Special Event", slug: "special-event", type: "TAG" as const, color: "#8B5CF6", description: "Conferences, retreats, and special occasions", sortOrder: 8 },
    ];

    for (const category of defaultCategories) {
      await storage.createCalendarCategory(category);
    }
    
    console.log("Default calendar categories seeded successfully");
  } catch (error) {
    console.error("Error seeding calendar categories:", error);
  }
}
