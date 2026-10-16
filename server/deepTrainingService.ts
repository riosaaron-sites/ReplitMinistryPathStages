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

// Assessment generation constants
const MIN_QUESTIONS = 10;
const MAX_QUESTIONS = 12;
const MAX_RETRIES = 3;

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
        content: `You are a Christian ministry training content creator for a local church. Create a comprehensive training series with EXACTLY 8-12 lessons based on the provided manual content.

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

export async function generateKnowledgeCheckQuestions(text: string, manualTitle: string, retryAttempt: number = 0): Promise<KnowledgeCheckQuestion[]> {
  const truncatedText = text.substring(0, 20000);
  
  const retryEnforcement = retryAttempt > 0 ? `

STRICT ENFORCEMENT (Attempt ${retryAttempt + 1}): Previous generation produced fewer than ${MIN_QUESTIONS} questions. You MUST generate EXACTLY 10-12 questions. Expand coverage by:
- Testing different aspects of the same concept
- Adding questions about practical applications
- Including team dynamics and communication scenarios
- Testing understanding of procedures and protocols` : '';
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a Christian ministry training content creator for a local church. Generate EXACTLY 10-12 assessment questions for a ministry training module.

CRITICAL REQUIREMENT: You MUST create between 10 and 12 questions total. This is a hard requirement.${retryEnforcement}

REQUIRED question type distribution:
1. Multiple-choice (4-5 questions): Standard comprehension with 4 options each, 1 correct answer, and 3 plausible distractors
2. Scenario-based (3-4 questions): Present a realistic ministry situation and ask "What is the best response?" - these test practical judgment
3. Reflection/Short-answer (2-3 questions): Open-ended questions requiring written responses (specify minWords: 10)

Guidelines:
- Questions must align tightly to the training content - NO generic filler
- Multiple-choice distractors should be plausible, not obviously wrong
- Scenario-based questions should reflect real church/ministry situations
- Reflection questions should prompt thoughtful personal application
- Progress from foundational concepts to practical application
- Include detailed explanations for each answer
- Make questions clear and unambiguous

Return a JSON object with this structure:
{
  "questions": [
    {
      "id": "q-1",
      "questionType": "multiple-choice",
      "question": "What is the primary purpose of...?",
      "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
      "correctAnswer": "A",
      "explanation": "This is correct because..."
    },
    {
      "id": "q-2",
      "questionType": "scenario",
      "scenario": "A parent approaches you after service concerned about...",
      "question": "What is the best response in this situation?",
      "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
      "correctAnswer": "B",
      "explanation": "This approach is best because..."
    },
    {
      "id": "q-3",
      "questionType": "reflection",
      "question": "Describe how you would apply this principle in your ministry role...",
      "minWords": 10,
      "sampleAnswer": "A thoughtful response would include...",
      "explanation": "Key elements to look for in a good answer..."
    }
  ]
}`
      },
      {
        role: 'user',
        content: `Create EXACTLY 10-12 assessment questions (4-5 multiple-choice, 3-4 scenario-based, 2-3 reflection) for the "${manualTitle}" training. Questions must be specific to this content:\n\n${truncatedText}`
      }
    ],
    temperature: 0.7,
    max_tokens: 6000,
    response_format: { type: 'json_object' }
  });

  try {
    const content = response.choices[0]?.message?.content || '{"questions": []}';
    const parsed = JSON.parse(content);
    let questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    
    // Count question types BEFORE any processing
    let multipleChoice = questions.filter((q: any) => q.questionType === 'multiple-choice');
    let scenario = questions.filter((q: any) => q.questionType === 'scenario');
    let reflection = questions.filter((q: any) => q.questionType === 'reflection' || q.questionType === 'short-answer');
    
    // Check if we have minimum types and can construct a valid 10-12 set
    const totalCount = questions.length;
    const hasMinimumTypes = multipleChoice.length >= 4 && scenario.length >= 3 && reflection.length >= 2;
    const potentialExtras = Math.min(1, multipleChoice.length - 4) + 
                           Math.min(1, scenario.length - 3) + 
                           Math.min(1, reflection.length - 2);
    const canReach10 = hasMinimumTypes && (9 + potentialExtras >= MIN_QUESTIONS);
    const typeMixValid = multipleChoice.length >= 4 && multipleChoice.length <= 5 &&
                         scenario.length >= 3 && scenario.length <= 4 &&
                         reflection.length >= 2 && reflection.length <= 3;
    
    // Retry if we can't construct a valid set
    const needsRetry = !canReach10 || !typeMixValid;
    
    if (needsRetry && retryAttempt < MAX_RETRIES) {
      console.log(`[AI Assessment] Cannot construct valid set (total:${totalCount}, MC:${multipleChoice.length}, SC:${scenario.length}, RF:${reflection.length}, canReach10:${canReach10}), retrying (attempt ${retryAttempt + 1}/${MAX_RETRIES})...`);
      return generateKnowledgeCheckQuestions(text, manualTitle, retryAttempt + 1);
    }
    
    // After all retries, check if we can proceed
    if (!canReach10) {
      console.error(`[AI Assessment] FAILED: Cannot construct valid set for "${manualTitle}" after ${MAX_RETRIES} retries (MC:${multipleChoice.length}, SC:${scenario.length}, RF:${reflection.length}). Need at least 10 questions with 4-5/3-4/2-3 distribution.`);
      return []; // Return empty rather than invalid data
    }
    
    // Deterministic normalization: always construct a compliant set of exactly 10-12 questions
    console.log(`[AI Assessment] Normalizing distribution for "${manualTitle}" (total:${totalCount}, MC:${multipleChoice.length}, SC:${scenario.length}, RF:${reflection.length})`);
    
    // Build exactly compliant set
    const balancedQuestions: any[] = [];
    
    // Take exactly 4 MC (required minimum)
    balancedQuestions.push(...multipleChoice.slice(0, 4));
    
    // Take exactly 3 scenario (required minimum)
    balancedQuestions.push(...scenario.slice(0, 3));
    
    // Take exactly 2 reflection (required minimum)
    balancedQuestions.push(...reflection.slice(0, 2));
    // Now we have 4+3+2=9 questions
    
    // Add extras (up to 1 each) to reach 10-12, prioritizing types with more available
    const extras = [
      { type: 'mc', q: multipleChoice[4] },
      { type: 'scenario', q: scenario[3] },
      { type: 'reflection', q: reflection[2] }
    ].filter(e => e.q !== undefined);
    
    // Add extras until we reach at least 10 (and max 12)
    for (const extra of extras) {
      if (balancedQuestions.length >= MAX_QUESTIONS) break;
      balancedQuestions.push(extra.q);
    }
    
    questions = balancedQuestions;
    
    // Recalculate counts after normalization
    multipleChoice = questions.filter((q: any) => q.questionType === 'multiple-choice');
    scenario = questions.filter((q: any) => q.questionType === 'scenario');
    reflection = questions.filter((q: any) => q.questionType === 'reflection' || q.questionType === 'short-answer');
    
    // Final validation - should always pass after normalization
    const finalTypeMixValid = multipleChoice.length >= 4 && multipleChoice.length <= 5 && 
                               scenario.length >= 3 && scenario.length <= 4 && 
                               reflection.length >= 2 && reflection.length <= 3;
    
    if (!finalTypeMixValid || questions.length < MIN_QUESTIONS || questions.length > MAX_QUESTIONS) {
      console.error(`[AI Assessment] FAILED: Post-normalization validation failed for "${manualTitle}" (total:${questions.length}, MC:${multipleChoice.length}, SC:${scenario.length}, RF:${reflection.length})`);
      return []; // Return empty rather than invalid data
    }
    
    console.log(`[AI Assessment] Final: ${questions.length} questions for "${manualTitle}" (MC:${multipleChoice.length}, SC:${scenario.length}, RF:${reflection.length})`);
    return questions;
  } catch (error) {
    console.error('Error parsing knowledge check questions:', error);
    return [];
  }
}

export async function generateIntensiveAssessment(text: string, manualTitle: string, retryAttempt: number = 0): Promise<IntensiveAssessmentQuestion[]> {
  const truncatedText = text.substring(0, 20000);
  
  const retryEnforcement = retryAttempt > 0 ? `

STRICT ENFORCEMENT (Attempt ${retryAttempt + 1}): Previous generation produced fewer than ${MIN_QUESTIONS} questions. You MUST generate EXACTLY 10-12 questions. Expand by:
- Adding more scenario variations
- Testing different aspects of the content
- Including interpersonal and team-related scenarios
- Adding ethical considerations and judgment calls` : '';
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a Christian ministry training content creator for a local church. Generate EXACTLY 10-12 intensive assessment questions that test deeper understanding and practical application.

CRITICAL REQUIREMENT: You MUST create between 10 and 12 questions total. This is a hard requirement.${retryEnforcement}

REQUIRED question type distribution:
1. Multiple-choice (4-5 questions): Standard comprehension with 4 options, 1 correct, 3 plausible distractors
2. Scenario-based (3-4 questions): Present a realistic ministry situation and ask "What is the best response?" - test practical judgment
3. Reflection/Short-answer (2-3 questions): Open-ended questions requiring written responses (specify minWords: 10)

Guidelines:
- Questions must align tightly to the training content - NO generic filler
- Scenarios should reflect real church/ministry situations specific to this content
- Include ethical dilemmas and interpersonal challenges
- Test both knowledge AND wisdom/judgment
- Weight complex scenario questions higher (2-3 points)
- Include detailed explanations for each answer
- Reflection questions should prompt deep personal application

Return a JSON object with this structure:
{
  "questions": [
    {
      "id": "ia-1",
      "questionType": "multiple-choice",
      "question": "According to the training, what is the most important...?",
      "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
      "correctAnswer": "A",
      "explanation": "This is correct because...",
      "weight": 1
    },
    {
      "id": "ia-2",
      "questionType": "scenario",
      "scenario": "You arrive at church on Sunday morning and discover that the scheduled volunteer hasn't shown up. The service starts in 30 minutes...",
      "question": "What is the best course of action in this situation?",
      "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
      "correctAnswer": "B",
      "explanation": "This approach is best because...",
      "weight": 3
    },
    {
      "id": "ia-3",
      "questionType": "reflection",
      "question": "How would you apply the principles from this training when facing a challenging situation with a team member?",
      "minWords": 10,
      "sampleAnswer": "A thoughtful response would address...",
      "explanation": "Key elements to look for...",
      "weight": 2
    }
  ]
}`
      },
      {
        role: 'user',
        content: `Create EXACTLY 10-12 intensive assessment questions (4-5 multiple-choice, 3-4 scenario-based, 2-3 reflection) for the "${manualTitle}" training. Questions must be specific to this content:\n\n${truncatedText}`
      }
    ],
    temperature: 0.7,
    max_tokens: 6000,
    response_format: { type: 'json_object' }
  });

  try {
    const content = response.choices[0]?.message?.content || '{"questions": []}';
    const parsed = JSON.parse(content);
    let questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    
    // Count question types BEFORE any processing
    let multipleChoice = questions.filter((q: any) => q.questionType === 'multiple-choice');
    let scenario = questions.filter((q: any) => q.questionType === 'scenario');
    let reflection = questions.filter((q: any) => q.questionType === 'reflection' || q.questionType === 'short-answer');
    
    // Check if we have minimum types and can construct a valid 10-12 set
    const totalCount = questions.length;
    const hasMinimumTypes = multipleChoice.length >= 4 && scenario.length >= 3 && reflection.length >= 2;
    const potentialExtras = Math.min(1, multipleChoice.length - 4) + 
                           Math.min(1, scenario.length - 3) + 
                           Math.min(1, reflection.length - 2);
    const canReach10 = hasMinimumTypes && (9 + potentialExtras >= MIN_QUESTIONS);
    const typeMixValid = multipleChoice.length >= 4 && multipleChoice.length <= 5 &&
                         scenario.length >= 3 && scenario.length <= 4 &&
                         reflection.length >= 2 && reflection.length <= 3;
    
    // Retry if we can't construct a valid set
    const needsRetry = !canReach10 || !typeMixValid;
    
    if (needsRetry && retryAttempt < MAX_RETRIES) {
      console.log(`[AI Intensive] Cannot construct valid set (total:${totalCount}, MC:${multipleChoice.length}, SC:${scenario.length}, RF:${reflection.length}, canReach10:${canReach10}), retrying (attempt ${retryAttempt + 1}/${MAX_RETRIES})...`);
      return generateIntensiveAssessment(text, manualTitle, retryAttempt + 1);
    }
    
    // After all retries, check if we can proceed
    if (!canReach10) {
      console.error(`[AI Intensive] FAILED: Cannot construct valid set for "${manualTitle}" after ${MAX_RETRIES} retries (MC:${multipleChoice.length}, SC:${scenario.length}, RF:${reflection.length}). Need at least 10 questions with 4-5/3-4/2-3 distribution.`);
      return []; // Return empty rather than invalid data
    }
    
    // Deterministic normalization: always construct a compliant set of exactly 10-12 questions
    console.log(`[AI Intensive] Normalizing distribution for "${manualTitle}" (total:${totalCount}, MC:${multipleChoice.length}, SC:${scenario.length}, RF:${reflection.length})`);
    
    // Build exactly compliant set
    const balancedQuestions: any[] = [];
    
    // Take exactly 4 MC (required minimum)
    balancedQuestions.push(...multipleChoice.slice(0, 4));
    
    // Take exactly 3 scenario (required minimum)
    balancedQuestions.push(...scenario.slice(0, 3));
    
    // Take exactly 2 reflection (required minimum)
    balancedQuestions.push(...reflection.slice(0, 2));
    // Now we have 4+3+2=9 questions
    
    // Add extras (up to 1 each) to reach 10-12, prioritizing types with more available
    const extras = [
      { type: 'mc', q: multipleChoice[4] },
      { type: 'scenario', q: scenario[3] },
      { type: 'reflection', q: reflection[2] }
    ].filter(e => e.q !== undefined);
    
    // Add extras until we reach at least 10 (and max 12)
    for (const extra of extras) {
      if (balancedQuestions.length >= MAX_QUESTIONS) break;
      balancedQuestions.push(extra.q);
    }
    
    questions = balancedQuestions;
    
    // Recalculate counts after normalization
    multipleChoice = questions.filter((q: any) => q.questionType === 'multiple-choice');
    scenario = questions.filter((q: any) => q.questionType === 'scenario');
    reflection = questions.filter((q: any) => q.questionType === 'reflection' || q.questionType === 'short-answer');
    
    // Final validation - should always pass after normalization
    const finalTypeMixValid = multipleChoice.length >= 4 && multipleChoice.length <= 5 && 
                               scenario.length >= 3 && scenario.length <= 4 && 
                               reflection.length >= 2 && reflection.length <= 3;
    
    if (!finalTypeMixValid || questions.length < MIN_QUESTIONS || questions.length > MAX_QUESTIONS) {
      console.error(`[AI Intensive] FAILED: Post-normalization validation failed for "${manualTitle}" (total:${questions.length}, MC:${multipleChoice.length}, SC:${scenario.length}, RF:${reflection.length})`);
      return []; // Return empty rather than invalid data
    }
    
    console.log(`[AI Intensive] Final: ${questions.length} questions for "${manualTitle}" (MC:${multipleChoice.length}, SC:${scenario.length}, RF:${reflection.length})`);
    return questions;
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
        .values({ organizationId: manual.organizationId, manualId, status: 'processing' })
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
    
    // Validate assessment generation - fail if we couldn't generate valid assessments
    if (knowledgeCheckQuestions.length < MIN_QUESTIONS) {
      await db.update(manualAnalysis)
        .set({ status: 'failed', errorMessage: `Failed to generate valid knowledge check questions (got ${knowledgeCheckQuestions.length}, need ${MIN_QUESTIONS})` })
        .where(eq(manualAnalysis.id, analysisRecord.id));
      return { success: false, error: `Failed to generate valid knowledge check questions after retries` };
    }
    
    if (intensiveAssessmentQuestions.length < MIN_QUESTIONS) {
      await db.update(manualAnalysis)
        .set({ status: 'failed', errorMessage: `Failed to generate valid intensive assessment (got ${intensiveAssessmentQuestions.length}, need ${MIN_QUESTIONS})` })
        .where(eq(manualAnalysis.id, analysisRecord.id));
      return { success: false, error: `Failed to generate valid intensive assessment after retries` };
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
          organizationId: manual.organizationId,
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
