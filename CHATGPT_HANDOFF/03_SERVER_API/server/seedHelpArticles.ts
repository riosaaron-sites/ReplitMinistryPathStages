import { db } from "./db";
import { helpArticles } from "@shared/schema";

interface ArticleData {
  title: string;
  slug: string;
  category: string;
  summary: string;
  content: string;
  tags: string[];
  relatedLinks?: { title: string; url: string }[];
}

const helpArticlesSeed: ArticleData[] = [
  {
    title: "Getting Started with Calendar Categories",
    slug: "calendar-categories-guide",
    category: "admin",
    summary: "Learn how to create and manage calendar categories to organize church events.",
    content: `# Calendar Categories Guide

Calendar categories help organize events by type, making it easier for team members to filter and find relevant information.

## What are Categories?

Categories are labels you can assign to events to group them by purpose:
- **Ministry** - Events tied to specific ministry teams
- **Service** - Regular worship services and special services
- **Group** - Small group meetings, Bible studies, Core groups
- **Tag** - Custom labels for special purposes

## Creating Categories

1. Go to **Admin Panel → Calendar** tab
2. Click **Add Category**
3. Fill in the details:
   - **Name** - Display name (e.g., "Youth Event")
   - **Type** - Select Ministry, Service, Group, or Tag
   - **Color** - Pick a color for visual distinction
   - **Description** - Optional helpful description
4. Click **Save**

## Using Categories

Once created, categories appear in:
- Calendar event filters
- Event creation forms
- Outlook sync (if configured)

## Best Practices

- Keep category names short and clear
- Use consistent colors for similar event types
- Review and clean up unused categories quarterly`,
    tags: ["calendar", "categories", "admin", "events"],
    relatedLinks: [
      { title: "Calendar Overview", url: "/help/calendar-overview" },
      { title: "Outlook Integration", url: "/help/outlook-integration" }
    ]
  },
  {
    title: "Connecting Outlook 365 Calendar",
    slug: "outlook-integration",
    category: "admin",
    summary: "Step-by-step guide to sync your church's Outlook 365 calendar with the platform.",
    content: `# Outlook 365 Integration

Sync your church's Microsoft Outlook calendar to display events in the Ministry Calendar.

## Prerequisites

Before starting, you'll need:
- Microsoft 365 admin access
- Your organization's Tenant ID
- A registered Azure App with calendar permissions

## Setup Steps

### Step 1: Get Your Tenant ID
1. Go to the Azure Portal (portal.azure.com)
2. Navigate to **Azure Active Directory**
3. Find your **Tenant ID** in the Overview section

### Step 2: Register an Azure App
1. In Azure Portal, go to **App Registrations**
2. Click **New Registration**
3. Name it (e.g., "MinistryPath Calendar Sync")
4. Set up API permissions:
   - Microsoft Graph → Application permissions
   - Calendars.Read
   - Calendars.ReadWrite (for room booking)
5. Create a client secret and save it securely

### Step 3: Configure in Admin Panel
1. Go to **Admin Panel → Integrations** tab
2. Enter your:
   - Tenant ID
   - Client ID
   - Client Secret (stored securely)
3. Click **Test Connection**
4. Select which calendars to sync

## Syncing Events

- Events sync automatically every 15 minutes
- Use the **Sync** button on the Calendar page for immediate updates
- Only events within the selected date range are synced

## Category Mapping

You can map Outlook categories to your platform categories:
1. Create matching categories in Admin Panel
2. Set the "Outlook Category Name" field
3. Events will automatically use the correct colors

## Troubleshooting

**Connection Failed?**
- Verify your Tenant ID and Client ID
- Ensure the client secret hasn't expired
- Check API permissions in Azure

**Events Not Showing?**
- Confirm the calendar is selected in settings
- Check the date range in the calendar view
- Click Sync to force a refresh`,
    tags: ["outlook", "microsoft", "calendar", "integration", "sync"],
    relatedLinks: [
      { title: "Calendar Categories", url: "/help/calendar-categories-guide" },
      { title: "Room Reservations", url: "/help/room-reservations" }
    ]
  },
  {
    title: "My Discipleship Path",
    slug: "my-path-guide",
    category: "onboarding",
    summary: "Understanding your five-step discipleship journey at Garden City Church.",
    content: `# My Discipleship Path

Your journey at Garden City Church follows five key steps: WORSHIP → NEXT NIGHT → LEARN → LOVE → LEAD

## The Five Steps

### 1. WORSHIP
Join us for Sunday morning worship to connect with God and our church family.
- Services at 9:00 AM and 11:00 AM
- Experience praise, prayer, and teaching
- Connect with fellow believers

### 2. NEXT NIGHT
Attend our monthly gathering to learn more about Garden City Church.
- Learn about our mission, vision, and values
- Meet church leadership
- Discover how to get connected
- Held monthly on the first Sunday evening

### 3. LEARN
Complete foundational learning to deepen your faith and knowledge.
- Following Jesus - Core discipleship training
- About Us - Understanding our church
- Discipleship Pathway - Growing in your faith
- SERVE - Discovering your calling

### 4. LOVE
Put your faith into action through serving and building community.
- Join a ministry team
- Serve in Core Groups
- Participate in outreach events
- Care for others in the church family

### 5. LEAD
Step into leadership and help disciple others.
- Lead a ministry team or small group
- Complete leadership training
- Mentor and develop others
- Multiply your impact

## Tracking Progress

Your progress is tracked automatically as you:
- Attend Sunday services
- Attend Next Night
- Complete trainings
- Join ministry teams
- Take on leadership roles

Visit the "My Path" page to see your current progress and next steps.`,
    tags: ["discipleship", "path", "journey", "growth", "my-path"],
    relatedLinks: [
      { title: "Training Hub", url: "/help/training-hub" },
      { title: "Joining a Ministry", url: "/help/joining-ministry" }
    ]
  },
  {
    title: "Using the Training Hub",
    slug: "training-hub",
    category: "training",
    summary: "How to complete training modules and track your progress.",
    content: `# Training Hub Guide

The Training Hub is where you complete required and optional training modules to prepare for ministry service.

## Finding Your Trainings

1. Go to **Training Hub** from the sidebar
2. View trainings in three tabs:
   - **Required** - Must complete before serving
   - **Optional** - Additional growth opportunities
   - **Completed** - Your finished trainings

## Completing a Training

Each training has three sections:

### 1. Teaching
Read or watch the main lesson content. Some trainings include video.

### 2. Study Questions
Reflect on what you learned with guided questions.

### 3. Assessment
Complete a quiz to demonstrate understanding.
- Some trainings require leader approval
- Your score is recorded for reference

## Training Status

- **Not Started** - Haven't begun yet
- **In Progress** - Started but not finished
- **Awaiting Review** - Submitted, waiting for leader approval
- **Approved** - Leader has approved your completion
- **Complete** - Finished and recorded

## Tips for Success

- Set aside uninterrupted time for each training
- Take notes during the teaching section
- Review study questions before the assessment
- Your progress saves automatically

## Need Help?

If you're stuck on a training or have questions:
- Click the "Ask for Help" button
- Your ministry leader will be notified
- They can approve or provide guidance`,
    tags: ["training", "learning", "modules", "assessment"],
    relatedLinks: [
      { title: "My Path", url: "/help/my-path-guide" },
      { title: "Ministry Requirements", url: "/help/ministry-requirements" }
    ]
  },
  {
    title: "Ministry Calendar Overview",
    slug: "calendar-overview",
    category: "calendar",
    summary: "Navigate the ministry calendar to view events, meetings, and room reservations.",
    content: `# Ministry Calendar

The Ministry Calendar shows all church events, team meetings, and room reservations in one unified view.

## Calendar Views

### Month View
- See the whole month at a glance
- Click any day to see its events
- Color-coded by category

### Agenda View
- List of upcoming events
- Choose range: Today, Week, Month, or 3 Months
- Perfect for quick reference

### Year View
- Overview of the entire year
- See busy months at a glance
- Click any month to jump there

## Filtering Events

Use the filters to focus on what matters:

### By Type
- **All Types** - Everything
- **Meetings** - Team and ministry meetings
- **Events** - Church-wide events
- **Rooms** - Room reservations

### By Ministry
Select a specific ministry to see only their events.

### By Category
Filter by event category (Worship, Training, Youth, etc.)

## Event Details

Click any event to see:
- Full description
- Location or room
- Ministry team
- Time and duration

## Syncing

Click the **Sync** button to refresh events from:
- Your church's Outlook calendar (if connected)
- Room reservation system
- Meeting schedules

Events typically sync every 15 minutes automatically.`,
    tags: ["calendar", "events", "meetings", "rooms", "schedule"],
    relatedLinks: [
      { title: "Room Reservations", url: "/help/room-reservations" },
      { title: "Calendar Categories", url: "/help/calendar-categories-guide" }
    ]
  },
  {
    title: "How Planning Center Fits with MinistryPath",
    slug: "planning-center-integration",
    category: "admin",
    summary: "Understand how Planning Center and MinistryPath work together for your church.",
    content: `# Planning Center + MinistryPath

MinistryPath is designed to complement Planning Center, not replace it. Here's how they work together.

## What Planning Center Does

Planning Center handles:
- **People Management** - Member database, contact info, demographics
- **Service Scheduling** - Who's serving when, team assignments
- **Check-ins** - Kid's ministry, event attendance tracking
- **Giving** - Donations and financial management

## What MinistryPath Does

MinistryPath focuses on:
- **Training & Development** - Ministry manuals, assessments, skill building
- **Readiness Tracking** - Who's trained and ready to serve
- **Spiritual Growth** - Discipleship pathways, Biblical formation
- **Team Health** - Leader oversight, onboarding progress

## When to Use Each

| Task | Use |
|------|-----|
| Add new member contact info | Planning Center |
| Schedule someone to serve | Planning Center |
| Complete ministry training | MinistryPath |
| Check spiritual gifts results | MinistryPath |
| Track attendance | Planning Center |
| Review team health indicators | MinistryPath |

## Key Principle

**Planning Center = Who is serving and when**
**MinistryPath = Who is ready and equipped**

Use both together for complete ministry management. MinistryPath helps ensure people are prepared before they show up on the Planning Center schedule.

## Syncing Data

Currently, MinistryPath can sync:
- Service assignments (from Planning Center)
- Team rosters (display only)

Member data should be managed in Planning Center as the primary source.`,
    tags: ["planning-center", "integration", "admin", "scheduling"],
    relatedLinks: [
      { title: "Calendar Overview", url: "/help/calendar-overview" },
      { title: "Training Hub Guide", url: "/help/training-hub" }
    ]
  }
];

export async function seedHelpArticles() {
  console.log("[Seed] Checking for new help articles to add...");
  
  let added = 0;
  let skipped = 0;
  
  for (const article of helpArticlesSeed) {
    try {
      const existing = await db.query.helpArticles.findFirst({
        where: (table, { eq }) => eq(table.slug, article.slug)
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      await db.insert(helpArticles).values({
        ...article,
        isPublished: true,
        viewCount: 0,
      });
      
      added++;
      console.log(`[Seed] Added help article: ${article.title}`);
    } catch (error) {
      console.error(`[Seed] Failed to add article "${article.title}":`, error);
    }
  }
  
  console.log(`[Seed] Help articles: ${added} added, ${skipped} already existed`);
  return { added, skipped };
}
