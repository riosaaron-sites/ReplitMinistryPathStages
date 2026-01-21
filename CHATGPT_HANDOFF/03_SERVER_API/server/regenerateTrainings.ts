import { regenerateInsufficientTrainings } from './deepTrainingService';

async function main() {
  console.log('Starting training regeneration for modules with < 8 lessons...\n');
  
  const result = await regenerateInsufficientTrainings();
  
  console.log('\n=== REGENERATION RESULTS ===\n');
  
  console.log('BEFORE:');
  for (const item of result.before) {
    console.log(`  - ${item.title}: ${item.lessonCount} lessons`);
  }
  
  console.log('\nAFTER:');
  for (const item of result.after) {
    const status = item.success ? '✓' : '✗';
    console.log(`  ${status} ${item.title}: ${item.lessonCount} lessons`);
  }
  
  console.log('\nSUMMARY:');
  console.log(`  Total processed: ${result.summary.total}`);
  console.log(`  Fixed (now >= 8): ${result.summary.fixed}`);
  console.log(`  Still below 8: ${result.summary.stillBelow}`);
  
  process.exit(0);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
