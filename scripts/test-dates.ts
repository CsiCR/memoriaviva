import {
  formatDateToAR,
  formatTimeToAR,
  formatDateTimeToAR,
  formatDateTimeForAudit,
  getBuenosAiresYear,
  getBuenosAiresDateParts,
  getBuenosAiresOffsetMinutes,
  createBuenosAiresDate,
  getBuenosAiresBoundaries
} from '../src/utils/date';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log('--- RUNNING DATE UTILITY TESTS ---');

  // Test 1: Graceful handling of invalid, null, and empty inputs
  console.log('Testing null, empty and invalid values...');
  assert(formatDateToAR(null) === '—', 'null date format should be "—"');
  assert(formatDateToAR(undefined) === '—', 'undefined date format should be "—"');
  assert(formatDateToAR('') === '—', 'empty string date format should be "—"');
  assert(formatDateToAR('invalid-date') === '—', 'invalid string date format should be "—"');
  assert(formatTimeToAR(null) === '—', 'null time format should be "—"');
  assert(formatDateTimeToAR(null) === '—', 'null datetime format should be "—"');
  assert(formatDateTimeForAudit(null) === '—', 'null audit format should be "—"');

  // Test 2: Formatting consistency
  console.log('Testing standard formatting...');
  const testInstant = new Date('2026-07-11T05:30:00Z'); // 05:30 UTC -> 02:30 Buenos Aires
  assert(formatDateToAR(testInstant) === '11/07/2026', 'formatDateToAR failed');
  assert(formatTimeToAR(testInstant) === '02:30', 'formatTimeToAR failed');
  assert(formatDateTimeToAR(testInstant) === '11/07/2026 02:30', 'formatDateTimeToAR failed');
  assert(formatDateTimeForAudit(testInstant) === '11/07/2026 02:30 (Hora de Argentina)', 'formatDateTimeForAudit failed');

  // Test 3: getBuenosAiresYear
  console.log('Testing getBuenosAiresYear...');
  // Near UTC day change but same local year
  assert(getBuenosAiresYear(new Date('2026-01-01T01:00:00Z')) === 2025, 'Expected 2025 (since 01:00 UTC Jan 1st is 22:00 Dec 31st 2025 in BA)');
  assert(getBuenosAiresYear(new Date('2026-01-01T04:00:00Z')) === 2026, 'Expected 2026 (since 04:00 UTC Jan 1st is 01:00 Jan 1st in BA)');

  // Test 4: Day change boundaries at 03:00 UTC (00:00 Buenos Aires local time)
  console.log('Testing 03:00 UTC boundary (00:00 BA local)...');
  
  // Just before day change: 02:59:59.999 UTC (23:59:59.999 BA of previous day)
  const justBeforeUTC = new Date('2026-07-11T02:59:59.999Z');
  // Just at/after day change: 03:00:00.000 UTC (00:00:00.000 BA of new day)
  const justAfterUTC = new Date('2026-07-11T03:00:00.000Z');
  
  assert(formatDateToAR(justBeforeUTC) === '10/07/2026', 'Should format to 10/07/2026 before day change');
  assert(formatDateToAR(justAfterUTC) === '11/07/2026', 'Should format to 11/07/2026 after day change');

  // Test 5: "Hoy" boundaries (Semi-open)
  console.log('Testing "hoy" boundaries (semi-open)...');
  const now = new Date('2026-07-11T12:00:00Z'); // 09:00 BA time on July 11th
  const hoy = getBuenosAiresBoundaries('hoy', now);
  
  // start should be 00:00 BA on July 11 -> 03:00:00.000 UTC July 11
  assert(hoy.start.toISOString() === '2026-07-11T03:00:00.000Z', 'Start of hoy should be 2026-07-11T03:00:00.000Z');
  // end should be 00:00 BA on July 12 (exclusive) -> 03:00:00.000 UTC July 12
  assert(hoy.end.toISOString() === '2026-07-12T03:00:00.000Z', 'End of hoy (exclusive) should be 2026-07-12T03:00:00.000Z');

  // Test 6: "Ayer" boundaries (Semi-open)
  console.log('Testing "ayer" boundaries...');
  const ayer = getBuenosAiresBoundaries('ayer', now);
  // start should be 00:00 BA on July 10 -> 03:00:00.000 UTC July 10
  assert(ayer.start.toISOString() === '2026-07-10T03:00:00.000Z', 'Start of ayer should be 2026-07-10T03:00:00.000Z');
  // end should be 00:00 BA on July 11 -> 03:00:00.000 UTC July 11
  assert(ayer.end.toISOString() === '2026-07-11T03:00:00.000Z', 'End of ayer should be 2026-07-11T03:00:00.000Z');

  // Test 7: "Esta semana" boundaries (Monday 00:00 to Monday 00:00, semi-open)
  console.log('Testing "semana" (Monday-Monday) boundaries...');
  // July 11th 2026 is Saturday. Monday of this week was July 6th, next Monday is July 13th.
  const semana = getBuenosAiresBoundaries('semana', now);
  assert(semana.start.toISOString() === '2026-07-06T03:00:00.000Z', 'Start of week should be Monday July 6th at 00:00 BA time');
  assert(semana.end.toISOString() === '2026-07-13T03:00:00.000Z', 'End of week should be next Monday July 13th at 00:00 BA time (exclusive)');

  // Test 7b: "Esta semana" boundaries when now is Sunday (July 12th)
  const sundayNow = new Date('2026-07-12T20:00:00Z'); // Sunday 17:00 BA time
  const semanaSunday = getBuenosAiresBoundaries('semana', sundayNow);
  assert(semanaSunday.start.toISOString() === '2026-07-06T03:00:00.000Z', 'On Sunday, start of week should still be Monday July 6th');
  assert(semanaSunday.end.toISOString() === '2026-07-13T03:00:00.000Z', 'On Sunday, end of week should still be next Monday July 13th');

  // Test 7c: "Esta semana" boundaries when now is Monday (July 6th)
  const mondayNow = new Date('2026-07-06T10:00:00Z'); // Monday 07:00 BA time
  const semanaMonday = getBuenosAiresBoundaries('semana', mondayNow);
  assert(semanaMonday.start.toISOString() === '2026-07-06T03:00:00.000Z', 'On Monday, start of week should be today Monday July 6th');
  assert(semanaMonday.end.toISOString() === '2026-07-13T03:00:00.000Z', 'On Monday, end of week should be next Monday July 13th');

  // Test 8: "Este mes" boundaries (First day of current month to First day of next month, semi-open)
  console.log('Testing "mes" boundaries...');
  const mes = getBuenosAiresBoundaries('mes', now);
  assert(mes.start.toISOString() === '2026-07-01T03:00:00.000Z', 'Start of month should be July 1st 2026');
  assert(mes.end.toISOString() === '2026-08-01T03:00:00.000Z', 'End of month should be Aug 1st 2026 (exclusive)');

  console.log('All date tests passed successfully!');
}

runTests();
