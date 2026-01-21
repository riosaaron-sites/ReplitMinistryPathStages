import OpenAI from 'openai';
import { db } from './db';
import { manuals, trainingModules, manualAnalysis } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { DeepLesson, KnowledgeCheckQuestion, IntensiveAssessmentQuestion, TrainingAudience } from '@shared/schema';
import { extractTextFromPdf } from './manualAnalysisService';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

async function generateUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const existing = await db.select().from(trainingModules).where(eq(trainingModules.slug, slug));
    if (existing.length === 0) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

export async function generateDeepLessons(text: string, manualTitle: string, retryAttempt: number = 0): Promise<DeepLesson[]> {
  const truncatedText = text.substring(0, 25000);
  
  // Progressively stronger prompts for retries
  const baseEnforcement = retryAttempt === 0 ? '' : `

STRICT ENFORCEMENT (Attempt ${retryAttempt + 1}): Previous generation produced fewer than 8 lessons. You MUST generate EXACTLY 8 lessons minimum. Expand topics by covering:
- Fundamentals and core concepts
- Practical day-to-day application  
- Team communication and collaboration
- Problem-solving scenarios
- Leadership and mentoring aspects
- Cultural integration in church context
- Continuous improvement practices
- Advanced applications and mastery`;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a Christian ministry training content creator for Garden City Church. Create a comprehensive training series with EXACTLY 8-12 lessons based on the provided manual content.

CRITICAL REQUIREMENT: You MUST create between 8 and 12 lessons. This is a hard requirement. If the source content seems limited, expand each topic into multiple lessons covering different aspects.${baseEnforcement}

Each lesson MUST include:
1. A clear, descriptive title
2. Teaching content (3-5 paragraphs, not bullet-only - write in clear prose)
3. "Why This Matters" section explaining practical application for church service and culture
4. A short reflection prompt for personal contemplation
5. Scripture references ONLY if clearly present in the manual or absolutely essential to the topic

Guidelines:
- Make content accessible for church volunteers of all experience levels
- Focus on practical application, not just theory
- Use warm, encouraging language consistent with church culture
- Each lesson should build on previous ones
- Include real ministry scenarios where applicable
- If the source material is thin, expand topics: add lessons on application, team dynamics, communication, problem-solving, etc.

Return a JSON object with this structure:
{
  "lessons": [
    {
      "id": "lesson-1",
      "lessonNumber": 1,
      "title": "Lesson Title",
      "teachingContent": "Multiple paragraphs of clear teaching content...",
      "whyThisMatters": "Why this is important for serving...",
      "reflectionPrompt": "A question for personal reflection...",
      "scriptureReferences": ["John 3:16", "Matthew 28:19"] // Only if applicable
    }
  ]
}`
      },
      {
        role: 'user',
        content: `Create EXACTLY 8-12 comprehensive lessons for the "${manualTitle}" training. You must generate at least 8 lessons:\n\n${truncatedText}`
      }
    ],
    temperature: 0.7,
    max_tokens: 12000,
    response_format: { type: 'json_object' }
  });

  try {
    const content = response.choices[0]?.message?.content || '{"lessons": []}';
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.lessons) ? parsed.lessons : [];
  } catch (error) {
    console.error('Error parsing deep lessons:', error);
    return [];
  }
}

export async function generateKnowledgeCheckQuestions(text: string, manualTitle: string): Promise<KnowledgeCheckQuestion[]> {
  const truncatedText = text.substring(0, 20000);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a Christian ministry training content creator. Generate 10-15 knowledge check questions for a ministry training module. These are "light" questions to verify basic understanding.

Question types should include:
- Multiple choice (most common)
- Short answer (2-3 questions)

Guidelines:
- Questions should test comprehension of key concepts
- Progress from foundational to more complex
- Include explanations for correct answers
- Make questions clear and unambiguous

Return a JSON object with this structure:
{
  "questions": [
    {
      "id": "kc-1",
      "questionType": "multiple-choice",
      "question": "What is the primary purpose of...?",
      "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
      "correctAnswer": "A",
      "explanation": "This is correct because..."
    },
    {
      "id": "kc-2",
      "questionType": "short-answer",
      "question": "Describe in your own words...",
      "correctAnswer": "Key points to include...",
      "explanation": "A good answer would mention..."
    }
  ]
}`
      },
      {
        role: 'user',
        content: `Create knowledge check questions for the "${manualTitle}" training:\n\n${truncatedText}`
      }
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: 'json_object' }
  });

  try {
    const content = response.choices[0]?.message?.content || '{"questions": []}';
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.questions) ? parsed.questions : [];
  } catch (error) {
    console.error('Error parsing knowledge check questions:', error);
    return [];
  }
}

export async function generateIntensiveAssessment(text: string, manualTitle: string): Promise<IntensiveAssessmentQuestion[]> {
  const truncatedText = text.substring(0, 20000);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a Christian ministry training content creator. Generate 15-20 intensive assessment questions that test deeper understanding and practical application.

REQUIRED question types:
1. Scenario-based questions (at least 8): Present a realistic ministry situation and ask what the person would do
2. Application questions (at least 5): "What would you do if..." style questions
3. Multiple-choice (remaining): Standard comprehension questions

Guidelines:
- Scenarios should reflect real church/ministry situations
- Include ethical dilemmas and interpersonal challenges
- Test both knowledge AND wisdom/judgment
- Weight more complex questions higher (2-3 points)
- Include detailed explanations for each answer

Return a JSON object with this structure:
{
  "questions": [
    {
      "id": "ia-1",
      "questionType": "scenario",
      "scenario": "You arrive at church on Sunday morning and discover that the scheduled volunteer hasn't shown up. The service starts in 30 minutes and you need their role filled...",
      "question": "What is the best course of action in this situation?",
      "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
      "correctAnswer": "B",
      "explanation": "This approach is best because...",
      "weight": 3
    },
    {
      "id": "ia-2",
      "questionType": "application",
      "question": "How would you handle a situation where a team member consistently arrives late?",
      "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
      "correctAnswer": "C",
      "explanation": "This demonstrates good leadership because...",
      "weight": 2
    }
  ]
}`
      },
      {
        role: 'user',
        content: `Create intensive assessment questions for the "${manualTitle}" training:\n\n${truncatedText}`
      }
    ],
    temperature: 0.7,
    max_tokens: 6000,
    response_format: { type: 'json_object' }
  });

  try {
    const content = response.choices[0]?.message?.content || '{"questions": []}';
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.questions) ? parsed.questions : [];
  } catch (error) {
    console.error('Error parsing intensive assessment:', error);
    return [];
  }
}

export interface DeepTrainingResult {
  success: boolean;
  error?: string;
  trainingModuleId?: string;
  lessonsCount?: number;
  knowledgeCheckCount?: number;
  intensiveAssessmentCount?: number;
}

export interface CoreManualConfig {
  manualId: string;
  title: string;
  audience: TrainingAudience;
  isRequired: boolean;
  category: string;
}

export const CORE_MANUALS_CONFIG: Record<string, Omit<CoreManualConfig, 'manualId'>> = {
  'about us': { title: 'About Us & Our Mission', audience: 'all', isRequired: true, category: 'resource' },
  'discipleship': { title: 'Discipleship Pathway', audience: 'all', isRequired: true, category: 'resource' },
  'serve booklet': { title: 'SERVE Orientation', audience: 'all', isRequired: true, category: 'resource' },
  'serve orientation': { title: 'SERVE Orientation', audience: 'all', isRequired: true, category: 'resource' },
  'live the life': { title: 'Live the Life, Tell the Story', audience: 'all', isRequired: true, category: 'resource' },
  'following jesus': { title: 'Following Jesus', audience: 'all', isRequired: true, category: 'resource' },
  'language of a leader': { title: 'Language of a Leader', audience: 'leader', isRequired: true, category: 'leadership_training' },
  'recruitment': { title: 'Recruitment 101', audience: 'leader', isRequired: true, category: 'leadership_training' },
  'ministry leaders manual': { title: 'Ministry Leaders Manual', audience: 'leader', isRequired: true, category: 'leadership_training' },
};

export async function generateDeepTraining(
  manualId: string,
  audience: TrainingAudience = 'all',
  isRequired: boolean = true
): Promise<DeepTrainingResult> {
  try {
    const [manual] = await db.select().from(manuals).where(eq(manuals.id, manualId));
    if (!manual) {
      return { success: false, error: 'Manual not found' };
    }

    console.log(`Generating deep training for: ${manual.title}`);

    const existingAnalysis = await db.select().from(manualAnalysis).where(eq(manualAnalysis.manualId, manualId));
    let analysisRecord;

    if (existingAnalysis.length > 0) {
      [analysisRecord] = await db.update(manualAnalysis)
        .set({ status: 'processing', updatedAt: new Date() })
        .where(eq(manualAnalysis.manualId, manualId))
        .returning();
    } else {
      [analysisRecord] = await db.insert(manualAnalysis)
        .values({ manualId, status: 'processing' })
        .returning();
    }

    let extractedText = '';
    if (manual.fileUrl) {
      try {
        extractedText = await extractTextFromPdf(manual.fileUrl);
      } catch (err) {
        console.error('PDF extraction error:', err);
        await db.update(manualAnalysis)
          .set({ status: 'failed', errorMessage: 'Failed to extract PDF text' })
          .where(eq(manualAnalysis.id, analysisRecord.id));
        return { success: false, error: 'Failed to extract PDF text' };
      }
    }

    if (!extractedText || extractedText.length < 100) {
      await db.update(manualAnalysis)
        .set({ status: 'failed', errorMessage: 'Insufficient text content in PDF' })
        .where(eq(manualAnalysis.id, analysisRecord.id));
      return { success: false, error: 'Insufficient text content in PDF' };
    }

    console.log(`  Extracted ${extractedText.length} characters, generating content...`);

    const [lessons, knowledgeCheckQuestions, intensiveAssessmentQuestions] = await Promise.all([
      generateDeepLessons(extractedText, manual.title),
      generateKnowledgeCheckQuestions(extractedText, manual.title),
      generateIntensiveAssessment(extractedText, manual.title),
    ]);

    console.log(`  Generated: ${lessons.length} lessons, ${knowledgeCheckQuestions.length} knowledge checks, ${intensiveAssessmentQuestions.length} intensive assessments`);

    if (lessons.length < 8) {
      console.warn(`  Warning: Only ${lessons.length} lessons generated (target: 8-12)`);
    }

    await db.update(manualAnalysis)
      .set({
        status: 'completed',
        extractedText: extractedText.substring(0, 50000),
        summary: lessons.length > 0 ? lessons[0].teachingContent.substring(0, 500) : '',
        keyTopics: lessons.map(l => l.title),
        studyQuestions: knowledgeCheckQuestions,
        assessmentQuestions: intensiveAssessmentQuestions,
        aiModel: 'gpt-4o',
        generatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(manualAnalysis.id, analysisRecord.id));

    const baseSlug = generateSlug(manual.title.replace(/ manual$/i, ''));
    const slug = await generateUniqueSlug(baseSlug);

    const reflectionPrompt = `Reflect on what you've learned in this training about "${manual.title}". How will you apply these principles in your ministry service? What specific changes will you make in how you serve?`;

    const existingModule = await db.select().from(trainingModules).where(eq(trainingModules.manualId, manualId));
    let trainingModule;

    const moduleData = {
      description: `Deep training module based on the ${manual.title} manual. This comprehensive training includes ${lessons.length} lessons, knowledge checks, and scenario-based assessments.`,
      lessons: lessons,
      knowledgeCheckQuestions: knowledgeCheckQuestions,
      intensiveAssessmentQuestions: intensiveAssessmentQuestions,
      reflectionPrompt,
      sourceCategory: manual.category,
      audience,
      isRequired,
      isPublished: true,
      isDeepTraining: true,
      isAutoGenerated: true,
      estimatedMinutes: lessons.length * 10 + 20,
      passingScore: 70,
      xpReward: 200,
      updatedAt: new Date(),
    };

    if (existingModule.length > 0) {
      [trainingModule] = await db.update(trainingModules)
        .set(moduleData)
        .where(eq(trainingModules.id, existingModule[0].id))
        .returning();
    } else {
      [trainingModule] = await db.insert(trainingModules)
        .values({
          title: manual.title.replace(/ Manual$/i, ' Training'),
          slug,
          ministryId: manual.ministryId,
          manualId: manual.id,
          ...moduleData,
        })
        .returning();
    }

    console.log(`  Training module created/updated: ${trainingModule.id}`);

    return {
      success: true,
      trainingModuleId: trainingModule.id,
      lessonsCount: lessons.length,
      knowledgeCheckCount: knowledgeCheckQuestions.length,
      intensiveAssessmentCount: intensiveAssessmentQuestions.length,
    };
  } catch (error) {
    console.error('Error generating deep training:', error);
    
    await db.update(manualAnalysis)
      .set({ status: 'failed', errorMessage: String(error) })
      .where(eq(manualAnalysis.manualId, manualId));
    
    return { success: false, error: String(error) };
  }
}

export async function identifyCoreManuals(): Promise<CoreManualConfig[]> {
  const allManuals = await db.select().from(manuals);
  const coreManuals: CoreManualConfig[] = [];

  for (const manual of allManuals) {
    const lowerTitle = manual.title.toLowerCase();
    
    for (const [pattern, config] of Object.entries(CORE_MANUALS_CONFIG)) {
      if (lowerTitle.includes(pattern)) {
        coreManuals.push({
          manualId: manual.id,
          title: manual.title,
          audience: config.audience,
          isRequired: config.isRequired,
          category: manual.category || config.category,
        });
        break;
      }
    }
  }

  return coreManuals;
}

export async function generateAllCoreTrainings(): Promise<{
  results: Array<{ manual: string; result: DeepTrainingResult }>;
  summary: { total: number; successful: number; failed: number };
}> {
  const coreManuals = await identifyCoreManuals();
  const results: Array<{ manual: string; result: DeepTrainingResult }> = [];

  console.log(`\nGenerating deep training for ${coreManuals.length} core manuals...\n`);

  for (const config of coreManuals) {
    console.log(`Processing: ${config.title}`);
    const result = await generateDeepTraining(config.manualId, config.audience, config.isRequired);
    results.push({ manual: config.title, result });
    
    if (result.success) {
      console.log(`  ✓ Success: ${result.lessonsCount} lessons, ${result.knowledgeCheckCount} knowledge checks, ${result.intensiveAssessmentCount} intensive assessments\n`);
    } else {
      console.log(`  ✗ Failed: ${result.error}\n`);
    }
  }

  const successful = results.filter(r => r.result.success).length;
  
  return {
    results,
    summary: {
      total: coreManuals.length,
      successful,
      failed: coreManuals.length - successful,
    },
  };
}

export async function generateRemainingTrainings(): Promise<{
  results: Array<{ manual: string; result: DeepTrainingResult; enabledReason?: string }>;
  summary: { total: number; successful: number; failed: number; resourcesEnabled: string[] };
}> {
  const allManuals = await db.select().from(manuals);
  const coreManuals = await identifyCoreManuals();
  const coreManualIds = new Set(coreManuals.map(c => c.manualId));
  
  const remainingManuals = allManuals.filter(m => !coreManualIds.has(m.id));
  const results: Array<{ manual: string; result: DeepTrainingResult; enabledReason?: string }> = [];
  const resourcesEnabled: string[] = [];

  console.log(`\nGenerating training for ${remainingManuals.length} remaining manuals...\n`);

  for (const manual of remainingManuals) {
    const category = manual.category || 'resource';
    let shouldGenerateTraining = false;
    let audience: TrainingAudience = 'all';
    let isRequired = false;
    let enabledReason: string | undefined;

    if (category === 'ministry_manual') {
      shouldGenerateTraining = true;
      audience = 'ministry';
      isRequired = true;
    } else if (category === 'leadership_training') {
      shouldGenerateTraining = true;
      audience = 'leader';
      isRequired = true;
    } else if (category === 'resource') {
      const lowerTitle = manual.title.toLowerCase();
      if (
        lowerTitle.includes('policy') ||
        lowerTitle.includes('bylaws') ||
        lowerTitle.includes('employee') ||
        lowerTitle.includes('confidential') ||
        lowerTitle.includes('baptism') ||
        lowerTitle.includes('holy spirit')
      ) {
        shouldGenerateTraining = true;
        audience = lowerTitle.includes('employee') || lowerTitle.includes('policy') ? 'leader' : 'all';
        isRequired = false;
        enabledReason = `Resource "${manual.title}" enabled: Contains important onboarding/culture/policy content`;
        resourcesEnabled.push(manual.title);
      }
    }

    if (!shouldGenerateTraining) {
      console.log(`Skipping: ${manual.title} (resource with generateTraining=false)`);
      continue;
    }

    console.log(`Processing: ${manual.title} (${category})`);
    const result = await generateDeepTraining(manual.id, audience, isRequired);
    results.push({ manual: manual.title, result, enabledReason });

    if (result.success) {
      console.log(`  ✓ Success: ${result.lessonsCount} lessons\n`);
    } else {
      console.log(`  ✗ Failed: ${result.error}\n`);
    }
  }

  const successful = results.filter(r => r.result.success).length;

  return {
    results,
    summary: {
      total: remainingManuals.length,
      successful,
      failed: results.length - successful,
      resourcesEnabled,
    },
  };
}

// Core manual title patterns that must have 8+ lessons regardless of audience
const CORE_TITLE_PATTERNS = [
  'about us',
  'discipleship',
  'serve booklet',
  'serve orientation',
  'live the life',
  'following jesus',
  'language of a leader',
  'recruitment',
  'ministry leaders',
];

function isCoreTraining(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return CORE_TITLE_PATTERNS.some(pattern => lowerTitle.includes(pattern));
}

/**
 * Regenerate training modules that have fewer than 8 lessons.
 * Regenerates modules where:
 * - audience is 'all' or 'leader', OR
 * - title matches core manual patterns
 */
export async function regenerateInsufficientTrainings(): Promise<{
  before: Array<{ id: string; title: string; lessonCount: number }>;
  after: Array<{ id: string; title: string; lessonCount: number; success: boolean }>;
  summary: { total: number; fixed: number; stillBelow: number };
}> {
  // Get all training modules with < 8 lessons that need fixing
  const allModules = await db.select().from(trainingModules).where(eq(trainingModules.isPublished, true));
  
  const needsRegeneration = allModules.filter(m => {
    const lessonCount = Array.isArray(m.lessons) ? m.lessons.length : 0;
    if (lessonCount >= 8) return false;
    
    // Fix modules with < 8 lessons that are:
    // 1. audience 'all' or 'leader', OR
    // 2. Core trainings by title pattern
    return m.audience === 'all' || m.audience === 'leader' || isCoreTraining(m.title);
  });

  const before: Array<{ id: string; title: string; lessonCount: number }> = [];
  const after: Array<{ id: string; title: string; lessonCount: number; success: boolean }> = [];

  console.log(`\nRegenerating ${needsRegeneration.length} trainings with < 8 lessons...\n`);

  for (const module of needsRegeneration) {
    const currentLessons = Array.isArray(module.lessons) ? module.lessons.length : 0;
    before.push({ id: module.id, title: module.title, lessonCount: currentLessons });

    if (!module.manualId) {
      console.log(`  Skipping ${module.title}: No manual linked`);
      after.push({ id: module.id, title: module.title, lessonCount: currentLessons, success: false });
      continue;
    }

    const [manual] = await db.select().from(manuals).where(eq(manuals.id, module.manualId));
    if (!manual) {
      console.log(`  Skipping ${module.title}: Manual not found`);
      after.push({ id: module.id, title: module.title, lessonCount: currentLessons, success: false });
      continue;
    }

    console.log(`  Regenerating: ${module.title} (currently ${currentLessons} lessons)`);

    let extractedText = '';
    try {
      extractedText = await extractTextFromPdf(manual.fileUrl || '');
    } catch (err) {
      console.error(`    Failed to extract PDF for ${module.title}`);
      after.push({ id: module.id, title: module.title, lessonCount: currentLessons, success: false });
      continue;
    }

    // Try up to 3 times with progressively stronger enforcement
    let lessons: DeepLesson[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      console.log(`    Attempt ${attempt + 1}...`);
      lessons = await generateDeepLessons(extractedText, manual.title, attempt);
      
      if (lessons.length >= 8) {
        console.log(`    Success: ${lessons.length} lessons generated`);
        break;
      }
      console.log(`    Got ${lessons.length} lessons, retrying...`);
    }

    if (lessons.length >= 8) {
      // Update the training module with new lessons
      await db.update(trainingModules)
        .set({
          lessons: lessons,
          description: `Deep training module based on the ${manual.title} manual. This comprehensive training includes ${lessons.length} lessons, knowledge checks, and scenario-based assessments.`,
          estimatedMinutes: lessons.length * 10 + 20,
          updatedAt: new Date(),
        })
        .where(eq(trainingModules.id, module.id));

      after.push({ id: module.id, title: module.title, lessonCount: lessons.length, success: true });
    } else {
      after.push({ id: module.id, title: module.title, lessonCount: lessons.length, success: false });
    }
  }

  const fixed = after.filter(a => a.success && a.lessonCount >= 8).length;
  const stillBelow = after.filter(a => a.lessonCount < 8).length;

  return {
    before,
    after,
    summary: {
      total: needsRegeneration.length,
      fixed,
      stillBelow,
    },
  };
}
