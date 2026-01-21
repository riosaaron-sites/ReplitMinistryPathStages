import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';
import { db } from './db';
import { manualAnalysis, trainingModules, trainingAssessments, notifications, manuals, roleAssignments, users, ministries } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import type { StudyQuestion, AssessmentQuestion, Manual } from '@shared/schema';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

/**
 * Normalize a file path/URL to a filesystem path.
 * Handles:
 * - Full URLs (strips protocol + domain)
 * - Query strings and fragments
 * - URL-encoded characters
 * - Path separators
 * - /assets/* and /attached_assets/* mapping
 * - uploads/manuals/* paths
 */
function normalizePdfPath(inputPath: string): string {
  let normalizedPath = inputPath;
  
  // 1. Strip protocol and domain from full URLs (e.g., https://example.com/assets/file.pdf)
  try {
    const url = new URL(normalizedPath, 'http://placeholder');
    // If it parses as a full URL with a real host, extract just the pathname
    if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
      normalizedPath = url.pathname;
    }
  } catch {
    // Not a valid URL, continue with original path
  }
  
  // 2. Strip query strings and fragments
  const queryIndex = normalizedPath.indexOf('?');
  if (queryIndex !== -1) {
    normalizedPath = normalizedPath.slice(0, queryIndex);
  }
  const hashIndex = normalizedPath.indexOf('#');
  if (hashIndex !== -1) {
    normalizedPath = normalizedPath.slice(0, hashIndex);
  }
  
  // 3. Decode URL-encoded characters (e.g., %20 -> space)
  try {
    normalizedPath = decodeURIComponent(normalizedPath);
  } catch {
    // If decoding fails, continue with original
  }
  
  // 4. Normalize path separators (Windows backslashes to forward slashes)
  normalizedPath = normalizedPath.replace(/\\/g, '/');
  
  // 5. Strip leading slash
  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.slice(1);
  }
  
  // 6. Map URL paths to filesystem paths
  // /assets/<file> -> attached_assets/<file>
  if (normalizedPath.startsWith('assets/')) {
    normalizedPath = 'attached_assets/' + normalizedPath.slice(7);
  }
  // /attached_assets/<file> is already correct filesystem path
  // uploads/manuals/<file> is already correct filesystem path
  
  return normalizedPath;
}

export async function extractTextFromPdf(filePath: string): Promise<string> {
  const originalInput = filePath;
  
  try {
    // Normalize the path using robust handling
    const normalizedPath = normalizePdfPath(filePath);
    const fullPath = path.join(process.cwd(), normalizedPath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.error('[PDF Extract] File not found:');
      console.error('  Original input:', originalInput);
      console.error('  Normalized path:', normalizedPath);
      console.error('  Resolved filesystem path:', fullPath);
      throw new Error(`PDF file not found: ${fullPath}`);
    }
    
    const dataBuffer = fs.readFileSync(fullPath);
    const parser = new PDFParse({ data: dataBuffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  } catch (error) {
    console.error('[PDF Extract] Error extracting PDF text:', error);
    console.error('  Original input:', originalInput);
    throw error;
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

function extractKeyTopics(text: string, summary: string): string[] {
  // Extract key topics from common patterns in ministry manuals
  const topics: string[] = [];
  const combined = (text + ' ' + summary).toLowerCase();
  
  // Look for section headers and key terms
  const headerMatches = combined.match(/(?:chapter|section|topic|lesson|part)\s*[\d.:]*\s*([a-z][a-z\s]{5,50})/gi) || [];
  for (const match of headerMatches.slice(0, 5)) {
    const cleaned = match.replace(/(?:chapter|section|topic|lesson|part)\s*[\d.:]*\s*/i, '').trim();
    if (cleaned.length > 3 && !topics.includes(cleaned)) {
      topics.push(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
    }
  }
  
  // Common ministry themes to look for
  const themes = ['worship', 'service', 'leadership', 'discipleship', 'prayer', 'community', 
    'faith', 'teaching', 'evangelism', 'hospitality', 'children', 'youth', 'missions',
    'stewardship', 'media', 'technical', 'safety', 'procedures', 'volunteers'];
  
  for (const theme of themes) {
    if (combined.includes(theme) && !topics.some(t => t.toLowerCase().includes(theme))) {
      topics.push(theme.charAt(0).toUpperCase() + theme.slice(1));
    }
    if (topics.length >= 8) break;
  }
  
  return topics.slice(0, 8);
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

export async function generateLessonSummary(text: string, manualTitle: string): Promise<string> {
  const truncatedText = text.substring(0, 15000);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a Christian ministry training content creator. Create a comprehensive lesson summary from the provided manual content. The summary should:
- Be 500-800 words
- Include key biblical principles and teachings
- Highlight practical applications for ministry service
- Use clear, accessible language suitable for church volunteers
- Include relevant scripture references where applicable
- Be formatted with clear sections using headers`
      },
      {
        role: 'user',
        content: `Create a lesson summary for the "${manualTitle}" ministry manual:\n\n${truncatedText}`
      }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || '';
}

export async function generateStudyQuestions(text: string, manualTitle: string): Promise<StudyQuestion[]> {
  const truncatedText = text.substring(0, 15000);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a Christian ministry training content creator. Generate 10-15 key study questions based on the manual content. Each question should:
- Help learners understand and apply the material
- Include the answer
- Include a scripture reference when relevant
- Progress from foundational to application-focused

Return your response as a JSON array with this structure:
[{"id": "1", "question": "...", "answer": "...", "scriptureReference": "..." }]`
      },
      {
        role: 'user',
        content: `Generate study questions for the "${manualTitle}" ministry manual:\n\n${truncatedText}`
      }
    ],
    temperature: 0.7,
    max_tokens: 3000,
    response_format: { type: 'json_object' }
  });

  try {
    const content = response.choices[0]?.message?.content || '{"questions": []}';
    const parsed = JSON.parse(content);
    const questions = parsed.questions || parsed;
    return Array.isArray(questions) ? questions : [];
  } catch (error) {
    console.error('Error parsing study questions:', error);
    return [];
  }
}

export async function generateAssessmentQuestions(text: string, manualTitle: string): Promise<AssessmentQuestion[]> {
  const truncatedText = text.substring(0, 15000);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a Christian ministry training content creator. Generate 10-15 multiple-choice assessment questions to test understanding of the manual content. Each question should:
- Test comprehension of key concepts
- Have 4 answer options (A, B, C, D)
- Have a clear correct answer
- Include a brief explanation for the correct answer
- Cover different aspects of the training material

Return your response as a JSON array with this structure:
[{"id": "1", "question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correctAnswer": "A", "explanation": "..." }]`
      },
      {
        role: 'user',
        content: `Generate assessment questions for the "${manualTitle}" ministry manual:\n\n${truncatedText}`
      }
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: 'json_object' }
  });

  try {
    const content = response.choices[0]?.message?.content || '{"questions": []}';
    const parsed = JSON.parse(content);
    const questions = parsed.questions || parsed;
    return Array.isArray(questions) ? questions : [];
  } catch (error) {
    console.error('Error parsing assessment questions:', error);
    return [];
  }
}

export async function analyzeManual(manualId: string): Promise<{ success: boolean; error?: string; trainingModuleId?: string }> {
  try {
    const [manual] = await db.select().from(manuals).where(eq(manuals.id, manualId));
    if (!manual) {
      return { success: false, error: 'Manual not found' };
    }

    const existingAnalysis = await db.select().from(manualAnalysis).where(eq(manualAnalysis.manualId, manualId));
    let analysisRecord: typeof manualAnalysis.$inferSelect;

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

    const [lessonSummary, studyQuestions, assessmentQuestions] = await Promise.all([
      generateLessonSummary(extractedText, manual.title),
      generateStudyQuestions(extractedText, manual.title),
      generateAssessmentQuestions(extractedText, manual.title),
    ]);

    // Extract key topics from the content
    const keyTopics = extractKeyTopics(extractedText, lessonSummary);
    
    await db.update(manualAnalysis)
      .set({
        status: 'completed',
        extractedText: extractedText.substring(0, 50000),
        summary: lessonSummary,
        keyTopics,
        studyQuestions,
        assessmentQuestions,
        aiModel: 'gpt-4o-mini',
        generatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(manualAnalysis.id, analysisRecord.id));

    const baseSlug = generateSlug(manual.title + '-training');
    const slug = await generateUniqueSlug(baseSlug);

    const existingModule = await db.select().from(trainingModules).where(eq(trainingModules.manualId, manualId));
    let trainingModule: typeof trainingModules.$inferSelect;

    if (existingModule.length > 0) {
      [trainingModule] = await db.update(trainingModules)
        .set({
          description: `Training module based on the ${manual.title} manual`,
          lessonSummary,
          studyQuestions,
          isAutoGenerated: true,
          updatedAt: new Date(),
        })
        .where(eq(trainingModules.id, existingModule[0].id))
        .returning();
    } else {
      [trainingModule] = await db.insert(trainingModules)
        .values({
          title: `${manual.title} Training`,
          slug,
          ministryId: manual.ministryId,
          manualId: manual.id,
          description: `Training module based on the ${manual.title} manual`,
          lessonSummary,
          studyQuestions,
          estimatedMinutes: 45,
          passingScore: 80,
          xpReward: 150,
          isRequired: manual.isRequired || false,
          isActive: true,
          isAutoGenerated: true,
        })
        .returning();
    }

    await db.delete(trainingAssessments).where(eq(trainingAssessments.moduleId, trainingModule.id));

    for (let i = 0; i < assessmentQuestions.length; i++) {
      const q = assessmentQuestions[i];
      await db.insert(trainingAssessments).values({
        moduleId: trainingModule.id,
        questionText: q.question,
        questionType: 'multiple-choice',
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        sortOrder: i,
      });
    }

    if (manual.ministryId) {
      await notifyMinistryMembers(manual, trainingModule.id);
    }

    return { success: true, trainingModuleId: trainingModule.id };
  } catch (error) {
    console.error('Error analyzing manual:', error);
    
    await db.update(manualAnalysis)
      .set({ status: 'failed', errorMessage: String(error) })
      .where(eq(manualAnalysis.manualId, manualId));
    
    return { success: false, error: String(error) };
  }
}

async function notifyMinistryMembers(manual: Manual, trainingModuleId: string) {
  try {
    const assignments = await db.select()
      .from(roleAssignments)
      .where(and(
        eq(roleAssignments.ministryId, manual.ministryId!),
        eq(roleAssignments.isActive, true)
      ));

    const leaderAssignments = await db.select({
      assignment: roleAssignments,
      user: users,
    })
      .from(roleAssignments)
      .innerJoin(users, eq(users.id, roleAssignments.userId))
      .where(and(
        eq(roleAssignments.ministryId, manual.ministryId!),
        eq(roleAssignments.isActive, true)
      ));

    const [ministry] = await db.select().from(ministries).where(eq(ministries.id, manual.ministryId!));

    for (const item of leaderAssignments) {
      const isLeader = item.user.role === 'leader' || 
                       item.user.role === 'pastor' || 
                       item.user.role === 'admin';

      await db.insert(notifications).values({
        userId: item.user.id,
        type: isLeader ? 'manual-uploaded' : 'new-training-required',
        title: isLeader 
          ? `New Training Generated: ${manual.title}`
          : `New Required Training: ${manual.title}`,
        message: isLeader
          ? `A new training module has been auto-generated from the "${manual.title}" manual for ${ministry?.name || 'your ministry'}.`
          : `A new training "${manual.title}" has been added to your ${ministry?.name || ''} ministry requirements. Please complete it at your earliest convenience.`,
        data: { manualId: manual.id, trainingModuleId, ministryId: manual.ministryId },
        link: `/trainings/${trainingModuleId}`,
      });
    }
  } catch (error) {
    console.error('Error notifying ministry members:', error);
  }
}

export async function getManualAnalysis(manualId: string) {
  const [analysis] = await db.select().from(manualAnalysis).where(eq(manualAnalysis.manualId, manualId));
  return analysis;
}

export async function getTrainingFromManual(manualId: string) {
  const [training] = await db.select().from(trainingModules).where(eq(trainingModules.manualId, manualId));
  return training;
}

export interface ForceRegenResult {
  trainingId: string;
  title: string;
  manualId: string | null;
  status: 'UPDATED' | 'FAILED' | 'SKIPPED';
  reason?: string;
  stack?: string;
  durationMs: number;
  lessonCount?: number;
  studyQuestionCount?: number;
  assessmentQuestionCount?: number;
}

export interface ForceRegenReport {
  totalTrainingsScanned: number;
  totalWithManual: number;
  regeneratedCount: number;
  skippedCount: number;
  failedCount: number;
  failures: { trainingId: string; title: string; reason: string; stack?: string }[];
  results: ForceRegenResult[];
  totalDurationMs: number;
  timestamp: string;
}

/**
 * Force regenerate content for a single training module.
 * Bypasses all "already processed" checks and overwrites all content.
 */
export async function forceRegenerateTraining(trainingId: string): Promise<ForceRegenResult> {
  const startTime = Date.now();
  
  try {
    // Get the training module
    const [training] = await db.select().from(trainingModules).where(eq(trainingModules.id, trainingId));
    if (!training) {
      return {
        trainingId,
        title: 'Unknown',
        manualId: null,
        status: 'FAILED',
        reason: 'Training module not found',
        durationMs: Date.now() - startTime,
      };
    }

    console.log(`[FORCE REGEN] STARTED: ${training.title} (${trainingId})`);

    if (!training.manualId) {
      console.log(`[FORCE REGEN] SKIPPED: ${training.title} - No manual linked`);
      return {
        trainingId,
        title: training.title,
        manualId: null,
        status: 'SKIPPED',
        reason: 'No manual linked',
        durationMs: Date.now() - startTime,
      };
    }

    // Get the linked manual
    const [manual] = await db.select().from(manuals).where(eq(manuals.id, training.manualId));
    if (!manual) {
      console.log(`[FORCE REGEN] FAILED: ${training.title} - Linked manual not found`);
      return {
        trainingId,
        title: training.title,
        manualId: training.manualId,
        status: 'FAILED',
        reason: 'Linked manual not found in database',
        durationMs: Date.now() - startTime,
      };
    }

    if (!manual.fileUrl) {
      console.log(`[FORCE REGEN] FAILED: ${training.title} - Manual has no PDF file`);
      return {
        trainingId,
        title: training.title,
        manualId: training.manualId,
        status: 'FAILED',
        reason: 'Manual has no PDF file URL',
        durationMs: Date.now() - startTime,
      };
    }

    // Force extract text from PDF
    let extractedText = '';
    try {
      console.log(`[FORCE REGEN] Extracting PDF: ${manual.fileUrl}`);
      extractedText = await extractTextFromPdf(manual.fileUrl);
    } catch (err: any) {
      console.error(`[FORCE REGEN] FAILED: ${training.title} - PDF extraction error:`, err);
      return {
        trainingId,
        title: training.title,
        manualId: training.manualId,
        status: 'FAILED',
        reason: `PDF extraction failed: ${err.message}`,
        stack: err.stack,
        durationMs: Date.now() - startTime,
      };
    }

    if (!extractedText || extractedText.length < 100) {
      console.log(`[FORCE REGEN] FAILED: ${training.title} - Insufficient PDF content (${extractedText.length} chars)`);
      return {
        trainingId,
        title: training.title,
        manualId: training.manualId,
        status: 'FAILED',
        reason: `Insufficient PDF content (${extractedText.length} characters)`,
        durationMs: Date.now() - startTime,
      };
    }

    console.log(`[FORCE REGEN] Generating AI content for: ${training.title} (${extractedText.length} chars extracted)`);

    // Force regenerate all content
    const [lessonSummary, studyQuestions, assessmentQuestions] = await Promise.all([
      generateLessonSummary(extractedText, manual.title),
      generateStudyQuestions(extractedText, manual.title),
      generateAssessmentQuestions(extractedText, manual.title),
    ]);

    const keyTopics = extractKeyTopics(extractedText, lessonSummary);

    // Update training module with new content
    await db.update(trainingModules)
      .set({
        lessonSummary,
        studyQuestions,
        knowledgeCheckQuestions: assessmentQuestions,
        isAutoGenerated: true,
        isDeepTraining: true,
        estimatedMinutes: Math.max(30, Math.min(90, Math.floor(extractedText.length / 500))),
        updatedAt: new Date(),
      })
      .where(eq(trainingModules.id, trainingId));

    // Update or create manual analysis record
    const existingAnalysis = await db.select().from(manualAnalysis).where(eq(manualAnalysis.manualId, training.manualId));
    if (existingAnalysis.length > 0) {
      await db.update(manualAnalysis)
        .set({
          status: 'completed',
          extractedText: extractedText.substring(0, 50000),
          summary: lessonSummary,
          keyTopics,
          studyQuestions,
          assessmentQuestions,
          aiModel: 'gpt-4o-mini',
          generatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(manualAnalysis.manualId, training.manualId));
    } else {
      await db.insert(manualAnalysis)
        .values({
          manualId: training.manualId,
          status: 'completed',
          extractedText: extractedText.substring(0, 50000),
          summary: lessonSummary,
          keyTopics,
          studyQuestions,
          assessmentQuestions,
          aiModel: 'gpt-4o-mini',
          generatedAt: new Date(),
        });
    }

    // Delete and recreate assessment questions
    await db.delete(trainingAssessments).where(eq(trainingAssessments.moduleId, trainingId));
    
    for (let i = 0; i < assessmentQuestions.length; i++) {
      const q = assessmentQuestions[i];
      await db.insert(trainingAssessments).values({
        moduleId: trainingId,
        questionText: q.question,
        questionType: 'multiple-choice',
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        sortOrder: i,
      });
    }

    const durationMs = Date.now() - startTime;
    console.log(`[FORCE REGEN] UPDATED: ${training.title} - ${lessonSummary.length} chars lesson, ${studyQuestions.length} study Qs, ${assessmentQuestions.length} quiz Qs (${durationMs}ms)`);

    return {
      trainingId,
      title: training.title,
      manualId: training.manualId,
      status: 'UPDATED',
      durationMs,
      lessonCount: lessonSummary ? 1 : 0,
      studyQuestionCount: studyQuestions.length,
      assessmentQuestionCount: assessmentQuestions.length,
    };
  } catch (err: any) {
    console.error(`[FORCE REGEN] FAILED: ${trainingId}`, err);
    return {
      trainingId,
      title: 'Error',
      manualId: null,
      status: 'FAILED',
      reason: err.message,
      stack: err.stack,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Force regenerate ALL training content from linked manuals.
 * Bypasses all "already processed" checks.
 * Returns detailed report with timing and status for each training.
 */
export async function forceRegenerateAllTrainings(): Promise<ForceRegenReport> {
  const startTime = Date.now();
  console.log('[FORCE REGEN] ========== STARTING FORCE REGENERATION ==========');
  
  // Get all training modules
  const allTrainings = await db.select().from(trainingModules);
  const trainingsWithManual = allTrainings.filter(t => t.manualId);
  
  console.log(`[FORCE REGEN] Total trainings: ${allTrainings.length}, with manual: ${trainingsWithManual.length}`);
  
  const results: ForceRegenResult[] = [];
  const failures: { trainingId: string; title: string; reason: string; stack?: string }[] = [];
  
  // Process each training sequentially to avoid rate limits
  for (const training of trainingsWithManual) {
    const result = await forceRegenerateTraining(training.id);
    results.push(result);
    
    if (result.status === 'FAILED') {
      failures.push({
        trainingId: result.trainingId,
        title: result.title,
        reason: result.reason || 'Unknown error',
        stack: result.stack,
      });
    }
    
    // Small delay between trainings to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const regeneratedCount = results.filter(r => r.status === 'UPDATED').length;
  const skippedCount = results.filter(r => r.status === 'SKIPPED').length;
  const failedCount = results.filter(r => r.status === 'FAILED').length;
  
  const report: ForceRegenReport = {
    totalTrainingsScanned: allTrainings.length,
    totalWithManual: trainingsWithManual.length,
    regeneratedCount,
    skippedCount,
    failedCount,
    failures,
    results,
    totalDurationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  };
  
  console.log(`[FORCE REGEN] ========== COMPLETED ==========`);
  console.log(`[FORCE REGEN] Regenerated: ${regeneratedCount}, Skipped: ${skippedCount}, Failed: ${failedCount}`);
  console.log(`[FORCE REGEN] Total duration: ${report.totalDurationMs}ms`);
  
  return report;
}
