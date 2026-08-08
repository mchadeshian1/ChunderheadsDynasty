export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status: string;
  sport: string;
  total_rosters: number;
  roster_positions: string[];
  scoring_settings: Record<string, number>;
  settings: Record<string, number>;
  avatar: string | null;
}

export interface SleeperUser {
  user_id: string;
  display_name: string;
  avatar: string | null;
  is_owner: boolean;
  metadata: {
    team_name?: string;
    avatar?: string;
    [key: string]: unknown;
  };
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  league_id: string;
  players: string[] | null;
  starters: string[] | null;
  reserve: string[] | null;
  taxi: string[] | null;
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    [key: string]: number;
  };
}

export interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
  status: string;
  injury_status: string | null;
  fantasy_positions: string[] | null;
  years_exp: number;
  active: boolean;
  number: number | null;
}

export interface SleeperTradedPick {
  season: string;
  round: number;
  roster_id: number;
  owner_id: number;
  previous_owner_id: number;
}

export interface SleeperDraft {
  draft_id: string;
  season: string;
  /** "auction" for the free agent draft, "linear"/"snake" for the rookie draft. */
  type: string;
  status: string;
  draft_order: Record<string, number> | null;
  settings: Record<string, number>;
}

export interface SleeperDraftPick {
  draft_id: string;
  player_id: string;
  roster_id: number;
  round: number;
  /** Position within the round, 1..teams. */
  draft_slot: number;
  /** Overall pick number across the whole draft. */
  pick_no: number;
  metadata: {
    first_name?: string;
    last_name?: string;
    position?: string;
    /** Winning bid, auction drafts only. Sleeper sends it as a string. */
    amount?: string;
    [key: string]: unknown;
  } | null;
}

export interface EnrichedTeam {
  roster: SleeperRoster;
  user: SleeperUser;
}

export interface SleeperNFLState {
  /** "pre" | "regular" | "post" */
  season_type: string;
  season: string;
  /** Week within the current season_type; 0 during the preseason. */
  leg: number;
  week: number;
  display_week: number;
  season_start_date: string;
}
