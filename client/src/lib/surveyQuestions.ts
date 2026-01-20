import type { Question, SectionId } from "@shared/schema";

// =============================================================================
// SURVEY SECTIONS
// =============================================================================

export const SURVEY_SECTIONS = [
  { id: 0 as SectionId, title: 'About You', description: 'Help us get to know you better', questionCount: 1 },
  { id: 1 as SectionId, title: 'Spiritual Gifts', description: 'Discover how God has uniquely gifted you for ministry', questionCount: 30 },
  { id: 2 as SectionId, title: 'Biblical Literacy', description: 'Assess your familiarity with Scripture and biblical foundations', questionCount: 20 },
  { id: 3 as SectionId, title: 'DISC Personality', description: 'Understand your personality type and how you relate to others', questionCount: 16 },
  { id: 4 as SectionId, title: 'Ministry Skills', description: 'Evaluate your practical abilities and experience', questionCount: 12 },
  { id: 5 as SectionId, title: 'Sound & Media Tech', description: 'Test your technical proficiency for production roles', questionCount: 13 },
  { id: 6 as SectionId, title: 'Team Fit & Preferences', description: 'Help us understand your ideal serving environment', questionCount: 8 },
  { id: 7 as SectionId, title: 'Children & Youth Ministry', description: 'Help us assess your fit for working with minors', questionCount: 15 },
  { id: 8 as SectionId, title: 'Support Group Ministry', description: 'Explore your fit for GriefShare, Celebrate Recovery, and The Landing Team', questionCount: 12 },
  { id: 9 as SectionId, title: 'Availability', description: 'Share your capacity to serve', questionCount: 5 },
];

// Likert scale options
export const LIKERT_OPTIONS = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];

const FREQUENCY_OPTIONS = [
  { value: 1, label: 'Never' },
  { value: 2, label: 'Rarely' },
  { value: 3, label: 'Sometimes' },
  { value: 4, label: 'Often' },
  { value: 5, label: 'Very Often' },
];

// =============================================================================
// SECTION 0: ABOUT YOU (Sex Identification)
// =============================================================================

const aboutYouQuestions: Question[] = [
  { id: 'sex', section: 0, type: 'multiple-choice',
    text: 'Please select your sex.',
    helpText: 'This helps us match you with appropriate ministry opportunities.',
    options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
    ] },
];

// =============================================================================
// SECTION 1: SPIRITUAL GIFTS (30 questions)
// =============================================================================

const spiritualGiftsQuestions: Question[] = [
  // Word of Wisdom & Word of Knowledge
  { id: 'sg1', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'When praying for others, I often sense specific insight or direction for their situation.',
    giftWeights: { 'word-of-knowledge': 1.5, 'discernment': 0.5 } },
  { id: 'sg2', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'People regularly seek me out when they need wisdom for difficult decisions.',
    giftWeights: { 'word-of-wisdom': 1.5, 'exhortation': 0.5 } },
  { id: 'sg3', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I receive supernatural understanding about situations that I couldn\'t have known naturally.',
    giftWeights: { 'word-of-knowledge': 1.5, 'prophecy': 0.5 } },
  
  // Faith & Miracles
  { id: 'sg4', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I believe God can do the impossible even when circumstances seem hopeless.',
    giftWeights: { 'faith': 1.5, 'miracles': 0.5 } },
  { id: 'sg5', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I have witnessed God working through me to accomplish things beyond natural explanation.',
    giftWeights: { 'miracles': 1.5, 'faith': 0.5 } },
  
  // Healing
  { id: 'sg6', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I have prayed for people and witnessed noticeable physical or emotional healing.',
    giftWeights: { 'healing': 1.5, 'faith': 0.3, 'compassion': 0.3 } },
  { id: 'sg7', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I feel a strong burden to pray for the sick and believe God wants to heal.',
    giftWeights: { 'healing': 1.2, 'intercession': 0.5, 'faith': 0.5 } },
  
  // Prophecy & Discernment
  { id: 'sg8', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I feel prompted to speak or declare things God is showing me to others.',
    giftWeights: { 'prophecy': 1.5, 'exhortation': 0.5 } },
  { id: 'sg9', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I often sense spiritual activity or hidden motives behind situations.',
    giftWeights: { 'discernment': 1.5, 'word-of-knowledge': 0.3 } },
  { id: 'sg10', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I can usually tell when something is spiritually "off" even if I can\'t explain why.',
    giftWeights: { 'discernment': 1.5, 'prophecy': 0.3 } },
  
  // Tongues & Interpretation
  { id: 'sg11', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I regularly pray in tongues as part of my personal prayer life.',
    giftWeights: { 'tongues': 1.5, 'intercession': 0.5 } },
  { id: 'sg12', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I have sensed the interpretation when someone speaks in tongues publicly.',
    giftWeights: { 'interpretation-of-tongues': 1.5, 'prophecy': 0.3 } },
  
  // Teaching & Exhortation
  { id: 'sg13', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I enjoy explaining Scripture clearly and helping others understand God\'s Word.',
    giftWeights: { 'teaching': 1.5, 'teacher': 0.5 },
    ministryWeights: { 'teaching': 1.2 } },
  { id: 'sg14', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I feel called to encourage, challenge, and build up other believers.',
    giftWeights: { 'exhortation': 1.5, 'pastor-shepherd': 0.5 } },
  { id: 'sg15', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'When I teach, people say they understand things more clearly.',
    giftWeights: { 'teaching': 1.2, 'teacher': 1.0, 'word-of-wisdom': 0.3 },
    ministryWeights: { 'teaching': 1.0, 'youth': 0.5, 'children': 0.5 } },
  
  // Service & Helps
  { id: 'sg16', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I find great joy in serving behind the scenes without recognition.',
    giftWeights: { 'service': 1.5, 'helps': 1.0 },
    ministryWeights: { 'facilities': 1.2, 'cafe': 0.8 } },
  { id: 'sg17', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I naturally notice practical needs and want to meet them.',
    giftWeights: { 'helps': 1.5, 'service': 1.0 },
    ministryWeights: { 'facilities': 1.0, 'ushers': 0.8 } },
  
  // Giving & Mercy
  { id: 'sg18', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I feel called to give generously—financially and with my resources—to support Kingdom work.',
    giftWeights: { 'giving': 1.5 } },
  { id: 'sg19', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'My heart breaks for those who are hurting, and I\'m drawn to comfort them.',
    giftWeights: { 'mercy': 1.5, 'compassion': 1.0 },
    ministryWeights: { 'prayer-team': 0.8, 'altar-ministry': 0.8 } },
  { id: 'sg20', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I feel deep compassion when I see people suffering or in difficult situations.',
    giftWeights: { 'compassion': 1.5, 'mercy': 1.0 },
    ministryWeights: { 'outreach': 0.8 } },
  
  // Leadership & Administration
  { id: 'sg21', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I naturally take initiative and guide others toward goals.',
    giftWeights: { 'leadership': 1.5, 'administration': 0.5 } },
  { id: 'sg22', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I excel at organizing resources, people, and systems to accomplish goals effectively.',
    giftWeights: { 'administration': 1.5, 'leadership': 0.5 },
    ministryWeights: { 'facilities': 0.8 } },
  
  // Evangelism
  { id: 'sg23', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I feel bold and passionate about sharing the Gospel with those who don\'t know Jesus.',
    giftWeights: { 'evangelist': 1.5 },
    ministryWeights: { 'outreach': 1.5 } },
  { id: 'sg24', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I naturally look for opportunities to introduce people to Christ in everyday situations.',
    giftWeights: { 'evangelist': 1.2 },
    ministryWeights: { 'outreach': 1.2, 'greeters': 0.5 } },
  
  // Pastor/Shepherd
  { id: 'sg25', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am drawn to nurturing people over time, walking with them through life\'s seasons.',
    giftWeights: { 'pastor-shepherd': 1.5 },
    ministryWeights: { 'youth': 0.8, 'young-adults': 0.8 } },
  { id: 'sg26', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I care deeply about the spiritual growth and wellbeing of others.',
    giftWeights: { 'pastor-shepherd': 1.2, 'exhortation': 0.5 } },
  
  // Hospitality
  { id: 'sg27', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I love making people feel welcome and at home.',
    giftWeights: { 'hospitality': 1.5 },
    ministryWeights: { 'greeters': 1.5, 'welcome-table': 1.5, 'cafe': 1.2 } },
  
  // Intercession
  { id: 'sg28', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I carry a burden to pray for extended periods and intercede for others.',
    giftWeights: { 'intercession': 1.5 },
    ministryWeights: { 'prayer-team': 1.5, 'altar-ministry': 1.0 } },
  { id: 'sg29', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'Prayer is not just a discipline for me—it feels like a calling.',
    giftWeights: { 'intercession': 1.2, 'faith': 0.5 },
    ministryWeights: { 'prayer-team': 1.2 } },
  
  // Apostleship & Reconciliation
  { id: 'sg30', section: 1, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I feel called to pioneer new ministries or bring unity among believers.',
    giftWeights: { 'apostleship': 1.5, 'reconciliation': 0.8, 'leadership': 0.5 } },
];

// =============================================================================
// SECTION 2: BIBLICAL LITERACY (20 questions in 4 buckets)
// Buckets: bible-basics, story-timeline, jesus-salvation, how-to-read
// Difficulty: easy (40%), medium (40%), challenge (20%)
// =============================================================================

const biblicalLiteracyQuestions: Question[] = [
  // -------------------------------------------------------------------------
  // BUCKET 1: BIBLE BASICS (5 questions)
  // -------------------------------------------------------------------------
  
  // Easy
  { id: 'bl1', section: 2, type: 'multiple-choice',
    text: 'How many books are in the Bible?',
    literacyBucket: 'bible-basics', literacyDifficulty: 'easy',
    options: [
      { value: 'a', label: '27' },
      { value: 'b', label: '39' },
      { value: 'c', label: '66' },
      { value: 'd', label: '72' },
    ],
    literacyCorrectAnswer: 'c', literacyPoints: 1 },
  
  // Easy
  { id: 'bl2', section: 2, type: 'multiple-choice',
    text: 'What are the two main divisions of the Bible?',
    literacyBucket: 'bible-basics', literacyDifficulty: 'easy',
    options: [
      { value: 'a', label: 'Law and Prophets' },
      { value: 'b', label: 'Old Testament and New Testament' },
      { value: 'c', label: 'History and Poetry' },
      { value: 'd', label: 'Gospels and Letters' },
    ],
    literacyCorrectAnswer: 'b', literacyPoints: 1 },
  
  // Medium
  { id: 'bl3', section: 2, type: 'multiple-choice',
    text: 'Who wrote the majority of the New Testament letters (epistles)?',
    literacyBucket: 'bible-basics', literacyDifficulty: 'medium',
    options: [
      { value: 'a', label: 'Peter' },
      { value: 'b', label: 'Paul' },
      { value: 'c', label: 'John' },
      { value: 'd', label: 'James' },
    ],
    literacyCorrectAnswer: 'b', literacyPoints: 1 },
  
  // Medium
  { id: 'bl4', section: 2, type: 'multiple-choice',
    text: 'The fruit of the Spirit is described in which book?',
    literacyBucket: 'bible-basics', literacyDifficulty: 'medium',
    options: [
      { value: 'a', label: 'Romans' },
      { value: 'b', label: 'Galatians' },
      { value: 'c', label: 'Ephesians' },
      { value: 'd', label: 'Colossians' },
    ],
    literacyCorrectAnswer: 'b', literacyPoints: 1 },
  
  // Challenge
  { id: 'bl5', section: 2, type: 'multiple-choice',
    text: 'Where in Scripture are spiritual gifts primarily listed?',
    literacyBucket: 'bible-basics', literacyDifficulty: 'challenge',
    options: [
      { value: 'a', label: 'Genesis, Exodus, Leviticus' },
      { value: 'b', label: '1 Corinthians 12, Romans 12, Ephesians 4' },
      { value: 'c', label: 'Matthew, Mark, Luke' },
      { value: 'd', label: 'Revelation 1-3' },
    ],
    literacyCorrectAnswer: 'b', literacyPoints: 1 },

  // -------------------------------------------------------------------------
  // BUCKET 2: STORY & TIMELINE (5 questions)
  // -------------------------------------------------------------------------
  
  // Easy
  { id: 'bl6', section: 2, type: 'multiple-choice',
    text: 'Who led the Israelites out of Egypt?',
    literacyBucket: 'story-timeline', literacyDifficulty: 'easy',
    options: [
      { value: 'a', label: 'Abraham' },
      { value: 'b', label: 'Moses' },
      { value: 'c', label: 'David' },
      { value: 'd', label: 'Joshua' },
    ],
    literacyCorrectAnswer: 'b', literacyPoints: 1 },
  
  // Easy
  { id: 'bl7', section: 2, type: 'multiple-choice',
    text: 'What event does Acts 2 describe?',
    literacyBucket: 'story-timeline', literacyDifficulty: 'easy',
    options: [
      { value: 'a', label: 'Jesus\' crucifixion' },
      { value: 'b', label: 'The feeding of the 5,000' },
      { value: 'c', label: 'The Day of Pentecost and the outpouring of the Holy Spirit' },
      { value: 'd', label: 'The Last Supper' },
    ],
    literacyCorrectAnswer: 'c', literacyPoints: 1 },
  
  // Medium
  { id: 'bl8', section: 2, type: 'multiple-choice',
    text: 'Put these in order: David, Abraham, Moses, Jesus',
    literacyBucket: 'story-timeline', literacyDifficulty: 'medium',
    options: [
      { value: 'a', label: 'Moses, Abraham, David, Jesus' },
      { value: 'b', label: 'Abraham, Moses, David, Jesus' },
      { value: 'c', label: 'David, Abraham, Moses, Jesus' },
      { value: 'd', label: 'Abraham, David, Moses, Jesus' },
    ],
    literacyCorrectAnswer: 'b', literacyPoints: 1 },
  
  // Medium
  { id: 'bl9', section: 2, type: 'multiple-choice',
    text: 'The baptism of the Holy Spirit is described in:',
    literacyBucket: 'story-timeline', literacyDifficulty: 'medium',
    options: [
      { value: 'a', label: 'Acts 1:8 and Acts 2:4' },
      { value: 'b', label: 'Genesis 1:1' },
      { value: 'c', label: 'Psalm 23' },
      { value: 'd', label: 'Proverbs 3:5-6' },
    ],
    literacyCorrectAnswer: 'a', literacyPoints: 1 },
  
  // Challenge
  { id: 'bl10', section: 2, type: 'multiple-choice',
    text: 'What distinguishes the New Covenant from the Old Covenant?',
    literacyBucket: 'story-timeline', literacyDifficulty: 'challenge',
    options: [
      { value: 'a', label: 'The New Covenant removes all moral guidelines' },
      { value: 'b', label: 'The New Covenant is based on Jesus\' sacrifice and the Holy Spirit\'s indwelling' },
      { value: 'c', label: 'The New Covenant only applies to Jewish believers' },
      { value: 'd', label: 'There is no difference between the covenants' },
    ],
    literacyCorrectAnswer: 'b', literacyPoints: 1 },

  // -------------------------------------------------------------------------
  // BUCKET 3: JESUS & SALVATION (5 questions)
  // -------------------------------------------------------------------------
  
  // Easy
  { id: 'bl11', section: 2, type: 'multiple-choice',
    text: 'How would you best explain salvation through grace?',
    literacyBucket: 'jesus-salvation', literacyDifficulty: 'easy',
    options: [
      { value: 'a', label: 'We earn salvation by doing good works' },
      { value: 'b', label: 'Salvation is God\'s free gift received through faith in Jesus' },
      { value: 'c', label: 'Only certain people are chosen to be saved' },
      { value: 'd', label: 'Salvation requires following all Old Testament laws' },
    ],
    literacyCorrectAnswer: 'b', literacyPoints: 1 },
  
  // Easy
  { id: 'bl12', section: 2, type: 'multiple-choice',
    text: 'What is the Great Commission?',
    literacyBucket: 'jesus-salvation', literacyDifficulty: 'easy',
    options: [
      { value: 'a', label: 'Jesus teaching the Beatitudes' },
      { value: 'b', label: 'Jesus commanding disciples to make disciples of all nations' },
      { value: 'c', label: 'The Ten Commandments given to Moses' },
      { value: 'd', label: 'Paul\'s letter to the Romans' },
    ],
    literacyCorrectAnswer: 'b', literacyPoints: 1 },
  
  // Medium
  { id: 'bl13', section: 2, type: 'multiple-choice',
    text: 'Why did Jesus die on the cross?',
    literacyBucket: 'jesus-salvation', literacyDifficulty: 'medium',
    options: [
      { value: 'a', label: 'To set an example of sacrifice' },
      { value: 'b', label: 'To pay the penalty for our sins so we could be reconciled to God' },
      { value: 'c', label: 'Because the religious leaders were jealous' },
      { value: 'd', label: 'To prove He was the Messiah' },
    ],
    literacyCorrectAnswer: 'b', literacyPoints: 1 },
  
  // Medium
  { id: 'bl14', section: 2, type: 'multiple-choice',
    text: 'What does it mean that Jesus is both fully God and fully man?',
    literacyBucket: 'jesus-salvation', literacyDifficulty: 'medium',
    options: [
      { value: 'a', label: 'He sometimes acted as God and sometimes as a human' },
      { value: 'b', label: 'He has complete divine and human natures united in one person' },
      { value: 'c', label: 'He was born human but became God after His resurrection' },
      { value: 'd', label: 'He appeared human but was really only God' },
    ],
    literacyCorrectAnswer: 'b', literacyPoints: 1 },
  
  // Challenge
  { id: 'bl15', section: 2, type: 'multiple-choice',
    text: 'According to Scripture, what happens when someone receives the Holy Spirit?',
    literacyBucket: 'jesus-salvation', literacyDifficulty: 'challenge',
    options: [
      { value: 'a', label: 'They immediately become sinless' },
      { value: 'b', label: 'They are sealed, empowered, and given gifts for service' },
      { value: 'c', label: 'They lose their free will' },
      { value: 'd', label: 'They are guaranteed a trouble-free life' },
    ],
    literacyCorrectAnswer: 'b', literacyPoints: 1 },

  // -------------------------------------------------------------------------
  // BUCKET 4: HOW TO READ THE BIBLE (5 questions)
  // -------------------------------------------------------------------------
  
  // Easy - Likert
  { id: 'bl16', section: 2, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I can navigate the Bible and find specific passages.',
    literacyBucket: 'how-to-read', literacyDifficulty: 'easy',
    literacyPoints: 1 },
  
  // Easy - Likert
  { id: 'bl17', section: 2, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I regularly read or study the Bible on my own, not just during church services.',
    literacyBucket: 'how-to-read', literacyDifficulty: 'easy',
    literacyPoints: 1 },
  
  // Medium
  { id: 'bl18', section: 2, type: 'multiple-choice',
    text: 'When reading the Bible, why is it important to consider the context?',
    literacyBucket: 'how-to-read', literacyDifficulty: 'medium',
    options: [
      { value: 'a', label: 'Context doesn\'t matter—every verse stands alone' },
      { value: 'b', label: 'Understanding who wrote it, to whom, and why helps us grasp the meaning' },
      { value: 'c', label: 'Only scholars need to consider context' },
      { value: 'd', label: 'Context is only important for the Old Testament' },
    ],
    literacyCorrectAnswer: 'b', literacyPoints: 1 },
  
  // Medium - Likert
  { id: 'bl19', section: 2, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I feel confident explaining basic biblical truths to a new believer.',
    literacyBucket: 'how-to-read', literacyDifficulty: 'medium',
    literacyPoints: 1 },
  
  // Challenge
  { id: 'bl20', section: 2, type: 'multiple-choice',
    text: 'What is the difference between reading poetry (like Psalms) and reading narrative (like Acts)?',
    literacyBucket: 'how-to-read', literacyDifficulty: 'challenge',
    options: [
      { value: 'a', label: 'There is no difference—all Scripture should be read the same way' },
      { value: 'b', label: 'Poetry uses imagery and emotion; narrative tells a story with events in sequence' },
      { value: 'c', label: 'Poetry is more inspired than narrative' },
      { value: 'd', label: 'Narrative should be read literally; poetry should be skipped' },
    ],
    literacyCorrectAnswer: 'b', literacyPoints: 1 },
];

// =============================================================================
// SECTION 3: DISC PERSONALITY (16 questions)
// =============================================================================

const discQuestions: Question[] = [
  // Dominance (D)
  { id: 'disc1', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I prefer to take charge and make decisions quickly.',
    discWeights: { D: 1.5 } },
  { id: 'disc2', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am direct and straightforward in my communication.',
    discWeights: { D: 1.2 } },
  { id: 'disc3', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am results-oriented and focused on achieving goals.',
    discWeights: { D: 1.3 } },
  { id: 'disc4', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I prefer to work independently rather than in a team.',
    discWeights: { D: 0.8, C: 0.5 } },
  
  // Influence (I)
  { id: 'disc5', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I enjoy meeting new people and am energized by social interactions.',
    discWeights: { I: 1.5 },
    ministryWeights: { 'greeters': 0.5, 'welcome-table': 0.5 } },
  { id: 'disc6', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am enthusiastic and optimistic, even in challenging situations.',
    discWeights: { I: 1.3 } },
  { id: 'disc7', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am good at motivating and inspiring others.',
    discWeights: { I: 1.2, D: 0.3 } },
  { id: 'disc8', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I prefer a fast-paced, exciting environment over a quiet, steady one.',
    discWeights: { I: 1.0, D: 0.5 } },
  
  // Steadiness (S)
  { id: 'disc9', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I prefer a stable, predictable environment over constant change.',
    discWeights: { S: 1.5 } },
  { id: 'disc10', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am patient and willing to listen before responding.',
    discWeights: { S: 1.3, C: 0.3 } },
  { id: 'disc11', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I value harmony and avoid conflict when possible.',
    discWeights: { S: 1.2 } },
  { id: 'disc12', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am loyal and dependable; people can count on me.',
    discWeights: { S: 1.0 },
    ministryWeights: { 'nursery': 0.5, 'children': 0.5 } },
  
  // Conscientiousness (C)
  { id: 'disc13', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am detail-oriented and thorough in my work.',
    discWeights: { C: 1.5 },
    ministryWeights: { 'sound': 0.5, 'lyrics': 0.5 } },
  { id: 'disc14', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I prefer to analyze information carefully before making decisions.',
    discWeights: { C: 1.3 } },
  { id: 'disc15', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I value accuracy and quality over speed.',
    discWeights: { C: 1.2, S: 0.3 } },
  { id: 'disc16', section: 3, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I follow rules and procedures carefully.',
    discWeights: { C: 1.0 } },
];

// =============================================================================
// SECTION 4: MINISTRY SKILLS (12 questions)
// =============================================================================

const ministrySkillsQuestions: Question[] = [
  // First Impressions / Hospitality
  { id: 'ms1', section: 4, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am comfortable approaching and greeting people I don\'t know.',
    ministryWeights: { 'greeters': 1.5, 'welcome-table': 1.2, 'cafe': 0.8 } },
  { id: 'ms2', section: 4, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I can stay positive and friendly even when I\'m having a difficult day.',
    ministryWeights: { 'greeters': 1.0, 'welcome-table': 1.0, 'ushers': 0.8 } },
  { id: 'ms3', section: 4, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am reliable and punctual—people can count on me to show up on time.',
    ministryWeights: { 'ushers': 1.0, 'security': 1.0, 'sound': 1.2, 'worship': 1.2 } },
  
  // Teaching / Discipleship
  { id: 'ms4', section: 4, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I can organize my thoughts and create a simple lesson outline.',
    ministryWeights: { 'teaching': 1.5, 'youth': 0.8, 'children': 0.8 } },
  { id: 'ms5', section: 4, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I communicate clearly and others understand my explanations.',
    ministryWeights: { 'teaching': 1.2, 'youth': 0.5, 'young-adults': 0.5 } },
  
  // Children / Youth
  { id: 'ms6', section: 4, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I have patience when working with children and enjoy their energy.',
    ministryWeights: { 'children': 1.5, 'nursery': 1.2 } },
  { id: 'ms7', section: 4, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I can maintain emotional regulation even in stressful situations with kids.',
    ministryWeights: { 'children': 1.0, 'nursery': 1.2, 'youth': 0.8 } },
  { id: 'ms8', section: 4, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I have experience working with children or youth (babysitting, teaching, coaching, etc.).',
    ministryWeights: { 'children': 1.5, 'nursery': 1.5, 'youth': 1.2 } },
  
  // Creative Arts
  { id: 'ms9', section: 4, type: 'yes-no',
    text: 'Do you have training or experience in any performing arts (dance, drama, spoken word)?',
    options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
    ministryWeights: { 'dance': 2.0, 'drama': 2.0 } },
  { id: 'ms10', section: 4, type: 'yes-no',
    text: 'Do you have experience with graphic design or visual art?',
    options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
    ministryWeights: { 'graphic-design': 2.0, 'visual-art': 2.0 } },
  
  // Music / Worship
  { id: 'ms11', section: 4, type: 'yes-no',
    text: 'Can you sing or play an instrument?',
    options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
    ministryWeights: { 'worship': 2.0 } },
  { id: 'ms12', section: 4, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am comfortable performing in front of an audience.',
    ministryWeights: { 'worship': 0.8, 'drama': 0.8, 'dance': 0.8, 'teaching': 0.5 } },
];

// =============================================================================
// SECTION 5: SOUND & MEDIA TECH (13 questions - with gating question)
// =============================================================================

// Likert options with "I don't know" for audio questions
const AUDIO_LIKERT_OPTIONS = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
  { value: 0, label: "I don't know" },
];

const soundMediaQuestions: Question[] = [
  // GATING QUESTION - determines if sound questions are shown
  { id: 'st0', section: 5, type: 'yes-no',
    text: 'Are you able to run sound?',
    helpText: 'If you select "No", we\'ll skip the detailed audio questions.',
    options: [
      { value: 'yes', label: 'Yes' }, 
      { value: 'no', label: 'No' }
    ],
    skillCategory: 'sound', skillPoints: 0 },
  
  // Basic Sound Theory - CONDITIONAL on st0 = 'yes'
  { id: 'st1', section: 5, type: 'multiple-choice',
    text: 'What is the difference between gain and volume?',
    conditionalTrigger: 'st0',
    options: [
      { value: 'a', label: 'They are the same thing' },
      { value: 'b', label: 'Gain controls input level; volume controls output level' },
      { value: 'c', label: 'Volume controls input level; gain controls output level' },
      { value: 'd', label: 'Gain is for bass; volume is for treble' },
      { value: 'idk', label: "I don't know" },
    ],
    skillCategory: 'sound', literacyCorrectAnswer: 'b', skillPoints: 1 },
  
  { id: 'st2', section: 5, type: 'multiple-choice',
    text: 'What does a high-pass filter do?',
    conditionalTrigger: 'st0',
    options: [
      { value: 'a', label: 'Removes high frequencies' },
      { value: 'b', label: 'Removes low frequencies' },
      { value: 'c', label: 'Boosts all frequencies equally' },
      { value: 'd', label: 'Compresses the audio signal' },
      { value: 'idk', label: "I don't know" },
    ],
    skillCategory: 'sound', literacyCorrectAnswer: 'b', skillPoints: 1 },
  
  { id: 'st3', section: 5, type: 'multiple-choice',
    text: 'What is gain staging?',
    conditionalTrigger: 'st0',
    options: [
      { value: 'a', label: 'Setting up microphones on stage' },
      { value: 'b', label: 'Properly setting input levels through each stage of the signal chain' },
      { value: 'c', label: 'Moving equipment between stages' },
      { value: 'd', label: 'Creating a playlist for the service' },
      { value: 'idk', label: "I don't know" },
    ],
    skillCategory: 'sound', literacyCorrectAnswer: 'b', skillPoints: 1 },
  
  { id: 'st4', section: 5, type: 'multiple-choice',
    text: 'What type of microphone is typically used for live vocals?',
    conditionalTrigger: 'st0',
    options: [
      { value: 'a', label: 'Condenser microphone' },
      { value: 'b', label: 'Dynamic microphone (like SM58)' },
      { value: 'c', label: 'Ribbon microphone' },
      { value: 'd', label: 'Lavalier microphone' },
      { value: 'idk', label: "I don't know" },
    ],
    skillCategory: 'sound', literacyCorrectAnswer: 'b', skillPoints: 1 },
  
  { id: 'st5', section: 5, type: 'multiple-choice',
    text: 'If there is feedback during a service, what is the FIRST thing you should do?',
    conditionalTrigger: 'st0',
    options: [
      { value: 'a', label: 'Add more reverb' },
      { value: 'b', label: 'Immediately lower the fader of the offending channel' },
      { value: 'c', label: 'Turn up other channels to mask it' },
      { value: 'd', label: 'Restart the soundboard' },
      { value: 'idk', label: "I don't know" },
    ],
    skillCategory: 'sound', literacyCorrectAnswer: 'b', skillPoints: 1 },
  
  // Live Service Workflow - CONDITIONAL on st0 = 'yes'
  { id: 'st6', section: 5, type: 'likert', options: AUDIO_LIKERT_OPTIONS,
    text: 'I have experience running a soundboard (analog or digital).',
    conditionalTrigger: 'st0',
    skillCategory: 'sound', skillPoints: 1 },
  
  { id: 'st7', section: 5, type: 'likert', options: AUDIO_LIKERT_OPTIONS,
    text: 'I am comfortable troubleshooting when there is no sound coming from a microphone.',
    conditionalTrigger: 'st0',
    skillCategory: 'sound', skillPoints: 0.5 },
  
  // ProPresenter / Lyrics
  { id: 'st8', section: 5, type: 'yes-no',
    text: 'Have you used ProPresenter or similar presentation software?',
    options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
    skillCategory: 'propresenter', skillPoints: 1,
    ministryWeights: { 'lyrics': 2.0 } },
  
  { id: 'st9', section: 5, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am comfortable operating a computer during a live service.',
    skillCategory: 'propresenter', skillPoints: 0.5,
    ministryWeights: { 'lyrics': 1.0, 'livestream': 0.8 } },
  
  // Photography / Video
  { id: 'st10', section: 5, type: 'yes-no',
    text: 'Do you have experience with photography or videography?',
    options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
    skillCategory: 'photography', skillPoints: 1,
    ministryWeights: { 'photography': 2.0, 'livestream': 1.0 } },
  
  { id: 'st11', section: 5, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I understand concepts like framing, exposure, and white balance.',
    skillCategory: 'photography', skillPoints: 0.5 },
  
  { id: 'st12', section: 5, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I have experience operating cameras or live switching equipment.',
    skillCategory: 'media', skillPoints: 1,
    ministryWeights: { 'livestream': 1.5 } },
];

// =============================================================================
// SECTION 6: TEAM FIT & PREFERENCES (8 questions)
// =============================================================================

const teamFitQuestions: Question[] = [
  { id: 'tf1', section: 6, type: 'multiple-choice',
    text: 'What pace of environment do you prefer?',
    options: [
      { value: 'slow', label: 'Slow and steady—I like to take my time' },
      { value: 'moderate', label: 'Moderate—I can flex either way' },
      { value: 'fast', label: 'Fast-paced and high-energy—I thrive under pressure' },
    ] },
  
  { id: 'tf2', section: 6, type: 'multiple-choice',
    text: 'How do you prefer to receive direction?',
    options: [
      { value: 'detailed', label: 'Clear, detailed instructions for every step' },
      { value: 'overview', label: 'General overview and I figure out the details' },
      { value: 'autonomous', label: 'Minimal direction—I prefer full autonomy' },
    ] },
  
  { id: 'tf3', section: 6, type: 'multiple-choice',
    text: 'What type of team dynamic suits you best?',
    options: [
      { value: 'small', label: 'Small, close-knit team (2-5 people)' },
      { value: 'medium', label: 'Medium team with defined roles (6-15 people)' },
      { value: 'large', label: 'Large team where I can blend in or stand out as needed' },
    ] },
  
  { id: 'tf4', section: 6, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I prefer working with people more than working on tasks alone.' },
  
  { id: 'tf5', section: 6, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am comfortable with last-minute changes and adapting on the fly.' },
  
  { id: 'tf6', section: 6, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I prefer behind-the-scenes roles rather than being in front of people.' },
  
  { id: 'tf7', section: 6, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am comfortable receiving feedback and correction.' },
  
  { id: 'tf8', section: 6, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I enjoy learning new skills and growing in my abilities.' },
];

// =============================================================================
// SECTION 7: CHILDREN & YOUTH MINISTRY (15 questions)
// =============================================================================

const childrenYouthQuestions: Question[] = [
  { id: 'cy1', section: 7, type: 'yes-no',
    text: 'Are you interested in serving with children (ages 0-12) or youth (ages 13-18)?',
    helpText: 'If you select "No", we\'ll skip the detailed questions about working with minors.',
    options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
  
  { id: 'cy2', section: 7, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I feel comfortable and at ease when working with children.',
    conditionalTrigger: 'cy1',
    qualificationCategory: 'children', qualificationWeight: 1.5 },
  
  { id: 'cy3', section: 7, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I have patience when children are energetic, loud, or challenging.',
    conditionalTrigger: 'cy1',
    qualificationCategory: 'children', qualificationWeight: 2.0,
    disqualifyingAnswer: 1 },
  
  { id: 'cy4', section: 7, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I can maintain calm and emotional regulation even in stressful situations.',
    conditionalTrigger: 'cy1',
    qualificationCategory: 'children', qualificationWeight: 1.5 },
  
  { id: 'cy5', section: 7, type: 'yes-no',
    text: 'I am comfortable following safety protocols and procedures for child protection.',
    conditionalTrigger: 'cy1',
    options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
    qualificationCategory: 'children', qualificationWeight: 2.0,
    disqualifyingAnswer: 'no' },
  
  { id: 'cy6', section: 7, type: 'yes-no',
    text: 'I can pass a background check (CORI/DSS) without any concerns.',
    conditionalTrigger: 'cy1',
    helpText: 'We do not need details—just whether you can pass a standard check.',
    options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
    qualificationCategory: 'children', qualificationWeight: 3.0,
    disqualifyingAnswer: 'no' },
  
  { id: 'cy7', section: 7, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I have experience caring for children (babysitting, teaching, parenting, etc.).',
    conditionalTrigger: 'cy1',
    qualificationCategory: 'children', qualificationWeight: 1.0 },
  
  { id: 'cy8', section: 7, type: 'yes-no',
    text: 'I am physically able to lift, carry, or assist children when needed.',
    conditionalTrigger: 'cy1',
    options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
    qualificationCategory: 'children', qualificationWeight: 0.5 },
  
  { id: 'cy9', section: 7, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am comfortable working under the direction of a ministry leader.',
    conditionalTrigger: 'cy1',
    qualificationCategory: 'children', qualificationWeight: 1.0 },
  
  { id: 'cy10', section: 7, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I feel comfortable relating to and mentoring teenagers.',
    conditionalTrigger: 'cy1',
    qualificationCategory: 'youth', qualificationWeight: 1.5 },
  
  { id: 'cy11', section: 7, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I can handle sensitive conversations with appropriate boundaries.',
    conditionalTrigger: 'cy1',
    qualificationCategory: 'youth', qualificationWeight: 2.0,
    disqualifyingAnswer: 1 },
  
  { id: 'cy12', section: 7, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am emotionally mature and can model healthy Christian behavior.',
    conditionalTrigger: 'cy1',
    qualificationCategory: 'youth', qualificationWeight: 1.5 },
  
  { id: 'cy13', section: 7, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I understand the importance of appropriate digital boundaries with minors.',
    conditionalTrigger: 'cy1',
    helpText: 'This includes social media, texting, and online communication.',
    qualificationCategory: 'youth', qualificationWeight: 2.0,
    disqualifyingAnswer: 1 },
  
  { id: 'cy14', section: 7, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am reliable and can be counted on to show up consistently.',
    conditionalTrigger: 'cy1',
    qualificationCategory: 'youth', qualificationWeight: 1.0 },
  
  { id: 'cy15', section: 7, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I can remain calm and level-headed rather than reacting impulsively.',
    conditionalTrigger: 'cy1',
    qualificationCategory: 'youth', qualificationWeight: 1.5,
    disqualifyingAnswer: 1 },
];

// =============================================================================
// SECTION 8: SUPPORT GROUP MINISTRY (12 questions)
// =============================================================================

const supportGroupQuestions: Question[] = [
  { id: 'sg_intro', section: 8, type: 'yes-no',
    text: 'Are you interested in support group ministries (GriefShare, Celebrate Recovery, or The Landing Team)?',
    helpText: 'These ministries help people through difficult seasons.',
    options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
  
  { id: 'gs1', section: 8, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am comfortable being present with people who are grieving or in pain.',
    conditionalTrigger: 'sg_intro',
    qualificationCategory: 'griefshare', qualificationWeight: 2.0,
    ministryWeights: { 'griefshare': 1.5 } },
  
  { id: 'gs2', section: 8, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I can listen without trying to fix or offer unsolicited advice.',
    conditionalTrigger: 'sg_intro',
    qualificationCategory: 'griefshare', qualificationWeight: 1.5,
    ministryWeights: { 'griefshare': 1.2 } },
  
  { id: 'gs3', section: 8, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I maintain strict confidentiality about what others share.',
    conditionalTrigger: 'sg_intro',
    qualificationCategory: 'griefshare', qualificationWeight: 2.0,
    ministryWeights: { 'griefshare': 1.5, 'celebrate-recovery': 1.5 },
    disqualifyingAnswer: 1 },
  
  { id: 'cr1', section: 8, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am comfortable with vulnerability and transparency about my own struggles.',
    conditionalTrigger: 'sg_intro',
    qualificationCategory: 'celebrate-recovery', qualificationWeight: 2.0,
    ministryWeights: { 'celebrate-recovery': 1.5 } },
  
  { id: 'cr2', section: 8, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I understand the importance of accountability in recovery.',
    conditionalTrigger: 'sg_intro',
    qualificationCategory: 'celebrate-recovery', qualificationWeight: 1.5,
    ministryWeights: { 'celebrate-recovery': 1.2 } },
  
  { id: 'cr3', section: 8, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I can support others without trying to control their journey.',
    conditionalTrigger: 'sg_intro',
    qualificationCategory: 'celebrate-recovery', qualificationWeight: 1.5,
    ministryWeights: { 'celebrate-recovery': 1.0 } },
  
  { id: 'lt1', section: 8, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I enjoy welcoming new people and making them feel at home.',
    conditionalTrigger: 'sg_intro',
    qualificationCategory: 'landing-team', qualificationWeight: 2.0,
    ministryWeights: { 'landing-team': 1.5, 'greeters': 1.0, 'welcome-table': 1.0 } },
  
  { id: 'lt2', section: 8, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am comfortable reaching out to people via phone, text, or email.',
    conditionalTrigger: 'sg_intro',
    qualificationCategory: 'landing-team', qualificationWeight: 1.5,
    ministryWeights: { 'landing-team': 1.2 } },
  
  { id: 'lt3', section: 8, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I am detail-oriented and can follow up consistently with people.',
    conditionalTrigger: 'sg_intro',
    qualificationCategory: 'landing-team', qualificationWeight: 1.5,
    ministryWeights: { 'landing-team': 1.0 } },
  
  { id: 'lt4', section: 8, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I maintain a warm and joyful demeanor even when busy.',
    conditionalTrigger: 'sg_intro',
    qualificationCategory: 'landing-team', qualificationWeight: 1.0,
    ministryWeights: { 'landing-team': 0.8, 'greeters': 0.8 } },
  
  { id: 'sg_maturity', section: 8, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I consider myself spiritually mature and able to handle difficult conversations.',
    conditionalTrigger: 'sg_intro',
    qualificationCategory: 'griefshare', qualificationWeight: 1.0,
    ministryWeights: { 'griefshare': 0.8, 'celebrate-recovery': 0.8 } },
];

// =============================================================================
// SECTION 9: AVAILABILITY (5 questions)
// =============================================================================

const availabilityQuestions: Question[] = [
  { id: 'av1', section: 9, type: 'multiple-choice',
    text: 'How often are you able to serve?',
    options: [
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Every other week' },
      { value: 'monthly', label: 'Once a month' },
      { value: 'occasionally', label: 'Occasionally / As needed' },
    ] },
  
  { id: 'av2', section: 9, type: 'multiple-choice',
    text: 'Which service time(s) can you serve? (Select your primary preference)',
    options: [
      { value: 'morning', label: 'Sunday Morning' },
      { value: 'evening', label: 'Sunday Evening' },
      { value: 'wednesday', label: 'Wednesday Night' },
      { value: 'flexible', label: 'Any/Flexible' },
    ] },
  
  { id: 'av3', section: 9, type: 'yes-no',
    text: 'Are you willing to attend training sessions to develop your skills?',
    options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
  
  { id: 'av4', section: 9, type: 'yes-no',
    text: 'Are you currently serving in any ministry at Garden City Church?',
    options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
  
  { id: 'av5', section: 9, type: 'likert', options: LIKERT_OPTIONS,
    text: 'I have the time and capacity to commit to regular ministry involvement.' },
];

// =============================================================================
// COMBINED QUESTIONS EXPORT
// =============================================================================

export const SURVEY_QUESTIONS: Question[] = [
  ...aboutYouQuestions,
  ...spiritualGiftsQuestions,
  ...biblicalLiteracyQuestions,
  ...discQuestions,
  ...ministrySkillsQuestions,
  ...soundMediaQuestions,
  ...teamFitQuestions,
  ...childrenYouthQuestions,
  ...supportGroupQuestions,
  ...availabilityQuestions,
];

export function getQuestionsForSection(sectionId: number): Question[] {
  return SURVEY_QUESTIONS.filter(q => q.section === sectionId);
}

export function getTotalQuestionCount(): number {
  return SURVEY_QUESTIONS.length;
}
