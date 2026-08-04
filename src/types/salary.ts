export interface SalaryEntry {
  name: string;
  contractYears: number;
  salary: number;
  refValue?: number;
}

export interface PlayerSalary {
  playerId: string;
  name: string;
  contractYears: number;
  salary: number;
  refValue?: number;
}
