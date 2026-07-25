import type { SalaryEntry } from '../types/salary';
import csvText from './salaries.csv?raw';

export function parseSalaryCSV(): SalaryEntry[] {
  const lines = csvText.split('\n');
  const entries: SalaryEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    const name = parts[0]?.trim();
    const length = parseInt(parts[2]?.trim(), 10);
    const salary = parseInt(parts[3]?.trim(), 10);

    if (name && !isNaN(length) && !isNaN(salary)) {
      entries.push({ name, contractYears: length, salary });
    }
  }

  return entries;
}
