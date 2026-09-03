import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import GameScene from "./game/GameScene";
import "./App.css";
import "./Map.css";

type AppView = "home" | "map" | "game" | "leaderboard" | "frenchies";

const menuItems = [
  { icon: "🗺️", label: "AVVENTURA", view: "map" as AppView },
  { icon: "🏆", label: "CLASSIFICHE", view: "leaderboard" as AppView },
  { icon: "🐶", label: "FRENCHIES", view: "frenchies" as AppView },
];

const wardrobe = [
  { icon: "✨", name: "Classico" },
  { icon: "🧢", name: "Sportivo" },
  { icon: "👑", name: "Re Chiki" },
  { icon: "🎩", name: "Elegante" },
  { icon: "😎", name: "Cool" },
  { icon: "🐰", name: "Coniglietto" },
];

const levelNames = [
  "Prime mosse",
  "Pioggia di punti",
  "Raccolta verde",
  "Doppia raccolta",
  "Sfida di Chiki",
];

const loadLevelStars = (): Record<number, number> => {
  try {
    return JSON.parse(localStorage.getItem("chiki-level-stars") || "{}");
  } catch {
    return {};
  }
};

function App() {
  const gameContainer = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<AppView>("home");
  const [notice, setNotice] = useState("");
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [unlockedLevel, setUnlockedLevel] = useState(() =>
    Number(localStorage.getItem("chiki-unlocked-level") || "1"),
  );
  const [levelStars, setLevelStars] =
    useState<Record<number, number>>(loadLevelStars);
  const [selectedOutfit, setSelectedOutfit] = useState(
    () => localStorage.getItem("chiki-outfit") || "Classico",
  );

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
        const updated = {
          ...current,
          [level]: Math.max(current[level] || 0, stars),
        };
        localStorage.setItem("chiki-level-stars", JSON.stringify(updated));
        return updated;
      });
      setUnlockedLevel((current) => {
        const unlocked = Math.max(current, Math.min(5, level + 1));
        localStorage.setItem("chiki-unlocked-level", String(unlocked));
        return unlocked;
      });
    };
    window.addEventListener("chiki-level-complete", completed);
    return () => window.removeEventListener("chiki-level-complete", completed);
  }, []);

  const soon = (label: string) => {
    setNotice(`${label}: prossimamente`);
    window.setTimeout(() => setNotice(""), 1800);
  };

  const playLevel = (level: number) => {
    setSelectedLevel(level);
    setView("game");
  };

  const totalStars = Object.values(levelStars).reduce(
    (sum, stars) => sum + stars,
    0,
  );

  if (view === "leaderboard") {
    const players = [
      { name: "Marty", score: 68400, avatar: "🐕" },
      { name: "Luna", score: 55200, avatar: "🐶" },
      { name: "Rocky", score: 41900, avatar: "🐾" },
      { name: "Bulldog King", score: 33750, avatar: "🦴" },
      {
        name: "Chiki",
        score: totalStars * 5000 + unlockedLevel * 1200,
        avatar: "chiki",
      },
    ].sort((a, b) => b.score - a.score);
    const myPosition =
      players.findIndex((player) => player.name === "Chiki") + 1;

    return (
      <main className="feature-screen leaderboard-screen">
        <header className="feature-title">
          <button onClick={() => setView("home")} aria-label="Torna alla home">
            ‹
          </button>
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
          <div className="ranking-list">
            {players.map((player, index) => (
              <article
                className={player.name === "Chiki" ? "me" : ""}
                key={player.name}
              >
                <b>{index + 1}</b>
                {player.avatar === "chiki" ? (
                  <img src="/chiki-icon.jpeg" alt="Chiki" />
                ) : (
                  <span>{player.avatar}</span>
                )}
                <strong>{player.name}</strong>
                <em>{player.score.toLocaleString("it-IT")}</em>
              </article>
            ))}
          </div>
          <div className="my-position">
            LA TUA POSIZIONE <strong>#{myPosition}</strong>
          </div>
        </section>
      </main>
    );
  }

  if (view === "frenchies") {
    const active =
      wardrobe.find((item) => item.name === selectedOutfit) ?? wardrobe[0];
    return (
      <main className="feature-screen frenchies-screen">
        <header className="feature-title">
          <button onClick={() => setView("home")} aria-label="Torna alla home">
            ‹
          </button>
          <div>
            <small>IL TUO AMICO</small>
            <strong>CHIKI</strong>
          </div>
          <span>🐾</span>
        </header>
        <section className="pet-card">
          <div className="pet-portrait">
            <img src="/chiki-character.webp" alt="Chiki" />
            <span>{active.icon}</span>
          </div>
          <div>
            <h2>Chiki</h2>
            <p>
              Livello {unlockedLevel} · {totalStars} stelle
            </p>
            <b>{active.name}</b>
          </div>
        </section>
        <h2 className="wardrobe-title">GUARDAROBA</h2>
        <section className="wardrobe-grid">
          {wardrobe.map((item) => (
            <button
              className={selectedOutfit === item.name ? "selected" : ""}
              key={item.name}
              onClick={() => {
                setSelectedOutfit(item.name);
                localStorage.setItem("chiki-outfit", item.name);
              }}
            >
              <span>{item.icon}</span>
              <strong>{item.name}</strong>
              {selectedOutfit === item.name && <em>✓</em>}
            </button>
          ))}
        </section>
        <div className="collection-progress">
          <strong>COLLEZIONE</strong>
          <span>{wardrobe.length}/6 elementi</span>
          <div>
            <i />
          </div>
        </div>
      </main>
    );
  }

  if (view === "game") {
    return (
      <div className="game-shell">
        <button
          className="home-back"
          onClick={() => setView("map")}
          aria-label="Torna alla mappa"
        >
          ‹
        </button>
        <div ref={gameContainer} className="game-container" />
      </div>
    );
  }

  if (view === "map") {
    return (
      <main className="map-screen">
        <header className="map-title">
          <button onClick={() => setView("home")} aria-label="Torna alla home">
            ‹
          </button>
          <div>
            <small>MONDO 1</small>
            <strong>GIARDINO FIORITO</strong>
          </div>
          <span>⭐ {totalStars}/15</span>
        </header>
        <div className="adventure-path">
          {levelNames.map((name, index) => {
            const level = index + 1;
            const locked = level > unlockedLevel;
            return (
              <div
                className={`level-stop ${locked ? "locked" : ""}`}
                key={level}
              >
                <button disabled={locked} onClick={() => playLevel(level)}>
                  {locked ? (
                    <img src="/level-lock-v2.png" alt="" aria-hidden="true" />
                  ) : (
                    level
                  )}
                </button>
                <span>
                  <em>LIVELLO {level}</em>
                  <strong>{locked ? "DA SBLOCCARE" : name.toUpperCase()}</strong>
                  {!locked && (
                    <small className="level-stars">
                      {[1, 2, 3].map((star) =>
                        star <= (levelStars[level] || 0) ? "⭐" : "☆",
                      )}
                    </small>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </main>
    );
  }

  return (
    <main className="home-screen">
      <div className="sky-glow" />
      <header className="player-bar">
        <div className="player">
          <img src="/chiki-icon.jpeg" alt="Chiki" />
          <span>
            <strong>Chiki</strong>
            <small>Livello {unlockedLevel}</small>
          </span>
        </div>
        <div className="currencies">
          <span>❤️ 5</span>
          <span>🪙 1.250</span>
        </div>
      </header>
      <section className="brand-panel" aria-label="Frenchie Chiki Match">
        <h1 className="game-logo">
          <span>FRENCHIE</span>
          <strong>CHIKI</strong>
          <em>MATCH</em>
        </h1>
        <img src="/chiki-character.webp" alt="Chiki" className="chiki-hero" />
        <button className="play-button" onClick={() => setView("map")}>
          🐾 GIOCA
        </button>
      </section>
      <nav className="main-menu" aria-label="Menu del gioco">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className="available"
            onClick={() => setView(item.view)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <nav className="utility-menu" aria-label="Altre funzioni">
        {["📅 EVENTI", "✉️ MESSAGGI", "👥 AMICI", "⚙️ IMPOSTAZIONI"].map(
          (item) => (
            <button key={item} onClick={() => soon(item.slice(3))}>
              {item}
            </button>
          ),
        )}
      </nav>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </main>
  );
}

export default App;
