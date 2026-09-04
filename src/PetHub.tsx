import { useMemo, useState } from "react";
import { playPurchaseJingle } from "./homeMusic";
import { playChikiBark } from "./petAudio";
import ChikiAvatar from "./ChikiAvatar";
import { shopItems, shopItemById, type ShopItem, type ShopKind } from "./shopCatalog";
import "./Shop.css";
import "./PetHubPolish.css";
import "./Wardrobe.css";

type PetHubProps = {
  username: string;
  unlockedLevel: number;
  totalStars: number;
  coins: number;
  inventory: string[];
  equipped: Record<string, string>;
  onBack: () => void;
  onBuy: (item: ShopItem) => Promise<void>;
  onEquip: (item: ShopItem) => void;
  onClearSlot: (slot: string) => void;
};

type HubTab = "room" | "chiki" | "shop";

const ownedItemsFor = (inventory: string[], kind: ShopKind) =>
  shopItems.filter((item) => item.kind === kind && inventory.includes(item.id));

const ItemArt = ({ item, compact = false }: { item: ShopItem; compact?: boolean }) => (
  <span
    className={`cartoon-item-art art-${item.slot} art-item-${item.id} rarity-art-${item.rarity.toLowerCase()} ${compact ? "compact" : ""}`}
  >
    <i aria-hidden="true" />
    <b>{item.icon}</b>
  </span>
);

const RoomObject = ({ item, slot }: { item?: ShopItem; slot: string }) => {
  if (!item) return null;
  return (
    <span className={`room-object room-${slot} room-object-item-${item.id}`} aria-hidden="true">
      <b>{item.icon}</b>
    </span>
  );
};

const wardrobeCategoryIcon = (category: string) => {
  if (category === "Vestiti") return "👗";
  if (category === "Accessori testa") return "🎀";
  if (category === "Collari") return "💎";
  if (category === "Occhiali") return "🕶️";
  if (category === "Giochi") return "🧸";
  if (category === "Cibo") return "🍪";
  if (category === "Cura") return "🫧";
  return "✨";
};

const collectionLabel = (item: ShopItem, active: boolean) => {
  if (item.slot === "outfit") return "NELL'ARMADIO";
  if (item.slot === "food") return "IN DISPENSA";
  if (item.slot === "care") return "ANGOLO CURA";
  if (active) return "IN USO";
  if (["hat", "glasses", "collar"].includes(item.slot)) return "INDOSSA";
  if (item.slot === "toy") return "USA";
  return "RACCOLTO";
};

export default function PetHub({
  username,
  unlockedLevel,
  totalStars,
  coins,
  inventory,
  equipped,
  onBack,
  onBuy,
  onEquip,
  onClearSlot,
}: PetHubProps) {
  const [tab, setTab] = useState<HubTab>("room");
  const [shopKind, setShopKind] = useState<ShopKind>("chiki");
  const [category, setCategory] = useState("TUTTO");
  const [wardrobeFilter, setWardrobeFilter] = useState("TUTTO");
  const [buyingId, setBuyingId] = useState("");
  const [message, setMessage] = useState("");
  const [celebratingItem, setCelebratingItem] = useState<ShopItem | null>(null);
  const [roomReaction, setRoomReaction] = useState("");
  const [isBarking, setIsBarking] = useState(false);

  const equippedItems = Object.fromEntries(
    Object.entries(equipped).map(([slot, id]) => [slot, shopItemById(id)]),
  ) as Record<string, ShopItem | undefined>;

  const celebrationItems = celebratingItem
    ? ({
        ...equippedItems,
        ...(celebratingItem.kind === "chiki" && ["hat", "glasses", "collar"].includes(celebratingItem.slot)
          ? { [celebratingItem.slot]: celebratingItem }
          : {}),
      } as Record<string, ShopItem | undefined>)
    : equippedItems;

  const shopCategories = useMemo(() => {
    const values = shopItems.filter((item) => item.kind === shopKind).map((item) => item.category);
    return ["TUTTO", ...Array.from(new Set(values))];
  }, [shopKind]);

  const chikiCatalog = useMemo(() => shopItems.filter((item) => item.kind === "chiki"), []);
  const wardrobeCategories = useMemo(
    () => ["TUTTO", ...Array.from(new Set(chikiCatalog.map((item) => item.category)))],
    [chikiCatalog],
  );
  const visibleWardrobe = chikiCatalog.filter(
    (item) => wardrobeFilter === "TUTTO" || item.category === wardrobeFilter,
  );
  const wardrobeOwned = chikiCatalog.filter((item) => inventory.includes(item.id)).length;
  const wardrobePercent = Math.round((wardrobeOwned / Math.max(1, chikiCatalog.length)) * 100);

  const visibleShop = shopItems.filter(
    (item) => item.kind === shopKind && (category === "TUTTO" || item.category === category),
  );

  const openChikiShop = (targetCategory = "TUTTO") => {
    setShopKind("chiki");
    setCategory(targetCategory);
    setTab("shop");
  };

  const buy = async (item: ShopItem) => {
    setBuyingId(item.id);
    setMessage("");
    try {
      await onBuy(item);
      setMessage(`${item.name} aggiunto alla collezione!`);
      setCelebratingItem(item);
      void playPurchaseJingle();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Acquisto non riuscito.";
      const lower = raw.toLowerCase();
      setMessage(
        lower.includes("not_enough_coins")
          ? "Non hai abbastanza Monete Chiki."
          : lower.includes("level_required")
            ? `Devi raggiungere il livello ${item.requiredLevel}.`
            : raw,
      );
    } finally {
      setBuyingId("");
    }
  };

  const interactWithChiki = () => {
    setIsBarking(true);
    void playChikiBark();

    const reaction = equippedItems.toy
      ? `BAU! ${equippedItems.toy.icon} GIOCHIAMO!`
      : equippedItems.bowl
        ? "BAU! 😋 GNAM!"
        : equippedItems.bed
          ? "BAU! 💤 CHE RELAX!"
          : "BAU! 💛 CIAO!";

    setRoomReaction(reaction);
    window.setTimeout(() => setIsBarking(false), 520);
    window.setTimeout(() => setRoomReaction(""), 1600);
  };

  const collectionCard = (item: ShopItem) => {
    const active = equipped[item.slot] === item.id;
    const actionable = ["hat", "glasses", "collar", "toy"].includes(item.slot);
    return (
      <button
        key={item.id}
        className={`collection-item ${active ? "active" : ""} rarity-${item.rarity.toLowerCase()}`}
        onClick={() => actionable && onEquip(item)}
        disabled={!actionable}
      >
        <ItemArt item={item} compact />
        <strong>{item.name}</strong>
        <small>{collectionLabel(item, active)}</small>
      </button>
    );
  };

  const wardrobeSlot = (item: ShopItem) => {
    const owned = inventory.includes(item.id);
    const active = equipped[item.slot] === item.id;
    const canUse = ["hat", "glasses", "collar", "toy"].includes(item.slot);
    const locked = unlockedLevel < item.requiredLevel;

    const handleClick = () => {
      if (owned && canUse) {
        if (active && item.slot !== "toy") onClearSlot(item.slot);
        else onEquip(item);
        return;
      }
      if (!owned && !locked) openChikiShop(item.category);
    };

    return (
      <button
        key={item.id}
        type="button"
        className={`wardrobe-slot ${owned ? "owned" : "empty"} ${active ? "active" : ""} rarity-${item.rarity.toLowerCase()}`}
        onClick={handleClick}
        disabled={!owned && locked}
      >
        <span className="wardrobe-slot-icon" aria-hidden="true">{owned ? item.icon : "?"}</span>
        <span className="wardrobe-slot-copy">
          <strong>{owned ? item.name : locked ? `Liv. ${item.requiredLevel}` : item.name}</strong>
          <small>{owned ? collectionLabel(item, active) : locked ? "DA SBLOCCARE" : "VAI ALLO SHOP"}</small>
        </span>
        <i className="wardrobe-slot-badge" aria-hidden="true">{owned ? "✓" : locked ? "🔒" : "+"}</i>
      </button>
    );
  };

  const celebrationDescription = (item: ShopItem) => {
    if (item.kind === "room") return "Acquistato e sistemato subito nella stanza!";
    if (item.slot === "outfit") return "Nuovo vestito aggiunto all'armadio di Chiki!";
    if (item.slot === "food") return "Nuova bontà sistemata nella dispensa di Chiki!";
    if (item.slot === "care") return "Nuovo oggetto aggiunto all'angolo cura di Chiki!";
    if (item.slot === "toy") return "Nuovo gioco aggiunto alla collezione di Chiki!";
    return "Nuovo accessorio aggiunto alla collezione di Chiki!";
  };

  return (
    <main className="pet-hub">
      <header className="pet-hub-header">
        <button onClick={onBack} aria-label="Torna alla home">‹</button>
        <div>
          <small>{username.toUpperCase()}</small>
          <strong>IL MONDO DI CHIKI</strong>
        </div>
        <span>🪙 {coins.toLocaleString("it-IT")}</span>
      </header>

      <nav className="pet-hub-tabs">
        <button className={tab === "room" ? "active" : ""} onClick={() => setTab("room")}>🏠 STANZA</button>
        <button className={tab === "chiki" ? "active" : ""} onClick={() => setTab("chiki")}>🎀 ARMADIO</button>
        <button className={tab === "shop" ? "active" : ""} onClick={() => setTab("shop")}>🛍️ SHOP</button>
      </nav>

      {tab === "room" && (
        <>
          <section className={`chiki-room wall-${equipped.wall || "wall_sky"} floor-${equipped.floor || "floor_wood"}`}>
            <div className="room-status">
              <b>Livello {unlockedLevel}</b>
              <span>⭐ {totalStars}</span>
            </div>
            <span className="room-window-glow" aria-hidden="true" />
            <RoomObject item={equippedItems.lamp} slot="lamp" />
            <RoomObject item={equippedItems.decor} slot="decor" />
            <RoomObject item={equippedItems.rug} slot="rug" />
            <RoomObject item={equippedItems.bed} slot="bed" />
            <RoomObject item={equippedItems.bowl} slot="bowl" />
            <RoomObject item={equippedItems.toy} slot="toy" />

            <div className={`room-chiki ${equippedItems.toy ? "has-toy" : ""}`}>
              <ChikiAvatar
                items={equippedItems}
                variant="room"
                barking={isBarking}
                onTap={interactWithChiki}
                alt="Chiki nella sua stanza"
              />
            </div>
            {roomReaction && <div className="room-reaction">{roomReaction}</div>}
            <small className="room-hint">TOCCA CHIKI</small>
          </section>

          <section className="hub-section">
            <div className="hub-section-title">
              <div><small>ARREDA</small><strong>LA STANZA</strong></div>
              <button onClick={() => { setShopKind("room"); setCategory("TUTTO"); setTab("shop"); }}>+ SHOP</button>
            </div>
            <div className="collection-grid">
              {ownedItemsFor(inventory, "room").map(collectionCard)}
            </div>
          </section>
        </>
      )}

      {tab === "chiki" && (
        <section className="hub-section chiki-wardrobe-section">
          <div className="wardrobe-title-row">
            <div>
              <small>LA COLLEZIONE DI CHIKI</small>
              <h2>RIEMPI L'ARMADIO</h2>
            </div>
            <button onClick={() => openChikiShop("TUTTO")}>+ SHOP</button>
          </div>

          <div className="wardrobe-layout">
            <aside className="wardrobe-chiki-panel">
              <div className="wardrobe-chiki-name">
                <small>SEMPRE CON TE</small>
                <strong>CHIKI</strong>
              </div>
              <div className="wardrobe-chiki-avatar">
                <ChikiAvatar items={equippedItems} variant="profile" alt="Chiki davanti al suo armadio" />
              </div>
              <div className="wardrobe-player-stats">
                <b>Liv. {unlockedLevel}</b>
                <span>⭐ {totalStars}</span>
              </div>
            </aside>

            <div className="wardrobe-cabinet">
              <div className="wardrobe-cabinet-top">
                <div>
                  <small>OGGETTI RACCOLTI</small>
                  <strong>{wardrobeOwned}/{chikiCatalog.length}</strong>
                </div>
                <span>{wardrobePercent}%</span>
              </div>
              <div className="wardrobe-progress" aria-label={`${wardrobePercent}% collezione completata`}>
                <i style={{ width: `${wardrobePercent}%` }} />
              </div>

              <div className="wardrobe-filters">
                {wardrobeCategories.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={wardrobeFilter === value ? "active" : ""}
                    onClick={() => setWardrobeFilter(value)}
                  >
                    <span>{value === "TUTTO" ? "✨" : wardrobeCategoryIcon(value)}</span>
                    <small>{value === "Accessori testa" ? "TESTA" : value.toUpperCase()}</small>
                  </button>
                ))}
              </div>

              <div className="wardrobe-shelf-label">
                <span>{wardrobeFilter === "TUTTO" ? "✨ TUTTA LA COLLEZIONE" : `${wardrobeCategoryIcon(wardrobeFilter)} ${wardrobeFilter.toUpperCase()}`}</span>
                <small>{visibleWardrobe.filter((item) => inventory.includes(item.id)).length}/{visibleWardrobe.length}</small>
              </div>

              <div className="wardrobe-shelves">
                {visibleWardrobe.map(wardrobeSlot)}
              </div>
            </div>
          </div>

          <div className="wardrobe-footnote">
            <span>👗 Vestiti</span>
            <span>🎀 Accessori</span>
            <span>🍪 Dispensa</span>
            <span>🫧 Cura</span>
            <span>🧸 Giochi</span>
          </div>
        </section>
      )}

      {tab === "shop" && (
        <section className="shop-section">
          <div className="shop-wallet">
            <div><small>IL TUO SALDO</small><strong>🪙 {coins.toLocaleString("it-IT")}</strong></div>
            <p>Completa i livelli e migliora le stelle per guadagnare Monete Chiki.</p>
          </div>

          <div className="shop-kind-switch">
            <button
              className={shopKind === "chiki" ? "active" : ""}
              onClick={() => { setShopKind("chiki"); setCategory("TUTTO"); }}
            >
              🐶 PER CHIKI
            </button>
            <button
              className={shopKind === "room" ? "active" : ""}
              onClick={() => { setShopKind("room"); setCategory("TUTTO"); }}
            >
              🏠 PER LA STANZA
            </button>
          </div>

          <div className="shop-categories">
            {shopCategories.map((value) => (
              <button key={value} className={category === value ? "active" : ""} onClick={() => setCategory(value)}>
                {value}
              </button>
            ))}
          </div>

          {message && <div className="shop-message">{message}</div>}

          <div className="shop-grid">
            {visibleShop.map((item) => {
              const owned = inventory.includes(item.id);
              const locked = unlockedLevel < item.requiredLevel;
              const active = equipped[item.slot] === item.id;
              const canEquip = ["hat", "glasses", "collar", "toy"].includes(item.slot);
              return (
                <article key={item.id} className={`shop-card rarity-${item.rarity.toLowerCase()} ${locked ? "locked" : ""}`}>
                  <ItemArt item={item} />
                  <small>{item.category} · {item.rarity}</small>
                  <strong>{item.name}</strong>
                  {locked ? (
                    <button disabled>🔒 LIV. {item.requiredLevel}</button>
                  ) : owned ? (
                    canEquip ? (
                      <button className="owned" disabled={active} onClick={() => onEquip(item)}>
                        {collectionLabel(item, active)}
                      </button>
                    ) : (
                      <button className="owned" disabled>{collectionLabel(item, active)}</button>
                    )
                  ) : (
                    <button disabled={buyingId === item.id} onClick={() => void buy(item)}>
                      {buyingId === item.id ? "..." : `🪙 ${item.price.toLocaleString("it-IT")}`}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {celebratingItem && (
        <div className="purchase-celebration" role="dialog" aria-modal="true" aria-label="Acquisto completato">
          <div className={`celebration-card celebration-${celebratingItem.kind}`}>
            <div className="celebration-stars" aria-hidden="true">
              <span>★</span><span>✦</span><span>★</span><span>✦</span><span>★</span><span>✦</span>
            </div>
            <small>{celebratingItem.kind === "room" ? "NUOVO ARREDO!" : "NUOVO TESORO DI CHIKI!"}</small>
            <h2>CHIKI È FELICISSIMA!</h2>
            <div className="celebration-stage">
              <div className="celebration-chiki">
                <ChikiAvatar
                  items={celebrationItems}
                  variant="celebration"
                  celebrating
                  alt="Chiki che esulta"
                />
              </div>
              {(celebratingItem.kind === "room" || ["toy", "food", "care", "outfit"].includes(celebratingItem.slot)) && (
                <ItemArt item={celebratingItem} />
              )}
            </div>
            <strong>{celebratingItem.name}</strong>
            <p>{celebrationDescription(celebratingItem)}</p>
            <button onClick={() => setCelebratingItem(null)}>EVVIVA!</button>
          </div>
        </div>
      )}
    </main>
  );
}
