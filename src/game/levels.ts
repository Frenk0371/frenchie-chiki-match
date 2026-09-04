export type ObstacleCellConfig = {
  row: number;
  col: number;
  hits?: number;
};

export type BoosterKind = 'shuffle' | 'hammer' | 'rocket' | 'bomb' | 'breaker';

export type BoosterConfig = {
  kind: BoosterKind;
  uses: number;
};

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
  | 'iceCrateCollect';

export type LevelConfig = {
  level: number;
  world: number;
  name: string;
  moves: number;
  targetScore: number;
  objective: LevelObjective;
  collectType?: number;
  collectAmount?: number;
  collectType2?: number;
  collectAmount2?: number;
  iceCells?: ObstacleCellConfig[];
  crateCells?: ObstacleCellConfig[];
  chainCells?: ObstacleCellConfig[];
  woodCells?: ObstacleCellConfig[];
  grassCells?: ObstacleCellConfig[];
  snowCells?: ObstacleCellConfig[];
  rockCells?: ObstacleCellConfig[];
  mudCells?: ObstacleCellConfig[];
  bananaChance?: number;
  boosters: BoosterConfig[];
};

export type WorldConfig = {
  id: number;
  name: string;
  subtitle: string;
  firstLevel: number;
  lastLevel: number;
  theme: 'garden' | 'ice' | 'castle' | 'night' | 'volcano';
};

type ExtraObstacleKey = 'chainCells' | 'woodCells' | 'grassCells' | 'snowCells' | 'rockCells' | 'mudCells';

const makeWorld = (
  id: number,
  name: string,
  subtitle: string,
  theme: WorldConfig['theme'],
): WorldConfig => ({
  id,
  name,
  subtitle,
  firstLevel: (id - 1) * 20 + 1,
  lastLevel: id * 20,
  theme,
});

export const worlds: WorldConfig[] = [
  makeWorld(1, 'Giardino Fiorito', 'Impara, raccogli e scopri i primi ostacoli', 'garden'),
  makeWorld(2, 'Valle Gelata', 'Ghiaccio, neve e mosse sempre più preziose', 'ice'),
  makeWorld(3, 'Castello di Chiki', 'Casse, legno e missioni a più obiettivi', 'castle'),
  makeWorld(4, 'Bosco Incantato', 'Erba, catene e combinazioni sempre più ragionate', 'night'),
  makeWorld(5, 'Vulcano di Chiki', 'Rocce, fango e ostacoli resistenti', 'volcano'),
  makeWorld(6, 'Prato delle Farfalle', 'Erba alta, fiori e prime catene', 'garden'),
  makeWorld(7, 'Caverna di Cristallo', 'Ghiaccio, neve e cristalli resistenti', 'ice'),
  makeWorld(8, 'Villaggio di Legno', 'Tavole, casse e passaggi stretti', 'castle'),
  makeWorld(9, 'Foresta delle Liane', 'Erba, catene e missioni intrecciate', 'night'),
  makeWorld(10, 'Montagna Innevata', 'Neve profonda e ostacoli a più strati', 'ice'),
  makeWorld(11, 'Ponte delle Catene', 'Catene rinforzate e poche mosse preziose', 'castle'),
  makeWorld(12, 'Palude Frizzante', 'Fango, erba e combinazioni imprevedibili', 'night'),
  makeWorld(13, 'Lago delle Ninfee', 'Raccolte multiple e sentieri verdi', 'garden'),
  makeWorld(14, 'Miniera di Chiki', 'Legno, rocce e casse nella miniera', 'castle'),
  makeWorld(15, 'Tempesta Bianca', 'Neve, ghiaccio e barriere sempre più dure', 'ice'),
  makeWorld(16, 'Giungla Segreta', 'Erba fitta, fango e catene nascoste', 'night'),
  makeWorld(17, 'Fortezza delle Rocce', 'Rocce dure e barriere combinate', 'castle'),
  makeWorld(18, 'Giardino delle Stelle', 'Combo, raccolte e ostacoli misti', 'garden'),
  makeWorld(19, 'Gola del Vento', 'Catene, rocce e passaggi difficili', 'night'),
  makeWorld(20, 'Picco delle Banane', 'Sfide dure con più occasioni di trovare banane', 'garden'),
  makeWorld(21, 'Grotte di Lava', 'Rocce, legno e fango a più strati', 'volcano'),
  makeWorld(22, 'Regno di Neve', 'Neve profonda, ghiaccio e catene', 'ice'),
  makeWorld(23, 'Torre delle Catene', 'Barriere rinforzate e obiettivi multipli', 'castle'),
  makeWorld(24, 'Bosco delle Meraviglie', 'Quasi tutti gli ostacoli si combinano', 'night'),
  makeWorld(25, 'Corona di Chiki', 'La sfida finale con tutti gli ostacoli', 'volcano'),
];

const POSITIONS: Array<[number, number]> = [];
for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 7; col++) POSITIONS.push([row, col]);
}

const cellKey = (row: number, col: number) => `${row}:${col}`;

const spreadCells = (
  seed: number,
  count: number,
  hits = 1,
  occupied = new Set<string>(),
): ObstacleCellConfig[] => {
  const result: ObstacleCellConfig[] = [];
  const used = new Set(occupied);
  let cursor = Math.abs(seed * 17 + 29) % POSITIONS.length;
  let guard = 0;

  while (result.length < Math.min(count, POSITIONS.length - used.size) && guard < 500) {
    const [row, col] = POSITIONS[cursor % POSITIONS.length];
    const key = cellKey(row, col);
    if (!used.has(key)) {
      result.push({ row, col, hits });
      used.add(key);
    }
    cursor += 7 + ((seed + guard) % 13);
    guard++;
  }

  return result;
};

const WORLD_OBSTACLES: Record<number, ExtraObstacleKey[]> = {
  1: ['grassCells'],
  2: ['snowCells', 'grassCells'],
  3: ['woodCells', 'chainCells'],
  4: ['grassCells', 'chainCells', 'woodCells'],
  5: ['rockCells', 'mudCells', 'woodCells'],
  6: ['grassCells', 'chainCells'],
  7: ['snowCells', 'rockCells', 'chainCells'],
  8: ['woodCells', 'chainCells', 'rockCells'],
  9: ['grassCells', 'chainCells', 'mudCells'],
  10: ['snowCells', 'rockCells', 'chainCells'],
  11: ['chainCells', 'woodCells', 'rockCells'],
  12: ['mudCells', 'grassCells', 'woodCells'],
  13: ['grassCells', 'mudCells', 'chainCells'],
  14: ['woodCells', 'rockCells', 'chainCells'],
  15: ['snowCells', 'rockCells', 'chainCells', 'woodCells'],
  16: ['grassCells', 'mudCells', 'chainCells', 'woodCells'],
  17: ['rockCells', 'woodCells', 'chainCells', 'mudCells'],
  18: ['grassCells', 'snowCells', 'chainCells', 'rockCells'],
  19: ['chainCells', 'rockCells', 'mudCells', 'woodCells'],
  20: ['grassCells', 'rockCells', 'mudCells', 'snowCells', 'chainCells'],
  21: ['rockCells', 'woodCells', 'mudCells', 'chainCells', 'grassCells'],
  22: ['snowCells', 'chainCells', 'rockCells', 'woodCells', 'grassCells'],
  23: ['chainCells', 'woodCells', 'rockCells', 'mudCells', 'snowCells'],
  24: ['grassCells', 'snowCells', 'chainCells', 'woodCells', 'rockCells', 'mudCells'],
  25: ['grassCells', 'snowCells', 'chainCells', 'woodCells', 'rockCells', 'mudCells'],
};

const LEVEL_NAMES = [
  'Prime mosse', 'Pioggia di punti', 'Raccolta verde', 'Doppia raccolta', 'Sfida di Chiki',
  'Gelo leggero', 'Sentiero gelato', 'Trappola nascosta', 'Casse sul percorso', 'Prova del mondo',
  'Passaggio segreto', 'Raccolta difficile', 'Barriera rinforzata', 'Labirinto di Chiki', 'Corsa contro le mosse',
  'Fortezza', 'Doppia barriera', 'Tempesta', 'Sfida estrema', 'Finale del mondo',
];

const OBJECTIVES: LevelObjective[] = [
  'score', 'score', 'collect', 'collectDouble', 'score',
  'ice', 'iceCollect', 'scoreIce', 'crate', 'crateCollect',
  'iceCrate', 'collectDouble', 'scoreCrate', 'iceCrateCollect', 'score',
  'ice', 'crateCollect', 'iceCrate', 'scoreIce', 'iceCrateCollect',
];

const boostersFor = (level: number): BoosterConfig[] => {
  if (level <= 40) return [
    { kind: 'shuffle', uses: 3 }, { kind: 'hammer', uses: 3 }, { kind: 'rocket', uses: 2 },
  ];
  if (level <= 120) return [
    { kind: 'shuffle', uses: 2 }, { kind: 'hammer', uses: 2 }, { kind: 'rocket', uses: 2 },
  ];
  if (level <= 240) return [
    { kind: 'hammer', uses: 2 }, { kind: 'breaker', uses: 2 }, { kind: 'bomb', uses: 1 },
  ];
  if (level <= 380) return [
    { kind: 'hammer', uses: 1 }, { kind: 'breaker', uses: 2 }, { kind: 'bomb', uses: 1 },
  ];
  return [
    { kind: 'rocket', uses: 1 }, { kind: 'breaker', uses: 1 }, { kind: 'bomb', uses: 1 },
  ];
};

const needsIce = (objective: LevelObjective) =>
  objective === 'ice' || objective === 'iceCollect' || objective === 'scoreIce' || objective === 'iceCrate' || objective === 'iceCrateCollect';

const needsCrates = (objective: LevelObjective) =>
  objective === 'crate' || objective === 'crateCollect' || objective === 'scoreCrate' || objective === 'iceCrate' || objective === 'iceCrateCollect';

const extraKindsForWorld = (worldId: number) => {
  if (worldId <= 3) return 1;
  if (worldId <= 7) return 2;
  if (worldId <= 13) return 3;
  if (worldId <= 19) return 4;
  if (worldId <= 23) return 5;
  return 6;
};

const hitsFor = (worldId: number, local: number, kind: ExtraObstacleKey) => {
  const boss = local === 10 || local === 20;
  if (worldId <= 4) return 1;
  if (worldId <= 9) return boss ? 2 : 1;
  if (worldId <= 16) return 2;
  if (worldId <= 21) return boss ? 3 : 2;
  if ((kind === 'grassCells' || kind === 'mudCells') && !boss) return 2;
  return 3;
};

const movesFor = (worldId: number, local: number) => {
  const worldPressure = Math.floor((worldId - 1) / 3);
  const localPressure = Math.floor((local - 1) / 6);
  const bossBonus = local === 10 || local === 20 ? 2 : 0;
  return Math.max(14, 25 - worldPressure - localPressure + bossBonus);
};

const scoreTargetFor = (level: number, worldId: number, local: number) =>
  3500 + level * 95 + worldId * 180 + (local === 20 ? 1800 : 0);

const collectTargetFor = (level: number, local: number) =>
  7 + Math.floor(level / 28) + Math.floor(local / 5);

const bananaChanceFor = (worldId: number, level: number) => {
  if (worldId === 20) return 0.16;
  if (worldId >= 24) return 0.12;
  return Math.min(0.11, 0.055 + Math.floor(level / 100) * 0.01);
};

const makeLevel = (level: number): LevelConfig => {
  const worldId = Math.ceil(level / 20);
  const local = ((level - 1) % 20) + 1;
  const objective = OBJECTIVES[local - 1];
  const hasScoreGoal = objective === 'score' || objective === 'scoreIce' || objective === 'scoreCrate';

  const config: LevelConfig = {
    level,
    world: worldId,
    name: local === 20 ? `Finale ${worlds[worldId - 1].name}` : LEVEL_NAMES[local - 1],
    moves: movesFor(worldId, local),
    targetScore: hasScoreGoal ? scoreTargetFor(level, worldId, local) : 0,
    objective,
    bananaChance: bananaChanceFor(worldId, level),
    boosters: boostersFor(level),
  };

  const collectAmount = collectTargetFor(level, local);
  if (objective === 'collect' || objective === 'iceCollect' || objective === 'crateCollect' || objective === 'iceCrateCollect') {
    config.collectType = (worldId + local) % 6;
    config.collectAmount = collectAmount;
  }
  if (objective === 'collectDouble') {
    config.collectType = (worldId + local) % 6;
    config.collectAmount = collectAmount;
    config.collectType2 = (worldId + local + 3) % 6;
    config.collectAmount2 = Math.max(5, collectAmount - 2);
  }

  const occupied = new Set<string>();

  if (needsIce(objective)) {
    const count = Math.min(14, 5 + Math.floor(worldId / 4) + (local >= 15 ? 2 : 0));
    const hits = worldId >= 15 ? 2 : worldId >= 8 && (local === 10 || local === 20) ? 2 : 1;
    config.iceCells = spreadCells(level + 11, count, hits, occupied);
    config.iceCells.forEach((cell) => occupied.add(cellKey(cell.row, cell.col)));
  }

  if (needsCrates(objective)) {
    const count = Math.min(13, 5 + Math.floor(worldId / 5) + (local >= 16 ? 2 : 0));
    const hits = worldId >= 18 ? 2 : worldId >= 10 && local === 20 ? 2 : 1;
    config.crateCells = spreadCells(level + 37, count, hits, occupied);
    config.crateCells.forEach((cell) => occupied.add(cellKey(cell.row, cell.col)));
  }

  const pool = WORLD_OBSTACLES[worldId] ?? [];
  const available = pool.filter((kind) => {
    if (worldId === 1 && kind === 'grassCells') return local >= 8;
    if (worldId === 2 && kind === 'snowCells') return local >= 2;
    if (worldId === 3 && kind === 'woodCells') return local >= 3;
    return true;
  });

  const start = available.length > 0 ? (local - 1) % available.length : 0;
  const rotated = available.length > 0
    ? [...available.slice(start), ...available.slice(0, start)]
    : [];

  rotated.slice(0, Math.min(extraKindsForWorld(worldId), available.length)).forEach((kind, index) => {
    const baseCount = 3 + Math.floor(worldId / 5) + Math.floor((local - 1) / 8);
    const bossExtra = local === 10 || local === 20 ? 2 : 0;
    const cells = spreadCells(
      level * (index + 3) + worldId,
      Math.min(8, baseCount + bossExtra),
      hitsFor(worldId, local, kind),
      occupied,
    );
    cells.forEach((cell) => occupied.add(cellKey(cell.row, cell.col)));
    config[kind] = cells;
  });

  return config;
};

export const levels: LevelConfig[] = Array.from({ length: 500 }, (_, index) => makeLevel(index + 1));
