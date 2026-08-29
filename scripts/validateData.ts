import fs from 'fs';
import path from 'path';
import { validateSensorReadingsBatch } from '../src/utils/validation';

console.log('--- NCPOR / MoES Seafloor Metal Detection Sensor Contract Validation ---');

const dataPath = path.resolve(process.cwd(), 'src/data/mockSensorData.json');
const rawContent = fs.readFileSync(dataPath, 'utf-8');
const data = JSON.parse(rawContent);

console.log(`Loaded ${data.length} telemetry records from ${dataPath}`);

const { valid, invalidCount, errors } = validateSensorReadingsBatch(data);

console.log(`\nValidation Summary:`);
console.log(`- Total Valid Records: ${valid.length}`);
console.log(`- Total Invalid Records: ${invalidCount}`);

if (invalidCount > 0) {
  console.error('\nFAIL: Validation errors found:');
  errors.forEach((err) => console.error(`  x ${err}`));
  process.exit(1);
} else {
  console.log('\nSUCCESS: 100% of telemetry records strictly adhere to the locked 10-field schema with ZERO unauthorized attributes.');
}
