export type ObstacleCellConfig = {
  row: number
  col: number
  hits?: number
}

export type BoosterKind = 'shuffle' | 'hammer' | 'rocket' | 'bomb' | 'breaker'

export type BoosterConfig = {
  kind: BoosterKind
  uses: number
}

export type LevelObjective =
  | 'score'
  | 'collect'
  | 'collectDouble'
  | 'ice'
  | 'iceCollect'
  | 'scoreIce'
  | 'crate'
  | 'crateCollect'
  | 'scoreCrate'
  | 'iceCrate'
  | 'iceCrateCollect'

export type LevelConfig = {
  level: number
  world: number
  name: string
  moves: number
  targetScore: number
  objective: LevelObjective
  collectType?: number
  collectAmount?: number
  collectType2?: number
  collectAmount2?: number
  iceCells?: ObstacleCellConfig[]
  crateCells?: ObstacleCellConfig[]
  boosters: BoosterConfig[]
}

export type WorldConfig = {
  id: number
  name: string
  subtitle: string
  firstLevel: number
  lastLevel: number
  theme: 'garden' | 'ice' | 'castle'
}

export const worlds: WorldConfig[] = [
  { id: 1, name: 'Giardino Fiorito', subtitle: 'Impara, raccogli e fai combo', firstLevel: 1, lastLevel: 15, theme: 'garden' },
  { id: 2, name: 'Valle Gelata', subtitle: 'Ghiaccio, cristalli e poche mosse', firstLevel: 16, lastLevel: 30, theme: 'ice' },
  { id: 3, name: 'Castello di Chiki', subtitle: 'Casse, ghiaccio e missioni miste', firstLevel: 31, lastLevel: 45, theme: 'castle' },
]

const cells = (positions: Array<[number, number]>, hits = 1): ObstacleCellConfig[] =>
  positions.map(([row, col]) => ({ row, col, hits }))

const crossIce = cells([
  [1, 3],
  [2, 2], [2, 3], [2, 4],
  [3, 3],
  [4, 3],
])

const gardenIce = cells([
  [1, 1], [1, 5],
  [2, 2], [2, 4],
  [3, 3],
  [4, 2], [4, 4],
  [5, 1], [5, 5],
  [6, 3],
])

const ringIce = cells([
  [1, 1], [1, 2], [1, 4], [1, 5],
  [2, 0], [2, 6],
  [5, 0], [5, 6],
  [6, 1], [6, 2], [6, 4], [6, 5],
])

const hardIce = cells([
  [1, 2], [1, 4],
  [2, 1], [2, 3], [2, 5],
  [4, 1], [4, 3], [4, 5],
  [5, 2], [5, 4],
], 2)

const frozenWall = cells([
  [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6],
  [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [5, 6],
], 2)

const bossIce = cells([
  [0, 0], [0, 3], [0, 6],
  [1, 1], [1, 5],
  [2, 2], [2, 4],
  [3, 3],
  [4, 2], [4, 4],
  [5, 1], [5, 5],
  [6, 0], [6, 3], [6, 6],
  [7, 2], [7, 4],
], 2)

const crateGate = cells([
  [2, 1], [2, 2], [2, 3], [2, 4], [2, 5],
  [5, 1], [5, 2], [5, 3], [5, 4], [5, 5],
])

const crateCorners = cells([
  [0, 0], [0, 1], [0, 5], [0, 6],
  [1, 0], [1, 6],
  [6, 0], [6, 6],
  [7, 0], [7, 1], [7, 5], [7, 6],
])

const crateMaze = cells([
  [1, 1], [1, 3], [1, 5],
  [2, 3],
  [3, 1], [3, 3], [3, 5],
  [4, 1], [4, 5],
  [5, 1], [5, 3], [5, 5],
  [6, 3],
])

const hardCrates = cells([
  [1, 1], [1, 3], [1, 5],
  [2, 2], [2, 4],
  [4, 2], [4, 4],
  [5, 1], [5, 3], [5, 5],
], 2)

const bossCrates = cells([
  [0, 1], [0, 5],
  [1, 0], [1, 2], [1, 4], [1, 6],
  [3, 1], [3, 3], [3, 5],
  [4, 1], [4, 3], [4, 5],
  [6, 0], [6, 2], [6, 4], [6, 6],
  [7, 1], [7, 5],
], 2)

const gardenBoosters: BoosterConfig[] = [
  { kind: 'shuffle', uses: 3 },
  { kind: 'hammer', uses: 3 },
  { kind: 'rocket', uses: 2 },
]

const gardenHardBoosters: BoosterConfig[] = [
  { kind: 'shuffle', uses: 2 },
  { kind: 'hammer', uses: 2 },
  { kind: 'rocket', uses: 1 },
]

const iceBoosters: BoosterConfig[] = [
  { kind: 'hammer', uses: 2 },
  { kind: 'rocket', uses: 1 },
  { kind: 'breaker', uses: 2 },
]

const iceHardBoosters: BoosterConfig[] = [
  { kind: 'hammer', uses: 1 },
  { kind: 'rocket', uses: 1 },
  { kind: 'breaker', uses: 1 },
]

const castleBoosters: BoosterConfig[] = [
  { kind: 'bomb', uses: 2 },
  { kind: 'hammer', uses: 1 },
  { kind: 'rocket', uses: 1 },
]

const castleHardBoosters: BoosterConfig[] = [
  { kind: 'bomb', uses: 1 },
  { kind: 'breaker', uses: 1 },
  { kind: 'rocket', uses: 1 },
]

export const levels: LevelConfig[] = [
  { level: 1, world: 1, name: 'Prime mosse', moves: 20, targetScore: 5000, objective: 'score', boosters: gardenBoosters },
  { level: 2, world: 1, name: 'Pioggia di punti', moves: 20, targetScore: 6000, objective: 'score', boosters: gardenBoosters },
  { level: 3, world: 1, name: 'Raccolta verde', moves: 19, targetScore: 0, objective: 'collect', collectType: 2, collectAmount: 9, boosters: gardenBoosters },
  { level: 4, world: 1, name: 'Doppia raccolta', moves: 20, targetScore: 0, objective: 'collectDouble', collectType: 0, collectAmount: 9, collectType2: 3, collectAmount2: 9, boosters: gardenBoosters },
  { level: 5, world: 1, name: 'Sfida di Chiki', moves: 18, targetScore: 0, objective: 'collectDouble', collectType: 1, collectAmount: 12, collectType2: 4, collectAmount2: 12, boosters: gardenHardBoosters },
  { level: 6, world: 1, name: 'Gelo leggero', moves: 22, targetScore: 0, objective: 'ice', iceCells: crossIce, boosters: gardenBoosters },
  { level: 7, world: 1, name: 'Giardino gelato', moves: 20, targetScore: 0, objective: 'ice', iceCells: gardenIce, boosters: gardenBoosters },
  { level: 8, world: 1, name: 'Cristalli sparsi', moves: 21, targetScore: 0, objective: 'ice', iceCells: ringIce, boosters: gardenBoosters },
  { level: 9, world: 1, name: 'Trifogli congelati', moves: 24, targetScore: 0, objective: 'iceCollect', collectType: 2, collectAmount: 8, iceCells: crossIce, boosters: gardenHardBoosters },
  { level: 10, world: 1, name: 'Punti sotto zero', moves: 20, targetScore: 6500, objective: 'scoreIce', iceCells: gardenIce, boosters: gardenHardBoosters },
  { level: 11, world: 1, name: 'Doppio ghiaccio', moves: 22, targetScore: 0, objective: 'ice', iceCells: hardIce, boosters: gardenHardBoosters },
  { level: 12, world: 1, name: 'Cuori e gemme', moves: 20, targetScore: 0, objective: 'collectDouble', collectType: 0, collectAmount: 12, collectType2: 4, collectAmount2: 12, boosters: gardenHardBoosters },
  { level: 13, world: 1, name: 'Tempesta di ghiaccio', moves: 23, targetScore: 7000, objective: 'scoreIce', iceCells: ringIce, boosters: gardenHardBoosters },
  { level: 14, world: 1, name: 'Corsa finale', moves: 17, targetScore: 8500, objective: 'score', boosters: gardenHardBoosters },
  { level: 15, world: 1, name: 'Grande sfida di Chiki', moves: 27, targetScore: 0, objective: 'iceCollect', collectType: 1, collectAmount: 14, iceCells: bossIce, boosters: gardenHardBoosters },
  { level: 16, world: 2, name: 'Primi fiocchi', moves: 22, targetScore: 6000, objective: 'scoreIce', iceCells: crossIce, boosters: iceBoosters },
  { level: 17, world: 2, name: 'Lago ghiacciato', moves: 21, targetScore: 0, objective: 'ice', iceCells: gardenIce, boosters: iceBoosters },
  { level: 18, world: 2, name: 'Diamanti nel gelo', moves: 21, targetScore: 0, objective: 'iceCollect', collectType: 4, collectAmount: 10, iceCells: ringIce, boosters: iceBoosters },
  { level: 19, world: 2, name: 'Parete di brina', moves: 23, targetScore: 0, objective: 'ice', iceCells: frozenWall, boosters: iceBoosters },
  { level: 20, world: 2, name: 'Ossa polari', moves: 20, targetScore: 0, objective: 'iceCollect', collectType: 1, collectAmount: 12, iceCells: hardIce, boosters: iceHardBoosters },
  { level: 21, world: 2, name: 'Neve a raffiche', moves: 19, targetScore: 8000, objective: 'scoreIce', iceCells: ringIce, boosters: iceHardBoosters },
  { level: 22, world: 2, name: 'Cuore di ghiaccio', moves: 21, targetScore: 0, objective: 'iceCollect', collectType: 0, collectAmount: 13, iceCells: gardenIce, boosters: iceBoosters },
  { level: 23, world: 2, name: 'Doppia lastra', moves: 24, targetScore: 0, objective: 'ice', iceCells: hardIce, boosters: iceHardBoosters },
  { level: 24, world: 2, name: 'Freddo estremo', moves: 20, targetScore: 9000, objective: 'scoreIce', iceCells: frozenWall, boosters: iceHardBoosters },
  { level: 25, world: 2, name: 'Fiori nella neve', moves: 22, targetScore: 0, objective: 'iceCollect', collectType: 3, collectAmount: 14, iceCells: ringIce, boosters: iceHardBoosters },
  { level: 26, world: 2, name: 'Brina incrociata', moves: 18, targetScore: 0, objective: 'ice', iceCells: hardIce, boosters: iceHardBoosters },
  { level: 27, world: 2, name: 'Combo polare', moves: 19, targetScore: 10000, objective: 'scoreIce', iceCells: gardenIce, boosters: iceHardBoosters },
  { level: 28, world: 2, name: 'Chiki sulla neve', moves: 22, targetScore: 0, objective: 'iceCollect', collectType: 5, collectAmount: 12, iceCells: frozenWall, boosters: iceHardBoosters },
  { level: 29, world: 2, name: 'Ultimo disgelo', moves: 18, targetScore: 9500, objective: 'scoreIce', iceCells: bossIce, boosters: iceHardBoosters },
  { level: 30, world: 2, name: 'Re del ghiaccio', moves: 28, targetScore: 0, objective: 'iceCollect', collectType: 4, collectAmount: 16, iceCells: bossIce, boosters: iceHardBoosters },
  { level: 31, world: 3, name: 'Porte del castello', moves: 23, targetScore: 0, objective: 'crate', crateCells: crateGate, boosters: castleBoosters },
  { level: 32, world: 3, name: 'Casse negli angoli', moves: 21, targetScore: 0, objective: 'crate', crateCells: crateCorners, boosters: castleBoosters },
  { level: 33, world: 3, name: 'Tesoro di ossa', moves: 22, targetScore: 0, objective: 'crateCollect', collectType: 1, collectAmount: 12, crateCells: crateGate, boosters: castleBoosters },
  { level: 34, world: 3, name: 'Sala dei cristalli', moves: 21, targetScore: 8000, objective: 'scoreCrate', crateCells: crateMaze, boosters: castleBoosters },
  { level: 35, world: 3, name: 'Gelo nel castello', moves: 24, targetScore: 0, objective: 'iceCrate', iceCells: crossIce, crateCells: crateGate, boosters: castleHardBoosters },
  { level: 36, world: 3, name: 'Casse rinforzate', moves: 24, targetScore: 0, objective: 'crate', crateCells: hardCrates, boosters: castleHardBoosters },
  { level: 37, world: 3, name: 'Trifogli segreti', moves: 24, targetScore: 0, objective: 'crateCollect', collectType: 2, collectAmount: 14, crateCells: crateMaze, boosters: castleBoosters },
  { level: 38, world: 3, name: 'Doppio ostacolo', moves: 26, targetScore: 0, objective: 'iceCrate', iceCells: gardenIce, crateCells: crateCorners, boosters: castleHardBoosters },
  { level: 39, world: 3, name: 'Camera del tesoro', moves: 20, targetScore: 9500, objective: 'scoreCrate', crateCells: hardCrates, boosters: castleHardBoosters },
  { level: 40, world: 3, name: 'Ossa nella brina', moves: 25, targetScore: 0, objective: 'iceCrateCollect', collectType: 1, collectAmount: 14, iceCells: ringIce, crateCells: crateGate, boosters: castleHardBoosters },
  { level: 41, world: 3, name: 'Labirinto reale', moves: 23, targetScore: 0, objective: 'crate', crateCells: bossCrates, boosters: castleHardBoosters },
  { level: 42, world: 3, name: 'Cuori del re', moves: 22, targetScore: 0, objective: 'crateCollect', collectType: 0, collectAmount: 16, crateCells: hardCrates, boosters: castleHardBoosters },
  { level: 43, world: 3, name: 'Sala congelata', moves: 24, targetScore: 0, objective: 'iceCrate', iceCells: hardIce, crateCells: crateMaze, boosters: castleHardBoosters },
  { level: 44, world: 3, name: 'Ultima corsa', moves: 17, targetScore: 11000, objective: 'scoreCrate', crateCells: crateCorners, boosters: castleHardBoosters },
  { level: 45, world: 3, name: 'Corona di Chiki', moves: 30, targetScore: 0, objective: 'iceCrateCollect', collectType: 5, collectAmount: 18, iceCells: bossIce, crateCells: bossCrates, boosters: castleHardBoosters },
]
