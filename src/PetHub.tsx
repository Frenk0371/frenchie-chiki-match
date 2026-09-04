import { useMemo, useState } from "react";
import { shopItems, shopItemById, type ShopItem, type ShopKind } from "./shopCatalog";
import "./Shop.css";

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
  const [buyingId, setBuyingId] = useState("");
  const [message, setMessage] = useState("");

  const equippedItems = Object.fromEntries(
    Object.entries(equipped).map(([slot, id]) => [slot, shopItemById(id)]),
  ) as Record<string, ShopItem | undefined>;

  const shopCategories = useMemo(() => {
    const values = shopItems.filter((item) => item.kind === shopKind).map((item) => item.category);
    return ["TUTTO", ...Array.from(new Set(values))];
  }, [shopKind]);

  const visibleShop = shopItems.filter(
    (item) => item.kind === shopKind && (category === "TUTTO" || item.category === category),
  );

  const buy = async (item: ShopItem) => {
    setBuyingId(item.id);
    setMessage("");
    try {
      await onBuy(item);
      setMessage(`${item.name} aggiunto alla collezione!`);
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

  const collectionCard = (item: ShopItem) => {
    const active = equipped[item.slot] === item.id;
    return (
      <button
        key={item.id}
        className={`collection-item ${active ? "active" : ""} rarity-${item.rarity.toLowerCase()}`}
        onClick={() => onEquip(item)}
      >
        <span>{item.icon}</span>
        <strong>{item.name}</strong>
        <small>{active ? "IN USO" : "USA"}</small>
      </button>
    );
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
        <button className={tab === "chiki" ? "active" : ""} onClick={() => setTab("chiki")}>🐶 CHIKI</button>
        <button className={tab === "shop" ? "active" : ""} onClick={() => setTab("shop")}>🛍️ SHOP</button>
      </nav>

      {tab === "room" && (
        <>
          <section className={`chiki-room wall-${equipped.wall || "wall_sky"} floor-${equipped.floor || "floor_wood"}`}>
            <div className="room-status">
              <b>Livello {unlockedLevel}</b>
              <span>⭐ {totalStars}</span>
            </div>
            {equippedItems.lamp && <span className="room-object room-lamp">{equippedItems.lamp.icon}</span>}
            {equippedItems.decor && <span className="room-object room-decor">{equippedItems.decor.icon}</span>}
            {equippedItems.rug && <span className="room-object room-rug">{equippedItems.rug.icon}</span>}
            {equippedItems.bed && <span className="room-object room-bed">{equippedItems.bed.icon}</span>}
            {equippedItems.bowl && <span className="room-object room-bowl">{equippedItems.bowl.icon}</span>}
            {equippedItems.toy && <span className="room-object room-toy">{equippedItems.toy.icon}</span>}

            <div className="room-chiki">
              {equippedItems.hat && <span className="wearable wearable-hat">{equippedItems.hat.icon}</span>}
              {equippedItems.glasses && <span className="wearable wearable-glasses">{equippedItems.glasses.icon}</span>}
              <img src="/chiki-character.webp" alt="Chiki nella sua stanza" />
              {equippedItems.outfit && equippedItems.outfit.id !== "outfit_classic" && (
                <span className="wearable wearable-outfit">{equippedItems.outfit.icon}</span>
              )}
              {equippedItems.collar && <span className="wearable wearable-collar">{equippedItems.collar.icon}</span>}
            </div>
          </section>

          <section className="hub-section">
            <div className="hub-section-title">
              <div><small>ARREDA</small><strong>LA STANZA</strong></div>
              <button onClick={() => setTab("shop")}>+ SHOP</button>
            </div>
            <div className="collection-grid">
              {ownedItemsFor(inventory, "room").map(collectionCard)}
            </div>
          </section>
        </>
      )}

      {tab === "chiki" && (
        <section className="hub-section chiki-wardrobe-section">
          <div className="chiki-profile-card">
            <div className="mini-chiki-wrap">
              {equippedItems.hat && <span>{equippedItems.hat.icon}</span>}
              <img src="/chiki-character.webp" alt="Chiki" />
            </div>
            <div>
              <h2>Chiki</h2>
              <p>{username} · Livello {unlockedLevel}</p>
              <b>🪙 {coins.toLocaleString("it-IT")}</b>
            </div>
          </div>

          <div className="hub-section-title">
            <div><small>GUARDAROBA</small><strong>I TUOI OGGETTI</strong></div>
            <button onClick={() => setTab("shop")}>+ SHOP</button>
          </div>

          <div className="slot-strip">
            {Object.entries(equipped)
              .filter(([slot]) => ["hat", "glasses", "collar", "toy"].includes(slot))
              .map(([slot, id]) => (
                <button key={slot} onClick={() => onClearSlot(slot)}>
                  <span>{shopItemById(id)?.icon || "✓"}</span>
                  <small>RIMUOVI</small>
                </button>
              ))}
          </div>

          <div className="collection-grid">
            {ownedItemsFor(inventory, "chiki").map(collectionCard)}
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
              return (
                <article key={item.id} className={`shop-card rarity-${item.rarity.toLowerCase()} ${locked ? "locked" : ""}`}>
                  <div className="shop-item-icon">{item.icon}</div>
                  <small>{item.category} · {item.rarity}</small>
                  <strong>{item.name}</strong>
                  {locked ? (
                    <button disabled>🔒 LIV. {item.requiredLevel}</button>
                  ) : owned ? (
                    <button className="owned" disabled={active} onClick={() => onEquip(item)}>
                      {active ? "IN USO" : "USA"}
                    </button>
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
    </main>
  );
}
