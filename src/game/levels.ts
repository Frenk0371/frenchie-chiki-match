export type LevelConfig = {
  level: number
  moves: number
  targetScore: number
  objective: 'score' | 'collect'
collectType?: number
collectAmount?: number
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
}
]

