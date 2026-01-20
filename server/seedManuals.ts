import { db } from './db';
import { manuals, ministries, trainingModules } from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';
import { eq } from 'drizzle-orm';

interface ManualEntry {
  title: string;
  category: 'ministry_manual' | 'leadership_training' | 'resource';
  fileUrl: string;
  ministrySlug?: string;
  generateTraining: boolean;
  isRequired: boolean;
}

function categorizeManual(filename: string): ManualEntry {
  const cleanName = filename
    .replace(/_\d{13}\.pdf$/i, '')
    .replace(/\d+_/g, '')
    .replace(/_/g, ' ')
    .replace(/\([^)]*\)/g, '')
    .trim();
  
  const lowerName = cleanName.toLowerCase();
  
  const leadershipPatterns = [
    'language of a leader', 'recruitment', 'ministry leaders manual',
    'ministry development', 'job description', 'board member', 'service coordinator'
  ];
  if (leadershipPatterns.some(p => lowerName.includes(p))) {
    return { 
      title: cleanName, 
      category: 'leadership_training', 
      fileUrl: `/attached_assets/${filename}`,
      generateTraining: true,
      isRequired: false
    };
  }
  
  const resourcePatterns = [
    'about us', 'serve booklet', 'following jesus', 'holy spirit class',
    'baptism', 'discipleship model', 'discipleship manual', 'employee manual', 
    'confidentiality', 'incident report', 'bylaws', 'policy', 'live the life'
  ];
  if (resourcePatterns.some(p => lowerName.includes(p))) {
    return { 
      title: cleanName, 
      category: 'resource', 
      fileUrl: `/attached_assets/${filename}`,
      generateTraining: false,
      isRequired: false
    };
  }
  
  const ministryMatches: Record<string, string> = {
    'usher': 'ushers',
    'security': 'security',
    'social media': 'production',
    'media ministry': 'production',
    'youth worship': 'worship-arts',
    'city youth': 'student-ministry',
    'city uth': 'student-ministry',
    'kingdom children': 'kids-ministry',
    'intercessory': 'intercessory',
    'crew': 'crew',
    'core minister': 'core-ministers',
    'celebrate recovery': 'celebrate-recovery',
    'facilities': 'facilities',
    'counting': 'counting',
    'auxiliary': 'landing-team',
    'landing team': 'landing-team',
    'discipleship hour': 'discipleship-hour',
  };
  
  for (const [pattern, slug] of Object.entries(ministryMatches)) {
    if (lowerName.includes(pattern)) {
      return { 
        title: cleanName, 
        category: 'ministry_manual', 
        fileUrl: `/attached_assets/${filename}`,
        ministrySlug: slug,
        generateTraining: true,
        isRequired: true
      };
    }
  }
  
  return { 
    title: cleanName, 
    category: 'resource', 
    fileUrl: `/attached_assets/${filename}`,
    generateTraining: false,
    isRequired: false
  };
}

function showUsage() {
  console.log(`
Admin Manual Reset Tool
=======================

Usage: npx tsx server/seedManuals.ts [mode]

Modes:
  --dry-run     Preview what would be done without making changes (default)
  --execute     Actually perform the reset and registration

Examples:
  npx tsx server/seedManuals.ts --dry-run    # Preview changes
  npx tsx server/seedManuals.ts --execute    # Execute changes

This tool will:
1. Clear existing training module manual links
2. Delete all manual analysis records  
3. Delete all existing manuals
4. Register new manuals from attached_assets/
5. Categorize manuals (ministry_manual, leadership_training, resource)
6. Link to ministries where applicable
`);
}

async function seedManuals(isDryRun: boolean) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ADMIN MANUAL RESET TOOL - ${isDryRun ? 'DRY RUN MODE' : 'EXECUTE MODE'}`);
  console.log(`${'='.repeat(50)}\n`);
  
  if (isDryRun) {
    console.log('*** DRY RUN: No changes will be made to the database ***\n');
  } else {
    console.log('*** EXECUTE MODE: Changes WILL be written to database ***\n');
  }
  
  const assetsDir = path.resolve(process.cwd(), 'attached_assets');
  const files = fs.readdirSync(assetsDir);
  const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf') && !f.includes('.pdf_'));
  
  console.log(`Found ${pdfFiles.length} PDF files to process\n`);
  
  const existingMinistries = await db.select().from(ministries);
  console.log(`Found ${existingMinistries.length} ministries in database`);
  
  const existingManuals = await db.select().from(manuals);
  console.log(`Found ${existingManuals.length} existing manuals to be cleared`);
  
  const linkedModules = await db.select().from(trainingModules).where(eq(trainingModules.manualId, trainingModules.manualId));
  const modulesWithLinks = linkedModules.filter(m => m.manualId !== null);
  console.log(`Found ${modulesWithLinks.length} training modules with manual links to be cleared\n`);
  
  if (!isDryRun) {
    console.log('Step 1: Clearing training module manual links...');
    await db.execute(`UPDATE training_modules SET manual_id = NULL WHERE manual_id IS NOT NULL`);
    
    console.log('Step 2: Deleting manual analysis records...');
    await db.execute(`DELETE FROM manual_analysis`);
    
    console.log('Step 3: Deleting existing manuals...');
    await db.execute(`DELETE FROM manuals`);
    console.log('');
  } else {
    console.log('Step 1: [DRY RUN] Would clear training module manual links');
    console.log('Step 2: [DRY RUN] Would delete manual analysis records');
    console.log('Step 3: [DRY RUN] Would delete existing manuals\n');
  }
  
  const seen = new Set<string>();
  const toRegister: Array<ManualEntry & { ministryId: string | null; filename: string }> = [];
  const skipped: string[] = [];
  
  for (const pdfFile of pdfFiles) {
    const entry = categorizeManual(pdfFile);
    
    const normalizedTitle = entry.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(normalizedTitle)) {
      skipped.push(pdfFile);
      continue;
    }
    seen.add(normalizedTitle);
    
    let ministryId: string | null = null;
    if (entry.ministrySlug) {
      const ministry = existingMinistries.find(m => 
        m.slug === entry.ministrySlug || 
        m.name.toLowerCase().replace(/\s+/g, '-') === entry.ministrySlug
      );
      ministryId = ministry?.id || null;
    }
    
    toRegister.push({ ...entry, ministryId, filename: pdfFile });
  }
  
  console.log('Step 4: Registering new manuals...\n');
  
  const registered: typeof toRegister = [];
  
  for (const entry of toRegister) {
    if (!isDryRun) {
      try {
        await db.insert(manuals).values({
          title: entry.title,
          category: entry.category,
          ministryId: entry.ministryId,
          fileUrl: entry.fileUrl,
          fileType: 'pdf',
          generateTraining: entry.generateTraining,
          isRequired: entry.isRequired,
        });
        registered.push(entry);
        console.log(`  ✓ Registered: ${entry.title} (${entry.category})`);
      } catch (err) {
        console.error(`  ✗ Failed to register ${entry.filename}:`, err);
      }
    } else {
      registered.push(entry);
      console.log(`  [DRY RUN] Would register: ${entry.title} (${entry.category})`);
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log('  REGISTRATION SUMMARY');
  console.log(`${'='.repeat(50)}\n`);
  console.log(`Total to register: ${registered.length}`);
  console.log(`Skipped duplicates: ${skipped.length}`);
  console.log(`\nBy category:`);
  console.log(`  - ministry_manual: ${registered.filter(r => r.category === 'ministry_manual').length}`);
  console.log(`  - leadership_training: ${registered.filter(r => r.category === 'leadership_training').length}`);
  console.log(`  - resource: ${registered.filter(r => r.category === 'resource').length}`);
  
  const unlinkedMinistryManuals = registered.filter(r => r.category === 'ministry_manual' && !r.ministryId);
  if (unlinkedMinistryManuals.length > 0) {
    console.log(`\nWarning: ${unlinkedMinistryManuals.length} ministry manuals without ministry link:`);
    unlinkedMinistryManuals.forEach(m => console.log(`  - ${m.title}`));
  }
  
  if (skipped.length > 0) {
    console.log(`\nSkipped duplicate files:`);
    skipped.forEach(f => console.log(`  - ${f}`));
  }
  
  if (isDryRun) {
    console.log(`\n*** DRY RUN COMPLETE - No changes were made ***`);
    console.log(`Run with --execute to apply these changes.\n`);
  } else {
    console.log(`\n*** EXECUTE COMPLETE - Changes have been applied ***\n`);
  }
  
  process.exit(0);
}

const args = process.argv.slice(2);
const mode = args[0];

if (mode === '--help' || mode === '-h') {
  showUsage();
  process.exit(0);
} else if (mode === '--execute') {
  seedManuals(false).catch(console.error);
} else if (mode === '--dry-run' || !mode) {
  seedManuals(true).catch(console.error);
} else {
  console.error(`Unknown mode: ${mode}`);
  showUsage();
  process.exit(1);
}
