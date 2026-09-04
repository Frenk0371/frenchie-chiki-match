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
  theme: 'garden' | 'ice' | 'castle' | 'night' | 'volcano'
}

export const worlds: WorldConfig[] = [
  { id: 1, name: 'Giardino Fiorito', subtitle: 'Impara, raccogli e scopri i primi ostacoli', firstLevel: 1, lastLevel: 20, theme: 'garden' },
  { id: 2, name: 'Valle Gelata', subtitle: 'Ghiaccio, cristalli e mosse sempre più preziose', firstLevel: 21, lastLevel: 40, theme: 'ice' },
  { id: 3, name: 'Castello di Chiki', subtitle: 'Casse, combinazioni e missioni a più obiettivi', firstLevel: 41, lastLevel: 60, theme: 'castle' },
  { id: 4, name: 'Bosco Incantato', subtitle: 'Strategia, raccolte miste e ostacoli combinati', firstLevel: 61, lastLevel: 80, theme: 'night' },
  { id: 5, name: 'Vulcano di Chiki', subtitle: 'La sfida finale: poche mosse, tanti ostacoli, grandi combo', firstLevel: 81, lastLevel: 100, theme: 'volcano' },
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

const checkerIce = cells([
  [0, 0], [0, 2], [0, 4], [0, 6],
  [2, 1], [2, 3], [2, 5],
  [4, 0], [4, 2], [4, 4], [4, 6],
  [6, 1], [6, 3], [6, 5],
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

const fortressCrates = cells([
  [0, 1], [0, 2], [0, 4], [0, 5],
  [2, 0], [2, 3], [2, 6],
  [4, 0], [4, 3], [4, 6],
  [6, 1], [6, 2], [6, 4], [6, 5],
], 2)

const bossCrates = cells([
  [0, 1], [0, 5],
  [1, 0], [1, 2], [1, 4], [1, 6],
  [3, 1], [3, 3], [3, 5],
  [4, 1], [4, 3], [4, 5],
  [6, 0], [6, 2], [6, 4], [6, 6],
  [7, 1], [7, 5],
], 2)

const boosterPacks: Record<number, BoosterConfig[][]> = {
  1: [
    [{ kind: 'shuffle', uses: 3 }, { kind: 'hammer', uses: 3 }, { kind: 'rocket', uses: 2 }],
    [{ kind: 'shuffle', uses: 2 }, { kind: 'hammer', uses: 2 }, { kind: 'rocket', uses: 2 }],
    [{ kind: 'hammer', uses: 2 }, { kind: 'rocket', uses: 1 }, { kind: 'bomb', uses: 1 }],
  ],
  2: [
    [{ kind: 'hammer', uses: 2 }, { kind: 'breaker', uses: 2 }, { kind: 'rocket', uses: 1 }],
    [{ kind: 'breaker', uses: 2 }, { kind: 'hammer', uses: 1 }, { kind: 'shuffle', uses: 1 }],
    [{ kind: 'breaker', uses: 1 }, { kind: 'rocket', uses: 1 }, { kind: 'bomb', uses: 1 }],
  ],
  3: [
    [{ kind: 'bomb', uses: 2 }, { kind: 'hammer', uses: 2 }, { kind: 'rocket', uses: 1 }],
    [{ kind: 'bomb', uses: 2 }, { kind: 'breaker', uses: 1 }, { kind: 'hammer', uses: 1 }],
    [{ kind: 'bomb', uses: 1 }, { kind: 'breaker', uses: 1 }, { kind: 'rocket', uses: 1 }],
  ],
  4: [
    [{ kind: 'shuffle', uses: 2 }, { kind: 'bomb', uses: 2 }, { kind: 'breaker', uses: 2 }],
    [{ kind: 'bomb', uses: 2 }, { kind: 'rocket', uses: 1 }, { kind: 'breaker', uses: 1 }],
    [{ kind: 'bomb', uses: 1 }, { kind: 'breaker', uses: 1 }, { kind: 'hammer', uses: 1 }],
  ],
  5: [
    [{ kind: 'bomb', uses: 2 }, { kind: 'breaker', uses: 1 }, { kind: 'rocket', uses: 1 }],
    [{ kind: 'bomb', uses: 1 }, { kind: 'breaker', uses: 1 }, { kind: 'rocket', uses: 1 }],
    [{ kind: 'bomb', uses: 1 }, { kind: 'breaker', uses: 1 }, { kind: 'hammer', uses: 1 }],
  ],
}

const boostersFor = (world: number, local: number) => {
  const packs = boosterPacks[world]
  const index = local <= 7 ? 0 : local <= 14 ? 1 : 2
  return packs[index].map((booster) => ({ ...booster }))
}

type LevelSpec = Omit<LevelConfig, 'level' | 'world' | 'name' | 'moves' | 'boosters'>

const makeLevel = (
  world: number,
  local: number,
  name: string,
  moves: number,
  spec: LevelSpec,
): LevelConfig => ({
  level: (world - 1) * 20 + local,
  world,
  name,
  moves,
  ...spec,
  boosters: boostersFor(world, local),
})

const worldNames: Record<number, string[]> = {
  1: [
    'Prime mosse', 'Pioggia di punti', 'Raccolta verde', 'Doppia raccolta', 'Sfida di Chiki',
    'Gelo leggero', 'Giardino gelato', 'Trifogli congelati', 'Cuori e gemme', 'Punti sotto zero',
    'Ghiaccio duro', 'Sentiero di ossa', 'Anello di gelo', 'Corsa nel prato', 'Tempesta fiorita',
    'Prime casse', 'Casse e trifogli', 'Cancello gelato', 'Giardino in trappola', 'Finale nel giardino',
  ],
  2: [
    'Ingresso nella valle', 'Cristalli freddi', 'Cuori di ghiaccio', 'Parete congelata', 'Neve e ossa',
    'Doppio gelo', 'Trifogli polari', 'Tempesta azzurra', 'Casse congelate', 'Punti glaciali',
    'Scacchiera di ghiaccio', 'Gemme nel gelo', 'Muro del nord', 'Gelo senza tregua', 'Valanga di Chiki',
    'Casse nella neve', 'Doppia missione polare', 'Fortezza di ghiaccio', 'Ultima bufera', 'Re della valle',
  ],
  3: [
    'Portone reale', 'Casse nel cortile', 'Tesoro nascosto', 'Sala delle casse', 'Ghiaccio nel castello',
    'Ossa reali', 'Labirinto di legno', 'Punti nella torre', 'Casse rinforzate', 'Guardia di Chiki',
    'Corridoio segreto', 'Gemme della corona', 'Fortezza di casse', 'Trappola reale', 'Sala del trono',
    'Doppia barriera', 'Tesoro congelato', 'Assedio al castello', 'Ultima corona', 'Boss del castello',
  ],
  4: [
    'Ingresso nel bosco', 'Luci tra gli alberi', 'Sentiero incantato', 'Casse nel buio', 'Gelo di mezzanotte',
    'Fiori lunari', 'Doppia trappola', 'Bosco di cristallo', 'Radici e casse', 'Combo notturna',
    'Nebbia di Chiki', 'Cuori nel bosco', 'Labirinto incantato', 'Gelo e legno', 'Corsa al chiaro di luna',
    'Bosco proibito', 'Tre missioni', 'Sentiero senza luce', 'Ultima radura', 'Spirito del bosco',
  ],
  5: [
    'Ingresso nel vulcano', 'Rocce roventi', 'Casse incandescenti', 'Gelo impossibile', 'Ossa di lava',
    'Camera ardente', 'Doppia barriera rossa', 'Combo esplosiva', 'Cristalli di fuoco', 'Prova del vulcano',
    'Fortezza di lava', 'Cuore della montagna', 'Trappola estrema', 'Ghiaccio e fuoco', 'Corsa sul magma',
    'Ultime casse', 'Tempesta finale', 'Tre obiettivi', 'Sfida del cratere', 'Grande finale di Chiki',
  ],
}

const target = (world: number, local: number) => 4200 + world * 900 + local * 230
const collect = (world: number, local: number) => 7 + world * 2 + Math.floor(local / 5)

const movesFor = (world: number, local: number) => {
  const base = 23 - Math.floor((world - 1) * 0.9)
  const pressure = Math.floor((local - 1) / 4)
  const bossBonus = local % 5 === 0 ? 3 : 0
  return Math.max(15, base - pressure + bossBonus)
}

const gardenSpec = (local: number): LevelSpec => {
  const hard = local > 10
  const slot = (local - 1) % 10
  const iceSet = hard ? hardIce : crossIce
  const crateSet = hard ? hardCrates : crateGate
  switch (slot) {
    case 0: return { targetScore: target(1, local), objective: 'score' }
    case 1: return { targetScore: 0, objective: 'collect', collectType: 2, collectAmount: collect(1, local) }
    case 2: return { targetScore: 0, objective: 'collectDouble', collectType: 0, collectAmount: collect(1, local) - 1, collectType2: 4, collectAmount2: collect(1, local) - 1 }
    case 3: return { targetScore: target(1, local) + 700, objective: 'score' }
    case 4: return { targetScore: 0, objective: 'ice', iceCells: iceSet }
    case 5: return { targetScore: 0, objective: 'iceCollect', collectType: 1, collectAmount: collect(1, local), iceCells: hard ? gardenIce : crossIce }
    case 6: return { targetScore: target(1, local), objective: 'scoreIce', iceCells: hard ? ringIce : gardenIce }
    case 7: return { targetScore: 0, objective: 'crate', crateCells: crateSet }
    case 8: return { targetScore: 0, objective: 'crateCollect', collectType: 3, collectAmount: collect(1, local), crateCells: hard ? crateMaze : crateGate }
    default: return { targetScore: 0, objective: 'iceCrateCollect', collectType: 2, collectAmount: collect(1, local), iceCells: hard ? ringIce : crossIce, crateCells: hard ? hardCrates : crateGate }
  }
}

const iceSpec = (local: number): LevelSpec => {
  const hard = local > 10
  const slot = (local - 1) % 10
  const iceSet = hard ? frozenWall : gardenIce
  switch (slot) {
    case 0: return { targetScore: 0, objective: 'ice', iceCells: hard ? checkerIce : crossIce }
    case 1: return { targetScore: 0, objective: 'iceCollect', collectType: 4, collectAmount: collect(2, local), iceCells: iceSet }
    case 2: return { targetScore: target(2, local), objective: 'scoreIce', iceCells: hard ? hardIce : ringIce }
    case 3: return { targetScore: 0, objective: 'ice', iceCells: hard ? frozenWall : hardIce }
    case 4: return { targetScore: 0, objective: 'iceCrate', iceCells: hard ? bossIce : gardenIce, crateCells: crateGate }
    case 5: return { targetScore: 0, objective: 'collectDouble', collectType: 1, collectAmount: collect(2, local), collectType2: 2, collectAmount2: collect(2, local) - 2 }
    case 6: return { targetScore: target(2, local) + 900, objective: 'scoreIce', iceCells: hard ? checkerIce : ringIce }
    case 7: return { targetScore: 0, objective: 'crate', crateCells: hard ? hardCrates : crateCorners }
    case 8: return { targetScore: 0, objective: 'iceCrateCollect', collectType: 0, collectAmount: collect(2, local), iceCells: hard ? frozenWall : hardIce, crateCells: hard ? crateMaze : crateGate }
    default: return { targetScore: target(2, local) + 1500, objective: 'scoreIce', iceCells: hard ? bossIce : frozenWall }
  }
}

const castleSpec = (local: number): LevelSpec => {
  const hard = local > 10
  const slot = (local - 1) % 10
  const crates = hard ? fortressCrates : crateMaze
  switch (slot) {
    case 0: return { targetScore: 0, objective: 'crate', crateCells: hard ? hardCrates : crateGate }
    case 1: return { targetScore: 0, objective: 'crateCollect', collectType: 4, collectAmount: collect(3, local), crateCells: crates }
    case 2: return { targetScore: target(3, local), objective: 'scoreCrate', crateCells: hard ? fortressCrates : crateCorners }
    case 3: return { targetScore: 0, objective: 'crate', crateCells: hard ? bossCrates : hardCrates }
    case 4: return { targetScore: 0, objective: 'iceCrate', iceCells: hard ? hardIce : crossIce, crateCells: crates }
    case 5: return { targetScore: 0, objective: 'collectDouble', collectType: 1, collectAmount: collect(3, local), collectType2: 4, collectAmount2: collect(3, local) - 1 }
    case 6: return { targetScore: 0, objective: 'crateCollect', collectType: 5, collectAmount: collect(3, local) - 2, crateCells: hard ? fortressCrates : crateMaze }
    case 7: return { targetScore: target(3, local) + 1200, objective: 'scoreCrate', crateCells: hard ? bossCrates : hardCrates }
    case 8: return { targetScore: 0, objective: 'iceCrateCollect', collectType: 0, collectAmount: collect(3, local), iceCells: hard ? checkerIce : gardenIce, crateCells: hard ? fortressCrates : crateMaze }
    default: return { targetScore: 0, objective: 'iceCrate', iceCells: hard ? bossIce : hardIce, crateCells: hard ? bossCrates : hardCrates }
  }
}

const forestSpec = (local: number): LevelSpec => {
  const hard = local > 10
  const slot = (local - 1) % 10
  switch (slot) {
    case 0: return { targetScore: target(4, local), objective: 'score' }
    case 1: return { targetScore: 0, objective: 'collectDouble', collectType: 2, collectAmount: collect(4, local), collectType2: 3, collectAmount2: collect(4, local) - 1 }
    case 2: return { targetScore: 0, objective: 'iceCollect', collectType: 5, collectAmount: collect(4, local) - 2, iceCells: hard ? checkerIce : ringIce }
    case 3: return { targetScore: 0, objective: 'crateCollect', collectType: 1, collectAmount: collect(4, local), crateCells: hard ? fortressCrates : crateMaze }
    case 4: return { targetScore: 0, objective: 'iceCrate', iceCells: hard ? frozenWall : hardIce, crateCells: hard ? hardCrates : crateGate }
    case 5: return { targetScore: target(4, local) + 1200, objective: 'scoreIce', iceCells: hard ? bossIce : gardenIce }
    case 6: return { targetScore: target(4, local) + 800, objective: 'scoreCrate', crateCells: hard ? bossCrates : hardCrates }
    case 7: return { targetScore: 0, objective: 'iceCrateCollect', collectType: 4, collectAmount: collect(4, local), iceCells: hard ? checkerIce : ringIce, crateCells: hard ? fortressCrates : crateMaze }
    case 8: return { targetScore: 0, objective: 'collectDouble', collectType: 0, collectAmount: collect(4, local), collectType2: 5, collectAmount2: collect(4, local) - 3 }
    default: return { targetScore: 0, objective: 'iceCrateCollect', collectType: 2, collectAmount: collect(4, local), iceCells: hard ? bossIce : frozenWall, crateCells: hard ? bossCrates : hardCrates }
  }
}

const volcanoSpec = (local: number): LevelSpec => {
  const hard = local > 10
  const slot = (local - 1) % 10
  switch (slot) {
    case 0: return { targetScore: 0, objective: 'iceCrate', iceCells: hard ? bossIce : frozenWall, crateCells: hard ? fortressCrates : hardCrates }
    case 1: return { targetScore: 0, objective: 'iceCrateCollect', collectType: 4, collectAmount: collect(5, local), iceCells: hard ? checkerIce : hardIce, crateCells: hard ? bossCrates : crateMaze }
    case 2: return { targetScore: target(5, local) + 1500, objective: 'scoreCrate', crateCells: hard ? bossCrates : fortressCrates }
    case 3: return { targetScore: target(5, local) + 1800, objective: 'scoreIce', iceCells: hard ? bossIce : checkerIce }
    case 4: return { targetScore: 0, objective: 'collectDouble', collectType: 1, collectAmount: collect(5, local), collectType2: 5, collectAmount2: collect(5, local) - 2 }
    case 5: return { targetScore: 0, objective: 'ice', iceCells: hard ? bossIce : frozenWall }
    case 6: return { targetScore: 0, objective: 'crate', crateCells: hard ? bossCrates : fortressCrates }
    case 7: return { targetScore: 0, objective: 'iceCollect', collectType: 0, collectAmount: collect(5, local), iceCells: hard ? bossIce : checkerIce }
    case 8: return { targetScore: target(5, local) + 2500, objective: 'score' }
    default: return { targetScore: 0, objective: 'iceCrateCollect', collectType: 2, collectAmount: collect(5, local) + 2, iceCells: bossIce, crateCells: bossCrates }
  }
}

const builders: Record<number, (local: number) => LevelSpec> = {
  1: gardenSpec,
  2: iceSpec,
  3: castleSpec,
  4: forestSpec,
  5: volcanoSpec,
}

export const levels: LevelConfig[] = worlds.flatMap((world) =>
  worldNames[world.id].map((name, index) => {
    const local = index + 1
    return makeLevel(world.id, local, name, movesFor(world.id, local), builders[world.id](local))
  }),
)
