import "./SpecialShop.css";

const SUPABASE_URL = "https://xrkqeelwutjzyqxgvxmm.supabase.co";
const SUPABASE_KEY = "sb_publishable_vQVI5HTbjy6lrDZLmoJfkw_ulzJMIkO";
const SESSION_KEY = "chiki-auth-session-v1";
const ROOM_STATE_KEY = "chiki-room-state";
const BACKUP_KEY = "chiki-special-boosters";

type SpecialId = "grid_rocket" | "bomb" | "rainbow";
type SpecialState = { gridRocket: number; bomb: number; rainbow: number };

type Offer = {
  id: SpecialId;
  key: keyof SpecialState;
  roomKey: string;
  name: string;
  price: number;
  image: string;
  description: string;
};

const offers: Offer[] = [
  {
    id: "grid_rocket",
    key: "gridRocket",
    roomKey: "booster_grid_rocket",
    name: "RAZZO DI GRIGLIA",
    price: 120,
    image: "/special-grid-rocket.svg",
    description: "Compare già nella griglia. Toccalo per spazzare una riga o una colonna.",
  },
  {
    id: "bomb",
    key: "bomb",
    roomKey: "booster_bomb",
    name: "BOMBA",
    price: 160,
    image: "/special-bomb.svg",
    description: "Compare già nella griglia. Toccalo e fa esplodere le pedine intorno.",
  },
  {
    id: "rainbow",
    key: "rainbow",
    roomKey: "booster_rainbow",
    name: "SFERA MULTICOLORE",
    price: 220,
    image: "/special-rainbow.svg",
    description: "Compare già nella griglia. Spostala su una pedina per eliminare tutte quelle uguali.",
  },
];

const safeJson = <T>(value: string | null, fallback: T): T => {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const roomState = () => safeJson<Record<string, unknown>>(localStorage.getItem(ROOM_STATE_KEY), {});
const backupState = () => safeJson<Partial<SpecialState>>(localStorage.getItem(BACKUP_KEY), {});

const currentSpecialState = (): SpecialState => {
  const room = roomState();
  const backup = backupState();
  return {
    gridRocket: Math.max(0, Number(room.booster_grid_rocket ?? backup.gridRocket ?? 0) || 0),
    bomb: Math.max(0, Number(room.booster_bomb ?? backup.bomb ?? 0) || 0),
    rainbow: Math.max(0, Number(room.booster_rainbow ?? backup.rainbow ?? 0) || 0),
  };
};

const writeSpecialState = (specials: SpecialState) => {
  localStorage.setItem(BACKUP_KEY, JSON.stringify(specials));
  const room = roomState();
  localStorage.setItem(
    ROOM_STATE_KEY,
    JSON.stringify({
      ...room,
      booster_grid_rocket: specials.gridRocket,
      booster_bomb: specials.bomb,
      booster_rainbow: specials.rainbow,
    }),
  );
};

const preserveSpecials = () => {
  const backup = backupState();
  if (backup.gridRocket === undefined && backup.bomb === undefined && backup.rainbow === undefined) return;
  const room = roomState();
  writeSpecialState({
    gridRocket: Math.max(0, Number(room.booster_grid_rocket ?? backup.gridRocket ?? 0) || 0),
    bomb: Math.max(0, Number(room.booster_bomb ?? backup.bomb ?? 0) || 0),
    rainbow: Math.max(0, Number(room.booster_rainbow ?? backup.rainbow ?? 0) || 0),
  });
};

const updateBalances = (coins: number) => {
  localStorage.setItem("chiki-coins", String(Math.max(0, coins)));
  document.querySelectorAll<HTMLElement>(".shop-wallet strong, .pet-hub-header > span, .home-wallet").forEach((element) => {
    const next = `🪙 ${coins.toLocaleString("it-IT")}`;
    if (element.textContent !== next) element.textContent = next;
  });
};

const showMessage = (text: string) => {
  const section = document.querySelector<HTMLElement>(".shop-section");
  if (!section) return;
  let message = section.querySelector<HTMLElement>(".shop-message.special-shop-message");
  if (!message) {
    message = document.createElement("div");
    message.className = "shop-message special-shop-message";
    section.querySelector(".shop-kind-switch")?.insertAdjacentElement("afterend", message);
  }
  if (message.textContent !== text) message.textContent = text;
};

const purchase = async (offer: Offer) => {
  const session = safeJson<{ access_token?: string } | null>(localStorage.getItem(SESSION_KEY), null);
  if (!session?.access_token) throw new Error("Sessione scaduta. Accedi di nuovo.");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/chiki_purchase_item`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_item_id: `booster_${offer.id}` }),
  });

  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const error = String(body?.message || body?.error || body || "Acquisto non riuscito.");
    throw new Error(error);
  }

  const row = Array.isArray(body) ? body[0] : body;
  const newCoins = Math.max(0, Number(row?.new_coins ?? localStorage.getItem("chiki-coins") ?? 0));
  const specials = currentSpecialState();
  specials[offer.key] = Math.min(99, specials[offer.key] + 1);
  writeSpecialState(specials);
  updateBalances(newCoins);
  return specials;
};

const countFor = (offer: Offer) => currentSpecialState()[offer.key];

const refreshCounts = () => {
  document.querySelectorAll<HTMLElement>("[data-special-booster]").forEach((card) => {
    const id = card.dataset.specialBooster as SpecialId | undefined;
    const offer = offers.find((candidate) => candidate.id === id);
    if (!offer) return;

    const count = countFor(offer);
    const badge = card.querySelector<HTMLElement>(".booster-shop-count");
    const nextBadge = `×${count}`;
    if (badge && badge.textContent !== nextBadge) badge.textContent = nextBadge;

    const button = card.querySelector<HTMLButtonElement>("button");
    if (button && button.disabled !== (count >= 99)) button.disabled = count >= 99;
  });
};

const makeCard = (offer: Offer) => {
  const article = document.createElement("article");
  article.className = "booster-shop-card board-special";
  article.dataset.specialBooster = offer.id;

  const art = document.createElement("div");
  art.className = "booster-shop-art";
  const image = document.createElement("img");
  image.src = offer.image;
  image.alt = "";
  image.setAttribute("aria-hidden", "true");
  const count = document.createElement("span");
  count.className = "booster-shop-count";
  count.textContent = `×${countFor(offer)}`;
  art.append(image, count);

  const title = document.createElement("strong");
  title.textContent = offer.name;
  const description = document.createElement("p");
  description.textContent = offer.description;
  const button = document.createElement("button");
  button.textContent = `🪙 ${offer.price}`;
  button.disabled = countFor(offer) >= 99;

  button.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = "...";
    try {
      await purchase(offer);
      showMessage(`${offer.name} +1! Comparirà già nella griglia del prossimo livello.`);
      refreshCounts();
    } catch (error) {
      const raw = error instanceof Error ? error.message.toLowerCase() : "";
      showMessage(
        raw.includes("not_enough_coins")
          ? "Non hai abbastanza Monete Chiki."
          : raw.includes("booster_max")
            ? "Hai già raggiunto il massimo di 99."
            : "Acquisto non riuscito. Riprova.",
      );
    } finally {
      button.textContent = oldText;
      button.disabled = countFor(offer) >= 99;
    }
  });

  article.append(art, title, description, button);
  return article;
};

const ensureSpecialCards = () => {
  const grid = document.querySelector<HTMLElement>(".booster-shop-grid");
  if (!grid || grid.querySelector("[data-special-booster]")) return;

  const state = currentSpecialState();
  writeSpecialState(state);

  const heading = document.createElement("div");
  heading.className = "special-shop-heading";
  heading.textContent = "✨ SPECIALI CHE ENTRANO NELLA GRIGLIA";
  grid.appendChild(heading);
  offers.forEach((offer) => grid.appendChild(makeCard(offer)));
};

window.addEventListener("chiki-boosters-changed", (event) => {
  const detail = (event as CustomEvent<Partial<SpecialState> & Record<string, unknown>>).detail;
  if (detail && (detail.gridRocket !== undefined || detail.bomb !== undefined || detail.rainbow !== undefined)) {
    const current = currentSpecialState();
    writeSpecialState({
      gridRocket: detail.gridRocket === undefined ? current.gridRocket : Math.max(0, Number(detail.gridRocket) || 0),
      bomb: detail.bomb === undefined ? current.bomb : Math.max(0, Number(detail.bomb) || 0),
      rainbow: detail.rainbow === undefined ? current.rainbow : Math.max(0, Number(detail.rainbow) || 0),
    });
  } else {
    preserveSpecials();
  }
  refreshCounts();
});

let observerScheduled = false;
const observer = new MutationObserver(() => {
  if (observerScheduled) return;
  observerScheduled = true;
  window.requestAnimationFrame(() => {
    observerScheduled = false;
    ensureSpecialCards();
  });
});
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("storage", () => {
  preserveSpecials();
  refreshCounts();
});

ensureSpecialCards();
