import type { SalaryEntry } from '../types/salary';
import csvText from './player_contracts.csv?raw';

function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseSalaryCSV(): SalaryEntry[] {
  const lines = csvText.split('\n');
  const header = splitCSVLine(lines[0]).map(h => h.trim());
  const nameIdx = header.indexOf('Player');
  const yearsIdx = header.indexOf('ContractLength');
  const salaryIdx = header.indexOf('CurrentSalary');
  const refIdx = header.indexOf('ComputedRef');

  const entries: SalaryEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = splitCSVLine(line);
    const name = parts[nameIdx]?.trim();
    const contractYears = parseInt(parts[yearsIdx]?.trim(), 10);
    const salary = parseInt(parts[salaryIdx]?.trim(), 10);
    const refValue = parseInt(parts[refIdx]?.trim(), 10);

    if (name && !isNaN(contractYears) && !isNaN(salary)) {
      entries.push({
        name,
        contractYears,
        salary,
        refValue: isNaN(refValue) ? undefined : refValue,
      });
    }
  }

  return entries;
}
