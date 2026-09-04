import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import GameScene from "./game/GameScene";
import { levels, worlds } from "./game/levels";
import PetHub from "./PetHub";
import { type ShopItem } from "./shopCatalog";
import {
  claimLevelReward,
  fetchLeaderboard,
  purchaseShopItem,
  saveCloudProgress,
  type LeaderboardEntry,
} from "./cloudClient";
import "./App.css";
import "./Map.css";

type AppView = "home" | "map" | "game" | "leaderboard" | "frenchies";

type AppProps = {
  username: string;
  onSignOut: () => void | Promise<void>;
};

const menuItems = [
  { icon: "/menu-adventure.png", label: "AVVENTURA", view: "map" as AppView },
  { icon: "/menu-trophy.png", label: "CLASSIFICHE", view: "leaderboard" as AppView },
  { icon: "/tiles/chiki.png", label: "FRENCHIES", view: "frenchies" as AppView },
];

const STARTER_INVENTORY = ["outfit_classic", "bed_basic", "bowl_basic", "wall_sky", "floor_wood"];
const STARTER_EQUIPPED: Record<string, string> = {
  outfit: "outfit_classic",
  bed: "bed_basic",
  bowl: "bowl_basic",
  wall: "wall_sky",
  floor: "floor_wood",
};

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const loadLevelStars = (): Record<number, number> => loadJson("chiki-level-stars", {});

const loadUnlockedLevel = () => {
  const saved = Number(localStorage.getItem("chiki-unlocked-level") || "1");
  const stars = loadLevelStars();
  let migrated = Math.min(levels.length, Math.max(1, saved));

  while (migrated < levels.length && (stars[migrated] || 0) > 0) migrated++;
  return migrated;
};

const worldForLevel = (level: number) =>
  worlds.find((world) => level >= world.firstLevel && level <= world.lastLevel) ?? worlds[0];

function App({ username, onSignOut }: AppProps) {
  const gameContainer = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<AppView>("home");
  const [notice, setNotice] = useState("");
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [unlockedLevel, setUnlockedLevel] = useState(loadUnlockedLevel);
  const [selectedWorld, setSelectedWorld] = useState(() => worldForLevel(loadUnlockedLevel()).id);
  const [levelStars, setLevelStars] = useState<Record<number, number>>(loadLevelStars);
  const [selectedOutfit, setSelectedOutfit] = useState(
    () => localStorage.getItem("chiki-outfit") || "Classico",
  );
  const [coins, setCoins] = useState(() => Math.max(0, Number(localStorage.getItem("chiki-coins") || "500")));
  const [inventory, setInventory] = useState<string[]>(() => loadJson("chiki-inventory", [...STARTER_INVENTORY]));
  const [equipped, setEquipped] = useState<Record<string, string>>(() => loadJson("chiki-equipped", { ...STARTER_EQUIPPED }));
  const [roomState, setRoomState] = useState<Record<string, string | number>>(() => loadJson("chiki-room-state", {}));
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");

  useEffect(() => {
    if (view !== "game" || !gameContainer.current) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 1080,
      height: 1920,
      parent: gameContainer.current,
      backgroundColor: "#87CEEB",
      scene: [new GameScene(selectedLevel)],
      scale: {
        mode: Phaser.Scale.ENVELOP,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    });
    return () => game.destroy(true);
  }, [view, selectedLevel]);

  useEffect(() => {
    const completed = (event: Event) => {
      const { level, stars } = (
        event as CustomEvent<{ level: number; stars: number }>
      ).detail;

      setLevelStars((current) => {
        const updated = { ...current, [level]: Math.max(current[level] || 0, stars) };
        localStorage.setItem("chiki-level-stars", JSON.stringify(updated));
        return updated;
      });

      setUnlockedLevel((current) => {
        const unlocked = Math.max(current, Math.min(levels.length, level + 1));
        localStorage.setItem("chiki-unlocked-level", String(unlocked));
        return unlocked;
      });

      const nextWorld = worlds.find((world) => world.firstLevel === level + 1);
      if (nextWorld) setSelectedWorld(nextWorld.id);

      void claimLevelReward(level, stars)
        .then((result) => {
          setCoins(result.new_coins);
          if (result.reward > 0) {
            setNotice(`+${result.reward} 🪙 MONETE CHIKI!`);
            window.setTimeout(() => setNotice(""), 2400);
          }
        })
        .catch(() => {
          // I progressi di gioco restano salvati anche se la ricompensa cloud e' temporaneamente offline.
        });
    };

    window.addEventListener("chiki-level-complete", completed);
    return () => window.removeEventListener("chiki-level-complete", completed);
  }, []);

  useEffect(() => {
    localStorage.setItem("chiki-coins", String(coins));
    localStorage.setItem("chiki-inventory", JSON.stringify(inventory));
    localStorage.setItem("chiki-equipped", JSON.stringify(equipped));
    localStorage.setItem("chiki-room-state", JSON.stringify(roomState));
  }, [coins, inventory, equipped, roomState]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void saveCloudProgress({
        unlocked_level: unlockedLevel,
        level_stars: levelStars,
        selected_outfit: selectedOutfit,
        coins,
        inventory,
        equipped,
        room_state: roomState,
      }).catch(() => {
        // Il salvataggio locale resta disponibile anche se temporaneamente offline.
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [unlockedLevel, levelStars, selectedOutfit, coins, inventory, equipped, roomState]);

  useEffect(() => {
    if (view !== "leaderboard") return;
    let active = true;
    setLeaderboardLoading(true);
    setLeaderboardError("");

    const load = async () => {
      try {
        await saveCloudProgress({
          unlocked_level: unlockedLevel,
          level_stars: levelStars,
          selected_outfit: selectedOutfit,
          coins,
          inventory,
          equipped,
          room_state: roomState,
        });
        const rows = await fetchLeaderboard();
        if (active) setLeaderboard(rows);
      } catch {
        if (active) setLeaderboardError("Classifica non disponibile. Riprova tra poco.");
      } finally {
        if (active) setLeaderboardLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [view, unlockedLevel, levelStars, selectedOutfit, coins, inventory, equipped, roomState]);

  const soon = (label: string) => {
    setNotice(`${label}: prossimamente`);
    window.setTimeout(() => setNotice(""), 1800);
  };

  const playLevel = (level: number) => {
    setSelectedLevel(level);
    setView("game");
  };

  const selectWorld = (worldId: number) => {
    const world = worlds.find((item) => item.id === worldId);
    if (!world) return;
    if (world.firstLevel > unlockedLevel) {
      setNotice(`Completa il Mondo ${world.id - 1} per sbloccarlo`);
      window.setTimeout(() => setNotice(""), 1800);
      return;
    }
    setSelectedWorld(worldId);
  };

  const buyItem = async (item: ShopItem) => {
    const result = await purchaseShopItem(item.id);
    setCoins(result.new_coins);
    setInventory(result.new_inventory);
  };

  const equipItem = (item: ShopItem) => {
    if (!inventory.includes(item.id)) return;
    setEquipped((current) => ({ ...current, [item.slot]: item.id }));
    if (item.slot === "outfit") {
      setSelectedOutfit(item.name);
      localStorage.setItem("chiki-outfit", item.name);
    }
  };

  const clearSlot = (slot: string) => {
    if (["outfit", "bed", "bowl", "wall", "floor"].includes(slot)) return;
    setEquipped((current) => {
      const updated = { ...current };
      delete updated[slot];
      return updated;
    });
  };

  const totalStars = Object.values(levelStars).reduce((sum, stars) => sum + stars, 0);

  if (view === "leaderboard") {
    const myPosition = leaderboard.findIndex(
      (player) => player.username.toLowerCase() === username.toLowerCase(),
    ) + 1;

    return (
      <main className="feature-screen leaderboard-screen">
        <header className="feature-title">
          <button onClick={() => setView("home")} aria-label="Torna alla home">‹</button>
          <div>
            <small>FRENCHIE CHIKI MATCH</small>
            <strong>CLASSIFICA GENERALE</strong>
          </div>
          <span>🏆</span>
        </header>
        <section className="ranking-board">
          <h2>🏆 CLASSIFICA GENERALE</h2>
          <nav className="ranking-tabs">
            <button className="active">GENERALE</button>
            <button>LIVELLO</button>
            <button>STELLE</button>
            <button>SFIDA</button>
          </nav>

          {leaderboardLoading && <div className="leaderboard-empty">AGGIORNAMENTO CLASSIFICA…</div>}
          {!leaderboardLoading && leaderboardError && (
            <div className="leaderboard-empty">{leaderboardError}</div>
          )}
          {!leaderboardLoading && !leaderboardError && leaderboard.length === 0 && (
            <div className="leaderboard-empty">NESSUN GIOCATORE REGISTRATO</div>
          )}

          {!leaderboardLoading && leaderboard.length > 0 && (
            <div className="ranking-list">
              {leaderboard.map((player, index) => {
                const isMe = player.username.toLowerCase() === username.toLowerCase();
                return (
                  <article className={isMe ? "me" : ""} key={player.username}>
                    <b>{index + 1}</b>
                    {isMe ? (
                      <img src="/chiki-icon.jpeg" alt="Il tuo profilo" />
                    ) : (
                      <span>{player.username.slice(0, 1).toUpperCase()}</span>
                    )}
                    <strong>{player.username}</strong>
                    <em>{player.score.toLocaleString("it-IT")}</em>
                  </article>
                );
              })}
            </div>
          )}

          <div className="my-position">
            LA TUA POSIZIONE
            <strong>{myPosition > 0 ? `#${myPosition}` : "—"}</strong>
            <small>{username} · Livello {unlockedLevel} · {totalStars} stelle</small>
          </div>
        </section>
      </main>
    );
  }

  if (view === "frenchies") {
    return (
      <PetHub
        username={username}
        unlockedLevel={unlockedLevel}
        totalStars={totalStars}
        coins={coins}
        inventory={inventory}
        equipped={equipped}
        onBack={() => setView("home")}
        onBuy={buyItem}
        onEquip={equipItem}
        onClearSlot={clearSlot}
      />
    );
  }

  if (view === "game") {
    return (
      <div className="game-shell">
        <button className="home-back" onClick={() => setView("map")} aria-label="Torna alla mappa">‹</button>
        <div ref={gameContainer} className="game-container" />
        {notice && <div className="toast" role="status">{notice}</div>}
      </div>
    );
  }

  if (view === "map") {
    const currentWorld = worlds.find((world) => world.id === selectedWorld) ?? worlds[0];
    const worldLevels = levels.filter((config) => config.world === currentWorld.id);
    const worldStars = worldLevels.reduce((sum, config) => sum + (levelStars[config.level] || 0), 0);
    const maxWorldStars = worldLevels.length * 3;

    return (
      <main className={`map-screen world-${currentWorld.id}`}>
        <header className="map-title">
          <button onClick={() => setView("home")} aria-label="Torna alla home">‹</button>
          <div>
            <small>MONDO {currentWorld.id}</small>
            <strong>{currentWorld.name.toUpperCase()}</strong>
          </div>
          <span>⭐ {worldStars}/{maxWorldStars}</span>
        </header>

        <nav className="world-switcher" aria-label="Seleziona mondo">
          {worlds.map((world) => {
            const locked = world.firstLevel > unlockedLevel;
            return (
              <button
                key={world.id}
                className={`${world.id === currentWorld.id ? "active" : ""} ${locked ? "locked" : ""}`}
                onClick={() => selectWorld(world.id)}
              >
                <b>{world.id}</b>
                <span>{world.name}</span>
                <em>{locked ? "LOCK" : `${world.firstLevel}-${world.lastLevel}`}</em>
              </button>
            );
          })}
        </nav>

        <div className={`adventure-path world-theme-${currentWorld.theme}`}>
          <p className="world-subtitle">{currentWorld.subtitle}</p>
          {worldLevels.map((config) => {
            const level = config.level;
            const locked = level > unlockedLevel;
            const hasIce = (config.iceCells?.length ?? 0) > 0;
            const hasCrates = (config.crateCells?.length ?? 0) > 0;

            return (
              <div className={`level-stop ${locked ? "locked" : ""}`} key={level}>
                <button disabled={locked} onClick={() => playLevel(level)}>
                  {locked ? <img src="/level-lock-v2.png" alt="" aria-hidden="true" /> : level}
                </button>
                <span>
                  <em>
                    LIVELLO {level}{hasIce ? " · ❄" : ""}{hasCrates ? " · ▣" : ""}
                  </em>
                  <strong>{locked ? "DA SBLOCCARE" : config.name.toUpperCase()}</strong>
                  {!locked && (
                    <small className="level-stars">
                      {[1, 2, 3].map((star) => star <= (levelStars[level] || 0) ? "⭐" : "☆")}
                    </small>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        {notice && <div className="toast" role="status">{notice}</div>}
      </main>
    );
  }

  return (
    <main className="home-screen">
      <div className="sky-glow" />
      <div className="home-wallet">🪙 {coins.toLocaleString("it-IT")}</div>
      <section className="brand-panel" aria-label="Frenchie Chiki Match">
        <h1 className="game-logo">
          <span>FRENCHIE</span>
          <strong>CHIKI</strong>
          <em>MATCH</em>
        </h1>
        <p className="brand-ribbon">L’AVVENTURA PUZZLE PIÙ TENERA!</p>
        <img src="/chiki-character.webp" alt="Chiki" className="chiki-hero" />
        <button className="play-button" onClick={() => setView("map")}>GIOCA</button>
      </section>
      <nav className="main-menu" aria-label="Menu del gioco">
        {menuItems.map((item) => (
          <button key={item.label} className="available" onClick={() => setView(item.view)}>
            <span><img src={item.icon} alt="" aria-hidden="true" /></span>
            {item.label}
          </button>
        ))}
      </nav>
      <nav className="utility-menu" aria-label="Altre funzioni">
        {[
          ["📅", "EVENTI"],
          ["✉️", "MESSAGGI"],
          ["👥", "AMICI"],
          ["⚙️", "IMPOSTAZIONI"],
        ].map(([icon, label]) => (
          <button key={label} onClick={() => soon(label)}>
            <span>{icon}</span>
            <small>{label}</small>
          </button>
        ))}
      </nav>
      <button className="home-account" onClick={() => void onSignOut()}>
        <span>👤 {username}</span>
        <small>ESCI</small>
      </button>
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}

export default App;
