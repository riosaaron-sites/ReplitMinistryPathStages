export interface HelpArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
  relatedLinks: Array<{ label: string; path: string }>;
  category: string;
}

export interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Onboarding, profile setup, and ministry connections',
    icon: 'rocket',
  },
  {
    id: 'trainings',
    title: 'Trainings',
    description: 'Required and optional trainings, review mode',
    icon: 'graduation-cap',
  },
  {
    id: 'discipleship',
    title: 'Discipleship Journey',
    description: 'Your pathway from Worship to Lead',
    icon: 'heart',
  },
  {
    id: 'workboards',
    title: 'Workboards & Meetings',
    description: 'Collaborative boards and meeting management',
    icon: 'clipboard-list',
  },
  {
    id: 'serving',
    title: 'Serving Metrics & Health',
    description: 'Understanding your health indicators',
    icon: 'bar-chart',
  },
  {
    id: 'surveys',
    title: 'Surveys & Biblical Formation',
    description: 'Spiritual gifts and Biblical knowledge',
    icon: 'book-open',
  },
  {
    id: 'admin',
    title: 'Admin & Configuration',
    description: 'Manuals, trainings, roles, and settings',
    icon: 'settings',
  },
];

export const helpArticles: HelpArticle[] = [
  // Getting Started
  {
    id: 'welcome-to-gcc',
    title: 'Welcome to MinistryPath',
    summary: 'An introduction to our church engagement platform',
    body: `Welcome to MinistryPath! This platform is designed to help you connect, grow, and serve at Garden City Church.

**What You Can Do Here:**
- Complete your onboarding and profile setup
- Discover ministries that match your gifts and passions
- Track your discipleship journey
- Access training materials
- Connect with your ministry leaders
- Respond to serving opportunities

**Getting Started:**
Start by completing your profile with a photo and bio. Then explore the ministries that interest you and take the spiritual gifts survey to discover where you might best serve.`,
    relatedLinks: [
      { label: 'Complete Your Profile', path: '/profile' },
      { label: 'Take the Survey', path: '/survey' },
      { label: 'View Ministries', path: '/about' },
    ],
    category: 'getting-started',
  },
  {
    id: 'completing-onboarding',
    title: 'Completing Your Onboarding',
    summary: 'Step-by-step guide to finish your onboarding journey',
    body: `Your onboarding journey includes several important steps that help us get to know you and connect you to the right ministry opportunities.

**Onboarding Steps:**
1. **Welcome** - Learn about our church family
2. **Profile** - Share your basic information
3. **Ministries** - Explore ministry interests
4. **Faith Commitment** - Affirm your faith journey
5. **Photo** - Add your profile picture
6. **Classes** - Complete Next Night and Following Jesus classes

**What If I Have Questions?**
At any step, you can use the "I Have Questions" feature to connect with our pastoral team. They will reach out to walk alongside you in your faith journey.`,
    relatedLinks: [
      { label: 'Continue Onboarding', path: '/onboarding' },
      { label: 'My Profile', path: '/profile' },
    ],
    category: 'getting-started',
  },
  {
    id: 'setting-up-profile',
    title: 'Setting Up Your Profile',
    summary: 'How to add your photo, bio, and social links',
    body: `A complete profile helps your ministry leaders and team members connect with you. Here is what you need to include:

**Required:**
- Profile Photo - A clear, friendly photo of yourself
- Bio - A short description about yourself (at least 10 characters)

**Optional:**
- Social Media Links - Connect your Instagram, Facebook, or other profiles
- Phone Number - For ministry communication

**Tips for a Great Profile:**
- Use a recent, well-lit photo
- Write a bio that shares your interests and passions
- Keep information current

Your profile is visible to other ministry team members and leadership.`,
    relatedLinks: [
      { label: 'Edit Profile', path: '/profile' },
    ],
    category: 'getting-started',
  },
  {
    id: 'exploring-ministries',
    title: 'Exploring Ministry Opportunities',
    summary: 'Discover where you can serve and make an impact',
    body: `Garden City Church has many ministry opportunities organized into categories:

**Ministry Categories:**
- **Guest Services** - Welcome, ushers, greeters, cafe
- **Worship & Creative** - Worship team, sound, lyrics, visual arts
- **Next Generation** - Kids, youth, nursery ministries
- **Community & Care** - Prayer, pastoral care, outreach
- **Operations** - Facilities, security, transportation

**How Ministry Matching Works:**
After taking the spiritual gifts survey, we match your gifts and personality to ministries where you can thrive. You will see recommendations based on:
- Your spiritual gifts
- Your DISC personality profile
- Your technical skills
- Your stated interests

**Joining a Ministry:**
When you find a ministry you are interested in, you can request to join. Ministry leaders will review your request and connect with you about next steps.`,
    relatedLinks: [
      { label: 'View All Ministries', path: '/about' },
      { label: 'Take the Survey', path: '/survey' },
      { label: 'View My Results', path: '/results' },
    ],
    category: 'getting-started',
  },

  // Trainings
  {
    id: 'required-trainings',
    title: 'Required vs Optional Trainings',
    summary: 'Understanding which trainings you need to complete',
    body: `Trainings help equip you for effective ministry service. There are two types:

**Required Trainings:**
- Must be completed before serving in certain capacities
- Often include assessments to verify understanding
- Marked with a "Required" badge

**Optional Trainings:**
- Enhance your skills and knowledge
- Available for personal growth
- Can be completed at your own pace

**Finding Your Required Trainings:**
Visit the Training Hub to see which trainings are assigned to you based on your ministry roles. Required trainings appear first with a clear completion status.`,
    relatedLinks: [
      { label: 'Training Hub', path: '/trainings' },
      { label: 'My Dashboard', path: '/dashboard' },
    ],
    category: 'trainings',
  },
  {
    id: 'completing-training',
    title: 'Completing a Training Module',
    summary: 'How to work through lessons, questions, and assessments',
    body: `Each training module has a structured learning path:

**Training Steps:**
1. **Lesson Teaching** - Read through the lesson content and watch any videos
2. **Study Questions** - Reflect on what you have learned
3. **Assessment Quiz** - Demonstrate your understanding

**Tips for Success:**
- Take your time with each lesson
- Write notes on key concepts
- Review before the assessment
- You can retake assessments if needed

**After Completion:**
Once you complete a training, you'll reach a meaningful milestone on your path. Your ministry leaders can see your training progress and affirm your completion.`,
    relatedLinks: [
      { label: 'Training Hub', path: '/trainings' },
      { label: 'My Progress', path: '/my-path' },
    ],
    category: 'trainings',
  },
  {
    id: 'review-mode',
    title: 'Training Review Mode',
    summary: 'How to revisit completed trainings for reference',
    body: `After completing a training, you can return to review the content anytime.

**Review Mode Features:**
- Access all lesson content
- Review study questions and your answers
- Reference key concepts
- No need to retake assessments

**When to Use Review Mode:**
- Before serving in a new role
- To refresh your memory on procedures
- When helping train new team members

Review mode is available for all completed trainings from your Training Hub.`,
    relatedLinks: [
      { label: 'Training Hub', path: '/trainings' },
    ],
    category: 'trainings',
  },

  // Discipleship Journey
  {
    id: 'discipleship-pathway',
    title: 'The Discipleship Pathway',
    summary: 'Your journey from Worship to Lead',
    body: `The discipleship pathway is your growth journey at Garden City Church:

**The Pathway:**
1. **WORSHIP** - Connect with God through regular worship attendance
2. **NEXT NIGHT** - Learn about our church family and values
3. **LEARN** - Complete Following Jesus and other foundational classes
4. **LOVE** - Join a community group and build relationships
5. **LEAD** - Step into serving and leadership roles

**Tracking Your Progress:**
Your dashboard shows where you are on the pathway. Each step builds on the previous one, guiding you toward full engagement in the church family.

**Moving Forward:**
As you complete each step, new opportunities open up. Your ministry leaders and pastors are here to help you take the next step in your journey.`,
    relatedLinks: [
      { label: 'My Path', path: '/my-path' },
      { label: 'My Dashboard', path: '/dashboard' },
    ],
    category: 'discipleship',
  },
  {
    id: 'next-night-class',
    title: 'About Next Night',
    summary: 'Our introductory class for newcomers',
    body: `Next Night is our introductory class designed for anyone new to Garden City Church.

**What You Will Learn:**
- Our church history and vision
- Core values and beliefs
- How to get connected
- Ministry opportunities

**When and Where:**
Next Night is offered regularly. Check the calendar or ask your connection host for upcoming dates.

**After Completing:**
Once you complete Next Night, you unlock the next step in your discipleship pathway and can explore deeper involvement in our church family.`,
    relatedLinks: [
      { label: 'My Path', path: '/my-path' },
      { label: 'Meetings', path: '/meetings' },
    ],
    category: 'discipleship',
  },

  // Workboards & Meetings
  {
    id: 'using-workboards',
    title: 'Using Workboards',
    summary: 'Collaborate with your team using workboards',
    body: `Workboards help ministry teams organize projects and initiatives.

**Workboard Types:**
- **Meeting Boards** - For team meetings with agendas, decisions, and notes
- **Ministry Boards** - For ongoing projects and initiatives

**Workboard Features:**
- Action items with owners and due dates
- Priority levels (high, medium, low)
- Threaded comments for discussion
- Meeting notes and decisions

**Getting Started:**
Your ministry leaders may invite you to workboards. You can view boards assigned to your ministries and contribute action items, comments, and updates.`,
    relatedLinks: [
      { label: 'My Workboards', path: '/leadership/workboards' },
    ],
    category: 'workboards',
  },
  {
    id: 'meeting-management',
    title: 'Meeting Management',
    summary: 'How to prepare for and participate in team meetings',
    body: `Team meetings are organized through the Meetings feature.

**Meeting Types:**
- Ministry team meetings
- Leadership gatherings
- Training sessions

**Before the Meeting:**
- Review the meeting agenda on the workboard
- Complete any assigned preparation items
- Note any discussion topics you want to raise

**During the Meeting:**
- Track decisions and action items
- Add notes to the meeting board
- Volunteer for follow-up tasks

**After the Meeting:**
- Review assigned action items
- Complete tasks by their due dates
- Update the board with progress`,
    relatedLinks: [
      { label: 'Meetings', path: '/leadership/meetings' },
      { label: 'Workboards', path: '/leadership/workboards' },
    ],
    category: 'workboards',
  },

  // Serving Metrics & Health
  {
    id: 'understanding-health-indicators',
    title: 'Understanding Health Indicators',
    summary: 'What the green, yellow, and red indicators mean',
    body: `Health indicators help you and your leaders understand your engagement level.

**Indicator Colors:**
- **Green (Thriving)** - You are fully engaged and growing
- **Yellow (Growing)** - You are making progress with room to grow
- **Red (Needs Care)** - Some areas may need attention

**What Affects Your Health Score:**
- Onboarding completion
- Training progress
- Serve rate (accepted vs scheduled)
- Response to ministry requests

**This Is Not About Performance:**
Health indicators are designed to help your leaders care for you. If you see yellow or red, it may mean:
- You need support or encouragement
- Life circumstances are affecting your availability
- There is an opportunity for a conversation

Your leaders use these indicators to check in and offer support, not to judge.`,
    relatedLinks: [
      { label: 'My Dashboard', path: '/dashboard' },
    ],
    category: 'serving',
  },
  {
    id: 'serve-rate-explained',
    title: 'Serve Rate Explained',
    summary: 'How your serving metrics are calculated',
    body: `Your serve rate shows how often you serve when scheduled.

**How It Is Calculated:**
Serve Rate = (Times Served) / (Times Scheduled) x 100%

**Status Types:**
- **Served** - You showed up and served
- **Accepted** - You confirmed you would serve
- **Declined** - You were unable to serve
- **No Response** - You have not responded yet

**What a Good Serve Rate Looks Like:**
We understand life happens! A healthy serve rate shows consistent engagement while allowing for occasional conflicts. If you are frequently unable to serve, talk with your ministry leader about adjusting your schedule.

**Trend Indicators:**
- Arrow up: Your serve rate is improving
- Arrow down: Your serve rate is decreasing
- Steady: Your serve rate is consistent`,
    relatedLinks: [
      { label: 'My Dashboard', path: '/dashboard' },
      { label: 'Meetings', path: '/meetings' },
    ],
    category: 'serving',
  },

  // Surveys & Biblical Formation
  {
    id: 'spiritual-gifts-survey',
    title: 'The Spiritual Gifts Survey',
    summary: 'Discover your unique gifts and ministry fit',
    body: `The Spiritual Gifts Survey helps you discover how God has uniquely gifted you for ministry.

**What the Survey Covers:**
- Spiritual gifts assessment (based on Romans 12, 1 Corinthians 12, Ephesians 4)
- DISC personality profile
- Technical skills inventory
- Ministry interests

**How Long Does It Take?**
Plan for about 20-30 minutes to complete the survey thoughtfully. You can save your progress and return later.

**What Happens After?**
Your results show:
- Your top spiritual gifts
- Your personality type
- Recommended ministries based on your unique profile
- Action steps for next engagement`,
    relatedLinks: [
      { label: 'Take the Survey', path: '/survey' },
      { label: 'View My Results', path: '/results' },
    ],
    category: 'surveys',
  },
  {
    id: 'biblical-formation',
    title: 'Biblical Formation Assessment',
    summary: 'Understanding your Bible knowledge and growth areas',
    body: `The Biblical Formation assessment measures your familiarity with Scripture across four areas:

**Assessment Buckets:**
1. **Bible Basics** - Structure, books, and navigation
2. **Story & Timeline** - Key events and biblical narrative
3. **Jesus & Salvation** - Gospel and redemption
4. **How to Read the Bible** - Interpretation and application

**Scoring Levels:**
- **Strong (70%+)** - You have a solid foundation
- **Developing (40-69%)** - You are growing in knowledge
- **Building (Under 40%)** - Great starting point for growth

**This Is Not a Test:**
Biblical Formation is about identifying growth opportunities. Everyone is at a different place in their journey, and every score reveals a pathway forward.

**Next Steps:**
Based on your results, you will see recommended resources and classes to help you continue growing in Scripture knowledge.`,
    relatedLinks: [
      { label: 'View My Results', path: '/results' },
      { label: 'My Path', path: '/my-path' },
    ],
    category: 'surveys',
  },

  // Admin & Configuration
  {
    id: 'managing-manuals',
    title: 'Managing Manuals & Resources',
    summary: 'How to upload and organize ministry manuals',
    body: `Manuals and resources are organized into three categories:

**Manual Categories:**
1. **Ministry Manuals** - Specific to individual ministries
2. **Leadership Training** - Materials for leaders and pastors
3. **Resources** - General documents (policies, bylaws, handbooks)

**Uploading Manuals (Admin):**
Administrators can upload PDF manuals through the Admin Panel. When uploaded, manuals can be:
- Assigned to specific ministries
- Set as required reading
- Used to auto-generate trainings

**Accessing Manuals:**
Members see manuals based on their ministry assignments. Leadership Training and Resources are available to all team members.`,
    relatedLinks: [
      { label: 'Resources Library', path: '/resources' },
      { label: 'Admin Panel', path: '/leadership/admin' },
    ],
    category: 'admin',
  },
  {
    id: 'generating-trainings',
    title: 'Generating Training Modules',
    summary: 'How to create trainings from uploaded manuals',
    body: `Training modules can be generated automatically from uploaded manuals using AI analysis.

**How It Works:**
1. Upload a PDF manual through the Admin Panel
2. Mark the manual for training generation
3. The system analyzes the content and creates:
   - Lesson summaries
   - Study questions
   - Assessment quizzes

**Training Module Structure:**
- Multiple lessons organized by topic
- Reflection questions for each lesson
- Knowledge checks and assessments
- Optional video content links

**Manual vs Auto-Generated:**
- Auto-generated trainings are created from manual analysis
- Manual trainings are created directly by administrators
- Both types can be edited and customized`,
    relatedLinks: [
      { label: 'Training Management', path: '/leadership/trainings' },
      { label: 'Admin Panel', path: '/leadership/admin' },
    ],
    category: 'admin',
  },
  {
    id: 'understanding-roles',
    title: 'Understanding Roles & Permissions',
    summary: 'How the role hierarchy works',
    body: `The platform uses a role-based permission system:

**Role Hierarchy:**
1. **Owner** - Full system control
2. **Admin** - System management (no pastoral authority)
3. **Pastor** - Pastoral care and oversight
4. **Leader** - Ministry team leadership
5. **Member** - Full ministry access
6. **Intern** - Learning and shadowing
7. **Attendee** - Basic access

**What Each Role Can Do:**
- **Pastoral Roles** (Owner, Pastor) - Access pastoral questions, faith commitments, sensitive care items
- **Leadership Roles** (Owner, Admin, Pastor, Leader) - Manage teams, trainings, requests
- **Admin Roles** (Owner, Admin) - System configuration, user management

**Important:** Admins have system control but NOT pastoral authority. Pastoral matters are handled only by Owner and Pastor roles.`,
    relatedLinks: [
      { label: 'People & Roles', path: '/leadership/people' },
    ],
    category: 'admin',
  },

  // Contact / Help
  {
    id: 'getting-help',
    title: 'Getting Help & Support',
    summary: 'How to reach out when you need assistance',
    body: `We are here to help you succeed in ministry!

**For Technical Issues:**
Use the Request Center to submit a help request. Our team will respond as soon as possible.

**For Pastoral Questions:**
If you have questions about faith, doctrine, or spiritual matters, use the "I Have Questions" feature during onboarding or reach out to your ministry leader.

**For Ministry Questions:**
Your ministry leader is your first point of contact for questions about:
- Serving schedules
- Training requirements
- Team responsibilities
- Ministry-specific concerns

**Finding Your Leader:**
Your dashboard shows "Who I Report To" with your direct ministry leadership contacts.`,
    relatedLinks: [
      { label: 'Request Center', path: '/requests' },
      { label: 'My Dashboard', path: '/dashboard' },
    ],
    category: 'getting-started',
  },
];
