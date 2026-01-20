import type { SpiritualGift, MinistryId } from "@shared/schema";

export const GIFT_DESCRIPTIONS: Record<SpiritualGift, { name: string; description: string; biblicalReference: string }> = {
  prophecy: {
    name: "Prophecy / Encouragement",
    description: "You have a heart for speaking truth and encouragement. You sense God's direction and feel compelled to share what He reveals, building up and strengthening the body of Christ.",
    biblicalReference: "Romans 12:6, 1 Corinthians 14:3",
  },
  teaching: {
    name: "Teaching",
    description: "You enjoy explaining Scripture clearly and helping others understand and apply God's Word. You have a gift for making complex truths accessible and practical.",
    biblicalReference: "Romans 12:7, Ephesians 4:11",
  },
  shepherding: {
    name: "Shepherding / Pastoral Care",
    description: "You are drawn to nurturing people over time, walking with them through life's seasons. You care deeply about spiritual growth and wellbeing of others.",
    biblicalReference: "Ephesians 4:11, 1 Peter 5:2-3",
  },
  evangelism: {
    name: "Evangelism",
    description: "You feel bold and passionate about sharing the Gospel with those who don't know Jesus. You naturally look for opportunities to introduce people to Christ.",
    biblicalReference: "Ephesians 4:11, Acts 8:4",
  },
  discernment: {
    name: "Discernment",
    description: "You have spiritual sensitivity to perceive when something is true or false, good or harmful. You often sense spiritual dynamics that others miss.",
    biblicalReference: "1 Corinthians 12:10, Hebrews 5:14",
  },
  administration: {
    name: "Administration / Organization",
    description: "You excel at organizing resources, people, and systems to accomplish goals effectively. You bring order and efficiency to ministry efforts.",
    biblicalReference: "1 Corinthians 12:28, Romans 12:8",
  },
  leadership: {
    name: "Leadership",
    description: "You naturally take initiative, cast vision, and guide others toward goals. People look to you for direction and you feel comfortable making decisions.",
    biblicalReference: "Romans 12:8, Hebrews 13:17",
  },
  serving: {
    name: "Serving / Helps",
    description: "You find great joy in practical service, often behind the scenes. You meet needs and support others' ministries with a humble, faithful spirit.",
    biblicalReference: "Romans 12:7, 1 Corinthians 12:28",
  },
  mercy: {
    name: "Mercy / Compassion",
    description: "Your heart breaks for those who are hurting. You feel compelled to comfort the suffering and bring Christ's love to those in difficult circumstances.",
    biblicalReference: "Romans 12:8, Matthew 5:7",
  },
  giving: {
    name: "Giving / Generosity",
    description: "You feel called to give generously—financially and with your resources—to support Kingdom work. You find joy in resourcing ministry and meeting needs.",
    biblicalReference: "Romans 12:8, 2 Corinthians 9:7",
  },
  hospitality: {
    name: "Hospitality",
    description: "You love making people feel welcome and at home. Creating warm, inviting environments where people can experience community comes naturally to you.",
    biblicalReference: "Romans 12:13, 1 Peter 4:9",
  },
  intercession: {
    name: "Intercession / Prayer",
    description: "You carry a burden to pray for extended periods and intercede for others. Prayer is not just a discipline but a calling—you sense the urgency of prayer ministry.",
    biblicalReference: "Romans 8:26-27, James 5:16",
  },
  wisdom: {
    name: "Wisdom",
    description: "You receive insight and understanding from the Holy Spirit that guides decision-making and problem-solving. Others seek your counsel for navigating complex situations.",
    biblicalReference: "1 Corinthians 12:8, James 1:5",
  },
  knowledge: {
    name: "Word of Knowledge",
    description: "You perceive facts or truths supernaturally that you could not have known naturally. This gift often provides key information for ministry situations.",
    biblicalReference: "1 Corinthians 12:8",
  },
  faith: {
    name: "Faith",
    description: "You have an extraordinary confidence in God's promises and power that enables you to trust Him for the impossible. Your faith encourages others to believe.",
    biblicalReference: "1 Corinthians 12:9, Hebrews 11:1",
  },
  healing: {
    name: "Healing",
    description: "You are used by God as an instrument to restore health—physical, emotional, or spiritual—to those who are suffering. You believe God still heals today.",
    biblicalReference: "1 Corinthians 12:9, 28, James 5:14-15",
  },
  miracles: {
    name: "Miracles",
    description: "You experience God working through you to accomplish supernatural acts that bring glory to Him and authenticate the Gospel message.",
    biblicalReference: "1 Corinthians 12:10, 28",
  },
  tongues: {
    name: "Tongues",
    description: "You speak in languages you have not learned, either known languages or a heavenly prayer language, for worship, intercession, or communicating God's message.",
    biblicalReference: "1 Corinthians 12:10, 28, Acts 2:4",
  },
  interpretation: {
    name: "Interpretation of Tongues",
    description: "You receive the meaning of messages spoken in tongues and can communicate that message to the congregation for edification.",
    biblicalReference: "1 Corinthians 12:10, 30, 14:27-28",
  },
};

export const MINISTRY_DESCRIPTIONS: Record<MinistryId, { 
  name: string; 
  description: string; 
  roleDetails: string;
  icon: string;
}> = {
  greeters: {
    name: "Greeters",
    description: "Be the warm, welcoming face of our church family.",
    roleDetails: "Welcome guests at the doors, offer a friendly smile, and help people find their way. You'll be one of the first faces people see when they arrive at Garden City Church.",
    icon: "hand-wave",
  },
  "welcome-table": {
    name: "Welcome / Guest Table",
    description: "Help first-time guests connect with our church.",
    roleDetails: "Staff the guest table, provide welcome gifts, collect connection cards, and help newcomers learn about our church. This role is perfect for those who love building relationships.",
    icon: "gift",
  },
  ushers: {
    name: "Ushers",
    description: "Guide and assist during our worship services.",
    roleDetails: "Help seat guests, assist with offering collection, maintain order during services, and respond to any needs that arise. Ushers serve as caring hosts throughout the service.",
    icon: "users",
  },
  security: {
    name: "Security",
    description: "Help keep our church family safe and secure.",
    roleDetails: "Monitor entrances, maintain awareness of surroundings, and be prepared to respond to safety concerns. You'll help create a safe environment where people can worship freely.",
    icon: "shield",
  },
  transportation: {
    name: "Transportation",
    description: "Provide rides for those who need them.",
    roleDetails: "Help church members who lack transportation get to services and events. This ministry extends our reach and shows practical love to those in need.",
    icon: "car",
  },
  cafe: {
    name: "Cafe / Hospitality",
    description: "Create welcoming spaces through food and fellowship.",
    roleDetails: "Serve coffee, prepare refreshments, and create an inviting atmosphere where people can connect before and after services. Hospitality opens doors for relationship.",
    icon: "coffee",
  },
  facilities: {
    name: "Facilities / Setup / Cleaning",
    description: "Care for our church building and prepare spaces for worship.",
    roleDetails: "Set up chairs, prepare rooms, maintain cleanliness, and ensure our facilities honor God. This behind-the-scenes ministry makes everything else possible.",
    icon: "wrench",
  },
  worship: {
    name: "Worship Team",
    description: "Lead our congregation in musical worship.",
    roleDetails: "Use your musical gifts to lead others into God's presence through song. This includes vocalists and instrumentalists who practice weekly and lead during services.",
    icon: "music",
  },
  sound: {
    name: "Sound",
    description: "Operate audio equipment for services and events.",
    roleDetails: "Run the soundboard, manage microphones, and ensure clear audio for our services. Training is provided for those eager to learn.",
    icon: "volume-2",
  },
  lyrics: {
    name: "Lyrics / ProPresenter",
    description: "Display worship lyrics and announcements.",
    roleDetails: "Operate ProPresenter or similar software to display song lyrics, Scripture, and announcements during services. Attention to detail and timing are key.",
    icon: "monitor",
  },
  livestream: {
    name: "Live Stream / Video",
    description: "Broadcast our services online and capture video.",
    roleDetails: "Operate cameras, manage live stream broadcasts, and help with basic video editing. Extend our reach to those who can't attend in person.",
    icon: "video",
  },
  "visual-art": {
    name: "Visual Art",
    description: "Create visual expressions of worship.",
    roleDetails: "Use painting, drawing, or other visual media to create art that glorifies God and enhances our worship environment.",
    icon: "palette",
  },
  "graphic-design": {
    name: "Graphic Design",
    description: "Design visual materials for our church.",
    roleDetails: "Create graphics for social media, bulletins, banners, and promotional materials. Help communicate our message with compelling visuals.",
    icon: "image",
  },
  dance: {
    name: "Dance",
    description: "Express worship through movement.",
    roleDetails: "Use dance to lead worship and express praise to God. Participate in choreographed pieces for special services and events.",
    icon: "sparkles",
  },
  drama: {
    name: "Drama / Spoken Word",
    description: "Communicate truth through performance.",
    roleDetails: "Participate in dramatic sketches, spoken word presentations, and creative elements that enhance our services and communicate the Gospel.",
    icon: "theater",
  },
  photography: {
    name: "Photography / Videography",
    description: "Capture moments and tell our story visually.",
    roleDetails: "Photograph services and events, create video content, and help document the life of our church for sharing and archiving.",
    icon: "camera",
  },
  teaching: {
    name: "Teaching / Discipleship",
    description: "Lead Bible studies and discipleship groups.",
    roleDetails: "Teach adult Bible studies, lead small groups, or facilitate our Discipleship Hour. Help others grow deeper in their understanding of Scripture.",
    icon: "book-open",
  },
  youth: {
    name: "Youth Ministry",
    description: "Invest in the next generation of teenagers.",
    roleDetails: "Mentor and disciple students in middle and high school. Lead activities, facilitate discussions, and walk alongside youth as they grow in faith.",
    icon: "graduation-cap",
  },
  children: {
    name: "Children's Ministry (Kingdom Children)",
    description: "Teach and care for our youngest members.",
    roleDetails: "Lead children's classes, teach Bible lessons, and create engaging experiences for kids to learn about Jesus. Background checks required.",
    icon: "baby",
  },
  nursery: {
    name: "Nursery",
    description: "Care for our infants and toddlers.",
    roleDetails: "Provide loving care for babies and toddlers while parents worship. Create a safe, nurturing environment for our littlest ones. Background checks required.",
    icon: "heart",
  },
  "young-adults": {
    name: "Young Adults",
    description: "Connect with and disciple young adults (18-30).",
    roleDetails: "Lead or support young adult ministry, facilitate gatherings, and help young adults navigate faith in this season of life.",
    icon: "users-2",
  },
  outreach: {
    name: "Outreach / Evangelism / Community Service",
    description: "Take the love of Jesus beyond our walls.",
    roleDetails: "Participate in community outreach events, evangelism efforts, and service projects. Be the hands and feet of Jesus in our community.",
    icon: "globe",
  },
};

export const DISC_DESCRIPTIONS = {
  D: {
    name: "Dominant (D)",
    description: "You are results-oriented, decisive, and competitive. You thrive on challenges and like to take charge.",
    strengths: ["Direct communication", "Quick decision-making", "Goal-focused", "Confident leadership"],
    challenges: ["May seem impatient", "Can be overly direct", "May overlook details"],
    bestFit: ["Leadership roles", "Project management", "Problem-solving teams"],
  },
  I: {
    name: "Influential (I)",
    description: "You are enthusiastic, optimistic, and collaborative. You love working with people and inspiring others.",
    strengths: ["Enthusiastic communication", "Team building", "Creative thinking", "Motivating others"],
    challenges: ["May avoid details", "Can be disorganized", "May talk more than listen"],
    bestFit: ["Greeters", "Worship team", "Youth ministry", "Outreach"],
  },
  S: {
    name: "Steady (S)",
    description: "You are patient, reliable, and supportive. You value harmony and enjoy helping others succeed.",
    strengths: ["Patient listening", "Reliable follow-through", "Team player", "Supportive nature"],
    challenges: ["May resist change", "Can be overly accommodating", "May avoid confrontation"],
    bestFit: ["Nursery/Children", "Care ministries", "Behind-the-scenes roles", "Support teams"],
  },
  C: {
    name: "Conscientious (C)",
    description: "You are analytical, precise, and quality-focused. You value accuracy and thorough preparation.",
    strengths: ["Attention to detail", "Quality focus", "Systematic thinking", "Thorough research"],
    challenges: ["May over-analyze", "Can be critical", "May avoid risk"],
    bestFit: ["Sound/Tech", "Teaching preparation", "Administration", "Finance teams"],
  },
};

// New 3-level Biblical Literacy system
export const BIBLICAL_LITERACY_LEVELS = {
  low: {
    name: "Building Foundation",
    description: "You're at the beginning of an exciting journey of discovering God's Word. Everyone starts somewhere, and we're here to walk with you.",
    recommendation: "Consider starting with our Following Jesus class or the Bible Basics study group.",
    encouragement: "The Bible is a treasure waiting to be explored! We have great resources and caring mentors ready to help you grow.",
    canTeach: false,
    healthContribution: 'needs-growth',
  },
  developing: {
    name: "Growing Strong",
    description: "You have a solid foundation and are actively growing in your understanding of Scripture. Keep pressing in—you're on a great path!",
    recommendation: "Consider joining Discipleship Hour or starting a 365-day Bible reading plan.",
    encouragement: "You're making wonderful progress! Continue building on what you've learned.",
    canTeach: false,
    healthContribution: 'healthy',
  },
  strong: {
    name: "Spiritually Mature",
    description: "You demonstrate strong biblical knowledge and are ready to help others grow in their faith journey. Your understanding can be a blessing to others.",
    recommendation: "You're well-equipped to lead a small group or mentor newer believers.",
    encouragement: "Your knowledge of Scripture positions you well to serve and mentor others!",
    canTeach: true,
    healthContribution: 'thriving',
  },
};

export const PERSONALITY_TYPES = {
  "Warm Encourager": {
    traits: ["People-focused", "Emotionally expressive", "Flexible"],
    description: "You energize those around you with warmth and encouragement. Your people-first approach creates connections and helps others feel valued.",
  },
  "Steady Servant": {
    traits: ["Task-focused", "Detail-oriented", "Structured"],
    description: "You serve faithfully and reliably behind the scenes. Your steady, consistent presence makes ministry run smoothly.",
  },
  "Visionary Leader": {
    traits: ["Big-picture thinker", "Extroverted", "Initiative-driven"],
    description: "You naturally cast vision and rally others toward goals. Your leadership brings direction and momentum to ministry efforts.",
  },
  "Thoughtful Teacher": {
    traits: ["Detail-oriented", "Reflective", "Structured"],
    description: "You process deeply and communicate clearly. Your thoughtful approach helps others understand complex truths.",
  },
  "Creative Expresser": {
    traits: ["Flexible", "Emotionally expressive", "Big-picture"],
    description: "You bring creativity and artistic expression to ministry. Your unique perspective enriches our worship and communication.",
  },
  "Organized Administrator": {
    traits: ["Task-focused", "Structured", "Detail-oriented"],
    description: "You bring order and efficiency to ministry. Your organizational skills help teams function effectively.",
  },
  "Compassionate Caregiver": {
    traits: ["People-focused", "Mercy-driven", "Patient"],
    description: "You notice when others are hurting and respond with genuine care. Your compassion brings healing and comfort.",
  },
  "Bold Evangelist": {
    traits: ["Extroverted", "Passionate", "Initiative-driven"],
    description: "You confidently share your faith and engage with those who don't know Jesus. Your boldness opens doors for the Gospel.",
  },
};
