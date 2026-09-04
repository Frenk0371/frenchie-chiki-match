const SUPABASE_URL = "https://xrkqeelwutjzyqxgvxmm.supabase.co";
const SUPABASE_KEY = "sb_publishable_vQVI5HTbjy6lrDZLmoJfkw_ulzJMIkO";
const SESSION_KEY = "chiki-auth-session-v1";
const PENDING_USERNAME_KEY = "chiki-pending-username";
const LAST_USER_KEY = "chiki-last-user-id";

const STARTER_INVENTORY = [
  "outfit_classic",
  "bed_basic",
  "bowl_basic",
  "wall_sky",
  "floor_wood",
];

const STARTER_EQUIPPED: Record<string, string> = {
  outfit: "outfit_classic",
  bed: "bed_basic",
  bowl: "bowl_basic",
  wall: "wall_sky",
  floor: "floor_wood",
};

export type CloudSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user?: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
};

export type CloudProgress = {
  unlocked_level: number;
  level_stars: Record<number, number>;
  selected_outfit: string;
  coins: number;
  inventory: string[];
  equipped: Record<string, string>;
  room_state: Record<string, string | number>;
  updated_at?: string;
};

export type LeaderboardEntry = {
  username: string;
  total_stars: number;
  unlocked_level: number;
  score: number;
};

export type PurchaseResult = {
  new_coins: number;
  new_inventory: string[];
};

export type LevelRewardResult = {
  reward: number;
  new_coins: number;
};

const parseResponse = async (response: Response) => {
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const maybe = body as { message?: string; msg?: string; error_description?: string; error?: string } | null;
    const message = maybe?.message || maybe?.msg || maybe?.error_description || maybe?.error || `Errore ${response.status}`;
    throw new Error(message);
  }

  return body;
};

const normalizeSession = (raw: CloudSession): CloudSession => ({
  ...raw,
  expires_at:
    raw.expires_at ??
    (raw.expires_in ? Math.floor(Date.now() / 1000) + raw.expires_in : undefined),
});

export const readStoredSession = (): CloudSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as CloudSession) : null;
  } catch {
    return null;
  }
};

const storeSession = (session: CloudSession) => {
  const normalized = normalizeSession(session);
  localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
  return normalized;
};

const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem("chiki-username");
};

const clearLocalProgress = () => {
  [
    "chiki-unlocked-level",
    "chiki-level-stars",
    "chiki-outfit",
    "chiki-coins",
    "chiki-inventory",
    "chiki-equipped",
    "chiki-room-state",
  ].forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(LAST_USER_KEY);
};

const baseHeaders = () => ({
  apikey: SUPABASE_KEY,
  "Content-Type": "application/json",
});

const authHeaders = (session: CloudSession) => ({
  ...baseHeaders(),
  Authorization: `Bearer ${session.access_token}`,
});

const refreshSession = async (refreshToken: string): Promise<CloudSession | null> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const data = (await parseResponse(response)) as CloudSession;
    return storeSession(data);
  } catch {
    clearSession();
    return null;
  }
};

export const getValidSession = async (): Promise<CloudSession | null> => {
  const session = readStoredSession();
  if (!session?.access_token || !session.refresh_token) return null;

  const now = Math.floor(Date.now() / 1000);
  if (!session.expires_at || session.expires_at > now + 60) return session;
  return refreshSession(session.refresh_token);
};

const getCurrentUser = async (session: CloudSession) => {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: authHeaders(session),
  });
  return (await parseResponse(response)) as {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
};

export const isUsernameValid = (username: string) => /^[A-Za-z0-9_]{3,20}$/.test(username);

export const usernameAvailable = async (username: string) => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/chiki_username_available`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify({ candidate: username }),
  });
  return Boolean(await parseResponse(response));
};

const fetchProfileUsername = async (session: CloudSession, userId: string): Promise<string | null> => {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/chiki_profiles?id=eq.${encodeURIComponent(userId)}&select=username&limit=1`,
    { headers: authHeaders(session) },
  );
  const rows = (await parseResponse(response)) as Array<{ username: string }>;
  return rows[0]?.username ?? null;
};

const ensureProfile = async (
  session: CloudSession,
  user: { id: string; user_metadata?: Record<string, unknown> },
) => {
  const existing = await fetchProfileUsername(session, user.id);
  if (existing) {
    localStorage.setItem("chiki-username", existing);
    return existing;
  }

  const metadataUsername = String(user.user_metadata?.username ?? "").trim();
  const pendingUsername = String(localStorage.getItem(PENDING_USERNAME_KEY) ?? "").trim();
  const username = metadataUsername || pendingUsername;

  if (!isUsernameValid(username)) {
    throw new Error("Nome utente mancante o non valido. Crea nuovamente l'account con un nome valido.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/chiki_profiles?on_conflict=id`, {
    method: "POST",
    headers: {
      ...authHeaders(session),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([{ id: user.id, username, updated_at: new Date().toISOString() }]),
  });
  await parseResponse(response);
  localStorage.setItem("chiki-username", username);
  localStorage.removeItem(PENDING_USERNAME_KEY);
  return username;
};

const parseJsonObject = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const defaultProgress = (): CloudProgress => ({
  unlocked_level: 1,
  level_stars: {},
  selected_outfit: "Classico",
  coins: 500,
  inventory: [...STARTER_INVENTORY],
  equipped: { ...STARTER_EQUIPPED },
  room_state: {},
});

const readLocalProgress = (): CloudProgress => ({
  unlocked_level: Math.max(1, Number(localStorage.getItem("chiki-unlocked-level") || "1")),
  level_stars: parseJsonObject<Record<number, number>>("chiki-level-stars", {}),
  selected_outfit: localStorage.getItem("chiki-outfit") || "Classico",
  coins: Math.max(0, Number(localStorage.getItem("chiki-coins") || "500")),
  inventory: parseJsonObject<string[]>("chiki-inventory", [...STARTER_INVENTORY]),
  equipped: parseJsonObject<Record<string, string>>("chiki-equipped", { ...STARTER_EQUIPPED }),
  room_state: parseJsonObject<Record<string, string | number>>("chiki-room-state", {}),
});

const writeLocalProgress = (progress: CloudProgress) => {
  localStorage.setItem("chiki-unlocked-level", String(progress.unlocked_level));
  localStorage.setItem("chiki-level-stars", JSON.stringify(progress.level_stars));
  localStorage.setItem("chiki-outfit", progress.selected_outfit || "Classico");
  localStorage.setItem("chiki-coins", String(Math.max(0, progress.coins || 0)));
  localStorage.setItem("chiki-inventory", JSON.stringify(progress.inventory || STARTER_INVENTORY));
  localStorage.setItem("chiki-equipped", JSON.stringify(progress.equipped || STARTER_EQUIPPED));
  localStorage.setItem("chiki-room-state", JSON.stringify(progress.room_state || {}));
};

const mergeStars = (
  localStars: Record<number, number>,
  cloudStars: Record<number, number>,
) => {
  const merged: Record<number, number> = { ...cloudStars };
  Object.entries(localStars).forEach(([level, stars]) => {
    const numericLevel = Number(level);
    merged[numericLevel] = Math.max(merged[numericLevel] || 0, Number(stars) || 0);
  });
  return merged;
};

export const loadCloudProgress = async (sessionArg?: CloudSession): Promise<CloudProgress | null> => {
  const session = sessionArg ?? (await getValidSession());
  if (!session?.user?.id) return null;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/chiki_progress?user_id=eq.${encodeURIComponent(session.user.id)}&select=unlocked_level,level_stars,selected_outfit,coins,inventory,equipped,room_state,updated_at&limit=1`,
    { headers: authHeaders(session) },
  );
  const rows = (await parseResponse(response)) as CloudProgress[];
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    coins: Number(row.coins) || 0,
    inventory: Array.isArray(row.inventory) ? row.inventory : [...STARTER_INVENTORY],
    equipped: row.equipped || { ...STARTER_EQUIPPED },
    room_state: row.room_state || {},
  };
};

export const saveCloudProgress = async (progress: CloudProgress) => {
  const session = await getValidSession();
  if (!session?.user?.id) return;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/chiki_progress?on_conflict=user_id`, {
    method: "POST",
    headers: {
      ...authHeaders(session),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([
      {
        user_id: session.user.id,
        unlocked_level: Math.max(1, Math.min(100, progress.unlocked_level)),
        level_stars: progress.level_stars,
        selected_outfit: progress.selected_outfit || "Classico",
        equipped: progress.equipped || STARTER_EQUIPPED,
        room_state: progress.room_state || {},
        updated_at: new Date().toISOString(),
      },
    ]),
  });
  await parseResponse(response);
};

export const purchaseShopItem = async (itemId: string): Promise<PurchaseResult> => {
  const session = await getValidSession();
  if (!session) throw new Error("Sessione scaduta. Accedi di nuovo.");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/chiki_purchase_item`, {
    method: "POST",
    headers: authHeaders(session),
    body: JSON.stringify({ p_item_id: itemId }),
  });
  const rows = (await parseResponse(response)) as Array<PurchaseResult>;
  const result = rows[0];
  if (!result) throw new Error("Acquisto non riuscito.");

  const normalized = {
    new_coins: Number(result.new_coins) || 0,
    new_inventory: Array.isArray(result.new_inventory) ? result.new_inventory : [],
  };
  localStorage.setItem("chiki-coins", String(normalized.new_coins));
  localStorage.setItem("chiki-inventory", JSON.stringify(normalized.new_inventory));
  return normalized;
};

export const claimLevelReward = async (level: number, stars: number): Promise<LevelRewardResult> => {
  const session = await getValidSession();
  if (!session) throw new Error("Sessione scaduta.");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/chiki_claim_level_reward`, {
    method: "POST",
    headers: authHeaders(session),
    body: JSON.stringify({ p_level: level, p_stars: stars }),
  });
  const rows = (await parseResponse(response)) as Array<LevelRewardResult>;
  const result = rows[0] || { reward: 0, new_coins: Number(localStorage.getItem("chiki-coins") || "500") };
  const normalized = { reward: Number(result.reward) || 0, new_coins: Number(result.new_coins) || 0 };
  localStorage.setItem("chiki-coins", String(normalized.new_coins));
  return normalized;
};

export const bootstrapCloudAccount = async (sessionArg?: CloudSession) => {
  let session = sessionArg ?? (await getValidSession());
  if (!session) return null;

  const user = await getCurrentUser(session);
  session = storeSession({ ...session, user });
  const username = await ensureProfile(session, user);

  const lastUserId = localStorage.getItem(LAST_USER_KEY);
  const canUseLegacyOrOwnLocal = !lastUserId || lastUserId === user.id;
  const local = canUseLegacyOrOwnLocal ? readLocalProgress() : defaultProgress();
  const cloud = await loadCloudProgress(session);

  const merged: CloudProgress = cloud
    ? {
        unlocked_level: Math.max(local.unlocked_level, cloud.unlocked_level),
        level_stars: mergeStars(local.level_stars, cloud.level_stars || {}),
        selected_outfit:
          canUseLegacyOrOwnLocal && local.selected_outfit !== "Classico"
            ? local.selected_outfit
            : cloud.selected_outfit || local.selected_outfit || "Classico",
        coins: cloud.coins,
        inventory: cloud.inventory,
        equipped: canUseLegacyOrOwnLocal ? { ...cloud.equipped, ...local.equipped } : cloud.equipped,
        room_state: canUseLegacyOrOwnLocal ? { ...cloud.room_state, ...local.room_state } : cloud.room_state,
      }
    : local;

  writeLocalProgress(merged);
  localStorage.setItem(LAST_USER_KEY, user.id);
  await saveCloudProgress(merged);
  return { session, user, username, progress: merged };
};

export const registerAccount = async (username: string, email: string, password: string) => {
  const cleanUsername = username.trim();
  if (!isUsernameValid(cleanUsername)) {
    throw new Error("Il nome utente deve avere 3-20 caratteri: lettere, numeri o underscore.");
  }
  if (!(await usernameAvailable(cleanUsername))) {
    throw new Error("Questo nome utente è già utilizzato.");
  }

  localStorage.setItem(PENDING_USERNAME_KEY, cleanUsername);
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      data: { username: cleanUsername },
    }),
  });
  const data = (await parseResponse(response)) as CloudSession & {
    id?: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };

  if (data.access_token && data.refresh_token) {
    const session = storeSession(data);
    return { needsConfirmation: false, account: await bootstrapCloudAccount(session) };
  }

  return { needsConfirmation: true, account: null };
};

export const loginAccount = async (email: string, password: string) => {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  const data = (await parseResponse(response)) as CloudSession;
  const session = storeSession(data);
  return bootstrapCloudAccount(session);
};

export const signOutAccount = async () => {
  const session = readStoredSession();
  if (session?.user?.id) {
    try {
      await saveCloudProgress(readLocalProgress());
    } catch {
      // The cloud copy normally stays current through automatic sync.
    }
  }

  if (session?.access_token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: authHeaders(session),
      });
    } catch {
      // Local sign-out still proceeds if the network is unavailable.
    }
  }

  clearSession();
  clearLocalProgress();
};

export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const session = await getValidSession();
  if (!session) return [];

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/chiki_get_leaderboard`, {
    method: "POST",
    headers: authHeaders(session),
    body: JSON.stringify({ limit_count: 100 }),
  });
  const rows = (await parseResponse(response)) as LeaderboardEntry[];
  return rows.map((row) => ({
    ...row,
    total_stars: Number(row.total_stars) || 0,
    unlocked_level: Number(row.unlocked_level) || 1,
    score: Number(row.score) || 0,
  }));
};
