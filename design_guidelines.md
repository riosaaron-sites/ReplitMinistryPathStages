# MinistryPath Design Guidelines

## Design Approach
**Hybrid System**: shadcn/ui foundation with warm, faith-centered customization. Drawing inspiration from Linear's clean operations UI + Notion's structured content + Planning Center's approachable church software aesthetic.

**Core Principle**: Professional utility with human warmth - clean interfaces that feel welcoming, not sterile.

## Typography System
- **Primary Font**: Inter (UI, body, data) - 400, 500, 600 weights
- **Accent Font**: Crimson Pro (headings, ministry names, spiritual content) - 400, 600 weights
- **Scale**: Text-sm for labels/meta, text-base for body, text-lg for subheadings, text-2xl to text-4xl for headings (Crimson Pro)
- **Hierarchy**: Crimson Pro for all h1-h3 elements, Inter for h4-h6 and body content

## Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Compact spacing: p-4, gap-2 (data tables, tight lists)
- Standard spacing: p-6, gap-4 (cards, forms)
- Generous spacing: p-8 to p-12, gap-6 (section padding)
- Major sections: py-16 to py-24

**Grid Patterns**:
- Dashboard cards: 2-3 column grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Calendar views: Full-width with sidebar navigation
- Forms: Single column max-w-2xl for focus
- Ministry listings: Masonry-style cards with staggered heights

## Component Library

**Navigation**:
- Dual-mode header: Member portal (simplified) vs Leadership portal (full admin nav)
- Left sidebar navigation for admin sections with ministry icons
- Breadcrumbs for deep navigation paths
- Quick actions floating button (bottom-right) for common tasks

**Calendar Components**:
- **Month View**: Grid with event dots/indicators, click to expand day details in slide-over panel
- **Agenda View**: Chronological list with expandable event cards, grouped by date headers
- **Year View**: 12-month mini-calendars grid with heat-map visualization for event density
- **Event Cards**: Shadcn card with ministry badge, time, location, volunteer slots indicator
- **Admin Settings Panel**: Tabbed interface (Outlook Sync, Permissions, Notifications) with connection status indicators

**Data Display**:
- **Member Cards**: Avatar, name (Crimson Pro), ministry tags, status badge, quick actions menu
- **Metrics Widgets**: Large number (Crimson Pro), label (Inter), sparkline trend, comparison badge
- **Ministry Cards**: Cover image with gradient overlay, ministry name, description, engagement stats
- **Request Queue**: Kanban-style columns with draggable cards, priority indicators

**Forms & Inputs**:
- Shadcn form components with warm focus states
- Multi-step onboarding wizard with progress indicator
- Survey builder with drag-drop question blocks
- Training modules with progress tracking

**Buttons on Images**: Glass-morphism treatment (bg-white/10 backdrop-blur-md) for CTAs overlaying hero/ministry images

## Images

**Hero Sections**:
- **Member Portal Landing**: Warm, welcoming community image (people serving, worshipping together) - 60vh height, subtle gradient overlay (dark-to-transparent from bottom)
- **Leadership Dashboard**: No hero, jump straight to metrics and action cards
- **Ministry Pages**: Full-width 40vh ministry-specific imagery (children's ministry, worship team, community outreach)

**Supporting Images**:
- Member profile avatars throughout
- Ministry card thumbnails (16:9 ratio)
- Training module cover images
- Event calendar thumbnails (small, 80px square)

**Image Placement**: Hero on public/member-facing pages only. Operations/admin sections are image-minimal, focusing on data clarity.

## Accessibility & Dark Mode
- WCAG AA contrast ratios in both modes
- Dark mode: Warm neutral slate backgrounds (not pure black), reduced elevation shadows
- Form inputs maintain consistent height (h-10) and padding (px-3) across light/dark
- Focus indicators: 2px ring with offset for all interactive elements

## Visual Identity
- **Warmth**: Soft corner radii (rounded-lg standard, rounded-xl for cards)
- **Depth**: Subtle shadows in light mode, border emphasis in dark mode
- **Professionalism**: Generous whitespace, clear hierarchy, restrained animation
- **Faith-centered**: Crimson Pro for spiritual/ministry content, subtle cross or dove iconography in empty states only

## Constraints
- Minimize animations (subtle fade-ins, no distracting motion)
- Calendar maintains data density - avoid forcing 100vh constraints
- Multi-column layouts for dashboard widgets, single-column for forms/details
- Responsive breakpoints: mobile (base), tablet (md: at 768px), desktop (lg: at 1024px)