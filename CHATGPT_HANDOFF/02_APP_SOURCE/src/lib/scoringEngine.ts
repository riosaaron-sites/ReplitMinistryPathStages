import type { 
  SurveyAnswers, 
  SpiritualGift, 
  GiftScore, 
  PersonalityProfile,
  MinistryMatch,
  MinistryId,
  MINISTRIES 
} from "@shared/schema";
import { SURVEY_QUESTIONS } from "@/lib/surveyQuestions";
import { GIFT_DESCRIPTIONS, MINISTRY_DESCRIPTIONS, PERSONALITY_TYPES } from "@/lib/giftDescriptions";

export function calculateGiftScores(answers: SurveyAnswers): GiftScore[] {
  const giftTotals: Record<SpiritualGift, number> = {
    prophecy: 0,
    teaching: 0,
    shepherding: 0,
    evangelism: 0,
    discernment: 0,
    administration: 0,
    leadership: 0,
    serving: 0,
    mercy: 0,
    giving: 0,
    hospitality: 0,
    intercession: 0,
  };

  // Calculate weighted scores from answers
  for (const question of SURVEY_QUESTIONS) {
    const answer = answers[question.id];
    if (answer === undefined || !question.giftWeights) continue;

    // Convert answer to numeric value for scoring
    let scoreMultiplier = 0;
    if (typeof answer === 'number') {
      // Likert scale: 1-5 maps to 0-1 multiplier
      scoreMultiplier = (answer - 1) / 4;
    } else if (answer === 'yes') {
      scoreMultiplier = 1;
    } else if (answer === 'no') {
      scoreMultiplier = 0;
    }

    // Apply weights to each gift
    for (const [gift, weight] of Object.entries(question.giftWeights)) {
      giftTotals[gift as SpiritualGift] += weight * scoreMultiplier;
    }
  }

  // Normalize and sort scores
  const maxScore = Math.max(...Object.values(giftTotals));
  const giftScores: GiftScore[] = Object.entries(giftTotals)
    .map(([gift, score]) => ({
      gift: gift as SpiritualGift,
      score: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
      description: GIFT_DESCRIPTIONS[gift as SpiritualGift].description,
      biblicalReference: GIFT_DESCRIPTIONS[gift as SpiritualGift].biblicalReference,
    }))
    .sort((a, b) => b.score - a.score);

  return giftScores;
}

export function calculatePersonalityProfile(answers: SurveyAnswers): PersonalityProfile {
  const traits = {
    introvertExtrovert: 0,
    peopleTasks: 0,
    detailBigPicture: 0,
    structuredFlexible: 0,
  };

  let traitCounts = {
    introvertExtrovert: 0,
    peopleTasks: 0,
    detailBigPicture: 0,
    structuredFlexible: 0,
  };

  // Calculate personality trait scores
  for (const question of SURVEY_QUESTIONS) {
    const answer = answers[question.id];
    if (answer === undefined || !question.personalityWeights) continue;

    let scoreMultiplier = 0;
    if (typeof answer === 'number') {
      // Convert 1-5 to -1 to 1 scale
      scoreMultiplier = (answer - 3) / 2;
    }

    for (const [trait, weight] of Object.entries(question.personalityWeights)) {
      traits[trait as keyof typeof traits] += weight * scoreMultiplier;
      traitCounts[trait as keyof typeof traits]++;
    }
  }

  // Normalize traits
  for (const trait of Object.keys(traits) as Array<keyof typeof traits>) {
    if (traitCounts[trait] > 0) {
      traits[trait] = traits[trait] / traitCounts[trait];
    }
  }

  // Determine personality dimensions
  const introvertExtrovert = traits.introvertExtrovert > 0.2 
    ? 'extrovert' 
    : traits.introvertExtrovert < -0.2 
      ? 'introvert' 
      : 'ambivert';

  const peopleTasks = traits.peopleTasks > 0.2
    ? 'people-focused'
    : traits.peopleTasks < -0.2
      ? 'task-focused'
      : 'balanced';

  const detailBigPicture = traits.detailBigPicture > 0.2
    ? 'big-picture'
    : traits.detailBigPicture < -0.2
      ? 'detail-oriented'
      : 'balanced';

  const structuredFlexible = traits.structuredFlexible > 0.2
    ? 'flexible'
    : traits.structuredFlexible < -0.2
      ? 'structured'
      : 'balanced';

  // Determine personality type
  let personalityType = "Steady Servant"; // default
  
  if (introvertExtrovert === 'extrovert' && peopleTasks === 'people-focused') {
    personalityType = "Warm Encourager";
  } else if (introvertExtrovert === 'extrovert' && detailBigPicture === 'big-picture') {
    personalityType = "Visionary Leader";
  } else if (detailBigPicture === 'detail-oriented' && structuredFlexible === 'structured') {
    personalityType = "Thoughtful Teacher";
  } else if (structuredFlexible === 'flexible' && peopleTasks === 'people-focused') {
    personalityType = "Creative Expresser";
  } else if (peopleTasks === 'task-focused' && structuredFlexible === 'structured') {
    personalityType = "Organized Administrator";
  } else if (peopleTasks === 'people-focused' && introvertExtrovert !== 'extrovert') {
    personalityType = "Compassionate Caregiver";
  } else if (introvertExtrovert === 'extrovert' && peopleTasks !== 'task-focused') {
    personalityType = "Bold Evangelist";
  }

  const typeData = PERSONALITY_TYPES[personalityType as keyof typeof PERSONALITY_TYPES];

  return {
    type: personalityType,
    traits: typeData?.traits || [],
    description: typeData?.description || "",
    introvertExtrovert,
    peopleTasks,
    detailBigPicture,
    structuredFlexible,
  };
}

export function calculateMinistryMatches(
  answers: SurveyAnswers,
  giftScores: GiftScore[],
  personality: PersonalityProfile
): MinistryMatch[] {
  const ministryScores: Record<MinistryId, number> = {} as Record<MinistryId, number>;
  const skillVerificationNeeded: Set<MinistryId> = new Set(['worship', 'sound', 'livestream', 'graphic-design', 'visual-art', 'dance', 'drama', 'photography']);
  const hasVerifiedSkill: Record<MinistryId, boolean> = {} as Record<MinistryId, boolean>;

  // Initialize ministry scores
  const ministries: Array<{id: MinistryId; name: string; category: string}> = [
    { id: 'greeters', name: 'Greeters', category: 'First Impressions / Landing Team' },
    { id: 'welcome-table', name: 'Welcome / Guest Table', category: 'First Impressions / Landing Team' },
    { id: 'ushers', name: 'Ushers', category: 'Ushers' },
    { id: 'security', name: 'Security', category: 'Security' },
    { id: 'transportation', name: 'Transportation', category: 'Transportation' },
    { id: 'cafe', name: 'Café / Hospitality', category: 'Café / Hospitality' },
    { id: 'facilities', name: 'Facilities / Setup / Cleaning', category: 'Facilities' },
    { id: 'worship', name: 'Worship Team', category: 'Worship Team' },
    { id: 'sound', name: 'Sound', category: 'Media / Production' },
    { id: 'lyrics', name: 'Lyrics / ProPresenter', category: 'Media / Production' },
    { id: 'livestream', name: 'Live Stream / Video', category: 'Media / Production' },
    { id: 'visual-art', name: 'Visual Art', category: 'Creative Arts' },
    { id: 'graphic-design', name: 'Graphic Design', category: 'Creative Arts' },
    { id: 'dance', name: 'Dance', category: 'Creative Arts' },
    { id: 'drama', name: 'Drama / Spoken Word', category: 'Creative Arts' },
    { id: 'photography', name: 'Photography / Videography', category: 'Creative Arts' },
    { id: 'teaching', name: 'Teaching / Discipleship', category: 'Teaching / Discipleship' },
    { id: 'youth', name: 'Youth Ministry', category: 'Youth Ministry' },
    { id: 'children', name: "Children's Ministry", category: "Children's Ministry" },
    { id: 'nursery', name: 'Nursery', category: 'Nursery' },
    { id: 'young-adults', name: 'Young Adults', category: 'Young Adults' },
    { id: 'outreach', name: 'Outreach / Evangelism', category: 'Outreach' },
  ];

  for (const ministry of ministries) {
    ministryScores[ministry.id] = 0;
  }

  // Add scores from question weights
  for (const question of SURVEY_QUESTIONS) {
    const answer = answers[question.id];
    if (answer === undefined || !question.ministryWeights) continue;

    let scoreMultiplier = 0;
    if (typeof answer === 'number') {
      scoreMultiplier = (answer - 1) / 4;
    } else if (answer === 'yes') {
      scoreMultiplier = 1;
      // Track skill verification
      if (question.skillVerification) {
        for (const ministryId of Object.keys(question.ministryWeights) as MinistryId[]) {
          hasVerifiedSkill[ministryId] = true;
        }
      }
    }

    for (const [ministryId, weight] of Object.entries(question.ministryWeights)) {
      ministryScores[ministryId as MinistryId] += weight * scoreMultiplier;
    }
  }

  // Add gift-based bonuses
  const topGifts = giftScores.slice(0, 5);
  const giftToMinistry: Record<string, MinistryId[]> = {
    hospitality: ['greeters', 'welcome-table', 'cafe'],
    serving: ['facilities', 'cafe', 'ushers'],
    leadership: ['security', 'ushers'],
    teaching: ['teaching', 'youth', 'children'],
    shepherding: ['youth', 'young-adults', 'children'],
    mercy: ['nursery', 'children', 'outreach'],
    evangelism: ['outreach', 'greeters'],
    administration: ['facilities', 'sound', 'lyrics'],
    discernment: ['security'],
  };

  for (const giftScore of topGifts) {
    const relevantMinistries = giftToMinistry[giftScore.gift] || [];
    for (const ministryId of relevantMinistries) {
      ministryScores[ministryId] += (giftScore.score / 100) * 0.5;
    }
  }

  // Add personality bonuses
  if (personality.introvertExtrovert === 'extrovert') {
    ministryScores['greeters'] += 0.3;
    ministryScores['welcome-table'] += 0.3;
    ministryScores['outreach'] += 0.2;
  }
  if (personality.peopleTasks === 'task-focused') {
    ministryScores['facilities'] += 0.3;
    ministryScores['sound'] += 0.2;
    ministryScores['lyrics'] += 0.2;
  }
  if (personality.detailBigPicture === 'detail-oriented') {
    ministryScores['sound'] += 0.2;
    ministryScores['lyrics'] += 0.2;
    ministryScores['graphic-design'] += 0.2;
  }

  // Build ministry matches
  const matches: MinistryMatch[] = ministries
    .map((ministry) => {
      const needsSkillVerification = skillVerificationNeeded.has(ministry.id);
      const hasSkill = hasVerifiedSkill[ministry.id] || false;
      const ministryDesc = MINISTRY_DESCRIPTIONS[ministry.id];

      let growthPathway: string | undefined;
      if (needsSkillVerification && !hasSkill && ministryScores[ministry.id] > 0.5) {
        growthPathway = `You show interest in ${ministry.name}, but may need additional training or experience. Consider shadowing current team members or taking relevant classes to develop your skills.`;
      }

      // Generate "why matched" explanation
      let whyMatched = "";
      const matchingGifts = topGifts
        .filter(g => giftToMinistry[g.gift]?.includes(ministry.id))
        .map(g => GIFT_DESCRIPTIONS[g.gift].name.split(' /')[0]);

      if (matchingGifts.length > 0) {
        whyMatched = `Your gifts of ${matchingGifts.join(' and ')} align well with this ministry.`;
      } else if (personality.introvertExtrovert === 'extrovert' && ['greeters', 'welcome-table', 'cafe'].includes(ministry.id)) {
        whyMatched = `Your outgoing personality makes you a natural fit for welcoming others.`;
      } else if (personality.peopleTasks === 'task-focused' && ['facilities', 'sound'].includes(ministry.id)) {
        whyMatched = `Your task-oriented approach is valuable for this behind-the-scenes ministry.`;
      } else {
        whyMatched = `Based on your responses, you may thrive in this serving role.`;
      }

      return {
        ministryId: ministry.id,
        name: ministry.name,
        category: ministry.category,
        score: ministryScores[ministry.id],
        description: ministryDesc?.description || "",
        whyMatched,
        isPrimary: false,
        requiresSkillVerification: needsSkillVerification && !hasSkill,
        growthPathway,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Mark top 5 as primary (or less if scores are too low)
  for (let i = 0; i < Math.min(5, matches.length); i++) {
    if (matches[i].score > 0.3) {
      matches[i].isPrimary = true;
    }
  }

  return matches;
}
