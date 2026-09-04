export type IceCellConfig = {
  row: number
  col: number
  hits?: number
}

export type LevelObjective =
  | 'score'
  | 'collect'
  | 'collectDouble'
  | 'ice'
  | 'iceCollect'
  | 'scoreIce'

export type LevelConfig = {
  level: number
  name: string
  moves: number
  targetScore: number
  objective: LevelObjective
  collectType?: number
  collectAmount?: number
  collectType2?: number
  collectAmount2?: number
  iceCells?: IceCellConfig[]
}

const ice = (cells: Array<[number, number]>, hits = 1): IceCellConfig[] =>
  cells.map(([row, col]) => ({ row, col, hits }))

const crossIce = ice([
  [1, 3],
  [2, 2], [2, 3], [2, 4],
  [3, 3],
  [4, 3],
])

const gardenIce = ice([
  [1, 1], [1, 5],
  [2, 2], [2, 4],
  [3, 3],
  [4, 2], [4, 4],
  [5, 1], [5, 5],
  [6, 3],
])

const ringIce = ice([
  [1, 1], [1, 2], [1, 4], [1, 5],
  [2, 0], [2, 6],
  [5, 0], [5, 6],
  [6, 1], [6, 2], [6, 4], [6, 5],
])

const hardIce = ice([
  [1, 2], [1, 4],
  [2, 1], [2, 3], [2, 5],
  [4, 1], [4, 3], [4, 5],
  [5, 2], [5, 4],
], 2)

const bossIce = ice([
  [0, 0], [0, 3], [0, 6],
  [1, 1], [1, 5],
  [2, 2], [2, 4],
  [3, 3],
  [4, 2], [4, 4],
  [5, 1], [5, 5],
  [6, 0], [6, 3], [6, 6],
  [7, 2], [7, 4],
], 2)

export const levels: LevelConfig[] = [
  {
    level: 1,
    name: 'Prime mosse',
    moves: 20,
    targetScore: 5000,
    objective: 'score',
  },
  {
    level: 2,
    name: 'Pioggia di punti',
    moves: 20,
    targetScore: 6000,
    objective: 'score',
  },
  {
    level: 3,
    name: 'Raccolta verde',
    moves: 19,
    targetScore: 0,
    objective: 'collect',
    collectType: 2,
    collectAmount: 9,
  },
  {
    level: 4,
    name: 'Doppia raccolta',
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
    name: 'Sfida di Chiki',
    moves: 18,
    targetScore: 0,
    objective: 'collectDouble',
    collectType: 1,
    collectAmount: 12,
    collectType2: 4,
    collectAmount2: 12,
  },
  {
    level: 6,
    name: 'Gelo leggero',
    moves: 22,
    targetScore: 0,
    objective: 'ice',
    iceCells: crossIce,
  },
  {
    level: 7,
    name: 'Giardino gelato',
    moves: 20,
    targetScore: 0,
    objective: 'ice',
    iceCells: gardenIce,
  },
  {
    level: 8,
    name: 'Cristalli sparsi',
    moves: 21,
    targetScore: 0,
    objective: 'ice',
    iceCells: ringIce,
  },
  {
    level: 9,
    name: 'Trifogli congelati',
    moves: 24,
    targetScore: 0,
    objective: 'iceCollect',
    collectType: 2,
    collectAmount: 8,
    iceCells: crossIce,
  },
  {
    level: 10,
    name: 'Punti sotto zero',
    moves: 20,
    targetScore: 6500,
    objective: 'scoreIce',
    iceCells: gardenIce,
  },
  {
    level: 11,
    name: 'Doppio ghiaccio',
    moves: 22,
    targetScore: 0,
    objective: 'ice',
    iceCells: hardIce,
  },
  {
    level: 12,
    name: 'Cuori e gemme',
    moves: 20,
    targetScore: 0,
    objective: 'collectDouble',
    collectType: 0,
    collectAmount: 12,
    collectType2: 4,
    collectAmount2: 12,
  },
  {
    level: 13,
    name: 'Tempesta di ghiaccio',
    moves: 23,
    targetScore: 7000,
    objective: 'scoreIce',
    iceCells: ringIce,
  },
  {
    level: 14,
    name: 'Corsa finale',
    moves: 17,
    targetScore: 8500,
    objective: 'score',
  },
  {
    level: 15,
    name: 'Grande sfida di Chiki',
    moves: 27,
    targetScore: 0,
    objective: 'iceCollect',
    collectType: 1,
    collectAmount: 14,
    iceCells: bossIce,
  },
]
