#!/usr/bin/env tsx
/**
 * CLI Script: Force Regenerate All Training Content
 * 
 * Usage: npx tsx server/cli/forceRegen.ts
 * 
 * This script bypasses web authentication and directly triggers the force
 * regeneration pipeline for all training modules with linked manuals.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { forceRegenerateAllTrainings } from '../manualAnalysisService';

async function main() {
  console.log('='.repeat(60));
  console.log('FORCE REGENERATION - Training Content Pipeline');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('');

  // Get before counts for proof
  console.log('--- BEFORE STATE ---');
  
  try {
    const lessonsResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM training_modules 
      WHERE lesson_summary IS NULL OR lesson_summary = ''
    `);
    const beforeLessonsCount = Number(lessonsResult.rows[0]?.count || 0);
    console.log(`Trainings without lessons: ${beforeLessonsCount}`);
    
    const quizResult = await db.execute(sql`SELECT COUNT(*) as count FROM training_assessments`);
    const beforeQuizCount = Number(quizResult.rows[0]?.count || 0);
    console.log(`Total quiz questions: ${beforeQuizCount}`);
    
    console.log('');
    console.log('--- SAMPLE TRAININGS (BEFORE) ---');
    const samplesBefore = await db.execute(sql`
      SELECT 
        id, 
        title, 
        manual_id,
        CASE WHEN lesson_summary IS NULL THEN 0 ELSE LENGTH(lesson_summary) END as lesson_length,
        CASE WHEN study_questions IS NULL THEN 0 ELSE jsonb_array_length(study_questions) END as study_question_count,
        CASE WHEN knowledge_check_questions IS NULL THEN 0 ELSE jsonb_array_length(knowledge_check_questions) END as knowledge_check_count
      FROM training_modules 
      WHERE manual_id IS NOT NULL 
      LIMIT 3
    `);
    console.table(samplesBefore.rows);
    
    console.log('');
    console.log('--- RUNNING FORCE REGENERATION ---');
    console.log('');
    
    const report = await forceRegenerateAllTrainings();
    
    console.log('');
    console.log('='.repeat(60));
    console.log('FORCE REGENERATION REPORT');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Total Duration: ${(report.totalDurationMs / 1000).toFixed(1)}s`);
    console.log('');
    console.log('--- SUMMARY ---');
    console.log(`Total Trainings Scanned: ${report.totalTrainingsScanned}`);
    console.log(`Total With Manual: ${report.totalWithManual}`);
    console.log(`Regenerated: ${report.regeneratedCount}`);
    console.log(`Skipped: ${report.skippedCount}`);
    console.log(`Failed: ${report.failedCount}`);
    console.log('');
    
    // Show individual results
    console.log('--- DETAILED RESULTS ---');
    for (const result of report.results) {
      const statusIcon = result.status === 'UPDATED' ? '✓' : result.status === 'SKIPPED' ? '⊘' : '✗';
      const stats = result.lessonCount !== undefined 
        ? ` [${result.studyQuestionCount} study Qs, ${result.assessmentQuestionCount} quiz Qs]`
        : '';
      console.log(`${statusIcon} ${result.title}: ${result.status} (${result.durationMs}ms)${stats}`);
      if (result.reason) {
        console.log(`  └─ Reason: ${result.reason}`);
      }
    }
    console.log('');
    
    // Show failures
    if (report.failures.length > 0) {
      console.log('--- FAILURES ---');
      for (const failure of report.failures) {
        console.log(`✗ ${failure.title}: ${failure.reason}`);
      }
      console.log('');
    }
    
    // Get after counts for proof
    console.log('--- AFTER STATE ---');
    const lessonsResultAfter = await db.execute(sql`
      SELECT COUNT(*) as count FROM training_modules 
      WHERE lesson_summary IS NULL OR lesson_summary = ''
    `);
    const afterLessonsCount = Number(lessonsResultAfter.rows[0]?.count || 0);
    console.log(`Trainings without lessons: ${afterLessonsCount} (was ${beforeLessonsCount})`);
    
    const quizResultAfter = await db.execute(sql`SELECT COUNT(*) as count FROM training_assessments`);
    const afterQuizCount = Number(quizResultAfter.rows[0]?.count || 0);
    console.log(`Total quiz questions: ${afterQuizCount} (was ${beforeQuizCount})`);
    
    console.log('');
    console.log('--- SAMPLE TRAININGS (AFTER) ---');
    const samplesAfter = await db.execute(sql`
      SELECT 
        id, 
        title, 
        manual_id,
        CASE WHEN lesson_summary IS NULL THEN 0 ELSE LENGTH(lesson_summary) END as lesson_length,
        CASE WHEN study_questions IS NULL THEN 0 ELSE jsonb_array_length(study_questions) END as study_question_count,
        CASE WHEN knowledge_check_questions IS NULL THEN 0 ELSE jsonb_array_length(knowledge_check_questions) END as knowledge_check_count
      FROM training_modules 
      WHERE manual_id IS NOT NULL 
      LIMIT 3
    `);
    console.table(samplesAfter.rows);
    
    console.log('');
    console.log('='.repeat(60));
    console.log('FORCE REGENERATION COMPLETE');
    console.log('='.repeat(60));
    
    // Output JSON report for programmatic use
    console.log('');
    console.log('--- JSON REPORT ---');
    console.log(JSON.stringify({
      ...report,
      dbProof: {
        before: { trainingsWithoutLessons: beforeLessonsCount, totalQuizQuestions: beforeQuizCount },
        after: { trainingsWithoutLessons: afterLessonsCount, totalQuizQuestions: afterQuizCount },
      },
    }, null, 2));
    
  } catch (error) {
    console.error('Error during force regeneration:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
