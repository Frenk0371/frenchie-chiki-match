import { levels, worlds, type BoosterConfig, type LevelConfig, type ObstacleCellConfig, type WorldConfig } from "./game/levels";

type ExtendedLevelConfig = LevelConfig & {
  chainCells?: ObstacleCellConfig[];
  woodCells?: ObstacleCellConfig[];
  grassCells?: ObstacleCellConfig[];
  snowCells?: ObstacleCellConfig[];
  rockCells?: ObstacleCellConfig[];
  mudCells?: ObstacleCellConfig[];
  bananaChance?: number;
};

type ExtraObstacleKey = "chainCells" | "woodCells" | "grassCells" | "snowCells" | "rockCells" | "mudCells";

const extraWorlds: Array<Omit<WorldConfig, "firstLevel" | "lastLevel">> = [
  { id: 6, name: "Prato delle Farfalle", subtitle: "Erba alta, fiori e prime catene", theme: "garden" },
  { id: 7, name: "Caverna di Cristallo", subtitle: "Ghiaccio, neve e cristalli resistenti", theme: "ice" },
  { id: 8, name: "Villaggio di Legno", subtitle: "Tavole, casse e passaggi stretti", theme: "castle" },
  { id: 9, name: "Foresta delle Liane", subtitle: "Erba, catene e missioni intrecciate", theme: "night" },
  { id: 10, name: "Montagna Innevata", subtitle: "Neve profonda e ostacoli a più strati", theme: "ice" },
  { id: 11, name: "Ponte delle Catene", subtitle: "Catene rinforzate e poche mosse preziose", theme: "castle" },
  { id: 12, name: "Palude Frizzante", subtitle: "Fango, erba e combinazioni imprevedibili", theme: "night" },
  { id: 13, name: "Lago delle Ninfee", subtitle: "Raccolte multiple e sentieri verdi", theme: "garden" },
  { id: 14, name: "Miniera di Chiki", subtitle: "Legno, rocce e casse nella miniera", theme: "castle" },
  { id: 15, name: "Tempesta Bianca", subtitle: "Neve, ghiaccio e valanghe di ostacoli", theme: "ice" },
  { id: 16, name: "Giungla Segreta", subtitle: "Erba fitta, fango e catene nascoste", theme: "night" },
  { id: 17, name: "Fortezza delle Rocce", subtitle: "Rocce dure e barriere combinate", theme: "castle" },
  { id: 18, name: "Giardino delle Stelle", subtitle: "Combo, raccolte e ostacoli misti", theme: "garden" },
  { id: 19, name: "Gola del Vento", subtitle: "Imprevisti, catene e passaggi difficili", theme: "night" },
  { id: 20, name: "Picco delle Banane", subtitle: "Sfide dure con più occasioni di trovare banane", theme: "garden" },
  { id: 21, name: "Grotte di Lava", subtitle: "Rocce, legno e ostacoli resistenti", theme: "volcano" },
  { id: 22, name: "Regno di Neve", subtitle: "Neve profonda, ghiaccio e catene", theme: "ice" },
  { id: 23, name: "Torre delle Catene", subtitle: "Barriere rinforzate e obiettivi multipli", theme: "castle" },
  { id: 24, name: "Bosco delle Meraviglie", subtitle: "Tutti gli ostacoli iniziano a combinarsi", theme: "night" },
  { id: 25, name: "Corona di Chiki", subtitle: "Le sfide finali più complete e spettacolari", theme: "volcano" },
];

extraWorlds.forEach((world) => {
  if (worlds.some((existing) => existing.id === world.id)) return;
  worlds.push({ ...world, firstLevel: (world.id - 1) * 20 + 1, lastLevel: world.id * 20 });
});

const allPositions: Array<[number, number]> = [];
for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 7; col++) allPositions.push([row, col]);
}

const spreadCells = (seed: number, count: number, hits = 1, avoid = new Set<string>()) => {
  const result: ObstacleCellConfig[] = [];
  const used = new Set(avoid);
  let cursor = Math.abs(seed * 13 + 17) % allPositions.length;
  let guard = 0;
  while (result.length < Math.min(count, allPositions.length - used.size) && guard < 400) {
    const [row, col] = allPositions[cursor % allPositions.length];
    const key = `${row}:${col}`;
    if (!used.has(key)) {
      result.push({ row, col, hits });
      used.add(key);
    }
    cursor += 11 + (seed % 7);
    guard++;
  }
  return result;
};

const cellKeys = (cells: ObstacleCellConfig[] = []) => new Set(cells.map((cell) => `${cell.row}:${cell.col}`));

const boostersFor = (level: number): BoosterConfig[] => {
  if (level < 160) return [{ kind: "hammer", uses: 2 }, { kind: "rocket", uses: 2 }, { kind: "bomb", uses: 1 }];
  if (level < 300) return [{ kind: "hammer", uses: 2 }, { kind: "breaker", uses: 1 }, { kind: "bomb", uses: 1 }];
  if (level < 420) return [{ kind: "rocket", uses: 1 }, { kind: "breaker", uses: 1 }, { kind: "bomb", uses: 1 }];
  return [{ kind: "hammer", uses: 1 }, { kind: "breaker", uses: 1 }, { kind: "bomb", uses: 1 }];
};

const generatedName = (worldId: number, local: number) => {
  const words = [
    "Sentiero", "Raccolta", "Doppia sfida", "Barriera", "Corsa", "Trappola", "Tempesta", "Tesoro", "Labirinto", "Combo",
    "Passaggio", "Missione", "Assalto", "Percorso", "Prova", "Segreto", "Fortezza", "Imprevisto", "Sfida estrema", "Finale",
  ];
  if (local === 20) return `Finale ${worlds.find((world) => world.id === worldId)?.name ?? "di Chiki"}`;
  return `${words[(local - 1) % words.length]} di Chiki`;
};

const makeGeneratedLevel = (level: number): ExtendedLevelConfig => {
  const world = Math.ceil(level / 20);
  const local = ((level - 1) % 20) + 1;
  const tier = Math.floor((level - 101) / 80);
  const boss = local % 10 === 0;
  const moves = Math.max(16, 23 - tier - Math.floor((local - 1) / 7) + (boss ? 2 : 0));
  const targetScore = 8500 + level * 105 + world * 180;
  const amount = 12 + Math.floor(level / 38) + Math.floor(local / 7);
  const slot = (level - 1) % 11;
  const iceHits = level >= 300 ? 2 : 1;
  const crateHits = level >= 380 ? 2 : 1;
  const iceCells = spreadCells(level + 3, Math.min(18, 7 + Math.floor(level / 80)), iceHits);
  const avoidIce = cellKeys(iceCells);
  const crateCells = spreadCells(level + 19, Math.min(16, 6 + Math.floor(level / 100)), crateHits, avoidIce);

  const common = {
    level,
    world,
    name: generatedName(world, local),
    moves,
    targetScore,
    boosters: boostersFor(level),
    bananaChance: world === 20 ? 0.16 : Math.min(0.13, 0.08 + Math.floor(level / 120) * 0.01),
  };

  let base: ExtendedLevelConfig;
  switch (slot) {
    case 0: base = { ...common, objective: "score" }; break;
    case 1: base = { ...common, objective: "collect", targetScore: 0, collectType: (world + local) % 6, collectAmount: amount }; break;
    case 2: base = { ...common, objective: "collectDouble", targetScore: 0, collectType: (world + 1) % 6, collectAmount: amount - 2, collectType2: (world + 4) % 6, collectAmount2: amount - 3 }; break;
    case 3: base = { ...common, objective: "ice", targetScore: 0, iceCells }; break;
    case 4: base = { ...common, objective: "crate", targetScore: 0, crateCells }; break;
    case 5: base = { ...common, objective: "iceCollect", targetScore: 0, iceCells, collectType: (local + 2) % 6, collectAmount: amount - 2 }; break;
    case 6: base = { ...common, objective: "crateCollect", targetScore: 0, crateCells, collectType: (local + 4) % 6, collectAmount: amount - 2 }; break;
    case 7: base = { ...common, objective: "scoreIce", iceCells }; break;
    case 8: base = { ...common, objective: "scoreCrate", crateCells }; break;
    case 9: base = { ...common, objective: "iceCrate", targetScore: 0, iceCells, crateCells }; break;
    default: base = { ...common, objective: "iceCrateCollect", targetScore: 0, iceCells, crateCells, collectType: (world + local + 2) % 6, collectAmount: amount - 3 }; break;
  }

  const difficulty = Math.max(1, Math.floor(level / 70));
  const extraKinds: ExtraObstacleKey[] = ["grassCells", "snowCells", "chainCells", "woodCells", "rockCells", "mudCells"];
  const available = extraKinds.filter((kind) => {
    if (kind === "grassCells") return level >= 8;
    if (kind === "snowCells") return level >= 21;
    if (kind === "chainCells") return level >= 35;
    if (kind === "woodCells") return level >= 45;
    if (kind === "rockCells") return level >= 120;
    return level >= 170;
  });
  const kindsCount = level < 160 ? 2 : level < 260 ? 3 : level < 400 ? 4 : 5;
  const chosen = available.slice((world + local) % Math.max(1, available.length)).concat(available).filter((kind, index, array) => array.indexOf(kind) === index).slice(0, Math.min(kindsCount, available.length));
  const avoid = new Set<string>([...cellKeys(base.iceCells), ...cellKeys(base.crateCells)]);
  chosen.forEach((kind, index) => {
    const hits = level >= 420 && (kind === "rockCells" || kind === "chainCells" || kind === "woodCells") ? 3 : level >= 240 ? 2 : 1;
    const cells = spreadCells(level * (index + 3), Math.min(12, 4 + difficulty + (boss ? 2 : 0)), hits, avoid);
    cells.forEach((cell) => avoid.add(`${cell.row}:${cell.col}`));
    base[kind] = cells;
  });

  return base;
};

for (let level = Math.max(101, levels.length + 1); level <= 500; level++) {
  levels.push(makeGeneratedLevel(level));
}

// Introduce the new obstacles gently in the original campaign without changing completed progress.
levels.slice(0, 100).forEach((raw) => {
  const level = raw as ExtendedLevelConfig;
  level.bananaChance = level.level < 15 ? 0.05 : 0.08;
  const occupied = new Set<string>([...cellKeys(level.iceCells), ...cellKeys(level.crateCells)]);
  const add = (key: ExtraObstacleKey, minLevel: number, modulo: number, count: number, hits = 1) => {
    if (level.level < minLevel || level.level % modulo !== 0 || level[key]?.length) return;
    const cells = spreadCells(level.level * modulo, count, hits, occupied);
    cells.forEach((cell) => occupied.add(`${cell.row}:${cell.col}`));
    level[key] = cells;
  };
  add("grassCells", 8, 4, 5);
  add("snowCells", 21, 5, 6);
  add("chainCells", 35, 6, 5, level.level >= 80 ? 2 : 1);
  add("woodCells", 45, 7, 6, level.level >= 90 ? 2 : 1);
});
