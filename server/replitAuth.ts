import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler, Response, NextFunction } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { isAdmin, isLeader, isPastor, isOwner } from "@shared/schema";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  // In development (Replit preview), use sameSite: 'none' for cross-origin cookies
  // In production (published app), use sameSite: 'lax' for iOS Safari compatibility
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    proxy: true, // Trust proxy for secure cookies behind reverse proxy
    cookie: {
      httpOnly: true,
      secure: true, // Always secure on Replit (required for sameSite: 'none')
      sameSite: isDevelopment ? 'none' : 'lax', // 'none' for preview, 'lax' for production
      maxAge: sessionTtl,
      path: '/', // Ensure cookie is sent for all paths
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

// Admin email that gets automatic admin role
const ADMIN_EMAIL = "Pastor@gardencitychurch.net";

async function upsertUser(
  claims: any,
) {
  const email = claims["email"];
  const isAdminEmail = email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  
  // First, upsert the user with basic info
  await storage.upsertUser({
    id: claims["sub"],
    email: email,
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
  
  // If this is the admin email and they don't have admin role yet, set it
  if (isAdminEmail) {
    const user = await storage.getUser(claims["sub"]);
    if (user && user.role !== 'admin') {
      await storage.updateUser(claims["sub"], { role: 'admin' });
    }
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      console.log("[auth] Verify function called");
      const claims = tokens.claims();
      console.log("[auth] Token claims:", JSON.stringify(claims, null, 2));
      
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(claims);
      
      console.log("[auth] User session updated, calling verified");
      verified(null, user);
    } catch (error) {
      console.error("[auth] Error in verify function:", error);
      verified(error as Error, undefined);
    }
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    console.log("[auth] Login initiated for domain:", req.hostname);
    // Store returnTo URL in session for redirect after auth
    if (req.query.returnTo && typeof req.query.returnTo === 'string') {
      (req.session as any).returnTo = req.query.returnTo;
    }
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log("[auth] Callback received for domain:", req.hostname);
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any, info: any) => {
      if (err) {
        console.error("[auth] Callback error:", err);
        return res.redirect("/auth?error=callback_error");
      }
      if (!user) {
        console.error("[auth] No user returned from callback:", info);
        return res.redirect("/auth?error=no_user");
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("[auth] Login error:", loginErr);
          return res.redirect("/auth?error=login_error");
        }
        console.log("[auth] Successfully authenticated user:", user.claims?.email || user.claims?.sub);
        // Get returnTo URL from session
        const returnTo = (req.session as any).returnTo || "/";
        delete (req.session as any).returnTo;
        // Save session explicitly before redirect
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[auth] Session save error:", saveErr);
          }
          // Validate returnTo to prevent open redirect attacks
          // Must be a relative path (single /) and not protocol-relative (//)
          let safeRedirect = '/';
          if (typeof returnTo === 'string' && 
              returnTo.startsWith('/') && 
              !returnTo.startsWith('//') &&
              !returnTo.includes('://')) {
            safeRedirect = returnTo;
          }
          res.redirect(safeRedirect);
        });
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    const user = req.user as any;
    const isLocalUser = user && !user.refresh_token;
    
    req.logout(() => {
      // For local users, just redirect to home
      if (isLocalUser) {
        return res.redirect("/");
      }
      
      // For OIDC users, redirect to end session endpoint
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // Debug session info
  console.log("[auth] Session ID:", req.sessionID);
  console.log("[auth] isAuthenticated:", req.isAuthenticated());
  console.log("[auth] User claims sub:", user?.claims?.sub);
  console.log("[auth] Cookie header:", req.headers.cookie ? "present" : "missing");

  if (!req.isAuthenticated() || !user?.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if session has expired
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // For local auth users (no refresh token), extend session on activity
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    // Local user session expired - extend it for 1 more week
    user.expires_at = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    return next();
  }

  // For OIDC users, try to refresh the token
  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// =============================================================================
// PHASE 2: CENTRALIZED PERMISSION MIDDLEWARE HELPERS
// =============================================================================

// Require the user to have leader-level access or above
export const requireLeader: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(userId);
    if (!user || !isLeader(user.role)) {
      return res.status(403).json({ message: "Leader access required" });
    }
    
    // Attach user to request for easy access in route handlers
    req.authenticatedUser = user;
    next();
  } catch (error) {
    console.error("requireLeader error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Require the user to have admin-level access or above
export const requireAdmin: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(userId);
    if (!user || !isAdmin(user.role)) {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    req.authenticatedUser = user;
    next();
  } catch (error) {
    console.error("requireAdmin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Require the user to have pastoral-level access
export const requirePastor: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(userId);
    if (!user || !isPastor(user.role)) {
      return res.status(403).json({ message: "Pastoral access required" });
    }
    
    req.authenticatedUser = user;
    next();
  } catch (error) {
    console.error("requirePastor error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Factory function to require ministry leadership for a specific ministry
// Usage: requireMinistryLeader('ministryId') where ministryId is the route param name
export const requireMinistryLeader = (ministryIdParam: string = 'ministryId'): RequestHandler => {
  return async (req: any, res, next) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Admins and pastors can access all ministries
      if (isAdmin(user.role) || isPastor(user.role)) {
        req.authenticatedUser = user;
        return next();
      }
      
      // Get the ministry ID from route params or body
      const ministryId = req.params[ministryIdParam] || req.body?.ministryId;
      if (!ministryId) {
        return res.status(400).json({ message: "Ministry ID required" });
      }
      
      // Check if user leads this ministry
      const userLedMinistries = user.ledMinistryIds || [];
      if (!userLedMinistries.includes(ministryId)) {
        // Also check ministry leadership assignments
        const leadershipAssignments = await storage.getUserLeadershipAssignments(userId);
        const isMinistryLeader = leadershipAssignments.some(
          a => a.ministryId === ministryId && a.isActive
        );
        
        if (!isMinistryLeader) {
          return res.status(403).json({ message: "Ministry leader access required" });
        }
      }
      
      req.authenticatedUser = user;
      next();
    } catch (error) {
      console.error("requireMinistryLeader error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};
