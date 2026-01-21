import type { 
  SurveyAnswers, 
  SpiritualGift, 
  GiftScore, 
  DISCProfile,
  DISCType,
  BiblicalLiteracyResult,
  LiteracyLevel,
  LiteracyBucket,
  LiteracyBucketScore,
  TechnicalSkillsProfile,
  TechnicalSkillResult,
  SkillLevel,
  MinistryMatch,
  MinistryId 
} from "@shared/schema";
import { SURVEY_QUESTIONS } from "../client/src/lib/surveyQuestions";

// =============================================================================
// SPIRITUAL GIFT DESCRIPTIONS
// =============================================================================

const GIFT_DATA: Record<SpiritualGift, {
  name: string;
  description: string;
  biblicalReference: string;
  biblicalExample: string;
  howYouOperate: string;
  ministryFit: string[];
  teamCulture: string;
}> = {
  'word-of-wisdom': {
    name: 'Word of Wisdom',
    description: 'You receive supernatural insight for applying knowledge to specific situations.',
    biblicalReference: '1 Corinthians 12:8',
    biblicalExample: 'Solomon judging between two mothers (1 Kings 3:16-28)',
    howYouOperate: 'You often sense the right course of action in complex situations.',
    ministryFit: ['Teaching', 'Counseling', 'Leadership'],
    teamCulture: 'Strategic thinkers, decision-makers',
  },
  'word-of-knowledge': {
    name: 'Word of Knowledge',
    description: 'You receive supernatural revelation about facts or circumstances unknown naturally.',
    biblicalReference: '1 Corinthians 12:8',
    biblicalExample: 'Jesus knowing the Samaritan woman\'s past (John 4:17-18)',
    howYouOperate: 'You sense specific details about people or situations during prayer.',
    ministryFit: ['Prayer Team', 'Altar Ministry', 'Prophetic Ministry'],
    teamCulture: 'Spirit-led, prayer-focused teams',
  },
  'faith': {
    name: 'Faith',
    description: 'You have extraordinary confidence in God\'s power and promises beyond ordinary belief.',
    biblicalReference: '1 Corinthians 12:9',
    biblicalExample: 'Abraham believing God for a son in old age (Romans 4:18-21)',
    howYouOperate: 'You trust God for the impossible and inspire others to believe.',
    ministryFit: ['Prayer Team', 'Outreach', 'Leadership'],
    teamCulture: 'Vision-driven, faith-filled teams',
  },
  'healing': {
    name: 'Gifts of Healing',
    description: 'You are used by God to restore health to the sick and afflicted.',
    biblicalReference: '1 Corinthians 12:9',
    biblicalExample: 'Peter healing the lame man (Acts 3:1-10)',
    howYouOperate: 'You feel compelled to pray for the sick and see God heal.',
    ministryFit: ['Prayer Team', 'Altar Ministry', 'Hospital Visitation'],
    teamCulture: 'Compassionate, Spirit-led teams',
  },
  'miracles': {
    name: 'Working of Miracles',
    description: 'You are used by God to perform supernatural acts that alter the natural order.',
    biblicalReference: '1 Corinthians 12:10',
    biblicalExample: 'Elijah calling down fire from heaven (1 Kings 18:38)',
    howYouOperate: 'You see God work through you in extraordinary ways.',
    ministryFit: ['Prayer Team', 'Evangelism', 'Missions'],
    teamCulture: 'Bold, faith-filled teams',
  },
  'prophecy': {
    name: 'Prophecy',
    description: 'You receive and communicate divine messages for edification, exhortation, and comfort.',
    biblicalReference: '1 Corinthians 12:10; 14:3',
    biblicalExample: 'Agabus prophesying famine (Acts 11:28)',
    howYouOperate: 'You sense what God is saying and feel compelled to speak it.',
    ministryFit: ['Prayer Team', 'Altar Ministry', 'Worship'],
    teamCulture: 'Spirit-sensitive, encouraging teams',
  },
  'discernment': {
    name: 'Discerning of Spirits',
    description: 'You can distinguish between divine, human, and demonic influences.',
    biblicalReference: '1 Corinthians 12:10',
    biblicalExample: 'Paul discerning the spirit in the slave girl (Acts 16:16-18)',
    howYouOperate: 'You sense spiritual dynamics that others miss.',
    ministryFit: ['Prayer Team', 'Leadership', 'Security'],
    teamCulture: 'Protective, watchful teams',
  },
  'tongues': {
    name: 'Speaking in Tongues',
    description: 'You speak in languages you have not learned, for prayer or public edification.',
    biblicalReference: '1 Corinthians 12:10',
    biblicalExample: 'The disciples at Pentecost (Acts 2:4)',
    howYouOperate: 'You pray in the Spirit and sometimes speak publicly with interpretation.',
    ministryFit: ['Prayer Team', 'Intercessory Prayer'],
    teamCulture: 'Spirit-filled, prayer-focused teams',
  },
  'interpretation-of-tongues': {
    name: 'Interpretation of Tongues',
    description: 'You understand and communicate the meaning of messages spoken in tongues.',
    biblicalReference: '1 Corinthians 12:10',
    biblicalExample: 'The gift operating in Corinthian churches (1 Corinthians 14:27-28)',
    howYouOperate: 'You sense the meaning when someone speaks in tongues publicly.',
    ministryFit: ['Prayer Team', 'Worship'],
    teamCulture: 'Spirit-sensitive teams',
  },
  'service': {
    name: 'Service',
    description: 'You identify and meet practical needs with joy and faithfulness.',
    biblicalReference: 'Romans 12:7',
    biblicalExample: 'The seven deacons serving tables (Acts 6:1-6)',
    howYouOperate: 'You find fulfillment in helping others succeed.',
    ministryFit: ['Facilities', 'Hospitality', 'Setup/Cleanup'],
    teamCulture: 'Hands-on, behind-the-scenes teams',
  },
  'teaching': {
    name: 'Teaching',
    description: 'You explain God\'s Word with clarity, making truth understandable and applicable.',
    biblicalReference: 'Romans 12:7',
    biblicalExample: 'Apollos explaining the Scriptures (Acts 18:24-28)',
    howYouOperate: 'You communicate complex truths in accessible ways.',
    ministryFit: ['Teaching', 'Discipleship', 'Small Groups'],
    teamCulture: 'Learning-focused, systematic teams',
  },
  'exhortation': {
    name: 'Exhortation',
    description: 'You encourage, challenge, and motivate others toward godly living.',
    biblicalReference: 'Romans 12:8',
    biblicalExample: 'Barnabas encouraging the early church (Acts 11:23)',
    howYouOperate: 'You inspire people to take action and grow spiritually.',
    ministryFit: ['Discipleship', 'Youth', 'Counseling'],
    teamCulture: 'Encouraging, growth-oriented teams',
  },
  'giving': {
    name: 'Giving',
    description: 'You joyfully contribute resources to advance God\'s Kingdom.',
    biblicalReference: 'Romans 12:8',
    biblicalExample: 'The Macedonian churches giving generously (2 Corinthians 8:1-5)',
    howYouOperate: 'You find joy in funding ministry and meeting financial needs.',
    ministryFit: ['Benevolence', 'Missions Support'],
    teamCulture: 'Generous, resourceful teams',
  },
  'leadership': {
    name: 'Leadership',
    description: 'You cast vision, set direction, and guide others toward goals.',
    biblicalReference: 'Romans 12:8',
    biblicalExample: 'Nehemiah leading the wall rebuilding (Nehemiah 2-6)',
    howYouOperate: 'You take initiative and others follow your direction.',
    ministryFit: ['Leadership', 'Team Leadership'],
    teamCulture: 'Vision-driven, goal-oriented teams',
  },
  'mercy': {
    name: 'Mercy',
    description: 'You feel deep compassion and actively comfort those who suffer.',
    biblicalReference: 'Romans 12:8',
    biblicalExample: 'The Good Samaritan (Luke 10:33-35)',
    howYouOperate: 'You are drawn to hurting people and bring comfort.',
    ministryFit: ['Prayer Team', 'Hospital Visitation', 'Outreach'],
    teamCulture: 'Compassionate, caring teams',
  },
  'apostleship': {
    name: 'Apostleship',
    description: 'You pioneer new works, plant churches, and provide oversight to multiple ministries.',
    biblicalReference: 'Ephesians 4:11; 1 Corinthians 12:28',
    biblicalExample: 'Paul planting churches throughout the Roman Empire',
    howYouOperate: 'You start new initiatives and establish foundational work.',
    ministryFit: ['Church Planting', 'Missions', 'Leadership'],
    teamCulture: 'Pioneering, entrepreneurial teams',
  },
  'prophet': {
    name: 'Prophet',
    description: 'You speak forth God\'s message to the church and world with authority.',
    biblicalReference: 'Ephesians 4:11',
    biblicalExample: 'John the Baptist calling people to repentance (Matthew 3:1-12)',
    howYouOperate: 'You proclaim truth boldly and call people to righteousness.',
    ministryFit: ['Prayer Team', 'Teaching', 'Leadership'],
    teamCulture: 'Truth-focused, courageous teams',
  },
  'evangelist': {
    name: 'Evangelist',
    description: 'You effectively communicate the Gospel and lead people to Christ.',
    biblicalReference: 'Ephesians 4:11',
    biblicalExample: 'Philip preaching in Samaria (Acts 8:4-8)',
    howYouOperate: 'You naturally share your faith and see people saved.',
    ministryFit: ['Outreach', 'First Impressions', 'Evangelism'],
    teamCulture: 'Outward-focused, missional teams',
  },
  'pastor-shepherd': {
    name: 'Pastor/Shepherd',
    description: 'You nurture, protect, and guide people in their spiritual growth.',
    biblicalReference: 'Ephesians 4:11',
    biblicalExample: 'Jesus as the Good Shepherd (John 10:11-14)',
    howYouOperate: 'You care for people long-term and help them grow.',
    ministryFit: ['Discipleship', 'Small Groups', 'Youth', 'Young Adults'],
    teamCulture: 'Nurturing, relational teams',
  },
  'teacher': {
    name: 'Teacher (Office)',
    description: 'You systematically explain Scripture and doctrine with authority.',
    biblicalReference: 'Ephesians 4:11',
    biblicalExample: 'Apollos teaching accurately about Jesus (Acts 18:25)',
    howYouOperate: 'You build curriculum and teach with depth and clarity.',
    ministryFit: ['Teaching', 'Discipleship', 'Leadership Development'],
    teamCulture: 'Academic, systematic teams',
  },
  'administration': {
    name: 'Administration',
    description: 'You organize resources and coordinate people to accomplish ministry goals.',
    biblicalReference: '1 Corinthians 12:28',
    biblicalExample: 'The organizing of food distribution (Acts 6:1-4)',
    howYouOperate: 'You bring order, systems, and efficiency to ministry.',
    ministryFit: ['Operations', 'Event Planning', 'Team Coordination'],
    teamCulture: 'Organized, detail-oriented teams',
  },
  'helps': {
    name: 'Helps',
    description: 'You assist others and free them to focus on their primary ministry.',
    biblicalReference: '1 Corinthians 12:28',
    biblicalExample: 'Phoebe serving the church (Romans 16:1-2)',
    howYouOperate: 'You support leaders and meet practical needs.',
    ministryFit: ['Facilities', 'Ushers', 'Setup'],
    teamCulture: 'Supportive, behind-the-scenes teams',
  },
  'hospitality': {
    name: 'Hospitality',
    description: 'You create welcoming environments where people feel valued and at home.',
    biblicalReference: 'Romans 12:13; 1 Peter 4:9',
    biblicalExample: 'Lydia welcoming Paul (Acts 16:14-15)',
    howYouOperate: 'You make strangers feel like family.',
    ministryFit: ['First Impressions', 'Hospitality', 'Small Groups'],
    teamCulture: 'Warm, welcoming teams',
  },
  'intercession': {
    name: 'Intercession',
    description: 'You pray intensely and persistently for others and the church.',
    biblicalReference: 'Romans 8:26-27; James 5:16',
    biblicalExample: 'Epaphras wrestling in prayer (Colossians 4:12)',
    howYouOperate: 'You carry burdens in prayer for extended periods.',
    ministryFit: ['Prayer Team', 'Altar Ministry'],
    teamCulture: 'Prayer-focused, persistent teams',
  },
  'reconciliation': {
    name: 'Reconciliation',
    description: 'You bring unity and resolve conflicts between people.',
    biblicalReference: '2 Corinthians 5:18-19',
    biblicalExample: 'Paul reconciling Onesimus and Philemon (Philemon)',
    howYouOperate: 'You bridge divides and restore relationships.',
    ministryFit: ['Mediation', 'Counseling', 'Leadership'],
    teamCulture: 'Peace-making, unified teams',
  },
  'compassion': {
    name: 'Compassion',
    description: 'You feel deeply for the suffering and take action to help.',
    biblicalReference: 'Matthew 9:36; Colossians 3:12',
    biblicalExample: 'Jesus moved with compassion healing the sick (Matthew 14:14)',
    howYouOperate: 'You are moved to action when you see need.',
    ministryFit: ['Outreach', 'Benevolence', 'Hospital Visitation'],
    teamCulture: 'Action-oriented, caring teams',
  },
};

// =============================================================================
// DISC TYPE DESCRIPTIONS
// =============================================================================

const DISC_DATA: Record<DISCType, {
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  bestEnvironments: string[];
  worstEnvironments: string[];
  communicationStyle: string;
  decisionMaking: string;
}> = {
  D: {
    name: 'Dominance',
    description: 'You are results-driven, direct, and confident. You take charge and get things done.',
    strengths: ['Decisive', 'Goal-oriented', 'Direct communication', 'Problem solver', 'Takes initiative'],
    weaknesses: ['Can be impatient', 'May overlook details', 'Can seem insensitive', 'May not listen well'],
    bestEnvironments: ['Fast-paced', 'Challenging', 'Results-oriented', 'Freedom to lead'],
    worstEnvironments: ['Micromanaged', 'Slow-paced', 'Highly structured with no autonomy'],
    communicationStyle: 'Direct, brief, focused on results',
    decisionMaking: 'Quick, decisive, risk-taking',
  },
  I: {
    name: 'Influence',
    description: 'You are enthusiastic, optimistic, and people-oriented. You inspire and motivate others.',
    strengths: ['Enthusiastic', 'Persuasive', 'Collaborative', 'Creative', 'Optimistic'],
    weaknesses: ['Can be disorganized', 'May over-commit', 'Can lack follow-through', 'May talk too much'],
    bestEnvironments: ['Social', 'Collaborative', 'Creative freedom', 'Recognition'],
    worstEnvironments: ['Isolated', 'Highly detailed work', 'Rigid structure'],
    communicationStyle: 'Enthusiastic, expressive, story-telling',
    decisionMaking: 'Collaborative, intuitive, influenced by relationships',
  },
  S: {
    name: 'Steadiness',
    description: 'You are patient, reliable, and team-oriented. You bring stability and consistency.',
    strengths: ['Patient', 'Reliable', 'Team player', 'Good listener', 'Supportive'],
    weaknesses: ['Resistant to change', 'May avoid conflict', 'Can be indecisive', 'May not speak up'],
    bestEnvironments: ['Stable', 'Supportive team', 'Clear expectations', 'Time to adapt'],
    worstEnvironments: ['Constant change', 'Conflict-heavy', 'High-pressure deadlines'],
    communicationStyle: 'Calm, patient, sincere, supportive',
    decisionMaking: 'Deliberate, consensus-seeking, considers others',
  },
  C: {
    name: 'Conscientiousness',
    description: 'You are analytical, detail-oriented, and quality-focused. You value accuracy and excellence.',
    strengths: ['Accurate', 'Analytical', 'Quality-focused', 'Systematic', 'Thorough'],
    weaknesses: ['Can be overly critical', 'May over-analyze', 'Can seem cold', 'Perfectionism'],
    bestEnvironments: ['Quality-focused', 'Clear standards', 'Time for analysis', 'Expertise valued'],
    worstEnvironments: ['Chaotic', 'Constantly changing rules', 'Low standards'],
    communicationStyle: 'Precise, detailed, data-driven',
    decisionMaking: 'Careful analysis, research-based, cautious',
  },
};

// =============================================================================
// MINISTRY DESCRIPTIONS
// =============================================================================

const MINISTRY_DATA: Record<MinistryId, { description: string; requirements: string[] }> = {
  'greeters': { description: 'Welcome guests with a warm smile and help them feel at home.', requirements: ['Friendly demeanor', 'Reliable attendance'] },
  'welcome-table': { description: 'Staff the guest table and connect newcomers to our church.', requirements: ['Relational skills', 'Knowledge of church ministries'] },
  'landing-team': { description: 'Welcome visitors and help them connect with our church family through greeters, first impressions, and community care.', requirements: ['Warm demeanor', 'Follow-up consistency', 'Phone/text comfort'] },
  'ushers': { description: 'Guide guests, manage seating, and assist during services.', requirements: ['Attentive', 'Helpful attitude'] },
  'security': { description: 'Ensure the safety of our congregation and facilities.', requirements: ['Observant', 'Calm under pressure'] },
  'transportation': { description: 'Provide rides for those who need them.', requirements: ['Valid license', 'Reliable vehicle'] },
  'cafe': { description: 'Serve refreshments and create a welcoming atmosphere.', requirements: ['Food handling awareness', 'Hospitable'] },
  'facilities': { description: 'Maintain and prepare our facilities for worship.', requirements: ['Practical skills', 'Attention to detail'] },
  'worship': { description: 'Lead the congregation in musical worship.', requirements: ['Musical ability', 'Consistent practice attendance'] },
  'sound': { description: 'Operate audio equipment for services and events.', requirements: ['Technical aptitude', 'Training required'] },
  'lyrics': { description: 'Run ProPresenter for worship and announcements.', requirements: ['Computer skills', 'Attention to timing'] },
  'livestream': { description: 'Broadcast services online and operate cameras.', requirements: ['Technical skills', 'Camera experience helpful'] },
  'visual-art': { description: 'Create visual expressions of worship.', requirements: ['Artistic ability', 'Spirit-led creativity'] },
  'graphic-design': { description: 'Design materials for communication and promotion.', requirements: ['Design software skills', 'Creative eye'] },
  'dance': { description: 'Express worship through movement.', requirements: ['Dance training', 'Choreography experience'] },
  'drama': { description: 'Communicate through theatrical performance.', requirements: ['Acting ability', 'Memorization skills'] },
  'photography': { description: 'Capture moments and tell stories visually.', requirements: ['Camera equipment', 'Photography skills'] },
  'teaching': { description: 'Lead Bible studies and discipleship groups.', requirements: ['Biblical knowledge', 'Communication skills'] },
  'youth': { description: 'Mentor and disciple teenagers.', requirements: ['Background check', 'Relational skills', 'Emotional maturity'] },
  'children': { description: 'Teach and care for children.', requirements: ['Background check', 'Patience', 'Safety awareness'] },
  'nursery': { description: 'Provide loving care for infants and toddlers.', requirements: ['Background check', 'Nurturing spirit', 'Female only'] },
  'young-adults': { description: 'Connect with and disciple young adults.', requirements: ['Relational skills', 'Life experience'] },
  'outreach': { description: 'Share the Gospel in our community.', requirements: ['Evangelistic heart', 'Servant attitude'] },
  'prayer-team': { description: 'Pray for the church and individuals.', requirements: ['Prayer life', 'Sensitivity to the Spirit'] },
  'altar-ministry': { description: 'Minister to people at the altar during services.', requirements: ['Spiritual maturity', 'Discernment'] },
  'griefshare': { description: 'Support those walking through grief with compassion and presence.', requirements: ['Emotional stability', 'Confidentiality', 'Training completion'] },
  'celebrate-recovery': { description: 'Help people find freedom from hurts, habits, and hang-ups through Christ-centered recovery.', requirements: ['Vulnerability', 'Accountability mindset', 'Training completion'] },
};

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

export function calculateGiftScores(answers: SurveyAnswers): GiftScore[] {
  const giftTotals: Record<SpiritualGift, number> = {} as Record<SpiritualGift, number>;
  const giftCounts: Record<SpiritualGift, number> = {} as Record<SpiritualGift, number>;
  
  // Initialize all gifts to 0
  const allGifts: SpiritualGift[] = [
    'word-of-wisdom', 'word-of-knowledge', 'faith', 'healing', 'miracles',
    'prophecy', 'discernment', 'tongues', 'interpretation-of-tongues',
    'service', 'teaching', 'exhortation', 'giving', 'leadership', 'mercy',
    'apostleship', 'prophet', 'evangelist', 'pastor-shepherd', 'teacher',
    'administration', 'helps', 'hospitality', 'intercession', 'reconciliation', 'compassion'
  ];
  
  for (const gift of allGifts) {
    giftTotals[gift] = 0;
    giftCounts[gift] = 0;
  }

  // Process answers
  for (const question of SURVEY_QUESTIONS) {
    if (!question.giftWeights) continue;
    const answer = answers[question.id];
    if (answer === undefined) continue;

    let scoreMultiplier = 0;
    if (typeof answer === 'number') {
      scoreMultiplier = (answer - 1) / 4; // 0 to 1 scale
    } else if (answer === 'yes') {
      scoreMultiplier = 1;
    }

    for (const [gift, weight] of Object.entries(question.giftWeights)) {
      giftTotals[gift as SpiritualGift] += weight * scoreMultiplier;
      giftCounts[gift as SpiritualGift]++;
    }
  }

  // Normalize and create gift scores
  const maxScore = Math.max(...Object.values(giftTotals));
  
  const giftScores: GiftScore[] = allGifts
    .map((gift) => {
      const data = GIFT_DATA[gift];
      return {
        gift,
        score: maxScore > 0 ? Math.round((giftTotals[gift] / maxScore) * 100) : 0,
        name: data.name,
        description: data.description,
        biblicalReference: data.biblicalReference,
        biblicalExample: data.biblicalExample,
        howYouOperate: data.howYouOperate,
        ministryFit: data.ministryFit,
        teamCulture: data.teamCulture,
      };
    })
    .sort((a, b) => b.score - a.score);

  return giftScores;
}

export function calculateDISCProfile(answers: SurveyAnswers): DISCProfile {
  const scores: Record<DISCType, number> = { D: 0, I: 0, S: 0, C: 0 };
  const counts: Record<DISCType, number> = { D: 0, I: 0, S: 0, C: 0 };

  for (const question of SURVEY_QUESTIONS) {
    if (!question.discWeights) continue;
    const answer = answers[question.id];
    if (answer === undefined || typeof answer !== 'number') continue;

    const scoreMultiplier = (answer - 1) / 4;

    for (const [type, weight] of Object.entries(question.discWeights)) {
      scores[type as DISCType] += weight * scoreMultiplier;
      counts[type as DISCType]++;
    }
  }

  // Normalize scores
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore > 0) {
    for (const type of Object.keys(scores) as DISCType[]) {
      scores[type] = Math.round((scores[type] / maxScore) * 100);
    }
  }

  // Determine primary and secondary types
  const sortedTypes = (Object.entries(scores) as [DISCType, number][])
    .sort((a, b) => b[1] - a[1]);
  
  const primaryType = sortedTypes[0][0];
  const secondaryType = sortedTypes[1][1] > 40 ? sortedTypes[1][0] : null;

  const data = DISC_DATA[primaryType];

  return {
    primaryType,
    secondaryType,
    scores,
    strengths: data.strengths,
    weaknesses: data.weaknesses,
    bestTeamEnvironments: data.bestEnvironments,
    worstTeamEnvironments: data.worstEnvironments,
    communicationStyle: data.communicationStyle,
    decisionMaking: data.decisionMaking,
    description: data.description,
  };
}

// Bucket display names for pastoral language
const BUCKET_NAMES: Record<string, string> = {
  'bible-basics': 'Bible Basics',
  'story-timeline': 'Story & Timeline',
  'jesus-salvation': 'Jesus & Salvation',
  'how-to-read': 'How to Read the Bible',
};

// Level data for pastoral, encouraging language
const LITERACY_LEVEL_DATA: Record<LiteracyLevel, {
  levelName: string;
  description: string;
  encouragement: string;
  recommendations: string[];
  nextSteps: string[];
  discipleshipFocus: string;
}> = {
  low: {
    levelName: 'Building Foundation',
    description: 'You\'re at the beginning of an exciting journey of discovering God\'s Word. Everyone starts somewhere, and we\'re here to walk with you.',
    encouragement: 'The Bible is a treasure waiting to be explored! We have great resources and caring mentors ready to help you grow.',
    recommendations: [
      'Start with the Gospel of John—it\'s a wonderful introduction to Jesus',
      'Join our Following Jesus class for new believers',
      'Consider the Bible Basics study group',
    ],
    nextSteps: ['Following Jesus Class', 'Bible Basics Group', 'One-on-One Discipleship'],
    discipleshipFocus: 'Foundation building through guided study and mentorship',
  },
  developing: {
    levelName: 'Growing Strong',
    description: 'You have a solid foundation and are actively growing in your understanding of Scripture. Keep pressing in—you\'re on a great path!',
    encouragement: 'You\'re making wonderful progress! Continue building on what you\'ve learned.',
    recommendations: [
      'Join Discipleship Hour for deeper teaching',
      'Start a 365-day Bible reading plan',
      'Consider joining a small group Bible study',
    ],
    nextSteps: ['Discipleship Hour', '365 Bible Reading Plan', 'Small Group Study'],
    discipleshipFocus: 'Deepening understanding through consistent study habits',
  },
  strong: {
    levelName: 'Spiritually Mature',
    description: 'You demonstrate strong biblical knowledge and are ready to help others grow in their faith journey. Your understanding can be a blessing to others.',
    encouragement: 'Your knowledge of Scripture positions you well to serve and mentor others!',
    recommendations: [
      'Consider leading a Bible study or small group',
      'Mentor newer believers one-on-one',
      'Explore leadership training for teaching',
    ],
    nextSteps: ['Leadership Training', 'Small Group Leader', 'Mentorship Ministry'],
    discipleshipFocus: 'Investing in others through teaching and mentorship',
  },
};

export function calculateBiblicalLiteracy(answers: SurveyAnswers): BiblicalLiteracyResult {
  let correctAnswers = 0;
  let totalPoints = 0;
  let maxPoints = 0;

  // Initialize bucket tracking
  const bucketData: Record<string, { score: number; max: number }> = {
    'bible-basics': { score: 0, max: 0 },
    'story-timeline': { score: 0, max: 0 },
    'jesus-salvation': { score: 0, max: 0 },
    'how-to-read': { score: 0, max: 0 },
  };

  for (const question of SURVEY_QUESTIONS) {
    if (question.section !== 2) continue;
    if (question.literacyPoints === undefined) continue;
    
    const bucket = question.literacyBucket || 'bible-basics';
    const points = question.literacyPoints;
    
    maxPoints += points;
    bucketData[bucket].max += points;
    
    const answer = answers[question.id];
    
    if (question.literacyCorrectAnswer !== undefined) {
      // Multiple choice - check for correct answer
      if (answer === question.literacyCorrectAnswer) {
        correctAnswers++;
        totalPoints += points;
        bucketData[bucket].score += points;
      }
    } else if (typeof answer === 'number') {
      // Likert scale - high answers contribute points proportionally
      const earnedPoints = (answer / 5) * points;
      totalPoints += earnedPoints;
      bucketData[bucket].score += earnedPoints;
    }
  }

  const percentage = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;
  
  // Determine level using 3-tier system
  let level: LiteracyLevel;
  if (percentage >= 70) {
    level = 'strong';
  } else if (percentage >= 40) {
    level = 'developing';
  } else {
    level = 'low';
  }

  const levelData = LITERACY_LEVEL_DATA[level];

  // Build bucket scores array
  const bucketScores: LiteracyBucketScore[] = Object.entries(bucketData).map(([bucket, data]) => ({
    bucket: bucket as LiteracyBucket,
    bucketName: BUCKET_NAMES[bucket] || bucket,
    score: Math.round(data.score * 10) / 10,
    maxScore: data.max,
    percentage: data.max > 0 ? Math.round((data.score / data.max) * 100) : 0,
  }));

  return {
    level,
    levelName: levelData.levelName,
    score: Math.round(totalPoints * 10) / 10,
    maxScore: maxPoints,
    percentage: Math.round(percentage),
    totalQuestions: 20,
    correctAnswers,
    bucketScores,
    description: levelData.description,
    encouragement: levelData.encouragement,
    recommendations: levelData.recommendations,
    nextSteps: levelData.nextSteps,
    discipleshipFocus: levelData.discipleshipFocus,
  };
}

export function calculateTechnicalSkills(answers: SurveyAnswers): TechnicalSkillsProfile {
  const categoryScores: Record<string, { total: number; max: number }> = {
    sound: { total: 0, max: 0 },
    media: { total: 0, max: 0 },
    propresenter: { total: 0, max: 0 },
    photography: { total: 0, max: 0 },
  };

  for (const question of SURVEY_QUESTIONS) {
    if (question.section !== 5) continue;
    if (!question.skillCategory || question.skillPoints === undefined) continue;
    
    const category = question.skillCategory;
    categoryScores[category].max += question.skillPoints;
    
    const answer = answers[question.id];
    if (answer === undefined) continue;

    if (question.literacyCorrectAnswer !== undefined) {
      if (answer === question.literacyCorrectAnswer) {
        categoryScores[category].total += question.skillPoints;
      }
    } else if (typeof answer === 'number') {
      categoryScores[category].total += (answer / 5) * question.skillPoints;
    } else if (answer === 'yes') {
      categoryScores[category].total += question.skillPoints;
    }
  }

  function getSkillResult(category: string): TechnicalSkillResult {
    const { total, max } = categoryScores[category] || { total: 0, max: 1 };
    const percentage = (total / max) * 100;
    
    let level: SkillLevel;
    let canServe: boolean;
    let needsTraining: boolean;
    let encouragement: string;

    if (percentage >= 80) {
      level = 'skilled';
      canServe = true;
      needsTraining = false;
      encouragement = 'You have strong skills in this area and can help train others!';
    } else if (percentage >= 60) {
      level = 'competent';
      canServe = true;
      needsTraining = false;
      encouragement = 'You are ready to serve in this role with confidence.';
    } else if (percentage >= 40) {
      level = 'growing-learner';
      canServe = true;
      needsTraining = true;
      encouragement = 'You show potential! We\'d love to mentor you as you develop these skills.';
    } else {
      level = 'beginner';
      canServe = false;
      needsTraining = true;
      encouragement = 'Worship and production roles require patience and a teachable spirit. We will gladly train you—your desire is valuable!';
    }

    return {
      category,
      level,
      score: Math.round(percentage),
      description: `Your proficiency in ${category}: ${Math.round(percentage)}%`,
      canServe,
      needsTraining,
      encouragement,
    };
  }

  const soundTech = getSkillResult('sound');
  const mediaTech = getSkillResult('media');
  const proPresenter = getSkillResult('propresenter');
  const photography = getSkillResult('photography');

  const avgScore = (soundTech.score + mediaTech.score + proPresenter.score + photography.score) / 4;
  let overallReadiness: string;
  
  if (avgScore >= 70) {
    overallReadiness = 'You have strong technical skills and are ready to serve in media/production roles.';
  } else if (avgScore >= 40) {
    overallReadiness = 'You have foundational skills and can serve with training and mentorship.';
  } else {
    overallReadiness = 'Technical ministry requires training, but your heart to serve is the most important starting point!';
  }

  return {
    soundTech,
    mediaTech,
    proPresenter,
    photography,
    overallReadiness,
  };
}

export function calculateMinistryMatches(
  answers: SurveyAnswers,
  giftScores: GiftScore[],
  discProfile: DISCProfile
): MinistryMatch[] {
  const ministryScores: Record<MinistryId, number> = {} as Record<MinistryId, number>;
  
  const allMinistries: MinistryId[] = [
    'greeters', 'welcome-table', 'landing-team', 'ushers', 'security', 'transportation',
    'cafe', 'facilities', 'worship', 'sound', 'lyrics', 'livestream',
    'visual-art', 'graphic-design', 'dance', 'drama', 'photography',
    'teaching', 'youth', 'children', 'nursery', 'young-adults', 'outreach',
    'prayer-team', 'altar-ministry', 'griefshare', 'celebrate-recovery'
  ];

  // Get sex from answers for filtering
  const participantSex = answers['sex'] as string | undefined;
  
  // Define sex-restricted ministries (nursery is female-only)
  const femaleOnlyMinistries: MinistryId[] = ['nursery'];

  // Initialize scores
  for (const ministry of allMinistries) {
    ministryScores[ministry] = 0;
  }

  // Add direct weights from questions
  for (const question of SURVEY_QUESTIONS) {
    if (!question.ministryWeights) continue;
    const answer = answers[question.id];
    if (answer === undefined) continue;

    let scoreMultiplier = 0;
    if (typeof answer === 'number') {
      scoreMultiplier = (answer - 1) / 4;
    } else if (answer === 'yes') {
      scoreMultiplier = 1;
    }

    for (const [ministryId, weight] of Object.entries(question.ministryWeights)) {
      ministryScores[ministryId as MinistryId] += weight * scoreMultiplier;
    }
  }

  // Add gift-based bonuses
  const topGifts = giftScores.slice(0, 7);
  const giftToMinistry: Record<string, MinistryId[]> = {
    'hospitality': ['greeters', 'welcome-table', 'landing-team', 'cafe'],
    'service': ['facilities', 'cafe', 'ushers'],
    'helps': ['facilities', 'ushers', 'nursery'],
    'leadership': ['security', 'ushers', 'youth'],
    'teaching': ['teaching', 'youth', 'children'],
    'pastor-shepherd': ['youth', 'young-adults', 'children', 'griefshare', 'celebrate-recovery'],
    'mercy': ['nursery', 'children', 'outreach', 'prayer-team', 'griefshare'],
    'compassion': ['outreach', 'prayer-team', 'altar-ministry', 'griefshare', 'celebrate-recovery'],
    'evangelist': ['outreach', 'greeters', 'landing-team'],
    'administration': ['facilities', 'sound', 'lyrics'],
    'discernment': ['security', 'prayer-team', 'altar-ministry'],
    'intercession': ['prayer-team', 'altar-ministry'],
    'prophecy': ['prayer-team', 'altar-ministry'],
    'exhortation': ['celebrate-recovery', 'youth', 'teaching'],
  };

  for (const giftScore of topGifts) {
    const relevantMinistries = giftToMinistry[giftScore.gift] || [];
    for (const ministryId of relevantMinistries) {
      ministryScores[ministryId] += (giftScore.score / 100) * 0.5;
    }
  }

  // Add DISC-based bonuses
  if (discProfile.primaryType === 'I') {
    ministryScores['greeters'] += 0.4;
    ministryScores['welcome-table'] += 0.4;
    ministryScores['landing-team'] += 0.4;
    ministryScores['outreach'] += 0.3;
    ministryScores['celebrate-recovery'] += 0.2;
  }
  if (discProfile.primaryType === 'S') {
    ministryScores['nursery'] += 0.3;
    ministryScores['children'] += 0.3;
    ministryScores['facilities'] += 0.2;
    ministryScores['griefshare'] += 0.3;
  }
  if (discProfile.primaryType === 'C') {
    ministryScores['sound'] += 0.3;
    ministryScores['lyrics'] += 0.3;
    ministryScores['graphic-design'] += 0.2;
  }
  if (discProfile.primaryType === 'D') {
    ministryScores['security'] += 0.3;
    ministryScores['ushers'] += 0.2;
  }

  // Create ministry matches - apply sex-based filtering
  const matches: MinistryMatch[] = allMinistries
    .filter((ministryId) => {
      // Exclude male participants from female-only ministries
      if (femaleOnlyMinistries.includes(ministryId) && participantSex === 'male') {
        return false;
      }
      return true;
    })
    .map((ministryId) => {
      const data = MINISTRY_DATA[ministryId];
      const matchingGifts = topGifts
        .filter(g => giftToMinistry[g.gift]?.includes(ministryId))
        .map(g => GIFT_DATA[g.gift].name);

      let whyMatched = '';
      if (matchingGifts.length > 0) {
        whyMatched = `Your gifts of ${matchingGifts.slice(0, 2).join(' and ')} align well with this ministry.`;
      } else if (discProfile.primaryType === 'I' && ['greeters', 'welcome-table'].includes(ministryId)) {
        whyMatched = 'Your outgoing, people-oriented personality makes you a natural fit.';
      } else if (discProfile.primaryType === 'C' && ['sound', 'lyrics'].includes(ministryId)) {
        whyMatched = 'Your detail-oriented nature is perfect for technical ministry.';
      } else {
        whyMatched = 'Based on your responses, you may thrive in this serving role.';
      }

      return {
        ministryId,
        name: ministryId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        category: getMinistryCategory(ministryId),
        score: ministryScores[ministryId],
        description: data.description,
        whyMatched,
        strengthsYouBring: matchingGifts.slice(0, 3),
        teamCultureFit: discProfile.description,
        nextSteps: 'Complete onboarding and attend orientation.',
        isPrimary: false,
        requiresSkillVerification: ['sound', 'worship', 'livestream', 'dance', 'drama'].includes(ministryId),
      };
    })
    .sort((a, b) => b.score - a.score);

  // Mark top 5 as primary
  for (let i = 0; i < Math.min(5, matches.length); i++) {
    if (matches[i].score > 0.3) {
      matches[i].isPrimary = true;
    }
  }

  return matches;
}

function getMinistryCategory(ministryId: MinistryId): string {
  const categories: Record<MinistryId, string> = {
    'greeters': 'First Impressions',
    'welcome-table': 'First Impressions',
    'landing-team': 'First Impressions',
    'ushers': 'Service Support',
    'security': 'Service Support',
    'transportation': 'Outreach',
    'cafe': 'Hospitality',
    'facilities': 'Operations',
    'worship': 'Worship Arts',
    'sound': 'Media / Production',
    'lyrics': 'Media / Production',
    'livestream': 'Media / Production',
    'visual-art': 'Creative Arts',
    'graphic-design': 'Creative Arts',
    'dance': 'Creative Arts',
    'drama': 'Creative Arts',
    'photography': 'Creative Arts',
    'teaching': 'Discipleship',
    'youth': 'Next Gen',
    'children': 'Next Gen',
    'nursery': 'Next Gen',
    'young-adults': 'Life Stage',
    'outreach': 'Outreach',
    'prayer-team': 'Prayer',
    'altar-ministry': 'Prayer',
    'griefshare': 'Support Groups',
    'celebrate-recovery': 'Support Groups',
  };
  return categories[ministryId] || 'General';
}
