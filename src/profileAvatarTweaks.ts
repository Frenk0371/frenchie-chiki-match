import Phaser from "phaser";
import GameScene from "./game/GameScene";
import { getValidSession } from "./cloudClient";
import "./ProfileAvatar.css";

const SUPABASE_URL = "https://xrkqeelwutjzyqxgvxmm.supabase.co";
const SUPABASE_KEY = "sb_publishable_vQVI5HTbjy6lrDZLmoJfkw_ulzJMIkO";

const AVATARS = [
  { id: "fawn", label: "FULVO" },
  { id: "cream", label: "CREMA" },
  { id: "black", label: "NERO" },
  { id: "blue", label: "BLU" },
  { id: "chocolate", label: "CIOCCOLATO" },
  { id: "pied", label: "BIANCO / NERO" },
  { id: "lilac", label: "LILLA" },
  { id: "red", label: "ROSSO" },
] as const;

type AvatarId = (typeof AVATARS)[number]["id"];
const avatarIds = new Set<string>(AVATARS.map((item) => item.id));

const normalizeAvatar = (value: unknown): AvatarId =>
  avatarIds.has(String(value)) ? (String(value) as AvatarId) : "fawn";

const currentUsername = () => String(localStorage.getItem("chiki-username") || "").trim();
const avatarStorageKey = (username: string) => `chiki-profile-avatar:${username.toLowerCase()}`;
const localAvatarFor = (username: string) =>
  normalizeAvatar(localStorage.getItem(avatarStorageKey(username)) || "fawn");

const createAvatarImage = (avatarId: string, alt: string) => {
  const image = document.createElement("img");
  const id = normalizeAvatar(avatarId);
  image.src = "/tiles/chiki.png";
  image.alt = alt;
  image.className = `profile-dog-avatar profile-dog-${id}`;
  image.dataset.profileAvatarId = id;
  return image;
};

// Piccolo aggiustamento finale: il riquadro obiettivi resta sotto gli aiuti ma respira di più dal bordo destro.
const gameProto = GameScene.prototype as any;
const createHudBeforeNudge = gameProto.createHud as (this: GameScene) => void;
gameProto.createHud = function (this: GameScene) {
  const before = new Set(this.children.list);
  createHudBeforeNudge.call(this);

  const added = this.children.list.filter((child) => !before.has(child));
  const graphics = added.filter(
    (child) => child instanceof Phaser.GameObjects.Graphics && child.depth === 40,
  ) as Phaser.GameObjects.Graphics[];
  const objectivePanel = graphics.length ? graphics[graphics.length - 1] : undefined;
  if (objectivePanel) objectivePanel.setX(-38);

  const title = added.find(
    (child) => child instanceof Phaser.GameObjects.Text && child.text === "OBIETTIVI",
  ) as Phaser.GameObjects.Text | undefined;
  if (title) title.setX(title.x - 38);

  const objectiveText = (this as any).objectiveText as Phaser.GameObjects.Text | undefined;
  if (objectiveText) objectiveText.setX(objectiveText.x - 38);
};

const updateObjectiveBeforeNudge = gameProto.updateObjectiveAndProgress as (this: GameScene) => void;
gameProto.updateObjectiveAndProgress = function (this: GameScene) {
  updateObjectiveBeforeNudge.call(this);
  const objectiveText = (this as any).objectiveText as Phaser.GameObjects.Text | undefined;
  if (objectiveText && objectiveText.x > 790) objectiveText.setX(objectiveText.x - 38);
};

let avatarMapPromise: Promise<Map<string, AvatarId>> | null = null;
let syncedUsername = "";
let allowSignOutOnce = false;

const authenticatedHeaders = async () => {
  const session = await getValidSession();
  if (!session?.access_token) return null;
  return {
    session,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  };
};

const fetchAvatarMap = async (force = false) => {
  if (!force && avatarMapPromise) return avatarMapPromise;

  avatarMapPromise = (async () => {
    const auth = await authenticatedHeaders();
    if (!auth) return new Map<string, AvatarId>();

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/chiki_profiles?select=username,avatar_id&order=username.asc`,
      { headers: auth.headers },
    );
    if (!response.ok) return new Map<string, AvatarId>();

    const rows = (await response.json()) as Array<{ username?: string; avatar_id?: string }>;
    return new Map(
      rows
        .filter((row) => row.username)
        .map((row) => [String(row.username).toLowerCase(), normalizeAvatar(row.avatar_id)]),
    );
  })();

  return avatarMapPromise;
};

const saveAvatar = async (username: string, avatarId: AvatarId) => {
  localStorage.setItem(avatarStorageKey(username), avatarId);

  const auth = await authenticatedHeaders();
  const userId = auth?.session.user?.id;
  if (!auth || !userId) return;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/chiki_profiles?id=eq.${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: { ...auth.headers, Prefer: "return=minimal" },
      body: JSON.stringify({ avatar_id: avatarId, updated_at: new Date().toISOString() }),
    },
  );
  if (!response.ok) throw new Error("Impossibile salvare l'avatar.");

  avatarMapPromise = null;
};

const renderHomeAccount = () => {
  const username = currentUsername();
  if (!username) return;

  const account = document.querySelector<HTMLButtonElement>(".home-account");
  if (!account) return;

  const avatarId = localAvatarFor(username);
  const span = account.querySelector("span");
  const small = account.querySelector("small");
  const expected = `${username}:${avatarId}`;

  if (account.dataset.profileRendered !== expected || !span?.querySelector(".profile-dog-avatar")) {
    account.dataset.profileRendered = expected;
    if (span) {
      span.textContent = username;
      span.prepend(createAvatarImage(avatarId, `Profilo di ${username}`));
    }
    if (small) small.textContent = "PROFILO";
  }

  if (account.dataset.profileEnhanced !== "1") {
    account.dataset.profileEnhanced = "1";
    account.addEventListener(
      "click",
      (event) => {
        if (allowSignOutOnce) {
          allowSignOutOnce = false;
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        openProfileModal();
      },
      true,
    );
  }

  if (syncedUsername !== username) {
    syncedUsername = username;
    void fetchAvatarMap(true).then((map) => {
      const cloudAvatar = map.get(username.toLowerCase());
      if (!cloudAvatar) return;
      localStorage.setItem(avatarStorageKey(username), cloudAvatar);
      renderHomeAccount();
    });
  }
};

const closeProfileModal = () => {
  document.querySelector(".profile-avatar-modal")?.remove();
};

function openProfileModal() {
  const username = currentUsername();
  if (!username) return;
  closeProfileModal();

  const overlay = document.createElement("div");
  overlay.className = "profile-avatar-modal";

  const panel = document.createElement("section");
  panel.className = "profile-avatar-panel";

  const heading = document.createElement("div");
  heading.className = "profile-avatar-heading";
  heading.innerHTML = `<small>IL TUO PROFILO</small><strong>SCEGLI IL TUO FRENCHIE</strong><span>${username}</span>`;

  const grid = document.createElement("div");
  grid.className = "profile-avatar-grid";

  const status = document.createElement("p");
  status.className = "profile-avatar-status";
  status.textContent = "L'avatar scelto comparirà anche nella classifica.";

  const selected = localAvatarFor(username);
  AVATARS.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `profile-avatar-choice${option.id === selected ? " selected" : ""}`;
    button.dataset.avatarId = option.id;
    button.append(createAvatarImage(option.id, `Bulldog francese ${option.label}`));
    const label = document.createElement("small");
    label.textContent = option.label;
    button.append(label);
    button.addEventListener("click", async () => {
      grid.querySelectorAll(".profile-avatar-choice").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
      status.textContent = "SALVATAGGIO…";
      try {
        await saveAvatar(username, option.id);
        status.textContent = "✓ AVATAR SALVATO";
        renderHomeAccount();
      } catch {
        status.textContent = "SALVATO SUL TELEFONO · CLOUD TEMPORANEAMENTE NON DISPONIBILE";
        renderHomeAccount();
      }
    });
    grid.append(button);
  });

  const actions = document.createElement("div");
  actions.className = "profile-avatar-actions";

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "CHIUDI";
  close.addEventListener("click", closeProfileModal);

  const signOut = document.createElement("button");
  signOut.type = "button";
  signOut.className = "danger";
  signOut.textContent = "ESCI ACCOUNT";
  signOut.addEventListener("click", () => {
    const account = document.querySelector<HTMLButtonElement>(".home-account");
    closeProfileModal();
    if (!account) return;
    allowSignOutOnce = true;
    account.click();
  });

  actions.append(close, signOut);
  panel.append(heading, grid, status, actions);
  overlay.append(panel);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeProfileModal();
  });
  document.body.append(overlay);
}

const renderLeaderboardAvatars = async () => {
  const articles = Array.from(document.querySelectorAll<HTMLElement>(".ranking-list article"));
  if (!articles.length) return;

  const map = await fetchAvatarMap();
  articles.forEach((article) => {
    const username = article.querySelector("strong")?.textContent?.trim();
    if (!username || article.children.length < 2) return;

    const avatarId = map.get(username.toLowerCase()) || "fawn";
    const current = article.children[1] as HTMLElement;
    if (current.dataset.profileAvatarId === avatarId) return;

    const image = createAvatarImage(avatarId, `Avatar di ${username}`);
    current.replaceWith(image);
  });
};

let scheduled = false;
const refreshProfileUi = () => {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    renderHomeAccount();
    void renderLeaderboardAvatars();
  });
};

const observer = new MutationObserver(refreshProfileUi);
observer.observe(document.documentElement, { childList: true, subtree: true });
refreshProfileUi();
