import { db } from "./db";
import { orgSettings, calendarCategories } from "@shared/schema";
import { eq } from "drizzle-orm";

interface OutlookTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface GraphEvent {
  id?: string;
  subject: string;
  body?: { contentType: string; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  categories?: string[];
  isAllDay?: boolean;
  showAs?: string;
  attendees?: { emailAddress: { address: string; name: string }; type: string }[];
}

interface MinistryPathEventMeta {
  categorySlugs?: string[];
  groupSlugs?: string[];
  ministryId?: string;
  createdByMinistryPath?: boolean;
}

// Cache for category lookups
let categoryCache: { slugToId: Map<string, string>; idToSlug: Map<string, string>; slugToRow: Map<string, any>; lastFetch: number } | null = null;
const CACHE_TTL = 60000; // 1 minute

async function getCategoryMaps() {
  const now = Date.now();
  if (categoryCache && (now - categoryCache.lastFetch) < CACHE_TTL) {
    return categoryCache;
  }
  
  const categories = await db.select().from(calendarCategories).where(eq(calendarCategories.isActive, true));
  
  const slugToId = new Map<string, string>();
  const idToSlug = new Map<string, string>();
  const slugToRow = new Map<string, any>();
  
  for (const cat of categories) {
    slugToId.set(cat.slug, cat.id);
    idToSlug.set(cat.id, cat.slug);
    slugToRow.set(cat.slug, cat);
  }
  
  categoryCache = { slugToId, idToSlug, slugToRow, lastFetch: now };
  return categoryCache;
}

// Extract MP: prefixed categories from Outlook categories array
function extractMPCategories(outlookCategories: string[]): string[] {
  return outlookCategories
    .filter(c => c.startsWith("MP:"))
    .map(c => c.substring(3)); // Remove MP: prefix to get slug
}

// Preserve non-MP categories and add MP categories
function buildOutlookCategories(existingCategories: string[], mpSlugs: string[]): string[] {
  const nonMP = existingCategories.filter(c => !c.startsWith("MP:"));
  const mpCategories = mpSlugs.map(slug => `MP:${slug}`);
  return [...nonMP, ...mpCategories];
}

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";

async function getOutlookSettings() {
  const settings = await db.select().from(orgSettings).limit(1);
  return settings[0] || null;
}

async function getAccessToken(): Promise<string | null> {
  const settings = await getOutlookSettings();
  
  if (!settings?.outlookIntegrationEnabled || !settings.outlookTenantId || !settings.outlookClientId) {
    return null;
  }
  
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
  if (!clientSecret) {
    console.log("[Outlook] No client secret configured");
    return null;
  }
  
  try {
    const tokenUrl = `https://login.microsoftonline.com/${settings.outlookTenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: settings.outlookClientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Outlook] Token fetch failed:", errorText);
      return null;
    }
    
    const data = (await response.json()) as OutlookTokenResponse;
    return data.access_token;
  } catch (error) {
    console.error("[Outlook] Error getting access token:", error);
    return null;
  }
}

function parseMinistryPathMeta(body?: string): MinistryPathEventMeta | null {
  if (!body) return null;
  
  const match = body.match(/<!-- MINISTRYPATH_META: (.*?) -->/);
  if (!match) return null;
  
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function embedMinistryPathMeta(body: string, meta: MinistryPathEventMeta): string {
  const metaComment = `<!-- MINISTRYPATH_META: ${JSON.stringify(meta)} -->`;
  return `${body}\n\n${metaComment}`;
}

export async function getOutlookEvents(
  start: string,
  end: string,
  filters?: { categoryId?: string; categorySlug?: string; ministryId?: string }
): Promise<any[] | null> {
  const token = await getAccessToken();
  if (!token) return null;
  
  const settings = await getOutlookSettings();
  if (!settings?.outlookSelectedCalendars?.length) {
    return [];
  }
  
  // Get category maps for slug/id lookups
  const categoryMaps = await getCategoryMaps();
  
  const allEvents: any[] = [];
  
  for (const calendarId of settings.outlookSelectedCalendars) {
    try {
      const url = `${GRAPH_API_BASE}/users/${calendarId}/calendar/calendarView?startDateTime=${start}&endDateTime=${end}&$top=500`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        console.error(`[Outlook] Failed to fetch calendar ${calendarId}:`, await response.text());
        continue;
      }
      
      const data = await response.json();
      const events = data.value || [];
      
      for (const event of events) {
        const rawOutlookCategories = event.categories || [];
        const meta = parseMinistryPathMeta(event.body?.content);
        
        // Extract MP: prefixed categories from Outlook (Strategy A)
        const mpSlugsFromOutlook = extractMPCategories(rawOutlookCategories);
        
        // Combine with meta slugs (Strategy B fallback)
        const allSlugs = [...new Set([
          ...mpSlugsFromOutlook, 
          ...(meta?.categorySlugs || [])
        ])];
        
        // Map slugs to IDs
        const categoryIds: string[] = [];
        const categorySlugs: string[] = [];
        
        for (const slug of allSlugs) {
          const id = categoryMaps.slugToId.get(slug);
          if (id) {
            categoryIds.push(id);
            categorySlugs.push(slug);
          }
        }
        
        // Apply filters
        if (filters?.categoryId && !categoryIds.includes(filters.categoryId)) {
          continue;
        }
        if (filters?.categorySlug && !categorySlugs.includes(filters.categorySlug)) {
          continue;
        }
        if (filters?.ministryId && meta?.ministryId !== filters.ministryId) {
          continue;
        }
        
        allEvents.push({
          id: event.id,
          calendarId,
          title: event.subject,
          description: event.body?.content?.replace(/<!-- MINISTRYPATH_META:.*?-->/g, "").trim(),
          start: event.start.dateTime,
          end: event.end.dateTime,
          location: event.location?.displayName,
          rawOutlookCategories,
          categoryIds,
          categorySlugs,
          isAllDay: event.isAllDay,
          meta,
          source: "outlook",
        });
      }
    } catch (error) {
      console.error(`[Outlook] Error fetching calendar ${calendarId}:`, error);
    }
  }
  
  return allEvents;
}

export async function createOutlookEvent(
  calendarId: string,
  event: {
    title: string;
    description?: string;
    start: string;
    end: string;
    location?: string;
    categorySlugs?: string[];
    ministryId?: string;
  }
): Promise<any | null> {
  const token = await getAccessToken();
  if (!token) return null;
  
  const categorySlugs = event.categorySlugs || [];
  
  const meta: MinistryPathEventMeta = {
    createdByMinistryPath: true,
    categorySlugs,
    ministryId: event.ministryId,
  };
  
  // Build MP: prefixed categories for Outlook (Strategy A)
  const outlookCategories = categorySlugs.map(slug => `MP:${slug}`);
  
  const graphEvent: GraphEvent = {
    subject: event.title,
    body: {
      contentType: "HTML",
      content: embedMinistryPathMeta(event.description || "", meta),
    },
    start: { dateTime: event.start, timeZone: "UTC" },
    end: { dateTime: event.end, timeZone: "UTC" },
    categories: outlookCategories,
  };
  
  if (event.location) {
    graphEvent.location = { displayName: event.location };
  }
  
  try {
    const url = `${GRAPH_API_BASE}/users/${calendarId}/calendar/events`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphEvent),
    });
    
    if (!response.ok) {
      console.error("[Outlook] Failed to create event:", await response.text());
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("[Outlook] Error creating event:", error);
    return null;
  }
}

export async function updateOutlookEvent(
  calendarId: string,
  eventId: string,
  updates: Partial<{
    title: string;
    description: string;
    start: string;
    end: string;
    location: string;
    categorySlugs: string[];
    existingOutlookCategories: string[];
  }>
): Promise<any | null> {
  const token = await getAccessToken();
  if (!token) return null;
  
  const graphUpdates: Partial<GraphEvent> = {};
  
  if (updates.title) graphUpdates.subject = updates.title;
  if (updates.description) {
    graphUpdates.body = { contentType: "HTML", content: updates.description };
  }
  if (updates.start) graphUpdates.start = { dateTime: updates.start, timeZone: "UTC" };
  if (updates.end) graphUpdates.end = { dateTime: updates.end, timeZone: "UTC" };
  if (updates.location) graphUpdates.location = { displayName: updates.location };
  
  // Handle category updates - preserve non-MP categories
  if (updates.categorySlugs !== undefined) {
    const existingCategories = updates.existingOutlookCategories || [];
    graphUpdates.categories = buildOutlookCategories(existingCategories, updates.categorySlugs);
  }
  
  try {
    const url = `${GRAPH_API_BASE}/users/${calendarId}/calendar/events/${eventId}`;
    
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphUpdates),
    });
    
    if (!response.ok) {
      console.error("[Outlook] Failed to update event:", await response.text());
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error("[Outlook] Error updating event:", error);
    return null;
  }
}

export async function deleteOutlookEvent(
  calendarId: string,
  eventId: string
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  
  try {
    const url = `${GRAPH_API_BASE}/users/${calendarId}/calendar/events/${eventId}`;
    
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    return response.ok || response.status === 204;
  } catch (error) {
    console.error("[Outlook] Error deleting event:", error);
    return false;
  }
}

export async function testOutlookConnection(): Promise<{ success: boolean; message: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, message: "Failed to obtain access token. Check your configuration." };
  }
  
  try {
    const response = await fetch(`${GRAPH_API_BASE}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      return { success: true, message: "Successfully connected to Microsoft Graph API." };
    } else {
      const errorText = await response.text();
      return { success: false, message: `API error: ${errorText}` };
    }
  } catch (error) {
    return { success: false, message: `Connection error: ${error}` };
  }
}

export async function getRoomCalendars(): Promise<any[] | null> {
  const token = await getAccessToken();
  if (!token) return null;
  
  const settings = await getOutlookSettings();
  if (!settings?.outlookRoomCalendars?.length) {
    return [];
  }
  
  const rooms: any[] = [];
  
  for (const roomEmail of settings.outlookRoomCalendars) {
    rooms.push({
      id: roomEmail,
      email: roomEmail,
      name: roomEmail.split("@")[0].replace(/[._-]/g, " "),
    });
  }
  
  return rooms;
}

export async function getRoomAvailability(
  roomId: string,
  start: string,
  end: string
): Promise<any[] | null> {
  const token = await getAccessToken();
  if (!token) return null;
  
  try {
    const url = `${GRAPH_API_BASE}/users/${roomId}/calendar/calendarView?startDateTime=${start}&endDateTime=${end}`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error("[Outlook] Error fetching room availability:", error);
    return [];
  }
}

export async function bookRoom(
  roomId: string,
  event: {
    title: string;
    start: string;
    end: string;
    description?: string;
    organizerEmail?: string;
  }
): Promise<{ success: boolean; event?: any; message?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { success: false, message: "Outlook not configured" };
  }
  
  // Check for conflicts
  const conflicts = await getRoomAvailability(roomId, event.start, event.end);
  if (conflicts && conflicts.length > 0) {
    return { success: false, message: "Room is not available at this time" };
  }
  
  const graphEvent: GraphEvent = {
    subject: event.title,
    body: event.description ? { contentType: "Text", content: event.description } : undefined,
    start: { dateTime: event.start, timeZone: "UTC" },
    end: { dateTime: event.end, timeZone: "UTC" },
    location: { displayName: roomId.split("@")[0] },
    showAs: "busy",
  };
  
  try {
    const url = `${GRAPH_API_BASE}/users/${roomId}/calendar/events`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(graphEvent),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `Failed to book room: ${errorText}` };
    }
    
    const createdEvent = await response.json();
    return { success: true, event: createdEvent };
  } catch (error) {
    return { success: false, message: `Error booking room: ${error}` };
  }
}
