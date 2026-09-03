export type LevelConfig = {
  level: number
  moves: number
  targetScore: number
  objective: 'score' | 'collect' | 'collectDouble'
  collectType?: number
  collectAmount?: number
  collectType2?: number
  collectAmount2?: number
}

export const levels: LevelConfig[] = [
  {
    level: 1,
    moves: 20,
    targetScore: 5000,
    objective: 'score'
  },
  {
    level: 2,
    moves: 20,
    targetScore: 6000,
    objective: 'score'
  },
  {
    level: 3,
    moves: 19,
    targetScore: 7000,
    objective: 'collect',
    collectType: 2,
    collectAmount: 9,
  },
  {
    level: 4,
    moves: 20,
    targetScore: 0,
    objective: 'collectDouble',
    collectType: 0,
    collectAmount: 9,
    collectType2: 3,
    collectAmount2: 9,
  },
  {
    level: 5,
    moves: 18,
    targetScore: 0,
    objective: 'collectDouble',
    collectType: 1,
    collectAmount: 12,
    collectType2: 4,
    collectAmount2: 12,
  },
]
