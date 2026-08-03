export interface SleeperTransaction {
  type: string;
  status: string;
  transaction_id: string;
  roster_ids: number[];
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  settings: Record<string, number> | null;
  created: number;
  leg: number;
}
