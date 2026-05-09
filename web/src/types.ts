export type PipeColorKey =
  | 'red'
  | 'green'
  | 'blue'
  | 'yellow'
  | 'orange'
  | 'maroon'
  | 'purple'
  | 'pink'
  | 'cyan'
  | 'white'
  | 'lime'
  | 'teal';

export interface Cell {
  row: number;
  col: number;
}

export interface Endpoint extends Cell {
  color: PipeColorKey;
}

export interface LevelConfig {
  id: string;
  size: number;
  optimalMoves: number;
  endpoints: Endpoint[];
}

export interface PathData {
  cells: Cell[];
  complete: boolean;
}

export interface GameSnapshot {
  paths: Record<string, PathData>;
  grid: (PipeColorKey | null)[][];
  activeColor: PipeColorKey | null;
  activeHead: Cell | null;
  moves: number;
  startTime: number | null;
  elapsedMs: number;
  solved: boolean;
  allConnected: boolean;   // all pipes complete, board may still have empty cells
  filledPercent: number;
  solveAnimProgress: number;
}

export interface GameState extends GameSnapshot {
  level: LevelConfig;
  history: GameSnapshot[];
}
